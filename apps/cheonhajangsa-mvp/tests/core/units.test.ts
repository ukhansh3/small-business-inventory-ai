import { describe, expect, it } from "vitest";
import { mentionedItem, unitQtyKg } from "../../core/units";
import items from "../../data/items.json";
import type { Item } from "../../core/types";
import { resultLine } from "../../src/lib/assist-state";

// v3 문장 보조 규칙(결정적): 거래 단위 → kg, 문장 속 품목 찾기, 결과 말풍선

describe("거래 단위만 쓴 양", () => {
  it("품목의 거래 단위와 맞으면 kg으로 바꾼다", () => {
    expect(unitQtyKg("파 한단에 2500원", "item_green_onion")).toBe(1);
    expect(unitQtyKg("대파 3단 6천원", "item_green_onion")).toBe(3);
    expect(unitQtyKg("양파 2망 4만원", "item_onion")).toBe(30);
    expect(unitQtyKg("상추 한 박스 2만원", "item_lettuce")).toBe(4);
    expect(unitQtyKg("감자 상자에 3만원", "item_potato")).toBe(20);
  });
  it("단위가 없거나 품목과 안 맞거나 다른 낱말이면 바꾸지 않는다", () => {
    expect(unitQtyKg("상추 만원", "item_lettuce")).toBeNull();
    expect(unitQtyKg("양파 한 박스 2만원", "item_onion")).toBeNull(); // 양파는 망
    expect(unitQtyKg("대파 단가가 얼마예요", "item_green_onion")).toBeNull();
    expect(unitQtyKg("파 한단", null)).toBeNull();
  });
});

describe("문장 속 품목", () => {
  const list = items as unknown as Item[];
  it("가장 긴 이름이 이긴다(양파 속 '파'를 대파로 보지 않음)", () => {
    expect(mentionedItem("양파 10키로 필요해요", list)?.id).toBe("item_onion");
    expect(mentionedItem("파 한단", list)?.id).toBe("item_green_onion");
    expect(mentionedItem("오늘 날씨 어때", list)).toBeNull();
  });
});

describe("결과 말풍선", () => {
  const g = (key: "available" | "no_delivery" | "unavailable_time", count: number) => ({ key, title: "", count, items: [] });
  it("조건을 다 맞춘 곳만 '찾았어요'로 센다", () => {
    expect(resultLine({ total: 78, empty_hint: null, groups: [g("available", 78)] })).toBe("조건에 맞는 곳 78곳을 찾았어요.");
    expect(resultLine({ total: 78, empty_hint: null, groups: [g("no_delivery", 78)] })).toMatch(/^배달이 확인된 곳은 아직 없어요\. 직접 가실 수 있는 곳 78곳/);
    expect(resultLine({ total: 5, empty_hint: null, groups: [g("unavailable_time", 5)] })).toMatch(/^고른 시간에 여는 곳은 없어요/);
    expect(resultLine({ total: 0, empty_hint: null, groups: [] })).toBe("조건에 맞는 곳이 없어요.");
  });
});

import { hasExplicitWeight } from "../../core/units";
describe("무게 직접 표기", () => {
  it("숫자+무게 단위가 있으면 참", () => {
    expect(hasExplicitWeight("감자 20키로 한 박스")).toBe(true);
    expect(hasExplicitWeight("상추 500g")).toBe(true);
    expect(hasExplicitWeight("감자 한 박스 3만원")).toBe(false);
  });
});
