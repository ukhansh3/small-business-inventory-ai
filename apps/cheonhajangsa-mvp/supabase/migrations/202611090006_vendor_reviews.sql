begin;
create table if not exists public.chj_vendor_reviews (
  id text primary key default gen_random_uuid()::text,
  vendor_id text not null check (length(vendor_id) between 1 and 160),
  user_id uuid references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (vendor_id, user_id)
);
create index if not exists chj_vendor_reviews_vendor_idx on public.chj_vendor_reviews(vendor_id, created_at desc);
alter table public.chj_vendor_reviews enable row level security;
revoke all on public.chj_vendor_reviews from anon, authenticated;
grant select, insert, update on public.chj_vendor_reviews to service_role;
insert into public.chj_vendor_reviews (id,vendor_id,rating,body) values
('demo-review-produce-1','demo-produce',5,'아침에 받은 채소 상태가 좋았어요. 잎채소도 시들지 않고 왔습니다.'),
('demo-review-produce-2','demo-produce',4,'소량 주문도 받아줘서 편했어요. 마감 시간은 미리 확인하는 게 좋겠어요.'),
('demo-review-oil-1','demo-oil',5,'약속한 시간에 와서 수거해 갔고, 통 주변도 깔끔하게 정리해 줬어요.'),
('demo-review-oil-2','demo-oil',4,'수거 일정 조율이 편했어요. 주말보다 평일에 연락이 빨랐습니다.'),
('demo-review-interior-1','demo-interior',5,'작은 매장인데도 동선을 꼼꼼히 봐줬어요. 견적 항목도 이해하기 쉬웠습니다.'),
('demo-review-packs-1','demo-packs',4,'배달 용기 샘플을 보고 고를 수 있어서 좋았어요. 뚜껑도 잘 맞았습니다.')
on conflict (id) do nothing;
commit;
