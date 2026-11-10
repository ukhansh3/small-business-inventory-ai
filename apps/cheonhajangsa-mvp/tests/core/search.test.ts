import { describe, expect, it } from "vitest";
import { loadDataset } from "../../core/data";
import { search, SearchInputError } from "../../core/search";
import type { SearchCondition, SearchResult, VendorCard } from "../../core/search-types";
import {
  A,
  B,
  baseDataset,
  C,
  D,
  E,
  F,
  G,
  hours,
  MON_1000,
  MON_2100,
  northOf,
  offer,
  TODAY,
  vendor,
} from "../fixtures/dataset";

const cond = (over: Partial<SearchCondition> = {}): SearchCondition => ({
  item_id: "item_lettuce",
  qty_kg: null,
  urgency: "now",
  fulfillment: "pickup",
  location_id: "loc_test",
  ...over,
});

const cards = (r: SearchResult): VendorCard[] => r.groups.flatMap((g) => g.items);
const ids = (r: SearchResult) => cards(r).map((c) => c.vendor_id);
const card = (r: SearchResult, id: string) => cards(r).find((c) => c.vendor_id === id)!;
const groupOf = (r: SearchResult, id: string) => r.groups.find((g) => g.items.some((c) => c.vendor_id === id))?.key;

describe("AC-1 최소 판매량(R-03)", () => {
  const data = baseDataset([A], [offer("v_101", { min_sale_kg: 2 })]);

  it("원하는 양 1kg이면 최소 2kg인 A가 없다", () => {
    expect(ids(search(data, cond({ qty_kg: 1 }), MON_1000))).not.toContain("v_101");
  });
  it("2kg이면 A가 있다", () => {
    expect(ids(search(data, cond({ qty_kg: 2 }), MON_1000))).toContain("v_101");
  });
  it("양을 정하지 않으면 빼지 않는다", () => {
    expect(ids(search(data, cond({ qty_kg: null }), MON_1000))).toContain("v_101");
  });
  it("최소 판매량이 비면 '최소 판매량 미확인'", () => {
    const r = search(baseDataset([A], [offer("v_101")]), cond({ qty_kg: 1 }), MON_1000);
    expect(card(r, "v_101").min_sale.display).toBe("최소 판매량 미확인");
  });
});

describe("AC-2 배달(R-07)", () => {
  const data = baseDataset([A, B], [offer("v_101"), offer("v_102")]);

  it("배달 동네 밖인 B는 빠지지 않고 no_delivery 묶음, '배달 안 됨'", () => {
    const r = search(data, cond({ fulfillment: "delivery" }), MON_1000);
    expect(groupOf(r, "v_102")).toBe("no_delivery");
    expect(card(r, "v_102").delivery).toEqual({ state: "unavailable", display: "배달 안 됨", note: null });
  });
  it("배달 동네 안이면 available, '배달 가능'", () => {
    const inArea = baseDataset(
      [vendor("v_102", "B가게", { delivery_available: true, delivery_dongs: ["원천동"], delivery_note: "2만 원 이상" })],
      [offer("v_102")],
    );
    const r = search(inArea, cond({ fulfillment: "delivery" }), MON_1000);
    expect(groupOf(r, "v_102")).toBe("available");
    expect(card(r, "v_102").delivery.display).toBe("배달 가능");
    expect(card(r, "v_102").delivery.note).toBe("2만 원 이상");
  });
  it("직접 가지러 가면 배달 표시가 없다", () => {
    const r = search(data, cond({ fulfillment: "pickup" }), MON_1000);
    expect(card(r, "v_102").delivery.state).toBe("not_requested");
  });
});

describe("AC-4 가격 표시(R-10·R-11)", () => {
  const data = baseDataset(
    [C, D],
    [
      offer("v_103", { price: 15000, price_unit_label: "1박스(4kg)", unit_kg: 4, price_source: "가게안내", price_checked_on: "2026-11-03" }),
      offer("v_104", { price: 9000, price_unit_label: "1kg", unit_kg: 1, price_source: "가게안내", price_checked_on: null }),
    ],
  );
  const r = search(data, cond(), MON_1000);

  it("C는 가격·단위·출처·확인일과 kg당 환산", () => {
    expect(card(r, "v_103").price).toEqual({
      has_price: true,
      display: "1박스(4kg) 15,000원 · 가게 안내 · 11월 3일 확인",
      per_kg_display: "(kg당 약 3,800원)",
    });
  });
  it("D는 확인일이 없어 '가격 정보 없음'", () => {
    expect(card(r, "v_104").price).toEqual({ has_price: false, display: "가격 정보 없음", per_kg_display: null });
  });
  it("1kg 단위는 kg당 환산을 붙이지 않는다", () => {
    const one = search(
      baseDataset([C], [offer("v_103", { price: 4000, price_unit_label: "1kg", unit_kg: 1, price_source: "예시", price_checked_on: "2026-11-03" })]),
      cond(),
      MON_1000,
    );
    expect(card(one, "v_103").price.per_kg_display).toBeNull();
  });
});

