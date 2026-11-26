import { distanceMeters } from "./distance";
import { BOXES, type Ladder } from "./market-prices";
import type { PublicStore } from "./public-stores";
import type { Fulfillment, Urgency } from "./search-types";
import type { SupplyVendor } from "./supply-vendors";
import { closingTime, hoursSummary, isOpenNow, type SeoulNow } from "./time";
import type { Vendor } from "./types";
import { wonRange } from "./won-range";

// AI 도우미 추천(ADR-013 팀 검토안, 2026-11-25). 앱이 한 곳을 고르고 이유를 말한다.
// 제품 판단(가설): 상추·대파·양파·감자는 채소를 파는 곳이면 항상 있다. 구매 상황은 둘이다.
//  - 급한 소량(urgent_small): 거래 단위보다 적은 양을 지금 바로 → 가장 가까운 동네 가게
//  - 정해 두고 대량(bulk_delivery): 그 밖 → 배달 거래처(식자재 납품업체 먼저) + 적정 값 기준선
//  - 직접 가서 대량(bulk_pickup): 사장님이 직접 가겠다고 한 대량 → 도매시장
// 공공 업체에 가격을 지어 붙이지 않는다. 값은 경로별 시세(소매·상회)로만 말한다.
// 없는 정보(영업시간·배달 조건 등)를 "없다"고 알리는 문구는 넣지 않는다(2026-11-26 사용자 결정). 채울 방법은 docs/data-sources/store-hours-phone-plan.md

export type Situation = "urgent_small" | "bulk_delivery" | "bulk_pickup";

export type Place = {
  id: string;
  name: string;
  kind: string;
  address: string;
  lat: number;
  lng: number;
  distance_m: number;
  distance_text: string;
  phone: string | null;
  place_url?: string | null; // 카카오맵 장소 페이지(영업시간·사진). 서버가 보는 순간 조회해 붙인다
  contact_source?: string | null; // 전화·장소 링크 출처(공공 업체에 붙일 때 출처를 밝힌다, 앱 AC-13)
};

export type Recommendation = {
  situation: Situation;
  label: string; // "급할 때 가까운 곳" 같은 상황 이름
  headline: string;
  reasons: string[];
  primary: Place;
  others: Place[];
  benchmark: string | null; // 적정 값 기준선(대량)
  extra: string | null; // 보조 한 줄(대량: 새벽 도매시장)
};

// 거래 단위보다 적으면 소량. 양을 모르면 소량으로 본다(급한 상황에서 흔함)
export function isSmall(itemId: string, qtyKg: number | null): boolean {
  const box = BOXES[itemId];
  if (qtyKg === null || !box) return true;
  return qtyKg < box.kg;
}

// 받는 방식을 묻지 않고 상황으로 정한다(사장님이 말했으면 그대로)
export function autoFulfillment(itemId: string, qtyKg: number | null, urgency: Urgency): Fulfillment {
  return urgency === "now" && isSmall(itemId, qtyKg) ? "pickup" : "delivery";
}

export function situationOf(itemId: string, qtyKg: number | null, urgency: Urgency, fulfillment: Fulfillment): Situation {
  if (fulfillment === "delivery") return "bulk_delivery";
  return isSmall(itemId, qtyKg) || urgency === "now" && qtyKg === null ? "urgent_small" : "bulk_pickup";
}

export function distanceText(m: number): string {
  if (m < 1000) return `걸어서 ${Math.max(1, Math.round(m / 67))}분(${Math.round(m)}m)`;
  return `차로 약 ${Math.max(3, Math.round((m / 1000) * 2 + 2))}분(${(m / 1000).toFixed(1)}km)`;
}

const STORE_KIND: Record<string, string> = { "채소/과일": "동네 채소 가게", 슈퍼마켓: "동네 마트" };

export type RecommendInput = {
  item_id: string;
  item_name: string;
  qty_kg: number | null;
  urgency: Urgency;
  fulfillment: Fulfillment;
  here: { lat: number; lng: number };
  now: SeoulNow;
  stores: PublicStore[];
  supply: SupplyVendor[];
  wholesale: Vendor[]; // 도매시장 중도매인(같은 자리)
  ladder: Ladder | null;
  // 카카오맵에서 확인되고 전화가 있는 동네 가게 id(서버가 보는 순간 조회). 있으면 급할 때 이 가게를 먼저 고른다
  confirmed?: ReadonlySet<string>;
};

// 확인된 가게가 가장 가까운 곳보다 이만큼 안쪽으로 더 멀면 먼저 고른다(걸어서 약 5분)
export const CONFIRMED_DETOUR_M = 300;

function place(p: { id: string; name: string; kind: string; address: string; lat: number; lng: number; phone: string | null }, here: { lat: number; lng: number }): Place {
  const d = Math.round(distanceMeters(here, p));
  return { ...p, distance_m: d, distance_text: distanceText(d) };
}

function nearest<T extends { lat: number; lng: number }>(xs: T[], here: { lat: number; lng: number }, n: number): T[] {
  return [...xs].sort((a, b) => distanceMeters(here, a) - distanceMeters(here, b)).slice(0, n);
}

const cleanName = (s: string) => s.replace(/\s*[;|]\s*/g, " ").trim();

