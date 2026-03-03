-- Run this in the Supabase SQL editor to set up the database schema.

-- profiles extends auth.users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  api_fixture_id int unique,
  home_team text not null,
  away_team text not null,
  home_team_logo text,
  away_team_logo text,
  kickoff_time timestamptz not null,
  matchday int,
  round text,
  home_score int,
  away_score int,
  is_completed boolean not null default false,
  api_status text not null default 'NS',
  last_api_sync timestamptz,
  created_at timestamptz not null default now()
);

create table predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  home_score_prediction int not null,
  away_score_prediction int not null,
  points_earned int,
  submitted_at timestamptz not null default now(),
  unique(user_id, match_id)
);

create table api_logs (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null,
  request_params jsonb,
  response_status int,
  response_body jsonb,
  created_at timestamptz not null default now()
);

create table settings (
  key text primary key,
  value text
);

insert into settings (key, value) values ('last_fixture_sync', null);

-- Row Level Security
alter table profiles enable row level security;
alter table matches enable row level security;
alter table predictions enable row level security;
alter table api_logs enable row level security;
alter table settings enable row level security;

-- profiles: readable by all authenticated, writable only own row
create policy "profiles_select" on profiles for select to authenticated using (true);
create policy "profiles_insert" on profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update" on profiles for update to authenticated using (auth.uid() = id);

-- matches: readable by all authenticated, writable only by admins
create policy "matches_select" on matches for select to authenticated using (true);
create policy "matches_all_admin" on matches for all using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

-- predictions: readable by all authenticated, insert/update own only
create policy "predictions_select" on predictions for select to authenticated using (true);
create policy "predictions_insert" on predictions for insert to authenticated with check (user_id = auth.uid());
create policy "predictions_update" on predictions for update to authenticated using (user_id = auth.uid());

-- api_logs: any authenticated can insert, only admins can select
create policy "api_logs_insert" on api_logs for insert to authenticated with check (true);
create policy "api_logs_select" on api_logs for select to authenticated using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

-- settings: authenticated can read, admins can write
create policy "settings_select" on settings for select to authenticated using (true);
create policy "settings_update" on settings for update to authenticated using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);
