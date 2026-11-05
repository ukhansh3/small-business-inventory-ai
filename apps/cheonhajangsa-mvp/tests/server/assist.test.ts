import { describe, expect, it } from "vitest";
import { createStoredAi } from "../../server/ai/stored";
import { type AiClient, type AiDecision, AiUnavailableError } from "../../server/ai/types";
import { readEnv } from "../../server/env";
import { handleAssistTurn } from "../../server/handlers/assist";
import { handleSearch } from "../../server/handlers/search";
import { A, baseDataset, MON_1000, offer } from "../fixtures/dataset";

const DEVICE = "5b0c1b7e-3f1a-4c2e-9a4b-1d2e3f4a5b6c";
const data = baseDataset([A], [offer("v_101", { min_sale_kg: 1 })]);
const env = readEnv({});

// 호출 횟수를 세는 가짜 AI
function fakeAi(decide: (text: string) => Promise<AiDecision>): AiClient & { calls: number } {
  const ai = {
    mode: "live" as const,
    model: "fake",
    calls: 0,
    async decide(input: { text: string }) {
      ai.calls++;
      return decide(input.text);
    },
  };
  return ai;
}

function post(body: unknown) {
  return new Request("http://test/api/v1/assist/turns", {
    method: "POST",
    headers: { "content-type": "application/json", "x-device-id": DEVICE },
    body: JSON.stringify(body),
  });
}

type Turn = { session_id: string; turn_seq: number; type: string; ask?: { slot: string }; condition?: Record<string, unknown>; field_source?: Record<string, string>; notice?: { kind: string; recognized_item: { item_id: string | null; name: string } | null }; results?: { total: number } };

async function turn(ai: AiClient, body: unknown): Promise<{ status: number; body: Turn & { error?: { code: string; detail?: { condition: Record<string, unknown> } } } }> {
  const res = await handleAssistTurn(post(body), { data, env, ai, clock: () => MON_1000 });
  return { status: res.status, body: await res.json() };
}

// 이전 응답을 이어 다음 턴 요청을 만든다(C9: 앱이 조건을 들고 다님)
const next = (prev: Turn, input: unknown) => ({ session_id: prev.session_id, turn_seq: prev.turn_seq, input, condition: prev.condition, field_source: prev.field_source });

describe("AC-5 되묻기 순서", () => {
  it("'상추' 한 마디 → qty_kg → urgency → fulfillment → 결과. AI는 첫 턴 1번만", async () => {
    const ai = fakeAi(async () => ({ type: "search", item_id: "item_lettuce", qty_kg: null, urgency: null, fulfillment: null }));
    const t1 = await turn(ai, { session_id: null, input: { type: "text", text: "상추" } });
    expect(t1.status).toBe(200);
    expect(t1.body.type).toBe("ask");
    expect(t1.body.ask?.slot).toBe("qty_kg");

    const t2 = await turn(ai, next(t1.body, { type: "choice", slot: "qty_kg", value: 2 }));
    expect(t2.body.ask?.slot).toBe("urgency");
    const t3 = await turn(ai, next(t2.body, { type: "choice", slot: "urgency", value: "now" }));
    expect(t3.body.ask?.slot).toBe("fulfillment");
    const t4 = await turn(ai, next(t3.body, { type: "choice", slot: "fulfillment", value: "pickup" }));
    expect(t4.body.type).toBe("results");
    expect(t4.body.results?.total).toBe(1);
    expect(t4.body.session_id).toBe(t1.body.session_id);
    expect(t4.body.condition?.field_source).toMatchObject({ item_id: "said", qty_kg: "asked", urgency: "asked", fulfillment: "asked", location_id: "default" });
    expect(ai.calls).toBe(1);
  });

  it("'상추 2키로 급해요'면 qty·urgency는 묻지 않고 fulfillment부터", async () => {
    const ai = fakeAi(async () => ({ type: "search", item_id: "item_lettuce", qty_kg: 2, urgency: "now", fulfillment: null }));
    const t1 = await turn(ai, { session_id: null, input: { type: "text", text: "상추 2키로 급해요" } });
    expect(t1.body.ask?.slot).toBe("fulfillment");
    expect(t1.body.field_source).toMatchObject({ qty_kg: "said", urgency: "said" });
  });

  it("'잘 모르겠어요'(null)도 양에 답한 것으로 본다", async () => {
    const ai = fakeAi(async () => ({ type: "search", item_id: "item_lettuce", qty_kg: null, urgency: null, fulfillment: null }));
    const t1 = await turn(ai, { session_id: null, input: { type: "text", text: "상추" } });
    const t2 = await turn(ai, next(t1.body, { type: "choice", slot: "qty_kg", value: null }));
    expect(t2.body.ask?.slot).toBe("urgency");
  });

  it("AI가 허용 범위 밖 양(100kg)을 내면 버리고 되묻는다(지어낸 값 방지)", async () => {
    const ai = fakeAi(async () => ({ type: "search", item_id: "item_lettuce", qty_kg: 100, urgency: null, fulfillment: null }));
    const t1 = await turn(ai, { session_id: null, input: { type: "text", text: "상추" } });
    expect(t1.body.ask?.slot).toBe("qty_kg");
  });

  it("선택지에 없는 값은 400", async () => {
    const ai = fakeAi(async () => ({ type: "search", item_id: "item_lettuce", qty_kg: null, urgency: null, fulfillment: null }));
    const t1 = await turn(ai, { session_id: null, input: { type: "text", text: "상추" } });
    const bad = await turn(ai, next(t1.body, { type: "choice", slot: "qty_kg", value: 3 }));
    expect(bad.status).toBe(400);
  });
});

