begin;

alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists phone text;

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
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do update
  set
    username = coalesce(nullif(public.profiles.username, ''), excluded.username),
    display_name = coalesce(nullif(public.profiles.display_name, ''), excluded.display_name),
    first_name = coalesce(nullif(public.profiles.first_name, ''), excluded.first_name),
    last_name = coalesce(nullif(public.profiles.last_name, ''), excluded.last_name),
    phone = coalesce(nullif(public.profiles.phone, ''), excluded.phone);
  return new;
end;
$$;

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
  )
from auth.users u
where p.id = u.id
  and (
    coalesce(nullif(p.username, ''), '') = ''
    or coalesce(nullif(p.first_name, ''), '') = ''
    or coalesce(nullif(p.last_name, ''), '') = ''
    or coalesce(nullif(p.display_name, ''), '') = ''
  );

commit;
