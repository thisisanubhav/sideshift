-- SideShift core schema
-- Every status field is an enum. Every state transition writes a timestamp.

create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type user_role as enum ('brand', 'creator');

create type platform as enum ('tiktok', 'reels', 'shorts');

create type campaign_status as enum ('draft', 'open', 'closed');

create type application_status as enum (
  'pending',    -- awaiting a brand decision, inside the response window
  'accepted',
  'declined',
  'expired',    -- brand let the 48h window lapse
  'withdrawn'   -- creator pulled out
);

-- Declines are never silent. A decline must name one of these.
create type decline_reason as enum (
  'not_the_right_fit',
  'rate_above_budget',
  'slots_filled',
  'audience_mismatch',
  'wrong_format_or_platform',
  'other'
);

create type thread_status as enum ('active', 'in_review', 'complete');

create type deliverable_status as enum ('submitted', 'changes_requested', 'approved');

create type payment_status as enum ('escrowed', 'in_review', 'released');

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         user_role not null,
  display_name text not null,
  handle       citext not null unique,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  constraint handle_shape check (handle ~ '^[a-z0-9._]{3,30}$')
);

create table brands (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null unique references profiles (id) on delete cascade,
  name         text not null,
  niche        text,
  bio          text,
  website      text,
  logo_url     text,
  created_at   timestamptz not null default now()
);

