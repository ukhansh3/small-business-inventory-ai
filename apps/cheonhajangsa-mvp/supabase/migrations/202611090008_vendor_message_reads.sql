alter table public.chj_vendor_messages add column if not exists read_at timestamptz;
grant update (read_at) on public.chj_vendor_messages to service_role;
create index if not exists chj_vendor_messages_unread_idx
  on public.chj_vendor_messages (thread_id, sender_id) where read_at is null;
