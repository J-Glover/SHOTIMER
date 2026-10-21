-- ==============================================================================
-- Shotimer — Supabase Database Schema
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Create User Profiles table linked to auth.users
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

create policy "Users can view their own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.user_profiles for insert
  with check (auth.uid() = id);

-- 2. Create Rooms table for saved rundowns and custom stage setups
create table if not exists public.rooms (
  id text not null,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  rundown jsonb default '[]'::jsonb,
  theme jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id, user_id)
);

alter table public.rooms enable row level security;

create policy "Users can view their own rooms"
  on public.rooms for select
  using (auth.uid() = user_id);

create policy "Users can insert their own rooms"
  on public.rooms for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own rooms"
  on public.rooms for update
  using (auth.uid() = user_id);

create policy "Users can delete their own rooms"
  on public.rooms for delete
  using (auth.uid() = user_id);

-- 3. Create Live Sessions table for remote screens (Confidence Monitor, OBS Overlays)
create table if not exists public.live_sessions (
  room_id text primary key,
  payload jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.live_sessions enable row level security;

-- Allow public read access so viewer/stage monitors can connect without requiring login
create policy "Anyone can read live sessions"
  on public.live_sessions for select
  using (true);

-- Allow upserting live telemetry
create policy "Anyone can broadcast live telemetry"
  on public.live_sessions for all
  using (true)
  with check (true);
