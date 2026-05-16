alter table public.profiles
  add column if not exists is_banned boolean not null default false,
  add column if not exists banned_at timestamp with time zone,
  add column if not exists deleted_at timestamp with time zone;
