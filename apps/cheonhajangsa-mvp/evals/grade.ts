import type { AiDecision } from "../server/ai/types";

// evals 채점(P2-3). 실행기(scripts/run-evals.ts)와 테스트가 같이 쓴다.
export type Expect =
  | { type: "search"; item_id: string; qty_kg: number | null; urgency: string | null; fulfillment: string | null }
  | { type: "notice"; kind: "out_of_scope_item" | "off_topic" }
  | { type: "price"; item_id: string; qty_kg: number | null; amount_won: number | null };
export type Got = AiDecision | { type: "error"; message: string };

export const FIELDS = ["item_id", "qty_kg", "urgency", "fulfillment"] as const;
export const PRICE_FIELDS = ["item_id", "qty_kg", "amount_won"] as const;
export const TARGET = { conditionAccuracy: 0.9, fabricated: 0, scopeAccuracy: 1 };

export function grade(e: Expect, got: Got): { pass: boolean; wrong: string[]; fabricated: string[] } {
  const wrong: string[] = [];
  const fabricated: string[] = [];
  if (e.type === "search") {
    if (got.type !== "search") return { pass: false, wrong: ["type"], fabricated };
    for (const f of FIELDS) {
      if (got[f] !== e[f]) wrong.push(f);
      if (e[f] === null && got[f] !== null) fabricated.push(f); // 문장에 없는데 값을 채움
    }
    return { pass: wrong.length === 0, wrong, fabricated };
  }
  if (e.type === "price") {
    if (got.type !== "price") return { pass: false, wrong: ["type"], fabricated };
    for (const f of PRICE_FIELDS) {
      if (got[f] !== e[f]) wrong.push(f);
      if (e[f] === null && got[f] !== null) fabricated.push(f);
    }
    return { pass: wrong.length === 0, wrong, fabricated };
  }
  const pass = got.type === "notice" && got.kind === e.kind;
  return { pass, wrong: pass ? [] : ["kind"], fabricated };
}

export function summarize(rows: { expect: Expect; got: Got; pass: boolean; wrong: string[]; fabricated: string[] }[]) {
  const search = rows.filter((r) => r.expect.type === "search" || r.expect.type === "price");
  const scope = rows.filter((r) => r.expect.type === "notice");
  const nFields = (r: { expect: Expect }) => (r.expect.type === "price" ? PRICE_FIELDS.length : FIELDS.length);
  const fieldRight = search.reduce((n, r) => n + (r.wrong.includes("type") ? 0 : nFields(r) - r.wrong.length), 0);
  const s = {
    condition_accuracy: search.length ? search.filter((r) => r.pass).length / search.length : 1,
    field_accuracy: search.length ? fieldRight / search.reduce((n, r) => n + nFields(r), 0) : 1,
    fabricated: search.reduce((n, r) => n + r.fabricated.length, 0),
    scope_accuracy: scope.length ? scope.filter((r) => r.pass).length / scope.length : 1,
    errors: rows.filter((r) => r.got.type === "error").length,
  };
  const ok = s.condition_accuracy >= TARGET.conditionAccuracy && s.fabricated <= TARGET.fabricated && s.scope_accuracy >= TARGET.scopeAccuracy;
  return { ...s, ok };
}
