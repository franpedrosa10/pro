begin;

-- ============================================================================
-- Fantasy + Prode Mundial 2026 - Full schema (consolidated)
-- Includes all core tables, constraints, triggers, views and RLS policies.
-- This file already contains what older hotfix scripts applied incrementally.
-- ============================================================================

create extension if not exists pgcrypto;

create type public.player_position as enum ('GK', 'DEF', 'MID', 'FWD');
create type public.squad_slot as enum ('starter', 'bench');
create type public.fixture_status as enum ('scheduled', 'in_progress', 'finished');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists phone text;

create table if not exists public.national_teams (
  id uuid primary key default gen_random_uuid(),
  fifa_code varchar(3) not null unique,
  name text not null unique,
  group_letter varchar(1),
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  national_team_id uuid not null references public.national_teams(id) on delete restrict,
  full_name text not null,
  position public.player_position not null,
  price numeric(5, 1) not null check (price >= 4 and price <= 20),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (national_team_id, full_name)
);

create table if not exists public.matchdays (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  order_index integer not null unique,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  lock_at timestamptz not null,
  is_finalized boolean not null default false,
  created_at timestamptz not null default now(),
  constraint matchdays_time_check check (starts_at <= ends_at and lock_at <= ends_at)
);

create table if not exists public.fixtures (
  id uuid primary key default gen_random_uuid(),
  matchday_id uuid not null references public.matchdays(id) on delete cascade,
  kickoff_at timestamptz not null,
  home_team_id uuid not null references public.national_teams(id) on delete restrict,
  away_team_id uuid not null references public.national_teams(id) on delete restrict,
  home_score smallint check (home_score is null or home_score >= 0),
  away_score smallint check (away_score is null or away_score >= 0),
  status public.fixture_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  constraint fixtures_teams_check check (home_team_id <> away_team_id)
);

create table if not exists public.player_matchday_points (
  player_id uuid not null references public.players(id) on delete cascade,
  matchday_id uuid not null references public.matchdays(id) on delete cascade,
  points integer not null default 0,
  minutes_played smallint not null default 0,
  goals smallint not null default 0,
  assists smallint not null default 0,
  clean_sheet boolean not null default false,
  yellow_cards smallint not null default 0,
  red_cards smallint not null default 0,
  own_goals smallint not null default 0,
  penalties_missed smallint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (player_id, matchday_id)
);

create table if not exists public.fantasy_teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null default 'Mi Equipo',
  budget numeric(5, 1) not null default 100 check (budget >= 0 and budget <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fantasy_team_players (
  team_id uuid not null references public.fantasy_teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  slot public.squad_slot not null default 'starter',
  is_captain boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (team_id, player_id)
);

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  join_code varchar(6) not null unique check (join_code ~ '^[A-Z0-9]{6}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.league_members (
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

create table if not exists public.prode_predictions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  predicted_home_score smallint not null check (predicted_home_score >= 0 and predicted_home_score <= 20),
  predicted_away_score smallint not null check (predicted_away_score >= 0 and predicted_away_score <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, fixture_id)
);

create index if not exists idx_players_team on public.players(national_team_id);
create index if not exists idx_players_active on public.players(is_active);
create index if not exists idx_fixtures_matchday on public.fixtures(matchday_id, kickoff_at);
create index if not exists idx_fantasy_team_players_team on public.fantasy_team_players(team_id);
create index if not exists idx_league_members_user on public.league_members(user_id);
create index if not exists idx_predictions_fixture on public.prode_predictions(fixture_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, first_name, last_name, phone)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'username', ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      concat_ws(
        ' ',
        nullif(new.raw_user_meta_data ->> 'first_name', ''),
        nullif(new.raw_user_meta_data ->> 'last_name', '')
      ),
      split_part(new.email, '@', 1)
    ),
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill display_name for existing profiles when first/last name already exist.
update public.profiles
set display_name = trim(concat_ws(' ', first_name, last_name))
where coalesce(display_name, '') = ''
  and (coalesce(first_name, '') <> '' or coalesce(last_name, '') <> '');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_players_updated_at on public.players;
create trigger trg_players_updated_at
  before update on public.players
  for each row execute function public.set_updated_at();

