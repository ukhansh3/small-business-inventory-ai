import { distanceMeters } from "./distance";
import { pricePerKg, won } from "./format";
import { buildCard } from "./search";
import type { VendorCard } from "./search-types";
import { seoulNow } from "./time";
import type { Dataset } from "./types";

// 단가 진단(v2, docs/feature-v2.md 2절 R-16~R-20). 입력·시각·데이터만 받는 순수 함수.

export const MIN_MARKET_SAMPLES = 3; // R-18
export const VERDICT_BAND = 0.15; // R-19 ±15%(가정)
export const MAX_CHEAPER = 3; // R-20

export type Market = {
  item_id: string;
  per_kg: { low: number; median: number; high: number } | null;
  samples: number;
  includes_example: boolean;
  display: string;
};

export type Verdict = "cheaper" | "normal" | "pricier";

// 사진·글에서 읽은 줄(서버 검증을 거친 값)
export type PurchaseLineInput = {
  raw_name: string;
  item_id: string | null;
  qty_kg: number | null; // 환산 무게. 단위를 모르면 null
  amount_won: number; // 배송비 제외(R-17)
};

export type PriceLine = {
  line_no: number;
  raw_name: string;
  item_id: string | null;
  item_name: string | null;
  qty_kg: number | null;
  amount_won: number;
  price_per_kg: number | null;
  comparable: boolean;
  reason: string | null;
  verdict: Verdict | null;
  verdict_display: string | null;
  cheaper: VendorCard[];
};

// R-16: kg당 가격(원 단위 반올림). 무게를 모르면 null
export function perKg(amount_won: number, qty_kg: number | null): number | null {
  if (qty_kg === null || !(qty_kg > 0) || !(amount_won > 0)) return null;
  return Math.round(amount_won / qty_kg);
}

function median(sorted: number[]): number {
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m]! : Math.round((sorted[m - 1]! + sorted[m]!) / 2);
}

// R-18: 판매처 가격 + 동의한 구매 기록(kg당). 표본 3건 미만이면 시세 없음
export function computeMarket(data: Dataset, itemId: string, observedPerKg: number[]): Market {
  const item = data.items.find((i) => i.id === itemId);
  const name = item?.name ?? itemId;
  const fromVendors: number[] = [];
  let includesExample = false;
  for (const o of data.offers) {
    if (o.item_id !== itemId || !o.available) continue;
    const p = pricePerKg(o);
    if (p === null) continue;
    fromVendors.push(Math.round(p));
    if (data.vendors.find((v) => v.id === o.vendor_id)?.data_status === "예시") includesExample = true;
  }
  const all = [...fromVendors, ...observedPerKg.filter((n) => n > 0)].sort((a, b) => a - b);
  if (all.length < MIN_MARKET_SAMPLES) {
    return { item_id: itemId, per_kg: null, samples: all.length, includes_example: includesExample, display: "아직 비교할 정보가 적어요" };
  }
  const per_kg = { low: all[0]!, median: median(all), high: all[all.length - 1]! };
  return {
    item_id: itemId,
    per_kg,
    samples: all.length,
    includes_example: includesExample,
    display: `이 동네 ${name} kg당 ${won(per_kg.low)}~${won(per_kg.high)}원 · 중간 ${won(per_kg.median)}원 · ${all.length}건 기준${includesExample ? "(예시 포함)" : ""}`,
  };
}

// R-19: 중간값보다 15% 넘게 높으면 비싼 편, 15% 넘게 낮으면 싼 편
export function verdictOf(mine: number, median: number): { verdict: Verdict; display: string } {
  const pct = Math.round(Math.abs(mine - median) / median * 100);
  if (mine > median * (1 + VERDICT_BAND)) return { verdict: "pricier", display: `동네 중간 ${won(median)}원보다 ${pct}% 비싼 편` };
  if (mine < median * (1 - VERDICT_BAND)) return { verdict: "cheaper", display: `동네 중간 ${won(median)}원보다 ${pct}% 싼 편` };
  return { verdict: "normal", display: `동네 중간 ${won(median)}원과 비슷해요` };
}

// R-20: 내 kg당 가격보다 싸게 파는 판매처, 거리순 최대 3곳. 카드는 결과 목록과 같은 함수로 만든다
export function cheaperVendors(data: Dataset, itemId: string, mine: number, locationId: string, now: Date): VendorCard[] {
  const loc = data.locations.find((l) => l.id === locationId);
  if (!loc) return [];
  const sn = seoulNow(now);
  const rows: { meters: number; card: Omit<VendorCard, "rank"> }[] = [];
  for (const o of data.offers) {
    if (o.item_id !== itemId || !o.available) continue;
    const p = pricePerKg(o);
    if (p === null || !(p < mine)) continue;
    const v = data.vendors.find((x) => x.id === o.vendor_id);
    if (!v) continue;
    rows.push({ meters: distanceMeters(loc, v), card: buildCard(v, o, { item_id: itemId, qty_kg: null, urgency: "now", fulfillment: "pickup", location_id: loc.id }, loc, sn) });
  }
  return rows
    .sort((a, b) => a.meters - b.meters)
    .slice(0, MAX_CHEAPER)
    .map((r, i) => ({ ...r.card, rank: i + 1 }));
}

// 줄 하나 진단. 비교할 수 없으면 이유를 남기고 값을 지어내지 않는다(R-02, R-16)
export function diagnoseLine(data: Dataset, line: PurchaseLineInput, lineNo: number, market: Market | null, locationId: string, now: Date): PriceLine {
  const item = line.item_id ? data.items.find((i) => i.id === line.item_id) : undefined;
  const base = {
    line_no: lineNo,
    raw_name: line.raw_name,
    item_id: item?.id ?? null,
    item_name: item?.name ?? null,
    qty_kg: line.qty_kg,
    amount_won: line.amount_won,
    verdict: null,
    verdict_display: null,
    cheaper: [],
  };
  if (!item || !item.active) {
    return { ...base, price_per_kg: perKg(line.amount_won, line.qty_kg), comparable: false, reason: "아직 상추만 비교해요" };
  }
  const ppk = perKg(line.amount_won, line.qty_kg);
  if (ppk === null) return { ...base, price_per_kg: null, comparable: false, reason: line.qty_kg === null ? "단위를 알 수 없어요" : "금액을 알 수 없어요" };
  if (!market || market.per_kg === null) return { ...base, price_per_kg: ppk, comparable: true, reason: "아직 비교할 정보가 적어요" };
  const v = verdictOf(ppk, market.per_kg.median);
  return { ...base, price_per_kg: ppk, comparable: true, reason: null, verdict: v.verdict, verdict_display: v.display, cheaper: cheaperVendors(data, item.id, ppk, locationId, now) };
}
