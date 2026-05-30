create table if not exists public.seller_reviews (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_id, reviewer_id)
);

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

alter table public.seller_reviews enable row level security;

drop policy if exists "Seller reviews are viewable by everyone" on public.seller_reviews;
drop policy if exists "Users can review other sellers" on public.seller_reviews;
drop policy if exists "Users can update their own seller review" on public.seller_reviews;
drop policy if exists "Admins can manage seller reviews" on public.seller_reviews;

create policy "Seller reviews are viewable by everyone"
  on public.seller_reviews
  for select
  using (true);

create policy "Users can review other sellers"
  on public.seller_reviews
  for insert
  with check (auth.uid() = reviewer_id and auth.uid() <> seller_id);

create policy "Users can update their own seller review"
  on public.seller_reviews
  for update
  using (auth.uid() = reviewer_id)
  with check (auth.uid() = reviewer_id and auth.uid() <> seller_id);

create policy "Admins can manage seller reviews"
  on public.seller_reviews
  for all
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

drop trigger if exists update_seller_reviews_updated_at on public.seller_reviews;
create trigger update_seller_reviews_updated_at
  before update on public.seller_reviews
  for each row
  execute function public.update_updated_at_column();
