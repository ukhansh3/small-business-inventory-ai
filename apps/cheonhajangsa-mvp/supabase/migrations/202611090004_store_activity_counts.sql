create or replace function public.chj_store_activity_counts(p_location_id text)
returns table (vendor_id text, used_count bigint, saved_count bigint)
language sql stable security invoker set search_path = ''
as $$
  select activity.vendor_id, count(*) filter (where used), count(*) filter (where not used)
  from (
    select vendor_id, true as used from public.chj_used_vendors where location_id = p_location_id
    union all
    select vendor_id, false as used from public.chj_saved_vendors where location_id = p_location_id
  ) as activity
  group by activity.vendor_id;
$$;
revoke execute on function public.chj_store_activity_counts(text) from public, anon, authenticated;
grant execute on function public.chj_store_activity_counts(text) to service_role;
