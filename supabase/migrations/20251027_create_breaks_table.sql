-- Migration: create breaks (attendance) table and basic sample seed data
-- Run with psql or supabase migration tooling.

-- Table: break_requests
create table if not exists public.break_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null,
  team_id uuid not null,
  type text not null check (type in ('break','lunch')),
  state text not null default 'requested' check (state in ('requested','approved','active','ended','cancelled')),
  requested_at timestamptz not null default now(),
  requested_notes text,
  approved_by uuid,
  approved_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  forced_end boolean default false,
  force_ended_by uuid,
  force_ended_at timestamptz,
  metadata jsonb default '{}'::jsonb
);

create index if not exists idx_break_requests_team_state on public.break_requests (team_id, state);
create index if not exists idx_break_requests_employee on public.break_requests (employee_id);

-- sample seed data (adjust employee/team ids to real ones)
insert into public.break_requests (employee_id, team_id, type, state, requested_at, requested_notes)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'break', 'requested', now(), 'Coffee run'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'lunch', 'approved', now() - interval '15 minutes', 'Lunch with client');

-- OPTIONAL: trigger to keep duration updated when ended_at is set
create or replace function public.compute_break_duration() returns trigger language plpgsql as $$
begin
  if new.ended_at is not null and new.started_at is not null then
    new.duration_seconds := extract(epoch from (new.ended_at - new.started_at))::integer;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_compute_duration on public.break_requests;
create trigger trg_compute_duration
before update on public.break_requests
for each row
execute function public.compute_break_duration();
