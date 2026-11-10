import giveNoticeSchema from "../../src/cheonhajangsa/schemas/give_notice.schema.json";
import checkPriceSchema from "../../src/cheonhajangsa/schemas/check_price.schema.json";
import searchVendorsSchema from "../../src/cheonhajangsa/schemas/search_vendors.schema.json";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import type { AiInput } from "./types";

// 시스템 프롬프트와 도구 정의. 바꾸면 PROMPT_VERSION을 올리고 evals를 다시 돌린다(개발기획서 7절).
export const PROMPT_VERSION = "v3";

export function loadSystemPrompt(): string {
  const file = join(process.cwd(), "src/cheonhajangsa/prompts/parse_query.md");
  const document = readFileSync(file, "utf8");
  const body = document.match(/^<!-- prompt:start -->\r?\n([\s\S]+?)\r?\n<!-- prompt:end -->$/m)?.[1];
  if (!body?.trim()) throw new Error("parse_query.md에 시스템 프롬프트가 없습니다.");
  return body.replace(/\r\n/g, "\n");
}

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_vendors",
    description: "사장님이 찾는 품목이 판매 중일 때, 문장에서 뽑은 조건으로 근처 판매처를 찾는다. 문장에 없는 조건은 null로 둔다.",
    strict: true,
    input_schema: { ...searchVendorsSchema, type: "object" },
  },
  {
    name: "check_price",
    description: "사장님이 말한 품목 가격이 동네 시세보다 비싼지 싼지 진단한다. 품목이 판매 중이고 금액이 언급될 때 쓴다. 문장에 없는 값은 null로 둔다.",
    strict: true,
    input_schema: { ...checkPriceSchema, type: "object" },
  },
  {
    name: "give_notice",
    description: "검색하지 않고 안내만 한다. 아직 준비되지 않은 품목이거나 식자재 찾기와 무관한 말일 때 쓴다.",
    strict: true,
    input_schema: { ...giveNoticeSchema, type: "object" },
  },
];

export function userMessage(input: AiInput): string {
  const list = input.candidates.map((c) => `- id=${c.id}, 이름=${c.name}, 별칭=${c.aliases.join("/") || "없음"}, active=${c.active}`).join("\n");
  return `품목 후보 목록:\n${list}\n\n사장님 문장:\n${input.text}`;
}
