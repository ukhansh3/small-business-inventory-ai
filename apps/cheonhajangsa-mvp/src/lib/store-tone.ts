import type { Store } from "./api-types";

// 업체 출처 구분(v3 화면 정리). 지도 핀 색·목록 표시·범례가 같은 기준을 쓴다.
// - wholesale: 수원 농수산물도매시장 중도매인(공공 명단)
// - supply: 식자재 납품업체(행안부 인허가)
// - shop: 동네 채소·과일 가게, 슈퍼(소상공인 상가정보)

export type StoreTone = "wholesale" | "supply" | "shop";

export const TONES: Record<StoreTone, { label: string; color: string; soft: string }> = {
  wholesale: { label: "도매시장 중도매인", color: "#2f7d4f", soft: "#e6f2ea" },
  supply: { label: "식자재 납품업체", color: "#a35f00", soft: "#fbefdc" },
  shop: { label: "동네 가게", color: "#2f63a3", soft: "#e5eef8" },
};

export const TONE_ORDER: StoreTone[] = ["wholesale", "supply", "shop"];

export function toneOf(s: Pick<Store, "category">): StoreTone {
  if (s.category === "도매시장 중도매인") return "wholesale";
  if (s.category === "식자재 납품업체") return "supply";
  return "shop";
}

// 원천 자료 이름을 화면용으로 정리한다. 예: "럭키;과일;야채" → "럭키 과일 야채"
// 법인 표기(주식회사·농업회사법인·(주) 등)는 이름을 가려 읽기 어려워 화면에서만 뺀다
const LEGAL = /(주식회사|농업회사법인|영농조합법인|유한회사|합자회사|\((주|유|합)\)|㈜)\s*/g;
export function displayName(name: string): string {
  const plain = name.replace(/\s*[;|]\s*/g, " ").replace(LEGAL, " ").replace(/\s{2,}/g, " ").trim();
  return plain || name.trim();
}

// "사용 3 · 저장 1"처럼 0이 아닌 값만. 둘 다 없으면 null
export function activityText(used?: number, saved?: number): string | null {
  const parts = [used ? `사용 ${used}명` : null, saved ? `저장 ${saved}명` : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
