-- Profiles and preferences for Tiger Finances.
-- Every user-owned table is keyed by auth.users.id and protected by row-level security.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  username            text not null,
  username_changed_at timestamptz,            -- null until the first rename (first rename is free)
  display_name        text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  constraint profiles_display_name_length check (display_name is null or char_length(display_name) between 1 and 60)
);

-- Usernames are unique regardless of letter case.
create unique index profiles_username_lower_key on public.profiles (lower(username));

-- ---------------------------------------------------------------------------
-- user_preferences
-- ---------------------------------------------------------------------------
create table public.user_preferences (
  user_id                  uuid primary key references auth.users (id) on delete cascade,
  default_market           text not null default 'ALL' check (default_market in ('ALL', 'US', 'CA')),
  default_comparison_range text not null default '1Y' check (default_comparison_range in ('1M', '6M', '1Y', '5Y', 'MAX')),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger user_preferences_touch before update on public.user_preferences
  for each row execute function public.touch_updated_at();

-- Username change policy: at most one change per 14 days, enforced here so no
-- client can bypass it. The first change is free (username_changed_at is null).
create function public.enforce_username_policy() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.username is distinct from old.username then
    if old.username_changed_at is not null
       and now() < old.username_changed_at + interval '14 days' then
      raise exception 'Username can only be changed once every 14 days. Next change available %.',
        to_char(old.username_changed_at + interval '14 days', 'YYYY-MM-DD')
        using errcode = 'P0001';
    end if;
    new.username_changed_at = now();
  else
    -- Never let an update alter the timestamp without a username change.
    new.username_changed_at = old.username_changed_at;
  end if;
  new.id = old.id;
  new.created_at = old.created_at;
  return new;
end $$;

create trigger profiles_username_policy before update on public.profiles
  for each row execute function public.enforce_username_policy();

-- New auth user -> profile + preferences. Runs as table owner (security definer).
-- A missing, invalid or already-taken requested username falls back to a
-- generated one so signup never fails with an opaque database error; the app
-- checks availability beforehand via public.username_available().
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  requested text := new.raw_user_meta_data ->> 'username';
  chosen    text;
begin
  if requested ~ '^[A-Za-z0-9_]{3,20}$'
     and not exists (select 1 from public.profiles where lower(username) = lower(requested)) then
    chosen := requested;
  else
    chosen := 'user_' || substr(md5(new.id::text), 1, 8);
  end if;

  insert into public.profiles (id, username) values (new.id, chosen);
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Availability check used by the registration form. Returns only a boolean.
create function public.username_available(candidate text) returns boolean
language sql stable security definer set search_path = '' as $$
  select candidate ~ '^[A-Za-z0-9_]{3,20}$'
     and not exists (select 1 from public.profiles where lower(username) = lower(candidate));
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;

-- profiles: a user can read and update only their own row. No insert (the
-- signup trigger creates it) and no delete (it cascades from auth.users).
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy preferences_select_own on public.user_preferences
  for select to authenticated using (user_id = (select auth.uid()));
create policy preferences_update_own on public.user_preferences
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Column-level privileges: clients may change only user-editable columns.
revoke all on public.profiles, public.user_preferences from anon, authenticated;
grant select on public.profiles, public.user_preferences to authenticated;
grant update (username, display_name) on public.profiles to authenticated;
grant update (default_market, default_comparison_range) on public.user_preferences to authenticated;

-- Lock down RPCs: only the availability check is callable by clients.
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
