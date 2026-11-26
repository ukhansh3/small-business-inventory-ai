import items from "../../data/items.json";

// 지도 첫 화면 검색창 하나로 두 가지를 받는다(2026-11-26 UI 개선).
// - 품목·양·가격이 든 문장("상추 2키로 급해요", "양파 한 망 만원") → AI 도우미
// - 그 밖(가게 이름·업종) → 지금처럼 지도 업체 검색
// 사장님이 어느 창에 칠지 고르지 않아도 되게 한다.
const ITEM_WORDS = (items as { name: string; aliases?: string[] }[])
  .flatMap((item) => [item.name, ...(item.aliases ?? [])])
  .filter((word) => word.length >= 2); // '파' 같은 한 글자 별칭은 가게 이름(파리바게뜨 등)과 겹친다

const AMOUNT = /\d+(\.\d+)?\s*(키로|킬로|kg|㎏|g|박스|상자|망|단|봉|개|원|만원|천원)|(한|두|세|네)\s*(박스|상자|망|단|봉)|만원|천원/i;

export type SearchRoute = "assistant" | "stores";

export function routeSearch(text: string): SearchRoute {
  const t = text.trim();
  if (!t) return "stores";
  const compact = t.replace(/\s+/g, "");
  if (ITEM_WORDS.some((word) => compact.includes(word.replace(/\s+/g, "")))) return "assistant";
  if (AMOUNT.test(t)) return "assistant";
  return "stores";
}
