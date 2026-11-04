import { afterAll,beforeAll,expect,it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { mvpVendorSchema } from "@cheon/vendor-contracts";
let db:PGlite;
beforeAll(async()=>{
 db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated,anon;`);
 await db.exec(await readFile(new URL('../../../supabase/migrations/202611040001_public_vendor_mvp.sql',import.meta.url),'utf8'));
 await db.query(`insert into public.mvp_public_vendors(source_key,name,category,address,source_dataset,source_url,source_date,source_license,source_sha256,demo_service,demo_price,demo_unit,demo_terms) values($1,'가상 검증 건설','원문 업종+복합','가상 테스트 주소','테스트 출처','https://www.data.go.kr/data/3079598/fileData.do','2026-03-06','테스트',$1,'[시연] 작업',150000,'1회','[시연] 조건')`,['a'.repeat(64)]);
});
afterAll(async()=>{await db.close();});
it('requires authentication; preserves original categories and explicit synthetic provenance',async()=>{
 await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);`);
 const x=await db.query<{r:{vendors:unknown[]}}>(`select public.search_mvp_public_vendors('원문','',0) as r`);
 const row=mvpVendorSchema.parse(x.rows[0].r.vendors[0]);
 expect(row.category).toBe('원문 업종+복합');expect(row.vendor_verified).toBe(false);expect(row.data_kind).toBe('mvp_demo');
 expect(()=>mvpVendorSchema.parse({...row,vendor_verified:true})).toThrow();
 expect(()=>mvpVendorSchema.parse({...row,demo_notice:'실제 판매가격'})).toThrow();
});
it('treats SQL-like and wildcard input literally',async()=>{
 const x=await db.query<{r:{vendors:unknown[]}}>(`select public.search_mvp_public_vendors($1,'',0) as r`,["%' OR true --"]);expect(x.rows[0].r.vendors).toHaveLength(0);
});
it('blocks client writes and anonymous table reads and RPC execution',async()=>{
 await expect(db.exec(`update public.mvp_public_vendors set demo_price=1`)).rejects.toThrow();
 await db.exec('reset role;set role anon;');
 await expect(db.query('select * from public.mvp_public_vendors')).rejects.toThrow();
 await expect(db.query('select public.search_mvp_public_vendors()')).rejects.toThrow();
});
it('rejects forged verification and missing demo disclaimer even for inserts',async()=>{
 await db.exec('reset role');
 await expect(db.exec(`update public.mvp_public_vendors set vendor_verified=true`)).rejects.toThrow();
 await expect(db.exec(`update public.mvp_public_vendors set demo_notice=''`)).rejects.toThrow();
 await expect(db.exec(`update public.mvp_public_vendors set latitude=37`)).rejects.toThrow();
});
