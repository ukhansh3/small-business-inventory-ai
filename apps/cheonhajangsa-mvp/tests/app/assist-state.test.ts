import { describe, expect, it } from "vitest";
import type { SearchResult } from "../../core/search-types";
import type { SearchResponse, TurnResponse } from "../../src/lib/api-types";
import { type AssistState, initialState, isSearchable, reduce } from "../../src/lib/assist-state";

const SID = "5b0c1b7e-3f1a-4c2e-9a4b-1d2e3f4a5b6c";
const base = { session_id: SID, ai_mode: "stored" as const, example_data: true };
const results: SearchResult = { groups: [], total: 0, empty_hint: "2kg 이상으로 고르면 3곳이 있어요." };
const cond = { item_id: "item_lettuce", qty_kg: 2, urgency: "now" as const, fulfillment: "pickup" as const, location_id: "loc_ajou_main" };

describe("화면 상태", () => {
  it("되묻기 → 결과: 질문 말풍선, 조건, 칩·결과가 응답 그대로 들어간다", () => {
    let s = reduce(initialState(true), { type: "owner_said", text: "상추" });
    s = reduce(s, { type: "loading" });
    expect(s.loading).toBe(true);
    const ask: TurnResponse = {
      ...base,
      turn_seq: 1,
      type: "ask",
      ask: { slot: "qty_kg", question: "얼마나 필요하세요?", options: [{ value: 2, label: "2kg" }], allow_text: true },
      condition: { ...cond, qty_kg: null, urgency: null, fulfillment: null },
      field_source: { item_id: "said", location_id: "default" },
    };
    s = reduce(s, { type: "turn_ok", res: ask });
    expect(s.messages.map((m) => [m.role, m.text])).toEqual([["owner", "상추"], ["ai", "얼마나 필요하세요?"]]);
    expect(s.ask?.slot).toBe("qty_kg");
    expect(s.sessionId).toBe(SID);
    expect(s.loading).toBe(false);

    const done: TurnResponse = {
      ...base,
      turn_seq: 4,
      type: "results",
      condition: { ...cond, version: 1, field_source: { qty_kg: "asked" } },
      chips: [{ slot: "qty_kg", label: "2kg", editable: true }],
      results,
    };
    s = reduce(s, { type: "turn_ok", res: done });
    expect(s.ask).toBeNull();
    expect(s.results).toBe(results);
    expect(s.version).toBe(1);
    expect(s.condition).toEqual(cond);
    expect(s.messages.at(-1)?.text).toBe("조건에 맞는 곳이 없어요.");
  });

  it("AC-15 AI 실패면 안내 말풍선과 조건 직접 고르기가 열린다", () => {
    const s = reduce(initialState(true), {
      type: "ai_failed",
      message: "잠깐 문제가 있어요. 조건을 직접 골라 주세요.",
      detail: { session_id: SID, condition: { ...cond, qty_kg: null, urgency: null, fulfillment: null }, field_source: {} },
    });
    expect(s.editor).toBe("recover");
    expect(s.sessionId).toBe(SID);
    expect(isSearchable(s.condition)).toBe(false);
    expect(isSearchable({ ...s.condition, urgency: "now", fulfillment: "pickup" })).toBe(true);
  });

  it("AC-14 칩 편집 결과로 조건·버전이 바뀌고 편집이 닫힌다", () => {
    let s: AssistState = { ...initialState(true), editor: "qty_kg", sessionId: SID, version: 1 };
    const res: SearchResponse = { condition: { ...cond, qty_kg: 1, version: 2, field_source: { qty_kg: "edited" } }, chips: [], results, ai_mode: "live", example_data: true };
    s = reduce(s, { type: "search_ok", res });
    expect(s.editor).toBe("closed");
    expect(s.version).toBe(2);
    expect(s.condition.qty_kg).toBe(1);
    expect(s.fieldSource.qty_kg).toBe("edited");
  });

  it("범위 밖 안내는 요청 상태를 새로 시작하고, 새로 찾기는 처음으로", () => {
    const notice: TurnResponse = {
      ...base,
      turn_seq: 1,
      type: "notice",
      notice: { kind: "out_of_scope_item", message: "아직 상추만 준비돼 있어요.", recognized_item: { item_id: "item_green_onion", name: "대파" }, actions: ["request_item", "search_lettuce"] },
    };
    let s = reduce({ ...initialState(true), request: { state: "done", message: "x" } }, { type: "turn_ok", res: notice });
    expect(s.notice?.kind).toBe("out_of_scope_item");
    expect(s.request.state).toBe("idle");
    expect(reduce(s, { type: "owner_said", text: "상추" }).notice).toBeNull();
    s = reduce(s, { type: "restart" });
    expect(s).toEqual(initialState(true));
  });

  it("네트워크 오류는 로딩을 풀고 다시 시도 상태로", () => {
    const s = reduce(reduce(initialState(false), { type: "loading" }), { type: "network_error" });
    expect(s.loading).toBe(false);
    expect(s.networkError).toBe(true);
  });

  it("WF-02 내 위치: 처음부터 그 위치로 시작하고, 새로 찾기 뒤에도 유지된다", () => {
    let s = initialState(true, "loc_maetan");
    expect(s.condition.location_id).toBe("loc_maetan");
    expect(s.fieldSource.location_id).toBe("default");
    s = reduce(s, { type: "set_location", locationId: "loc_ajou_junction" });
    expect(s.condition.location_id).toBe("loc_ajou_junction");
    s = reduce(s, { type: "restart" });
    expect(s.condition.location_id).toBe("loc_ajou_junction");
    expect(initialState(true).condition.location_id).toBeNull();
  });
});
