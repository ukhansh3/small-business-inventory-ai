import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { handleMembers } from "../server/handlers/members";
const uid = "00000000-0000-4000-8000-000000000001",
  pid = "00000000-0000-4000-8000-000000000002";
function request(path: string, method = "GET", body?: unknown, auth = true) {
  return new Request("http://localhost/api/v1" + path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(auth ? { authorization: "Bearer test-token" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
function fake(row: unknown = null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of [
    "select",
    "eq",
    "in",
    "range",
    "order",
    "limit",
    "update",
    "insert",
    "upsert",
    "delete",
    "match",
  ])
    chain[method] = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => ({ data: row, error: null }));
  chain.single = vi.fn(async () => ({ data: row, error: null }));
  chain.then = vi.fn((resolve: (v: unknown) => unknown) =>
    resolve({ data: row ?? [], error: null }),
  );
  const from = vi.fn((_table?: string) => chain),
    getUser = vi.fn(async () => ({
      data: {
        user: {
          id: uid,
          email: "test@example.invalid",
          user_metadata: { nickname: "[가상테스트] 사장님" },
          email_confirmed_at: "2026-11-08",
        },
      },
      error: null,
    }));
  return {
    db: { auth: { getUser }, from } as unknown as SupabaseClient,
    from,
    getUser,
    chain,
  };
}
describe("회원 API 권한과 입력 계약", () => {
  it("가입과 인증 메일 재발송에 배포 주소를 사용한다", async () => {
    const email = "test@example.invalid";
    const password = "test-password";
    const signUp = vi.fn(async () => ({ data: { session: null }, error: null }));
    const resend = vi.fn(async () => ({ data: {}, error: null }));
    const db = { auth: { signUp, resend } } as unknown as SupabaseClient;
    const emailRedirectTo = "https://cheonhajangsa-mvp.vercel.app/";

    expect((await handleMembers(request("/auth/signup", "POST", { email, password, nickname: "테스트" }, false), db)).status).toBe(200);
    expect(signUp).toHaveBeenCalledWith({
      email, password, options: { data: { nickname: "테스트" }, emailRedirectTo },
    });
    expect((await handleMembers(request("/auth/resend", "POST", { email }, false), db)).status).toBe(200);
    expect(resend).toHaveBeenCalledWith({ type: "signup", email, options: { emailRedirectTo } });
  });

  it("기기 ID만으로 회원 정보를 조회하지 못한다", async () => {
    const f = fake();
    const res = await handleMembers(
      request("/me/profile", "GET", undefined, false),
      f.db,
    );
    expect(res.status).toBe(401);
    expect(f.from).not.toHaveBeenCalled();
  });
  it("변조 토큰은 DB에 접근하기 전에 거절한다", async () => {
    const f = fake();
    f.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "invalid" },
    } as never);
    const res = await handleMembers(request("/community/posts"), f.db);
    expect(res.status).toBe(401);
    expect(f.from).not.toHaveBeenCalled();
  });
  it("본인 프로필만 토큰에서 조회한다", async () => {
    const f = fake();
    const res = await handleMembers(request("/me/profile?user_id=other"), f.db);
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(uid);
  });
  it("다른 사람 글 삭제는 차단한다", async () => {
    const f = fake({ id: pid, user_id: "other", status: "published" });
    const res = await handleMembers(
      request("/community/posts/" + pid, "DELETE"),
      f.db,
    );
    expect(res.status).toBe(403);
    expect(f.chain.update).not.toHaveBeenCalled();
  });
  it("본인 글 삭제는 상태 전이만 한다", async () => {
    const f = fake({ id: pid, user_id: uid, status: "published" });
    const res = await handleMembers(
      request("/community/posts/" + pid, "DELETE"),
      f.db,
    );
    expect(res.status).toBe(204);
    expect(f.chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "deleted" }),
    );
    expect(f.chain.delete).not.toHaveBeenCalled();
    expect(f.chain.eq).toHaveBeenCalledWith("user_id", uid);
  });
  it("작성자 ID 위조 및 미지원 카테고리를 거절한다", async () => {
    const f = fake();
    const res = await handleMembers(
      request("/community/posts", "POST", {
        title: "[가상테스트]",
        body: "내용",
        category: "광고",
        user_id: "other",
      }),
      f.db,
    );
    expect(res.status).toBe(422);
    expect(f.from).not.toHaveBeenCalled();
  });
  it("음수 페이지 번호를 거절한다", async () => {
    const f = fake();
    expect(
      (await handleMembers(request("/community/posts?offset=-1"), f.db)).status,
    ).toBe(422);
  });
  it("다른 사람 댓글 삭제는 차단한다", async () => {
    const f = fake({ user_id: "other" });
    const res = await handleMembers(
      request("/community/comments/" + pid, "DELETE"),
      f.db,
    );
    expect(res.status).toBe(403);
    expect(f.chain.update).not.toHaveBeenCalled();
  });
  it("저장 해제는 토큰 소유자의 ID와 업체 ID로 한정한다", async () => {
    const f = fake();
    const res = await handleMembers(
      request("/me/saved-vendors/v_001", "DELETE"),
      f.db,
    );
    expect(res.status).toBe(204);
    expect(f.chain.match).toHaveBeenCalledWith({
      user_id: uid,
      vendor_id: "v_001",
    });
  });
  it("좋아요는 동일 키로 멱등 저장한다", async () => {
    const f = fake({ id: pid, user_id: uid, status: "published" });
    const res = await handleMembers(
      request("/community/posts/" + pid + "/likes", "PUT"),
      f.db,
    );
    expect(res.status).toBe(204);
    expect(f.chain.upsert).toHaveBeenCalledWith(
      { user_id: uid, post_id: pid, kind: "like" },
      { onConflict: "user_id,post_id,kind" },
    );
  });
});

