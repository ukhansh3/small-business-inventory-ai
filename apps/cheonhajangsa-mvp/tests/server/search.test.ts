import { describe, expect, it } from "vitest";
import { readEnv } from "../../server/env";
import { handleSearch } from "../../server/handlers/search";
import { A, baseDataset, MON_1000, MON_2100, offer, E } from "../fixtures/dataset";

const DEVICE = "5b0c1b7e-3f1a-4c2e-9a4b-1d2e3f4a5b6c";
const SESSION = "9e21f0a2-7b3c-4d5e-8f60-112233445566";

const data = baseDataset([A, E], [offer("v_101", { min_sale_kg: 2 }), offer("v_105")]);
const env = readEnv({});
const deps = { data, env, clock: () => MON_1000 };

function post(body: unknown, headers: Record<string, string> = { "x-device-id": DEVICE }) {
  return new Request("http://test/api/v1/search", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const condition = (qty_kg: number | null) => ({
  item_id: "item_lettuce",
  qty_kg,
  urgency: "now",
  fulfillment: "pickup",
  location_id: "loc_test",
});

describe("API-02 POST /search", () => {
  it("응답 모양이 명세와 같다", async () => {
    const res = await handleSearch(post({ session_id: SESSION, condition: condition(2) }), deps);
    expect(res.status).toBe(200);
    const body = await res.json();
    // v0.7(v2): 결과에 동네 시세(market) 칸이 붙는다
    expect(Object.keys(body).sort()).toEqual(["ai_mode", "chips", "condition", "example_data", "market", "results"]);
    expect(body.market).toMatchObject({ item_id: "item_lettuce", samples: expect.any(Number) });
    expect(body.condition).toMatchObject({ ...condition(2), version: 1 });
    expect(body.chips.map((c: { label: string }) => c.label)).toEqual(["상추", "2kg", "지금 바로", "직접", "테스트 위치"]);
    expect(body.results.total).toBe(2);
    expect(body.ai_mode).toBe("stored");
    expect(body.example_data).toBe(false);
  });

  it("AC-14 칩에서 양 1kg → 2kg: AI 없이 다시 검색, 결과가 AC-1과 같다", async () => {
    // 핸들러는 AI 의존성을 받지 않는다(호출 0회가 구조적으로 보장된다).
    const first = await (await handleSearch(post({ session_id: SESSION, condition: { ...condition(1), version: 1, field_source: { qty_kg: "asked" } } }), deps)).json();
    const ids1 = first.results.groups.flatMap((g: { items: { vendor_id: string }[] }) => g.items.map((c) => c.vendor_id));
    expect(ids1).not.toContain("v_101");

    const second = await (
      await handleSearch(post({ session_id: SESSION, condition: { ...condition(2), version: first.condition.version, field_source: first.condition.field_source }, changed: ["qty_kg"] }), deps)
    ).json();
    const ids2 = second.results.groups.flatMap((g: { items: { vendor_id: string }[] }) => g.items.map((c) => c.vendor_id));
    expect(ids2).toContain("v_101");
    expect(second.condition.version).toBe(first.condition.version + 1);
    expect(second.condition.field_source.qty_kg).toBe("edited");
  });

  it("X-Device-Id가 없으면 401", async () => {
    const res = await handleSearch(post({ session_id: SESSION, condition: condition(null) }, {}), deps);
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHORIZED");
  });

  it("JSON이 아니면 400 INVALID_INPUT", async () => {
    const res = await handleSearch(post("not json"), deps);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_INPUT");
  });

  it("허용값 밖(urgency)이면 400 INVALID_INPUT", async () => {
    const res = await handleSearch(post({ session_id: SESSION, condition: { ...condition(null), urgency: "soon" } }), deps);
    expect(res.status).toBe(400);
  });

  it("비활성 품목이면 400 ITEM_NOT_ACTIVE", async () => {
    const res = await handleSearch(post({ session_id: SESSION, condition: { ...condition(null), item_id: "item_green_onion" } }), deps);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("ITEM_NOT_ACTIVE");
  });

  it("없는 위치면 404", async () => {
    const res = await handleSearch(post({ session_id: SESSION, condition: { ...condition(null), location_id: "loc_x" } }), deps);
    expect(res.status).toBe(404);
  });

  it("X-Debug-Now는 ALLOW_DEBUG_HEADERS=true일 때만 적용된다", async () => {
    const debugHeader = { "x-device-id": DEVICE, "x-debug-now": MON_2100.toISOString() };
    const closedTitle = (body: { results: { groups: { key: string }[] } }) => body.results.groups.map((g) => g.key);

    const ignored = await (await handleSearch(post({ session_id: SESSION, condition: condition(null) }, debugHeader), deps)).json();
    expect(closedTitle(ignored)).toEqual(["available"]); // 10:00 기준 → E 영업 중

    const allowed = await (
      await handleSearch(post({ session_id: SESSION, condition: condition(null) }, debugHeader), { ...deps, env: readEnv({ ALLOW_DEBUG_HEADERS: "true" }) })
    ).json();
    expect(closedTitle(allowed)).toContain("unavailable_time"); // 21:00 기준 → E 닫힘
  });
});
