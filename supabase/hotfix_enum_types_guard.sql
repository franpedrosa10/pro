begin;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'player_position'
  ) then
    create type public.player_position as enum ('GK', 'DEF', 'MID', 'FWD');
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'squad_slot'
  ) then
    create type public.squad_slot as enum ('starter', 'bench');
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'fixture_status'
  ) then
    create type public.fixture_status as enum ('scheduled', 'in_progress', 'finished');
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'league_prize_proposal_kind'
  ) then
    create type public.league_prize_proposal_kind as enum ('money', 'material');
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'notification_kind'
  ) then
    create type public.notification_kind as enum ('general', 'matchday_points', 'result_update', 'admin_broadcast');
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'notification_audience'
  ) then
    create type public.notification_audience as enum ('global', 'country', 'league', 'user');
  end if;
end;
$$;

commit;
