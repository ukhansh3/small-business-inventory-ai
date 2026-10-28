-- 민균: 업체 직접 등록, 검토 후 공개. Shared DB application requires a reviewed migration.
begin;
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated, service_role;

create table public.profiles (
 id uuid primary key references auth.users(id),
 display_name text not null default '' check (length(display_name)<=60),
 created_at timestamptz not null default now()
);
create table app_private.staff_roles (
 user_id uuid primary key references auth.users(id),
 role text not null check (role in ('moderator','admin')),
 created_at timestamptz not null default now()
);
alter table app_private.staff_roles enable row level security;
revoke all on app_private.staff_roles from public, anon, authenticated;

create table public.vendors (
 id uuid primary key default gen_random_uuid(),
 created_by uuid not null references auth.users(id),
 creation_key uuid not null,
 current_revision_id uuid,
 hidden boolean not null default false,
 created_at timestamptz not null default now(),
 unique(created_by,creation_key)
);
create table public.vendor_members (
 vendor_id uuid not null references public.vendors(id),
 user_id uuid not null references auth.users(id),
 role text not null default 'owner' check(role='owner'),
 primary key(vendor_id,user_id)
);
create table public.vendor_revisions (
 id uuid primary key default gen_random_uuid(),
 vendor_id uuid not null references public.vendors(id),
 created_by uuid not null references auth.users(id),
 version integer not null default 1 check(version>0),
 status text not null default 'draft' check(status in ('draft','pending_review','changes_requested','approved')),
 name text not null default '' check(length(name)<=100),
 description text not null default '' check(length(description)<=2000),
 category text not null default '' check(length(category)<=60),
 contact text not null default '' check(length(contact)<=100),
 address text not null default '' check(length(address)<=200),
 latitude double precision check(latitude between -90 and 90),
 longitude double precision check(longitude between -180 and 180),
 location extensions.geography(point,4326) generated always as
  (case when latitude is not null and longitude is not null then extensions.st_setsrid(extensions.st_makepoint(longitude,latitude),4326)::extensions.geography end) stored,
 geocoded_at timestamptz,
 opening_hours text not null default '' check(length(opening_hours)<=500),
 fulfillment text not null default '' check(fulfillment in ('','pickup','delivery','both')),
 delivery_terms text not null default '' check(length(delivery_terms)<=1000),
 submitted_at timestamptz,
 reviewed_at timestamptz,
 reviewed_by uuid references auth.users(id),
 owner_message text check(length(owner_message)<=1000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(id,vendor_id),
 check((latitude is null)=(longitude is null))
);
create unique index vendor_one_open_revision on public.vendor_revisions(vendor_id) where status<>'approved';
alter table public.vendors add constraint current_revision_same_vendor foreign key(current_revision_id,id) references public.vendor_revisions(id,vendor_id) deferrable initially deferred;
create function app_private.guard_public_pointer() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.current_revision_id is not null and not exists(select 1 from public.vendor_revisions r where r.id=new.current_revision_id and r.vendor_id=new.id and r.status='approved') then raise exception 'INVALID_PUBLIC_REVISION'; end if;
 return new;
end; $$;
create trigger current_revision_approved before insert or update on public.vendors for each row execute function app_private.guard_public_pointer();
create index vendor_revision_location on public.vendor_revisions using gist(location);
create index vendor_revision_review_queue on public.vendor_revisions(status,submitted_at,id);
create index vendor_member_user on public.vendor_members(user_id,vendor_id);
create table public.vendor_items (
 id uuid primary key default gen_random_uuid(),
 vendor_id uuid not null references public.vendors(id),
 unique(id,vendor_id)
);
create table public.item_revisions (
 id uuid primary key default gen_random_uuid(),
 revision_id uuid not null,
 vendor_id uuid not null,
 item_id uuid not null,
 name text not null default '' check(length(name)<=100),
 category text not null default '' check(length(category)<=60),
 specification text not null default '' check(length(specification)<=200),
 quantity numeric check(quantity>0 and quantity<=1000000),
 unit text not null default '' check(length(unit)<=20),
 price bigint check(price>0 and price<=1000000000000),
 currency text not null default 'KRW' check(currency='KRW'),
 tax text not null default '' check(tax in ('','included','excluded','exempt')),
 minimum_packages integer check(minimum_packages>0 and minimum_packages<=1000000),
 delivery_fee bigint check(delivery_fee>=0 and delivery_fee<=1000000000000),
 delivery_fee_basis text not null default '' check(length(delivery_fee_basis)<=500),
 selling boolean not null default true,
 checked_on date,
 source_type text not null default 'vendor_provided' check(source_type='vendor_provided'),
 provided_by uuid not null references auth.users(id),
 provided_at timestamptz not null default now(),
 foreign key(revision_id,vendor_id) references public.vendor_revisions(id,vendor_id),
 foreign key(item_id,vendor_id) references public.vendor_items(id,vendor_id),
 unique(revision_id,item_id)
);
create index item_revision_name on public.item_revisions(revision_id,name);
create table public.vendor_images (
 id uuid primary key default gen_random_uuid(),
 revision_id uuid not null references public.vendor_revisions(id),
 object_path text not null unique,
 position integer not null default 0 check(position>=0),
 is_cover boolean not null default false,
 created_at timestamptz not null default now()
);
create unique index vendor_image_one_cover on public.vendor_images(revision_id) where is_cover;
create table public.review_events (
 id uuid primary key default gen_random_uuid(),
 vendor_id uuid not null references public.vendors(id),
 revision_id uuid not null references public.vendor_revisions(id),
 revision_version integer not null,
 reviewer_id uuid not null references auth.users(id),
 action text not null check(action in ('approved','changes_requested','hidden','restored','withdrawn')),
 owner_message text not null default '' check(length(owner_message)<=1000),
 internal_note text not null default '' check(length(internal_note)<=2000),
 snapshot jsonb not null,
 created_at timestamptz not null default now()
);
create index review_event_vendor on public.review_events(vendor_id,created_at desc);

create function app_private.is_staff() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from app_private.staff_roles where user_id=auth.uid());
$$;
create function app_private.owns_vendor(p_vendor_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.vendor_members where vendor_id=p_vendor_id and user_id=auth.uid());
$$;
create function app_private.can_edit_revision(p_revision_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vendor_revisions r where r.id=p_revision_id and r.status in ('draft','changes_requested') and app_private.owns_vendor(r.vendor_id));
$$;
create function app_private.is_public_revision(p_revision_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vendors v join public.vendor_revisions r on r.id=v.current_revision_id where r.id=p_revision_id and r.status='approved' and not v.hidden);
$$;
revoke all on all functions in schema app_private from public;
grant execute on function app_private.is_staff(),app_private.owns_vendor(uuid),app_private.can_edit_revision(uuid),app_private.is_public_revision(uuid) to authenticated;

