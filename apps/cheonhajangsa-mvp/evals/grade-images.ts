import type { PurchaseRead } from "../server/ai/vision";

// 사진 읽기 evals 채점(V2-7). 상추 줄만 본다: 무게(kg)·금액(원)이 기대와 같아야 맞음
export type ImageExpect = { id: string; file: string; receipt: boolean; lettuce: { weight_kg_total: number | null; amount_won: number }[]; delivery_fee_won?: number };
export const IMAGE_TARGET = { lettuceAccuracy: 0.9, fabricated: 0, receiptAccuracy: 1 };

const same = (a: number | null, b: number | null) => (a === null || b === null ? a === b : Math.abs(a - b) < 1e-6);

export function gradeImage(e: ImageExpect, got: PurchaseRead | { error: string }) {
  if ("error" in got) return { receiptOk: false, matched: 0, expected: e.lettuce.length, fabricated: 0, notes: [got.error] };
  const receiptOk = (got.doc_type !== "not_receipt") === e.receipt;
  const lines = got.lines.filter((l) => l.item_id === "item_lettuce");
  const left = [...e.lettuce];
  let matched = 0;
  let fabricated = 0;
  const notes: string[] = [];
  for (const l of lines) {
    const i = left.findIndex((x) => x.amount_won === l.amount_won && same(x.weight_kg_total, l.weight_kg_total));
    if (i >= 0) {
      matched++;
      left.splice(i, 1);
      continue;
    }
    // 금액이 기대에 없거나, 없던 무게를 지어냄
    const sameAmount = left.findIndex((x) => x.amount_won === l.amount_won);
    if (sameAmount < 0) fabricated++, notes.push(`기대에 없는 상추 금액 ${l.amount_won}`);
    else if (left[sameAmount]!.weight_kg_total === null && l.weight_kg_total !== null) fabricated++, notes.push(`없는 무게를 지어냄 ${l.weight_kg_total}`);
    else notes.push(`무게 다름 ${l.weight_kg_total} (기대 ${left[sameAmount]!.weight_kg_total})`);
  }
  if (e.delivery_fee_won !== undefined && got.delivery_fee_won !== e.delivery_fee_won) notes.push(`배송비 ${got.delivery_fee_won} (기대 ${e.delivery_fee_won})`);
  return { receiptOk, matched, expected: e.lettuce.length, fabricated, notes };
}

export function summarizeImages(rows: ReturnType<typeof gradeImage>[]) {
  const expected = rows.reduce((n, r) => n + r.expected, 0);
  const s = {
    lettuce_accuracy: expected ? rows.reduce((n, r) => n + r.matched, 0) / expected : 1,
    fabricated: rows.reduce((n, r) => n + r.fabricated, 0),
    receipt_accuracy: rows.filter((r) => r.receiptOk).length / rows.length,
  };
  return { ...s, ok: s.lettuce_accuracy >= IMAGE_TARGET.lettuceAccuracy && s.fabricated <= IMAGE_TARGET.fabricated && s.receipt_accuracy >= IMAGE_TARGET.receiptAccuracy };
}
