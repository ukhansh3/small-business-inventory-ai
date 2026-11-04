-- Clearly isolated fictional listings for product demonstrations only.
begin;
create table public.mvp_synthetic_vendors (
 id uuid primary key default gen_random_uuid(),
 demo_code text not null unique check(demo_code ~ '^fake-[0-9]{4}$'),
 name text not null check(length(name) between 1 and 200),
 category text not null check(length(category) between 1 and 100),
 area text not null check(length(area) between 1 and 100),
 latitude double precision not null check(latitude between -90 and 90),
 longitude double precision not null check(longitude between -180 and 180),
 service text not null check(length(service) between 1 and 200),
 price bigint not null check(price between 1 and 1000000000000),
 unit text not null check(length(unit) between 1 and 80),
 terms text not null check(length(terms) between 1 and 500),
 demo_notice text not null default '가상 시연 데이터 · 실제 업체·위치·가격·거래 조건이 아닙니다.' check(demo_notice='가상 시연 데이터 · 실제 업체·위치·가격·거래 조건이 아닙니다.'),
 data_kind text not null default 'synthetic_demo' check(data_kind='synthetic_demo'),
 created_at timestamptz not null default now(),
 check ((power((latitude-37.2834)*111.32,2)+power((longitude-127.0465)*88.8,2)) <= 2500)
);
create index mvp_synthetic_category_idx on public.mvp_synthetic_vendors(category, name);
alter table public.mvp_synthetic_vendors enable row level security;
revoke all on public.mvp_synthetic_vendors from public, anon, authenticated;
grant select on public.mvp_synthetic_vendors to authenticated;
grant select, insert, update, delete on public.mvp_synthetic_vendors to service_role;
create policy read_synthetic_demo on public.mvp_synthetic_vendors for select to authenticated using ((select auth.uid()) is not null);

create function public.search_mvp_synthetic_vendors(p_query text default '', p_category text default '')
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare results jsonb; total_count integer;
begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
 if length(coalesce(p_query,''))>100 or length(coalesce(p_category,''))>100 then raise exception 'INVALID_INPUT'; end if;
 select count(*) into total_count from public.mvp_synthetic_vendors
 where (coalesce(p_query,'')='' or strpos(lower(name||' '||category||' '||area||' '||service),lower(p_query))>0)
 and (coalesce(p_category,'')='' or category=p_category);
 select coalesce(jsonb_agg(to_jsonb(v) order by v.demo_code),'[]'::jsonb) into results from (
  select * from public.mvp_synthetic_vendors
  where (coalesce(p_query,'')='' or strpos(lower(name||' '||category||' '||area||' '||service),lower(p_query))>0)
  and (coalesce(p_category,'')='' or category=p_category)
  order by demo_code limit 200
 ) v;
 return jsonb_build_object('vendors',results,'total',total_count,'limit',200,'data_kind','synthetic_demo');
end; $$;
revoke all on function public.search_mvp_synthetic_vendors(text,text) from public,anon;
grant execute on function public.search_mvp_synthetic_vendors(text,text) to authenticated;
commit;
