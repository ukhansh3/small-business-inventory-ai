import type { Item } from "../../core/types";
import type { AiInput } from "./types";

// 품목 사전 검색(RAG 단계): 사장님 문장과 품목 이름·별칭을 글자 단위로 맞춰 후보를 고르고 AI에 넘긴다.
// 사전이 작아(MVP 5개) 일치하는 후보를 앞에, 나머지를 뒤에 두고 최대 5개를 넘긴다.
const MAX_CANDIDATES = 5;

function norm(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

export function findCandidates(text: string, items: Item[]): AiInput["candidates"] {
  const t = norm(text);
  const score = (it: Item) => [it.name, ...it.aliases].reduce((best, w) => (t.includes(norm(w)) ? Math.max(best, w.length) : best), 0);
  return [...items]
    .map((it) => ({ it, s: score(it) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, MAX_CANDIDATES)
    .map(({ it }) => ({ id: it.id, name: it.name, aliases: it.aliases, active: it.active }));
}
