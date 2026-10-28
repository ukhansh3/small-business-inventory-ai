import { describe, expect, it } from "vitest";
import { createSessionStorage, KeyStore } from "../src/lib/session-storage";
function memory() {
  const data = new Map<string, string>();
  const store: KeyStore = {
    getItemAsync: async (k) => data.get(k) ?? null,
    setItemAsync: async (k, v) => {
      if (new TextEncoder().encode(v).length > 2048)
        throw new Error("native size limit");
      data.set(k, v);
    },
    deleteItemAsync: async (k) => {
      data.delete(k);
    },
  };
  return { store, data };
}
describe("암호화 저장소 세션 조각 어댑터", () => {
  it("긴 세션과 한글·이모지를 제한 크기 안에서 보존한다", async () => {
    const { store } = memory();
    const storage = createSessionStorage(store);
    const value = JSON.stringify({
      token: "a".repeat(9000),
      name: "사장😀".repeat(700),
    });
    await storage.setItem("session", value);
    expect(await storage.getItem("session")).toBe(value);
  });
  it("조각 하나가 없으면 불완전한 세션을 반환하지 않는다", async () => {
    const { store, data } = memory();
    const storage = createSessionStorage(store);
    await storage.setItem("session", "x".repeat(3000));
    const key = [...data.keys()].find((k) => k.endsWith(".1"))!;
    data.delete(key);
    expect(await storage.getItem("session")).toBeNull();
  });
  it("새 기록 실패 시 기존 정상 세션을 보존한다", async () => {
    const { store } = memory();
    const storage = createSessionStorage(store);
    await storage.setItem("session", "old");
    const original = store.setItemAsync;
    store.setItemAsync = async (k, v) => {
      if (v === "fail") throw new Error("disk full");
      return original(k, v);
    };
    await expect(storage.setItem("session", "fail")).rejects.toThrow();
    expect(await storage.getItem("session")).toBe("old");
  });
  it("동시 갱신을 순서대로 처리하고 로그아웃 때 조각을 지운다", async () => {
    const { store, data } = memory();
    const storage = createSessionStorage(store);
    await Promise.all([
      storage.setItem("session", "first"),
      storage.setItem("session", "second"),
    ]);
    expect(await storage.getItem("session")).toBe("second");
    await storage.removeItem("session");
    expect(data.size).toBe(0);
  });
  it("손상된 manifest를 신뢰하지 않는다", async () => {
    const { store, data } = memory();
    data.set("session", '{"version":"../bad","count":999999}');
    expect(await createSessionStorage(store).getItem("session")).toBeNull();
  });
});
