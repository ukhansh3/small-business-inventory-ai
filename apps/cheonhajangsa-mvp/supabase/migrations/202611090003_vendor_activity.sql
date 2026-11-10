begin;
alter table public.chj_saved_vendors add column location_id text;
create index chj_saved_vendors_location_idx on public.chj_saved_vendors (vendor_id, location_id);
create table public.chj_used_vendors (
  user_id uuid not null references auth.users(id) on delete cascade,
  vendor_id text not null check (length(vendor_id) between 1 and 160),
  location_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, vendor_id)
);
create index chj_used_vendors_location_idx on public.chj_used_vendors (vendor_id, location_id);
alter table public.chj_used_vendors enable row level security;
revoke all on public.chj_used_vendors from anon, authenticated;
grant select, insert, update on public.chj_used_vendors to service_role;
commit;
