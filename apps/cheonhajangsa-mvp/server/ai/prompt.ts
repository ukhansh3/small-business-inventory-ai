import type Anthropic from "@anthropic-ai/sdk";
import type { AiInput } from "./types";

// 시스템 프롬프트와 도구 정의. 바꾸면 PROMPT_VERSION을 올리고 evals를 다시 돌린다(개발기획서 7절).
export const PROMPT_VERSION = "v2"; // v2: check_price 도구(가격 한 줄 진단) 추가

export const SYSTEM_PROMPT = `너는 식당 사장님이 식자재 판매처를 찾도록 돕는 앱의 입력 해석기다.
사장님 문장 하나를 읽고, 도구 하나를 정확히 한 번 호출해서 답한다. 글로 답하지 않는다.

- 사장님이 판매 중인 품목(후보 목록에서 active가 true인 것)을 찾으면 search_vendors를 호출한다.
- 사장님이 판매 중인 품목의 가격(금액)을 말하면서 그 값이 적당한지 묻거나 견적·구매 가격을 알려 주면 check_price를 호출한다. 예: '상추 2키로 만원 부르던데', '상추 4kg에 15000원 샀어요'.
- 사장님이 찾는 품목이 후보 목록에서 active가 false이거나 목록에 없는 식재료면 give_notice(kind="out_of_scope_item")를 호출하고 item_name에 사장님이 말한 품목 이름을 넣는다.
- 식자재 찾기와 무관한 말이면 give_notice(kind="off_topic")를 호출한다.

search_vendors 값 규칙:
- item_id는 반드시 후보 목록의 id 중 하나다.
- qty_kg: 사장님이 양을 말했을 때만 kg 숫자로. '키로'·'킬로'는 kg. '1박스'는 4. 말하지 않았으면 null.
- urgency: '지금'·'급해'·'바로'는 now, '오늘'은 today, '내일'은 tomorrow. 말하지 않았으면 null.
- fulfillment: '배달'·'갖다줘'는 delivery, '가지러'·'직접'·'사러 갈게'는 pickup. 말하지 않았으면 null.
- 문장에 없는 값은 절대 지어내지 않는다. 모르면 null이다.
- 판매처 이름, 가격, 입고 시간은 말하지 않는다. 결과는 앱이 보여 준다.

check_price 값 규칙:
- qty_kg: 문장에 있는 양을 kg 숫자로('키로'·'킬로'=kg, '1박스'=4, '500g'=0.5). 없으면 null.
- amount_won: 문장에 있는 금액을 원 단위 정수로('만원'=10000, '만오천원'=15000, '3천원'=3000). 없으면 null.
- 문장에 없는 양이나 금액은 절대 지어내지 않는다.`;

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_vendors",
    description: "사장님이 찾는 품목이 판매 중일 때, 문장에서 뽑은 조건으로 근처 판매처를 찾는다. 문장에 없는 조건은 null로 둔다.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        item_id: { type: "string", description: "후보 목록의 품목 id" },
        qty_kg: { type: ["number", "null"], description: "원하는 양(kg). 말하지 않았으면 null" },
        urgency: { anyOf: [{ type: "string", enum: ["now", "today", "tomorrow"] }, { type: "null" }], description: "급함. 말하지 않았으면 null" },
        fulfillment: { anyOf: [{ type: "string", enum: ["pickup", "delivery"] }, { type: "null" }], description: "받는 방식. 말하지 않았으면 null" },
      },
      required: ["item_id", "qty_kg", "urgency", "fulfillment"],
      additionalProperties: false,
    },
  },
  {
    name: "check_price",
    description: "사장님이 말한 품목 가격이 동네 시세보다 비싼지 싼지 진단한다. 품목이 판매 중이고 금액이 언급될 때 쓴다. 문장에 없는 값은 null로 둔다.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        item_id: { type: "string", description: "후보 목록의 품목 id" },
        qty_kg: { type: ["number", "null"], description: "양(kg). 말하지 않았으면 null" },
        amount_won: { type: ["number", "null"], description: "금액(원). 말하지 않았으면 null" },
      },
      required: ["item_id", "qty_kg", "amount_won"],
      additionalProperties: false,
    },
  },
  {
    name: "give_notice",
    description: "검색하지 않고 안내만 한다. 아직 준비되지 않은 품목이거나 식자재 찾기와 무관한 말일 때 쓴다.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["out_of_scope_item", "off_topic"] },
        item_name: { type: ["string", "null"], description: "사장님이 말한 품목 이름. 무관한 말이면 null" },
      },
      required: ["kind", "item_name"],
      additionalProperties: false,
    },
  },
];

export function userMessage(input: AiInput): string {
  const list = input.candidates.map((c) => `- id=${c.id}, 이름=${c.name}, 별칭=${c.aliases.join("/") || "없음"}, active=${c.active}`).join("\n");
  return `품목 후보 목록:\n${list}\n\n사장님 문장:\n${input.text}`;
}
