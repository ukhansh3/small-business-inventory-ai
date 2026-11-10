import { describe, expect, it } from "vitest";
import type { Store } from "../../src/lib/api-types";
import { focusFor, pinsFor } from "../../src/lib/map-pins";

const card = (vendor_id: string, is_example: boolean) =>
  ({ vendor_id, name: vendor_id, kind: "채소가게", is_example, rank: 0, distance: { meters: 1, display: "1m", walk_minutes: 1 }, open_status: { state: "open", display: "" }, restock: { state: "none", time: null, display: null }, delivery: { state: "not_requested", display: null, note: null }, deliveryStatus: "unknown", destinationConfirmationRequired: false, deliveryTerms: null, price: { has_price: false, display: "", per_kg_display: null }, min_sale: { kg: null, display: "" }, phone: "" }) as const;
const stores: Store[] = [
  { store_id: "v_001", kind: "vendor", name: "예시가게", category: "채소가게", address: "", lat: 1, lng: 1, distance_m: 10, vendor_card: { ...card("v_001", true) } },
  { store_id: "v_002", kind: "vendor", name: "확인가게", category: "채소가게", address: "", lat: 2, lng: 2, distance_m: 20, vendor_card: { ...card("v_002", false) } },
  { store_id: "ps_1", kind: "public", name: "공공", category: "채소/과일", address: "", lat: 3, lng: 3, distance_m: 30 },
];

describe("지도 핀과 강조(AC-28·AC-30)", () => {
  it("판매처(확인·예시)·공공데이터·내 위치를 구분한다", () => {
    expect(pinsFor(stores, { lat: 0, lng: 0, name: "아주대 정문" }).map((p) => [p.id, p.kind])).toEqual([
      ["v_001", "example"],
      ["v_002", "vendor"],
      ["ps_1", "public"],
      ["__me", "me"],
    ]);
  });
  it("고른 가게 > 찾기 결과 > 진단의 더 싼 곳, 없으면 강조 없음", () => {
    const results = { groups: [{ key: "available" as const, title: "", count: 1, items: [{ ...card("v_002", false) }] }], total: 1, empty_hint: null };
    const priceCheck = { lines: [{ cheaper: [{ ...card("v_001", true) }] }] } as never;
    expect(focusFor("ps_1", results, priceCheck)).toEqual(["ps_1"]);
    expect(focusFor(null, results, priceCheck)).toEqual(["v_002"]);
    expect(focusFor(null, null, priceCheck)).toEqual(["v_001"]);
    expect(focusFor(null, null, null)).toEqual([]);
  });
});
