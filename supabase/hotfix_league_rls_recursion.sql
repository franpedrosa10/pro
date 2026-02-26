begin;

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

drop policy if exists leagues_select_members on public.leagues;
create policy leagues_select_members on public.leagues
  for select to authenticated
  using (
    owner_id = auth.uid()
    or public.is_league_member(leagues.id)
  );

drop policy if exists league_members_select_same_league on public.league_members;
create policy league_members_select_same_league on public.league_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_league_member(league_members.league_id)
    or public.is_league_owner(league_members.league_id)
  );

commit;
