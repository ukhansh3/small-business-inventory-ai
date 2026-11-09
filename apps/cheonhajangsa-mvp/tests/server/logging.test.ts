import { describe, expect, it } from "vitest";
import { PROMPT_VERSION } from "../../server/ai/prompt";
import { createStoredAi } from "../../server/ai/stored";
import { type AiDecision, AiUnavailableError } from "../../server/ai/types";
import { readEnv } from "../../server/env";
import { handleAssistTurn } from "../../server/handlers/assist";
import { handleRegisterDevice } from "../../server/handlers/devices";
import { handleEvent } from "../../server/handlers/events";
import { handleItemRequest } from "../../server/handlers/item-requests";
import { handleSearch } from "../../server/handlers/search";
import type { DeviceSettingsLog, EventLog, ItemRequestLog, Logger, SearchLog, TurnLog } from "../../server/log/logger";
import { noopLogger } from "../../server/log/noop";
import { createSupabaseLogger } from "../../server/log/supabase";
import { A, baseDataset, MON_1000, offer } from "../fixtures/dataset";

const DEVICE = "5b0c1b7e-3f1a-4c2e-9a4b-1d2e3f4a5b6c";
const data = baseDataset([A], [offer("v_101", { min_sale_kg: 1 })]);
const env = readEnv({});

// 기록 내용을 모아 두는 가짜 저장소
function recorder() {
  const seen = { turns: [] as TurnLog[], searches: [] as SearchLog[], events: [] as EventLog[], requests: [] as ItemRequestLog[], devices: new Set<string>(), settings: [] as DeviceSettingsLog[] };
  const keys = new Set<string>();
  const log: Logger = {
    ...noopLogger,
    enabled: true,
    async registerDevice(id) {
      const is_new = !seen.devices.has(id);
      seen.devices.add(id);
      return { is_new, location_id: "loc_test", business_type: null };
    },
    async logTurn(e) {
      seen.turns.push(e);
    },
    async logSearch(e) {
      seen.searches.push(e);
    },
    async logEvent(e) {
      seen.events.push(e);
      return true;
    },
    async aiGate() {
      return null;
    },
    async setDevice(e) {
      seen.settings.push(e);
      return true;
    },
    async requestItem(e) {
      seen.requests.push(e);
      const key = e.matched_item_id ?? e.requested_text;
      const created = !keys.has(key);
      keys.add(key);
      return { request_id: "00000000-0000-4000-8000-000000000001", created };
    },
  };
  return { log, seen };
}

