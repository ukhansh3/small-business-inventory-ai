import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import { z } from "zod";
import { diagnoseLine } from "../../core/price";
import { search } from "../../core/search";
import type { SearchResult } from "../../core/search-types";
import { validateDataset } from "../../core/validate";
import { AiUnavailableError, type AiDecision } from "../../server/ai/types";
import { conditionValuesSchema } from "../../server/condition";
import { readEnv } from "../../server/env";
import { handleAssistTurn } from "../../server/handlers/assist";
import { handleSharePriceCheck } from "../../server/handlers/price-checks";
import { handleSearch } from "../../server/handlers/search";
import type { TurnLog } from "../../server/log/logger";
import { noopLogger } from "../../server/log/noop";
import { initialState, reduce } from "../../src/lib/assist-state";
import { planCall } from "../../src/lib/call";
import { baseDataset, northOf, offer, vendor } from "../fixtures/dataset";

const record = z.record(z.string(), z.unknown());
const suite = z.object({
  fixtures: z.object({ now: z.iso.datetime(), location_id: z.string(), item_id: z.string(), delivery_variants: z.array(z.object({
    id: z.string(), delivery_available: z.boolean().nullable(), delivery_dongs: z.array(z.string()), delivery_note: z.string().nullable(),
  })).min(1) }),
  cases: z.array(z.strictObject({
    id: z.string().regex(/^MVP-G\d+(?:-[A-Z]+)?$/),
    required: z.literal(true),
    ac: z.array(z.string().min(1)).min(1),
    target: z.string().min(1),
    fixture: z.string().min(1),
    input: record,
    expect: record.refine((value) => Object.keys(value).length > 0),
  })).min(1),
}).parse(JSON.parse(readFileSync(resolve("../../tests/harness/golden_cases.yaml"), "utf8")));
if (new Set(suite.cases.map(({ id }) => id)).size !== suite.cases.length) throw new Error("Duplicate golden case ID");
type GoldenCase = typeof suite.cases[number];

const device = "5b0c1b7e-3f1a-4c2e-9a4b-1d2e3f4a5b6c";
const session = "9e21f0a2-7b3c-4d5e-8f60-112233445566";
const clock = () => new Date(suite.fixtures.now);
const env = readEnv({});
const req = (path: string, body: unknown, method = "POST") => new Request("http://test/api/v1/" + path, {
  method, body: JSON.stringify(body), headers: { "content-type": "application/json", "x-device-id": device },
});
const ids = (r: SearchResult) => r.groups.flatMap(({ items }) => items.map(({ vendor_id }) => vendor_id));

async function deliveryCase(c: GoldenCase) {
  const condition = conditionValuesSchema.parse(c.input);
  const rows = suite.fixtures.delivery_variants;
  const data = baseDataset(rows.map(({ id, ...fields }) => vendor(id, id, fields)), rows.map(({ id }) => offer(id)));
  expect(validateDataset(data)).toMatchObject({ ok: true });
  const response = await handleSearch(req("search", { session_id: session, condition }), { data, env, clock });
  expect(response.status).toBe(200);
  const { results } = await response.json() as { results: SearchResult };
  const cards = results.groups.flatMap(({ items }) => items);
  const group = (key: string) => results.groups.find((g) => g.key === key)?.items ?? [];
  if (condition.fulfillment === "pickup") {
    const states = [...new Set(cards.map((v) => v.delivery.state))];
    const confirmations = [...new Set(cards.map((v) => v.destinationConfirmationRequired))];
    return { total: results.total, all_delivery_states: states.length === 1 ? states[0] : states,
      all_destination_confirmation_required: confirmations.length === 1 ? confirmations[0] : confirmations,
      no_delivery_count: group("no_delivery").length };
  }
  const map = (pick: (v: typeof cards[number]) => unknown) => Object.fromEntries(cards.map((v) => [v.vendor_id, pick(v)]));
  return { total: results.total, available_ids: group("available").map((v) => v.vendor_id).sort(),
    no_delivery_ids: group("no_delivery").map((v) => v.vendor_id).sort(),
    delivery_labels_by_id: map((v) => v.delivery.display),
    delivery_by_id: map(({ deliveryStatus, destinationConfirmationRequired, deliveryTerms }) => ({
      deliveryStatus, destinationConfirmationRequired, deliveryTerms,
    })) };
}

