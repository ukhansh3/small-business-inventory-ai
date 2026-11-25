import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Logger } from "../../server/log/logger";
import { noopLogger } from "../../server/log/noop";
import { maskPii, traced, traceInput, traceOutput } from "../../server/trace";

// 추적 기록(강의90 최종평가): 요청마다 한 줄, 단계별 결과, 비밀·연락처 없음
describe("추적 기록 trace.jsonl", () => {
  let file: string;
  beforeEach(() => {
    file = join(mkdtempSync(join(tmpdir(), "trace-")), "trace.jsonl");
    vi.stubEnv("TRACE_FILE", file);
    vi.stubEnv("VERCEL", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("요청마다 한 줄을 남기고 단계별 결과·출력·지연·요청 id를 담는다", async () => {
    const handler = async (_req: Request, deps: { log?: Logger }) => {
      await deps.log!.logTurn({
        device_id: "dev-1", is_test: true, ai_called: true, outcome: "results", turns: [],
        session: { id: "s1", ai_mode: "stored", model: "claude-haiku-5-5", prompt_version: "v4", data_version: "d1" },
        condition: { item_id: "item_lettuce", qty_kg: 2, urgency: "now", fulfillment: "pickup", location_id: "loc" } as never,
        tool_call: { input: {}, result_vendor_ids: ["v_301", "v_302"], result_count: 2, status: "ok", latency_ms: 3, called_by: "ai" },
      });
      return new Response(JSON.stringify({ type: "results", results: { total: 2, groups: [{ key: "available", items: [{ vendor_id: "v_301" }] }] },
        recommendation: { situation: "urgent_small", primary: { id: "ps_1" } } }), { status: 200 });
    };
    const req = new Request("http://test/api/v1/assist/turns", { method: "POST", headers: { "x-device-id": "dev-1" },
      body: JSON.stringify({ input: { type: "text", text: "상추 2키로 급해요 010-1234-5678" } }) });
    const res = await traced("assist", req, { log: noopLogger, env: { aiModel: "m" } }, handler);
    const lines = readFileSync(file, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(lines).toHaveLength(1);
    const t = lines[0];
    expect(t.request_id).toMatch(/^q-[0-9a-f]{8}$/);
    expect(res.headers.get("x-request-id")).toBe(t.request_id);
    expect(t).toMatchObject({ route: "assist", outcome: "recommended", model: "claude-haiku-5-5", prompt_version: "v4", ai_mode: "stored", error: null, status: 200 });
    expect(t.steps[0]).toMatchObject({ step: "assist_turn", outcome: "results", tool: { result_count: 2, top: ["v_301", "v_302"] } });
    expect(t.output).toMatchObject({ total: 2, recommendation: { situation: "urgent_small", primary: "ps_1" } });
    expect(typeof t.latency_ms).toBe("number");
    expect(t.commit).toBeTruthy();
    // 연락처·기기 id 원문은 남기지 않는다
    const raw = readFileSync(file, "utf8");
    expect(raw).not.toContain("010-1234-5678");
    expect(raw).not.toContain("dev-1");
    expect(t.user).toMatch(/^u_[0-9a-f]{8}$/);
  });

  it("오류 응답도 기록하고 error 칸을 채운다", async () => {
    const handler = async () => new Response(JSON.stringify({ error: { code: "AI_UNAVAILABLE" } }), { status: 503 });
    await traced("assist", new Request("http://test/x", { method: "POST", body: "{}" }), {}, handler);
    const t = JSON.parse(readFileSync(file, "utf8").trim());
    expect(t).toMatchObject({ outcome: "error", error: "AI_UNAVAILABLE", status: 503 });
  });

  it("사진은 크기만, 전화번호·이메일은 가린다", () => {
    expect(maskPii("문의 031-212-3736, a.b@c.com")).toBe("문의 [전화번호], [이메일]");
    const input = traceInput("price_check", { image_base64: "A".repeat(4096), text: "상추 2kg 1만원" }, new URL("http://t/"));
    expect(input).toEqual({ image_base64: "[사진 3KB]", text: "상추 2kg 1만원" });
  });

  it("되묻기·안내 응답의 결과를 요약한다", () => {
    expect(traceOutput(200, { type: "ask", ask: { slot: "urgency" }, condition: { item_id: "item_green_onion", qty_kg: 4 } }))
      .toEqual({ outcome: "ask", summary: { slot: "urgency", condition: { item_id: "item_green_onion", qty_kg: 4 } } });
    expect(traceOutput(200, { type: "notice", notice: { kind: "off_topic", recognized_item: null } }).outcome).toBe("off_topic");
  });
});
