import { type AiClient, type AiDecision, type AiInput, AiUnavailableError } from "./types";

// 저장된 응답 모드(AI_MODE=stored, WF-12). 시연 입력만 미리 정해 둔 결정을 돌려준다.
// 목록에 없는 문장은 AI를 쓸 수 없는 것과 같게 처리한다(consistency-report U2). 시연 중 쓰면 그 사실을 밝힌다.

export function normalizeText(text: string): string {
  return text.replace(/[\s?!.,~]/g, "").toLowerCase();
}

const lettuce = (over: Partial<Extract<AiDecision, { type: "search" }>> = {}): AiDecision => ({
  type: "search",
  item_id: "item_lettuce",
  qty_kg: null,
  urgency: null,
  fulfillment: null,
  ...over,
});

export const STORED_RESPONSES: Record<string, AiDecision> = {
  상추: lettuce(),
  상추있어요: lettuce(),
  상추2키로급해요: lettuce({ qty_kg: 2, urgency: "now" }),
  상추5키로오늘배달: lettuce({ qty_kg: 5, urgency: "today", fulfillment: "delivery" }),
  대파있어요: { type: "notice", kind: "out_of_scope_item", item_name: "대파" },
  오늘날씨어때: { type: "notice", kind: "off_topic", item_name: null },
  상추2키로만원부르던데: { type: "price", item_id: "item_lettuce", qty_kg: 2, amount_won: 10000 },
};

export function createStoredAi(): AiClient {
  return {
    mode: "stored",
    model: "stored",
    async decide(input: AiInput): Promise<AiDecision> {
      const hit = STORED_RESPONSES[normalizeText(input.text)];
      if (!hit) throw new AiUnavailableError("저장된 응답 없음");
      return hit;
    },
  };
}
