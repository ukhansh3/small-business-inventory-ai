-- 0005 동네 시세에서 테스트 기기 제외(v2 R-18). 0004 뒤에 한 번 실행한다. 표 변경 없음.
-- 팀원·리허설·자동 테스트 기기(devices.is_test)가 보탠 가격은 시세 표본에 넣지 않는다.
create or replace function public.chj_market_samples(p jsonb) returns integer[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(l.price_per_kg order by l.price_per_kg), '{}')
    from chj.price_check_lines l
    join chj.price_checks c on c.id = l.check_id
    join chj.devices d on d.id = c.device_id
   where l.shared and not d.is_test and l.item_id = p->>'item_id'
     and l.created_at > now() - make_interval(days => coalesce((p->>'days')::int, 30));
$$;

revoke all on function public.chj_market_samples(jsonb) from public, anon, authenticated;
grant execute on function public.chj_market_samples(jsonb) to service_role;
