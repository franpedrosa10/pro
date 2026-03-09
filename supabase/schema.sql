begin;

-- ============================================================================
-- Fantasy + Prode Mundial 2026 - Full schema (consolidated)
-- Includes all core tables, constraints, triggers, views and RLS policies.
-- This file already contains what older hotfix scripts applied incrementally.
-- ============================================================================

create extension if not exists pgcrypto;

grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to anon, authenticated, service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  grant all privileges on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all privileges on sequences to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant execute on functions to anon, authenticated, service_role;

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
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  country_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists country_code text;
alter table public.profiles add column if not exists country_name text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_country_code_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_country_code_check
      check (country_code is null or country_code ~ '^[A-Z]{2}$');
  end if;
end;
$$;

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
  is_country_league boolean not null default false,
  country_code text,
  created_at timestamptz not null default now()
);

alter table public.leagues add column if not exists is_country_league boolean not null default false;
alter table public.leagues add column if not exists country_code text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'leagues_country_code_check'
      and conrelid = 'public.leagues'::regclass
  ) then
    alter table public.leagues
      add constraint leagues_country_code_check
      check (
        (is_country_league = false)
        or (country_code is not null and country_code ~ '^[A-Z]{2}$')
      );
  end if;
end;
$$;

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

create table if not exists public.prode_matchday_multipliers (
  user_id uuid not null references public.profiles(id) on delete cascade,
  matchday_id uuid not null references public.matchdays(id) on delete cascade,
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, matchday_id),
  unique (user_id, fixture_id)
);

create table if not exists public.prode_podium_picks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  champion_team_id uuid not null references public.national_teams(id) on delete restrict,
  runner_up_team_id uuid not null references public.national_teams(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prode_podium_distinct_teams_check check (champion_team_id <> runner_up_team_id)
);

