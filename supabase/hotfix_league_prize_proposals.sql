begin;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'league_prize_proposal_kind'
      and n.nspname = 'public'
  ) then
    create type public.league_prize_proposal_kind as enum ('money', 'material');
  end if;
end;
$$;

create or replace function public.is_first_round_open()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.matchdays m
    where m.order_index = 1
      and now() < m.ends_at
  );
$$;

grant execute on function public.is_first_round_open() to authenticated;

create table if not exists public.league_prize_proposals (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  proposer_user_id uuid not null references public.profiles(id) on delete cascade,
  proposal_kind public.league_prize_proposal_kind not null default 'money',
  amount_per_person numeric(12, 2),
  currency_code text,
  material_description text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_id, proposer_user_id),
  constraint league_prize_proposals_note_len_check check (note is null or char_length(note) <= 160),
  constraint league_prize_proposals_kind_payload_check check (
    (
      proposal_kind = 'money'::public.league_prize_proposal_kind
      and amount_per_person is not null
      and amount_per_person > 0
      and amount_per_person <= 100000000
      and currency_code in ('ARS', 'USD')
      and material_description is null
    )
    or
    (
      proposal_kind = 'material'::public.league_prize_proposal_kind
      and amount_per_person is null
      and currency_code is null
      and material_description is not null
      and char_length(trim(material_description)) between 3 and 160
    )
  )
);

alter table public.league_prize_proposals
  add column if not exists proposal_kind public.league_prize_proposal_kind not null default 'money';
alter table public.league_prize_proposals
  add column if not exists material_description text;
alter table public.league_prize_proposals
  alter column amount_per_person drop not null;
alter table public.league_prize_proposals
  alter column currency_code drop not null;
alter table public.league_prize_proposals
  alter column currency_code drop default;

update public.league_prize_proposals
set proposal_kind = 'money'
where proposal_kind is null;

alter table public.league_prize_proposals
  drop constraint if exists league_prize_proposals_amount_per_person_check;
alter table public.league_prize_proposals
  drop constraint if exists league_prize_proposals_currency_code_check;
alter table public.league_prize_proposals
  drop constraint if exists league_prize_proposals_kind_payload_check;
alter table public.league_prize_proposals
  add constraint league_prize_proposals_kind_payload_check check (
    (
      proposal_kind = 'money'::public.league_prize_proposal_kind
      and amount_per_person is not null
      and amount_per_person > 0
      and amount_per_person <= 100000000
      and currency_code in ('ARS', 'USD')
      and material_description is null
    )
    or
    (
      proposal_kind = 'material'::public.league_prize_proposal_kind
      and amount_per_person is null
      and currency_code is null
      and material_description is not null
      and char_length(trim(material_description)) between 3 and 160
    )
  );

create table if not exists public.league_prize_votes (
  proposal_id uuid not null references public.league_prize_proposals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (proposal_id, user_id)
);

create index if not exists idx_league_prize_proposals_league on public.league_prize_proposals(league_id, created_at);
create index if not exists idx_league_prize_votes_user on public.league_prize_votes(user_id);

drop trigger if exists trg_league_prize_proposals_updated_at on public.league_prize_proposals;
create trigger trg_league_prize_proposals_updated_at
  before update on public.league_prize_proposals
  for each row execute function public.set_updated_at();

create or replace function public.validate_league_prize_proposal()
returns trigger
language plpgsql
as $$
declare
  v_is_country_league boolean;
  v_first_round_ends_at timestamptz;
begin
  select l.is_country_league
  into v_is_country_league
  from public.leagues l
  where l.id = new.league_id;

  if v_is_country_league is null then
    raise exception 'Liga invalida';
  end if;

  if v_is_country_league then
    raise exception 'Esta liga no admite propuestas de premio';
  end if;

  if not exists (
    select 1
    from public.league_members lm
    where lm.league_id = new.league_id
      and lm.user_id = new.proposer_user_id
  ) then
    raise exception 'Solo miembros de la liga pueden proponer premios';
  end if;

  select m.ends_at
  into v_first_round_ends_at
  from public.matchdays m
  where m.order_index = 1;

  if v_first_round_ends_at is null then
    raise exception 'No se encontro el cierre de la Fecha 1';
  end if;

  if now() >= v_first_round_ends_at then
    raise exception 'Las propuestas de premio ya estan cerradas';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_league_prize_proposal_guard on public.league_prize_proposals;
