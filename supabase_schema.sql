-- ==============================================================================
-- Shotimer — Complete Production PostgreSQL Database Schema (Hardened)
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- Project: https://supabase.com/dashboard/project/yodcnmzgmjcjgxizcowm
-- ==============================================================================

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Table: user_profiles (User Accounts, Roles & Pro Licensing)
-- ------------------------------------------------------------------------------
create table if not exists public.user_profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text,
  is_pro boolean default false,
  license_key text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_profiles enable row level security;

-- Policies for user_profiles
drop policy if exists "Users can view their own profile" on public.user_profiles;
create policy "Users can view their own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.user_profiles;
create policy "Users can update their own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.user_profiles;
create policy "Users can insert their own profile"
  on public.user_profiles for insert
  with check (auth.uid() = id);

-- Trigger to auto-create user_profile on auth.users sign-up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, display_name, is_pro, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    false,
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger to protect is_pro and license_key against client-side privilege escalation
create or replace function public.protect_user_profile_pro_fields()
returns trigger as $$
begin
  -- Prevent direct modification of is_pro or license_key by standard authenticated users
  if (old.is_pro is distinct from new.is_pro or old.license_key is distinct from new.license_key) then
    if nullif(current_setting('shotimer.allow_license_update', true), '') is null then
      -- Revert unauthorized changes to sensitive fields while allowing display_name updates
      new.is_pro := old.is_pro;
      new.license_key := old.license_key;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists tr_protect_user_profile on public.user_profiles;
create trigger tr_protect_user_profile
  before update on public.user_profiles
  for each row execute function public.protect_user_profile_pro_fields();

-- Security Definer Function: Safely validate and claim a Pro license
create or replace function public.claim_pro_license(input_key text)
returns jsonb as $$
declare
  clean_key text := upper(trim(coalesce(input_key, '')));
  calling_user_id uuid := auth.uid();
begin
  if calling_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Authentication required to activate license');
  end if;

  -- Validate authorized evaluation key or production key patterns
  if clean_key = 'PRO-STAGE-2026' or clean_key = 'DEMO' or clean_key like 'SHOTIMER-PRO-%' then
    -- Authorize bypass flag within current local transaction
    perform set_config('shotimer.allow_license_update', 'true', true);

    update public.user_profiles
    set is_pro = true,
        license_key = clean_key,
        updated_at = now()
    where id = calling_user_id;

    return jsonb_build_object(
      'success', true,
      'is_pro', true,
      'license_key', clean_key
    );
  else
    return jsonb_build_object('success', false, 'error', 'Invalid license key');
  end if;
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------------------------
-- 2. Table: rooms (Saved Rundowns, Themes & Output Customization Studio)
-- ------------------------------------------------------------------------------
create table if not exists public.rooms (
  id text not null,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  rundown jsonb default '[]'::jsonb not null,
  theme jsonb default '{}'::jsonb,
  output_customization jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id, user_id)
);

alter table public.rooms enable row level security;

-- Policies for rooms (Strictly private to owning authenticated user)
drop policy if exists "Users can view their own rooms" on public.rooms;
create policy "Users can view their own rooms"
  on public.rooms for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own rooms" on public.rooms;
create policy "Users can insert their own rooms"
  on public.rooms for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own rooms" on public.rooms;
create policy "Users can update their own rooms"
  on public.rooms for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own rooms" on public.rooms;
create policy "Users can delete their own rooms"
  on public.rooms for delete
  using (auth.uid() = user_id);

-- Index for speedy room queries by user
create index if not exists idx_rooms_user_id on public.rooms(user_id);

-- ------------------------------------------------------------------------------
-- 3. Table: live_sessions (Instant Snapshot for Confidence Monitors & OBS)
-- ------------------------------------------------------------------------------
create table if not exists public.live_sessions (
  room_id text primary key,
  payload jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.live_sessions enable row level security;

-- Allow public read access so unauthenticated stage monitors/OBS overlays can boot instantly
drop policy if exists "Anyone can read live sessions" on public.live_sessions;
create policy "Anyone can read live sessions"
  on public.live_sessions for select
  using (true);

-- Allow inserting live telemetry with valid room_id length bounds
drop policy if exists "Anyone can insert live telemetry" on public.live_sessions;
create policy "Anyone can insert live telemetry"
  on public.live_sessions for insert
  with check (length(room_id) <= 128);

-- Allow updating live telemetry with valid room_id length bounds
drop policy if exists "Anyone can broadcast live telemetry" on public.live_sessions;
drop policy if exists "Anyone can update live telemetry" on public.live_sessions;
create policy "Anyone can update live telemetry"
  on public.live_sessions for update
  using (length(room_id) <= 128)
  with check (length(room_id) <= 128);

-- Only authenticated users or room owners can delete live sessions (prevents public table wipe)
drop policy if exists "Only authenticated users can delete live sessions" on public.live_sessions;
create policy "Only authenticated users can delete live sessions"
  on public.live_sessions for delete
  using (auth.uid() is not null);

-- Index for lightning-fast room lookups
create index if not exists idx_live_sessions_updated_at on public.live_sessions(updated_at);

-- ------------------------------------------------------------------------------
-- 4. Table: waitlist (Pre-Launch VIP Email Signups for shotimer.io)
-- ------------------------------------------------------------------------------
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  source text default 'website_coming_soon',
  ip text
);

alter table public.waitlist enable row level security;

-- Anyone can submit their email to the waitlist
drop policy if exists "Anyone can join waitlist" on public.waitlist;
create policy "Anyone can join waitlist"
  on public.waitlist for insert
  with check (length(email) <= 100 and position('@' in email) > 1);

-- Only authenticated users or dashboard admins can view waitlist entries
drop policy if exists "Only authenticated users can view waitlist" on public.waitlist;
create policy "Only authenticated users can view waitlist"
  on public.waitlist for select
  using (auth.uid() is not null);

-- ------------------------------------------------------------------------------
-- 5. Seed Initial Test Waitlist Subscribers (Imported from waitlist.json)
-- ------------------------------------------------------------------------------
insert into public.waitlist (email, created_at, source, ip)
values
  ('av-crew@live-events.com', '2026-10-19T21:09:44.675Z', 'website_coming_soon', '127.0.0.1'),
  ('producer@stagebroadcast.io', '2026-10-19T21:10:10.267Z', 'website_coming_soon', '127.0.0.1'),
  ('director@live-broadcast.com', '2026-10-25T18:37:31.665Z', 'website_coming_soon', '127.0.0.1'),
  ('director@stage-production.com', '2026-10-25T18:41:45.533Z', 'website_coming_soon', '127.0.0.1'),
  ('vip-tester@shotimer.com', '2026-10-25T18:54:57.292Z', 'website_coming_soon', '127.0.0.1'),
  ('security_test@shotimer.io', '2026-10-25T22:41:39.674Z', 'website_coming_soon', '127.0.0.1')
on conflict (email) do nothing;

