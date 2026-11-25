import { describe, expect, it } from "vitest";
import { type AiClient, type AiDecision, AiUnavailableError } from "../../server/ai/types";
import { readEnv } from "../../server/env";
import { handleAssistTurn } from "../../server/handlers/assist";
import type { MarketPricesFile } from "../../core/market-prices";
import { A, baseDataset, MON_1000, offer } from "../fixtures/dataset";

// v3 실제 사용 점검(2026-11-25)에서 찾은 문제의 결정적 보조 규칙. AI 프롬프트는 바꾸지 않는다

const DEVICE = "5b0c1b7e-3f1a-4c2e-9a4b-1d2e3f4a5b6c";
const base = baseDataset([A], [offer("v_101")]);
const data = {
  ...base,
  items: [
    { id: "item_lettuce", name: "상추", aliases: [], category: "채소", active: true, default_unit: "kg" as const },
    { id: "item_onion", name: "양파", aliases: [], category: "채소", active: true, default_unit: "kg" as const },
    { id: "item_green_onion", name: "대파", aliases: ["파"], category: "채소", active: true, default_unit: "kg" as const },
    { id: "item_chili", name: "고추", aliases: [], category: "채소", active: false, default_unit: "kg" as const },
  ],
};
const prices: MarketPricesFile = {
  region: "수원", built_on: "2026-11-25", sources: { wholesale: "w", retail: "r" },
  items: [{
    item_id: "item_onion",
    wholesale: { date: "2026-11-25", per_kg: 1400, trades: 8, low_per_kg: 1300, high_per_kg: 1450 },
    retail: { date: "2026-11-24", traditional_market_per_kg: 2300, large_retailer_per_kg: 1220 },
    trader: { date: "2026-11-24", market: "서울 가락", box_kg: 15, low: 11500, high: 20500 },
    change: null,
  }],
};
const env = readEnv({});
const ai = (d: AiDecision | "fail"): AiClient => ({
  mode: "live", model: "fake",
  async decide() { if (d === "fail") throw new AiUnavailableError("test"); return d; },
});
const post = (body: unknown) => new Request("http://test/api/v1/assist/turns", { method: "POST", headers: { "content-type": "application/json", "x-device-id": DEVICE }, body: JSON.stringify(body) });
async function turn(client: AiClient, text: string, prev?: { session_id: string; turn_seq: number; condition: unknown; field_source: unknown }) {
  const res = await handleAssistTurn(post({ ...(prev ?? { session_id: null }), input: { type: "text", text } }), { data, env, ai: client, clock: () => MON_1000, prices });
  return { status: res.status, body: await res.json() };
}

describe("시세만 물으면 그 품목 시세 카드", () => {
  it("금액 없이 '양파 10키로면 시세가 얼마' → 양파 사다리와 안내", async () => {
    const r = await turn(ai({ type: "price", item_id: "item_onion", qty_kg: 10, amount_won: null }), "양파 10키로면 시세가 얼마 정도예요");
    expect(r.body.type).toBe("price_check");
    expect(r.body.price_check.lines).toEqual([]);
    expect(r.body.price_check.message).toBe("양파 시세예요. 산 양과 금액을 같이 적으면 잘 샀는지 알려 드려요.");
    expect(r.body.price_check.market.ladder.box_label).toBe("15kg 한 망");
  });
});

describe("거래 단위만 쓴 가격", () => {
  it("'파 한단에 2500원'은 1kg으로 보고 진단한다", async () => {
    const r = await turn(ai({ type: "price", item_id: "item_green_onion", qty_kg: null, amount_won: 2500 }), "파 한단에 2500원");
    expect(r.body.price_check.lines[0]).toMatchObject({ item_id: "item_green_onion", qty_kg: 1, amount_won: 2500, price_per_kg: 2500 });
  });
});

describe("거래 단위가 AI 추정보다 우선", () => {
  it("'양파 한 망'을 AI가 4kg으로 읽어도 양파 망 15kg으로 고친다(실제 사례: 감자 한 박스를 4kg으로 읽음)", async () => {
    const r = await turn(ai({ type: "price", item_id: "item_onion", qty_kg: 4, amount_won: 30000 }), "양파 한 망 3만원 줬어요");
    expect(r.body.price_check.lines[0]).toMatchObject({ qty_kg: 15 });
  });
  it("무게를 직접 쓰면 AI 값을 그대로", async () => {
    const r = await turn(ai({ type: "price", item_id: "item_onion", qty_kg: 10, amount_won: 20000 }), "양파 10키로 한 망 2만원");
    expect(r.body.price_check.lines[0]).toMatchObject({ qty_kg: 10 });
  });
});

describe("식재료·배달을 찾는 말", () => {
  it("잡담으로 분류돼도 품목을 묻고 납품업체 위치를 알려 준다", async () => {
    const r = await turn(ai({ type: "notice", kind: "off_topic", item_name: null }), "근처 식자재 배달해주는 곳");
    expect(r.body.notice.message).toMatch(/^어떤 재료가 필요하세요\?.*식자재 납품업체/);
  });
  it("진짜 잡담은 그대로", async () => {
    const r = await turn(ai({ type: "notice", kind: "off_topic", item_name: null }), "오늘 날씨 어때");
    expect(r.body.notice.message).toMatch(/^이 도우미에서는/);
  });
});

describe("AI가 실패했을 때", () => {
  it("문장에 다른 품목이 있으면 이전 품목 대신 그 품목으로, 이전 양은 비운다", async () => {
    const t1 = await turn(ai({ type: "search", item_id: "item_lettuce", qty_kg: 2, urgency: "now", fulfillment: null }), "상추 2키로 급해요");
    const t2 = await turn(ai("fail"), "양파 10키로 필요해요", { session_id: t1.body.session_id, turn_seq: t1.body.turn_seq, condition: t1.body.condition, field_source: t1.body.field_source });
    expect(t2.status).toBe(503);
    expect(t2.body.error.message).toBe("잠깐 문제가 있어요. 양파 조건을 직접 골라 주세요.");
    expect(t2.body.error.detail.condition).toMatchObject({ item_id: "item_onion", qty_kg: null, urgency: "now" });
    expect(t2.body.error.detail.field_source.qty_kg).toBeUndefined();
  });
  it("준비 안 된 품목이면 AI 없이도 범위 밖 안내", async () => {
    const r = await turn(ai("fail"), "고추 있어요");
    expect(r.body.type).toBe("notice");
    expect(r.body.notice.kind).toBe("out_of_scope_item");
  });
  it("품목 이름이 없으면 예전처럼 지금 조건 유지", async () => {
    const r = await turn(ai("fail"), "급해요");
    expect(r.body.error.detail.condition.item_id).toBe("item_lettuce");
    expect(r.body.error.message).toBe("잠깐 문제가 있어요. 상추 조건을 직접 골라 주세요.");
  });
});
