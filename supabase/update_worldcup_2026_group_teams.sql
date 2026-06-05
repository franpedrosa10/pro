begin;

-- Reemplaza los placeholders de repechaje por los equipos finales del sorteo.
-- Es seguro re-ejecutarlo: primero crea/actualiza los equipos finales, luego
-- mueve referencias desde codigos viejos y finalmente borra los codigos obsoletos.

insert into public.national_teams (fifa_code, name, group_letter)
values
  ('MEX', 'Mexico', 'A'),
  ('RSA', 'Sudafrica', 'A'),
  ('KOR', 'Corea del Sur', 'A'),
  ('CZE', 'Republica Checa', 'A'),

  ('CAN', 'Canada', 'B'),
  ('BIH', 'Bosnia y Herzegovina', 'B'),
  ('QAT', 'Qatar', 'B'),
  ('SUI', 'Suiza', 'B'),

  ('BRA', 'Brasil', 'C'),
  ('MAR', 'Marruecos', 'C'),
  ('HAI', 'Haiti', 'C'),
  ('SCO', 'Escocia', 'C'),

  ('USA', 'Estados Unidos', 'D'),
  ('PAR', 'Paraguay', 'D'),
  ('AUS', 'Australia', 'D'),
  ('TUR', 'Turquia', 'D'),

  ('GER', 'Alemania', 'E'),
  ('CUW', 'Curazao', 'E'),
  ('CIV', 'Costa de Marfil', 'E'),
  ('ECU', 'Ecuador', 'E'),

  ('NED', 'Paises Bajos', 'F'),
  ('JPN', 'Japon', 'F'),
  ('SWE', 'Suecia', 'F'),
  ('TUN', 'Tunez', 'F'),

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
  ('IRQ', 'Irak', 'I'),
  ('NOR', 'Noruega', 'I'),

  ('ARG', 'Argentina', 'J'),
  ('ALG', 'Argelia', 'J'),
  ('AUT', 'Austria', 'J'),
  ('JOR', 'Jordania', 'J'),

  ('POR', 'Portugal', 'K'),
  ('COD', 'RD Congo', 'K'),
  ('UZB', 'Uzbekistan', 'K'),
  ('COL', 'Colombia', 'K'),

  ('ENG', 'Inglaterra', 'L'),
  ('CRO', 'Croacia', 'L'),
  ('GHA', 'Ghana', 'L'),
  ('PAN', 'Panama', 'L')
on conflict (fifa_code) do update
set
  name = excluded.name,
  group_letter = excluded.group_letter;

with replacements(old_code, new_code) as (
  values
    ('DMA', 'CZE'),
    ('ITP', 'BIH'),
    ('TRK', 'TUR'),
    ('USP', 'SWE'),
    ('IBS', 'IRQ'),
    ('JDC', 'COD')
)
update public.fixtures f
set home_team_id = new_team.id
from replacements r
join public.national_teams old_team on old_team.fifa_code = r.old_code
join public.national_teams new_team on new_team.fifa_code = r.new_code
where f.home_team_id = old_team.id;

with replacements(old_code, new_code) as (
  values
    ('DMA', 'CZE'),
    ('ITP', 'BIH'),
    ('TRK', 'TUR'),
    ('USP', 'SWE'),
    ('IBS', 'IRQ'),
    ('JDC', 'COD')
)
update public.fixtures f
set away_team_id = new_team.id
from replacements r
join public.national_teams old_team on old_team.fifa_code = r.old_code
join public.national_teams new_team on new_team.fifa_code = r.new_code
where f.away_team_id = old_team.id;

with replacements(old_code, new_code) as (
  values
    ('DMA', 'CZE'),
    ('ITP', 'BIH'),
    ('TRK', 'TUR'),
    ('USP', 'SWE'),
    ('IBS', 'IRQ'),
    ('JDC', 'COD')
)
update public.prode_podium_picks p
set champion_team_id = new_team.id
from replacements r
join public.national_teams old_team on old_team.fifa_code = r.old_code
join public.national_teams new_team on new_team.fifa_code = r.new_code
where p.champion_team_id = old_team.id;

with replacements(old_code, new_code) as (
  values
    ('DMA', 'CZE'),
    ('ITP', 'BIH'),
    ('TRK', 'TUR'),
    ('USP', 'SWE'),
    ('IBS', 'IRQ'),
    ('JDC', 'COD')
)
update public.prode_podium_picks p
set runner_up_team_id = new_team.id
from replacements r
join public.national_teams old_team on old_team.fifa_code = r.old_code
join public.national_teams new_team on new_team.fifa_code = r.new_code
where p.runner_up_team_id = old_team.id;

with replacements(old_code, new_code) as (
  values
    ('DMA', 'CZE'),
    ('ITP', 'BIH'),
    ('TRK', 'TUR'),
    ('USP', 'SWE'),
    ('IBS', 'IRQ'),
    ('JDC', 'COD')
)
update public.players p
set national_team_id = new_team.id
from replacements r
join public.national_teams old_team on old_team.fifa_code = r.old_code
join public.national_teams new_team on new_team.fifa_code = r.new_code
where p.national_team_id = old_team.id;

delete from public.national_teams
where fifa_code in ('DMA', 'ITP', 'TRK', 'USP', 'IBS', 'JDC');

commit;
