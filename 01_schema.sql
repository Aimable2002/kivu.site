-- ══════════════════════════════════════════════════════════════════════
--  KIVU — SUPABASE SCHEMA
--  Run this in: Supabase Dashboard → SQL Editor → New Query
--  Modules: clinic + dating/match
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for fuzzy search


-- ══════════════════════════════════════════════════════════════════════
--  MODULE 1: CLINICS
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1.1  clinic_applications  (pending review)
-- ─────────────────────────────────────────────
create table if not exists clinic_applications (
    id               uuid primary key default uuid_generate_v4(),
    created_at       timestamptz not null default now(),

    -- Basic info
    name             text        not null,
    category         text        not null,
    phone            text        not null,
    description      text,
    hours            text,
    booking_type     text        default 'both',   -- appointment | walkin | both
    cover_image_url  text,
    youtube_url      text,

    -- Location
    address          text,
    lat              numeric(10,7),
    lng              numeric(10,7),

    -- Features
    tags             text[]      default '{}',

    -- Services stored as JSONB array of { name, items: [{name, description, price, duration}] }
    menu_data        jsonb       default '[]',

    -- Admin workflow
    status           text        not null default 'pending'  -- pending | approved | rejected
        check (status in ('pending','approved','rejected'))
);

-- ─────────────────────────────────────────────
-- 1.2  clinics  (approved & live)
-- ─────────────────────────────────────────────
create table if not exists clinics (
    id               uuid primary key default uuid_generate_v4(),
    created_at       timestamptz not null default now(),
    application_id   uuid references clinic_applications(id) on delete set null,

    name             text        not null,
    category         text        not null,
    phone            text,
    description      text,
    hours            text,
    booking_type     text        default 'both',
    cover_image_url  text,
    youtube_url      text,

    address          text,
    lat              numeric(10,7),
    lng              numeric(10,7),

    tags             text[]      default '{}',
    menu_data        jsonb       default '[]',

    -- Admin flags
    is_vip           boolean     not null default false,
    is_open          boolean     not null default true,

    -- Computed from reviews
    rating_avg       numeric(3,2) default 0,
    rating_count     int          default 0
);

-- GIN index for tag filtering
create index if not exists idx_clinics_tags on clinics using gin(tags);
-- Full-text search on name
create index if not exists idx_clinics_name_trgm on clinics using gin(name gin_trgm_ops);

-- ─────────────────────────────────────────────
-- 1.3  clinic_reviews
-- ─────────────────────────────────────────────
create table if not exists clinic_reviews (
    id          uuid primary key default uuid_generate_v4(),
    created_at  timestamptz not null default now(),
    clinic_id   uuid not null references clinics(id) on delete cascade,
    reviewer    text not null,
    rating      int  not null check (rating between 1 and 5),
    comment     text
);

-- ─────────────────────────────────────────────
-- 1.4  Auto-update rating on clinics
-- ─────────────────────────────────────────────
create or replace function update_clinic_rating()
returns trigger language plpgsql as $$
begin
    update clinics
    set rating_avg   = (select round(avg(rating)::numeric, 2) from clinic_reviews where clinic_id = coalesce(NEW.clinic_id, OLD.clinic_id)),
        rating_count = (select count(*)                       from clinic_reviews where clinic_id = coalesce(NEW.clinic_id, OLD.clinic_id))
    where id = coalesce(NEW.clinic_id, OLD.clinic_id);
    return NEW;
end;
$$;

drop trigger if exists trg_clinic_rating on clinic_reviews;
create trigger trg_clinic_rating
after insert or update or delete on clinic_reviews
for each row execute function update_clinic_rating();

-- ─────────────────────────────────────────────
-- 1.5  clinic_doctors  (optional)
-- ─────────────────────────────────────────────
create table if not exists clinic_doctors (
    id          uuid primary key default uuid_generate_v4(),
    clinic_id   uuid not null references clinics(id) on delete cascade,
    name        text not null,
    specialty   text,
    photo_url   text,
    schedule    text,           -- e.g. "Mon–Sat"
    years_exp   int
);