-- Tables are readable by their owners/staff, never directly writable by API users.
-- Published DTOs are returned by whitelisted RPCs instead of exposing revision history.
alter table public.profiles enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_members enable row level security;
alter table public.vendor_revisions enable row level security;
alter table public.vendor_items enable row level security;
alter table public.item_revisions enable row level security;
alter table public.vendor_images enable row level security;
alter table public.review_events enable row level security;
revoke all on public.profiles,public.vendors,public.vendor_members,public.vendor_revisions,public.vendor_items,public.item_revisions,public.vendor_images,public.review_events from public,anon,authenticated;
grant select on public.profiles,public.vendors,public.vendor_members,public.vendor_revisions,public.vendor_items,public.item_revisions,public.vendor_images,public.review_events to authenticated;
create policy own_profile on public.profiles for select to authenticated using(id=auth.uid());
create policy managed_vendors on public.vendors for select to authenticated using(app_private.owns_vendor(id) or app_private.is_staff());
create policy own_memberships on public.vendor_members for select to authenticated using(user_id=auth.uid() or app_private.is_staff());
create policy managed_revisions on public.vendor_revisions for select to authenticated using(app_private.owns_vendor(vendor_id) or app_private.is_staff());
create policy managed_items on public.vendor_items for select to authenticated using(app_private.owns_vendor(vendor_id) or app_private.is_staff());
create policy managed_item_revisions on public.item_revisions for select to authenticated using(app_private.owns_vendor(vendor_id) or app_private.is_staff());
create policy managed_images on public.vendor_images for select to authenticated using(exists(select 1 from public.vendor_revisions r where r.id=revision_id and (app_private.owns_vendor(r.vendor_id) or app_private.is_staff())));
-- Internal notes and snapshots are staff-only, even for the vendor's owner.
create policy staff_review_events on public.review_events for select to authenticated using(app_private.is_staff());

