import { describe, expect, it } from "vitest";
import { grade, summarize } from "../../evals/grade";

const lettuce = { type: "search" as const, item_id: "item_lettuce", qty_kg: 2, urgency: "now", fulfillment: null };

describe("evals 채점이 틀린 답을 잡는다", () => {
  it("값이 다르면 실패, 문장에 없는 값을 채우면 지어낸 값", () => {
    expect(grade(lettuce, { ...lettuce, qty_kg: 3 } as never)).toMatchObject({ pass: false, wrong: ["qty_kg"] });
    expect(grade(lettuce, { ...lettuce, fulfillment: "pickup" } as never)).toMatchObject({ pass: false, fabricated: ["fulfillment"] });
    expect(grade(lettuce, lettuce as never).pass).toBe(true);
  });
  it("검색이어야 할 문장을 안내로 답하거나, 범위 밖을 검색하면 실패", () => {
    expect(grade(lettuce, { type: "notice", kind: "off_topic", item_name: null }).pass).toBe(false);
    expect(grade({ type: "notice", kind: "out_of_scope_item" }, { type: "search", item_id: "item_lettuce", qty_kg: null, urgency: null, fulfillment: null }).pass).toBe(false);
    expect(grade({ type: "notice", kind: "out_of_scope_item" }, { type: "error", message: "x" }).pass).toBe(false);
  });
  it("목표: 조건 90%·지어낸 값 0·범위 100% 중 하나라도 못 미치면 ok=false", () => {
    const good = { expect: lettuce, got: lettuce as never, pass: true, wrong: [], fabricated: [] };
    const fab = { expect: lettuce, got: lettuce as never, pass: false, wrong: ["fulfillment"], fabricated: ["fulfillment"] };
    expect(summarize(Array(10).fill(good)).ok).toBe(true);
    expect(summarize([...Array(9).fill(good), fab]).ok).toBe(false); // 정확도 90%여도 지어낸 값 1건이면 미달
  });
});

describe("evals 채점: 가격 한 줄", () => {
  const price = { type: "price" as const, item_id: "item_lettuce", qty_kg: 2, amount_won: 10000 };
  it("금액이 다르면 실패, 말하지 않은 양을 채우면 지어낸 값", () => {
    expect(grade(price, { ...price, amount_won: 1000 }).pass).toBe(false);
    expect(grade({ ...price, qty_kg: null }, price).fabricated).toEqual(["qty_kg"]);
    expect(grade(price, { type: "search", item_id: "item_lettuce", qty_kg: 2, urgency: null, fulfillment: null }).pass).toBe(false);
    expect(grade(price, price).pass).toBe(true);
  });
});
