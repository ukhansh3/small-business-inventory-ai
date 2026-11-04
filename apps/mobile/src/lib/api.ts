import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { z } from "zod";
import { useAuth } from "../auth/provider";
import { apiBase, backendConfigured, supabase } from "./supabase";
export class MobileApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  if (!backendConfigured || !supabase)
    throw new MobileApiError(
      "NOT_CONFIGURED",
      "서버 연결 설정이 필요합니다.",
      503,
    );
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session)
    throw new MobileApiError("UNAUTHENTICATED", "로그인이 필요합니다.", 401);
  const multipart = options.body instanceof FormData;
  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    response = await fetch(apiBase + "/api/v1" + path, {
      method: options.method ?? "GET",
      headers: {
        Authorization: "Bearer " + data.session.access_token,
        ...(options.body === undefined || multipart
          ? {}
          : { "Content-Type": "application/json" }),
      },
      body:
        options.body === undefined
          ? undefined
          : multipart
            ? (options.body as FormData)
            : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch {
    throw new MobileApiError(
      "NETWORK_ERROR",
      "서버에 연결하지 못했습니다. 네트워크를 확인해 주세요.",
      503,
    );
  } finally {
    clearTimeout(timeout);
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new MobileApiError(
      "INVALID_RESPONSE",
      "서버 응답을 확인할 수 없습니다.",
      503,
    );
  }
  if (!response.ok) {
    const parsed = z
      .object({ error: z.object({ code: z.string(), message: z.string() }) })
      .safeParse(body);
    throw new MobileApiError(
      parsed.success ? parsed.data.error.code : "SERVER_ERROR",
      parsed.success
        ? parsed.data.error.message
        : "서버 요청을 처리하지 못했습니다.",
      response.status,
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    throw new MobileApiError(
      "CONTRACT_MISMATCH",
      "앱과 서버의 데이터 버전이 다릅니다.",
      503,
    );
  return parsed.data;
}
export function useApiResource<T>(path: string | null, schema: z.ZodType<T>) {
  const { session } = useAuth();
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const key =
    path && session ? `${path}:${session.access_token}:${tick}` : null;
  const scopeKey = path && session
    ? `${path.split("?", 1)[0]}:${session.access_token}`
    : null;
  const [result, setResult] = useState<{
    key: string;
    scopeKey: string;
    data: T | null;
    error: string | null;
  } | null>(null);
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  useEffect(() => {
    if (!key || !path) return;
    let cancelled = false;
    void apiRequest(path, schema)
      .then((data) => {
        if (!cancelled && scopeKey) setResult({ key, scopeKey, data, error: null });
      })
      .catch((error) => {
        if (!cancelled)
          setResult({
            key,
            scopeKey: scopeKey ?? "",
            data: null,
            error:
              error instanceof Error
                ? error.message
                : "자료를 불러오지 못했습니다.",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [key, path, schema, scopeKey]);
  return {
    // Keep same-route data on screen while a debounced filter refreshes. It
    // avoids flashing an empty list and repeatedly reloading the map WebView.
    data: key && result?.scopeKey === scopeKey ? result.data : null,
    error: result?.key === key ? result.error : null,
    loading: !!key && result?.key !== key,
    refresh,
  };
}