create table creators (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null unique references profiles (id) on delete cascade,
  niche          text,
  bio            text,
  city           text,
  platforms      platform[] not null default '{}',
  follower_count integer not null default 0 check (follower_count >= 0),
  -- Seeded demo metric. Labelled as demo data everywhere it is rendered.
  avg_views      integer not null default 0 check (avg_views >= 0),
  base_rate_cents integer not null default 0 check (base_rate_cents >= 0),
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Campaigns
-- ---------------------------------------------------------------------------

create table campaigns (
  id                       uuid primary key default gen_random_uuid(),
  brand_id                 uuid not null references brands (id) on delete cascade,
  title                    text not null check (length(trim(title)) between 3 and 120),
  brief                    text not null check (length(trim(brief)) >= 20),
  niche                    text,
  platform                 platform not null,
  video_count              integer not null check (video_count between 1 and 20),
  duration_min_seconds     integer not null check (duration_min_seconds between 5 and 600),
  duration_max_seconds     integer not null check (duration_max_seconds between 5 and 600),
  budget_cents_per_creator integer not null check (budget_cents_per_creator > 0),
  slots_total              integer not null check (slots_total between 1 and 50),
  slots_filled             integer not null default 0 check (slots_filled >= 0),
  deadline                 date not null,
  status                   campaign_status not null default 'draft',
  cover_url                text,
  created_at               timestamptz not null default now(),
  published_at             timestamptz,
  closed_at                timestamptz,
  constraint duration_range check (duration_max_seconds >= duration_min_seconds),
  constraint slots_not_oversold check (slots_filled <= slots_total),
  -- An open campaign must have been published at some point.
  constraint published_when_open check (status = 'draft' or published_at is not null)
);

create index campaigns_open_idx on campaigns (status, published_at desc)
  where status = 'open';
create index campaigns_brand_idx on campaigns (brand_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Applications
-- ---------------------------------------------------------------------------

create table applications (
  id             uuid primary key default gen_random_uuid(),
  campaign_id    uuid not null references campaigns (id) on delete cascade,
  creator_id     uuid not null references creators (id) on delete cascade,
  pitch          text not null check (length(trim(pitch)) between 20 and 1200),
  rate_cents     integer not null check (rate_cents > 0),
  status         application_status not null default 'pending',
  -- The response window. Set at insert to now() + 48h by trigger.
  expires_at     timestamptz not null,
  created_at     timestamptz not null default now(),
  responded_at   timestamptz,
  decline_reason decline_reason,
  decline_note   text check (decline_note is null or length(trim(decline_note)) <= 400),

  -- One application per creator per campaign.
  unique (campaign_id, creator_id),

  -- A decline without a reason is impossible at the database level, not just
  -- in the form. This is the whole point of product fix #2.
  constraint decline_needs_reason check (
    (status = 'declined') = (decline_reason is not null)
  ),
  -- Anything that is not still pending must record when it stopped being pending.
  constraint decided_has_timestamp check (
    (status = 'pending') = (responded_at is null)
  )
);

create index applications_campaign_idx on applications (campaign_id, status, created_at desc);
create index applications_creator_idx on applications (creator_id, created_at desc);
-- Drives the lazy-expiry sweep.
create index applications_pending_expiry_idx on applications (expires_at)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- The thread: one per accepted creator
-- ---------------------------------------------------------------------------

create table threads (
  id             uuid primary key default gen_random_uuid(),
  campaign_id    uuid not null references campaigns (id) on delete cascade,
  brand_id       uuid not null references brands (id) on delete cascade,
  creator_id     uuid not null references creators (id) on delete cascade,
  application_id uuid not null unique references applications (id) on delete cascade,
  status         thread_status not null default 'active',
  created_at     timestamptz not null default now(),
  completed_at   timestamptz,
  unique (campaign_id, creator_id)
);

create index threads_brand_idx on threads (brand_id, created_at desc);
create index threads_creator_idx on threads (creator_id, created_at desc);

create table messages (
  id                uuid primary key default gen_random_uuid(),
  thread_id         uuid not null references threads (id) on delete cascade,
  sender_profile_id uuid not null references profiles (id) on delete cascade,
  body              text not null check (length(trim(body)) between 1 and 4000),
  created_at        timestamptz not null default now()
);

create index messages_thread_idx on messages (thread_id, created_at);

create table deliverables (
  id            uuid primary key default gen_random_uuid(),
  thread_id     uuid not null references threads (id) on delete cascade,
  version       integer not null check (version >= 1),
  -- Either a file in the `deliverables` storage bucket, a delivery link, or both.
  storage_path  text,
  delivery_url  text,
  note          text check (note is null or length(trim(note)) <= 1000),
  status        deliverable_status not null default 'submitted',
  submitted_at  timestamptz not null default now(),
  reviewed_at   timestamptz,
  review_note   text check (review_note is null or length(trim(review_note)) <= 1000),
  unique (thread_id, version),
  constraint has_some_deliverable check (
    storage_path is not null or delivery_url is not null
  ),
  constraint reviewed_has_timestamp check (
    (status = 'submitted') = (reviewed_at is null)
  )
);

create index deliverables_thread_idx on deliverables (thread_id, version desc);

-- ---------------------------------------------------------------------------
-- Payments (display state only, no processor)
-- ---------------------------------------------------------------------------

create table payments (
  id            uuid primary key default gen_random_uuid(),
  thread_id     uuid not null unique references threads (id) on delete cascade,
  amount_cents  integer not null check (amount_cents > 0),
  status        payment_status not null default 'escrowed',
  escrowed_at   timestamptz not null default now(),
  in_review_at  timestamptz,
  released_at   timestamptz,
  -- Both sides read this same row, so both sides see the same timestamps.
  constraint released_has_timestamp check (
    (status = 'released') = (released_at is not null)
  )
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Response window: 48 hours from application, always.
create or replace function set_application_window()
returns trigger
language plpgsql
as $$
begin
  if new.expires_at is null then
    new.expires_at := new.created_at + interval '48 hours';
  end if;
  return new;
end;
$$;

create trigger applications_set_window
  before insert on applications
  for each row execute function set_application_window();

-- Profile + role row are created the moment a user signs up, from the metadata
-- the signup form supplies. Keeps RLS from ever seeing a user with no profile.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role;
  v_handle citext;
begin
  v_role := coalesce(new.raw_user_meta_data ->> 'role', 'creator')::user_role;
  v_handle := lower(coalesce(
    new.raw_user_meta_data ->> 'handle',
    split_part(new.email, '@', 1)
  ));

  insert into profiles (id, role, display_name, handle)
  values (
    new.id,
    v_role,
    coalesce(new.raw_user_meta_data ->> 'display_name', v_handle),
    v_handle
  );

  if v_role = 'brand' then
    insert into brands (profile_id, name)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', v_handle));
  else
    insert into creators (profile_id) values (new.id);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