-- ══════════════════════════════════════════════════════════════════════
--  MODULE 2: DATING / KIVUMATCH
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 2.1  profiles
-- ─────────────────────────────────────────────
create table if not exists match_profiles (
    id           uuid primary key references auth.users(id) on delete cascade,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),

    display_name text        not null,
    age          int,
    gender       text,
    bio          text,
    photo_url    text,
    audio_url    text,           -- "Listen" feature

    -- Location (Kigali-centric, stored for distance calc)
    lat          numeric(10,7),
    lng          numeric(10,7),
    city         text default 'Kigali',

    -- Preferences / tags shown on card
    intent       text,           -- marriage | dating | friendship
    religion     text,
    languages    text[],
    interests    text[],

    -- Verification
    is_verified  boolean not null default false,
    is_vip       boolean not null default false,

    -- Visibility
    is_active    boolean not null default true
);

-- ─────────────────────────────────────────────
-- 2.2  swipes
-- ─────────────────────────────────────────────
create table if not exists match_swipes (
    id          uuid primary key default uuid_generate_v4(),
    created_at  timestamptz not null default now(),
    swiper_id   uuid not null references match_profiles(id) on delete cascade,
    swiped_id   uuid not null references match_profiles(id) on delete cascade,
    direction   text not null check (direction in ('left','right')),
    unique (swiper_id, swiped_id)
);

-- ─────────────────────────────────────────────
-- 2.3  matches  (created when both swipe right)
-- ─────────────────────────────────────────────
create table if not exists match_matches (
    id          uuid primary key default uuid_generate_v4(),
    created_at  timestamptz not null default now(),
    user_a      uuid not null references match_profiles(id) on delete cascade,
    user_b      uuid not null references match_profiles(id) on delete cascade,
    unique (user_a, user_b)
);

-- Auto-create match when mutual like happens
create or replace function create_match_on_mutual_like()
returns trigger language plpgsql security definer as $$
declare
    existing_swipe uuid;
begin
    if NEW.direction = 'right' then
        select id into existing_swipe
        from match_swipes
        where swiper_id = NEW.swiped_id
          and swiped_id = NEW.swiper_id
          and direction = 'right';

        if existing_swipe is not null then
            insert into match_matches (user_a, user_b)
            values (least(NEW.swiper_id, NEW.swiped_id), greatest(NEW.swiper_id, NEW.swiped_id))
            on conflict do nothing;
        end if;
    end if;
    return NEW;
end;
$$;

drop trigger if exists trg_mutual_match on match_swipes;
create trigger trg_mutual_match
after insert on match_swipes
for each row execute function create_match_on_mutual_like();

-- ─────────────────────────────────────────────
-- 2.4  messages  (realtime)
-- ─────────────────────────────────────────────
create table if not exists match_messages (
    id          uuid primary key default uuid_generate_v4(),
    created_at  timestamptz not null default now(),
    match_id    uuid not null references match_matches(id) on delete cascade,
    sender_id   uuid not null references match_profiles(id) on delete cascade,
    content     text not null,
    is_read     boolean not null default false
);

-- Index for fast chat history load
create index if not exists idx_messages_match on match_messages(match_id, created_at);

-- Enable Realtime on messages table
-- (Run in Supabase Dashboard → Database → Replication → enable match_messages)

-- ─────────────────────────────────────────────
-- 2.5  presence / online status
--  Supabase Presence is handled client-side via channels.
--  This table is optional for persistent "last seen".
-- ─────────────────────────────────────────────
create table if not exists match_presence (
    user_id     uuid primary key references match_profiles(id) on delete cascade,
    last_seen   timestamptz not null default now(),
    is_online   boolean not null default false
);

-- Update last_seen via upsert from client
create or replace function set_user_online(p_user_id uuid, p_online boolean)
returns void language plpgsql security definer as $$
begin
    insert into match_presence (user_id, is_online, last_seen)
    values (p_user_id, p_online, now())
    on conflict (user_id) do update
    set is_online = p_online, last_seen = now();
end;
$$;




alter table clinic_applications
    add column if not exists doctors_data jsonb default '[]';