create function app_private.guard_revision_children() returns trigger language plpgsql security definer set search_path='' as $$
declare parent_status text; revision uuid;
begin
 revision:=case when tg_op='DELETE' then old.revision_id else new.revision_id end;
 select status into parent_status from public.vendor_revisions where id=revision for update;
 if parent_status is null or parent_status not in ('draft','changes_requested') then raise exception 'REVISION_LOCKED'; end if;
 if tg_op='UPDATE' and (new.revision_id<>old.revision_id or (tg_table_name='item_revisions' and to_jsonb(new)->>'vendor_id'<>to_jsonb(old)->>'vendor_id')) then raise exception 'INVALID_INPUT'; end if;
 return case when tg_op='DELETE' then old else new end;
end; $$;
create trigger item_revision_edit_guard before insert or update or delete on public.item_revisions for each row execute function app_private.guard_revision_children();
create trigger vendor_image_edit_guard before insert or update or delete on public.vendor_images for each row execute function app_private.guard_revision_children();
create function app_private.keep_approved_revision() returns trigger language plpgsql set search_path='' as $$
begin
 if old.status='approved' then raise exception 'REVISION_LOCKED'; end if;
 return case when tg_op='DELETE' then old else new end;
end; $$;
create trigger approved_revision_immutable before update or delete on public.vendor_revisions for each row execute function app_private.keep_approved_revision();
create function app_private.keep_review_event() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'AUDIT_IMMUTABLE'; end; $$;
create trigger review_event_immutable before update or delete on public.review_events for each row execute function app_private.keep_review_event();

create function app_private.revision_json(p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select (to_jsonb(r)-'location')||jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(i) order by i.id) from public.item_revisions i where i.revision_id=r.id),'[]'::jsonb),'images',coalesce((select jsonb_agg(to_jsonb(im) order by im.position,im.id) from public.vendor_images im where im.revision_id=r.id),'[]'::jsonb)) from public.vendor_revisions r where r.id=p_id;
$$;

