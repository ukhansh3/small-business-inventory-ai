-- 0001 MVP 기록 표. 원천: docs/planning/DB아키텍처.md 3.1(표 정의 그대로) + 3.4(서버 기록 함수).
-- Supabase SQL Editor에 이 파일 전체를 붙여 한 번 실행한다.

create extension if not exists pgcrypto;
create schema if not exists chj;

-- updated_at 자동 갱신
create or replace function chj.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- E-05 기기
create table chj.devices (
  id              uuid primary key,                 -- 앱이 만든 uuid
  location_id     text not null default 'loc_ajou_main',  -- MVP: 파일의 위치 id
  business_type   text check (business_type is null or length(business_type) <= 30),
  is_test         boolean not null default false,
  first_seen_at   timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger devices_touch before update on chj.devices
  for each row execute function chj.touch_updated_at();

-- E-06 대화 세션
create table chj.sessions (
  id              uuid primary key default gen_random_uuid(),
  device_id       uuid not null references chj.devices(id),
  ai_mode         text not null check (ai_mode in ('live','stored')),
  model           text not null,
  prompt_version  text not null,
  data_version    text not null,                    -- 데이터 파일 버전(커밋·해시)
  outcome         text check (outcome in ('results','out_of_scope_item','off_topic','ai_failed','abandoned')),
  ai_calls        smallint not null default 0 check (ai_calls between 0 and 6),
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);
create index sessions_device_started_idx on chj.sessions (device_id, started_at desc);
create trigger sessions_touch before update on chj.sessions
  for each row execute function chj.touch_updated_at();

-- E-07 대화 턴
create table chj.turns (
  session_id      uuid not null references chj.sessions(id) on delete cascade,
  seq             integer not null check (seq >= 0),
  role            text not null check (role in ('user','assistant')),
  kind            text not null check (kind in ('text','choice','ask','notice','results')),
  input_method    text check (input_method in ('typed','voice')),   -- voice는 [다음]
  text            text check (text is null or length(text) <= 1000),
  ask_slot        text check (ask_slot in ('qty_kg','urgency','fulfillment')),
  options         jsonb,
  chosen          text,
  latency_ms      integer check (latency_ms is null or latency_ms >= 0),
  created_at      timestamptz not null default now(),
  primary key (session_id, seq),
  check (role = 'user' or input_method is null),
  check (kind <> 'ask' or (ask_slot is not null and options is not null)),
  check (kind <> 'choice' or ask_slot is not null)
);

-- E-08 조건(버전)
create table chj.conditions (
  session_id      uuid not null references chj.sessions(id) on delete cascade,
  version         integer not null check (version >= 1),
  item_id         text not null,                    -- MVP: 파일의 품목 id
  qty_kg          numeric(5,2) check (qty_kg is null or qty_kg between 0.5 and 50),
  urgency         text not null check (urgency in ('now','today','tomorrow')),
  fulfillment     text not null check (fulfillment in ('pickup','delivery')),
  location_id     text not null,
  field_source    jsonb not null,                   -- 칸마다 said/asked/default/edited
  created_at      timestamptz not null default now(),
  primary key (session_id, version)
);

-- E-09 도구 호출
create table chj.tool_calls (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid not null references chj.sessions(id) on delete cascade,
  condition_version  integer,
  tool               text not null check (tool in ('search_vendors')),
  input              jsonb not null,
  result_vendor_ids  text[] not null default '{}',
  result_count       integer not null default 0 check (result_count >= 0),
  status             text not null check (status in ('ok','invalid_input','error')),
  latency_ms         integer not null check (latency_ms >= 0),
  called_by          text not null check (called_by in ('ai','user_edit')),
  created_at         timestamptz not null default now(),
  foreign key (session_id, condition_version) references chj.conditions(session_id, version)
);
create index tool_calls_session_idx on chj.tool_calls (session_id, created_at);

-- E-10 행동 기록
create table chj.events (
  id               uuid primary key default gen_random_uuid(),
  device_id        uuid not null references chj.devices(id),
  client_event_id  uuid not null,
  session_id       uuid references chj.sessions(id) on delete set null,
  type             text not null check (type in ('app_open','location_set','condition_edit','vendor_view','call_click','request_item','restart')),
  vendor_id        text,
  payload          jsonb not null default '{}',
  created_at       timestamptz not null default now(),
  unique (device_id, client_event_id),
  check (type not in ('call_click','vendor_view') or vendor_id is not null)
);
create index events_type_created_idx on chj.events (type, created_at);
create index events_device_idx on chj.events (device_id, created_at);

-- E-12 품목 요청
create table chj.item_requests (
  id               uuid primary key default gen_random_uuid(),
  device_id        uuid not null references chj.devices(id),
  session_id       uuid references chj.sessions(id) on delete set null,
  requested_text   text not null check (length(requested_text) between 1 and 50),
  matched_item_id  text,
  created_at       timestamptz not null default now()
);
-- 같은 기기의 같은 품목 요청은 1건(확장 요청 비율이 부풀지 않게)
create unique index item_requests_device_item_uidx
  on chj.item_requests (device_id, coalesce(matched_item_id, lower(requested_text)));

-- 하루 AI 호출 수(한도 판정)
create table chj.ai_usage_daily (
  usage_date  date primary key,                    -- 한국 날짜
  calls       integer not null default 0 check (calls >= 0)
);

-- 한도 판정용: 원자적으로 1 올리고 올린 값을 돌려준다
create or replace function chj.bump_ai_usage(p_date date) returns integer
language sql as $$
  insert into chj.ai_usage_daily (usage_date, calls) values (p_date, 1)
  on conflict (usage_date) do update set calls = chj.ai_usage_daily.calls + 1
  returning calls;
$$;

-- 보안: 모든 표 RLS 켜고 정책 없음 → 공개 키로는 접근 불가. 서버(서비스 키)만 접근.
alter table chj.devices        enable row level security;
alter table chj.sessions       enable row level security;
alter table chj.turns          enable row level security;
alter table chj.conditions     enable row level security;
alter table chj.tool_calls     enable row level security;
alter table chj.events         enable row level security;
alter table chj.item_requests  enable row level security;
alter table chj.ai_usage_daily enable row level security;
revoke all on schema chj from anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3.4 서버 기록 함수(RPC) [MVP]
-- chj 스키마는 Data API에 노출하지 않는다. 서버는 서비스 키로 아래 public 함수만 부른다.
-- 함수는 security definer로 chj에 쓰고, 실행 권한은 service_role에만 준다.
-- 한 API의 여러 표 쓰기를 함수 하나(한 트랜잭션)로 묶는다(DB아키텍처 5절).
-- ─────────────────────────────────────────────────────────────

-- 기기가 없으면 만들고(true), 있으면 last_seen_at만 갱신(false)
create or replace function chj.ensure_device(p_device_id uuid, p_is_test boolean) returns boolean
language plpgsql set search_path = '' as $$
declare v_new boolean;
begin
  insert into chj.devices (id, is_test) values (p_device_id, coalesce(p_is_test, false))
  on conflict (id) do update set last_seen_at = now()
  returning (xmax = 0) into v_new;
  return v_new;
end $$;

-- 세션이 없으면 만든다(앱이 세션을 들고 다니므로 첫 기록 때 생성, consistency-report C9)
create or replace function chj.ensure_session(p_device_id uuid, s jsonb) returns void
language plpgsql set search_path = '' as $$
begin
  insert into chj.sessions (id, device_id, ai_mode, model, prompt_version, data_version)
  values ((s->>'id')::uuid, p_device_id, s->>'ai_mode', s->>'model', s->>'prompt_version', s->>'data_version')
  on conflict (id) do nothing;
end $$;

create or replace function chj.insert_condition(p_session uuid, c jsonb) returns void
language plpgsql set search_path = '' as $$
begin
  if c is null or jsonb_typeof(c) = 'null' then return; end if;
  insert into chj.conditions (session_id, version, item_id, qty_kg, urgency, fulfillment, location_id, field_source)
  values (p_session, (c->>'version')::int, c->>'item_id', (c->>'qty_kg')::numeric, c->>'urgency', c->>'fulfillment',
          c->>'location_id', coalesce(c->'field_source', '{}'::jsonb))
  on conflict (session_id, version) do nothing;
end $$;

create or replace function chj.insert_tool_call(p_session uuid, p_version int, t jsonb) returns void
language plpgsql set search_path = '' as $$
begin
  if t is null or jsonb_typeof(t) = 'null' then return; end if;
  insert into chj.tool_calls (session_id, condition_version, tool, input, result_vendor_ids, result_count, status, latency_ms, called_by)
  values (p_session, p_version, 'search_vendors', t->'input',
          coalesce(array(select jsonb_array_elements_text(t->'result_vendor_ids')), '{}'),
          coalesce((t->>'result_count')::int, 0), t->>'status', (t->>'latency_ms')::int, t->>'called_by');
end $$;

-- 세션이 있을 때만 그 id를 쓴다(없는 세션을 가리키는 기록 방지)
create or replace function chj.existing_session(p uuid) returns uuid
language sql stable set search_path = '' as $$
  select id from chj.sessions where id = p;
$$;

-- API-06 기기 등록: 기기 + app_open
create or replace function public.chj_register_device(p_device_id uuid, p_is_test boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_new boolean; d chj.devices;
begin
  v_new := chj.ensure_device(p_device_id, p_is_test);
  insert into chj.events (device_id, client_event_id, type) values (p_device_id, gen_random_uuid(), 'app_open');
  select * into d from chj.devices where id = p_device_id;
  return jsonb_build_object('is_new', v_new, 'location_id', d.location_id, 'business_type', d.business_type);
end $$;

-- API-01 한 턴: 세션, 턴(사장님·앱), 조건, 도구 호출
create or replace function public.chj_log_turn(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare v_device uuid := (p->>'device_id')::uuid; v_session uuid := (p->'session'->>'id')::uuid;
begin
  perform chj.ensure_device(v_device, (p->>'is_test')::boolean);
  perform chj.ensure_session(v_device, p->'session');
  update chj.sessions
     set ai_calls = least(ai_calls + case when (p->>'ai_called')::boolean then 1 else 0 end, 6),
         outcome = coalesce(p->>'outcome', outcome)
   where id = v_session;
  insert into chj.turns (session_id, seq, role, kind, input_method, text, ask_slot, options, chosen, latency_ms)
  select v_session, t.seq, t.role, t.kind, t.input_method, t.text, t.ask_slot, t.options, t.chosen, t.latency_ms
    from jsonb_to_recordset(p->'turns') as t(seq int, role text, kind text, input_method text, text text,
                                             ask_slot text, options jsonb, chosen text, latency_ms int)
  on conflict (session_id, seq) do nothing;
  perform chj.insert_condition(v_session, p->'condition');
  perform chj.insert_tool_call(v_session, (p->'condition'->>'version')::int, p->'tool_call');
end $$;

-- API-02 칩 수정 검색: 조건 새 버전, 도구 호출(user_edit), condition_edit
create or replace function public.chj_log_search(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare v_device uuid := (p->>'device_id')::uuid; v_session uuid := (p->'session'->>'id')::uuid;
begin
  perform chj.ensure_device(v_device, (p->>'is_test')::boolean);
  perform chj.ensure_session(v_device, p->'session');
  update chj.sessions set outcome = 'results' where id = v_session;
  perform chj.insert_condition(v_session, p->'condition');
  perform chj.insert_tool_call(v_session, (p->'condition'->>'version')::int, p->'tool_call');
  insert into chj.events (device_id, client_event_id, session_id, type, payload)
  values (v_device, gen_random_uuid(), v_session, 'condition_edit', jsonb_build_object('changed', coalesce(p->'changed', '[]'::jsonb)));
end $$;

-- API-04 행동 기록. 같은 client_event_id는 한 번만. restart면 세션을 닫는다.
create or replace function public.chj_log_event(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare v_device uuid := (p->>'device_id')::uuid; v_session uuid := chj.existing_session((p->>'session_id')::uuid);
begin
  perform chj.ensure_device(v_device, (p->>'is_test')::boolean);
  insert into chj.events (device_id, client_event_id, session_id, type, vendor_id, payload)
  values (v_device, (p->>'client_event_id')::uuid, v_session, p->>'type', p->>'vendor_id', coalesce(p->'payload', '{}'::jsonb))
  on conflict (device_id, client_event_id) do nothing;
  if p->>'type' = 'restart' and v_session is not null then
    update chj.sessions set ended_at = coalesce(ended_at, now()), outcome = coalesce(outcome, 'abandoned') where id = v_session;
  end if;
end $$;

-- API-05 품목 요청. 같은 기기·품목이면 기존 건을 돌려준다.
create or replace function public.chj_request_item(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_device uuid := (p->>'device_id')::uuid; v_session uuid := chj.existing_session((p->>'session_id')::uuid); v_id uuid;
begin
  perform chj.ensure_device(v_device, (p->>'is_test')::boolean);
  insert into chj.item_requests (device_id, session_id, requested_text, matched_item_id)
  values (v_device, v_session, p->>'requested_text', p->>'matched_item_id')
  on conflict (device_id, coalesce(matched_item_id, lower(requested_text))) do nothing
  returning id into v_id;
  if v_id is not null then
    insert into chj.events (device_id, client_event_id, session_id, type, payload)
    values (v_device, gen_random_uuid(), v_session, 'request_item', jsonb_build_object('request_id', v_id));
    return jsonb_build_object('request_id', v_id, 'created', true);
  end if;
  select id into v_id from chj.item_requests
   where device_id = v_device and coalesce(matched_item_id, lower(requested_text)) = coalesce(p->>'matched_item_id', lower(p->>'requested_text'));
  return jsonb_build_object('request_id', v_id, 'created', false);
end $$;

-- 실행 권한: service_role만
revoke all on function public.chj_register_device(uuid, boolean), public.chj_log_turn(jsonb), public.chj_log_search(jsonb),
                       public.chj_log_event(jsonb), public.chj_request_item(jsonb) from public, anon, authenticated;
grant execute on function public.chj_register_device(uuid, boolean), public.chj_log_turn(jsonb), public.chj_log_search(jsonb),
                          public.chj_log_event(jsonb), public.chj_request_item(jsonb) to service_role;