drop trigger if exists trg_fantasy_teams_updated_at on public.fantasy_teams;
create trigger trg_fantasy_teams_updated_at
  before update on public.fantasy_teams
  for each row execute function public.set_updated_at();

drop trigger if exists trg_predictions_updated_at on public.prode_predictions;
create trigger trg_predictions_updated_at
  before update on public.prode_predictions
  for each row execute function public.set_updated_at();

create or replace function public.validate_fantasy_team_state(p_team_id uuid)
returns void
language plpgsql
as $$
declare
  v_total integer;
  v_starters integer;
  v_bench integer;
  v_captain integer;
  v_budget numeric(5, 1);
  v_cost numeric(6, 1);
begin
  select
    count(*)::integer,
    count(*) filter (where slot = 'starter')::integer,
    count(*) filter (where slot = 'bench')::integer,
    count(*) filter (where is_captain)::integer
  into v_total, v_starters, v_bench, v_captain
  from public.fantasy_team_players
  where team_id = p_team_id;

  if v_total > 15 then
    raise exception 'Maximo de 15 jugadores por plantel';
  end if;

  if v_starters > 11 then
    raise exception 'Maximo de 11 titulares';
  end if;

  if v_bench > 4 then
    raise exception 'Maximo de 4 suplentes';
  end if;

  if v_captain > 1 then
    raise exception 'Solo puede haber un capitan';
  end if;

  if exists (
    select 1
    from public.fantasy_team_players ftp
    where ftp.team_id = p_team_id
      and ftp.is_captain = true
      and ftp.slot <> 'starter'
  ) then
    raise exception 'El capitan debe ser titular';
  end if;

  if exists (
    select 1
    from public.fantasy_team_players ftp
    join public.players p on p.id = ftp.player_id
    where ftp.team_id = p_team_id
    group by p.national_team_id
    having count(*) > 3
  ) then
    raise exception 'No se permiten mas de 3 jugadores por seleccion';
  end if;

  if exists (
    select 1
    from public.fantasy_team_players ftp
    join public.players p on p.id = ftp.player_id
    where ftp.team_id = p_team_id
      and ftp.slot = 'bench'
    group by p.position
    having count(*) > 1
  ) then
    raise exception 'Solo se permite 1 suplente por posicion';
  end if;

  select budget into v_budget
  from public.fantasy_teams
  where id = p_team_id;

  select coalesce(sum(p.price), 0)::numeric(6, 1)
  into v_cost
  from public.fantasy_team_players ftp
  join public.players p on p.id = ftp.player_id
  where ftp.team_id = p_team_id;

  if v_cost > v_budget then
    raise exception 'Superaste el presupuesto del equipo';
  end if;
end;
$$;

