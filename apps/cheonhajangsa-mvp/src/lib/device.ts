// 기기 익명 id(API 명세 1.3). 웹은 localStorage에 둔다. 저장이 막힌 환경이면 이번 실행 동안만 쓴다.
const KEY = "chj_device_id";
const TEST_KEY = "chj_test_device";
let memory: string | null = null;
let testMode: boolean | null = null;

export function newUuid(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // randomUUID가 없는 환경(보안 연결이 아닌 http 등)용 v4 형식
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16);
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// 팀원·리허설 기기 표시(API 명세 1.6). 링크에 ?test=1을 붙여 한 번 열면 켜지고 ?test=0이면 꺼진다.
// 서버는 기기를 처음 등록할 때만 is_test를 저장하므로, 켜고 끌 때마다 기기 번호를 새로 받는다.
export function testParamChange(search: string, wasTest: boolean): { test: boolean; rotate: boolean } {
  const v = new URLSearchParams(search).get("test");
  const test = v === "1" ? true : v === "0" ? false : wasTest;
  return { test, rotate: test !== wasTest };
}

function init(): void {
  if (testMode !== null) return;
  try {
    const store = globalThis.localStorage;
    const wasTest = store?.getItem(TEST_KEY) === "1";
    const search = globalThis.location?.search ?? "";
    const { test, rotate } = testParamChange(search, wasTest);
    testMode = test;
    if (rotate) {
      if (test) store?.setItem(TEST_KEY, "1");
      else store?.removeItem(TEST_KEY);
      store?.removeItem(KEY);
    }
  } catch {
    testMode = false;
  }
}

export function isTestDevice(): boolean {
  init();
  return testMode === true;
}

export function getDeviceId(): string {
  init();
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
