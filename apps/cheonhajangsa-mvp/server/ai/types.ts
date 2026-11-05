import type { Fulfillment, Urgency } from "../../core/search-types";

// AI가 한 턴에 내리는 결정. 서버는 이 값을 다시 검증한 뒤에만 쓴다(coding-rules 6절).
export type AiDecision =
  | {
      type: "search";
      item_id: string;
      qty_kg: number | null;
      urgency: Urgency | null;
      fulfillment: Fulfillment | null;
    }
  | { type: "notice"; kind: "out_of_scope_item" | "off_topic"; item_name: string | null }
  // v2 가격 한 줄 진단(check_price). 문장에 없는 값은 null
  | { type: "price"; item_id: string; qty_kg: number | null; amount_won: number | null };

export type AiInput = {
  text: string;
  candidates: { id: string; name: string; aliases: string[]; active: boolean }[];
};

export interface AiClient {
  mode: "live" | "stored";
  model: string;
  decide(input: AiInput): Promise<AiDecision>;
}

// AI를 쓸 수 없을 때(시간 초과, API 오류, 형식 오류, 저장된 응답 없음). 핸들러가 503으로 바꾼다.
export class AiUnavailableError extends Error {}
