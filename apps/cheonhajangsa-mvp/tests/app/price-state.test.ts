import { describe, expect, it } from "vitest";
import type { PriceCheck, TurnResponse } from "../../src/lib/api-types";
import { type AssistState, initialState, priceSummary, reduce } from "../../src/lib/assist-state";
import { fitSize } from "../../src/lib/photo";

const SID = "5b0c1b7e-3f1a-4c2e-9a4b-1d2e3f4a5b6c";
const market = { item_id: "item_lettuce", per_kg: { low: 3000, median: 3750, high: 4200 }, samples: 7, includes_example: true, display: "이 동네 상추 kg당 3,000~4,200원 · 중간 3,750원 · 7건 기준(예시 포함)" };
const check: PriceCheck = {
  check_id: "11111111-1111-4111-8111-111111111111",
  source: "photo",
  doc_type: "paper_receipt",
  seller_type: "local_store",
  purchased_on: "2026-11-03",
  delivery_fee_won: null,
  lines: [
    { line_no: 1, raw_name: "적상추 2kg", item_id: "item_lettuce", item_name: "상추", qty_kg: 2, amount_won: 10000, price_per_kg: 5000, comparable: true, reason: null, verdict: "pricier", verdict_display: "동네 중간 3,750원보다 33% 비싼 편", cheaper: [] },
    { line_no: 2, raw_name: "대파 1단", item_id: null, item_name: null, qty_kg: null, amount_won: 2500, price_per_kg: null, comparable: false, reason: "아직 상추만 비교해요", verdict: null, verdict_display: null, cheaper: [] },
  ],
  market,
  message: null,
  example_data: true,
  ai_mode: "live",
};

describe("v2 단가 진단 화면 상태", () => {
  it("사진 진단 결과: 요약 말풍선, 카드, 이전 결과는 거둠", () => {
    let s: AssistState = { ...initialState(true), results: { groups: [], total: 0, empty_hint: null }, chips: [] };
    s = reduce(reduce(s, { type: "owner_said", text: "📷 사진을 보냈어요" }), { type: "loading" });
    s = reduce(s, { type: "photo_ok", check });
    expect(s.loading).toBe(false);
    expect(s.priceCheck).toBe(check);
    expect(s.results).toBeNull();
    expect(s.messages.at(-1)?.text).toBe("상추 kg당 5,000원 · 동네 중간 3,750원보다 33% 비싼 편");
  });

  it("가격 한 줄(API-01 price_check)도 같은 카드", () => {
    const r: TurnResponse = { session_id: SID, turn_seq: 1, ai_mode: "stored", example_data: true, type: "price_check", price_check: { ...check, source: "text" } };
    const s = reduce(initialState(true), { type: "turn_ok", res: r });
    expect(s.priceCheck?.source).toBe("text");
    expect(s.sessionId).toBe(SID);
  });

  it("판정이 없으면 안내 문구를 요약으로", () => {
    expect(priceSummary({ ...check, lines: [], message: "영수증이나 결제내역 사진을 올려 주세요." })).toBe("영수증이나 결제내역 사진을 올려 주세요.");
    expect(priceSummary({ ...check, lines: [check.lines[1]!], message: null })).toBe("아직 상추만 비교해요");
  });

  it("시세에 보태기 상태, 새 진단이면 다시 처음, 찾기 결과에는 시세 한 줄", () => {
    let s = reduce(initialState(true), { type: "photo_ok", check });
    s = reduce(s, { type: "share", state: "done", message: "고마워요" });
    expect(s.share.state).toBe("done");
    s = reduce(s, { type: "photo_ok", check });
    expect(s.share.state).toBe("idle");
    const res: TurnResponse = {
      session_id: SID, turn_seq: 2, ai_mode: "live", example_data: true, type: "results",
      condition: { item_id: "item_lettuce", qty_kg: 2, urgency: "now", fulfillment: "pickup", location_id: "loc_ajou_main", version: 1, field_source: {} },
      chips: [], results: { groups: [], total: 0, empty_hint: null }, market,
    };
    s = reduce(s, { type: "turn_ok", res });
    expect(s.market).toEqual(market);
    expect(s.priceCheck).toBeNull();
  });

  it("사진 줄이기: 긴 변 1600px, 작은 사진은 그대로", () => {
    expect(fitSize(4000, 3000)).toEqual({ w: 1600, h: 1200 });
    expect(fitSize(1000, 3000)).toEqual({ w: 533, h: 1600 });
    expect(fitSize(800, 600)).toEqual({ w: 800, h: 600 });
  });
});
