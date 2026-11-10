const KEY = "chj_member_session";
export const memberStorage = {
  async read() {
    return globalThis.localStorage?.getItem(KEY) ?? null;
  },
  async write(value: string) {
    globalThis.localStorage.setItem(KEY, value);
  },
  async clear() {
    globalThis.localStorage.removeItem(KEY);
  },
};
