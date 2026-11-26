import { describe, expect, it } from "vitest";
import { ladderFor, referenceFor, type MarketPricesFile } from "../../core/market-prices";
import { autoFulfillment, distanceText, isSmall, recommend, situationOf, type RecommendInput } from "../../core/recommend";
import { seoulNow } from "../../core/time";
import { vendor, MON_1000 } from "../fixtures/dataset";

// ADR-013(팀 검토안): 구매 상황별 한 곳 추천

const prices: MarketPricesFile = {
  region: "수원", built_on: "2026-11-25", sources: { wholesale: "w", retail: "r" },
  items: [{
    item_id: "item_onion",
    wholesale: { date: "2026-11-25", per_kg: 1400, trades: 8, low_per_kg: 1300, high_per_kg: 1450 },
    retail: { date: "2026-11-24", traditional_market_per_kg: 2300, large_retailer_per_kg: 1220 },
    trader: { date: "2026-11-24", market: "서울 가락", box_kg: 15, low: 11500, high: 20500 },
    change: null,
  }],
};
const here = { lat: 37.28, lng: 127.04 };
const store = (id: string, name: string, dLat: number) => ({ store_id: id, name, category: "채소/과일" as const, gu: "수원시 영통구" as const, dong: "원천동", address: "주소", lat: here.lat + dLat, lng: here.lng });
const supply = (id: string, name: string, dLat: number, phone: string | null) => ({ store_id: id, name, address: "주소", phone, licensed_on: null, lat: here.lat + dLat, lng: here.lng });
const market = { ...vendor("v_301", "의림상회 · 경기청과", { lat: 37.2514, lng: 127.039 }), kind: "도매시장 중도매인" as const };
const input = (over: Partial<RecommendInput>): RecommendInput => ({
  item_id: "item_onion", item_name: "양파", qty_kg: null, urgency: "now", fulfillment: "pickup",
  here, now: seoulNow(MON_1000),
  stores: [store("ps_far", "먼가게", 0.01), store("ps_near", "럭키;과일;야채", 0.001)],
  supply: [supply("sv_nophone", "번호없음", 0.0005, null), supply("sv_a", "가까운유통", 0.003, "031-111-2222"), supply("sv_b", "먼유통", 0.02, "031-333-4444")],
  wholesale: [market, { ...market, id: "v_302" }],
  ladder: ladderFor(referenceFor(prices, "item_onion")!),
  ...over,
});

describe("상황 구분", () => {
  it("거래 단위보다 적거나 양을 모르면 소량", () => {
    expect(isSmall("item_onion", 10)).toBe(true);
    expect(isSmall("item_onion", 15)).toBe(false);
    expect(isSmall("item_onion", null)).toBe(true);
  });
  it("받는 방식은 묻지 않고 상황으로: 지금+소량이면 직접, 그 밖은 배달", () => {
    expect(autoFulfillment("item_onion", 2, "now")).toBe("pickup");
    expect(autoFulfillment("item_onion", 30, "now")).toBe("delivery");
    expect(autoFulfillment("item_onion", 2, "today")).toBe("delivery");
  });
  it("사장님이 직접 가겠다고 한 대량은 도매시장", () => {
    expect(situationOf("item_onion", 30, "today", "pickup")).toBe("bulk_pickup");
    expect(situationOf("item_onion", 2, "now", "pickup")).toBe("urgent_small");
    expect(situationOf("item_onion", 2, "now", "delivery")).toBe("bulk_delivery");
  });
});

describe("추천 한 곳", () => {
  it("급한 소량: 가장 가까운 동네 가게, 값은 마트·시장 수준, 영업시간 미확인을 밝힘", () => {
    const r = recommend(input({ qty_kg: 2 }))!;
    expect(r.situation).toBe("urgent_small");
    expect(r.headline).toBe("럭키 과일 야채에서 바로 사세요");
    expect(r.reasons[0]).toMatch(/^가장 가까운 동네 채소 가게예요 · 걸어서 \d+분/);
    expect(r.reasons[1]).toBe("값은 마트·시장 수준이에요 · 2kg 약 2,400~4,600원");
    expect(r.reasons).toHaveLength(2); // 없는 정보를 알리는 문구는 넣지 않는다
    expect(r.others.map((o) => o.id)).toEqual(["ps_far"]);
  });
  it("정해 두고 대량: 전화번호 있는 납품업체 중 가장 가까운 곳 + 적정 값 기준선 + 새벽 도매시장 한 줄", () => {
    const r = recommend(input({ qty_kg: 15, urgency: "today", fulfillment: "delivery" }))!;
    expect(r.situation).toBe("bulk_delivery");
    expect(r.headline).toBe("배달은 가까운유통에 맡기세요");
    expect(r.primary.phone).toBe("031-111-2222");
    expect(r.benchmark).toBe("견적이 15kg 1.2만~2.1만원이면 적정해요(서울 가락 상회 값). 받은 견적을 적으면 바로 판정해 드려요.");
    expect(r.extra).toMatch(/^새벽에 도매시장에 직접 가면 상회 값으로 사요/);
  });
  it("직접 가서 대량: 도매시장, 상회 값과 마트 값을 함께", () => {
    const r = recommend(input({ qty_kg: 30, urgency: "today", fulfillment: "pickup" }))!;
    expect(r.headline).toBe("수원 농수산물도매시장으로 가세요");
    expect(r.primary.kind).toBe("채소 상회 2곳");
    expect(r.reasons[0]).toBe("도매시장 상회 값으로 살 수 있어요 · 30kg 약 2.3만~4.1만원(서울 가락 기준)");
  });
  it("후보가 없으면 null", () => {
    expect(recommend(input({ stores: [] }))).toBeNull();
  });
  it("거리 문구", () => {
    expect(distanceText(134)).toBe("걸어서 2분(134m)");
    expect(distanceText(2800)).toBe("차로 약 8분(2.8km)");
  });
});
