import { describe, expect, it } from "vitest";
import { type AiDecision } from "../../server/ai/types";
import { readEnv } from "../../server/env";
import { handleAssistTurn } from "../../server/handlers/assist";
import { handleEvent } from "../../server/handlers/events";
import type { AiGate, AiGateInput, Logger } from "../../server/log/logger";
import { noopLogger } from "../../server/log/noop";
import { A, baseDataset, MON_1000, offer } from "../fixtures/dataset";

// P2-2 호출 한도(API 명세 1.5). 한도 판정 값은 가짜 저장소가 준다.
const DEVICE = "5b0c1b7e-3f1a-4c2e-9a4b-1d2e3f4a5b6c";
const data = baseDataset([A], [offer("v_101", { min_sale_kg: 1 })]);
const env = readEnv({ AI_DAILY_LIMIT: "500" });

function gateLogger(gate: AiGate, opts: { eventAccepted?: boolean } = {}) {
  const asked: AiGateInput[] = [];
  const turns: { ai_called: boolean; outcome: string | null }[] = [];
  const log: Logger = {
    ...noopLogger,
    enabled: true,
    async aiGate(e) {
      asked.push(e);
      return gate;
    },
    async logTurn(e) {
      turns.push({ ai_called: e.ai_called, outcome: e.outcome });
    },
    async logEvent() {
      return opts.eventAccepted ?? true;
    },
  };
  return { log, asked, turns };
}

function countingAi() {
  const ai = {
    mode: "live" as const,
    model: "fake",
    calls: 0,
    async decide(): Promise<AiDecision> {
      ai.calls++;
      return { type: "search", item_id: "item_lettuce", qty_kg: null, urgency: null, fulfillment: null };
    },
  };
  return ai;
}

const turnReq = (input: unknown) =>
  new Request("http://test/api/v1/assist/turns", {
    method: "POST",
    headers: { "content-type": "application/json", "x-device-id": DEVICE },
    body: JSON.stringify({ session_id: null, input, condition: { item_id: "item_lettuce", qty_kg: null, urgency: null, fulfillment: null, location_id: "loc_test" } }),
  });

describe("P2-2 호출 한도", () => {
  it("한도 안이면 AI를 부르고, 판정에 한국 날짜와 한도 값을 넘긴다", async () => {
    const { log, asked } = gateLogger({ hour_turns: 3, session_ai_calls: 1, daily_calls: 10 });
    const ai = countingAi();
    const res = await handleAssistTurn(turnReq({ type: "text", text: "상추" }), { data, env, ai, log, clock: () => MON_1000 });
    expect(res.status).toBe(200);
    expect(ai.calls).toBe(1);
    expect(asked[0]).toMatchObject({ device_id: DEVICE, usage_date: "2026-11-09", ai_call: true, hour_limit: 60, session_limit: 6 });
  });

  it("기기별 시간당 60턴이면 429 RATE_LIMITED, AI 호출 없음", async () => {
    const { log } = gateLogger({ hour_turns: 60, session_ai_calls: 0, daily_calls: 0 });
    const ai = countingAi();
    const res = await handleAssistTurn(turnReq({ type: "text", text: "상추" }), { data, env, ai, log });
    expect(res.status).toBe(429);
    expect((await res.json()).error.code).toBe("RATE_LIMITED");
    expect(ai.calls).toBe(0);
  });

  it("하루 한도를 넘으면 AI를 부르지 않고 503 AI_UNAVAILABLE + 조건(칩 편집으로 이어짐)", async () => {
    const { log, turns } = gateLogger({ hour_turns: 0, session_ai_calls: 0, daily_calls: 501 });
    const ai = countingAi();
    const res = await handleAssistTurn(turnReq({ type: "text", text: "상추" }), { data, env, ai, log });
    expect(res.status).toBe(503);
    expect((await res.json()).error.detail.condition.item_id).toBe("item_lettuce");
    expect(ai.calls).toBe(0);
    expect(turns[0]).toEqual({ ai_called: false, outcome: "ai_failed" });
  });

  it("세션 AI 6회면 같은 경로(C13). 선택지 턴은 AI를 쓰지 않으니 막지 않는다", async () => {
    const { log } = gateLogger({ hour_turns: 5, session_ai_calls: 6, daily_calls: 10 });
    const ai = countingAi();
    expect((await handleAssistTurn(turnReq({ type: "text", text: "상추" }), { data, env, ai, log })).status).toBe(503);
    const choice = await handleAssistTurn(turnReq({ type: "choice", slot: "qty_kg", value: 2 }), { data, env, ai, log });
    expect(choice.status).toBe(200);
    expect(ai.calls).toBe(0);
  });

  it("A4 저장소가 없으면 한도를 적용하지 않는다", async () => {
    const ai = countingAi();
    const res = await handleAssistTurn(turnReq({ type: "text", text: "상추" }), { data, env, ai, log: noopLogger });
    expect(res.status).toBe(200);
    expect(ai.calls).toBe(1);
  });

  it("API-04 분당 한도를 넘으면 429", async () => {
    const { log } = gateLogger({ hour_turns: 0, session_ai_calls: 0, daily_calls: 0 }, { eventAccepted: false });
    const res = await handleEvent(
      new Request("http://test/api/v1/events", {
        method: "POST",
        headers: { "content-type": "application/json", "x-device-id": DEVICE },
        body: JSON.stringify({ client_event_id: "44444444-4444-4444-8444-444444444444", type: "restart" }),
      }),
      { log },
    );
    expect(res.status).toBe(429);
  });
});