describe("AC-10·AC-11 범위 밖과 무관한 말", () => {
  it("'대파 있어요?' → out_of_scope_item, 검색 결과 없음", async () => {
    const ai = createStoredAi();
    const t = await turn(ai, { session_id: null, input: { type: "text", text: "대파 있어요?" } });
    expect(t.body.type).toBe("notice");
    expect(t.body.notice?.kind).toBe("out_of_scope_item");
    expect(t.body.notice?.recognized_item).toEqual({ item_id: "item_green_onion", name: "대파" });
    expect(t.body.results).toBeUndefined();
  });

  it("AI가 비활성 품목으로 search를 골라도 서버가 범위 밖으로 바꾼다", async () => {
    const ai = fakeAi(async () => ({ type: "search", item_id: "item_green_onion", qty_kg: null, urgency: null, fulfillment: null }));
    const t = await turn(ai, { session_id: null, input: { type: "text", text: "대파" } });
    expect(t.body.notice?.kind).toBe("out_of_scope_item");
  });

  it("'오늘 날씨 어때' → off_topic", async () => {
    const t = await turn(createStoredAi(), { session_id: null, input: { type: "text", text: "오늘 날씨 어때" } });
    expect(t.body.type).toBe("notice");
    expect(t.body.notice?.kind).toBe("off_topic");
  });
});

describe("AC-15 AI 실패", () => {
  it("AI가 실패하면 503 AI_UNAVAILABLE과 지금까지의 조건, 그 조건으로 /search가 이어진다", async () => {
    const ai = fakeAi(async () => {
      throw new AiUnavailableError("시간 초과");
    });
    const t = await turn(ai, { session_id: null, input: { type: "text", text: "상추" } });
    expect(t.status).toBe(503);
    expect(t.body.error?.code).toBe("AI_UNAVAILABLE");
    const c = t.body.error!.detail!.condition;
    expect(c).toMatchObject({ item_id: "item_lettuce", location_id: "loc_test" });

    const res = await handleSearch(
      new Request("http://test/api/v1/search", {
        method: "POST",
        headers: { "content-type": "application/json", "x-device-id": DEVICE },
        body: JSON.stringify({
          session_id: (t.body.error!.detail as unknown as { session_id: string }).session_id,
          condition: { item_id: c.item_id, qty_kg: null, urgency: "now", fulfillment: "pickup", location_id: c.location_id },
          changed: ["urgency", "fulfillment"],
        }),
      }),
      { data, env, clock: () => MON_1000 },
    );
    expect(res.status).toBe(200);
    expect((await res.json()).results.total).toBe(1);
  });

  it("저장된 응답에 없는 문장은 503", async () => {
    const t = await turn(createStoredAi(), { session_id: null, input: { type: "text", text: "상추 반 키로만" } });
    expect(t.status).toBe(503);
  });
});

describe("입력 검증", () => {
  const ai = createStoredAi();
  it("빈 문장은 400", async () => {
    expect((await turn(ai, { session_id: null, input: { type: "text", text: "  " } })).status).toBe(400);
  });
  it("201자는 400", async () => {
    expect((await turn(ai, { session_id: null, input: { type: "text", text: "가".repeat(201) } })).status).toBe(400);
  });
  it("품목 없이 선택지만 보내면 400", async () => {
    expect((await turn(ai, { session_id: null, input: { type: "choice", slot: "qty_kg", value: 2 } })).status).toBe(400);
  });
});
