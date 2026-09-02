-- Dealer applications are created by the applicant and reviewed by admins.
-- Keep this migration additive because some deployed environments already have
-- an older, partially defined dealer_requests table.
create table if not exists public.dealer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  auth_email text,
  full_name text,
  business_name text,
  dealer_license_number text,
  license_number text,
  phone text,
  city text,
  province text,
  license_document_url text,
  documents text,
  status text not null default 'pending',
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dealer_requests add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.dealer_requests add column if not exists email text;
alter table public.dealer_requests add column if not exists auth_email text;
alter table public.dealer_requests add column if not exists full_name text;
alter table public.dealer_requests add column if not exists business_name text;
alter table public.dealer_requests add column if not exists dealer_license_number text;
alter table public.dealer_requests add column if not exists license_number text;
alter table public.dealer_requests add column if not exists phone text;
alter table public.dealer_requests add column if not exists city text;
alter table public.dealer_requests add column if not exists province text;
alter table public.dealer_requests add column if not exists license_document_url text;
alter table public.dealer_requests add column if not exists documents text;
alter table public.dealer_requests add column if not exists status text default 'pending';
alter table public.dealer_requests add column if not exists rejection_reason text;
alter table public.dealer_requests add column if not exists created_at timestamptz default now();
alter table public.dealer_requests add column if not exists updated_at timestamptz default now();

create index if not exists dealer_requests_user_id_idx
  on public.dealer_requests (user_id);
create index if not exists dealer_requests_created_at_idx
  on public.dealer_requests (created_at desc);

alter table public.dealer_requests enable row level security;

drop policy if exists "Applicants can create dealer requests" on public.dealer_requests;
drop policy if exists "Applicants can read own dealer requests" on public.dealer_requests;
drop policy if exists "Admins can read dealer requests" on public.dealer_requests;
drop policy if exists "Admins can update dealer requests" on public.dealer_requests;

create policy "Applicants can create dealer requests"
  on public.dealer_requests
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Applicants can read own dealer requests"
  on public.dealer_requests
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins can read dealer requests"
  on public.dealer_requests
  for select
  to authenticated
  using (public.is_admin_user(auth.uid()));

create policy "Admins can update dealer requests"
  on public.dealer_requests
  for update
  to authenticated
  using (public.is_admin_user(auth.uid()))
  with check (public.is_admin_user(auth.uid()));

