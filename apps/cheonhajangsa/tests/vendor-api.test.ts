import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
  createClient: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mock.createClient }));
import {
  endpoint,
  json,
  databaseError,
  readJson,
  parseDatabase,
} from "../lib/server/vendor-api";
import { POST as save } from "../app/api/v1/me/vendors/route";
import { POST as review } from "../app/api/v1/moderation/revisions/[id]/route";
import { imageType } from "../lib/server/vendor-images";
import {
  vendorDraftSchema,
  reviewSchema,
  searchQuerySchema,
  revisionSchema,
} from "@cheon/vendor-contracts";
const userId = "10000000-0000-4000-8000-000000000001";
const key = "20000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  mock.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });
  mock.createClient.mockReturnValue({
    auth: { getUser: mock.getUser },
    rpc: mock.rpc,
  });
});
afterEach(() => vi.unstubAllEnvs());
const request = (body: unknown, auth = "Bearer user-token") =>
  new Request("https://example.com/api/v1/me/vendors", {
    method: "POST",
    headers: { authorization: auth, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
describe("인증과 서버 오류 경계", () => {
  it("로그인 토큰 없는 요청은 DB에 연결하지 않는다", async () => {
    const response = await save(request({}, ""));
    expect(response.status).toBe(401);
    expect(mock.createClient).not.toHaveBeenCalled();
  });
  it("사용자 토큰을 Supabase Auth에서 검증하고 RLS 요청에도 유지한다", async () => {
    const response = await endpoint(request({}), async ({ userId }) =>
      json({ userId }),
    );
    expect(response.status).toBe(200);
    expect(mock.getUser).toHaveBeenCalledWith("user-token");
    expect(
      mock.createClient.mock.calls[0][2].global.headers.Authorization,
    ).toBe("Bearer user-token");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("잘못된 로그인 토큰을 거부한다", async () => {
    mock.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "bad" },
    });
    expect((await save(request({}))).status).toBe(401);
  });
  it("소유자가 승인 상태를 입력해도 저장하지 않는다", async () => {
    const response = await save(
      request({
        draft: { name: "샘플", status: "approved" },
        creation_key: key,
      }),
    );
    expect(response.status).toBe(422);
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("운영자 RPC 거절을 403으로 돌려준다", async () => {
    mock.rpc.mockResolvedValue({
      data: null,
      error: { code: "P0001", message: "FORBIDDEN" },
    });
    const response = await review(
      request({ expected_version: 1, decision: "approved" }),
      { params: Promise.resolve({ id: key }) },
    );
    expect(response.status).toBe(403);
  });
  it("DB 내부 오류 문자열과 키를 응답에 노출하지 않는다", async () => {
    mock.rpc.mockResolvedValue({
      data: null,
      error: { code: "XX000", message: "private_password=do-not-leak" },
    });
    const response = await save(request({ draft: {}, creation_key: key }));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private_password");
  });
  it("미적용 DB와 오래된 버전을 구분한다", () => {
    expect(databaseError({ code: "PGRST202" }).code).toBe("DATABASE_NOT_READY");
    expect(databaseError({ message: "STALE_DRAFT" }).status).toBe(409);
  });
  it("깨진 JSON과 큰 요청을 구분한다", async () => {
    await expect(
      readJson(
        new Request("https://example.com", { method: "POST", body: "{" }),
      ),
    ).rejects.toMatchObject({ code: "INVALID_JSON" });
    await expect(
      readJson(
        new Request("https://example.com", {
          method: "POST",
          body: "x".repeat(131073),
        }),
      ),
    ).rejects.toMatchObject({ status: 413 });
  });
  it("DB 응답이 계약과 다르면 정상 데이터로 간주하지 않는다", () => {
    expect(() => parseDatabase(revisionSchema, { status: "approved" })).toThrow(
      "DB 응답",
    );
  });
});
describe("등록·검색 계약", () => {
  it("작성 중에는 미완성 필드와 가격 null을 허용한다", () =>
    expect(
      vendorDraftSchema.parse({ items: [{ name: "양파" }] }).items[0].price,
    ).toBeNull());
  it("초안에도 음수 가격과 위조 좌표는 허용하지 않는다", () => {
    expect(
      vendorDraftSchema.safeParse({ items: [{ price: -1 }] }).success,
    ).toBe(false);
    expect(vendorDraftSchema.safeParse({ latitude: 37 }).success).toBe(false);
  });
  it("보완 사유와 검색 반경을 검증한다", () => {
    expect(
      reviewSchema.safeParse({
        expected_version: 1,
        decision: "changes_requested",
      }).success,
    ).toBe(false);
    expect(
      searchQuerySchema.safeParse({ latitude: 37, longitude: 127, radius: 99 })
        .success,
    ).toBe(false);
  });
  it("확장자를 믿지 않고 이미지 바이트를 확인한다", () => {
    expect(
      imageType(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])).mime,
    ).toBe("image/png");
    expect(() => imageType(new TextEncoder().encode("<svg/>"))).toThrow();
  });
});
