import { randomUUID } from "node:crypto";
import { z } from "zod";
import { search, SearchInputError } from "../../core/search";
import type { Fulfillment, SearchCondition, Urgency } from "../../core/search-types";
import { applyChoice, applyDecision, ASK_ORDER, partialCondition, type Partial, QUESTIONS } from "./assist-condition";
import type { Dataset } from "../../core/types";
import { PROMPT_VERSION } from "../ai/prompt";
import { findCandidates } from "../ai/retrieval";
import { buildPriceCheck, marketFor } from "../price-check";
import { type AiClient, type AiDecision, AiUnavailableError } from "../ai/types";
import { chips, type FieldSource, fieldSourceSchema, hasExampleData, type Slot } from "../condition";
import type { ServerEnv } from "../env";
import { handle, HttpError, isTestDevice, isUuid, json, readJson, requestNow, requireDevice } from "../http";
import { LIMITS, type Logger, type TurnLog, type TurnRow } from "../log/logger";
import { seoulNow } from "../../core/time";
import { noopLogger } from "../log/noop";

// API-01 대화 한 턴: POST /api/v1/assist/turns
// 글 입력만 AI를 부른다. 선택지 응답은 서버가 바로 채운다. 빠진 조건은 서버가 정해진 순서로 되묻는다(AC-5).
// MVP는 세션 저장소가 없어 지금까지의 조건을 앱이 보내고 받는다(consistency-report C9).

const bodySchema = z.strictObject({
  session_id: z.string().refine(isUuid, "uuid여야 함").nullable(),
  turn_seq: z.number().int().min(0).optional(),
  input: z.discriminatedUnion("type", [
    z.strictObject({ type: z.literal("text"), text: z.string() }),
    z.strictObject({ type: z.literal("choice"), slot: z.enum(ASK_ORDER), value: z.union([z.string(), z.number(), z.null()]) }),
  ]),
  condition: partialCondition.optional(),
  field_source: fieldSourceSchema.optional(),
});

export type AssistDeps = { data: Dataset; env: ServerEnv; ai: AiClient; clock?: () => Date; log?: Logger; dataVersion?: string };

const EMPTY: Partial = { item_id: null, qty_kg: null, urgency: null, fulfillment: null, location_id: null };

