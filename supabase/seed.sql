insert into public.national_teams (fifa_code, name, group_letter)
values
  ('ARG', 'Argentina', 'A'),
  ('BRA', 'Brasil', 'A'),
  ('FRA', 'Francia', 'B'),
  ('ESP', 'Espana', 'B'),
  ('ENG', 'Inglaterra', 'C'),
  ('GER', 'Alemania', 'C')
on conflict (fifa_code) do nothing;

insert into public.players (national_team_id, full_name, position, price)
select t.id, p.full_name, p.position::public.player_position, p.price
from (
  values
    ('ARG', 'Emiliano Martinez', 'GK', 8.0),
    ('ARG', 'Cristian Romero', 'DEF', 9.0),
    ('ARG', 'Alexis Mac Allister', 'MID', 11.5),
    ('ARG', 'Julian Alvarez', 'FWD', 12.5),
    ('BRA', 'Alisson Becker', 'GK', 8.5),
    ('BRA', 'Marquinhos', 'DEF', 9.5),
    ('BRA', 'Bruno Guimaraes', 'MID', 11.0),
    ('BRA', 'Vinicius Junior', 'FWD', 14.5),
    ('FRA', 'Mike Maignan', 'GK', 8.5),
    ('FRA', 'Theo Hernandez', 'DEF', 10.5),
    ('FRA', 'Aurelien Tchouameni', 'MID', 10.5),
    ('FRA', 'Kylian Mbappe', 'FWD', 16.5),
    ('ESP', 'Unai Simon', 'GK', 7.5),
    ('ESP', 'Dani Carvajal', 'DEF', 9.5),
    ('ESP', 'Rodri', 'MID', 12.0),
    ('ESP', 'Lamine Yamal', 'FWD', 14.0),
    ('ENG', 'Jordan Pickford', 'GK', 8.0),
    ('ENG', 'John Stones', 'DEF', 9.5),
    ('ENG', 'Jude Bellingham', 'MID', 14.0),
    ('ENG', 'Harry Kane', 'FWD', 15.5),
    ('GER', 'Marc-Andre ter Stegen', 'GK', 8.0),
    ('GER', 'Antonio Rudiger', 'DEF', 10.0),
    ('GER', 'Jamal Musiala', 'MID', 13.0),
    ('GER', 'Kai Havertz', 'FWD', 12.0)
) as p(team_code, full_name, position, price)
join public.national_teams t on t.fifa_code = p.team_code
on conflict (national_team_id, full_name) do nothing;

insert into public.matchdays (name, order_index, starts_at, ends_at, lock_at)
values
  ('Fecha 1', 1, '2026-06-11T16:00:00Z', '2026-06-18T04:00:00Z', '2026-06-11T15:45:00Z'),
  ('Fecha 2', 2, '2026-06-18T16:00:00Z', '2026-06-25T04:00:00Z', '2026-06-18T15:45:00Z')
on conflict (order_index) do nothing;

insert into public.fixtures (matchday_id, kickoff_at, home_team_id, away_team_id, status)
select m.id, f.kickoff_at::timestamptz, ht.id, at.id, 'scheduled'::public.fixture_status
from (
  values
    (1, '2026-06-11T16:00:00Z', 'ARG', 'ESP'),
    (1, '2026-06-12T19:00:00Z', 'BRA', 'GER'),
    (1, '2026-06-13T19:00:00Z', 'FRA', 'ENG'),
    (2, '2026-06-18T16:00:00Z', 'ARG', 'GER'),
    (2, '2026-06-19T19:00:00Z', 'ENG', 'BRA'),
    (2, '2026-06-20T19:00:00Z', 'ESP', 'FRA')
) as f(matchday_order, kickoff_at, home_code, away_code)
join public.matchdays m on m.order_index = f.matchday_order
join public.national_teams ht on ht.fifa_code = f.home_code
join public.national_teams at on at.fifa_code = f.away_code
where not exists (
  select 1
  from public.fixtures existing
  where existing.matchday_id = m.id
    and existing.home_team_id = ht.id
    and existing.away_team_id = at.id
);
