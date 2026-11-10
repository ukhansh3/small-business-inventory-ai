begin;
create table if not exists public.chj_demo_stores (
 store_id text primary key,
 name text not null,
 category text not null,
 service text not null,
 lat double precision not null check (lat between -90 and 90),
 lng double precision not null check (lng between -180 and 180)
);
alter table public.chj_demo_stores enable row level security;
revoke all on public.chj_demo_stores from public, anon, authenticated;
grant select on public.chj_demo_stores to service_role;
insert into public.chj_demo_stores values
('demo-produce','새봄 농산물','식자재','채소 · 야채 · 과일',37.282,127.047),
('demo-meat','온들 식자재','식자재','정육 · 냉동식품',37.285,127.041),
('demo-packs','담음 포장상회','포장·소모품','배달용기 · 일회용품',37.280,127.049),
('demo-hygiene','마루 위생상사','포장·소모품','주방세제 · 위생용품',37.286,127.052),
('demo-repair','다온 주방기기','주방기기·수리','제빙기 · 업소용 냉장고 수리',37.278,127.047),
('demo-kitchen','한결 주방설비','주방기기·수리','식기세척기 · 중고 주방기기',37.289,127.044),
('demo-interior','모서리 공간공방','인테리어·시설','상가 인테리어 · 간판',37.281,127.043),
('demo-facility','바른 매장설비','인테리어·시설','전기 · 배관 · 가스 · 냉난방',37.284,127.054),
('demo-clean','맑은 주방케어','청소·방역','주방 청소 · 후드 · 덕트 청소',37.276,127.050),
('demo-pest','푸른 방역서비스','청소·방역','해충 방제 · 정화조 관리',37.290,127.050),
('demo-oil','다시쓰는 오일수거','폐기물·수거','폐식용유 수거 · 폐유',37.279,127.044),
('demo-waste','가온 자원수거','폐기물·수거','음식물쓰레기 수거 · 폐업 집기 처리',37.287,127.046),
('demo-pos','한칸 매장솔루션','매장 운영','POS · 키오스크 · 카드단말기',37.283,127.051),
('demo-ops','든든 매장지원','매장 운영','CCTV · 세무 · 노무',37.288,127.055)
on conflict (store_id) do nothing;
commit;
