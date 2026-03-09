begin;

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

create index if not exists idx_prode_multipliers_matchday on public.prode_matchday_multipliers(matchday_id);
create index if not exists idx_prode_multipliers_fixture on public.prode_matchday_multipliers(fixture_id);

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

drop trigger if exists trg_prode_multipliers_updated_at on public.prode_matchday_multipliers;
create trigger trg_prode_multipliers_updated_at
  before update on public.prode_matchday_multipliers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_prode_podium_updated_at on public.prode_podium_picks;
create trigger trg_prode_podium_updated_at
  before update on public.prode_podium_picks
  for each row execute function public.set_updated_at();

drop trigger if exists trg_prode_multiplier_lock on public.prode_matchday_multipliers;
create trigger trg_prode_multiplier_lock
  before insert or update on public.prode_matchday_multipliers
  for each row execute function public.validate_prode_matchday_multiplier();

drop trigger if exists trg_prode_podium_lock on public.prode_podium_picks;
create trigger trg_prode_podium_lock
  before insert or update on public.prode_podium_picks
  for each row execute function public.prevent_late_podium_picks();

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

alter table public.prode_matchday_multipliers enable row level security;
alter table public.prode_podium_picks enable row level security;

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

commit;
