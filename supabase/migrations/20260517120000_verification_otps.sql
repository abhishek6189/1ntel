create table if not exists public.verification_otps (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  purpose text not null,
  otp_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists verification_otps_lookup_idx
  on public.verification_otps (identifier, purpose, created_at desc);

alter table public.verification_otps enable row level security;
