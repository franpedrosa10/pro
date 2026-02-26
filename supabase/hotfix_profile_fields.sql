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
  on conflict (id) do nothing;
  return new;
end;
$$;

update public.profiles
set display_name = trim(concat_ws(' ', first_name, last_name))
where coalesce(display_name, '') = ''
  and (coalesce(first_name, '') <> '' or coalesce(last_name, '') <> '');

commit;