create or replace function public.enforce_fantasy_team_state()
returns trigger
language plpgsql
as $$
begin
  perform public.validate_fantasy_team_state(coalesce(new.team_id, old.team_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_enforce_fantasy_team_state on public.fantasy_team_players;
create trigger trg_enforce_fantasy_team_state
  after insert or update or delete on public.fantasy_team_players
  for each row execute function public.enforce_fantasy_team_state();

create or replace function public.prevent_late_predictions()
returns trigger
language plpgsql
as $$
declare
  v_kickoff timestamptz;
begin
  select kickoff_at into v_kickoff
  from public.fixtures
  where id = new.fixture_id;

  if v_kickoff is null then
    raise exception 'Fixture invalido';
  end if;

  if now() >= v_kickoff then
    raise exception 'La prediccion esta bloqueada porque el partido ya comenzo';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prode_prediction_lock on public.prode_predictions;
create trigger trg_prode_prediction_lock
  before insert or update on public.prode_predictions
  for each row execute function public.prevent_late_predictions();

create or replace function public.match_outcome(home_score integer, away_score integer)
returns smallint
language sql
immutable
as $$
  select case
    when home_score > away_score then 1
    when home_score < away_score then -1
    else 0
  end;
$$;

create or replace view public.v_fantasy_user_matchday_scores as
select
  ft.user_id,
  pmp.matchday_id,
  sum(
    case
      when ftp.slot = 'starter' and ftp.is_captain then pmp.points * 2
      when ftp.slot = 'starter' then pmp.points
      else 0
    end
  )::integer as points
from public.fantasy_teams ft
join public.fantasy_team_players ftp on ftp.team_id = ft.id
join public.player_matchday_points pmp on pmp.player_id = ftp.player_id
group by ft.user_id, pmp.matchday_id;

create or replace view public.v_fantasy_user_totals as
select
  user_id,
  coalesce(sum(points), 0)::integer as points
from public.v_fantasy_user_matchday_scores
group by user_id;

create or replace view public.v_prode_user_fixture_points as
select
  pp.user_id,
  f.matchday_id,
  pp.fixture_id,
  case
    when f.status <> 'finished' then null
    when pp.predicted_home_score = f.home_score and pp.predicted_away_score = f.away_score then 5
    when (pp.predicted_home_score - pp.predicted_away_score) = (f.home_score - f.away_score) then 3
    when public.match_outcome(pp.predicted_home_score, pp.predicted_away_score) = public.match_outcome(f.home_score, f.away_score) then 2
    when pp.predicted_home_score = f.home_score or pp.predicted_away_score = f.away_score then 1
    else 0
  end::integer as points
from public.prode_predictions pp
join public.fixtures f on f.id = pp.fixture_id;

create or replace view public.v_prode_user_matchday_scores as
select
  user_id,
  matchday_id,
  coalesce(sum(points), 0)::integer as points
from public.v_prode_user_fixture_points
where points is not null
group by user_id, matchday_id;

create or replace view public.v_prode_user_totals as
select
  user_id,
  coalesce(sum(points), 0)::integer as points
from public.v_prode_user_matchday_scores
group by user_id;

create or replace view public.v_global_standings as
with fantasy as (
  select user_id, points as fantasy_points
  from public.v_fantasy_user_totals
),
prode as (
  select user_id, points as prode_points
  from public.v_prode_user_totals
)
select
  p.id as user_id,
  coalesce(nullif(p.display_name, ''), nullif(p.username, ''), 'Jugador') as display_name,
  coalesce(f.fantasy_points, 0)::integer as fantasy_points,
  coalesce(pr.prode_points, 0)::integer as prode_points,
  (coalesce(f.fantasy_points, 0) + coalesce(pr.prode_points, 0))::integer as combined_points
from public.profiles p
left join fantasy f on f.user_id = p.id
left join prode pr on pr.user_id = p.id;

create or replace view public.v_league_standings as
with fantasy as (
  select user_id, points as fantasy_points
  from public.v_fantasy_user_totals
),
prode as (
  select user_id, points as prode_points
  from public.v_prode_user_totals
)
select
  lm.league_id,
  lm.user_id,
  coalesce(nullif(p.display_name, ''), nullif(p.username, ''), 'Jugador') as display_name,
  coalesce(f.fantasy_points, 0)::integer as fantasy_points,
  coalesce(pr.prode_points, 0)::integer as prode_points,
  (coalesce(f.fantasy_points, 0) + coalesce(pr.prode_points, 0))::integer as combined_points
from public.league_members lm
join public.profiles p on p.id = lm.user_id
left join fantasy f on f.user_id = lm.user_id
left join prode pr on pr.user_id = lm.user_id;

create or replace function public.is_league_member(p_league_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.league_members lm
    where lm.league_id = p_league_id
      and lm.user_id = auth.uid()
  );
$$;

create or replace function public.is_league_owner(p_league_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.leagues l
    where l.id = p_league_id
      and l.owner_id = auth.uid()
  );
$$;

grant execute on function public.is_league_member(uuid) to authenticated;
grant execute on function public.is_league_owner(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.national_teams enable row level security;
alter table public.players enable row level security;
alter table public.matchdays enable row level security;
alter table public.fixtures enable row level security;
alter table public.player_matchday_points enable row level security;
alter table public.fantasy_teams enable row level security;
alter table public.fantasy_team_players enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.prode_predictions enable row level security;

drop policy if exists profiles_select_auth on public.profiles;
create policy profiles_select_auth on public.profiles
  for select to authenticated
  using (true);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists teams_public_read on public.national_teams;
create policy teams_public_read on public.national_teams
  for select to authenticated
  using (true);

drop policy if exists players_public_read on public.players;
create policy players_public_read on public.players
  for select to authenticated
  using (true);

drop policy if exists matchdays_public_read on public.matchdays;
create policy matchdays_public_read on public.matchdays
  for select to authenticated
  using (true);

drop policy if exists fixtures_public_read on public.fixtures;
create policy fixtures_public_read on public.fixtures
  for select to authenticated
  using (true);

drop policy if exists player_points_public_read on public.player_matchday_points;
create policy player_points_public_read on public.player_matchday_points
  for select to authenticated
  using (true);

drop policy if exists fantasy_teams_select_auth on public.fantasy_teams;
create policy fantasy_teams_select_auth on public.fantasy_teams
  for select to authenticated
  using (true);

drop policy if exists fantasy_teams_insert_self on public.fantasy_teams;
create policy fantasy_teams_insert_self on public.fantasy_teams
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists fantasy_teams_update_self on public.fantasy_teams;
create policy fantasy_teams_update_self on public.fantasy_teams
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists fantasy_teams_delete_self on public.fantasy_teams;
create policy fantasy_teams_delete_self on public.fantasy_teams
  for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists fantasy_team_players_select_auth on public.fantasy_team_players;
create policy fantasy_team_players_select_auth on public.fantasy_team_players
  for select to authenticated
  using (true);

drop policy if exists fantasy_team_players_insert_owner on public.fantasy_team_players;
create policy fantasy_team_players_insert_owner on public.fantasy_team_players
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.fantasy_teams ft
      where ft.id = fantasy_team_players.team_id
        and ft.user_id = auth.uid()
    )
  );

drop policy if exists fantasy_team_players_update_owner on public.fantasy_team_players;
create policy fantasy_team_players_update_owner on public.fantasy_team_players
  for update to authenticated
  using (
    exists (
      select 1
      from public.fantasy_teams ft
      where ft.id = fantasy_team_players.team_id
        and ft.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.fantasy_teams ft
      where ft.id = fantasy_team_players.team_id
        and ft.user_id = auth.uid()
    )
  );

drop policy if exists fantasy_team_players_delete_owner on public.fantasy_team_players;
create policy fantasy_team_players_delete_owner on public.fantasy_team_players
  for delete to authenticated
  using (
    exists (
      select 1
      from public.fantasy_teams ft
      where ft.id = fantasy_team_players.team_id
        and ft.user_id = auth.uid()
    )
  );

drop policy if exists leagues_select_members on public.leagues;
create policy leagues_select_members on public.leagues
  for select to authenticated
  using (
    owner_id = auth.uid()
    or public.is_league_member(leagues.id)
  );

drop policy if exists leagues_insert_owner on public.leagues;
create policy leagues_insert_owner on public.leagues
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists leagues_update_owner on public.leagues;
create policy leagues_update_owner on public.leagues
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists leagues_delete_owner on public.leagues;
create policy leagues_delete_owner on public.leagues
  for delete to authenticated
  using (owner_id = auth.uid());

drop policy if exists league_members_select_same_league on public.league_members;
create policy league_members_select_same_league on public.league_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_league_member(league_members.league_id)
    or public.is_league_owner(league_members.league_id)
  );

drop policy if exists league_members_insert_self on public.league_members;
create policy league_members_insert_self on public.league_members
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists league_members_delete_self_or_owner on public.league_members;
create policy league_members_delete_self_or_owner on public.league_members
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.leagues l
      where l.id = league_members.league_id
        and l.owner_id = auth.uid()
    )
  );

drop policy if exists prode_predictions_select_auth on public.prode_predictions;
create policy prode_predictions_select_auth on public.prode_predictions
  for select to authenticated
  using (true);

drop policy if exists prode_predictions_insert_self on public.prode_predictions;
create policy prode_predictions_insert_self on public.prode_predictions
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists prode_predictions_update_self on public.prode_predictions;
create policy prode_predictions_update_self on public.prode_predictions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists prode_predictions_delete_self on public.prode_predictions;
create policy prode_predictions_delete_self on public.prode_predictions
  for delete to authenticated
  using (user_id = auth.uid());

commit;
