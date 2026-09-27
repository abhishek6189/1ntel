-- Provider-independent dealer inventory syndication for 1ntel.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create table if not exists public.inventory_integrations (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null default 'auto'
    check (source_type in ('auto', 'website', 'json', 'xml', 'csv')),
  source_url text not null,
  status text not null default 'active'
    check (status in ('active', 'paused', 'disconnected', 'error')),
  authorization_confirmed boolean not null default false,
  sync_interval_minutes integer not null default 60
    check (sync_interval_minutes between 30 and 1440),
  last_sync_started_at timestamptz,
  last_sync_completed_at timestamptz,
  next_sync_at timestamptz default now(),
  last_sync_status text,
  last_error text,
  last_items_found integer not null default 0,
  last_items_created integer not null default 0,
  last_items_updated integer not null default 0,
  last_items_removed integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dealer_id)
);

create table if not exists public.inventory_sync_runs (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.inventory_integrations(id) on delete cascade,
  dealer_id uuid not null references auth.users(id) on delete cascade,
  trigger_type text not null default 'manual'
    check (trigger_type in ('manual', 'scheduled', 'connection')),
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed')),
  items_found integer not null default 0,
  items_created integer not null default 0,
  items_updated integer not null default 0,
  items_removed integer not null default 0,
  items_skipped integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.cars add column if not exists inventory_integration_id uuid
  references public.inventory_integrations(id) on delete set null;
alter table public.cars add column if not exists inventory_source text;
alter table public.cars add column if not exists external_vehicle_id text;
alter table public.cars add column if not exists external_stock_number text;
alter table public.cars add column if not exists source_listing_url text;
alter table public.cars add column if not exists source_updated_at timestamptz;
alter table public.cars add column if not exists last_synced_at timestamptz;
alter table public.cars add column if not exists sync_hash text;
alter table public.cars add column if not exists is_source_managed boolean not null default false;

create unique index if not exists cars_inventory_external_id_unique
  on public.cars (inventory_integration_id, external_vehicle_id)
  where inventory_integration_id is not null and external_vehicle_id is not null;
create index if not exists inventory_integrations_due_idx
  on public.inventory_integrations (next_sync_at)
  where status = 'active';
create index if not exists inventory_sync_runs_integration_idx
  on public.inventory_sync_runs (integration_id, started_at desc);

alter table public.inventory_integrations enable row level security;
alter table public.inventory_sync_runs enable row level security;

drop policy if exists "Dealers can view own inventory integration" on public.inventory_integrations;
drop policy if exists "Dealers can create own inventory integration" on public.inventory_integrations;
drop policy if exists "Dealers can update own inventory integration" on public.inventory_integrations;
drop policy if exists "Dealers can view own inventory sync runs" on public.inventory_sync_runs;

create policy "Dealers can view own inventory integration"
  on public.inventory_integrations for select to authenticated
  using (auth.uid() = dealer_id);
create policy "Dealers can create own inventory integration"
  on public.inventory_integrations for insert to authenticated
  with check (auth.uid() = dealer_id and authorization_confirmed = true);
create policy "Dealers can update own inventory integration"
  on public.inventory_integrations for update to authenticated
  using (auth.uid() = dealer_id)
  with check (auth.uid() = dealer_id);
create policy "Dealers can view own inventory sync runs"
  on public.inventory_sync_runs for select to authenticated
  using (auth.uid() = dealer_id);

-- Source-controlled fields may only be changed by the sync service. Dealers can
-- still feature a synced listing and use other 1ntel-only controls.
create or replace function public.protect_synced_car_source_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.is_source_managed = true
     and coalesce(auth.role(), '') <> 'service_role'
     and (
       new.title is distinct from old.title or
       new.make is distinct from old.make or
       new.model is distinct from old.model or
       new.year is distinct from old.year or
       new.price is distinct from old.price or
       new.mileage is distinct from old.mileage or
       new.location is distinct from old.location or
       new.transmission is distinct from old.transmission or
       new.fuel_type is distinct from old.fuel_type or
       new.body_type is distinct from old.body_type or
       new.drivetrain is distinct from old.drivetrain or
       new.exterior_color is distinct from old.exterior_color or
       new.interior_color is distinct from old.interior_color or
       new.vin is distinct from old.vin or
       new.condition is distinct from old.condition or
       new.description is distinct from old.description or
       new.seller_phone is distinct from old.seller_phone or
       new.status is distinct from old.status
     ) then
    raise exception 'This listing is managed by an inventory connection. Update it at the source or disconnect inventory sync.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_synced_car_source_fields on public.cars;
create trigger protect_synced_car_source_fields
  before update on public.cars
  for each row execute function public.protect_synced_car_source_fields();

-- The token is only readable through the service role and by the scheduled SQL below.
create table if not exists public.inventory_sync_settings (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now()
);
alter table public.inventory_sync_settings enable row level security;
insert into public.inventory_sync_settings (key, value)
values ('scheduler_token', gen_random_uuid()::text || gen_random_uuid()::text)
on conflict (key) do nothing;

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'sync-1ntel-dealer-inventory' limit 1;
  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;

  perform cron.schedule(
    'sync-1ntel-dealer-inventory',
    '*/30 * * * *',
    $command$
      select net.http_post(
        url := 'https://ppgsdxuyjcncftyngqnr.supabase.co/functions/v1/sync-dealer-inventory',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object(
          'action', 'scheduled',
          'scheduler_token', (select value from public.inventory_sync_settings where key = 'scheduler_token')
        )
      );
    $command$
  );
exception
  when insufficient_privilege or undefined_table then
    raise notice 'Automatic inventory cron could not be installed; configure it from the Supabase dashboard.';
end $$;
