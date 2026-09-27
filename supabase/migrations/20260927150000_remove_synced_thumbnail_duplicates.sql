-- Remove provider thumbnails when full-resolution photos exist for the same synced car.
delete from public.car_images thumbnail
using public.cars car
where thumbnail.car_id = car.id
  and car.is_source_managed = true
  and thumbnail.image_url ~* '/(thumb|thumbnail)[-_]'
  and exists (
    select 1
    from public.car_images original
    where original.car_id = thumbnail.car_id
      and original.id <> thumbnail.id
      and original.image_url !~* '/(thumb|thumbnail)[-_]'
  );

-- Retry connected sources promptly so previously combined provider payloads are normalized.
update public.inventory_integrations
set status = case when status = 'paused' then status else 'active' end,
    next_sync_at = case when status = 'paused' then next_sync_at else now() end,
    updated_at = now()
where status in ('active', 'error', 'paused');
