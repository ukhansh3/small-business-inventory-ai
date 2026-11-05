// 내 위치(WF-02). 서버(API-07)에도 저장하지만, 저장소가 없거나 실패해도 이 기기에서는 쓸 수 있게 브라우저에 둔다.
const KEY = "chj_location_id";

export function getSavedLocation(): string | null {
  try {
    return globalThis.localStorage?.getItem(KEY) ?? null;
  } catch {
    return null;
  }
}

export function saveLocation(id: string): void {
  try {
    globalThis.localStorage?.setItem(KEY, id);
  } catch {
    // 저장이 막힌 환경: 이번 화면에서만 적용된다
  }
}
