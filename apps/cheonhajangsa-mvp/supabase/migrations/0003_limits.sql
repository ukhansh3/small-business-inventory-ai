-- 0003 호출 한도(P2-2, API 명세 1.5). 원천: docs/planning/DB아키텍처.md 3.4. 0001·0002 뒤에 한 번 실행한다.
-- 표는 바꾸지 않는다. 한도 판정 함수 하나를 더하고, 행동 기록 함수가 분당 한도를 넘으면 false를 돌려주게 바꾼다.

-- API-01 한도 판정: 기기별 최근 1시간 사장님 턴 수, 세션 AI 호출 수, 하루 AI 호출 수(한국 날짜).
-- AI를 부를 차례이고 시간·세션 한도 안이면 하루 호출 수를 원자적으로 1 올린다(bump_ai_usage).
create or replace function public.chj_ai_gate(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_device uuid := (p->>'device_id')::uuid;
  v_session uuid := (p->>'session_id')::uuid;
  v_date date := (p->>'usage_date')::date;
  v_hour int; v_sess int; v_daily int;
begin
  select count(*) into v_hour
    from chj.turns t join chj.sessions s on s.id = t.session_id
   where s.device_id = v_device and t.role = 'user' and t.created_at > now() - interval '1 hour';
  select coalesce((select ai_calls from chj.sessions where id = v_session), 0) into v_sess;
  if (p->>'ai_call')::boolean and v_hour < (p->>'hour_limit')::int and v_sess < (p->>'session_limit')::int then
    v_daily := chj.bump_ai_usage(v_date);
  else
    select coalesce((select calls from chj.ai_usage_daily where usage_date = v_date), 0) into v_daily;
  end if;
  return jsonb_build_object('hour_turns', v_hour, 'session_ai_calls', v_sess, 'daily_calls', v_daily);
end $$;

-- API-04: 기기별 분당 한도(기본 120)를 넘으면 기록하지 않고 false
drop function if exists public.chj_log_event(jsonb);
create function public.chj_log_event(p jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_device uuid := (p->>'device_id')::uuid; v_session uuid := chj.existing_session((p->>'session_id')::uuid);
begin
  perform chj.ensure_device(v_device, (p->>'is_test')::boolean);
  if (select count(*) from chj.events where device_id = v_device and created_at > now() - interval '1 minute')
     >= coalesce((p->>'minute_limit')::int, 120) then
    return false;
  end if;
  insert into chj.events (device_id, client_event_id, session_id, type, vendor_id, payload)
  values (v_device, (p->>'client_event_id')::uuid, v_session, p->>'type', p->>'vendor_id', coalesce(p->'payload', '{}'::jsonb))
  on conflict (device_id, client_event_id) do nothing;
  if p->>'type' = 'restart' and v_session is not null then
    update chj.sessions set ended_at = coalesce(ended_at, now()), outcome = coalesce(outcome, 'abandoned') where id = v_session;
  end if;
  return true;
end $$;

revoke all on function public.chj_ai_gate(jsonb), public.chj_log_event(jsonb) from public, anon, authenticated;
grant execute on function public.chj_ai_gate(jsonb), public.chj_log_event(jsonb) to service_role;