describe("AC-7 영업 판정(R-04·R-06)", () => {
  const data = baseDataset([E], [offer("v_105")]);

  it("월 21:00, 07:00~20:00인 E는 지금은 닫힌 곳, '지금은 닫힘 · 내일 07:00'", () => {
    const r = search(data, cond({ urgency: "now" }), MON_2100);
    expect(groupOf(r, "v_105")).toBe("unavailable_time");
    expect(r.groups.find((g) => g.key === "unavailable_time")?.title).toBe("지금은 닫힌 곳");
    expect(card(r, "v_105").open_status).toEqual({ state: "closed", display: "지금은 닫힘 · 내일 07:00" });
  });
  it("월 10:00이면 영업 중 ~20:00", () => {
    const r = search(data, cond({ urgency: "now" }), MON_1000);
    expect(groupOf(r, "v_105")).toBe("available");
    expect(card(r, "v_105").open_status).toEqual({ state: "open", display: "영업 중 ~20:00" });
  });
  it("오늘 안: 오후에 여는 곳은 available", () => {
    const late = baseDataset([vendor("v_105", "E가게", { opening_hours: hours("15:00", "22:00") })], [offer("v_105")]);
    const r = search(late, cond({ urgency: "today" }), MON_1000);
    expect(groupOf(r, "v_105")).toBe("available");
    expect(card(r, "v_105").open_status.display).toBe("지금은 닫힘 · 오늘 15:00");
  });
  it("내일: 내일(화) 쉬는 곳은 내일은 안 여는 곳", () => {
    const h = hours("07:00", "20:00");
    const closedTue = baseDataset([vendor("v_105", "E가게", { opening_hours: { ...h, tue: "closed" } })], [offer("v_105")]);
    const r = search(closedTue, cond({ urgency: "tomorrow" }), MON_1000);
    expect(groupOf(r, "v_105")).toBe("unavailable_time");
    expect(r.groups[0]?.title).toBe("내일은 안 여는 곳");
  });
  it("자정 넘김 영업: 일 20:00~02:00이면 월 01:00에 영업 중", () => {
    const h = hours("20:00", "02:00");
    const late = baseDataset([vendor("v_105", "E가게", { opening_hours: h })], [offer("v_105")]);
    const r = search(late, cond(), new Date("2026-11-08T16:00:00Z")); // 월 01:00
    expect(card(r, "v_105").open_status).toEqual({ state: "open", display: "영업 중 ~02:00" });
  });
});

describe("AC-8 입고 판정(R-05)", () => {
  const data = baseDataset(
    [F, G],
    [
      offer("v_106", { restock_days: ["mon"], restock_time: "07:00", last_restocked_on: TODAY }),
      offer("v_107", { restock_days: ["mon"], restock_time: "15:00" }),
    ],
  );
  const r = search(data, cond(), MON_1000);

  it("F는 '오늘 07:00 입고됨'", () => {
    expect(card(r, "v_106").restock).toEqual({ state: "restocked_today", time: "07:00", display: "오늘 07:00 입고됨" });
  });
  it("G는 '오늘 15:00 입고 예정'", () => {
    expect(card(r, "v_107").restock).toEqual({ state: "expected_today", time: "15:00", display: "오늘 15:00 입고 예정" });
  });
  it("입고 시각이 지났고 갱신이 없으면 표시하지 않는다(지어내지 않기)", () => {
    const passed = search(baseDataset([G], [offer("v_107", { restock_days: ["mon"], restock_time: "07:00" })]), cond(), MON_1000);
    expect(card(passed, "v_107").restock).toEqual({ state: "none", time: null, display: null });
  });
});

