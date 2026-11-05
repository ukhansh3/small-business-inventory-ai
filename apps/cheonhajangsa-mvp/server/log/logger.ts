import type { ConditionOut } from "../condition";

// 기록(관측, WF-13). 기록 실패는 사장님 응답을 막지 않는다(coding-rules 4절). 예외: 품목 요청은 저장이 목적이라 실패를 알린다.
// 표 정의와 함수: supabase/migrations/0001_mvp_logging.sql, docs/planning/DB아키텍처.md 3.1·3.4

export type SessionMeta = { id: string; ai_mode: "live" | "stored"; model: string; prompt_version: string; data_version: string };

export type TurnRow = {
  seq: number;
  role: "user" | "assistant";
  kind: "text" | "choice" | "ask" | "notice" | "results" | "price_check";
  input_method?: "typed";
  text?: string | null;
  ask_slot?: "qty_kg" | "urgency" | "fulfillment";
  options?: unknown;
  chosen?: string;
  latency_ms?: number;
};

export type ToolCallRow = {
  input: unknown;
  result_vendor_ids: string[];
  result_count: number;
  status: "ok" | "invalid_input" | "error";
  latency_ms: number;
  called_by: "ai" | "user_edit";
};

type Base = { device_id: string; is_test: boolean };

export type TurnLog = Base & {
  session: SessionMeta;
  ai_called: boolean;
  outcome: "results" | "out_of_scope_item" | "off_topic" | "ai_failed" | "price_check" | null;
  turns: TurnRow[];
  condition: ConditionOut | null;
  tool_call: ToolCallRow | null;
};

export type SearchLog = Base & { session: SessionMeta; changed: string[]; condition: ConditionOut; tool_call: ToolCallRow };

export type EventLog = Base & {
  client_event_id: string;
  type: "call_click" | "vendor_view" | "condition_edit" | "restart" | "app_open" | "location_set";
  session_id: string | null;
  vendor_id: string | null;
  payload: Record<string, unknown>;
};

export type DeviceSettingsLog = Base & { location_id?: string; business_type?: string | null };

// 호출 한도(API 명세 1.5, P2-2)
export const LIMITS = { hourTurnsPerDevice: 60, aiCallsPerSession: 6, eventsPerMinute: 120 } as const;
export type AiGateInput = { device_id: string; session_id: string | null; usage_date: string; ai_call: boolean; hour_limit: number; session_limit: number };
export type AiGate = { hour_turns: number; session_ai_calls: number; daily_calls: number };

// 단가 진단 기록(v2, 0004). 사진·원문 글자·raw_name·가게 이름은 칸 자체가 없다(R-21)
export type PriceCheckLog = Base & {
  check_id: string;
  session_id: string | null;
  source: "text" | "photo";
  doc_type: string;
  seller_type: string;
  location_id: string;
  purchased_on: string | null;
  delivery_fee_won: number | null;
  ai_mode: "live" | "stored";
  model: string;
  lines: { line_no: number; item_id: string | null; qty_kg: number | null; amount_won: number; price_per_kg: number | null; comparable: boolean; verdict: string | null }[];
};

export type ItemRequestLog = Base & { requested_text: string; matched_item_id: string | null; session_id: string | null };

export interface Logger {
  enabled: boolean;
  registerDevice(device_id: string, is_test: boolean): Promise<{ is_new: boolean; location_id: string; business_type: string | null } | null>;
  logTurn(entry: TurnLog): Promise<void>;
  logSearch(entry: SearchLog): Promise<void>;
  // 분당 한도를 넘어 기록하지 않았으면 false. 기록 실패는 true로 본다(행동을 막지 않음)
  logEvent(entry: EventLog): Promise<boolean>;
  // 한도 판정. 저장소가 없거나 실패하면 null(한도 미적용, consistency-report A4)
  aiGate(entry: AiGateInput): Promise<AiGate | null>;
  // API-07 내 위치·업종 저장. 저장했으면 true(WF-02: 실패하면 앱이 이번 기기에서만 적용하고 알린다)
  setDevice(entry: DeviceSettingsLog): Promise<boolean>;
  // 단가 진단 기록. 실패해도 응답은 막지 않는다
  logPriceCheck(entry: PriceCheckLog): Promise<void>;
  // 시세 보태기(API-16). 바꾼 줄 수, 없거나 다른 기기면 -1, 저장소가 없거나 실패면 null
  sharePriceCheck(entry: { device_id: string; check_id: string }): Promise<number | null>;
  // R-18 동의한 구매 기록의 kg당 가격(최근 30일). 저장소가 없으면 빈 목록
  marketSamples(itemId: string): Promise<number[]>;
  // 저장하지 못하면 throw(ItemRequestUnavailableError)
  requestItem(entry: ItemRequestLog): Promise<{ request_id: string; created: boolean }>;
}

export class ItemRequestUnavailableError extends Error {}
