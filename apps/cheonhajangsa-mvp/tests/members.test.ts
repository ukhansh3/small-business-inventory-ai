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
  const from = vi.fn(() => chain),
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