describe("AC-9 정렬(R-09)", () => {
  it("입고 → 거리 → kg당 가격 → 이름", () => {
    const p = (price: number) => ({ price, price_unit_label: "1kg", unit_kg: 1, price_source: "가게안내" as const, price_checked_on: "2026-11-03" });
    const data = baseDataset(
      [
        vendor("v_201", "가", northOf(900)), // 멀지만 오늘 입고됨 → 1위
        vendor("v_202", "나", northOf(100)), // 가깝고 입고 표시 없음
        vendor("v_203", "다", northOf(300)), // 같은 거리, 더 쌈
        vendor("v_204", "라", northOf(300)), // 같은 거리, 더 비쌈
        vendor("v_205", "마", northOf(300)), // 같은 거리, 가격 없음 → 뒤
      ],
      [
        offer("v_201", { last_restocked_on: TODAY, ...p(5000) }),
        offer("v_202", p(9000)),
        offer("v_203", p(3000)),
        offer("v_204", p(4000)),
        offer("v_205"),
      ],
    );
    const r = search(data, cond(), MON_1000);
    expect(ids(r)).toEqual(["v_201", "v_202", "v_203", "v_204", "v_205"]);
    expect(cards(r).map((c) => c.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  it("묶음 순서: 갈 수 있는 곳 → 배달 안 됨 → 시간 안 맞음", () => {
    const data = baseDataset(
      [
        vendor("v_301", "열림배달", { delivery_available: true, delivery_dongs: ["원천동"] }),
        vendor("v_302", "열림무배달"),
        vendor("v_303", "닫힘", { opening_hours: hours("15:00", "16:00") }),
      ],
      [offer("v_301"), offer("v_302"), offer("v_303")],
    );
    const r = search(data, cond({ fulfillment: "delivery" }), MON_1000);
    expect(r.groups.map((g) => g.key)).toEqual(["available", "no_delivery", "unavailable_time"]);
  });
});

describe("AC-12 결과 0건(R-15)", () => {
  it("모두 최소 판매량에 걸리면 total 0과 바꿀 조건 한 줄", () => {
    const data = baseDataset([A, B], [offer("v_101", { min_sale_kg: 2 }), offer("v_102", { min_sale_kg: 4 })]);
    const r = search(data, cond({ qty_kg: 1 }), MON_1000);
    expect(r.total).toBe(0);
    expect(r.groups).toEqual([]);
    expect(r.empty_hint).toBe("2kg 이상으로 고르면 1곳이 있어요.");
  });
  it("결과가 있으면 empty_hint는 null", () => {
    const r = search(baseDataset([A], [offer("v_101")]), cond(), MON_1000);
    expect(r.empty_hint).toBeNull();
  });
});

describe("AC-6 지어내지 않기(R-02)", () => {
  it("실제 데이터로 검색한 모든 카드의 이름·번호·종류가 데이터와 같다", () => {
    const data = loadDataset();
    const loc = data.locations.find((l) => l.is_default)!;
    for (const urgency of ["now", "today", "tomorrow"] as const) {
      for (const fulfillment of ["pickup", "delivery"] as const) {
        const r = search(data, { item_id: "item_lettuce", qty_kg: null, urgency, fulfillment, location_id: loc.id }, MON_1000);
        for (const c of cards(r)) {
          const v = data.vendors.find((x) => x.id === c.vendor_id);
          expect(v).toBeDefined();
          expect(c.name).toBe(v!.name);
          expect(c.phone).toBe(v!.phone);
          expect(c.kind).toBe(v!.kind);
          expect(c.is_example).toBe(v!.data_status === "예시");
        }
      }
    }
  });
  it("판매하지 않는(available=false) 판매 정보는 결과에 없다(R-01)", () => {
    const r = search(baseDataset([A], [offer("v_101", { available: false })]), cond(), MON_1000);
    expect(r.total).toBe(0);
  });
});

describe("입력 검증", () => {
  const data = baseDataset([A], [offer("v_101")]);
  it("비활성 품목은 ITEM_NOT_ACTIVE", () => {
    expect(() => search(data, cond({ item_id: "item_green_onion" }), MON_1000)).toThrowError(SearchInputError);
    try {
      search(data, cond({ item_id: "item_green_onion" }), MON_1000);
    } catch (e) {
      expect((e as SearchInputError).code).toBe("ITEM_NOT_ACTIVE");
    }
  });
  it("양이 범위 밖이면 INVALID_INPUT", () => {
    expect(() => search(data, cond({ qty_kg: 100 }), MON_1000)).toThrowError(/0.5kg/);
  });
  it("없는 위치는 NOT_FOUND", () => {
    try {
      search(data, cond({ location_id: "loc_none" }), MON_1000);
      throw new Error("예외가 나야 함");
    } catch (e) {
      expect((e as SearchInputError).code).toBe("NOT_FOUND");
    }
  });
});