function minimumOrder(c: GoldenCase) {
  const input = z.strictObject({ below: conditionValuesSchema, boundary: conditionValuesSchema }).parse(c.input);
  const data = baseDataset([vendor("v_906", "최소 수량")], [offer("v_906", { min_sale_kg: 2 })]);
  return { below_total: search(data, input.below, clock()).total, boundary_ids: ids(search(data, input.boundary, clock())) };
}

function ordering(c: GoldenCase) {
  const condition = conditionValuesSchema.parse(c.input);
  const data = baseDataset(
    [vendor("v_908", "먼 곳", northOf(300)), vendor("v_907", "가까운 곳", northOf(100))],
    [offer("v_908"), offer("v_907")],
  );
  const runs = Array.from({ length: 3 }, () => ids(search(data, condition, clock())));
  for (const run of runs) expect(run).toEqual(c.expect.ids_each_run);
  return { run_count: runs.length, ids_each_run: runs[0] };
}

async function assistCase(c: GoldenCase) {
  const text = z.string().parse(c.input.text);
  const turns: TurnLog[] = [];
  const decide = c.input.fake_ai_error === "AI_UNAVAILABLE"
    ? async () => { throw new AiUnavailableError("golden fixture"); }
    : async () => c.input.fake_ai_decision as AiDecision;
  const response = await handleAssistTurn(req("assist/turns", { session_id: session, input: { type: "text", text } }), {
    data: baseDataset([], []), env, clock, ai: { mode: "live", model: "fake", decide },
    log: { ...noopLogger, async logTurn(turn) { turns.push(turn); } },
  });
  const body = await response.json();
  if (c.target === "assist_api_and_client_state") {
    const next = reduce(initialState(false, suite.fixtures.location_id), {
      type: "ai_failed", message: body.error.message, detail: body.error.detail,
    });
    return { http_status: response.status, error_code: body.error.code, opens_manual_conditions: next.editor === "recover" };
  }
  expect(response.status).toBe(200);
  if (c.fixture === "fake_ai_price") {
    const line = body.price_check?.lines[0];
    return { response_type: body.type, price_per_kg: line?.price_per_kg, comparable: line?.comparable };
  }
  expect(turns).toHaveLength(1);
  return { response_type: body.type, notice_kind: body.notice?.kind,
    search_calls: turns.filter(({ tool_call }) => tool_call !== null).length,
    emitted_vendor_count: body.results?.total ?? 0 };
}

function missingWeight(c: GoldenCase) {
  const line = z.strictObject({ item_id: z.string(), qty_kg: z.number().nullable(), amount_won: z.number() }).parse(c.input);
  const result = diagnoseLine(baseDataset([], []), { ...line, raw_name: "상추 1봉" }, 1, null, suite.fixtures.location_id, clock());
  return { comparable: result.comparable, price_per_kg: result.price_per_kg };
}

async function marketShare(c: GoldenCase) {
  const sharePriceCheck = vi.fn(async () => 1);
  const deps = { log: { ...noopLogger, sharePriceCheck } };
  const path = "price-checks/" + session;
  const before = await handleSharePriceCheck(req(path, c.input.before_consent, "PATCH"), deps);
  const callsBefore = sharePriceCheck.mock.calls.length;
  expect(before.status).toBe(400);
  const after = await handleSharePriceCheck(req(path, c.input.after_consent, "PATCH"), deps);
  expect(after.status).toBe(200);
  return { shared_before_consent: (await before.json()).shared_lines ?? 0,
    share_calls_before_consent: callsBefore, shared_after_consent: (await after.json()).shared_lines };
}

function exampleCall(c: GoldenCase) {
  expect(c.input.action).toBe("call");
  const plan = planCall({ is_example: z.boolean().parse(c.input.is_example), phone: "000-0000-0000" }, true);
  return { shows_example_notice: plan.kind === "example", opens_phone_link: plan.kind === "dial" };
}

const run: Record<string, (c: GoldenCase) => unknown> = {
  "search_api:delivery_variants": deliveryCase,
  "search:minimum_order_2kg": minimumOrder,
  "search:ordering_by_distance": ordering,
  "assist_api:fake_ai_price": assistCase,
  "price_calculation:missing_weight": missingWeight,
  "assist_api_and_client_state:fake_ai_unavailable": assistCase,
  "assist_api:fake_ai_out_of_scope": assistCase,
  "market_share:price_check_own_device": marketShare,
  "example_call:example_vendor_phone": exampleCall,
};
for (const c of suite.cases) {
  const execute = run[c.target + ":" + c.fixture];
  if (!execute) throw new Error("No golden runner for " + c.id);
  it(c.id, async () => { expect(await execute(c)).toStrictEqual(c.expect); });
}
