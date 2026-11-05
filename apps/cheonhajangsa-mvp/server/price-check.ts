import { randomUUID } from "node:crypto";
import { computeMarket, diagnoseLine, type Market, type PriceLine, type PurchaseLineInput } from "../core/price";
import type { Dataset } from "../core/types";
import { hasExampleData } from "./condition";
import type { Logger } from "./log/logger";
import { noopLogger } from "./log/noop";

// 단가 진단 결과 만들기(API-01 check_price, API-15 사진). 계산은 core/price, 여기서는 시세 표본 읽기·기록·응답 모양.

export type PriceCheck = {
  check_id: string;
  source: "text" | "photo";
  doc_type: string;
  seller_type: string;
  purchased_on: string | null;
  delivery_fee_won: number | null;
  lines: PriceLine[];
  market: Market | null;
  message: string | null; // 진단할 줄이 없을 때 사장님에게 보여 줄 안내
  example_data: boolean;
  ai_mode: "live" | "stored";
};

export type PriceCheckDeps = { data: Dataset; log?: Logger };

// R-18: 판매처 가격 + 동의한 구매 기록
export async function marketFor(deps: PriceCheckDeps, itemId: string): Promise<Market> {
  const observed = await (deps.log ?? noopLogger).marketSamples(itemId);
  return computeMarket(deps.data, itemId, observed);
}

export async function buildPriceCheck(
  deps: PriceCheckDeps,
  input: {
    device_id: string;
    is_test: boolean;
    session_id: string | null;
    location_id: string;
    now: Date;
    ai_mode: "live" | "stored";
    model: string;
    source: "text" | "photo";
    doc_type: string;
    seller_type: string;
    purchased_on: string | null;
    delivery_fee_won: number | null;
    lines: PurchaseLineInput[];
    message?: string | null;
  },
): Promise<PriceCheck> {
  // 시세는 비교할 수 있는 품목(active)마다 한 번만 읽는다. MVP는 상추 하나
  const itemIds = [...new Set(input.lines.map((l) => l.item_id).filter((id): id is string => !!id && !!deps.data.items.find((i) => i.id === id && i.active)))];
  const markets = new Map<string, Market>();
  for (const id of itemIds) markets.set(id, await marketFor(deps, id));

  const lines = input.lines.map((l, i) => diagnoseLine(deps.data, l, i + 1, l.item_id ? markets.get(l.item_id) ?? null : null, input.location_id, input.now));
  const check: PriceCheck = {
    check_id: randomUUID(),
    source: input.source,
    doc_type: input.doc_type,
    seller_type: input.seller_type,
    purchased_on: input.purchased_on,
    delivery_fee_won: input.delivery_fee_won,
    lines,
    market: itemIds[0] ? markets.get(itemIds[0]) ?? null : null,
    message: input.message ?? (input.doc_type === "not_receipt" ? "영수증이나 결제내역 사진을 올려 주세요." : lines.length === 0 ? "사진에서 구매 내역을 찾지 못했어요. 가격을 글로 적어 주세요. 예: 상추 2kg 1만원" : null),
    example_data: hasExampleData(deps.data),
    ai_mode: input.ai_mode,
  };

  // 기록(R-21): 사진·원문 글자·raw_name은 넘기지 않는다
  await (deps.log ?? noopLogger).logPriceCheck({
    device_id: input.device_id,
    is_test: input.is_test,
    check_id: check.check_id,
    session_id: input.session_id,
    source: input.source,
    doc_type: input.doc_type,
    seller_type: input.seller_type,
    location_id: input.location_id,
    purchased_on: input.purchased_on,
    delivery_fee_won: input.delivery_fee_won,
    ai_mode: input.ai_mode,
    model: input.model,
    lines: lines.map((l) => ({ line_no: l.line_no, item_id: l.item_id, qty_kg: l.qty_kg, amount_won: l.amount_won, price_per_kg: l.price_per_kg, comparable: l.comparable, verdict: l.verdict })),
  });
  return check;
}
