import type { Store } from "./api-types";

// 업체 출처 구분(v3 화면 정리). 지도 핀 색·목록 표시·범례가 같은 기준을 쓴다.
// - wholesale: 수원 농수산물도매시장 중도매인(공공 명단)
// - supply: 식자재 납품업체(행안부 인허가)
// - shop: 동네 채소·과일 가게, 슈퍼(소상공인 상가정보)
// - demo: 팀이 만든 가상 시연 업체

export type StoreTone = "wholesale" | "supply" | "shop" | "demo";

export const TONES: Record<StoreTone, { label: string; color: string; soft: string }> = {
  wholesale: { label: "도매시장 중도매인", color: "#2f7d4f", soft: "#e6f2ea" },
  supply: { label: "식자재 납품업체", color: "#a35f00", soft: "#fbefdc" },
  shop: { label: "동네 가게", color: "#2f63a3", soft: "#e5eef8" },
  demo: { label: "가상 시연", color: "#7d828a", soft: "#eef0f2" },
};

export const TONE_ORDER: StoreTone[] = ["wholesale", "supply", "shop", "demo"];

export function toneOf(s: Pick<Store, "category" | "demo_service" | "vendor_card">): StoreTone {
  if (s.demo_service || s.vendor_card?.is_example) return "demo";
  if (s.category === "도매시장 중도매인") return "wholesale";
  if (s.category === "식자재 납품업체") return "supply";
  return "shop";
}

// 원천 자료 이름의 구분자를 화면용으로 정리한다. 예: "럭키;과일;야채" → "럭키 과일 야채"
export function displayName(name: string): string {
  return name.replace(/\s*[;|]\s*/g, " ").replace(/\s{2,}/g, " ").trim();
}

// "사용 3 · 저장 1"처럼 0이 아닌 값만. 둘 다 없으면 null
export function activityText(used?: number, saved?: number): string | null {
  const parts = [used ? `사용 ${used}명` : null, saved ? `저장 ${saved}명` : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
