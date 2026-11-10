import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { ServerEnv } from "../env";
import { type AiInput, AiUnavailableError } from "./types";

// 사진 진단(v2 API-15): 영수증·결제내역·상품 화면 한 장에서 구매 줄을 읽는다.
// 개인정보(카드번호·이름·주소·사업자번호·주문번호)는 도구 칸에 없어 뽑을 수 없다. 읽은 원문은 저장하지 않는다(R-21).

export const VISION_PROMPT_VERSION = "vision-v1";
export const DOC_TYPES = ["paper_receipt", "mobile_receipt", "platform_order", "product_page", "invoice", "not_receipt"] as const;
export const SELLER_TYPES = ["local_store", "food_mart", "online_platform", "unknown"] as const;

export type PurchaseRead = {
  doc_type: (typeof DOC_TYPES)[number];
  seller_type: (typeof SELLER_TYPES)[number];
  purchased_on: string | null;
  delivery_fee_won: number | null;
  lines: { raw_name: string; item_id: string | null; weight_kg_total: number | null; amount_won: number }[];
};

export type ImageInput = { media_type: "image/jpeg" | "image/png" | "image/webp"; data: string };

export interface VisionClient {
  mode: "live" | "stored";
  model: string;
  read(image: ImageInput, candidates: AiInput["candidates"]): Promise<PurchaseRead>;
}

const SYSTEM = `너는 식당 사장님이 올린 사진에서 식자재 구매 내역을 읽는 도구다. 도구 report_purchase를 정확히 한 번 호출한다.
사진 종류(doc_type): 종이 영수증 paper_receipt, 모바일 영수증 mobile_receipt, 쿠팡·식봄 같은 플랫폼 주문·결제내역 platform_order, 사기 전 상품 화면 product_page, 거래명세서 invoice, 그 밖의 사진 not_receipt(이때 lines는 빈 목록).
구입처 종류(seller_type): 동네 채소가게·시장 local_store, 식자재마트·마트 food_mart, 온라인 플랫폼 online_platform, 모르면 unknown.
lines: 상품 줄마다
- raw_name: 사진에 적힌 상품명 그대로(줄여도 됨).
- item_id: 품목 후보 목록에서 같은 품목이면 그 id, 아니면 null. 적상추·청상추·꽃상추는 상추다.
- weight_kg_total: 그 줄에서 산 전체 무게(kg). 사진에 무게가 적혀 있을 때만 계산한다(예: 2kg, 500g×2=1, 4kg×1박스=4). '1봉', '1단', '1개'처럼 무게가 없으면 null. 추측하지 않는다.
- amount_won: 그 줄의 결제 금액(원, 정수). 할인 후 금액이 있으면 그 값. 배송비는 넣지 않는다.
delivery_fee_won: 배송비가 따로 있으면 그 금액, 없으면 null. purchased_on: 날짜가 보이면 YYYY-MM-DD, 없으면 null.
카드번호, 이름, 전화번호, 주소, 사업자번호, 주문번호는 어디에도 적지 않는다. 사진에 없는 값은 지어내지 않는다.`;

const TOOL: Anthropic.Tool = {
  name: "report_purchase",
  description: "사진에서 읽은 구매 내역을 보고한다.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      doc_type: { type: "string", enum: [...DOC_TYPES] },
      seller_type: { type: "string", enum: [...SELLER_TYPES] },
      purchased_on: { type: ["string", "null"], description: "YYYY-MM-DD 또는 null" },
      delivery_fee_won: { type: ["number", "null"] },
      lines: {
        type: "array",
        items: {
          type: "object",
          properties: {
            raw_name: { type: "string" },
            item_id: { type: ["string", "null"] },
            weight_kg_total: { type: ["number", "null"] },
            amount_won: { type: "number" },
          },
          required: ["raw_name", "item_id", "weight_kg_total", "amount_won"],
          additionalProperties: false,
        },
      },
    },
    required: ["doc_type", "seller_type", "purchased_on", "delivery_fee_won", "lines"],
    additionalProperties: false,
  },
};

