-- 0004 단가 진단 기록(v2 V2-1~V2-4). 원천: docs/planning/DB아키텍처.md 3.5. 0001~0003 뒤에 한 번 실행한다.
-- 사진·원문 글자·가게 이름 칸은 두지 않는다(R-21).

create table chj.price_checks (
  id               uuid primary key default gen_random_uuid(),
  device_id        uuid not null references chj.devices(id),
  session_id       uuid references chj.sessions(id) on delete set null,
  source           text not null check (source in ('text','photo')),
  doc_type         text not null check (doc_type in ('paper_receipt','mobile_receipt','platform_order','product_page','invoice','not_receipt','text')),
  seller_type      text not null check (seller_type in ('local_store','food_mart','online_platform','unknown')),
  location_id      text not null,                   -- 시세 지역(영통·팔달 위치 프리셋)
  purchased_on     date,
  delivery_fee_won integer check (delivery_fee_won is null or delivery_fee_won >= 0),
  ai_mode          text not null check (ai_mode in ('live','stored')),
  model            text not null,
  created_at       timestamptz not null default now()
);
create table chj.price_check_lines (
  check_id      uuid not null references chj.price_checks(id) on delete cascade,
  line_no       smallint not null check (line_no >= 1),
  item_id       text,                               -- 사전에 없으면 null
  qty_kg        numeric(7,3) check (qty_kg is null or qty_kg > 0),
  amount_won    integer not null check (amount_won >= 0),
  price_per_kg  integer check (price_per_kg is null or price_per_kg > 0),
  comparable    boolean not null,
  verdict       text check (verdict in ('cheaper','normal','pricier')),
  shared        boolean not null default false,     -- 시세 보태기 동의(API-16)
  created_at    timestamptz not null default now(),
  primary key (check_id, line_no),
  check (not comparable or price_per_kg is not null),
  check (not shared or comparable)
);
create index price_check_lines_market_idx on chj.price_check_lines (item_id, created_at) where shared;

alter table chj.price_checks enable row level security;
alter table chj.price_check_lines enable row level security;

-- 대화 턴·세션 결과에 가격 한 줄 진단을 더한다(API-01 check_price)
alter table chj.turns drop constraint if exists turns_kind_check;
alter table chj.turns add constraint turns_kind_check check (kind in ('text','choice','ask','notice','results','price_check'));
alter table chj.sessions drop constraint if exists sessions_outcome_check;
alter table chj.sessions add constraint sessions_outcome_check check (outcome in ('results','out_of_scope_item','off_topic','ai_failed','abandoned','price_check'));

-- API-15·API-01: 진단 1건과 줄을 한 트랜잭션으로. 진단 id를 돌려준다
create or replace function public.chj_log_price_check(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_device uuid := (p->>'device_id')::uuid; v_id uuid := coalesce((p->>'check_id')::uuid, gen_random_uuid());
begin
  perform chj.ensure_device(v_device, (p->>'is_test')::boolean);
  insert into chj.price_checks (id, device_id, session_id, source, doc_type, seller_type, location_id, purchased_on, delivery_fee_won, ai_mode, model)
  values (v_id, v_device, chj.existing_session((p->>'session_id')::uuid), p->>'source', p->>'doc_type', p->>'seller_type', p->>'location_id',
          (p->>'purchased_on')::date, (p->>'delivery_fee_won')::int, p->>'ai_mode', p->>'model');
  insert into chj.price_check_lines (check_id, line_no, item_id, qty_kg, amount_won, price_per_kg, comparable, verdict)
  select v_id, l.line_no, l.item_id, l.qty_kg, l.amount_won, l.price_per_kg, l.comparable, l.verdict
    from jsonb_to_recordset(coalesce(p->'lines', '[]'::jsonb))
      as l(line_no int, item_id text, qty_kg numeric, amount_won int, price_per_kg int, comparable boolean, verdict text);
  return v_id;
end $$;

-- API-16: 같은 기기가 만든 진단만, 비교 가능한 줄만 shared. 바꾼 줄 수, 없거나 다른 기기면 -1
create or replace function public.chj_share_price_check(p jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if not exists (select 1 from chj.price_checks where id = (p->>'check_id')::uuid and device_id = (p->>'device_id')::uuid) then
    return -1;
  end if;
  update chj.price_check_lines set shared = true
   where check_id = (p->>'check_id')::uuid and comparable and item_id = coalesce(p->>'item_id', item_id);
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- R-18: 최근 days일 동의한 줄의 kg당 가격 목록
create or replace function public.chj_market_samples(p jsonb) returns integer[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(price_per_kg order by price_per_kg), '{}')
    from chj.price_check_lines
   where shared and item_id = p->>'item_id' and created_at > now() - make_interval(days => coalesce((p->>'days')::int, 30));
$$;

revoke all on function public.chj_log_price_check(jsonb), public.chj_share_price_check(jsonb), public.chj_market_samples(jsonb) from public, anon, authenticated;
grant execute on function public.chj_log_price_check(jsonb), public.chj_share_price_check(jsonb), public.chj_market_samples(jsonb) to service_role;
