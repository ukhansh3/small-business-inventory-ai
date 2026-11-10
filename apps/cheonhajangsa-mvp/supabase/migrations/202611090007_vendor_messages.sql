begin;
create table public.chj_vendor_owners (
  vendor_id text primary key,
  user_id uuid not null references auth.users(id)
);
create table public.chj_vendor_threads (
  id uuid primary key default gen_random_uuid(),
  vendor_id text not null references public.chj_vendor_owners(vendor_id),
  vendor_name text not null,
  customer_id uuid not null references auth.users(id),
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (vendor_id, customer_id, owner_id),
  check (customer_id <> owner_id)
);
create table public.chj_vendor_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chj_vendor_threads(id),
  sender_id uuid not null references auth.users(id),
  body text not null check (length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index on public.chj_vendor_threads (customer_id);
create index on public.chj_vendor_threads (owner_id);
create index on public.chj_vendor_messages (thread_id, created_at desc, id desc);
alter table public.chj_vendor_owners enable row level security;
alter table public.chj_vendor_threads enable row level security;
alter table public.chj_vendor_messages enable row level security;
revoke all on public.chj_vendor_owners, public.chj_vendor_threads, public.chj_vendor_messages from anon, authenticated;
grant select on public.chj_vendor_owners to service_role;
grant select, insert, update on public.chj_vendor_threads to service_role;
grant select, insert on public.chj_vendor_messages to service_role;
commit;
