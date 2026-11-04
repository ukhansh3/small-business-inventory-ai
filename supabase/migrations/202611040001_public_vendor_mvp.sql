-- Public-source identities + explicitly synthetic MVP offers, never approved vendor records.
begin;
create table public.mvp_public_vendors (
 id uuid primary key default gen_random_uuid(),
 source_key text not null unique check(length(source_key)=64),
 name text not null check(length(name) between 1 and 200),
 category text not null check(length(category) between 1 and 500),
 address text not null check(length(address) between 1 and 500),
 source_dataset text not null,
 source_url text not null check(source_url ~ '^https://www[.]data[.]go[.]kr/data/[0-9]+/fileData[.]do$'),
 source_date date not null,
 source_license text not null,
 source_sha256 text not null check(length(source_sha256)=64),
 imported_at timestamptz not null default now(),
 latitude double precision check(latitude between -90 and 90),
 longitude double precision check(longitude between -180 and 180),
 coordinate_source text check(coordinate_source='kakao_address'),
 check ((latitude is null and longitude is null and coordinate_source is null) or (latitude is not null and longitude is not null and coordinate_source is not null)),
 vendor_verified boolean not null default false check(vendor_verified=false),
 data_kind text not null default 'mvp_demo' check(data_kind='mvp_demo'),
 demo_notice text not null default 'MVP 시연용 가상 정보 · 업체가 등록하거나 확인한 가격·조건이 아닙니다. 실제 견적·거래에 사용할 수 없습니다.' check(demo_notice='MVP 시연용 가상 정보 · 업체가 등록하거나 확인한 가격·조건이 아닙니다. 실제 견적·거래에 사용할 수 없습니다.'),
 demo_service text not null check(demo_service like '[시연]%'),
 demo_price bigint not null check(demo_price>0 and demo_price<=1000000000000),
 demo_unit text not null,
 demo_terms text not null check(demo_terms like '[시연]%')
);
alter table public.mvp_public_vendors enable row level security;
revoke all on public.mvp_public_vendors from public,anon,authenticated;
grant select on public.mvp_public_vendors to authenticated;
grant select,insert,update on public.mvp_public_vendors to service_role;
create policy read_mvp on public.mvp_public_vendors for select to authenticated using((select auth.uid()) is not null);
create function public.search_mvp_public_vendors(p_query text default '',p_category text default '',p_offset integer default 0)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare results jsonb;
begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
 if length(coalesce(p_query,''))>100 or length(coalesce(p_category,''))>500 or p_offset is null or p_offset<0 or p_offset>10000 then raise exception 'INVALID_INPUT'; end if;
 select coalesce(jsonb_agg(to_jsonb(v)),'[]'::jsonb) into results from (
 select * from public.mvp_public_vendors
 where (coalesce(p_query,'')='' or strpos(lower(name||' '||category||' '||demo_service),lower(p_query))>0)
 and (coalesce(p_category,'')='' or category=p_category)
 order by name,id limit 20 offset p_offset
 ) v;
 return jsonb_build_object('vendors',results,'offset',p_offset,'limit',20,'data_kind','mvp_demo');
end; $$;
revoke all on function public.search_mvp_public_vendors(text,text,integer) from public,anon;
grant execute on function public.search_mvp_public_vendors(text,text,integer) to authenticated;
commit;
