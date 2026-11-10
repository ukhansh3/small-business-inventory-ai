import { describe, expect, it } from "vitest";
import { createStoredAi } from "../../server/ai/stored";
import { type AiDecision } from "../../server/ai/types";
import { type PurchaseRead, toPurchaseRead, type VisionClient } from "../../server/ai/vision";
import { readEnv } from "../../server/env";
import { handleAssistTurn } from "../../server/handlers/assist";
import { handleMarket, handlePhotoCheck, handleSharePriceCheck } from "../../server/handlers/price-checks";
import type { Logger, PriceCheckLog } from "../../server/log/logger";
import { noopLogger } from "../../server/log/noop";
import { baseDataset, MON_1000, northOf, offer, vendor } from "../fixtures/dataset";

const DEVICE = "5b0c1b7e-3f1a-4c2e-9a4b-1d2e3f4a5b6c";
const env = readEnv({});
const priced = (id: string, p: number) => offer(id, { price: p, price_unit_label: "1kg", unit_kg: 1, price_source: "현장확인", price_checked_on: "2026-11-03" });
// 시세 중간값 4,000원(3,000·4,000·5,000), 더 싼 곳 후보 v_501(3,000원)
const data = baseDataset(
  [vendor("v_501", "가", northOf(100)), vendor("v_502", "나", northOf(200)), vendor("v_503", "다", northOf(300))],
  [priced("v_501", 3000), priced("v_502", 4000), priced("v_503", 5000)],
);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]).toString("base64");

function recorder(over: Partial<Logger> = {}) {
  const logged: PriceCheckLog[] = [];
  const log: Logger = {
    ...noopLogger,
    enabled: true,
    async logPriceCheck(e) {
      logged.push(e);
    },
    ...over,
  };
  return { log, logged };
}
const vision = (read: PurchaseRead | Error): VisionClient => ({
  mode: "live",
  model: "fake",
  async read() {
    if (read instanceof Error) throw read;
    return read;
  },
});
const post = (path: string, body: unknown, method = "POST") =>
  new Request(`http://test/api/v1/${path}`, { method, headers: { "content-type": "application/json", "x-device-id": DEVICE }, body: JSON.stringify(body) });
const photo = (v: VisionClient, log?: Logger, body: unknown = { image: { media_type: "image/jpeg", data: JPEG } }) =>
  handlePhotoCheck(post("price-checks", body), { data, env, vision: v, log, clock: () => MON_1000 });

const receipt: PurchaseRead = {
  doc_type: "platform_order",
  seller_type: "online_platform",
  purchased_on: "2026-11-03",
  delivery_fee_won: 3000,
  lines: [
    { raw_name: "국내산 적상추 2kg", item_id: "item_lettuce", weight_kg_total: 2, amount_won: 10000 },
    { raw_name: "상추 1봉", item_id: "item_lettuce", weight_kg_total: null, amount_won: 3000 },
    { raw_name: "대파 1단", item_id: "item_green_onion", weight_kg_total: null, amount_won: 2500 },
  ],
};

describe("API-15 사진 진단", () => {
  it("줄마다 kg당·판정·더 싼 곳, 비교 못 하면 이유. 배송비는 따로(AC-17·18·21·26)", async () => {
    const { log } = recorder();
    const res = await photo(vision(receipt), log);
    expect(res.status).toBe(200);
    const b = await res.json();
    expect(b).toMatchObject({ source: "photo", doc_type: "platform_order", delivery_fee_won: 3000, market: { per_kg: { median: 4000 } } });
    expect(b.lines[0]).toMatchObject({ price_per_kg: 5000, verdict: "pricier", amount_won: 10000, raw_name: "국내산 적상추 2kg" });
    expect(b.lines[0].cheaper.map((c: { vendor_id: string }) => c.vendor_id)).toEqual(["v_501", "v_502"]);
    expect(b.lines[1]).toMatchObject({ comparable: false, reason: "단위를 알 수 없어요" });
    expect(b.lines[2]).toMatchObject({ comparable: false, reason: "아직 상추만 비교해요" });
  });

  it("AC-22 기록에 사진·원문 글자·raw_name이 없다", async () => {
    const { log, logged } = recorder();
    await photo(vision(receipt), log);
    const text = JSON.stringify(logged[0]);
    expect(text).not.toContain(JPEG);
    expect(text).not.toContain("적상추");
    expect(text).not.toContain("raw_name");
    expect(logged[0]!.lines[0]).toEqual({ line_no: 1, item_id: "item_lettuce", qty_kg: 2, amount_won: 10000, price_per_kg: 5000, comparable: true, verdict: "pricier" });
  });

  it("AC-23 영수증이 아닌 사진이면 줄 없이 안내", async () => {
    const res = await photo(vision({ doc_type: "not_receipt", seller_type: "unknown", purchased_on: null, delivery_fee_won: null, lines: [] }));
    const b = await res.json();
    expect(b.lines).toEqual([]);
    expect(b.message).toBe("영수증이나 결제내역 사진을 올려 주세요.");
  });

  it("이미지가 아니거나 3MB를 넘으면 400, 사진을 못 읽으면 503 + 가격 한 줄 안내", async () => {
    expect((await photo(vision(receipt), undefined, { image: { media_type: "image/jpeg", data: Buffer.from("hello").toString("base64") } })).status).toBe(400);
    const big = Buffer.alloc(3 * 1024 * 1024 + 1, 0);
    big[0] = 0xff;
    big[1] = 0xd8;
    expect((await photo(vision(receipt), undefined, { image: { media_type: "image/jpeg", data: big.toString("base64") } })).status).toBe(400);
    const { AiUnavailableError } = await import("../../server/ai/types");
    const fail = await photo(vision(new AiUnavailableError("x")));
    expect(fail.status).toBe(503);
    expect((await fail.json()).error.message).toContain("가격을 글로 적어 주세요");
  });

  it("사진도 AI 호출 한도에 걸린다(하루 한도 → 503, 시간 한도 → 429)", async () => {
    const gate = (g: { hour_turns: number; session_ai_calls: number; daily_calls: number }) => recorder({ async aiGate() { return g; } }).log;
    expect((await photo(vision(receipt), gate({ hour_turns: 0, session_ai_calls: 0, daily_calls: 501 }))).status).toBe(503);
    expect((await photo(vision(receipt), gate({ hour_turns: 60, session_ai_calls: 0, daily_calls: 1 }))).status).toBe(429);
  });
});