describe("MVP 회원 AC의 정상·경계·금지 행동", () => {
  const post = { id: pid, user_id: uid, status: "published", category: "구매처 질문", title: "[가상테스트] 구매처", body: "상추 2kg", nickname: "[가상테스트] 사장님" };
  function postDb() {
    const f = fake(post);
    const related = fake([]);
    f.from.mockImplementation((table?: string) => table === "chj_community_posts" ? f.chain : related.chain);
    return { ...f, related };
  }

  it("AC-M02 정상 글은 토큰 작성자로 등록하고 작성자 ID를 공개 응답에서 제외한다", async () => {
    const f = postDb();
    const input = { category: "구매처 질문", title: post.title, body: post.body };
    const res = await handleMembers(request("/community/posts", "POST", input), f.db);
    expect(res.status).toBe(201);
    expect(f.chain.insert).toHaveBeenCalledWith({ ...input, user_id: uid, nickname: post.nickname });
    const result = await res.json();
    expect(result).toMatchObject({ id: pid, is_mine: true, bookmarked: false });
    expect(result).not.toHaveProperty("user_id");
    expect((await handleMembers(request("/community/posts", "POST", { ...input, user_id: "other" }), f.db)).status).toBe(422);
    expect(f.chain.insert).toHaveBeenCalledTimes(1);
  });

  it("AC-M02 제목 100자는 허용하고 101자는 DB 저장 전에 거부한다", async () => {
    const f = postDb();
    const input = { category: "가격 제보", title: "가".repeat(100), body: "내용" };
    expect((await handleMembers(request("/community/posts", "POST", input), f.db)).status).toBe(201);
    expect((await handleMembers(request("/community/posts", "POST", { ...input, title: "가".repeat(101) }), f.db)).status).toBe(422);
    expect(f.chain.insert).toHaveBeenCalledTimes(1);
  });

  it("AC-M03 댓글 1000자는 저장하고 1001자는 거부한다", async () => {
    const f = postDb();
    expect((await handleMembers(request(`/community/posts/${pid}/comments`, "POST", { body: "가".repeat(1000) }), f.db)).status).toBe(201);
    expect(f.related.chain.insert).toHaveBeenCalledWith(expect.objectContaining({ post_id: pid, user_id: uid }));
    expect((await handleMembers(request(`/community/posts/${pid}/comments`, "POST", { body: "가".repeat(1001) }), f.db)).status).toBe(422);
    expect(f.related.chain.insert).toHaveBeenCalledTimes(1);
  });

  it("AC-M03 신고 접수는 글을 자동 숨기거나 삭제하지 않는다", async () => {
    const f = postDb();
    const res = await handleMembers(request("/community/reports", "POST", { post_id: pid, reason: "[가상테스트] 검토 요청" }), f.db);
    expect(res.status).toBe(201);
    expect(f.related.chain.upsert).toHaveBeenCalledWith(
      { post_id: pid, reason: "[가상테스트] 검토 요청", user_id: uid },
      { onConflict: "user_id,post_id", ignoreDuplicates: true },
    );
    expect(f.chain.update).not.toHaveBeenCalled();
    expect(f.chain.delete).not.toHaveBeenCalled();
  });

  it("AC-M04 북마크 저장과 해제는 현재 토큰의 키만 사용한다", async () => {
    const f = postDb();
    const key = { user_id: uid, post_id: pid, kind: "bookmark" };
    expect((await handleMembers(request(`/community/posts/${pid}/bookmark`, "PUT"), f.db)).status).toBe(204);
    expect(f.related.chain.upsert).toHaveBeenCalledWith(key, { onConflict: "user_id,post_id,kind" });
    expect((await handleMembers(request(`/community/posts/${pid}/bookmark`, "DELETE"), f.db)).status).toBe(204);
    expect(f.related.chain.match).toHaveBeenCalledWith(key);
  });

  it("AC-M04 저장 글 목록은 본인 북마크와 공개 글로 제한한다", async () => {
    const f = fake([]);
    const res = await handleMembers(request("/community/posts?saved=true"), f.db);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ posts: [] });
    expect(f.chain.eq).toHaveBeenCalledWith("user_id", uid);
    expect(f.chain.eq).toHaveBeenCalledWith("kind", "bookmark");
    expect(f.chain.eq).toHaveBeenCalledWith("status", "published");
  });

  it("AC-M06 참가자로 조회되지 않는 대화에는 메시지를 저장하지 않는다", async () => {
    const f = fake(null);
    f.chain.or = vi.fn(() => f.chain);
    const res = await handleMembers(request(`/me/conversations/${pid}/messages`, "POST", { body: "내용" }), f.db);
    expect(res.status).toBe(404);
    expect(f.chain.or).toHaveBeenCalledWith(`customer_id.eq.${uid},owner_id.eq.${uid}`);
    expect(f.chain.insert).not.toHaveBeenCalled();
  });

  it("AC-M06 소유자가 연결되지 않은 업체의 문의 대화를 만들지 않는다", async () => {
    const f = fake(null);
    expect((await handleMembers(request("/me/conversations", "POST", { vendor_id: "v_001" }), f.db)).status).toBe(404);
    expect(f.chain.upsert).not.toHaveBeenCalled();
  });

  it("AC-M06 별점 0과 6은 업체 조회·리뷰 저장 전에 거부한다", async () => {
    const f = fake();
    for (const rating of [0, 6]) {
      expect((await handleMembers(request("/me/vendor-reviews/v_001", "PUT", { rating, body: "내용" }), f.db)).status).toBe(422);
    }
    expect(f.from).not.toHaveBeenCalled();
  });

  it("AC-M02 저장소 실패를 빈 목록 성공으로 바꾸지 않는다", async () => {
    const f = fake([]);
    f.chain.then!.mockImplementation((resolve: (v: unknown) => unknown) => resolve({ data: null, error: { message: "fixture unavailable" } }));
    const res = await handleMembers(request("/community/posts"), f.db);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: { code: "STORAGE_UNAVAILABLE" } });
  });
});
