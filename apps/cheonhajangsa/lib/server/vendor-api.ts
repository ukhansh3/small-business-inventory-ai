import { env } from "node:process";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export type UserContext = { db: SupabaseClient; userId: string };
export function publicDb(token: string) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL,
    key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new ApiError(
      503,
      "SERVER_NOT_CONFIGURED",
      "서버 Supabase 공개 설정이 필요합니다.",
    );
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
export function serviceDb() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL,
    key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new ApiError(
      503,
      "SERVER_NOT_CONFIGURED",
      "서버 전용 키 설정이 필요합니다.",
    );
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
export async function authenticate(request: Request): Promise<UserContext> {
  const match = /^Bearer ([^\s]{1,8192})$/i.exec(
    request.headers.get("authorization") ?? "",
  );
  if (!match)
    throw new ApiError(401, "UNAUTHENTICATED", "로그인이 필요합니다.");
  const db = publicDb(match[1]);
  let result;
  try {
    result = await db.auth.getUser(match[1]);
  } catch {
    throw new ApiError(
      503,
      "AUTH_UNAVAILABLE",
      "로그인 확인에 연결하지 못했습니다.",
    );
  }
  if (result.error || !result.data.user)
    throw new ApiError(
      401,
      "UNAUTHENTICATED",
      "로그인이 만료되었습니다. 다시 로그인해 주세요.",
    );
  return { db, userId: result.data.user.id };
}
const dbMessages: Record<string, [number, string]> = {
  FORBIDDEN: [403, "이 작업을 수행할 권한이 없습니다."],
  UNAUTHENTICATED: [401, "로그인이 필요합니다."],
  NOT_FOUND: [404, "자료를 찾을 수 없습니다."],
  STALE_DRAFT: [
    409,
    "다른 화면에서 변경됐습니다. 최신 내용을 다시 불러오세요.",
  ],
  REVISION_LOCKED: [
    409,
    "검토 중이거나 승인된 내용은 직접 수정할 수 없습니다.",
  ],
  SELF_REVIEW_FORBIDDEN: [
    403,
    "자신이 관리하는 업체는 직접 승인할 수 없습니다.",
  ],
  INCOMPLETE_VENDOR: [422, "업체 필수 정보와 주소 확인이 필요합니다."],
  INCOMPLETE_IMAGES: [422, "등록된 사진의 원본을 확인해야 합니다."],
  ITEM_REQUIRED: [422, "판매 품목과 가격을 최소 1개 등록해 주세요."],
  INCOMPLETE_ITEM: [
    422,
    "판매 품목의 규격·가격·세금·최소 주문·확인일·배송비 기준을 확인해 주세요.",
  ],
  REASON_REQUIRED: [422, "처리 사유를 입력해 주세요."],
  INVALID_INPUT: [422, "입력값을 확인해 주세요."],
  INVALID_ITEM: [422, "해당 업체의 품목만 연결할 수 있습니다."],
  ALREADY_EXISTS: [
    409,
    "이미 처리한 요청입니다. 내 업체 화면을 새로 불러오세요.",
  ],
  IMAGE_LIMIT: [422, "사진은 제출본당 최대 10개입니다."],
};
export function databaseError(error: {
  code?: string;
  message?: string;
}): ApiError {
  const rule = error.message ? dbMessages[error.message] : undefined;
  if (rule) return new ApiError(rule[0], error.message!, rule[1]);
  if (
    error.code === "42P01" ||
    error.code === "PGRST202" ||
    error.code === "PGRST205"
  )
    return new ApiError(
      503,
      "DATABASE_NOT_READY",
      "업체 등록 DB 마이그레이션을 먼저 적용해야 합니다.",
    );
  if (error.code?.startsWith("23") || error.code?.startsWith("22"))
    return new ApiError(
      422,
      "INVALID_INPUT",
      "저장할 정보의 형식과 연결 관계를 확인해 주세요.",
    );
  return new ApiError(
    503,
    "DATABASE_UNAVAILABLE",
    "DB 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  );
}
export async function rpc(
  db: SupabaseClient,
  name: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  let result;
  try {
    result = await db.rpc(name, args);
  } catch {
    throw new ApiError(
      503,
      "DATABASE_UNAVAILABLE",
      "DB에 연결하지 못했습니다.",
    );
  }
  if (result.error) throw databaseError(result.error);
  return result.data;
}
export const noStore = {
  "Cache-Control": "private, no-store",
  Vary: "Authorization",
};
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: noStore });
}
export async function bodyBytes(request: Request, max = 131072) {
  if (Number(request.headers.get("content-length") ?? 0) > max)
    throw new ApiError(413, "BODY_TOO_LARGE", "요청 크기가 너무 큽니다.");
  const reader = request.body?.getReader();
  if (!reader)
    throw new ApiError(400, "INVALID_JSON", "요청 본문이 필요합니다.");
  const parts: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > max) {
      await reader.cancel();
      throw new ApiError(413, "BODY_TOO_LARGE", "요청 크기가 너무 큽니다.");
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}
export async function readJson(request: Request): Promise<unknown> {
  const bytes = await bodyBytes(request);
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ApiError(400, "INVALID_JSON", "JSON 형식이 올바르지 않습니다.");
  }
}
export async function endpoint(
  request: Request,
  handle: (context: UserContext) => Promise<Response>,
) {
  const requestId = crypto.randomUUID();
  try {
    return await handle(await authenticate(request));
  } catch (error) {
    if (error instanceof z.ZodError)
      return json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "입력값을 확인해 주세요.",
            fieldErrors: error.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message,
            })),
            requestId,
          },
        },
        422,
      );
    if (error instanceof ApiError)
      return json(
        { error: { code: error.code, message: error.message, requestId } },
        error.status,
      );
    return json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "요청을 처리하지 못했습니다.",
          requestId,
        },
      },
      500,
    );
  }
}
export async function routeId(context: { params: Promise<{ id: string }> }) {
  return z
    .string()
    .uuid()
    .parse((await context.params).id);
}
export function parseDatabase<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success)
    throw new ApiError(
      503,
      "DATABASE_CONTRACT_MISMATCH",
      "DB 응답 형식과 앱 계약을 확인해야 합니다.",
    );
  return parsed.data;
}
