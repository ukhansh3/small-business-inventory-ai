-- 0002 내 위치·업종 저장(API-07, WF-02). 원천: docs/planning/DB아키텍처.md 3.4. 0001을 실행한 뒤 한 번 실행한다.
-- 표는 바꾸지 않는다(devices.location_id·business_type은 0001에 있음). 함수 하나만 더한다.

-- API-07: 기기의 내 위치·업종을 바꾸고 location_set을 남긴다. 넘긴 칸만 바꾼다.
create or replace function public.chj_set_device(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare v_device uuid := (p->>'device_id')::uuid;
begin
  perform chj.ensure_device(v_device, (p->>'is_test')::boolean);
  update chj.devices
     set location_id   = coalesce(p->>'location_id', location_id),
         business_type = case when p ? 'business_type' then nullif(p->>'business_type', '') else business_type end
   where id = v_device;
  insert into chj.events (device_id, client_event_id, type, payload)
  values (v_device, gen_random_uuid(), 'location_set',
          jsonb_strip_nulls(jsonb_build_object('location_id', p->>'location_id', 'business_type', p->>'business_type')));
end $$;

revoke all on function public.chj_set_device(jsonb) from public, anon, authenticated;
grant execute on function public.chj_set_device(jsonb) to service_role;