describe("AI 사진 결과를 서버가 다시 검증(지어낸 값 방지)", () => {
  it("후보에 없는 품목 id는 null, 이상한 무게는 null, 영수증 아님이면 줄을 버림, 날짜 형식 확인", () => {
    const r = toPurchaseRead(
      {
        doc_type: "paper_receipt",
        seller_type: "local_store",
        purchased_on: "11/3",
        delivery_fee_won: -5,
        lines: [
          { raw_name: "상추", item_id: "item_made_up", weight_kg_total: -1, amount_won: 3000 },
          { raw_name: "음수", item_id: null, weight_kg_total: null, amount_won: -100 },
        ],
      },
      ["item_lettuce"],
    );
    expect(r).toEqual({ doc_type: "paper_receipt", seller_type: "local_store", purchased_on: null, delivery_fee_won: null, lines: [{ raw_name: "상추", item_id: null, weight_kg_total: null, amount_won: 3000 }] });
    expect(toPurchaseRead({ doc_type: "not_receipt", seller_type: "unknown", purchased_on: null, delivery_fee_won: null, lines: [{ raw_name: "x", item_id: null, weight_kg_total: 1, amount_won: 1 }] }, []).lines).toEqual([]);
  });
});

describe("API-01 가격 한 줄(V2-2)", () => {
  const fake = (d: AiDecision) => ({ mode: "live" as const, model: "fake", decide: async () => d });
  const turn = (ai: ReturnType<typeof fake> | ReturnType<typeof createStoredAi>, text: string) =>
    handleAssistTurn(post("assist/turns", { session_id: null, input: { type: "text", text } }), { data, env, ai, clock: () => MON_1000 });

  it("AC-24 '상추 2키로 만원 부르던데' → price_check, kg당 5,000원 비싼 편(저장된 응답)", async () => {
    const b = await (await turn(createStoredAi(), "상추 2키로 만원 부르던데")).json();
    expect(b.type).toBe("price_check");
    expect(b.price_check).toMatchObject({ source: "text", lines: [{ price_per_kg: 5000, verdict: "pricier" }] });
  });
  it("금액이나 양이 없으면 진단하지 않고 같이 적어 달라고 안내(지어내지 않음)", async () => {
    const b = await (await turn(fake({ type: "price", item_id: "item_lettuce", qty_kg: null, amount_won: 10000 }), "상추 만원")).json();
    expect(b.price_check.lines).toEqual([]);
    expect(b.price_check.message).toBe("양과 금액을 같이 적어 주세요. 예: 상추 2kg 1만원");
  });
  it("범위 밖 품목 가격이면 범위 밖 안내(R-13)", async () => {
    const b = await (await turn(fake({ type: "price", item_id: "item_green_onion", qty_kg: 1, amount_won: 3000 }), "대파 1키로 3천원")).json();
    expect(b.type).toBe("notice");
    expect(b.notice.kind).toBe("out_of_scope_item");
  });
});

describe("API-16 시세에 보태기, API-17 시세", () => {
  const share = (log: Logger, id = "9e21aa00-1111-4222-8333-444455556666") => handleSharePriceCheck(post(`price-checks/${id}`, { share: true }, "PATCH"), { log });
  it("보탠 줄 수 200, 다른 기기·없는 진단 404, 저장소 없음 503, id 형식 400", async () => {
    expect((await share(recorder({ async sharePriceCheck() { return 1; } }).log)).status).toBe(200);
    expect((await share(recorder({ async sharePriceCheck() { return -1; } }).log)).status).toBe(404);
    expect((await share(noopLogger)).status).toBe(503);
    expect((await share(noopLogger, "not-a-uuid")).status).toBe(400);
  });
  it("동의한 구매 기록이 시세 표본에 더해진다(AC-25)", async () => {
    const get = (log: Logger) => handleMarket(new Request("http://test/api/v1/market?item_id=item_lettuce", { headers: { "x-device-id": DEVICE } }), { data, log });
    expect((await (await get(noopLogger)).json()).samples).toBe(3);
    expect((await (await get(recorder({ async marketSamples() { return [3500, 3600]; } }).log)).json()).samples).toBe(5);
    const inactive = await handleMarket(new Request("http://test/api/v1/market?item_id=item_green_onion", { headers: { "x-device-id": DEVICE } }), { data });
    expect(inactive.status).toBe(400);
  });
});