create trigger trg_league_prize_proposal_guard
  before insert or update on public.league_prize_proposals
  for each row execute function public.validate_league_prize_proposal();

create or replace function public.validate_league_prize_vote()
returns trigger
language plpgsql
as $$
declare
  v_proposal_id uuid;
  v_user_id uuid;
  v_league_id uuid;
  v_is_country_league boolean;
  v_first_round_ends_at timestamptz;
begin
  v_proposal_id := coalesce(new.proposal_id, old.proposal_id);
  v_user_id := coalesce(new.user_id, old.user_id);

  select p.league_id, l.is_country_league
  into v_league_id, v_is_country_league
  from public.league_prize_proposals p
  join public.leagues l on l.id = p.league_id
  where p.id = v_proposal_id;

  if v_league_id is null then
    raise exception 'Propuesta invalida';
  end if;

  if v_is_country_league then
    raise exception 'Esta liga no admite votaciones de premio';
  end if;

  if not exists (
    select 1
    from public.league_members lm
    where lm.league_id = v_league_id
      and lm.user_id = v_user_id
  ) then
    raise exception 'Solo miembros de la liga pueden votar';
  end if;

  select m.ends_at
  into v_first_round_ends_at
  from public.matchdays m
  where m.order_index = 1;

  if v_first_round_ends_at is null then
    raise exception 'No se encontro el cierre de la Fecha 1';
  end if;

  if now() >= v_first_round_ends_at then
    raise exception 'Las votaciones de premio ya estan cerradas';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_league_prize_vote_guard on public.league_prize_votes;
create trigger trg_league_prize_vote_guard
  before insert or update or delete on public.league_prize_votes
  for each row execute function public.validate_league_prize_vote();

alter table public.league_prize_proposals enable row level security;
alter table public.league_prize_votes enable row level security;

drop policy if exists league_prize_proposals_select_members on public.league_prize_proposals;
create policy league_prize_proposals_select_members on public.league_prize_proposals
  for select to authenticated
  using (
    public.is_league_member(league_prize_proposals.league_id)
    or public.is_league_owner(league_prize_proposals.league_id)
  );

drop policy if exists league_prize_proposals_insert_self on public.league_prize_proposals;
create policy league_prize_proposals_insert_self on public.league_prize_proposals
  for insert to authenticated
  with check (
    proposer_user_id = auth.uid()
    and public.is_league_member(league_prize_proposals.league_id)
    and exists (
      select 1
      from public.leagues l
      where l.id = league_prize_proposals.league_id
        and l.is_country_league = false
    )
  );

drop policy if exists league_prize_proposals_update_self on public.league_prize_proposals;
create policy league_prize_proposals_update_self on public.league_prize_proposals
  for update to authenticated
  using (
    proposer_user_id = auth.uid()
    and public.is_league_member(league_prize_proposals.league_id)
  )
  with check (
    proposer_user_id = auth.uid()
    and public.is_league_member(league_prize_proposals.league_id)
    and exists (
      select 1
      from public.leagues l
      where l.id = league_prize_proposals.league_id
        and l.is_country_league = false
    )
  );

drop policy if exists league_prize_proposals_delete_self_or_owner on public.league_prize_proposals;
create policy league_prize_proposals_delete_self_or_owner on public.league_prize_proposals
  for delete to authenticated
  using (
    proposer_user_id = auth.uid()
    or public.is_league_owner(league_prize_proposals.league_id)
  );

drop policy if exists league_prize_votes_select_members on public.league_prize_votes;
create policy league_prize_votes_select_members on public.league_prize_votes
  for select to authenticated
  using (
    exists (
      select 1
      from public.league_prize_proposals p
      where p.id = league_prize_votes.proposal_id
        and (
          public.is_league_member(p.league_id)
          or public.is_league_owner(p.league_id)
        )
    )
  );

drop policy if exists league_prize_votes_insert_self on public.league_prize_votes;
create policy league_prize_votes_insert_self on public.league_prize_votes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.league_prize_proposals p
      join public.leagues l on l.id = p.league_id
      where p.id = league_prize_votes.proposal_id
        and l.is_country_league = false
        and public.is_league_member(p.league_id)
    )
  );

drop policy if exists league_prize_votes_delete_self on public.league_prize_votes;
create policy league_prize_votes_delete_self on public.league_prize_votes
  for delete to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.league_prize_proposals p
      where p.id = league_prize_votes.proposal_id
        and public.is_league_member(p.league_id)
    )
  );

commit;
