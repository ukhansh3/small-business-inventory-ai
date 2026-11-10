import { z } from "zod";
import { FULFILLMENT_OPTIONS, QTY_OPTIONS, URGENCY_OPTIONS } from "../../core/options";
import type { Fulfillment, Urgency } from "../../core/search-types";
import type { AiDecision } from "../ai/types";
import type { FieldSource } from "../condition";
import { HttpError } from "../http";

// API-01 조건 채우기: 되묻기 순서·선택지(WF-04), 선택지 응답과 AI 결정을 조건에 합치기. assist.ts에서 나눔(coding-rules 2절)

export const ASK_ORDER = ["qty_kg", "urgency", "fulfillment"] as const;
export type AskSlot = (typeof ASK_ORDER)[number];

export const QUESTIONS: Record<AskSlot, { question: string; options: { value: string | number | null; label: string }[] }> = {
  qty_kg: { question: "얼마나 필요하세요?", options: QTY_OPTIONS.map((o) => ({ ...o })) },
  urgency: { question: "언제까지 필요하세요?", options: URGENCY_OPTIONS.map((o) => ({ ...o })) },
  fulfillment: { question: "직접 가지러 가세요, 배달이 필요하세요?", options: FULFILLMENT_OPTIONS.map((o) => ({ ...o })) },
};

export const partialCondition = z.strictObject({
  item_id: z.string().nullable(),
  qty_kg: z.number().nullable(),
  urgency: z.enum(["now", "today", "tomorrow"]).nullable(),
  fulfillment: z.enum(["pickup", "delivery"]).nullable(),
  location_id: z.string().nullable(),
});
export type Partial = z.infer<typeof partialCondition>;





export function validQty(v: unknown): v is number | null {
  return v === null || (typeof v === "number" && v >= 0.5 && v <= 50);
}

export function applyChoice(c: Partial, src: Record<string, FieldSource>, slot: AskSlot, value: unknown) {
  const allowed = QUESTIONS[slot].options.map((o) => o.value);
  if (!allowed.includes(value as never)) throw new HttpError("INVALID_INPUT", "선택지에서 골라 주세요.");
  if (slot === "qty_kg") c.qty_kg = value as number | null;
  if (slot === "urgency") c.urgency = value as Urgency;
  if (slot === "fulfillment") c.fulfillment = value as Fulfillment;
  src[slot] = "asked";
}

// AI 결정을 조건에 합친다. 문장에서 나온 값만 said로 쓴다. 허용 범위 밖 값은 버린다(지어낸 값 방지).
export function applyDecision(c: Partial, src: Record<string, FieldSource>, d: Extract<AiDecision, { type: "search" }>) {
  c.item_id = d.item_id;
  src.item_id = "said";
  if (d.qty_kg !== null && validQty(d.qty_kg)) {
    c.qty_kg = d.qty_kg;
    src.qty_kg = "said";
  }
  if (d.urgency !== null) {
    c.urgency = d.urgency;
    src.urgency = "said";
  }
  if (d.fulfillment !== null) {
    c.fulfillment = d.fulfillment;
    src.fulfillment = "said";
  }
}
