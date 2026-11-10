-- 승인된 MVP 정책: 닉네임, 3개 분류, 삭제 상태 전이, 신고 수동 검토.
-- 민혁 지도/검색 테이블과 분리된 회원 기능. Supabase SQL Editor에서 별도 적용한다.
begin;
create table public.chj_community_posts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 category text not null check(category in ('구매처 질문','가격 제보','거래 경험')),
 title text not null check(length(title) between 1 and 100), body text not null check(length(body) between 1 and 5000),
 nickname text not null, status text not null default 'published' check(status in ('published','hidden','deleted')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on public.chj_community_posts(status,created_at desc);
create table public.chj_community_comments (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.chj_community_posts(id),
 user_id uuid not null references auth.users(id), nickname text not null,
 body text not null check(length(body) between 1 and 1000), status text not null default 'published' check(status in ('published','deleted')),
 created_at timestamptz not null default now()
);
create index on public.chj_community_comments(post_id,created_at);
create table public.chj_community_reactions (
 user_id uuid not null references auth.users(id), post_id uuid not null references public.chj_community_posts(id),
 kind text not null check(kind in ('like','bookmark')), created_at timestamptz not null default now(),
 primary key(user_id,post_id,kind)
);
create table public.chj_community_reports (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 post_id uuid not null references public.chj_community_posts(id), reason text not null check(length(reason) between 1 and 1000),
 status text not null default 'pending' check(status in ('pending','reviewed')),created_at timestamptz not null default now(),
 unique(user_id,post_id)
);
-- 지도 원천 ID는 uuid뿐 아니라 v_001 및 공공데이터 ID도 사용한다.
create table public.chj_saved_vendors (
 user_id uuid not null references auth.users(id), vendor_id text not null check(length(vendor_id) between 1 and 160),
 created_at timestamptz not null default now(),primary key(user_id,vendor_id)
);
alter table public.chj_community_posts enable row level security;
alter table public.chj_community_comments enable row level security;
alter table public.chj_community_reactions enable row level security;
alter table public.chj_community_reports enable row level security;
alter table public.chj_saved_vendors enable row level security;
-- 소유권을 검증하는 서버를 통해서만 접근한다. 클라이언트 직접 조작은 허용하지 않는다.
revoke all on public.chj_community_posts,public.chj_community_comments,public.chj_community_reactions,public.chj_community_reports,public.chj_saved_vendors from anon,authenticated;
grant select,insert,update,delete on public.chj_community_posts,public.chj_community_comments,public.chj_community_reactions,public.chj_community_reports,public.chj_saved_vendors to service_role;
commit;
