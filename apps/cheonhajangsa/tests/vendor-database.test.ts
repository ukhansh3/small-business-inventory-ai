import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";
import { readFile } from "node:fs/promises";
const ids = {
  a: "10000000-0000-4000-8000-000000000001",
  b: "10000000-0000-4000-8000-000000000002",
  reviewer: "10000000-0000-4000-8000-000000000003",
  viewer: "10000000-0000-4000-8000-000000000004",
};
let db: PGlite;
async function asUser(id: string | null, sql: string, params: unknown[] = []) {
  await db.exec(`reset role;set role ${id ? "authenticated" : "anon"};`);
  await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [
    id ?? "",
  ]);
  return db.query<Record<string, unknown>>(sql, params);
}
async function admin(sql: string, params: unknown[] = []) {
  await db.exec("reset role");
  return db.query<Record<string, unknown>>(sql, params);
}
async function rpc(id: string, name: string, args: unknown[]) {
  const result = await asUser(
    id,
    `select public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) as result`,
    args,
  );
  return result.rows[0]?.result as Record<string, unknown>;
}
const draft = {
  name: "검증용 가상 업체",
  description: "가상 자료",
  category: "식자재",
  contact: "테스트 공개 연락처",
  address: "테스트 업체 주소",
  opening_hours: "평일",
  fulfillment: "delivery",
  delivery_terms: "배송 지역 별도 확인",
  items: [
    {
      name: "양파",
      category: "식자재",
      specification: "10kg 1포",
      quantity: 10,
      unit: "kg",
      price: 18000,
      tax: "included",
      minimum_packages: 1,
      delivery_fee: 3000,
      delivery_fee_basis: "주문당 고정",
      selling: true,
      checked_on: "2026-01-01",
    },
  ],
};
let revision: Record<string, unknown>;
let vendorId: string;
async function geocode(r: Record<string, unknown>) {
  await admin(
    `select public.apply_vendor_geocode($1,$2,$3,$4,37.2834,127.0465)`,
    [r.id, ids.a, r.version, r.address],
  );
}
beforeAll(async () => {
  db = new PGlite({ extensions: { postgis } });
  await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema public,auth to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;
create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
alter table storage.buckets enable row level security;create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,unique(bucket_id,name));alter table storage.objects enable row level security;
grant usage on schema storage to authenticated,anon;grant select,insert,update,delete on storage.objects to authenticated,anon;
grant select,insert,update,delete on storage.buckets to authenticated,anon;
create policy unrelated_wide_bucket_policy on storage.buckets for all to authenticated,anon using(true) with check(true);
create policy unrelated_wide_storage_policy on storage.objects for all to authenticated,anon using(true) with check(true);
`);
  await db.exec(
    "alter default privileges grant execute on functions to anon,authenticated; alter default privileges grant all on tables to anon,authenticated,service_role;",
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
  for (const id of Object.values(ids))
    await admin("insert into auth.users values($1)", [id]);
  await admin(
    `insert into app_private.staff_roles(user_id,role) values($1,'moderator')`,
    [ids.reviewer],
  );
}, 60000);
afterAll(async () => {
  await db?.close();
});
describe("실제 PostgreSQL/PostGIS 업체 검토 규칙", () => {
  it("소유자와 초안을 원자적으로 생성한다", async () => {
    revision = await rpc(ids.a, "save_vendor_draft", [
      draft,
      "20000000-0000-4000-8000-000000000001",
      null,
      null,
    ]);
    vendorId = revision.vendor_id as string;
    expect(revision.status).toBe("draft");
    const members = await asUser(ids.a, "select * from public.vendor_members");
    expect(members.rows).toHaveLength(1);
  });
  it("동일 생성 요청 재시도는 업체를 중복 생성하지 않는다", async () => {
    const again = await rpc(ids.a, "save_vendor_draft", [
      draft,
      "20000000-0000-4000-8000-000000000001",
      null,
      null,
    ]);
    expect(again.id).toBe(revision.id);
  });
  it("미승인 업체는 검색과 상세에 노출하지 않는다", async () => {
    expect(
      await rpc(ids.viewer, "get_published_vendor", [vendorId]),
    ).toBeNull();
    const result = await rpc(ids.viewer, "search_published_vendors", [
      37.2834,
      127.0465,
      3000,
      "",
      "",
      0,
    ]);
    expect(result.vendors).toEqual([]);
  });
  it("다른 사장에게 원본 초안을 보여주지 않는다", async () => {
    const rows = await asUser(ids.b, "select * from public.vendor_revisions");
    expect(rows.rows).toHaveLength(0);
    await expect(
      rpc(ids.b, "get_vendor_workspace", [revision.id]),
    ).rejects.toThrow("FORBIDDEN");
  });
  it("다른 사장은 업체를 수정하지 못한다", async () => {
    await expect(
      rpc(ids.b, "save_vendor_draft", [
        draft,
        null,
        revision.id,
        revision.version,
      ]),
    ).rejects.toThrow("FORBIDDEN");
  });
  it("직접 승인 상태 변경과 멤버 권한 추가를 막는다", async () => {
    await expect(
      asUser(ids.a, "update public.vendor_revisions set status='approved'"),
    ).rejects.toThrow();
    await expect(
      asUser(
        ids.b,
        "insert into public.vendor_members(vendor_id,user_id) values($1,$2)",
        [vendorId, ids.b],
      ),
    ).rejects.toThrow();
  });
  it("사장이 서버 지오코딩을 우회하지 못한다", async () => {
    await expect(
      asUser(ids.a, "select public.apply_vendor_geocode($1,$2,$3,$4,37,127)", [
        revision.id,
        ids.a,
        revision.version,
        draft.address,
      ]),
    ).rejects.toThrow();
    await expect(
      rpc(ids.a, "submit_vendor_revision", [revision.id, revision.version]),
    ).rejects.toThrow("INCOMPLETE_VENDOR");
  });
  it("음수 가격 변경 실패 시 이전 초안과 품목이 함께 보존된다", async () => {
    await expect(
      rpc(ids.a, "save_vendor_draft", [
        { ...draft, items: [{ ...draft.items[0], price: -1 }] },
        null,
        revision.id,
        revision.version,
      ]),
    ).rejects.toThrow();
    const still = await rpc(ids.a, "get_vendor_workspace", [revision.id]);
    expect(still.version).toBe(revision.version);
    expect((still.items as { price: number }[])[0].price).toBe(18000);
  });
  it("현재 주소·버전에 맞는 서버 좌표만 기록한다", async () => {
    await expect(
      admin("select public.apply_vendor_geocode($1,$2,$3,$4,37,127)", [
        revision.id,
        ids.a,
        revision.version,
        "다른 주소",
      ]),
    ).rejects.toThrow("STALE_DRAFT");
    await geocode(revision);
  });
  it("검토 요청 이후에는 품목 수정과 공개를 막는다", async () => {
    revision = await rpc(ids.a, "submit_vendor_revision", [
      revision.id,
      revision.version,
    ]);
    expect(revision.status).toBe("pending_review");
    await expect(
      rpc(ids.a, "save_vendor_draft", [
        draft,
        null,
        revision.id,
        revision.version,
      ]),
    ).rejects.toThrow("REVISION_LOCKED");
    expect(
      await rpc(ids.viewer, "get_published_vendor", [vendorId]),
    ).toBeNull();
  });
  it("일반 사장의 승인과 자기 업체 셀프 승인을 막는다", async () => {
    await expect(
      rpc(ids.a, "review_vendor_revision", [
        revision.id,
        revision.version,
        "approved",
        "",
        "",
      ]),
    ).rejects.toThrow("FORBIDDEN");
    await admin(
      `insert into app_private.staff_roles values($1,'moderator',now())`,
      [ids.a],
    );
    await expect(
      rpc(ids.a, "review_vendor_revision", [
        revision.id,
        revision.version,
        "approved",
        "",
        "",
      ]),
    ).rejects.toThrow("SELF_REVIEW_FORBIDDEN");
    await admin("delete from app_private.staff_roles where user_id=$1", [
      ids.a,
    ]);
  });
  it('공개본 교체가 실패하면 승인 상태와 감사 기록도 함께 롤백한다',async()=>{
    await admin("create function pg_temp.reject_publication() returns trigger language plpgsql as $$ begin raise exception 'FIXTURE_PUBLICATION_FAILURE'; end; $$");
    await admin('create trigger fixture_publication_failure before update of current_revision_id on public.vendors for each row execute function pg_temp.reject_publication()');
    try {await expect(rpc(ids.reviewer,'review_vendor_revision',[revision.id,revision.version,'approved','',''])).rejects.toThrow('FIXTURE_PUBLICATION_FAILURE');}
    finally {await admin('drop trigger fixture_publication_failure on public.vendors');}
    expect((await rpc(ids.a,'get_vendor_workspace',[revision.id])).status).toBe('pending_review');
    expect(await rpc(ids.viewer,'get_published_vendor',[vendorId])).toBeNull();
    expect((await asUser(ids.reviewer,'select * from public.review_events')).rows).toHaveLength(0);
  });
  it("승인은 공개본과 감사 기록을 함께 갱신한다", async () => {
    revision = await rpc(ids.reviewer, "review_vendor_revision", [
      revision.id,
      revision.version,
      "approved",
      "",
      "내부 메모",
    ]);
    const published = await rpc(ids.viewer, "get_published_vendor", [vendorId]);
    expect(published.name).toBe(draft.name);
    expect(published).not.toHaveProperty("created_by");
    expect(JSON.stringify(published)).not.toContain("내부 메모");
    const events = await asUser(
      ids.reviewer,
      "select * from public.review_events",
    );
    expect(events.rows).toHaveLength(1);
  });
  it("승인 재시도는 감사 기록을 중복 생성하지 않는다", async () => {
    await rpc(ids.reviewer, "review_vendor_revision", [
      revision.id,
      revision.version,
      "approved",
      "",
      "",
    ]);
    const events = await asUser(
      ids.reviewer,
      "select * from public.review_events",
    );
    expect(events.rows).toHaveLength(1);
  });
  it("일반 조회자는 승인본 원본·내부 검토 기록을 읽지 못한다", async () => {
    expect(
      (await asUser(ids.viewer, "select * from public.vendor_revisions")).rows,
    ).toEqual([]);
    expect(
      (await asUser(ids.a, "select * from public.review_events")).rows,
    ).toEqual([]);
  });
  it("승인본과 승인 품목은 DB에서도 불변이다", async () => {
    await expect(
      admin("update public.vendor_revisions set name='변조' where id=$1", [
        revision.id,
      ]),
    ).rejects.toThrow("REVISION_LOCKED");
    await expect(
      admin("update public.item_revisions set price=1 where revision_id=$1", [
        revision.id,
      ]),
    ).rejects.toThrow("REVISION_LOCKED");
  });
  it("공간·품목 검색이 승인 업체만 반환한다", async () => {
    const found = await rpc(ids.viewer, "search_published_vendors", [
      37.2834,
      127.0465,
      3000,
      "양파",
      "식자재",
      0,
    ]);
    expect((found.vendors as { id: string }[]).map((v) => v.id)).toEqual([
      vendorId,
    ]);
    expect(
      (
        await rpc(ids.viewer, "search_published_vendors", [
          35,
          129,
          100,
          "",
          "",
          0,
        ])
      ).vendors,
    ).toEqual([]);
    await expect(
      rpc(ids.viewer, "search_published_vendors", [37, 127, 99, "", "", 0]),
    ).rejects.toThrow("INVALID_INPUT");
  });
  it("수정본 검토 중에는 이전 승인 가격을 유지한다", async () => {
    const next = await rpc(ids.a, "start_vendor_revision", [vendorId]);
    const items = (next.items as Record<string, unknown>[]).map((i) => ({
      ...i,
      price: 19000,
    }));
    revision = await rpc(ids.a, "save_vendor_draft", [
      { ...draft, items },
      null,
      next.id,
      next.version,
    ]);
    await geocode(revision);
    revision = await rpc(ids.a, "submit_vendor_revision", [
      revision.id,
      revision.version,
    ]);
    const old = await rpc(ids.viewer, "get_published_vendor", [vendorId]);
    expect((old.items as { price: number }[])[0].price).toBe(18000);
  });
  it("낡은 버전 승인 요청은 거부한다", async () => {
    await expect(
      rpc(ids.reviewer, "review_vendor_revision", [
        revision.id,
        (revision.version as number) - 1,
        "approved",
        "",
        "",
      ]),
    ).rejects.toThrow("STALE_DRAFT");
  });
  it("보완 사유를 요구하며 내부 메모는 소유자 응답에서 제외한다", async () => {
    await expect(
      rpc(ids.reviewer, "review_vendor_revision", [
        revision.id,
        revision.version,
        "changes_requested",
        "",
        "",
      ]),
    ).rejects.toThrow("REASON_REQUIRED");
    revision = await rpc(ids.reviewer, "review_vendor_revision", [
      revision.id,
      revision.version,
      "changes_requested",
      "규격 확인 필요",
      "공개 금지 내부 메모",
    ]);
    const own = await rpc(ids.a, "get_vendor_workspace", [revision.id]);
    expect(own.owner_message).toBe("규격 확인 필요");
    expect(JSON.stringify(own)).not.toContain("공개 금지 내부 메모");
  });
  it("소유자 철회 후 승인하더라도 자동 재공개하지 않는다", async () => {
    await rpc(ids.a, "set_vendor_visibility", [vendorId, true, "가격 확인 중"]);
    expect(
      await rpc(ids.viewer, "get_published_vendor", [vendorId]),
    ).toBeNull();
    await expect(
      rpc(ids.a, "set_vendor_visibility", [vendorId, false, "직접 재공개"]),
    ).rejects.toThrow("FORBIDDEN");
    revision = await rpc(ids.a, "save_vendor_draft", [
      draft,
      null,
      revision.id,
      revision.version,
    ]);
    await geocode(revision);
    revision = await rpc(ids.a, "submit_vendor_revision", [
      revision.id,
      revision.version,
    ]);
    await rpc(ids.reviewer, "review_vendor_revision", [
      revision.id,
      revision.version,
      "approved",
      "",
      "",
    ]);
    expect(
      await rpc(ids.viewer, "get_published_vendor", [vendorId]),
    ).toBeNull();
    await rpc(ids.reviewer, "set_vendor_visibility", [
      vendorId,
      false,
      "재확인 완료",
    ]);
    expect(
      await rpc(ids.viewer, "get_published_vendor", [vendorId]),
    ).not.toBeNull();
  });
  it("감사 기록 삭제를 막고 비로그인 조회를 차단한다", async () => {
    await expect(admin("delete from public.review_events")).rejects.toThrow(
      "AUDIT_IMMUTABLE",
    );
    await expect(
      asUser(null, "select public.get_published_vendor($1)", [vendorId]),
    ).rejects.toThrow();
  });

  it("사진은 초안 소유자만 업로드하며 일반 이용자는 원본을 직접 읽지 못한다", async () => {
    let next = await rpc(ids.a, "start_vendor_revision", [vendorId]);
    const path = String(next.id) + "/30000000-0000-4000-8000-000000000001.png";
    await expect(
      asUser(
        ids.b,
        "insert into storage.objects(bucket_id,name) values('vendor-images',$1)",
        [path],
      ),
    ).rejects.toThrow();
    await asUser(
      ids.a,
      "insert into storage.objects(bucket_id,name) values('vendor-images',$1)",
      [path],
    );
    const uploaded = await asUser(
      ids.a,
      "select public.attach_vendor_image($1,$2,0,true) as result",
      [next.id, path],
    );
    const imageId = uploaded.rows[0].result;
    expect((await asUser(ids.a,"update storage.buckets set public=true where id='vendor-images' returning id")).rows).toEqual([]);
    expect((await asUser(ids.a,"delete from storage.buckets where id='vendor-images' returning id")).rows).toEqual([]);
    expect((await asUser(null,'select * from storage.objects')).rows).toEqual([]);
    await expect(
      rpc(ids.viewer, "resolve_vendor_image", [imageId]),
    ).rejects.toThrow("NOT_FOUND");
    expect(
      (await asUser(ids.viewer, "select * from storage.objects")).rows,
    ).toEqual([]);
    next = await rpc(ids.a, "get_vendor_workspace", [next.id]);
    await geocode(next);
    next = await rpc(ids.a, "submit_vendor_revision", [next.id, next.version]);
    await rpc(ids.reviewer, "review_vendor_revision", [
      next.id,
      next.version,
      "approved",
      "",
      "",
    ]);
    expect(await rpc(ids.viewer, "resolve_vendor_image", [imageId])).toBe(path);
    expect(
      (await asUser(ids.viewer, "select * from storage.objects")).rows,
    ).toEqual([]);
    await expect(
      admin("update public.vendor_images set position=2 where id=$1", [
        imageId,
      ]),
    ).rejects.toThrow("REVISION_LOCKED");
    expect(
      (
        await asUser(
          ids.a,
          "delete from storage.objects where name=$1 returning id",
          [path],
        )
      ).rows,
    ).toEqual([]);
    await rpc(ids.reviewer, "set_vendor_visibility", [
      vendorId,
      true,
      "사진 비공개 검증",
    ]);
    await expect(
      rpc(ids.viewer, "resolve_vendor_image", [imageId]),
    ).rejects.toThrow("NOT_FOUND");
  });
  it("품목·가격 없는 초안은 저장해도 검토 요청은 거부한다", async () => {
    let next = await rpc(ids.b, "save_vendor_draft", [
      { ...draft, items: [] },
      "20000000-0000-4000-8000-000000000002",
      null,
      null,
    ]);
    await admin("select public.apply_vendor_geocode($1,$2,$3,$4,37,127)", [
      next.id,
      ids.b,
      next.version,
      next.address,
    ]);
    await expect(
      rpc(ids.b, "submit_vendor_revision", [next.id, next.version]),
    ).rejects.toThrow("ITEM_REQUIRED");
    next = await rpc(ids.b, "save_vendor_draft", [
      { ...draft, items: [{ ...draft.items[0], price: null }] },
      null,
      next.id,
      next.version,
    ]);
    await admin("select public.apply_vendor_geocode($1,$2,$3,$4,37,127)", [
      next.id,
      ids.b,
      next.version,
      next.address,
    ]);
    await expect(
      rpc(ids.b, "submit_vendor_revision", [next.id, next.version]),
    ).rejects.toThrow("INCOMPLETE_ITEM");
    await expect(
      admin("update public.vendors set current_revision_id=$1 where id=$2", [
        next.id,
        next.vendor_id,
      ]),
    ).rejects.toThrow("INVALID_PUBLIC_REVISION");
  });
  it("다른 업체의 품목 ID를 끼워 넣을 수 없다", async () => {
    const workspace = await rpc(ids.b, "get_vendor_workspace", [null]);
    const row = (workspace.revisions as Record<string, unknown>[])[0];
    const foreign = await admin(
      "select id from public.vendor_items where vendor_id=$1 limit 1",
      [vendorId],
    );
    await expect(
      rpc(ids.b, "save_vendor_draft", [
        {
          ...draft,
          items: [{ ...draft.items[0], item_id: foreign.rows[0].id }],
        },
        null,
        row.id,
        row.version,
      ]),
    ).rejects.toThrow("INVALID_ITEM");
  });
  it("기본 함수 권한이 넓어도 내부 제출본·검증 함수를 직접 호출하지 못한다", async () => {
    await expect(
      asUser(ids.b, "select app_private.revision_json($1)", [revision.id]),
    ).rejects.toThrow();
    await expect(
      asUser(ids.a, "select app_private.check_submission($1)", [revision.id]),
    ).rejects.toThrow();
    await expect(
      asUser(
        ids.a,
        "insert into app_private.staff_roles(user_id,role) values($1,'admin')",
        [ids.a],
      ),
    ).rejects.toThrow();
  });
});