create function public.save_vendor_draft(p_data jsonb,p_creation_key uuid,p_revision_id uuid default null,p_expected_version integer default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); v_id uuid; r public.vendor_revisions; item jsonb; item_uuid uuid;
begin
 if actor is null then raise exception 'UNAUTHENTICATED'; end if;
 if jsonb_typeof(p_data)<>'object' or jsonb_typeof(coalesce(p_data->'items','[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_data->'items','[]'::jsonb))>50 then raise exception 'INVALID_INPUT'; end if;
 if p_revision_id is null then
  if p_creation_key is null then raise exception 'INVALID_INPUT'; end if;
  -- Serialize same-user creation retries without blocking unrelated users.
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  select id into v_id from public.vendors where created_by=actor and creation_key=p_creation_key;
  if v_id is not null then
   select * into r from public.vendor_revisions where vendor_id=v_id and status<>'approved';
   if r.id is null then raise exception 'ALREADY_EXISTS'; end if;
   return app_private.revision_json(r.id);
  end if;
  insert into public.profiles(id) values(actor) on conflict do nothing;
  insert into public.vendors(created_by,creation_key) values(actor,p_creation_key) returning id into v_id;
  insert into public.vendor_members(vendor_id,user_id) values(v_id,actor);
  insert into public.vendor_revisions(vendor_id,created_by) values(v_id,actor) returning * into r;
 else
  select * into r from public.vendor_revisions where id=p_revision_id for update;
  if r.id is null or not app_private.owns_vendor(r.vendor_id) then raise exception 'FORBIDDEN'; end if;
  if r.status not in ('draft','changes_requested') then raise exception 'REVISION_LOCKED'; end if;
  if p_expected_version is null or p_expected_version<>r.version then raise exception 'STALE_DRAFT'; end if;
  v_id:=r.vendor_id;
 end if;
 update public.vendor_revisions set name=coalesce(p_data->>'name',''),description=coalesce(p_data->>'description',''),category=coalesce(p_data->>'category',''),contact=coalesce(p_data->>'contact',''),address=coalesce(p_data->>'address',''),opening_hours=coalesce(p_data->>'opening_hours',''),fulfillment=coalesce(p_data->>'fulfillment',''),delivery_terms=coalesce(p_data->>'delivery_terms',''),latitude=null,longitude=null,geocoded_at=null,status='draft',version=version+1,updated_at=now(),owner_message=null,reviewed_at=null,reviewed_by=null where id=r.id;
 delete from public.item_revisions where revision_id=r.id;
 for item in select value from jsonb_array_elements(coalesce(p_data->'items','[]'::jsonb)) loop
  if jsonb_typeof(item)<>'object' then raise exception 'INVALID_INPUT'; end if;
  item_uuid:=nullif(item->>'item_id','')::uuid;
  if item_uuid is null then insert into public.vendor_items(vendor_id) values(v_id) returning id into item_uuid;
  elsif not exists(select 1 from public.vendor_items where id=item_uuid and vendor_id=v_id) then raise exception 'INVALID_ITEM'; end if;
  insert into public.item_revisions(revision_id,vendor_id,item_id,name,category,specification,quantity,unit,price,tax,minimum_packages,delivery_fee,delivery_fee_basis,selling,checked_on,provided_by)
   values(r.id,v_id,item_uuid,coalesce(item->>'name',''),coalesce(item->>'category',''),coalesce(item->>'specification',''),nullif(item->>'quantity','')::numeric,coalesce(item->>'unit',''),nullif(item->>'price','')::bigint,coalesce(item->>'tax',''),nullif(item->>'minimum_packages','')::integer,nullif(item->>'delivery_fee','')::bigint,coalesce(item->>'delivery_fee_basis',''),coalesce((item->>'selling')::boolean,true),nullif(item->>'checked_on','')::date,actor);
 end loop;
 return app_private.revision_json(r.id);
end; $$;

create function public.apply_vendor_geocode(p_revision_id uuid,p_actor_id uuid,p_expected_version integer,p_address text,p_latitude double precision,p_longitude double precision) returns void language plpgsql security definer set search_path='' as $$
declare r public.vendor_revisions;
begin
 select * into r from public.vendor_revisions where id=p_revision_id for update;
 if r.id is null or not exists(select 1 from public.vendor_members where vendor_id=r.vendor_id and user_id=p_actor_id) then raise exception 'FORBIDDEN'; end if;
 if r.status not in ('draft','changes_requested') or r.version<>p_expected_version or r.address<>p_address then raise exception 'STALE_DRAFT'; end if;
 if p_latitude is null or p_longitude is null or not(p_latitude between -90 and 90) or not(p_longitude between -180 and 180) then raise exception 'INVALID_INPUT'; end if;
 update public.vendor_revisions set latitude=p_latitude,longitude=p_longitude,geocoded_at=now() where id=r.id;
end; $$;

create function app_private.check_submission(p_revision_id uuid) returns void language plpgsql set search_path='' as $$
declare r public.vendor_revisions;
begin
 select * into r from public.vendor_revisions where id=p_revision_id;
 if r.id is null or length(trim(r.name))=0 or length(trim(r.category))=0 or length(trim(r.contact))=0 or length(trim(r.address))=0 or r.location is null or r.geocoded_at is null or r.fulfillment='' or length(trim(r.delivery_terms))=0 then raise exception 'INCOMPLETE_VENDOR'; end if;
 if not exists(select 1 from public.item_revisions where revision_id=r.id and selling) then raise exception 'ITEM_REQUIRED'; end if;
 if exists(select 1 from public.item_revisions i where i.revision_id=r.id and i.selling and (length(trim(i.name))=0 or length(trim(i.specification))=0 or i.quantity is null or length(trim(i.unit))=0 or i.price is null or i.tax='' or i.minimum_packages is null or i.checked_on is null or i.checked_on>(now() at time zone 'Asia/Seoul')::date or (r.fulfillment in ('delivery','both') and length(trim(i.delivery_fee_basis))=0))) then raise exception 'INCOMPLETE_ITEM'; end if;
 if exists(select 1 from public.vendor_images im where im.revision_id=r.id and not exists(select 1 from storage.objects o where o.bucket_id='vendor-images' and o.name=im.object_path)) then raise exception 'INCOMPLETE_IMAGES'; end if;
end; $$;
create function public.submit_vendor_revision(p_revision_id uuid,p_expected_version integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.vendor_revisions;
begin
 select * into r from public.vendor_revisions where id=p_revision_id for update;
 if auth.uid() is null or r.id is null or not app_private.owns_vendor(r.vendor_id) then raise exception 'FORBIDDEN'; end if;
 if r.status='pending_review' and r.version=p_expected_version then return app_private.revision_json(r.id); end if;
 if r.status not in ('draft','changes_requested') then raise exception 'REVISION_LOCKED'; end if;
 if p_expected_version is null or r.version<>p_expected_version then raise exception 'STALE_DRAFT'; end if;
 perform app_private.check_submission(r.id);
 update public.vendor_revisions set status='pending_review',submitted_at=now(),updated_at=now() where id=r.id;
 return app_private.revision_json(r.id);
end; $$;
create function public.cancel_vendor_submission(p_revision_id uuid,p_expected_version integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.vendor_revisions;
begin
 select * into r from public.vendor_revisions where id=p_revision_id for update;
 if auth.uid() is null or r.id is null or not app_private.owns_vendor(r.vendor_id) then raise exception 'FORBIDDEN'; end if;
 if r.status<>'pending_review' then raise exception 'REVISION_LOCKED'; end if;
 if r.version<>p_expected_version or p_expected_version is null then raise exception 'STALE_DRAFT'; end if;
 update public.vendor_revisions set status='draft',version=version+1,submitted_at=null,updated_at=now() where id=r.id;
 return app_private.revision_json(r.id);
end; $$;
create function public.start_vendor_revision(p_vendor_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.vendors; r_id uuid; approved_id uuid;
begin
 select * into v from public.vendors where id=p_vendor_id for update;
 if auth.uid() is null or v.id is null or not app_private.owns_vendor(v.id) then raise exception 'FORBIDDEN'; end if;
 select id into r_id from public.vendor_revisions where vendor_id=v.id and status<>'approved';
 if r_id is not null then return app_private.revision_json(r_id); end if;
 approved_id:=v.current_revision_id;
 if approved_id is null then raise exception 'INVALID_INPUT'; end if;
 insert into public.vendor_revisions(vendor_id,created_by,name,description,category,contact,address,opening_hours,fulfillment,delivery_terms)
 select vendor_id,auth.uid(),name,description,category,contact,address,opening_hours,fulfillment,delivery_terms from public.vendor_revisions where id=approved_id returning id into r_id;
 insert into public.item_revisions(revision_id,vendor_id,item_id,name,category,specification,quantity,unit,price,tax,minimum_packages,delivery_fee,delivery_fee_basis,selling,checked_on,provided_by)
 select r_id,vendor_id,item_id,name,category,specification,quantity,unit,price,tax,minimum_packages,delivery_fee,delivery_fee_basis,selling,checked_on,auth.uid() from public.item_revisions where revision_id=approved_id;
 -- Photos remain attached to immutable versions; upload new revision photos separately.
 return app_private.revision_json(r_id);
end; $$;
create function public.review_vendor_revision(p_revision_id uuid,p_expected_version integer,p_decision text,p_owner_message text default '',p_internal_note text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.vendor_revisions; v public.vendors;
begin
 if auth.uid() is null or not app_private.is_staff() then raise exception 'FORBIDDEN'; end if;
 select * into r from public.vendor_revisions where id=p_revision_id for update;
 if r.id is null then raise exception 'NOT_FOUND'; end if;
 select * into v from public.vendors where id=r.vendor_id for update;
 if app_private.owns_vendor(r.vendor_id) then raise exception 'SELF_REVIEW_FORBIDDEN'; end if;
 if p_decision not in ('approved','changes_requested') then raise exception 'INVALID_INPUT'; end if;
 if p_expected_version is null or r.version<>p_expected_version then raise exception 'STALE_DRAFT'; end if;
 if p_decision='approved' and r.status='approved' and v.current_revision_id=r.id then return app_private.revision_json(r.id); end if;
 if r.status<>'pending_review' then raise exception 'REVISION_LOCKED'; end if;
 if p_decision='changes_requested' and length(trim(coalesce(p_owner_message,'')))=0 then raise exception 'REASON_REQUIRED'; end if;
 if p_decision='approved' then perform app_private.check_submission(r.id); end if;
 insert into public.review_events(vendor_id,revision_id,revision_version,reviewer_id,action,owner_message,internal_note,snapshot)
 values(r.vendor_id,r.id,r.version,auth.uid(),p_decision,coalesce(p_owner_message,''),coalesce(p_internal_note,''),app_private.revision_json(r.id));
 update public.vendor_revisions set status=p_decision,reviewed_at=now(),reviewed_by=auth.uid(),owner_message=p_owner_message,updated_at=now() where id=r.id;
 if p_decision='approved' then update public.vendors set current_revision_id=r.id where id=r.vendor_id; end if;
 -- Approval deliberately does not clear an operator's hidden flag.
 return app_private.revision_json(r.id);
end; $$;
create function public.set_vendor_visibility(p_vendor_id uuid,p_hidden boolean,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare v public.vendors; r public.vendor_revisions;
begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
 if p_hidden is null or length(trim(coalesce(p_reason,'')))=0 then raise exception 'REASON_REQUIRED'; end if;
 if not app_private.is_staff() and not(app_private.owns_vendor(p_vendor_id) and p_hidden) then raise exception 'FORBIDDEN'; end if;
 select * into v from public.vendors where id=p_vendor_id for update;
 if v.id is null or v.current_revision_id is null then raise exception 'NOT_FOUND'; end if;
 select * into r from public.vendor_revisions where id=v.current_revision_id;
 if v.hidden=p_hidden then return; end if;
 update public.vendors set hidden=p_hidden where id=v.id;
 insert into public.review_events(vendor_id,revision_id,revision_version,reviewer_id,action,owner_message,snapshot)
 values(v.id,r.id,r.version,auth.uid(),case when not app_private.is_staff() then 'withdrawn' when p_hidden then 'hidden' else 'restored' end,p_reason,app_private.revision_json(r.id));
end; $$;

create function public.get_vendor_workspace(p_revision_id uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
 if p_revision_id is not null then
  if not exists(select 1 from public.vendor_revisions r where r.id=p_revision_id and (app_private.owns_vendor(r.vendor_id) or app_private.is_staff())) then raise exception 'FORBIDDEN'; end if;
  return app_private.revision_json(p_revision_id);
 end if;
 return jsonb_build_object('staff',app_private.is_staff(),'revisions',coalesce((select jsonb_agg(app_private.revision_json(r.id)||jsonb_build_object('hidden',v.hidden,'is_current',v.current_revision_id=r.id) order by r.created_at desc) from public.vendor_revisions r join public.vendors v on v.id=r.vendor_id where app_private.owns_vendor(r.vendor_id)),'[]'::jsonb));
end; $$;
create function public.list_vendor_reviews(p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not app_private.is_staff() then raise exception 'FORBIDDEN'; end if;
 if p_offset<0 or p_offset>100000 then raise exception 'INVALID_INPUT'; end if;
 return coalesce((select jsonb_agg(app_private.revision_json(q.id) order by q.submitted_at,q.id) from (select id,submitted_at from public.vendor_revisions where status='pending_review' order by submitted_at,id limit 20 offset p_offset) q),'[]'::jsonb);
end; $$;
create function app_private.public_vendor_json(p_vendor_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',v.id,'revision_id',r.id,'name',r.name,'description',r.description,'category',r.category,'contact',r.contact,'address',r.address,'latitude',r.latitude,'longitude',r.longitude,'opening_hours',r.opening_hours,'fulfillment',r.fulfillment,'delivery_terms',r.delivery_terms,'items',coalesce((select jsonb_agg(jsonb_build_object('id',i.item_id,'name',i.name,'specification',i.specification,'quantity',i.quantity,'unit',i.unit,'price',i.price,'currency',i.currency,'tax',i.tax,'minimum_packages',i.minimum_packages,'delivery_fee',i.delivery_fee,'delivery_fee_basis',i.delivery_fee_basis,'checked_on',i.checked_on,'source_type',i.source_type) order by i.name,i.item_id) from public.item_revisions i where i.revision_id=r.id and i.selling),'[]'::jsonb),'image_ids',coalesce((select jsonb_agg(im.id order by im.position,im.id) from public.vendor_images im where im.revision_id=r.id),'[]'::jsonb),'data_kind','live')
 from public.vendors v join public.vendor_revisions r on r.id=v.current_revision_id where v.id=p_vendor_id and r.status='approved' and not v.hidden;
$$;
create function public.get_published_vendor(p_vendor_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
 return app_private.public_vendor_json(p_vendor_id);
end; $$;
create function public.search_published_vendors(p_latitude double precision,p_longitude double precision,p_radius integer default 3000,p_query text default '',p_category text default '',p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare origin extensions.geography;
begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
 if p_latitude is null or p_longitude is null or not(p_latitude between -90 and 90) or not(p_longitude between -180 and 180) or p_radius is null or p_radius not between 100 and 20000 or p_offset is null or p_offset not between 0 and 100000 or length(coalesce(p_query,''))>100 or length(coalesce(p_category,''))>60 then raise exception 'INVALID_INPUT'; end if;
 origin:=extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography;
 return jsonb_build_object('vendors',coalesce((select jsonb_agg(app_private.public_vendor_json(q.id)||jsonb_build_object('distance_m',q.distance_m) order by q.distance_m,q.id) from (
  select v.id,extensions.st_distance(r.location,origin) as distance_m from public.vendors v join public.vendor_revisions r on r.id=v.current_revision_id
  where not v.hidden and r.status='approved' and r.location is not null and extensions.st_dwithin(r.location,origin,p_radius)
   and (coalesce(p_category,'')='' or r.category=p_category)
   and (coalesce(trim(p_query),'')='' or strpos(lower(r.name),lower(trim(p_query)))>0 or exists(select 1 from public.item_revisions i where i.revision_id=r.id and i.selling and strpos(lower(i.name),lower(trim(p_query)))>0))
  order by distance_m,v.id limit 20 offset p_offset
 ) q),'[]'::jsonb),'offset',p_offset,'limit',20,'data_kind','live');
end; $$;

-- Private Storage bucket. Public viewers use an authenticated no-store image proxy;
-- they cannot mint signed URLs that would survive a vendor being hidden.
do $$ begin
 if not (select relrowsecurity from pg_class where oid='storage.objects'::regclass) or not (select relrowsecurity from pg_class where oid='storage.buckets'::regclass) then raise exception 'STORAGE_RLS_REQUIRED'; end if;
end; $$;
create policy vendor_bucket_insert_boundary on storage.buckets as restrictive for insert to authenticated,anon with check(id<>'vendor-images');
create policy vendor_bucket_update_boundary on storage.buckets as restrictive for update to authenticated,anon using(id<>'vendor-images') with check(id<>'vendor-images');
create policy vendor_bucket_delete_boundary on storage.buckets as restrictive for delete to authenticated,anon using(id<>'vendor-images');
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('vendor-images','vendor-images',false,3145728,array['image/jpeg','image/png','image/webp']);
create function app_private.can_upload_image(p_path text) returns boolean language plpgsql stable security definer set search_path='' as $$
declare revision uuid;
begin
 if auth.uid() is null or p_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$' then return false; end if;
 begin revision:=split_part(p_path,'/',1)::uuid; exception when invalid_text_representation then return false; end;
 return app_private.can_edit_revision(revision);
end; $$;
grant execute on function app_private.can_upload_image(text) to authenticated;
create policy vendor_image_upload on storage.objects for insert to authenticated with check(bucket_id='vendor-images' and app_private.can_upload_image(name));
create policy vendor_image_private_read on storage.objects for select to authenticated using(bucket_id='vendor-images' and exists(select 1 from public.vendor_revisions r where r.id::text=split_part(name,'/',1) and (app_private.owns_vendor(r.vendor_id) or app_private.is_staff())));
-- Restrictive boundaries also defeat unrelated existing permissive Storage policies.
create policy vendor_image_read_boundary on storage.objects as restrictive for select to authenticated using(bucket_id<>'vendor-images' or exists(select 1 from public.vendor_revisions r where r.id::text=split_part(name,'/',1) and (app_private.owns_vendor(r.vendor_id) or app_private.is_staff())));
create policy vendor_image_insert_boundary on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'vendor-images' or app_private.can_upload_image(name));
create policy vendor_image_update_boundary on storage.objects as restrictive for update to authenticated using(bucket_id<>'vendor-images') with check(bucket_id<>'vendor-images');
create policy vendor_image_delete_boundary on storage.objects as restrictive for delete to authenticated using(bucket_id<>'vendor-images');
create policy vendor_image_anon_boundary on storage.objects as restrictive for all to anon using(bucket_id<>'vendor-images') with check(bucket_id<>'vendor-images');
-- Approved bytes cannot be overwritten or removed by clients.

create function public.attach_vendor_image(p_revision_id uuid,p_object_path text,p_position integer default 0,p_cover boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare image_id uuid; r public.vendor_revisions;
begin
 select * into r from public.vendor_revisions where id=p_revision_id for update;
 if r.id is null or not app_private.can_edit_revision(r.id) or not app_private.can_upload_image(p_object_path) or split_part(p_object_path,'/',1)<>r.id::text then raise exception 'FORBIDDEN'; end if;
 if not exists(select 1 from storage.objects where bucket_id='vendor-images' and name=p_object_path) then raise exception 'NOT_FOUND'; end if;
 if (select count(*) from public.vendor_images where revision_id=r.id)>=10 then raise exception 'IMAGE_LIMIT'; end if;
 if p_cover then update public.vendor_images set is_cover=false where revision_id=r.id; end if;
 insert into public.vendor_images(revision_id,object_path,position,is_cover) values(r.id,p_object_path,p_position,p_cover) returning id into image_id;
 update public.vendor_revisions set version=version+1,updated_at=now() where id=r.id;
 return image_id;
end; $$;
create function public.resolve_vendor_image(p_image_id uuid) returns text language plpgsql stable security definer set search_path='' as $$
declare image public.vendor_images; vendor uuid;
begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
 select * into image from public.vendor_images where id=p_image_id;
 select vendor_id into vendor from public.vendor_revisions where id=image.revision_id;
 if image.id is null or not(app_private.owns_vendor(vendor) or app_private.is_staff() or app_private.is_public_revision(image.revision_id)) then raise exception 'NOT_FOUND'; end if;
 return image.object_path;
end; $$;

-- Explicit function ACL: PostgreSQL grants EXECUTE to PUBLIC by default.
revoke all on all functions in schema app_private from public,anon,authenticated;
grant execute on function app_private.is_staff(),app_private.owns_vendor(uuid),app_private.can_edit_revision(uuid),app_private.is_public_revision(uuid),app_private.can_upload_image(text) to authenticated;
revoke execute on function public.save_vendor_draft(jsonb,uuid,uuid,integer),public.apply_vendor_geocode(uuid,uuid,integer,text,double precision,double precision),public.submit_vendor_revision(uuid,integer),public.cancel_vendor_submission(uuid,integer),public.start_vendor_revision(uuid),public.review_vendor_revision(uuid,integer,text,text,text),public.set_vendor_visibility(uuid,boolean,text),public.get_vendor_workspace(uuid),public.list_vendor_reviews(integer),public.get_published_vendor(uuid),public.search_published_vendors(double precision,double precision,integer,text,text,integer),public.attach_vendor_image(uuid,text,integer,boolean),public.resolve_vendor_image(uuid) from public,anon,authenticated;
grant execute on function public.save_vendor_draft(jsonb,uuid,uuid,integer),public.submit_vendor_revision(uuid,integer),public.cancel_vendor_submission(uuid,integer),public.start_vendor_revision(uuid),public.review_vendor_revision(uuid,integer,text,text,text),public.set_vendor_visibility(uuid,boolean,text),public.get_vendor_workspace(uuid),public.list_vendor_reviews(integer),public.get_published_vendor(uuid),public.search_published_vendors(double precision,double precision,integer,text,text,integer),public.attach_vendor_image(uuid,text,integer,boolean),public.resolve_vendor_image(uuid) to authenticated;
grant execute on function public.apply_vendor_geocode(uuid,uuid,integer,text,double precision,double precision) to service_role;
commit;
