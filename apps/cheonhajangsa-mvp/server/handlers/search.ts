import { z } from "zod";
import { search, SearchInputError } from "../../core/search";
import type { Dataset } from "../../core/types";
import { chips, conditionInSchema, hasExampleData, SLOTS, type ConditionOut } from "../condition";
import type { ServerEnv } from "../env";
import { PROMPT_VERSION } from "../ai/prompt";
import { handle, HttpError, isTestDevice, isUuid, json, readJson, requestAiMode, requestNow, requireDevice } from "../http";
import type { Logger } from "../log/logger";
import { noopLogger } from "../log/noop";
import { marketFor } from "../price-check";

// API-02 조건 검색: POST /api/v1/search. AI를 부르지 않는다(AC-14).

const bodySchema = z.strictObject({
  session_id: z.string().refine(isUuid, "uuid여야 함"),
  condition: conditionInSchema,
  changed: z.array(z.enum(SLOTS)).optional(),
});

export type SearchDeps = { data: Dataset; env: ServerEnv; clock?: () => Date; log?: Logger; dataVersion?: string };

export function handleSearch(req: Request, deps: SearchDeps): Promise<Response> {
  return handle(async () => {
    const deviceId = requireDevice(req);
    const parsed = bodySchema.safeParse(await readJson(req));
    if (!parsed.success) {
      throw new HttpError("INVALID_INPUT", "조건이 올바르지 않아요.", parsed.error.issues.map((i) => i.path.join(".")));
    }
    const { condition: c, changed = [] } = parsed.data;
    const values = { item_id: c.item_id, qty_kg: c.qty_kg, urgency: c.urgency, fulfillment: c.fulfillment, location_id: c.location_id };

    let results;
    const started = Date.now();
    try {
      results = search(deps.data, values, requestNow(req, deps.env, deps.clock));
    } catch (e) {
      if (e instanceof SearchInputError) throw new HttpError(e.code, e.message);
      throw e;
    }

    const field_source = { ...(c.field_source ?? {}) };
    for (const slot of changed) field_source[slot] = "edited";
    const condition: ConditionOut = { ...values, version: (c.version ?? 0) + 1, field_source };
    const aiMode = requestAiMode(req, deps.env);

    // 기록: 조건 새 버전 + 도구 호출(user_edit) + condition_edit(WF-08)
    await (deps.log ?? noopLogger).logSearch({
      device_id: deviceId,
      is_test: isTestDevice(req),
      session: { id: parsed.data.session_id, ai_mode: aiMode, model: deps.env.aiModel, prompt_version: PROMPT_VERSION, data_version: deps.dataVersion ?? "unknown" },
      changed,
      condition,
      tool_call: {
        input: values,
        result_vendor_ids: results.groups.flatMap((g) => g.items.map((v) => v.vendor_id)),
        result_count: results.total,
        status: "ok",
        latency_ms: Date.now() - started,
        called_by: "user_edit",
      },
    });

    return json(200, {
      condition,
      chips: chips(values, deps.data),
      results,
      market: await marketFor(deps, values.item_id), // v2 동네 시세 한 줄(R-18)
      ai_mode: aiMode,
      example_data: hasExampleData(deps.data),
    });
  });
}
