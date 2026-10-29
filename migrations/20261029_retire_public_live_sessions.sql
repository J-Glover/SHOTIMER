-- Deploy alongside the protected live relay and refresh existing consoles.
-- This retains historical rows but removes client access to anonymous snapshots.
begin;
alter table public.live_sessions enable row level security;
drop policy if exists "Anyone can read live sessions" on public.live_sessions;
drop policy if exists "Anyone can insert live telemetry" on public.live_sessions;
drop policy if exists "Anyone can broadcast live telemetry" on public.live_sessions;
drop policy if exists "Anyone can update live telemetry" on public.live_sessions;
drop policy if exists "Only authenticated users can delete live sessions" on public.live_sessions;
revoke all on table public.live_sessions from anon, authenticated;
commit;
