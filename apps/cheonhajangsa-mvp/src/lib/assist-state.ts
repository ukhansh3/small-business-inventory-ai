import type { SearchResult } from "../../core/search-types";
import type { AiFailureDetail, Ask, Chip, FieldSourceMap, Market, Notice, PartialCondition, PriceCheck, SearchResponse, TurnResponse } from "./api-types";

// 대화 화면 상태와 전이. 화면 문구는 서버 응답을 그대로 쓴다(규칙 판정을 앱에서 다시 하지 않는다).

export type ChatMessage = { id: number; role: "owner" | "ai"; text: string };
// recover: AI 실패 후 조건 전체를 직접 고르는 편집(WF-12). Slot 이름: 칩 하나 편집(WF-08)
export type EditorState = "closed" | "recover" | "qty_kg" | "urgency" | "fulfillment";
export type RequestState = "idle" | "sending" | "done" | "failed";

export type AssistState = {
  sessionId: string | null;
  turnSeq: number;
  condition: PartialCondition;
  fieldSource: FieldSourceMap;
  version: number;
  messages: ChatMessage[];
  nextId: number;
  ask: Ask | null;
  notice: Notice | null;
  request: { state: RequestState; message: string | null };
  chips: Chip[] | null;
  results: SearchResult | null;
  market: Market | null; // 결과 위 동네 시세 한 줄(v2 R-18)
  priceCheck: PriceCheck | null; // 단가 진단 결과(v2)
  share: { state: RequestState; message: string | null }; // 시세에 보태기(API-16)
  editor: EditorState;
  loading: boolean;
  inputError: string | null;
  networkError: boolean;
  aiMode: "live" | "stored" | null;
  exampleData: boolean;
};

export const EMPTY_CONDITION: PartialCondition = { item_id: null, qty_kg: null, urgency: null, fulfillment: null, location_id: null };

// 내 위치(WF-02)가 정해져 있으면 대화를 시작할 때부터 그 위치로 찾는다
export function initialState(exampleData: boolean, locationId: string | null = null): AssistState {
  return {
    sessionId: null,
    turnSeq: 0,
    condition: { ...EMPTY_CONDITION, location_id: locationId },
    fieldSource: locationId ? { location_id: "default" } : {},
    version: 0,
    messages: [],
    nextId: 1,
    ask: null,
    notice: null,
    request: { state: "idle", message: null },
    chips: null,
    results: null,
    market: null,
    priceCheck: null,
    share: { state: "idle", message: null },
    editor: "closed",
    loading: false,
    inputError: null,
    networkError: false,
    aiMode: null,
    exampleData,
  };
}

export type AssistAction =
  | { type: "owner_said"; text: string }
  | { type: "loading" }
  | { type: "turn_ok"; res: TurnResponse }
  | { type: "search_ok"; res: SearchResponse }
  | { type: "ai_failed"; message: string; detail: AiFailureDetail }
  | { type: "input_error"; message: string }
  | { type: "network_error" }
  | { type: "open_editor"; editor: EditorState }
  | { type: "request"; state: RequestState; message: string | null }
  | { type: "set_location"; locationId: string }
  | { type: "photo_ok"; check: PriceCheck }
  | { type: "share"; state: RequestState; message: string | null }
  | { type: "restart" };

function say(s: AssistState, role: ChatMessage["role"], text: string): Pick<AssistState, "messages" | "nextId"> {
  return { messages: [...s.messages, { id: s.nextId, role, text }], nextId: s.nextId + 1 };
}

function conditionOnly(c: PartialCondition): PartialCondition {
  return { item_id: c.item_id, qty_kg: c.qty_kg, urgency: c.urgency, fulfillment: c.fulfillment, location_id: c.location_id };
}

function resultLine(r: SearchResult): string {
  return r.total > 0 ? `조건에 맞는 곳 ${r.total}곳을 찾았어요.` : "조건에 맞는 곳이 없어요.";
}

