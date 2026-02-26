begin;

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

commit;
