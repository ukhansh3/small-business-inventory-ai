import { describe, expect, it } from "vitest";
import { cheaperVendors, computeMarket, diagnoseLine, perKg, verdictOf } from "../../core/price";
import { baseDataset, MON_1000, northOf, offer, vendor } from "../fixtures/dataset";

// kg당 가격 p인 판매 정보(1kg 단위)
const priced = (vendor_id: string, p: number) =>
  offer(vendor_id, { price: p, price_unit_label: "1kg", unit_kg: 1, price_source: "현장확인", price_checked_on: "2026-11-03" });

describe("R-16 kg당 가격", () => {
  it("AC-17 상추 2kg 10,000원이면 kg당 5,000원", () => {
    expect(perKg(10000, 2)).toBe(5000);
  });
  it("AC-18 무게를 모르면(1봉) 비교하지 않고 kg당 값이 없다", () => {
    const data = baseDataset([], []);
    const line = diagnoseLine(data, { raw_name: "상추 1봉", item_id: "item_lettuce", qty_kg: null, amount_won: 3000 }, 1, null, "loc_test", MON_1000);
    expect(line).toMatchObject({ comparable: false, price_per_kg: null, reason: "단위를 알 수 없어요" });
  });
  it("상추가 아닌 품목은 비교하지 않는다", () => {
    const data = baseDataset([], []);
    const line = diagnoseLine(data, { raw_name: "대파 1kg", item_id: "item_green_onion", qty_kg: 1, amount_won: 3000 }, 1, null, "loc_test", MON_1000);
    expect(line).toMatchObject({ comparable: false, reason: "아직 상추만 비교해요", verdict: null });
  });
});

describe("R-18 동네 시세", () => {
  const vs = [vendor("v_201", "가"), vendor("v_202", "나"), vendor("v_203", "다", { data_status: "예시" })];
  it("AC-19 표본 2건이면 시세 없음", () => {
    const m = computeMarket(baseDataset(vs, [priced("v_201", 3000), priced("v_202", 4000)]), "item_lettuce", []);
    expect(m.per_kg).toBeNull();
    expect(m.display).toBe("아직 비교할 정보가 적어요");
  });
  it("판매처 가격 + 동의한 구매 기록으로 범위·중간값·건수, 예시 포함 표시", () => {
    const m = computeMarket(baseDataset(vs, [priced("v_201", 3000), priced("v_202", 4000), priced("v_203", 5000)]), "item_lettuce", [3500]);
    expect(m.per_kg).toEqual({ low: 3000, median: 3750, high: 5000 });
    expect(m.samples).toBe(4);
    expect(m.display).toBe("이 동네 상추 kg당 3,000~5,000원 · 중간 3,750원 · 4건 기준(예시 포함)");
  });
  it("AC-25 동의 전 기록은 넘기지 않으면 시세에 들어가지 않는다(표본 수로 확인)", () => {
    const d = baseDataset(vs, [priced("v_201", 3000), priced("v_202", 4000)]);
    expect(computeMarket(d, "item_lettuce", []).per_kg).toBeNull();
    expect(computeMarket(d, "item_lettuce", [3500]).per_kg).not.toBeNull();
  });
  it("가격·단위·출처가 하나라도 없는 판매 정보는 표본이 아니다(R-10)", () => {
    const m = computeMarket(baseDataset(vs, [priced("v_201", 3000), offer("v_202", { price: 4000 }), priced("v_203", 5000)]), "item_lettuce", []);
    expect(m.samples).toBe(2);
  });
});

describe("R-19 판정 ±15%", () => {
  it("AC-20 중간값 4,000원에서 경계", () => {
    expect(verdictOf(4600, 4000).verdict).toBe("normal");
    expect(verdictOf(4601, 4000).verdict).toBe("pricier");
    expect(verdictOf(3400, 4000).verdict).toBe("normal");
    expect(verdictOf(3399, 4000).verdict).toBe("cheaper");
    expect(verdictOf(5000, 4000).display).toBe("동네 중간 4,000원보다 25% 비싼 편");
  });
});

describe("R-20 더 싼 곳", () => {
  it("AC-21 내 kg당 4,000원보다 싼 판매처만, 거리순 최대 3곳", () => {
    const vs = [
      vendor("v_301", "멀고싼", northOf(900)),
      vendor("v_302", "가깝고싼", northOf(100)),
      vendor("v_303", "같은값", northOf(50)),
      vendor("v_304", "비싼", northOf(10)),
      vendor("v_305", "중간싼", northOf(500)),
      vendor("v_306", "제일먼싼", northOf(2000)),
    ];
    const d = baseDataset(vs, [priced("v_301", 3000), priced("v_302", 3500), priced("v_303", 4000), priced("v_304", 6000), priced("v_305", 3900), priced("v_306", 2000)]);
    const cards = cheaperVendors(d, "item_lettuce", 4000, "loc_test", MON_1000);
    expect(cards.map((c) => c.name)).toEqual(["가깝고싼", "중간싼", "멀고싼"]);
    expect(cards.map((c) => c.rank)).toEqual([1, 2, 3]);
  });
  it("진단 줄: 비싼 편이면 판정 문구와 더 싼 곳을 붙인다", () => {
    const vs = [vendor("v_401", "가", northOf(100)), vendor("v_402", "나", northOf(200)), vendor("v_403", "다", northOf(300))];
    const d = baseDataset(vs, [priced("v_401", 3000), priced("v_402", 4000), priced("v_403", 5000)]);
    const market = computeMarket(d, "item_lettuce", []);
    const line = diagnoseLine(d, { raw_name: "적상추 2kg", item_id: "item_lettuce", qty_kg: 2, amount_won: 10000 }, 1, market, "loc_test", MON_1000);
    expect(line).toMatchObject({ price_per_kg: 5000, comparable: true, verdict: "pricier", verdict_display: "동네 중간 4,000원보다 25% 비싼 편" });
    expect(line.cheaper.map((c) => c.vendor_id)).toEqual(["v_401", "v_402"]);
  });
});
