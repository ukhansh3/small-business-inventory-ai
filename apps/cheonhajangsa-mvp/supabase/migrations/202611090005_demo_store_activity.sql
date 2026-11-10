begin;
create table if not exists public.chj_demo_store_activity (
  actor_id integer not null check (actor_id between 1 and 15),
  vendor_id text not null references public.chj_demo_stores(store_id),
  location_id text not null,
  used boolean not null,
  saved boolean not null,
  primary key (actor_id, vendor_id, location_id)
);
alter table public.chj_demo_store_activity enable row level security;
revoke all on public.chj_demo_store_activity from anon, authenticated;
grant select on public.chj_demo_store_activity to service_role;

insert into public.chj_demo_store_activity
select actor, vendor_id, 'loc_ajou_main', actor <= uses, actor > 15 - saves
from (values
  ('demo-produce',9,6), ('demo-oil',7,10), ('demo-packs',6,8), ('demo-interior',3,5),
  ('demo-meat',8,5), ('demo-clean',4,7), ('demo-repair',3,6), ('demo-pos',2,4)
) as examples(vendor_id,uses,saves)
cross join generate_series(1,15) as people(actor)
where actor <= uses or actor > 15 - saves
on conflict (actor_id,vendor_id,location_id) do update set used=excluded.used,saved=excluded.saved;

create or replace function public.chj_store_activity_counts(p_location_id text)
returns table (vendor_id text, used_count bigint, saved_count bigint)
language sql stable security invoker set search_path = ''
as $$
  select activity.vendor_id, count(*) filter (where used), count(*) filter (where saved)
  from (
    select vendor_id, true as used, false as saved from public.chj_used_vendors where location_id = p_location_id
    union all
    select vendor_id, false, true from public.chj_saved_vendors where location_id = p_location_id
    union all
    select vendor_id, used, saved from public.chj_demo_store_activity where location_id = p_location_id
  ) as activity
  group by activity.vendor_id;
$$;
commit;