const readSchema = z.strictObject({
  doc_type: z.enum(DOC_TYPES),
  seller_type: z.enum(SELLER_TYPES),
  purchased_on: z.string().nullable(),
  delivery_fee_won: z.number().nullable(),
  lines: z.array(
    z.strictObject({ raw_name: z.string(), item_id: z.string().nullable(), weight_kg_total: z.number().nullable(), amount_won: z.number() }),
  ),
});

// 도구 인자를 검증하고, 서버 규칙으로 다시 정리한다(지어낸 값 방지)
export function toPurchaseRead(input: unknown, candidateIds: string[]): PurchaseRead {
  const p = readSchema.safeParse(input);
  if (!p.success) throw new AiUnavailableError("report_purchase 인자 형식 오류");
  const r = p.data;
  return {
    doc_type: r.doc_type,
    seller_type: r.seller_type,
    purchased_on: r.purchased_on && /^\d{4}-\d{2}-\d{2}$/.test(r.purchased_on) ? r.purchased_on : null,
    delivery_fee_won: r.delivery_fee_won !== null && r.delivery_fee_won >= 0 ? Math.round(r.delivery_fee_won) : null,
    lines:
      r.doc_type === "not_receipt"
        ? []
        : r.lines
            .filter((l) => Number.isFinite(l.amount_won) && l.amount_won >= 0)
            .slice(0, 50)
            .map((l) => ({
              raw_name: l.raw_name.slice(0, 60),
              item_id: l.item_id && candidateIds.includes(l.item_id) ? l.item_id : null,
              weight_kg_total: l.weight_kg_total !== null && l.weight_kg_total > 0 && l.weight_kg_total <= 1000 ? l.weight_kg_total : null,
              amount_won: Math.round(l.amount_won),
            })),
  };
}

export function createClaudeVision(env: ServerEnv): VisionClient {
  const client = env.anthropicApiKey ? new Anthropic({ apiKey: env.anthropicApiKey, timeout: env.aiVisionTimeoutMs, maxRetries: 0 }) : null;
  return {
    mode: "live",
    model: env.aiModel,
    async read(image, candidates) {
      if (!client) throw new AiUnavailableError("ANTHROPIC_API_KEY 없음");
      const list = candidates.map((c) => `- id=${c.id}, 이름=${c.name}, 별칭=${c.aliases.join("/") || "없음"}`).join("\n");
      let response: Anthropic.Message;
      try {
        response = await client.messages.create({
          model: env.aiModel,
          max_tokens: 2048,
          system: SYSTEM,
          tools: [TOOL],
          tool_choice: { type: "tool", name: "report_purchase" },
          messages: [
            {
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: image.media_type, data: image.data } },
                { type: "text", text: `품목 후보 목록:\n${list}\n\n이 사진의 구매 내역을 읽어 주세요.` },
              ],
            },
          ],
        });
      } catch (e) {
        if (e instanceof Anthropic.APIError) {
          console.error("Claude API 오류(사진)", e.status, JSON.stringify(e.error));
          throw new AiUnavailableError(`Claude API 오류 ${e.status ?? ""}`);
        }
        throw new AiUnavailableError("Claude 호출 실패(사진)");
      }
      if (response.stop_reason === "refusal") throw new AiUnavailableError("거절됨");
      const call = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      if (!call) throw new AiUnavailableError("도구 호출 없음");
      return toPurchaseRead(call.input, candidates.map((c) => c.id));
    },
  };
}

// 저장된 응답 모드: 사진은 미리 정한 답이 없어 AI를 쓸 수 없는 것과 같게 처리한다(앱은 가격 한 줄로 안내)
export function createStoredVision(): VisionClient {
  return {
    mode: "stored",
    model: "stored",
    async read() {
      throw new AiUnavailableError("저장된 응답 모드에서는 사진을 읽지 않음");
    },
  };
}