export function handleAssistTurn(req: Request, deps: AssistDeps): Promise<Response> {
  return handle(async () => {
    const started = Date.now();
    const deviceId = requireDevice(req);
    const parsed = bodySchema.safeParse(await readJson(req));
    if (!parsed.success) {
      throw new HttpError("INVALID_INPUT", "요청 형식이 올바르지 않아요.", parsed.error.issues.map((i) => i.path.join(".")));
    }
    const body = parsed.data;
    const sessionId = body.session_id ?? randomUUID();
    const turnSeq = (body.turn_seq ?? 0) + 1;
    const cond: Partial = { ...EMPTY, ...(body.condition ?? {}) };
    const src: Record<string, FieldSource> = { ...(body.field_source ?? {}) };

    const defaultLoc = deps.data.locations.find((l) => l.is_default);
    if (!cond.location_id) {
      cond.location_id = defaultLoc?.id ?? null;
      src.location_id = "default";
    }

    const base = { session_id: sessionId, turn_seq: turnSeq, ai_mode: deps.ai.mode, example_data: hasExampleData(deps.data) };

    // 호출 한도(API 명세 1.5, P2-2). 기록 저장소가 없으면 한도를 적용하지 않는다(A4).
    // 세션 AI 6회·하루 한도를 넘으면 AI를 부르지 않고 AI 실패와 같은 경로(조건 직접 고르기)로 보낸다(consistency-report C13).
    const gate = await (deps.log ?? noopLogger).aiGate({
      device_id: deviceId,
      session_id: body.session_id,
      usage_date: seoulNow(requestNow(req, deps.env, deps.clock)).date,
      ai_call: body.input.type === "text",
      hour_limit: LIMITS.hourTurnsPerDevice,
      session_limit: LIMITS.aiCallsPerSession,
    });
    if (gate && gate.hour_turns >= LIMITS.hourTurnsPerDevice) throw new HttpError("RATE_LIMITED", "요청이 많아요. 잠시 후 다시 시도해 주세요.");
    const aiBlocked = !!gate && (gate.session_ai_calls >= LIMITS.aiCallsPerSession || gate.daily_calls > deps.env.aiDailyLimit);

    // 기록(WF-13): 한 번의 요청 = 사장님 턴 1개 + 앱 턴 1개. seq는 turn_seq에서 계산한다.
    const userTurn: TurnRow =
      body.input.type === "text"
        ? { seq: turnSeq * 2 - 1, role: "user", kind: "text", input_method: "typed", text: body.input.text.trim().slice(0, 1000) }
        : { seq: turnSeq * 2 - 1, role: "user", kind: "choice", ask_slot: body.input.slot, chosen: String(body.input.value) };
    const record = (reply: Omit<TurnRow, "seq" | "role" | "latency_ms">, rest: Pick<TurnLog, "outcome" | "condition" | "tool_call">) =>
      (deps.log ?? noopLogger).logTurn({
        device_id: deviceId,
        is_test: isTestDevice(req),
        session: { id: sessionId, ai_mode: deps.ai.mode, model: deps.ai.model, prompt_version: PROMPT_VERSION, data_version: deps.dataVersion ?? "unknown" },
        ai_called: body.input.type === "text" && !aiBlocked,
        turns: [userTurn, { ...reply, seq: turnSeq * 2, role: "assistant", latency_ms: Date.now() - started }],
        ...rest,
      });

    if (body.input.type === "text") {
      const text = body.input.text.trim();
      if (text.length < 1 || text.length > 200) throw new HttpError("INVALID_INPUT", "1~200자로 입력해 주세요.");

      let decision: AiDecision;
      try {
        if (aiBlocked) throw new AiUnavailableError("호출 한도");
        decision = await deps.ai.decide({ text, candidates: findCandidates(text, deps.data.items) });
      } catch (e) {
        if (e instanceof AiUnavailableError) {
          // WF-12: 지금까지의 조건을 돌려줘 앱이 칩 편집 → API-02로 이어 가게 한다(AC-15)
          const message = "잠깐 문제가 있어요. 조건을 직접 골라 주세요.";
          await record({ kind: "notice", text: message }, { outcome: "ai_failed", condition: null, tool_call: null });
          throw new HttpError("AI_UNAVAILABLE", message, {
            session_id: sessionId,
            condition: { ...cond, item_id: cond.item_id ?? "item_lettuce" },
            field_source: src,
          });
        }
        throw e;
      }

      // 서버가 다시 검증: AI가 고른 품목이 active가 아니면 범위 밖으로 본다(R-13)
      if (decision.type === "search" || decision.type === "price") {
        const chosenId = decision.item_id;
        const item = deps.data.items.find((i) => i.id === chosenId);
        if (!item || !item.active) {
          decision = { type: "notice", kind: "out_of_scope_item", item_name: item?.name ?? null };
        }
      }

      if (decision.type === "notice") {
        const name = decision.item_name;
        const known = name ? deps.data.items.find((i) => i.name === name || i.aliases.includes(name)) : undefined;
        const notice =
          decision.kind === "off_topic"
            ? { kind: "off_topic", message: "이 도우미에서는 식재료 판매처와 가격을 확인할 수 있어요. 업체나 업종은 지도에서 검색해 주세요.", recognized_item: null, actions: ["search_lettuce"] }
            : {
                kind: "out_of_scope_item",
                message: name ? `아직 상추만 준비돼 있어요. ${name} 요청을 남겨 주시면 먼저 준비할게요.` : "아직 상추만 준비돼 있어요.",
                recognized_item: name ? { item_id: known?.id ?? null, name } : null,
                actions: ["request_item", "search_lettuce"],
              };
        await record({ kind: "notice", text: notice.message }, { outcome: decision.kind, condition: null, tool_call: null });
        return json(200, { ...base, type: "notice", notice });
      }

      // v2 가격 한 줄 진단(V2-2): 양과 금액이 다 있어야 진단한다. 없으면 같이 적어 달라고 안내(지어내지 않음)
      if (decision.type === "price") {
        const d = decision;
        const complete = d.qty_kg !== null && d.qty_kg > 0 && d.amount_won !== null && d.amount_won > 0;
        const price_check = await buildPriceCheck(deps, {
          device_id: deviceId,
          is_test: isTestDevice(req),
          session_id: sessionId,
          location_id: cond.location_id ?? defaultLoc!.id,
          now: requestNow(req, deps.env, deps.clock),
          ai_mode: deps.ai.mode,
          model: deps.ai.model,
          source: "text",
          doc_type: "text",
          seller_type: "unknown",
          purchased_on: null,
          delivery_fee_won: null,
          lines: complete ? [{ raw_name: text, item_id: d.item_id, qty_kg: d.qty_kg, amount_won: Math.round(d.amount_won!) }] : [],
          message: complete ? null : "양과 금액을 같이 적어 주세요. 예: 상추 2kg 1만원",
        });
        const line = price_check.lines[0];
        await record({ kind: "price_check", text: line?.verdict_display ?? line?.reason ?? price_check.message }, { outcome: "price_check", condition: null, tool_call: null });
        return json(200, { ...base, type: "price_check", price_check });
      }

      applyDecision(cond, src, decision);
    } else {
      if (!cond.item_id) throw new HttpError("INVALID_INPUT", "먼저 찾을 재료를 말씀해 주세요.");
      applyChoice(cond, src, body.input.slot, body.input.value);
    }

    // 수량을 말하지 않아도 판매처를 검색할 수 있다.
    src.qty_kg ??= "default";
    const missing = ASK_ORDER.find((slot) => src[slot] === undefined);
    if (missing) {
      const q = QUESTIONS[missing];
      await record({ kind: "ask", text: q.question, ask_slot: missing, options: q.options }, { outcome: null, condition: null, tool_call: null });
      return json(200, {
        ...base,
        type: "ask",
        ask: { slot: missing, question: QUESTIONS[missing].question, options: QUESTIONS[missing].options, allow_text: true },
        condition: cond,
        field_source: src,
      });
    }

    const full: SearchCondition = {
      item_id: cond.item_id as string,
      qty_kg: cond.qty_kg,
      urgency: cond.urgency as Urgency,
      fulfillment: cond.fulfillment as Fulfillment,
      location_id: cond.location_id as string,
    };
    let results;
    const searchStarted = Date.now();
    try {
      results = search(deps.data, full, requestNow(req, deps.env, deps.clock));
    } catch (e) {
      if (e instanceof SearchInputError) throw new HttpError(e.code, e.message);
      throw e;
    }
    const condition = { ...full, version: 1, field_source: src as Record<Slot, FieldSource> };
    await record(
      { kind: "results", text: null },
      {
        outcome: "results",
        condition,
        tool_call: {
          input: full,
          result_vendor_ids: results.groups.flatMap((g) => g.items.map((c) => c.vendor_id)),
          result_count: results.total,
          status: "ok",
          latency_ms: Date.now() - searchStarted,
          called_by: "ai",
        },
      },
    );
    return json(200, {
      ...base,
      type: "results",
      condition,
      chips: chips(full, deps.data),
      results,
      market: await marketFor(deps, full.item_id), // v2 동네 시세 한 줄(R-18)
    });
  });
}
