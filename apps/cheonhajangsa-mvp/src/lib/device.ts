// 기기 익명 id(API 명세 1.3). 웹은 localStorage에 둔다. 저장이 막힌 환경이면 이번 실행 동안만 쓴다.
const KEY = "chj_device_id";
let memory: string | null = null;

export function newUuid(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // randomUUID가 없는 환경(보안 연결이 아닌 http 등)용 v4 형식
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16);
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getDeviceId(): string {
  if (memory) return memory;
  try {
    const saved = globalThis.localStorage?.getItem(KEY);
    if (saved) return (memory = saved);
    memory = newUuid();
    globalThis.localStorage?.setItem(KEY, memory);
  } catch {
    memory = memory ?? newUuid();
  }
  return memory;
}
