begin;

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

grant execute on function public.join_league_with_code(text) to authenticated;
grant execute on function public.join_country_league() to authenticated;

commit;