export function reduce(s: AssistState, a: AssistAction): AssistState {
  switch (a.type) {
    case "owner_said":
      // 새로 말하면 이전 선택지·안내 버튼은 거둔다
      return { ...s, ...say(s, "owner", a.text), ask: null, notice: null };
    case "loading":
      return { ...s, loading: true, inputError: null, networkError: false };
    case "turn_ok": {
      const r = a.res;
      const base = { ...s, loading: false, sessionId: r.session_id, turnSeq: r.turn_seq, aiMode: r.ai_mode, exampleData: r.example_data };
      if (r.type === "ask") {
        return { ...base, ...say(s, "ai", r.ask.question), ask: r.ask, notice: null, condition: conditionOnly(r.condition), fieldSource: r.field_source };
      }
      if (r.type === "price_check") {
        return { ...base, ...priceState(s, r.price_check) };
      }
      if (r.type === "notice") {
        return { ...base, ...say(s, "ai", r.notice.message), ask: null, notice: r.notice, request: { state: "idle", message: null } };
      }
      return {
        ...base,
        ...say(s, "ai", resultLine(r.results)),
        ask: null,
        notice: null,
        condition: conditionOnly(r.condition),
        fieldSource: r.condition.field_source,
        version: r.condition.version,
        chips: r.chips,
        results: r.results,
        market: r.market ?? null,
        priceCheck: null,
        editor: "closed",
      };
    }
    case "search_ok": {
      const r = a.res;
      return {
        ...s,
        loading: false,
        aiMode: r.ai_mode,
        exampleData: r.example_data,
        ask: null,
        notice: null,
        condition: conditionOnly(r.condition),
        fieldSource: r.condition.field_source,
        version: r.condition.version,
        chips: r.chips,
        results: r.results,
        market: r.market ?? null,
        priceCheck: null,
        editor: "closed",
      };
    }
    case "photo_ok":
      return { ...s, loading: false, aiMode: a.check.ai_mode, exampleData: a.check.example_data, ...priceState(s, a.check) };
    case "share":
      return { ...s, share: { state: a.state, message: a.message } };
    case "ai_failed":
      // WF-12: 안내 + 조건 직접 고르기를 바로 연다(AC-15)
      return {
        ...s,
        ...say(s, "ai", a.message),
        loading: false,
        sessionId: a.detail.session_id,
        condition: conditionOnly(a.detail.condition),
        fieldSource: a.detail.field_source,
        ask: null,
        notice: null,
        editor: "recover",
      };
    case "input_error":
      return { ...s, loading: false, inputError: a.message };
    case "network_error":
      return { ...s, loading: false, networkError: true };
    case "open_editor":
      return { ...s, editor: a.editor };
    case "request":
      return { ...s, request: { state: a.state, message: a.message } };
    case "set_location":
      return { ...s, condition: { ...s.condition, location_id: a.locationId }, fieldSource: { ...s.fieldSource, location_id: s.fieldSource.location_id ?? "default" } };
    case "restart":
      return initialState(s.exampleData, s.condition.location_id);
  }
}

// 진단 결과 한 줄 요약(말풍선). 판정이 있으면 판정, 없으면 안내·이유
export function priceSummary(c: PriceCheck): string {
  const judged = c.lines.find((l) => l.verdict_display && l.price_per_kg);
  if (judged) return `${judged.item_name ?? "상추"} kg당 ${judged.price_per_kg!.toLocaleString("ko-KR")}원 · ${judged.verdict_display}`;
  if (c.message) return c.message;
  const any = c.lines.find((l) => l.reason);
  return any?.reason ?? "진단할 줄을 찾지 못했어요.";
}

function priceState(s: AssistState, c: PriceCheck): Partial<AssistState> {
  return {
    ...say(s, "ai", priceSummary(c)),
    priceCheck: c,
    share: { state: "idle", message: null },
    ask: null,
    notice: null,
    results: null,
    chips: null,
    market: null,
    editor: "closed",
  };
}

// 지금 조건으로 /search를 부를 수 있는지(칩 편집). 양은 '잘 모르겠어요'(null)도 된다.
export function isSearchable(c: PartialCondition): c is PartialCondition & { item_id: string; urgency: NonNullable<PartialCondition["urgency"]>; fulfillment: NonNullable<PartialCondition["fulfillment"]>; location_id: string } {
  return c.item_id !== null && c.urgency !== null && c.fulfillment !== null && c.location_id !== null;
}