function req(path: string, body: unknown, headers: Record<string, string> = { "x-device-id": DEVICE }) {
  return new Request(`http://test/api/v1/${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
}

const fixedAi = (d: AiDecision) => ({ mode: "live" as const, model: "fake", decide: async () => d });

describe("WF-13 대화·검색 기록", () => {
  it("문장 한 번에 결과까지: 턴 2개, 조건 v1, 도구 호출(ai), AI 호출 1", async () => {
    const { log, seen } = recorder();
    const ai = fixedAi({ type: "search", item_id: "item_lettuce", qty_kg: 2, urgency: "now", fulfillment: "pickup" });
    const res = await handleAssistTurn(req("assist/turns", { session_id: null, input: { type: "text", text: "상추 2키로 급해요 직접" } }, { "x-device-id": DEVICE, "x-test-device": "true" }), {
      data, env, ai, clock: () => MON_1000, log, dataVersion: "abc",
    });
    expect(res.status).toBe(200);
    const t = seen.turns[0]!;
    expect(t.is_test).toBe(true);
    expect(t.ai_called).toBe(true);
    expect(t.outcome).toBe("results");
    expect(t.session).toMatchObject({ ai_mode: "live", model: "fake", prompt_version: PROMPT_VERSION, data_version: "abc" });
    expect(t.turns.map((x) => [x.seq, x.role, x.kind])).toEqual([[1, "user", "text"], [2, "assistant", "results"]]);
    expect(t.condition?.version).toBe(1);
    expect(t.tool_call).toMatchObject({ called_by: "ai", result_vendor_ids: ["v_101"], result_count: 1, status: "ok" });
  });

  it("AC-10 범위 밖: 도구 호출 기록 없음, outcome out_of_scope_item", async () => {
    const { log, seen } = recorder();
    await handleAssistTurn(req("assist/turns", { session_id: null, input: { type: "text", text: "대파 있어요?" } }), { data, env, ai: createStoredAi(), log });
    expect(seen.turns[0]).toMatchObject({ outcome: "out_of_scope_item", tool_call: null, condition: null });
  });

  it("되묻기 선택지 턴은 AI 호출로 세지 않는다", async () => {
    const { log, seen } = recorder();
    const ai = fixedAi({ type: "search", item_id: "item_lettuce", qty_kg: null, urgency: null, fulfillment: null });
    const r1 = await (await handleAssistTurn(req("assist/turns", { session_id: null, input: { type: "text", text: "상추" } }), { data, env, ai, log })).json();
    await handleAssistTurn(
      req("assist/turns", { session_id: r1.session_id, turn_seq: r1.turn_seq, input: { type: "choice", slot: "urgency", value: "now" }, condition: r1.condition, field_source: r1.field_source }),
      { data, env, ai, log },
    );
    expect(seen.turns.map((t) => t.ai_called)).toEqual([true, false]);
    expect(seen.turns[0]!.turns[1]).toMatchObject({ kind: "ask", ask_slot: "urgency" });
    expect(seen.turns[1]!.turns.map((x) => x.seq)).toEqual([3, 4]);
    expect(seen.turns[1]!.turns[0]).toMatchObject({ kind: "choice", ask_slot: "urgency", chosen: "now" });
  });

  it("AC-15 AI 실패도 기록(outcome ai_failed) 후 503", async () => {
    const { log, seen } = recorder();
    const ai = { mode: "live" as const, model: "fake", decide: async (): Promise<AiDecision> => { throw new AiUnavailableError("x"); } };
    const res = await handleAssistTurn(req("assist/turns", { session_id: null, input: { type: "text", text: "상추" } }), { data, env, ai, log });
    expect(res.status).toBe(503);
    expect(seen.turns[0]).toMatchObject({ outcome: "ai_failed" });
  });

  it("AC-14 칩 수정 검색: 조건 새 버전과 user_edit 도구 호출", async () => {
    const { log, seen } = recorder();
    const res = await handleSearch(
      req("search", {
        session_id: "9e21aa00-1111-4222-8333-444455556666",
        condition: { item_id: "item_lettuce", qty_kg: 1, urgency: "now", fulfillment: "pickup", location_id: "loc_test", version: 1 },
        changed: ["qty_kg"],
      }),
      { data, env, clock: () => MON_1000, log },
    );
    expect(res.status).toBe(200);
    expect(seen.searches[0]).toMatchObject({ changed: ["qty_kg"], condition: { version: 2 }, tool_call: { called_by: "user_edit", result_count: 1 } });
  });

  it("A8 기록이 실패해도(Supabase 연결 불가) 응답은 정상", async () => {
    const log = createSupabaseLogger("http://127.0.0.1:9", "x");
    const res = await handleAssistTurn(req("assist/turns", { session_id: null, input: { type: "text", text: "상추" } }), { data, env, ai: createStoredAi(), log });
    expect(res.status).toBe(200);
  });
});

describe("API-06 기기 등록", () => {
  it("처음이면 201, 다시 오면 200. 위치는 Location 모양", async () => {
    const { log } = recorder();
    const r1 = await handleRegisterDevice(req("devices", { device_id: DEVICE, screen_width: 375 }), { data, log });
    const r2 = await handleRegisterDevice(req("devices", { device_id: DEVICE }), { data, log });
    expect([r1.status, r2.status]).toEqual([201, 200]);
    const b = await r1.json();
    expect(b).toMatchObject({ device_id: DEVICE, is_new: true, business_type: null, location: { location_id: "loc_test", is_default: true } });
  });
  it("헤더와 본문 id가 다르면 400, 헤더가 없으면 401", async () => {
    expect((await handleRegisterDevice(req("devices", { device_id: "11111111-1111-4111-8111-111111111111" }), { data })).status).toBe(400);
    expect((await handleRegisterDevice(req("devices", { device_id: DEVICE }, {}), { data })).status).toBe(401);
  });
  it("기록 저장소가 없으면 200, is_new false", async () => {
    const r = await handleRegisterDevice(req("devices", { device_id: DEVICE }), { data, log: noopLogger });
    expect(r.status).toBe(200);
    expect((await r.json()).is_new).toBe(false);
  });
});

describe("API-04 행동 기록", () => {
  it("AC-13 call_click은 202, 판매처 id와 함께 기록", async () => {
    const { log, seen } = recorder();
    const r = await handleEvent(req("events", { client_event_id: "44444444-4444-4444-8444-444444444444", type: "call_click", vendor_id: "v_001", session_id: null, payload: { rank: 1 } }), { log });
    expect(r.status).toBe(202);
    expect(seen.events[0]).toMatchObject({ type: "call_click", vendor_id: "v_001", device_id: DEVICE });
  });
  it("call_click에 판매처가 없거나 모르는 종류면 400", async () => {
    expect((await handleEvent(req("events", { client_event_id: "44444444-4444-4444-8444-444444444444", type: "call_click" }), {})).status).toBe(400);
    expect((await handleEvent(req("events", { client_event_id: "44444444-4444-4444-8444-444444444444", type: "hack" }), {})).status).toBe(400);
  });
});

describe("API-05 품목 요청(AC-10)", () => {
  it("처음 201, 같은 품목 다시 200, 같은 request_id", async () => {
    const { log, seen } = recorder();
    const body = { requested_text: "대파", matched_item_id: "item_green_onion", session_id: null };
    const r1 = await handleItemRequest(req("item-requests", body), { log });
    const r2 = await handleItemRequest(req("item-requests", body), { log });
    expect([r1.status, r2.status]).toEqual([201, 200]);
    expect((await r1.json()).message).toBe("알려 주셔서 고마워요. 준비되면 먼저 보여 드릴게요.");
    expect(seen.requests).toHaveLength(2);
  });
  it("저장소가 없으면 저장한 척하지 않고 503 STORAGE_UNAVAILABLE", async () => {
    const r = await handleItemRequest(req("item-requests", { requested_text: "대파" }), { log: noopLogger });
    expect(r.status).toBe(503);
    expect((await r.json()).error.code).toBe("STORAGE_UNAVAILABLE");
  });
  it("빈 글자·51자는 400", async () => {
    expect((await handleItemRequest(req("item-requests", { requested_text: " " }), {})).status).toBe(400);
    expect((await handleItemRequest(req("item-requests", { requested_text: "가".repeat(51) }), {})).status).toBe(400);
  });
});
