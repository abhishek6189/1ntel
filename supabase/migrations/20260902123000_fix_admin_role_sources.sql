-- Keep the role helper aligned with this deployment's profiles-based roles.
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
    where profiles.id = $1
      and lower(coalesce(profiles.role::text, '')) = 'admin'
  );
$$;

grant execute on function public.is_admin_user(uuid) to authenticated;

drop policy if exists "Admins can read dealer requests" on public.dealer_requests;
drop policy if exists "Admins can update dealer requests" on public.dealer_requests;

create policy "Admins can read dealer requests"
  on public.dealer_requests for select to authenticated
  using (
    public.is_admin_user(auth.uid())
    or auth.uid() = '01cd8582-2595-403b-82bf-95cbc5f3a4c8'::uuid
  );

create policy "Admins can update dealer requests"
  on public.dealer_requests for update to authenticated
  using (
    public.is_admin_user(auth.uid())
    or auth.uid() = '01cd8582-2595-403b-82bf-95cbc5f3a4c8'::uuid
  )
  with check (
    public.is_admin_user(auth.uid())
    or auth.uid() = '01cd8582-2595-403b-82bf-95cbc5f3a4c8'::uuid
  );
