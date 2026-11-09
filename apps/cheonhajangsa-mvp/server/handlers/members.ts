import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { z } from "zod";
import { json } from "../http";
import { storesDeps } from "../deps";
import { handleStores } from "./stores";

const categories = ["구매처 질문", "가격 제보", "거래 경험"] as const;
const postInput = z
  .object({
    category: z.enum(categories),
    title: z.string().trim().min(1).max(100),
    body: z.string().trim().min(1).max(5000),
  })
  .strict();
const emailConfirmationUrl = "https://cheonhajangsa-mvp.vercel.app/";
const credentials = z
  .object({
    email: z.email(),
    password: z.string().min(8).max(128),
    nickname: z.string().trim().min(1).max(30).optional(),
  })
  .strict();
class MemberError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
const error = (status: number, code: string, message: string) =>
  json(status, { error: { code, message } });
function checked<T>(result: { data: T; error: unknown }): T {
  if (result.error)
    throw new MemberError(
      503,
      "STORAGE_UNAVAILABLE",
      "자료를 저장하거나 불러올 수 없어요. 연결과 DB 설정을 확인해 주세요.",
    );
  return result.data;
}
function dbClient() {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new MemberError(503, "NOT_CONFIGURED", "회원 서버 설정이 필요해요.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function requireMember(
  req: Request,
  db: SupabaseClient,
): Promise<User> {
  const match = /^Bearer\s+(\S+)$/i.exec(
    req.headers.get("authorization") ?? "",
  );
  if (!match)
    throw new MemberError(401, "UNAUTHENTICATED", "로그인이 필요해요.");
  const result = await db.auth.getUser(match[1]);
  if (result.error || !result.data.user)
    throw new MemberError(
      401,
      "UNAUTHENTICATED",
      "로그인이 만료됐어요. 다시 로그인해 주세요.",
    );
  return result.data.user;
}
function nickname(user: User) {
  return String(user.user_metadata?.nickname ?? "사장님").slice(0, 30);
}
async function body(req: Request) {
  try {
    return await req.json();
  } catch {
    throw new MemberError(422, "INVALID_INPUT", "입력 내용을 확인해 주세요.");
  }
}
async function findPost(db: SupabaseClient, id: string) {
  const row = checked(
    await db
      .from("chj_community_posts")
      .select("*")
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle(),
  );
  if (!row) throw new MemberError(404, "NOT_FOUND", "게시글을 찾을 수 없어요.");
  return row;
}
async function presentPosts(
  db: SupabaseClient,
  rows: Record<string, unknown>[],
  user: User,
) {
  const ids = rows.map((r) => r.id);
  if (!ids.length) return [];
  const reactions =
    checked(
      await db
        .from("chj_community_reactions")
        .select("post_id,user_id,kind")
        .in("post_id", ids),
    ) ?? [];
  const comments =
    checked(
      await db
        .from("chj_community_comments")
        .select("post_id")
        .in("post_id", ids)
        .eq("status", "published"),
    ) ?? [];
  return rows.map(({ user_id, ...row }) => ({
    ...row,
    is_mine: user_id === user.id,
    like_count: reactions.filter(
      (x) => x.post_id === row.id && x.kind === "like",
    ).length,
    comment_count: comments.filter((x) => x.post_id === row.id).length,
    liked: reactions.some(
      (x) => x.post_id === row.id && x.user_id === user.id && x.kind === "like",
    ),
    bookmarked: reactions.some(
      (x) =>
        x.post_id === row.id && x.user_id === user.id && x.kind === "bookmark",
    ),
  }));
}
// 회원 API는 민혁의 익명 기기 기반 지도 API와 독립적으로 JWT를 검증한다.
export async function handleMembers(
  req: Request,
  injectedDb?: SupabaseClient,
): Promise<Response> {
  try {
    const url = new URL(req.url),
      path = url.pathname.replace("/api/v1", ""),
      method = req.method,
      db = injectedDb ?? dbClient();
    if (path === "/auth/session" && method === "POST") {
      const input = credentials.parse(await body(req));
      const result = await db.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
      if (result.error || !result.data.session)
        return error(
          401,
          "LOGIN_FAILED",
          "이메일·비밀번호 또는 이메일 인증 상태를 확인해 주세요.",
        );
      return json(200, { session: result.data.session });
    }
    if (path === "/auth/signup" && method === "POST") {
      const input = credentials.parse(await body(req));
      if (!input.nickname)
        throw new MemberError(422, "INVALID_INPUT", "닉네임을 입력해 주세요.");
      const result = await db.auth.signUp({
        email: input.email,
        password: input.password,
        options: { data: { nickname: input.nickname }, emailRedirectTo: emailConfirmationUrl },
      });
      if (result.error)
        return error(
          400,
          "SIGNUP_FAILED",
          "가입 정보를 확인하거나 잠시 뒤 다시 시도해 주세요.",
        );
      return json(200, {
        session: result.data.session,
        message: result.data.session
          ? "가입했어요."
          : "인증 메일을 확인한 뒤 로그인해 주세요.",
      });
    }
    if (path === "/auth/resend" && method === "POST") {
      const { email } = z.object({ email: z.email() }).strict().parse(await body(req));
      const result = await db.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: emailConfirmationUrl },
      });
      if (result.error)
        return error(400, "RESEND_FAILED", "인증 메일을 보내지 못했어요. 잠시 뒤 다시 시도해 주세요.");
      return json(200, { message: "가입 확인이 필요한 계정이라면 인증 메일이 도착해요." });
    }
    if (path === "/auth/refresh" && method === "POST") {
      const input = z
        .object({ refresh_token: z.string().min(1).max(2048) })
        .strict()
        .parse(await body(req));
      const result = await db.auth.refreshSession(input);
      if (result.error || !result.data.session)
        return error(401, "UNAUTHENTICATED", "다시 로그인해 주세요.");
      return json(200, { session: result.data.session });
    }
    const reviewRoute = /^\/me\/vendor-reviews\/([^/]+)$/.exec(path);
    if (reviewRoute && method === "GET") {
      const vendorId = z.string().min(1).max(160).parse(decodeURIComponent(reviewRoute[1]!));
      const rows = checked(await db.from("chj_vendor_reviews")
        .select("id,rating,body,created_at,user_id").eq("vendor_id", vendorId)
        .order("created_at", { ascending: false }).order("id"));
      return json(200, { reviews: (rows ?? []).map(({ user_id, ...row }) => ({ ...row, example: user_id === null })) });
    }
    if (path === "/me/conversations/availability" && method === "GET") {
      const vendorId = z.string().min(1).max(160).parse(url.searchParams.get("vendor_id"));
      const owner = checked(await db.from("chj_vendor_owners").select("vendor_id").eq("vendor_id", vendorId).maybeSingle());
      return json(200, { available: !!owner });
    }
    const user = await requireMember(req, db);
    if (path === "/me/conversations" && method === "GET") {
      const threads = checked(await db.from("chj_vendor_threads").select("id,vendor_id,vendor_name,owner_id,created_at")
        .or("customer_id.eq." + user.id + ",owner_id.eq." + user.id)
        .order("created_at", { ascending: false }));
      const summaries = await Promise.all((threads ?? []).map(async (thread) => {
        const [latest, unread] = await Promise.all([
          db.from("chj_vendor_messages").select("body,created_at").eq("thread_id", thread.id)
            .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(1).maybeSingle(),
          db.from("chj_vendor_messages").select("id", { count: "exact", head: true })
            .eq("thread_id", thread.id).neq("sender_id", user.id).is("read_at", null),
        ]);
        const last = checked(latest);
        checked(unread);
        return {
          id: thread.id, vendor_id: thread.vendor_id, vendor_name: thread.vendor_name,
          last_message: last?.body ?? null, unread_count: unread.count ?? 0,
          updated_at: last?.created_at ?? thread.created_at,
        };
      }));
      summaries.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
      return json(200, { threads: summaries });
    }
    if (path === "/me/conversations" && method === "POST") {
      const { vendor_id } = z.object({ vendor_id: z.string().min(1).max(160) }).strict().parse(await body(req));
      const owner = checked(await db.from("chj_vendor_owners").select("user_id").eq("vendor_id", vendor_id).maybeSingle());
      if (!owner) return error(404, "NOT_FOUND", "아직 문의를 받을 사장님 계정이 연결되지 않았어요.");
      if (owner.user_id === user.id) return error(422, "INVALID_INPUT", "내 업체에 문의할 수 없어요.");

      const response = await handleStores(new Request(url.origin + "/api/v1/stores", {
        headers: { "x-device-id": req.headers.get("x-device-id") ?? "" },
      }), storesDeps());
      if (!response.ok) return response;
      const { stores } = await response.json() as { stores: { store_id: string; name: string }[] };
      const store = stores.find((entry) => entry.store_id === vendor_id);
      if (!store) return error(404, "NOT_FOUND", "업체를 찾을 수 없어요.");
      const thread = checked(await db.from("chj_vendor_threads")
        .upsert({ vendor_id, vendor_name: store.name, customer_id: user.id, owner_id: owner.user_id },
          { onConflict: "vendor_id,customer_id,owner_id" }).select("id").single());
      return json(200, thread);
    }
    const messageRoute = /^\/me\/conversations\/([0-9a-f-]{36})\/messages$/.exec(path);
    if (messageRoute && (method === "GET" || method === "POST" || method === "PATCH")) {
      const threadId = z.uuid().parse(messageRoute[1]);
      const thread = checked(await db.from("chj_vendor_threads").select("vendor_name")
        .eq("id", threadId).or("customer_id.eq." + user.id + ",owner_id.eq." + user.id).maybeSingle());
      if (!thread) return error(404, "NOT_FOUND", "대화를 찾을 수 없어요.");
      if (method === "POST") {
        const input = z.object({ body: z.string().trim().min(1).max(2000) }).strict().parse(await body(req));
        checked(await db.from("chj_vendor_messages").insert({ thread_id: threadId, sender_id: user.id, ...input }));
        return new Response(null, { status: 204 });
      }
      if (method === "PATCH") {
        const { ids } = z.object({ ids: z.array(z.uuid()).min(1).max(100) }).strict().parse(await body(req));
        checked(await db.from("chj_vendor_messages").update({ read_at: new Date().toISOString() })
          .eq("thread_id", threadId).in("id", ids).neq("sender_id", user.id).is("read_at", null));
        return new Response(null, { status: 204 });
      }
      const rows = checked(await db.from("chj_vendor_messages").select("id,sender_id,body,created_at,read_at")
        .eq("thread_id", threadId).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(100));
      return json(200, { vendor_name: thread.vendor_name, messages: (rows ?? []).reverse().map((row) => ({
        id: row.id, body: row.body, mine: row.sender_id === user.id, unread: row.read_at === null,
      })) });
    }
    if (reviewRoute && method === "PUT") {
      const vendorId = z.string().min(1).max(160).parse(decodeURIComponent(reviewRoute[1]!));
      const input = z.object({ rating: z.number().int().min(1).max(5), body: z.string().trim().min(1).max(500) }).strict().parse(await body(req));

      const stores = await handleStores(new Request(url.origin + "/api/v1/stores", {
        headers: { "x-device-id": req.headers.get("x-device-id") ?? "" },
      }), storesDeps());
      if (!stores.ok) return stores;
      const data = (await stores.json()) as { stores: { store_id: string }[] };
      if (!data.stores.some((store) => store.store_id === vendorId))
        return error(404, "NOT_FOUND", "현재 공개된 업체를 찾을 수 없어요.");
      checked(await db.from("chj_vendor_reviews")
        .upsert({ vendor_id: vendorId, user_id: user.id, ...input }, { onConflict: "vendor_id,user_id" }));
      return new Response(null, { status: 204 });
    }
    if (path === "/auth/logout" && method === "POST") {
      const token = req.headers
        .get("authorization")!
        .replace(/^Bearer\s+/i, "");
      const result = await db.auth.admin.signOut(token, "local");
      if (result.error)
        return error(503, "LOGOUT_FAILED", "서버에서 로그아웃하지 못했어요.");
      return new Response(null, { status: 204 });
    }
    if (path === "/me/profile" && method === "GET")
      return json(200, {
        id: user.id,
        email: user.email ?? "",
        nickname: nickname(user),
        email_confirmed: !!user.email_confirmed_at,
      });
    if (path === "/me/profile" && method === "PATCH") {
      const input = z
        .object({ nickname: z.string().trim().min(1).max(30) })
        .strict()
        .parse(await body(req));
      const result = await db.auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, nickname: input.nickname },
      });
      if (result.error)
        return error(503, "UPDATE_FAILED", "닉네임을 수정하지 못했어요.");
      return json(200, { nickname: input.nickname });
    }
    if (path === "/community/posts" && method === "GET") {
      const offset = z.coerce
        .number()
        .int()
        .min(0)
        .max(100000)
        .parse(url.searchParams.get("offset") ?? 0);
      let query = db
        .from("chj_community_posts")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + 19);
      const category = url.searchParams.get("category");
      if (category)
        query = query.eq("category", z.enum(categories).parse(category));
      if (url.searchParams.get("saved") === "true") {
        const marks =
          checked(
            await db
              .from("chj_community_reactions")
              .select("post_id")
              .eq("user_id", user.id)
              .eq("kind", "bookmark"),
          ) ?? [];
        if (!marks.length) return json(200, { posts: [], offset, limit: 20 });
        query = query.in(
          "id",
          marks.map((x) => x.post_id),
        );
      }
      return json(200, {
        posts: await presentPosts(db, checked(await query) ?? [], user),
        offset,
        limit: 20,
      });
    }
    if (path === "/community/posts" && method === "POST") {
      const input = postInput.parse(await body(req));
      const post = checked(
        await db
          .from("chj_community_posts")
          .insert({ ...input, user_id: user.id, nickname: nickname(user) })
          .select()
          .single(),
      );
      return json(201, (await presentPosts(db, [post], user))[0]);
    }
    const postRoute =
      /^\/community\/posts\/([^/]+)(?:\/(comments|likes|bookmark))?$/.exec(
        path,
      );
    if (postRoute) {
      const id = z.uuid().parse(postRoute[1]),
        action = postRoute[2],
        post = await findPost(db, id);
      if (!action && method === "GET")
        return json(200, (await presentPosts(db, [post], user))[0]);
      if (!action && (method === "PATCH" || method === "DELETE")) {
        if (post.user_id !== user.id)
          return error(403, "FORBIDDEN", "본인 게시글만 수정할 수 있어요.");
        const update =
          method === "DELETE"
            ? { status: "deleted", updated_at: new Date().toISOString() }
            : {
                ...postInput.parse(await body(req)),
                updated_at: new Date().toISOString(),
              };
        checked(
          await db
            .from("chj_community_posts")
            .update(update)
            .eq("id", id)
            .eq("user_id", user.id),
        );
        return new Response(null, { status: 204 });
      }
      if (action === "comments" && method === "GET") {
        const rows =
          checked(
            await db
              .from("chj_community_comments")
              .select("id,user_id,nickname,body,created_at")
              .eq("post_id", id)
              .eq("status", "published")
              .order("created_at")
              .limit(100),
          ) ?? [];
        return json(200, {
          comments: rows.map(({ user_id, ...row }) => ({
            ...row,
            is_mine: user_id === user.id,
          })),
        });
      }
      if (action === "comments" && method === "POST") {
        const input = z
          .object({ body: z.string().trim().min(1).max(1000) })
          .strict()
          .parse(await body(req));
        const row = checked(
          await db
            .from("chj_community_comments")
            .insert({
              ...input,
              post_id: id,
              user_id: user.id,
              nickname: nickname(user),
            })
            .select("id,nickname,body,created_at")
            .single(),
        );
        return json(201, { ...row, is_mine: true });
      }
      if (
        (action === "likes" || action === "bookmark") &&
        (method === "PUT" || method === "DELETE")
      ) {
        const key = {
          user_id: user.id,
          post_id: id,
          kind: action === "likes" ? "like" : "bookmark",
        };
        if (method === "PUT")
          checked(
            await db
              .from("chj_community_reactions")
              .upsert(key, { onConflict: "user_id,post_id,kind" }),
          );
        else
          checked(await db.from("chj_community_reactions").delete().match(key));
        return new Response(null, { status: 204 });
      }
    }
    const commentRoute = /^\/community\/comments\/([^/]+)$/.exec(path);
    if (commentRoute && method === "DELETE") {
      const id = z.uuid().parse(commentRoute[1]);
      const row = checked(
        await db
          .from("chj_community_comments")
          .select("user_id")
          .eq("id", id)
          .maybeSingle(),
      );
      if (!row) return error(404, "NOT_FOUND", "댓글을 찾을 수 없어요.");
      if (row.user_id !== user.id)
        return error(403, "FORBIDDEN", "본인 댓글만 삭제할 수 있어요.");
      checked(
        await db
          .from("chj_community_comments")
          .update({ status: "deleted" })
          .eq("id", id)
          .eq("user_id", user.id),
      );
      return new Response(null, { status: 204 });
    }
    if (path === "/community/reports" && method === "POST") {
      const input = z
        .object({
          post_id: z.uuid(),
          reason: z.string().trim().min(1).max(1000),
        })
        .strict()
        .parse(await body(req));
      await findPost(db, input.post_id);
      checked(
        await db
          .from("chj_community_reports")
          .upsert(
            { ...input, user_id: user.id },
            { onConflict: "user_id,post_id", ignoreDuplicates: true },
          ),
      );
      return json(201, { message: "신고를 접수했어요. 운영자가 검토합니다." });
    }
    if (path === "/me/saved-vendors" && method === "GET") {
      const rows =
        checked(
          await db
            .from("chj_saved_vendors")
            .select("vendor_id,created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
        ) ?? [];
      // 같은 지도 핸들러에서 원천 업체를 조회한다. 임의 가격/좌표를 생성하지 않는다.

      const storeRes = await handleStores(
        new Request(`${url.origin}/api/v1/stores${url.search}`, {
          headers: { "x-device-id": req.headers.get("x-device-id") ?? "" },
        }),
        storesDeps(),
      );
      if (!storeRes.ok) return storeRes;
      const data = (await storeRes.json()) as {
        stores: { store_id: string }[];
      };
      return json(200, {
        vendors: rows.map((row) => ({
          vendor_id: row.vendor_id,
          saved_at: row.created_at,
          store:
            data.stores.find((store) => store.store_id === row.vendor_id) ??
            null,
        })),
      });
    }
    const activityRoute = /^\/me\/(saved-vendors|used-vendors)\/([^/]+)$/.exec(path);
    if (activityRoute && ["GET", "PUT", "DELETE"].includes(method)) {
      const id = z.string().min(1).max(160).parse(decodeURIComponent(activityRoute[2]!));
      const key = { user_id: user.id, vendor_id: id };
      const locationId = url.searchParams.get("location_id");
      if (locationId && !/^[a-zA-Z0-9_-]{1,160}$/.test(locationId))
        return error(422, "INVALID_INPUT", "위치를 확인해 주세요.");
      if (method === "GET") {
        if (!locationId) return error(422, "INVALID_INPUT", "위치를 선택해 주세요.");
        const [counts, saved, used] = await Promise.all([
          db.rpc("chj_store_activity_counts", { p_location_id: locationId }).eq("vendor_id", id).maybeSingle(),
          db.from("chj_saved_vendors").select("vendor_id").match(key).maybeSingle(),
          db.from("chj_used_vendors").select("vendor_id").match(key).maybeSingle(),
        ]);
        const activity = checked(counts) as { saved_count: number; used_count: number } | null;
        return json(200, {
          saved_count: activity?.saved_count ?? 0,
          used_count: activity?.used_count ?? 0,
          saved: !!checked(saved),
          used: !!checked(used),
        });
      }
      if (activityRoute[1] === "used-vendors" && (method !== "PUT" || !locationId))
        return error(422, "INVALID_INPUT", "사용 기록을 남길 위치를 선택해 주세요.");
      if (method === "DELETE") {
        checked(await db.from("chj_saved_vendors").delete().match(key));
        return new Response(null, { status: 204 });
      }

      const res = await handleStores(
        new Request(url.origin + "/api/v1/stores" + url.search, {
          headers: { "x-device-id": req.headers.get("x-device-id") ?? "" },
        }),
        storesDeps(),
      );
      if (!res.ok) return res;
      const data = (await res.json()) as { stores: { store_id: string }[] };
      if (!data.stores.some((store) => store.store_id === id))
        return error(404, "NOT_FOUND", "현재 공개된 업체를 찾을 수 없어요.");
      if (locationId && !storesDeps().data.locations.some((location) => location.id === locationId))
        return error(422, "INVALID_INPUT", "위치를 확인해 주세요.");
      const table = activityRoute[1] === "used-vendors" ? "chj_used_vendors" : "chj_saved_vendors";
      checked(await db.from(table).upsert(
        { ...key, ...(locationId ? { location_id: locationId } : {}) },
        { onConflict: "user_id,vendor_id", ignoreDuplicates: !locationId },
      ));
      return new Response(null, { status: 204 });
    }
    return error(404, "NOT_FOUND", "없는 주소예요.");
  } catch (e) {
    if (e instanceof z.ZodError)
      return error(422, "INVALID_INPUT", "입력 내용을 확인해 주세요.");
    if (e instanceof MemberError) return error(e.status, e.code, e.message);
    return error(503, "SERVICE_UNAVAILABLE", "서버 연결을 확인해 주세요.");
  }
}
