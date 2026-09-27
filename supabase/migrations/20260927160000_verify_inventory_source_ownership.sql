-- Inventory authorization must be verified, not only self-attested.
alter table public.inventory_integrations
  add column if not exists source_verified_at timestamptz,
  add column if not exists source_verification_method text,
  add column if not exists verified_by uuid references auth.users(id) on delete set null;

alter table public.inventory_integrations
  drop constraint if exists inventory_integrations_status_check;

alter table public.inventory_integrations
  add constraint inventory_integrations_status_check
  check (status in ('active', 'paused', 'disconnected', 'error', 'pending_verification', 'rejected'));

alter table public.inventory_integrations
  drop constraint if exists inventory_integrations_source_verification_method_check;

alter table public.inventory_integrations
  add constraint inventory_integrations_source_verification_method_check
  check (
    source_verification_method is null
    or source_verification_method in ('registered_website', 'admin_review', 'existing_admin_review')
  );

-- The only connection that existed before this protection was manually created
-- and reviewed during implementation. Preserve it without interrupting service.
update public.inventory_integrations
set source_verified_at = coalesce(source_verified_at, now()),
    source_verification_method = coalesce(source_verification_method, 'existing_admin_review'),
    updated_at = now()
where source_verified_at is null;

-- Dealers use the Edge Function for every mutation. This prevents a logged-in
-- dealer from bypassing verification through a direct PostgREST request.
revoke insert, update, delete on table public.inventory_integrations from authenticated;
grant select on table public.inventory_integrations to authenticated;

drop policy if exists "Admins can view inventory integrations" on public.inventory_integrations;
create policy "Admins can view inventory integrations"
  on public.inventory_integrations for select to authenticated
  using (public.is_admin_user(auth.uid()));
