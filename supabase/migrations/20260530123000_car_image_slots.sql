alter table if exists public.car_images
  add column if not exists angle text,
  add column if not exists sort_order integer;

create index if not exists idx_car_images_car_sort
  on public.car_images (car_id, sort_order);
