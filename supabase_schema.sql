-- ==============================================================================
-- Shotimer — Complete Production PostgreSQL Database Schema
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

-- Policies for rooms (Private to owning authenticated user)
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

-- Allow upserting live telemetry
drop policy if exists "Anyone can broadcast live telemetry" on public.live_sessions;
create policy "Anyone can broadcast live telemetry"
  on public.live_sessions for all
  using (true)
  with check (true);

-- Index for lightning-fast room lookups
create index if not exists idx_live_sessions_updated_at on public.live_sessions(updated_at);
