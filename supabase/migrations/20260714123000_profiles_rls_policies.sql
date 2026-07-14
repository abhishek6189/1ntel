create or replace function public.is_admin_user(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = user_id
      and lower(coalesce(profiles.role::text, '')) = 'admin'
  );
$$;

grant execute on function public.is_admin_user(uuid) to anon, authenticated;

alter table public.profiles enable row level security;

drop policy if exists "Allow read own profile" on public.profiles;
drop policy if exists "Allow insert own profile" on public.profiles;
drop policy if exists "Allow update own profile" on public.profiles;
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Admins can update profiles" on public.profiles;
drop policy if exists "Public can read active seller profiles" on public.profiles;

create policy "Users can read own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles
  for select
  to authenticated
  using (public.is_admin_user(auth.uid()));

create policy "Admins can update profiles"
  on public.profiles
  for update
  to authenticated
  using (public.is_admin_user(auth.uid()))
  with check (public.is_admin_user(auth.uid()));

create policy "Public can read active seller profiles"
  on public.profiles
  for select
  using (
    deleted_at is null
    and coalesce(is_banned, false) = false
    and exists (
      select 1
      from public.cars
      where cars.seller_id = profiles.id
        and (cars.status is null or cars.status = 'active')
    )
  );
