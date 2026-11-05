import { describe, expect, it } from "vitest";
import { gradeImage, summarizeImages } from "../../evals/grade-images";

const e = { id: "x", file: "x.png", receipt: true, lettuce: [{ weight_kg_total: 2, amount_won: 10000 }, { weight_kg_total: null, amount_won: 3000 }] };
const read = (lines: { item_id: string | null; weight_kg_total: number | null; amount_won: number }[], doc_type: "paper_receipt" | "not_receipt" = "paper_receipt") => ({
  doc_type,
  seller_type: "local_store" as const,
  purchased_on: null,
  delivery_fee_won: null,
  lines: lines.map((l) => ({ raw_name: "상추", ...l })),
});

describe("사진 evals 채점이 틀린 답을 잡는다", () => {
  it("맞으면 모두 맞음, 무게를 지어내면 fabricated, 없는 금액도 fabricated", () => {
    expect(gradeImage(e, read([{ item_id: "item_lettuce", weight_kg_total: 2, amount_won: 10000 }, { item_id: "item_lettuce", weight_kg_total: null, amount_won: 3000 }]))).toMatchObject({ matched: 2, fabricated: 0, receiptOk: true });
    expect(gradeImage(e, read([{ item_id: "item_lettuce", weight_kg_total: 1, amount_won: 3000 }])).fabricated).toBe(1);
    expect(gradeImage(e, read([{ item_id: "item_lettuce", weight_kg_total: 2, amount_won: 99999 }])).fabricated).toBe(1);
  });
  it("영수증 아님 판별, 오류, 목표 판정", () => {
    expect(gradeImage({ ...e, receipt: false, lettuce: [] }, read([], "not_receipt")).receiptOk).toBe(true);
    expect(gradeImage(e, read([], "not_receipt")).receiptOk).toBe(false);
    expect(gradeImage(e, { error: "x" }).matched).toBe(0);
    const good = gradeImage(e, read([{ item_id: "item_lettuce", weight_kg_total: 2, amount_won: 10000 }, { item_id: "item_lettuce", weight_kg_total: null, amount_won: 3000 }]));
    expect(summarizeImages([good]).ok).toBe(true);
    expect(summarizeImages([good, gradeImage(e, read([{ item_id: "item_lettuce", weight_kg_total: 5, amount_won: 3000 }]))]).ok).toBe(false);
  });
});
