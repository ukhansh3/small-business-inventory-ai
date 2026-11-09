import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type PropsWithChildren,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { getDeviceId, isTestDevice } from "./device";
import { memberStorage } from "./member-storage";

export type Profile = {
  id: string;
  email: string;
  nickname: string;
  email_confirmed: boolean;
};
export type Post = {
  id: string;
  category: string;
  title: string;
  body: string;
  nickname: string;
  created_at: string;
  is_mine: boolean;
  like_count: number;
  comment_count: number;
  liked: boolean;
  bookmarked: boolean;
};
export type Comment = {
  id: string;
  nickname: string;
  body: string;
  created_at: string;
  is_mine: boolean;
};
const BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (__DEV__ ? "http://localhost:8787" : "");
export class MemberApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  token?: string,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`${BASE}/api/v1${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        "x-device-id": getDeviceId(),
        ...(isTestDevice() ? { "x-test-device": "true" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    if (res.status === 204) return undefined as T;
    const data = await res.json();
    if (!res.ok)
      throw new MemberApiError(
        res.status,
        data.error?.message ?? "요청을 처리하지 못했어요.",
      );
    return data;
  } catch (e) {
    if (e instanceof MemberApiError) throw e;
    throw new Error("서버에 연결하지 못했어요. 네트워크를 확인해 주세요.");
  } finally {
    clearTimeout(timer);
  }
}
type ContextValue = {
  profile: Profile | null;
  initializing: boolean;
  login: (
    email: string,
    password: string,
    nickname?: string,
  ) => Promise<string>;
  resendConfirmation: (email: string) => Promise<string>;
  logout: () => Promise<void>;
  api: <T>(path: string, method?: string, body?: unknown) => Promise<T>;
  refreshProfile: () => Promise<void>;
};
const Context = createContext<ContextValue | null>(null);
export function MemberProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null),
    [profile, setProfile] = useState<Profile | null>(null),
    [initializing, setInitializing] = useState(true);
  const refreshRef = useRef<Promise<Session> | null>(null);
  async function store(next: Session | null) {
    if (next) await memberStorage.write(JSON.stringify(next));
    else await memberStorage.clear();
    setSession(next);
    if (!next) setProfile(null);
  }
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const saved = await memberStorage.read();
        if (!saved) return;
        const old = JSON.parse(saved) as Session;
        const next = await request<{ session: Session }>(
          "/auth/refresh",
          "POST",
          { refresh_token: old.refresh_token },
        );
        const me = await request<Profile>(
          "/me/profile",
          "GET",
          undefined,
          next.session.access_token,
        );
        if (active) {
          await store(next.session);
          setProfile(me);
        }
      } catch {
        if (active) {
          await memberStorage.clear().catch(() => {});
          setSession(null);
          setProfile(null);
        }
      } finally {
        if (active) setInitializing(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  async function validSession() {
    if (!session) throw new MemberApiError(401, "로그인이 필요해요.");
    if ((session.expires_at ?? 0) > Date.now() / 1000 + 60) return session;
    if (!refreshRef.current)
      refreshRef.current = (async () => {
        const result = await request<{ session: Session }>(
          "/auth/refresh",
          "POST",
          { refresh_token: session.refresh_token },
        );
        await store(result.session);
        return result.session;
      })().finally(() => {
        refreshRef.current = null;
      });
    return refreshRef.current;
  }
  async function api<T>(path: string, method = "GET", body?: unknown) {
    try {
      const valid = await validSession();
      return await request<T>(path, method, body, valid.access_token);
    } catch (e) {
      if (e instanceof MemberApiError && e.status === 401) await store(null);
      throw e;
    }
  }
  async function refreshProfile() {
    const me = await api<Profile>("/me/profile");
    setProfile(me);
  }
  async function login(email: string, password: string, nickname?: string) {
    const result = await request<{ session: Session | null; message?: string }>(
      nickname ? "/auth/signup" : "/auth/session",
      "POST",
      { email, password, ...(nickname ? { nickname } : {}) },
    );
    if (result.session) {
      await store(result.session);
      setProfile(
        await request<Profile>(
          "/me/profile",
          "GET",
          undefined,
          result.session.access_token,
        ),
      );
    }
    return result.message ?? "로그인했어요.";
  }
  async function resendConfirmation(email: string) {
    const result = await request<{ message: string }>("/auth/resend", "POST", { email });
    return result.message;
  }
  async function logout() {
    try {
      await api("/auth/logout", "POST");
    } finally {
      await store(null);
    }
  }
  return (
    <Context
      value={{ profile, initializing, api, login, resendConfirmation, logout, refreshProfile }}
    >
      {children}
    </Context>
  );
}
export function useMember() {
  const value = useContext(Context);
  if (!value) throw new Error("MemberProvider가 필요합니다.");
  return value;
}
