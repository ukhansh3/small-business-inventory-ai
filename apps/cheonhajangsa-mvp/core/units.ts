import { BOXES } from "./market-prices";
import type { Item } from "./types";

// v3 문장 보조 규칙(결정적, AI 프롬프트와 별개).
// 1) 거래 단위(단·망·박스·상자)만 쓴 양을 kg으로 바꾼다. 품목의 거래 단위와 맞을 때만(상추 4kg 상자, 양파 15kg 망, 대파 1kg 단, 감자 20kg 상자)
// 2) 문장에 나온 품목 이름을 찾는다(AI가 실패했을 때 이전 품목으로 검색하지 않도록)

const UNIT_WORDS: Record<string, string[]> = {
  item_lettuce: ["박스", "상자"],
  item_onion: ["망"],
  item_green_onion: ["단"],
  item_potato: ["박스", "상자"],
};

const COUNT: Record<string, number> = { 한: 1, 두: 2, 세: 3, 네: 4, 다섯: 5 };

// "파 한단에 2500원" → 1, "양파 2망" → 30, "상추 한 박스" → 4. 단위가 없거나 품목과 안 맞으면 null
export function unitQtyKg(text: string, itemId: string | null): number | null {
  if (!itemId) return null;
  const words = UNIT_WORDS[itemId];
  const box = BOXES[itemId];
  if (!words || !box) return null;
  const units = words.join("|");
  // 단위 뒤에는 끝·공백·숫자·조사만 허용("단가"의 단은 안 잡는다). 숫자 없이 단위만 쓰면 1개
  const after = "(?=$|[^가-힣]|에|짜리|씩|을|를|이|은|는|당)";
  const withCount = new RegExp(`(\\d+(?:\\.\\d+)?|한|두|세|네|다섯)\\s*(?:${units})${after}`).exec(text);
  const bare = withCount ? null : new RegExp(`(?<![가-힣])(?:${units})${after}`).exec(text);
  if (!withCount && !bare) return null;
  const n = withCount ? (COUNT[withCount[1]!] ?? Number(withCount[1])) : 1;
  if (!(n > 0 && n <= 20)) return null;
  return Math.round(n * box.kg * 10) / 10;
}

// 문장에 이름·별칭이 들어 있는 품목(가장 긴 이름이 이긴다). 없으면 null
export function mentionedItem(text: string, items: Item[]): Item | null {
  const t = text.replace(/\s+/g, "");
  let best: { it: Item; len: number } | null = null;
  for (const it of items) {
    for (const w of [it.name, ...it.aliases]) {
      const k = w.replace(/\s+/g, "");
      if (k && t.includes(k) && (!best || k.length > best.len)) best = { it, len: k.length };
    }
  }
  return best?.it ?? null;
}

// 무게를 숫자로 직접 썼는가(2kg, 20키로, 500g, 3킬로)
export function hasExplicitWeight(text: string): boolean {
  return /\d+(?:\.\d+)?\s*(?:kg|키로|킬로|g|그램)/i.test(text);
}
