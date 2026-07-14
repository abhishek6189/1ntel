create table if not exists public.site_testimonials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  role text not null default 'user' check (role in ('buyer', 'seller', 'dealer', 'inspector', 'admin', 'user')),
  location text,
  rating integer not null check (rating between 1 and 5),
  message text not null check (char_length(trim(message)) between 10 and 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

alter table public.site_testimonials enable row level security;

create index if not exists site_testimonials_status_created_at_idx
  on public.site_testimonials (status, created_at desc);

create index if not exists site_testimonials_user_id_idx
  on public.site_testimonials (user_id);

create unique index if not exists site_testimonials_one_active_per_user_idx
  on public.site_testimonials (user_id)
  where user_id is not null and status in ('pending', 'approved');

drop policy if exists "Approved testimonials are viewable by everyone" on public.site_testimonials;
drop policy if exists "Users can view their own testimonials" on public.site_testimonials;
drop policy if exists "Users can submit testimonials" on public.site_testimonials;
drop policy if exists "Users can update their pending testimonial" on public.site_testimonials;
drop policy if exists "Admins can manage testimonials" on public.site_testimonials;

create policy "Approved testimonials are viewable by everyone"
  on public.site_testimonials
  for select
  using (status = 'approved');

create policy "Users can view their own testimonials"
  on public.site_testimonials
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can submit testimonials"
  on public.site_testimonials
  for insert
  to authenticated
  with check (auth.uid() = user_id and status = 'pending');

create policy "Users can update their pending testimonial"
  on public.site_testimonials
  for update
  to authenticated
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status = 'pending');

create policy "Admins can manage testimonials"
  on public.site_testimonials
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and lower(coalesce(profiles.role::text, '')) = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and lower(coalesce(profiles.role::text, '')) = 'admin'
    )
  );

drop trigger if exists update_site_testimonials_updated_at on public.site_testimonials;
create trigger update_site_testimonials_updated_at
  before update on public.site_testimonials
  for each row
  execute function public.update_updated_at_column();

do $$
begin
  alter publication supabase_realtime add table public.site_testimonials;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