export function recommend(i: RecommendInput): Recommendation | null {
  const situation = situationOf(i.item_id, i.qty_kg, i.urgency, i.fulfillment);
  const box = BOXES[i.item_id];
  const trader = i.ladder?.rows.find((r) => r.key === "trader") ?? null;
  const retail = i.ladder?.rows.find((r) => r.key === "retail") ?? null;
  const qtyText = i.qty_kg !== null ? `${i.qty_kg}kg` : null;
  // 사장님 양에 맞춘 값(상자 값 → kg 비율). 양을 모르면 거래 단위 한 개
  const scale = (low: number, high: number) => {
    if (!box) return wonRange(low, high);
    const f = (i.qty_kg ?? box.kg) / box.kg;
    return wonRange(Math.round((low * f) / 100) * 100, Math.round((high * f) / 100) * 100);
  };
  const unitWord = box ? box.label.replace(/^\d+kg /, "") : "";
  const amountWord = qtyText ?? unitWord; // "2kg" 또는 "한 망"

  const market = i.wholesale[0];
  const marketLine = market
    ? (() => {
        const open = isOpenNow(market.opening_hours, i.now);
        const close = closingTime(market.opening_hours, i.now);
        return `${open ? `지금 영업 중${close ? `(${close}까지)` : ""}` : "지금은 닫힘"} · ${hoursSummary(market.opening_hours)}`;
      })()
    : null;

  if (situation === "urgent_small") {
    // 2026-11-26 사용자 결정: 카카오맵에서 확인되고 전화가 있는 가게를 먼저(없어진 가게로 보내지 않게). 단 가장 가까운 곳보다 300m 넘게 멀면 거리순
    const sorted = nearest(i.stores, i.here, 10);
    const limit = sorted[0] ? distanceMeters(i.here, sorted[0]) + CONFIRMED_DETOUR_M : 0;
    const preferred = i.confirmed?.size ? sorted.find((s) => i.confirmed!.has(s.store_id) && distanceMeters(i.here, s) <= limit) : undefined;
    const ordered = preferred ? [preferred, ...sorted.filter((s) => s !== preferred)] : sorted;
    const isNearest = !preferred || preferred === sorted[0];
    const picks = ordered.slice(0, 3).map((s) => place({ id: s.store_id, name: cleanName(s.name), kind: STORE_KIND[s.category] ?? s.category, address: s.address, lat: s.lat, lng: s.lng, phone: null }, i.here));
    if (picks.length === 0) return null;
    const p = picks[0]!;
    return {
      situation,
      label: "급할 때 가까운 곳",
      headline: `${p.name}에서 바로 사세요`,
      reasons: [
        `${isNearest ? "가장 가까운" : "가까운"} ${p.kind}예요 · ${p.distance_text}`,
        retail ? `값은 마트·시장 수준이에요 · ${amountWord} 약 ${scale(retail.low, retail.high)}` : "값은 마트·시장 수준이에요",
      ],
      primary: p,
      others: picks.slice(1),
      benchmark: null,
      extra: null,
    };
  }

  if (situation === "bulk_pickup" && market) {
    const p = place({ id: market.id, name: "수원 농수산물도매시장", kind: `채소 상회 ${i.wholesale.length}곳`, address: market.address.replace(/\s*\([^)]*\)\s*$/, ""), lat: market.lat, lng: market.lng, phone: null }, i.here);
    const others = nearest(i.stores, i.here, 1).map((s) => place({ id: s.store_id, name: cleanName(s.name), kind: STORE_KIND[s.category] ?? s.category, address: s.address, lat: s.lat, lng: s.lng, phone: null }, i.here));
    return {
      situation,
      label: "많이 사러 직접 갈 때",
      headline: "수원 농수산물도매시장으로 가세요",
      reasons: [
        trader ? `도매시장 상회 값으로 살 수 있어요 · ${amountWord} 약 ${scale(trader.low, trader.high)}(서울 가락 기준)` : "도매시장 상회 값으로 살 수 있어요",
        retail && trader ? `마트·시장에서 사면 ${amountWord} 약 ${scale(retail.low, retail.high)}` : "",
        `${p.distance_text}${marketLine ? ` · ${marketLine}` : ""}`,
      ].filter(Boolean),
      primary: p,
      others,
      benchmark: null,
      extra: null,
    };
  }

  // 정해 두고 대량: 배달 거래처. 전화번호가 있는 식자재 납품업체를 먼저
  const withPhone = i.supply.filter((s) => s.phone);
  // 배달 거래처는 걸어가는 시간이 아니라 거리만(가까울수록 배달이 수월하다는 뜻)
  const picks = nearest(withPhone, i.here, 3)
    .map((s) => place({ id: s.store_id, name: cleanName(s.name), kind: "식자재 납품업체", address: s.address, lat: s.lat, lng: s.lng, phone: s.phone }, i.here))
    .map((p) => ({ ...p, distance_text: p.distance_m < 1000 ? `${p.distance_m}m` : `${(p.distance_m / 1000).toFixed(1)}km` }));
  if (picks.length === 0) return null;
  const p = picks[0]!;
  return {
    situation: "bulk_delivery",
    label: "정해 두고 많이 살 때",
    headline: `배달은 ${p.name}에 맡기세요`,
    reasons: [
      `가까운 식자재 납품업체예요 · ${p.distance_text}`,
    ],
    primary: p,
    others: picks.slice(1),
    benchmark: trader ? `견적이 ${amountWord} ${scale(trader.low, trader.high)}이면 적정해요(서울 가락 상회 값). 받은 견적을 적으면 바로 판정해 드려요.` : null,
    extra: market ? `새벽에 도매시장에 직접 가면 상회 값으로 사요 · ${place({ id: market.id, name: "", kind: "", address: "", lat: market.lat, lng: market.lng, phone: null }, i.here).distance_text} · ${hoursSummary(market.opening_hours)}` : null,
  };
}