create index if not exists idx_players_team on public.players(national_team_id);
create index if not exists idx_players_active on public.players(is_active);
create index if not exists idx_fixtures_matchday on public.fixtures(matchday_id, kickoff_at);
create index if not exists idx_fantasy_team_players_team on public.fantasy_team_players(team_id);
create index if not exists idx_league_members_user on public.league_members(user_id);
create index if not exists idx_predictions_fixture on public.prode_predictions(fixture_id);
create index if not exists idx_prode_multipliers_matchday on public.prode_matchday_multipliers(matchday_id);
create index if not exists idx_prode_multipliers_fixture on public.prode_matchday_multipliers(fixture_id);
create index if not exists idx_country_leagues_lookup on public.leagues(country_code) where is_country_league = true;
create unique index if not exists idx_country_leagues_unique on public.leagues(country_code) where is_country_league = true;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, first_name, last_name, phone, country_code, country_name)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'username', ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      concat_ws(
        ' ',
        nullif(new.raw_user_meta_data ->> 'first_name', ''),
        nullif(new.raw_user_meta_data ->> 'last_name', '')
      ),
      split_part(new.email, '@', 1)
    ),
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    upper(nullif(new.raw_user_meta_data ->> 'country_code', '')),
    nullif(new.raw_user_meta_data ->> 'country_name', '')
  )
  on conflict (id) do update
  set
    username = coalesce(nullif(public.profiles.username, ''), excluded.username),
    display_name = coalesce(nullif(public.profiles.display_name, ''), excluded.display_name),
    first_name = coalesce(nullif(public.profiles.first_name, ''), excluded.first_name),
    last_name = coalesce(nullif(public.profiles.last_name, ''), excluded.last_name),
    phone = coalesce(nullif(public.profiles.phone, ''), excluded.phone),
    country_code = coalesce(nullif(public.profiles.country_code, ''), excluded.country_code),
    country_name = coalesce(nullif(public.profiles.country_name, ''), excluded.country_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill name fields from auth metadata for old rows created before current trigger logic.
update public.profiles p
set
  username = coalesce(
    nullif(p.username, ''),
    nullif(u.raw_user_meta_data ->> 'username', '')
  ),
  first_name = coalesce(
    nullif(p.first_name, ''),
    nullif(u.raw_user_meta_data ->> 'first_name', '')
  ),
  last_name = coalesce(
    nullif(p.last_name, ''),
    nullif(u.raw_user_meta_data ->> 'last_name', '')
  ),
  display_name = coalesce(
    nullif(p.display_name, ''),
    nullif(u.raw_user_meta_data ->> 'display_name', ''),
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    nullif(trim(concat_ws(' ',
      nullif(u.raw_user_meta_data ->> 'first_name', ''),
      nullif(u.raw_user_meta_data ->> 'last_name', '')
    )), ''),
    split_part(u.email, '@', 1)
  ),
  country_code = coalesce(
    nullif(p.country_code, ''),
    upper(nullif(u.raw_user_meta_data ->> 'country_code', ''))
  ),
  country_name = coalesce(
    nullif(p.country_name, ''),
    nullif(u.raw_user_meta_data ->> 'country_name', '')
  )
from auth.users u
where p.id = u.id
  and (
    coalesce(nullif(p.username, ''), '') = ''
    or coalesce(nullif(p.first_name, ''), '') = ''
    or coalesce(nullif(p.last_name, ''), '') = ''
    or coalesce(nullif(p.display_name, ''), '') = ''
    or coalesce(nullif(p.country_code, ''), '') = ''
    or coalesce(nullif(p.country_name, ''), '') = ''
  );

update public.profiles p
set
  country_code = upper(nullif(u.raw_user_meta_data ->> 'country_code', '')),
  country_name = nullif(u.raw_user_meta_data ->> 'country_name', '')
from auth.users u
where p.id = u.id
  and p.country_code is null
  and nullif(u.raw_user_meta_data ->> 'country_code', '') is not null;

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

drop trigger if exists trg_prode_multipliers_updated_at on public.prode_matchday_multipliers;
create trigger trg_prode_multipliers_updated_at
  before update on public.prode_matchday_multipliers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_prode_podium_updated_at on public.prode_podium_picks;
create trigger trg_prode_podium_updated_at
  before update on public.prode_podium_picks
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

create or replace function public.validate_prode_matchday_multiplier()
returns trigger
language plpgsql
as $$
declare
  v_fixture_matchday_id uuid;
  v_fixture_kickoff timestamptz;
  v_fixture_status public.fixture_status;
  v_matchday_lock_at timestamptz;
begin
  select f.matchday_id, f.kickoff_at, f.status
  into v_fixture_matchday_id, v_fixture_kickoff, v_fixture_status
  from public.fixtures f
  where f.id = new.fixture_id;

  if v_fixture_matchday_id is null then
    raise exception 'Fixture inválido';
  end if;

  if v_fixture_matchday_id <> new.matchday_id then
    raise exception 'El fixture no corresponde a la fecha seleccionada';
  end if;

  select m.lock_at
  into v_matchday_lock_at
  from public.matchdays m
  where m.id = new.matchday_id;

  if v_matchday_lock_at is null then
    raise exception 'Fecha inválida';
  end if;

  if now() >= v_matchday_lock_at then
    raise exception 'El x2 de esta fecha ya está bloqueado';
  end if;

  if v_fixture_status <> 'scheduled' or now() >= v_fixture_kickoff then
    raise exception 'El partido seleccionado para x2 ya está bloqueado';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prode_multiplier_lock on public.prode_matchday_multipliers;
create trigger trg_prode_multiplier_lock
  before insert or update on public.prode_matchday_multipliers
  for each row execute function public.validate_prode_matchday_multiplier();

create or replace function public.prevent_late_podium_picks()
returns trigger
language plpgsql
as $$
declare
  v_group_stage_ends_at timestamptz;
begin
  select m.ends_at
  into v_group_stage_ends_at
  from public.matchdays m
  where m.order_index = 3;

  if v_group_stage_ends_at is null then
    raise exception 'No se encontró la fecha de cierre de grupos';
  end if;

  if now() >= v_group_stage_ends_at then
    raise exception 'La elección de campeón y subcampeón ya está cerrada';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prode_podium_lock on public.prode_podium_picks;
create trigger trg_prode_podium_lock
  before insert or update on public.prode_podium_picks
  for each row execute function public.prevent_late_podium_picks();

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

create or replace view public.v_fantasy_user_matchday_scores
with (security_invoker = true) as
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

create or replace view public.v_fantasy_user_totals
with (security_invoker = true) as
select
  user_id,
  coalesce(sum(points), 0)::integer as points
from public.v_fantasy_user_matchday_scores
group by user_id;

create or replace view public.v_prode_user_fixture_points
with (security_invoker = true) as
select
  pp.user_id,
  f.matchday_id,
  pp.fixture_id,
  case
    when f.status <> 'finished' then null
    else (
      case
        when pp.predicted_home_score = f.home_score and pp.predicted_away_score = f.away_score then 5
        when (pp.predicted_home_score - pp.predicted_away_score) = (f.home_score - f.away_score) then 3
        when public.match_outcome(pp.predicted_home_score, pp.predicted_away_score) = public.match_outcome(f.home_score, f.away_score) then 2
        when pp.predicted_home_score = f.home_score or pp.predicted_away_score = f.away_score then 1
        else 0
      end
      * case when pm.fixture_id is not null then 2 else 1 end
    )
  end::integer as points
from public.prode_predictions pp
join public.fixtures f on f.id = pp.fixture_id
left join public.prode_matchday_multipliers pm
  on pm.user_id = pp.user_id
 and pm.fixture_id = pp.fixture_id
 and pm.matchday_id = f.matchday_id;

create or replace view public.v_prode_user_matchday_scores
with (security_invoker = true) as
select
  user_id,
  matchday_id,
  coalesce(sum(points), 0)::integer as points
from public.v_prode_user_fixture_points
where points is not null
group by user_id, matchday_id;

create or replace view public.v_prode_user_totals
with (security_invoker = true) as
select
  user_id,
  coalesce(sum(points), 0)::integer as points
from public.v_prode_user_matchday_scores
group by user_id;

create or replace view public.v_global_standings
with (security_invoker = true) as
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

create or replace view public.v_league_standings
with (security_invoker = true) as
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

create or replace function public.join_league_with_code(p_join_code text)
returns table(
  league_id uuid,
  league_name text,
  join_code varchar(6),
  already_member boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_league public.leagues%rowtype;
  v_code text;
  v_already boolean;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  v_code := upper(trim(coalesce(p_join_code, '')));
  if v_code !~ '^[A-Z0-9]{6}$' then
    raise exception 'Codigo invalido';
  end if;

  select *
  into v_league
  from public.leagues l
  where l.join_code = v_code;

  if not found then
    raise exception 'Liga no encontrada';
  end if;

  select exists (
    select 1
    from public.league_members lm
    where lm.league_id = v_league.id
      and lm.user_id = v_user_id
  )
  into v_already;

  if not v_already then
    insert into public.league_members (league_id, user_id)
    values (v_league.id, v_user_id)
    on conflict on constraint league_members_pkey do nothing;
  end if;

  return query
  select
    v_league.id,
    v_league.name,
    v_league.join_code,
    v_already;
end;
$$;

create or replace function public.join_country_league()
returns table(
  league_id uuid,
  league_name text,
  join_code varchar(6),
  country_code text,
  country_name text,
  already_member boolean,
  created_now boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_country_code text;
  v_country_name text;
  v_join_code text;
  v_league public.leagues%rowtype;
  v_already boolean;
  v_created boolean := false;
  i integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  select p.country_code, p.country_name
  into v_country_code, v_country_name
  from public.profiles p
  where p.id = v_user_id;

  if v_country_code is null then
    raise exception 'Completa tu pais en Mi cuenta para unirte a la liga oficial';
  end if;

  select *
  into v_league
  from public.leagues l
  where l.is_country_league = true
    and l.country_code = v_country_code;

  if not found then
    for i in 1..20 loop
      v_join_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));

      begin
        insert into public.leagues (owner_id, name, join_code, is_country_league, country_code)
        values (
          v_user_id,
          format('Liga Oficial %s', coalesce(v_country_name, v_country_code)),
          v_join_code,
          true,
          v_country_code
        )
        returning * into v_league;

        v_created := true;
        exit;
      exception
        when unique_violation then
          select *
          into v_league
          from public.leagues l
          where l.is_country_league = true
            and l.country_code = v_country_code;

          if found then
            exit;
          end if;
      end;
    end loop;
  end if;

  if v_league.id is null then
    raise exception 'No se pudo resolver la liga oficial de tu pais';
  end if;

  select exists (
    select 1
    from public.league_members lm
    where lm.league_id = v_league.id
      and lm.user_id = v_user_id
  )
  into v_already;

  if not v_already then
    insert into public.league_members (league_id, user_id)
    values (v_league.id, v_user_id)
    on conflict on constraint league_members_pkey do nothing;
  end if;

  return query
  select
    v_league.id,
    v_league.name,
    v_league.join_code,
    v_country_code,
    coalesce(v_country_name, v_country_code),
    v_already,
    v_created;
end;
$$;

create or replace function public.replace_fantasy_team_players(
  p_team_id uuid,
  p_players jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_payload jsonb;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  if not exists (
    select 1
    from public.fantasy_teams ft
    where ft.id = p_team_id
      and ft.user_id = v_user_id
  ) then
    raise exception 'Equipo no encontrado';
  end if;

  v_payload := coalesce(p_players, '[]'::jsonb);
  if jsonb_typeof(v_payload) <> 'array' then
    raise exception 'Formato de jugadores invalido';
  end if;

  if jsonb_array_length(v_payload) > 15 then
    raise exception 'Maximo de 15 jugadores por plantel';
  end if;

  delete from public.fantasy_team_players
  where team_id = p_team_id;

  insert into public.fantasy_team_players (team_id, player_id, slot, is_captain)
  select
    p_team_id,
    (entry ->> 'player_id')::uuid,
    (entry ->> 'slot')::public.squad_slot,
    coalesce((entry ->> 'is_captain')::boolean, false)
  from jsonb_array_elements(v_payload) as entry;
end;
$$;

grant execute on function public.is_league_member(uuid) to authenticated;
grant execute on function public.is_league_owner(uuid) to authenticated;
grant execute on function public.join_league_with_code(text) to authenticated;
grant execute on function public.join_country_league() to authenticated;
grant execute on function public.replace_fantasy_team_players(uuid, jsonb) to authenticated;

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
alter table public.prode_matchday_multipliers enable row level security;
alter table public.prode_podium_picks enable row level security;

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

drop policy if exists prode_multipliers_select_auth on public.prode_matchday_multipliers;
create policy prode_multipliers_select_auth on public.prode_matchday_multipliers
  for select to authenticated
  using (true);

drop policy if exists prode_multipliers_insert_self on public.prode_matchday_multipliers;
create policy prode_multipliers_insert_self on public.prode_matchday_multipliers
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists prode_multipliers_update_self on public.prode_matchday_multipliers;
create policy prode_multipliers_update_self on public.prode_matchday_multipliers
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists prode_multipliers_delete_self on public.prode_matchday_multipliers;
create policy prode_multipliers_delete_self on public.prode_matchday_multipliers
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists prode_podium_select_auth on public.prode_podium_picks;
create policy prode_podium_select_auth on public.prode_podium_picks
  for select to authenticated
  using (true);

drop policy if exists prode_podium_insert_self on public.prode_podium_picks;
create policy prode_podium_insert_self on public.prode_podium_picks
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists prode_podium_update_self on public.prode_podium_picks;
create policy prode_podium_update_self on public.prode_podium_picks
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists prode_podium_delete_self on public.prode_podium_picks;
create policy prode_podium_delete_self on public.prode_podium_picks
  for delete to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- Base tournament dataset (Mundial 2026)
-- Keep this in schema.sql so a single run leaves the project ready to use.
-- ============================================================================

insert into public.national_teams (fifa_code, name, group_letter)
values
  -- Real teams + intercontinental playoff placeholders (group stage)
  ('MEX', 'Mexico', 'A'),
  ('RSA', 'Sudafrica', 'A'),
  ('KOR', 'Corea del Sur', 'A'),
  ('DMA', 'Dinamarca/Macedonia/Republica Checa/Irlanda', 'A'),

  ('CAN', 'Canada', 'B'),
  ('QAT', 'Qatar', 'B'),
  ('SUI', 'Suiza', 'B'),
  ('ITP', 'Italia/Nigeria/Gales/Bosnia', 'B'),

  ('BRA', 'Brasil', 'C'),
  ('MAR', 'Marruecos', 'C'),
  ('HAI', 'Haiti', 'C'),
  ('SCO', 'Escocia', 'C'),

  ('USA', 'Estados Unidos', 'D'),
  ('PAR', 'Paraguay', 'D'),
  ('AUS', 'Australia', 'D'),
  ('TRK', 'Turquia/Rumania/Eslovaquia/Kosovo', 'D'),

  ('GER', 'Alemania', 'E'),
  ('CUW', 'Curazao', 'E'),
  ('CIV', 'Costa de Marfil', 'E'),
  ('ECU', 'Ecuador', 'E'),

  ('NED', 'Paises Bajos', 'F'),
  ('JPN', 'Japon', 'F'),
  ('TUN', 'Tunez', 'F'),
  ('USP', 'Ucrania/Suecia/Polonia/Albania', 'F'),

  ('BEL', 'Belgica', 'G'),
  ('EGY', 'Egipto', 'G'),
  ('IRN', 'Iran', 'G'),
  ('NZL', 'Nueva Zelanda', 'G'),

  ('ESP', 'Espana', 'H'),
  ('CPV', 'Cabo Verde', 'H'),
  ('KSA', 'Arabia Saudita', 'H'),
  ('URU', 'Uruguay', 'H'),

  ('FRA', 'Francia', 'I'),
  ('SEN', 'Senegal', 'I'),
  ('NOR', 'Noruega', 'I'),
  ('IBS', 'Irak/Bolivia/Surinam', 'I'),

  ('ARG', 'Argentina', 'J'),
  ('ALG', 'Argelia', 'J'),
  ('AUT', 'Austria', 'J'),
  ('JOR', 'Jordania', 'J'),

  ('POR', 'Portugal', 'K'),
  ('COL', 'Colombia', 'K'),
  ('UZB', 'Uzbekistan', 'K'),
  ('JDC', 'Jamaica/RD Congo/Nueva Caledonia', 'K'),

  ('ENG', 'Inglaterra', 'L'),
  ('CRO', 'Croacia', 'L'),
  ('GHA', 'Ghana', 'L'),
  ('PAN', 'Panama', 'L'),

  -- Bracket placeholders (round of 32)
  ('A1', '1ro Grupo A', null),
  ('A2', '2do Grupo A', null),
  ('B1', '1ro Grupo B', null),
  ('B2', '2do Grupo B', null),
  ('C2', '2do Grupo C', null),
  ('D1', '1ro Grupo D', null),
  ('D2', '2do Grupo D', null),
  ('E1', '1ro Grupo E', null),
  ('E2', '2do Grupo E', null),
  ('F1', '1ro Grupo F', null),
  ('F2', '2do Grupo F', null),
  ('G1', '1ro Grupo G', null),
  ('G2', '2do Grupo G', null),
  ('H1', '1ro Grupo H', null),
  ('H2', '2do Grupo H', null),
  ('I1', '1ro Grupo I', null),
  ('I2', '2do Grupo I', null),
  ('J1', '1ro Grupo J', null),
  ('J2', '2do Grupo J', null),
  ('K1', '1ro Grupo K', null),
  ('K2', '2do Grupo K', null),
  ('L1', '1ro Grupo L', null),
  ('L2', '2do Grupo L', null),
  ('T1', '3ro A/B/C/D/F', null),
  ('T2', '3ro C/D/F/G/H', null),
  ('T3', '3ro C/E/F/H/I', null),
  ('T4', '3ro E/H/I/J/K', null),
  ('T5', '3ro B/E/F/I/J', null),
  ('T6', '3ro A/E/H/I/J', null),
  ('T7', '3ro E/F/G/I/J', null),
  ('T8', '3ro D/E/I/J/L', null),

  -- Late bracket placeholders (cannot fit "W100" in varchar(3), using W00)
  ('W00', 'Ganador Partido 100', null),
  ('W01', 'Ganador Partido 101', null),
  ('W02', 'Ganador Partido 102', null),
  ('L01', 'Perdedor Partido 101', null),
  ('L02', 'Perdedor Partido 102', null)
on conflict (fifa_code) do update
set
  name = excluded.name,
  group_letter = excluded.group_letter;

insert into public.national_teams (fifa_code, name, group_letter)
select
  'W' || lpad(gs::text, 2, '0') as fifa_code,
  'Ganador Partido ' || gs as name,
  null::varchar(1) as group_letter
from generate_series(73, 99) as gs
on conflict (fifa_code) do update
set
  name = excluded.name,
  group_letter = excluded.group_letter;

insert into public.matchdays (name, order_index, starts_at, ends_at, lock_at)
values
  ('Fase de grupos - Fecha 1', 1, '2026-06-11T16:00:00-03', '2026-06-17T23:59:59-03', '2026-06-11T15:45:00-03'),
  ('Fase de grupos - Fecha 2', 2, '2026-06-18T13:00:00-03', '2026-06-23T23:59:59-03', '2026-06-18T12:45:00-03'),
  ('Fase de grupos - Fecha 3', 3, '2026-06-24T16:00:00-03', '2026-06-27T23:59:59-03', '2026-06-24T15:45:00-03'),
  ('Dieciseisavos de final', 4, '2026-06-28T16:00:00-03', '2026-07-03T23:59:59-03', '2026-06-28T15:45:00-03'),
  ('Octavos de final', 5, '2026-07-04T16:00:00-03', '2026-07-07T23:59:59-03', '2026-07-04T15:45:00-03'),
  ('Cuartos de final', 6, '2026-07-09T20:00:00-03', '2026-07-11T23:59:59-03', '2026-07-09T19:45:00-03'),
  ('Semifinales', 7, '2026-07-14T20:00:00-03', '2026-07-15T23:59:59-03', '2026-07-14T19:45:00-03'),
  ('Tercer puesto y final', 8, '2026-07-18T20:00:00-03', '2026-07-19T23:59:59-03', '2026-07-18T19:45:00-03')
on conflict (order_index) do update
set
  name = excluded.name,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  lock_at = excluded.lock_at;

insert into public.fixtures (matchday_id, kickoff_at, home_team_id, away_team_id, status)
select
  m.id,
  f.kickoff_at::timestamptz,
  ht.id,
  at.id,
  'scheduled'::public.fixture_status
from (
  values
    -- Group stage: Fecha 1 (matches 1-24)
    (1, '2026-06-11T16:00:00-03', 'MEX', 'RSA'),
    (1, '2026-06-11T23:00:00-03', 'KOR', 'DMA'),
    (1, '2026-06-12T16:00:00-03', 'CAN', 'ITP'),
    (1, '2026-06-12T22:00:00-03', 'USA', 'PAR'),
    (1, '2026-06-13T16:00:00-03', 'QAT', 'SUI'),
    (1, '2026-06-13T19:00:00-03', 'BRA', 'MAR'),
    (1, '2026-06-13T22:00:00-03', 'HAI', 'SCO'),
    (1, '2026-06-14T01:00:00-03', 'AUS', 'TRK'),
    (1, '2026-06-14T14:00:00-03', 'GER', 'CUW'),
    (1, '2026-06-14T17:00:00-03', 'NED', 'JPN'),
    (1, '2026-06-14T20:00:00-03', 'CIV', 'ECU'),
    (1, '2026-06-14T23:00:00-03', 'USP', 'TUN'),
    (1, '2026-06-15T13:00:00-03', 'ESP', 'CPV'),
    (1, '2026-06-15T16:00:00-03', 'BEL', 'EGY'),
    (1, '2026-06-15T19:00:00-03', 'KSA', 'URU'),
    (1, '2026-06-15T22:00:00-03', 'IRN', 'NZL'),
    (1, '2026-06-16T16:00:00-03', 'FRA', 'SEN'),
    (1, '2026-06-16T19:00:00-03', 'IBS', 'NOR'),
    (1, '2026-06-16T22:00:00-03', 'ARG', 'ALG'),
    (1, '2026-06-17T01:00:00-03', 'AUT', 'JOR'),
    (1, '2026-06-17T14:00:00-03', 'POR', 'JDC'),
    (1, '2026-06-17T17:00:00-03', 'ENG', 'CRO'),
    (1, '2026-06-17T20:00:00-03', 'GHA', 'PAN'),
    (1, '2026-06-17T23:00:00-03', 'UZB', 'COL'),

    -- Group stage: Fecha 2 (matches 25-48)
    (2, '2026-06-18T13:00:00-03', 'DMA', 'RSA'),
    (2, '2026-06-18T16:00:00-03', 'SUI', 'ITP'),
    (2, '2026-06-18T19:00:00-03', 'CAN', 'QAT'),
    (2, '2026-06-18T22:00:00-03', 'MEX', 'KOR'),
    (2, '2026-06-19T16:00:00-03', 'USA', 'AUS'),
    (2, '2026-06-19T19:00:00-03', 'SCO', 'MAR'),
    (2, '2026-06-19T22:00:00-03', 'BRA', 'HAI'),
    (2, '2026-06-20T01:00:00-03', 'TRK', 'PAR'),
    (2, '2026-06-20T14:00:00-03', 'NED', 'USP'),
    (2, '2026-06-20T17:00:00-03', 'GER', 'CIV'),
    (2, '2026-06-20T21:00:00-03', 'ECU', 'CUW'),
    (2, '2026-06-21T01:00:00-03', 'TUN', 'JPN'),
    (2, '2026-06-21T13:00:00-03', 'ESP', 'KSA'),
    (2, '2026-06-21T16:00:00-03', 'BEL', 'IRN'),
    (2, '2026-06-21T19:00:00-03', 'URU', 'CPV'),
    (2, '2026-06-21T22:00:00-03', 'NZL', 'EGY'),
    (2, '2026-06-22T14:00:00-03', 'ARG', 'AUT'),
    (2, '2026-06-22T18:00:00-03', 'FRA', 'IBS'),
    (2, '2026-06-22T21:00:00-03', 'NOR', 'SEN'),
    (2, '2026-06-23T00:00:00-03', 'JOR', 'ALG'),
    (2, '2026-06-23T14:00:00-03', 'POR', 'UZB'),
    (2, '2026-06-23T17:00:00-03', 'ENG', 'GHA'),
    (2, '2026-06-23T20:00:00-03', 'PAN', 'CRO'),
    (2, '2026-06-23T23:00:00-03', 'COL', 'JDC'),

    -- Group stage: Fecha 3 (matches 49-72)
    (3, '2026-06-24T16:00:00-03', 'SUI', 'CAN'),
    (3, '2026-06-24T16:00:00-03', 'ITP', 'QAT'),
    (3, '2026-06-24T19:00:00-03', 'MAR', 'HAI'),
    (3, '2026-06-24T19:00:00-03', 'BRA', 'SCO'),
    (3, '2026-06-24T22:00:00-03', 'RSA', 'KOR'),
    (3, '2026-06-24T22:00:00-03', 'DMA', 'MEX'),
    (3, '2026-06-25T17:00:00-03', 'CUW', 'CIV'),
    (3, '2026-06-25T17:00:00-03', 'ECU', 'GER'),
    (3, '2026-06-25T20:00:00-03', 'JPN', 'USP'),
    (3, '2026-06-25T20:00:00-03', 'TUN', 'NED'),
    (3, '2026-06-25T23:00:00-03', 'PAR', 'AUS'),
    (3, '2026-06-25T23:00:00-03', 'TRK', 'USA'),
    (3, '2026-06-26T16:00:00-03', 'NOR', 'FRA'),
    (3, '2026-06-26T16:00:00-03', 'SEN', 'IBS'),
    (3, '2026-06-26T21:00:00-03', 'CPV', 'KSA'),
    (3, '2026-06-26T21:00:00-03', 'URU', 'ESP'),
    (3, '2026-06-27T00:00:00-03', 'EGY', 'IRN'),
    (3, '2026-06-27T00:00:00-03', 'NZL', 'BEL'),
    (3, '2026-06-27T18:00:00-03', 'CRO', 'GHA'),
    (3, '2026-06-27T18:00:00-03', 'PAN', 'ENG'),
    (3, '2026-06-27T20:30:00-03', 'COL', 'POR'),
    (3, '2026-06-27T20:30:00-03', 'JDC', 'UZB'),
    (3, '2026-06-27T23:00:00-03', 'ALG', 'AUT'),
    (3, '2026-06-27T23:00:00-03', 'JOR', 'ARG'),

    -- Round of 32 / Dieciseisavos (matches 73-88)
    (4, '2026-06-28T16:00:00-03', 'A2', 'B2'),
    (4, '2026-06-29T16:00:00-03', 'E1', 'T1'),
    (4, '2026-06-29T20:00:00-03', 'F1', 'C2'),
    (4, '2026-06-29T23:00:00-03', 'E1', 'F2'),
    (4, '2026-06-30T16:00:00-03', 'I1', 'T2'),
    (4, '2026-06-30T20:00:00-03', 'E2', 'I2'),
    (4, '2026-06-30T23:00:00-03', 'A1', 'T3'),
    (4, '2026-07-01T16:00:00-03', 'L1', 'T4'),
    (4, '2026-07-01T20:00:00-03', 'D1', 'T5'),
    (4, '2026-07-01T23:00:00-03', 'G1', 'T6'),
    (4, '2026-07-02T16:00:00-03', 'K2', 'L2'),
    (4, '2026-07-02T20:00:00-03', 'H1', 'J2'),
    (4, '2026-07-02T23:00:00-03', 'B1', 'T7'),
    (4, '2026-07-03T16:00:00-03', 'J1', 'H2'),
    (4, '2026-07-03T20:00:00-03', 'K1', 'T8'),
    (4, '2026-07-03T23:00:00-03', 'D2', 'G2'),

    -- Round of 16 / Octavos (matches 89-96)
    (5, '2026-07-04T16:00:00-03', 'W74', 'W77'),
    (5, '2026-07-04T20:00:00-03', 'W73', 'W75'),
    (5, '2026-07-05T16:00:00-03', 'W76', 'W78'),
    (5, '2026-07-05T20:00:00-03', 'W79', 'W80'),
    (5, '2026-07-06T16:00:00-03', 'W83', 'W84'),
    (5, '2026-07-06T20:00:00-03', 'W81', 'W82'),
    (5, '2026-07-07T16:00:00-03', 'W86', 'W88'),
    (5, '2026-07-07T20:00:00-03', 'W85', 'W87'),

    -- Quarterfinals (matches 97-100)
    (6, '2026-07-09T20:00:00-03', 'W89', 'W90'),
    (6, '2026-07-10T20:00:00-03', 'W93', 'W94'),
    (6, '2026-07-11T20:00:00-03', 'W91', 'W92'),
    (6, '2026-07-11T23:00:00-03', 'W95', 'W96'),

    -- Semifinals (matches 101-102)
    (7, '2026-07-14T20:00:00-03', 'W97', 'W98'),
    (7, '2026-07-15T20:00:00-03', 'W99', 'W00'),

    -- Third place + Final (matches 103-104)
    (8, '2026-07-18T20:00:00-03', 'L01', 'L02'),
    (8, '2026-07-19T20:00:00-03', 'W01', 'W02')
) as f(matchday_order, kickoff_at, home_code, away_code)
join public.matchdays m on m.order_index = f.matchday_order
join public.national_teams ht on ht.fifa_code = f.home_code
join public.national_teams at on at.fifa_code = f.away_code
where not exists (
  select 1
  from public.fixtures existing
  where existing.matchday_id = m.id
    and existing.kickoff_at = f.kickoff_at::timestamptz
    and existing.home_team_id = ht.id
    and existing.away_team_id = at.id
);

commit;

