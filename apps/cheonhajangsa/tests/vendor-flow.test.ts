import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";
import { readFile } from "node:fs/promises";
const actorA = "10000000-0000-4000-8000-000000000001",
  actorB = "10000000-0000-4000-8000-000000000002",
  moderator = "10000000-0000-4000-8000-000000000003";
let db: PGlite;
let chain: Promise<unknown> = Promise.resolve();
vi.mock("@supabase/supabase-js", () => ({
  createClient: (
    _url: string,
    key: string,
    options?: { global?: { headers?: { Authorization?: string } } },
  ) => {
    const token =
      options?.global?.headers?.Authorization?.replace(/^Bearer /, "") ?? "";
    return {
      auth: {
        getUser: async () => ({
          data: {
            user: [actorA, actorB, moderator].includes(token)
              ? { id: token }
              : null,
          },
          error: null,
        }),
      },
      rpc: async (name: string, args: Record<string, unknown> = {}) => {
        const work = chain.then(async () => {
          await db.exec(
            "reset role;set role " +
              (key === "test-service-key" ? "service_role" : "authenticated"),
          );
          await db.query(
            "select set_config('request.jwt.claim.sub',$1,false)",
            [key === "test-service-key" ? "" : token],
          );
          if (
            !/^[a-z_]+$/.test(name) ||
            Object.keys(args).some((k) => !/^p_[a-z_]+$/.test(k))
          )
            throw new Error("Unsafe fixture SQL");
          try {
            const result = await db.query<{ result: unknown }>(
              `select public.${name}(${Object.keys(args)
                .map((k, i) => `${k}=>$${i + 1}`)
                .join(",")}) as result`,
              Object.values(args),
            );
            return { data: result.rows[0].result, error: null };
          } catch (error) {
            return { data: null, error };
          }
        });
        chain = work.catch(() => {});
        return work;
      },
    };
  },
}));
vi.mock("../lib/server/kakao-geocode", () => ({
  geocodeVendorAddress: async () => ({
    status: "ok",
    candidates: [{ latitude: 37.2834, longitude: 127.0465 }],
  }),
  GeocodeError: class extends Error {
    code = "fixture";
  },
}));
import { POST as save } from "../app/api/v1/me/vendors/route";
import { POST as submit } from "../app/api/v1/me/revisions/[id]/submit/route";
import { POST as review } from "../app/api/v1/moderation/revisions/[id]/route";
import { GET as search } from "../app/api/v1/vendors/route";
import { GET as workspace } from "../app/api/v1/me/vendors/route";
import {
  revisionSchema,
  workspaceSchema,
  publishedSearchSchema,
} from "@cheon/vendor-contracts";
beforeAll(async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-public-key");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
  db = new PGlite({ extensions: { postgis } });
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema public,auth to authenticated,anon,service_role;grant execute on function auth.uid() to authenticated,anon,service_role;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);alter table storage.buckets enable row level security;create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,unique(bucket_id,name));alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;`,
  );
  await db.exec(
    await readFile(
      new URL(
        "../../../supabase/migrations/202610280001_vendor_registration.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  for (const id of [actorA, actorB, moderator])
    await db.query("insert into auth.users values($1)", [id]);
  await db.query(
    "insert into app_private.staff_roles(user_id,role) values($1,'moderator')",
    [moderator],
  );
}, 60000);
afterAll(async () => {
  vi.unstubAllEnvs();
  await db?.close();
});
const req = (
  actor: string,
  body?: unknown,
  url = "https://example.com/api/v1/me/vendors",
) =>
  new Request(url, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: "Bearer " + actor,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const draft = {
  name: "통합 검증 가상 업체",
  category: "식자재",
  contact: "테스트 공개 연락처",
  address: "가상 주소",
  fulfillment: "pickup",
  delivery_terms: "방문 수령",
  items: [
    {
      name: "양파",
      specification: "10kg 1포",
      quantity: 10,
      unit: "kg",
      price: 18000,
      tax: "included",
      minimum_packages: 1,
      checked_on: "2026-01-01",
    },
  ],
};
let revision: ReturnType<typeof revisionSchema.parse>;
describe("Route Handler → 사용자 토큰 RPC → 실제 SQL 수직 흐름", () => {
  it("소유자 초안 저장 응답이 모바일 공유 계약과 맞는다", async () => {
    const response = await save(
      req(actorA, {
        draft,
        creation_key: "20000000-0000-4000-8000-000000000001",
      }),
    );
    expect(response.status).toBe(200);
    revision = revisionSchema.parse(await response.json());
    expect(revision.status).toBe("draft");
    const my = await workspace(req(actorA));
    expect(workspaceSchema.parse(await my.json()).revisions).toHaveLength(1);
  });
  it("타인은 검토 요청을 못하고, 소유자는 서버 좌표 확인 후 제출한다", async () => {
    const context = { params: Promise.resolve({ id: revision.id }) };
    const denied = await submit(
      req(actorB, { expected_version: revision.version }),
      context,
    );
    expect(denied.status).toBe(403);
    const response = await submit(
      req(actorA, { expected_version: revision.version }),
      context,
    );
    expect(response.status).toBe(200);
    revision = revisionSchema.parse(await response.json());
    expect(revision.status).toBe("pending_review");
    expect(revision.latitude).toBe(37.2834);
  });
  it("운영자 승인 전에는 검색되지 않고 승인 후 같은 데이터가 검색된다", async () => {
    const url =
      "https://example.com/api/v1/vendors?latitude=37.2834&longitude=127.0465";
    const before = await search(req(actorB, undefined, url));
    expect(publishedSearchSchema.parse(await before.json()).vendors).toEqual(
      [],
    );
    const response = await review(
      req(moderator, {
        expected_version: revision.version,
        decision: "approved",
      }),
      { params: Promise.resolve({ id: revision.id }) },
    );
    expect(response.status).toBe(200);
    const after = await search(req(actorB, undefined, url));
    const result = publishedSearchSchema.parse(await after.json());
    expect(result.vendors.map((v) => v.id)).toEqual([revision.vendor_id]);
    expect(result.vendors[0].items[0].price).toBe(18000);
  });
});
