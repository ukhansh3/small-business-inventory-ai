// Adapter is independent of native imports so crash recovery can be tested locally.
export type KeyStore = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};
export function createSessionStorage(store: KeyStore) {
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = queue.then(fn, fn);
    queue = next.catch(() => {});
    return next;
  };
  const manifest = (
    raw: string | null,
  ): { version: string; count: number } | null => {
    try {
      const v: unknown = JSON.parse(raw ?? "null");
      if (
        typeof v === "object" &&
        v !== null &&
        "version" in v &&
        "count" in v &&
        typeof v.version === "string" &&
        /^[a-z0-9-]+$/.test(v.version) &&
        typeof v.count === "number" &&
        Number.isInteger(v.count) &&
        v.count > 0 &&
        v.count <= 128
      )
        return { version: v.version, count: v.count };
    } catch {}
    return null;
  };
  const part = (key: string, v: string, i: number) => `${key}.${v}.${i}`;
  const clear = async (
    key: string,
    m: { version: string; count: number } | null,
  ) => {
    if (m)
      await Promise.all(
        Array.from({ length: m.count }, (_, i) =>
          store.deleteItemAsync(part(key, m.version, i)),
        ),
      );
  };
  return {
    getItem: (key: string) =>
      serial(async () => {
        const m = manifest(await store.getItemAsync(key));
        if (!m) return null;
        const chunks = await Promise.all(
          Array.from({ length: m.count }, (_, i) =>
            store.getItemAsync(part(key, m.version, i)),
          ),
        );
        return chunks.some((c) => c === null) ? null : chunks.join("");
      }),
    setItem: (key: string, value: string) =>
      serial(async () => {
        const old = manifest(await store.getItemAsync(key));
        const points = Array.from(value);
        const chunks = Array.from(
          { length: Math.max(1, Math.ceil(points.length / 500)) },
          (_, i) => points.slice(i * 500, (i + 1) * 500).join(""),
        );
        if (chunks.length > 128) throw new Error("로그인 세션이 너무 큽니다.");
        const version =
          Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
        const next = { version, count: chunks.length };
        try {
          for (let i = 0; i < chunks.length; i++)
            await store.setItemAsync(part(key, version, i), chunks[i]);
          await store.setItemAsync(key, JSON.stringify(next));
        } catch (error) {
          await clear(key, next).catch(() => {});
          throw error;
        }
        await clear(key, old).catch(() => {});
      }),
    removeItem: (key: string) =>
      serial(async () => {
        const old = manifest(await store.getItemAsync(key));
        await store.deleteItemAsync(key);
        await clear(key, old);
      }),
  };
}
