import { z } from "zod";
import { type AiDecision, AiUnavailableError } from "./types";

// AI 도구 호출을 검증해 AiDecision으로 바꾼다. 형식이 틀리면 AiUnavailableError(→ 503, WF-12).

const searchInput = z.strictObject({
  item_id: z.string().min(1),
  qty_kg: z.number().nullable(),
  urgency: z.enum(["now", "today", "tomorrow"]).nullable(),
  fulfillment: z.enum(["pickup", "delivery"]).nullable(),
});

const noticeInput = z.strictObject({
  kind: z.enum(["out_of_scope_item", "off_topic"]),
  item_name: z.string().min(1).nullable(),
});

const priceInput = z.strictObject({
  item_id: z.string().min(1),
  qty_kg: z.number().nullable(),
  amount_won: z.number().nullable(),
});

export function toDecision(toolName: string, input: unknown): AiDecision {
  if (toolName === "search_vendors") {
    const p = searchInput.safeParse(input);
    if (!p.success) throw new AiUnavailableError("search_vendors 인자 형식 오류");
    return { type: "search", ...p.data };
  }
  if (toolName === "give_notice") {
    const p = noticeInput.safeParse(input);
    if (!p.success) throw new AiUnavailableError("give_notice 인자 형식 오류");
    return { type: "notice", ...p.data };
  }
  if (toolName === "check_price") {
    const p = priceInput.safeParse(input);
    if (!p.success) throw new AiUnavailableError("check_price 인자 형식 오류");
    return { type: "price", ...p.data };
  }
  throw new AiUnavailableError(`모르는 도구: ${toolName}`);
}
