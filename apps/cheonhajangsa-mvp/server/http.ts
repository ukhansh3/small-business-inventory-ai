import type { ServerEnv } from "./env";

// 공통 응답·오류 모양: docs/planning/API명세서.md 1.4

export type ErrorCode =
  | "INVALID_INPUT"
  | "ITEM_NOT_ACTIVE"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "SESSION_ENDED"
  | "RATE_LIMITED"
  | "AI_UNAVAILABLE"
  | "STORAGE_UNAVAILABLE"
  | "INTERNAL";

const STATUS: Record<ErrorCode, number> = {
  INVALID_INPUT: 400,
  ITEM_NOT_ACTIVE: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  SESSION_ENDED: 409,
  RATE_LIMITED: 429,
  AI_UNAVAILABLE: 503,
  STORAGE_UNAVAILABLE: 503,
  INTERNAL: 500,
};

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function errorResponse(code: ErrorCode, message: string, detail?: unknown): Response {
  return json(STATUS[code], { error: detail === undefined ? { code, message } : { code, message, detail } });
}

export class HttpError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public detail?: unknown,
  ) {
    super(message);
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}

// 기기 인증(API 명세 1.3): X-Device-Id 필수
export function requireDevice(req: Request): string {
  const id = req.headers.get("x-device-id");
  if (!isUuid(id)) throw new HttpError("UNAUTHORIZED", "앱을 다시 열어 주세요.");
  return id;
}

// X-Test-Device: true면 팀원·리허설 기기(API 명세 1.6). 운영에서도 허용(측정 지표에서만 뺀다)
export function isTestDevice(req: Request): boolean {
  return req.headers.get("x-test-device") === "true";
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError("INVALID_INPUT", "요청 형식이 올바르지 않아요.");
  }
}

// 디버그 헤더(API 명세 1.6): ALLOW_DEBUG_HEADERS=true일 때만 적용
export function requestNow(req: Request, env: ServerEnv, clock: () => Date = () => new Date()): Date {
  if (env.allowDebugHeaders) {
    const h = req.headers.get("x-debug-now");
    if (h) {
      const d = new Date(h);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return clock();
}

export function requestAiMode(req: Request, env: ServerEnv): "live" | "stored" {
  if (env.allowDebugHeaders && req.headers.get("x-ai-mode") === "stored") return "stored";
  return env.aiMode;
}

// 처리하지 못한 예외는 500. HttpError는 그 코드로.
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof HttpError) return errorResponse(e.code, e.message, e.detail);
    console.error(e);
    return errorResponse("INTERNAL", "잠시 문제가 있어요. 다시 시도해 주세요.");
  }
}
