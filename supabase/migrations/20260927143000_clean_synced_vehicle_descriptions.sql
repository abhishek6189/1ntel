-- Convert previously imported HTML descriptions to readable plain text.
alter table public.cars disable trigger protect_synced_car_source_fields;

update public.cars
set description = trim(
      regexp_replace(
        regexp_replace(
          replace(
            replace(
              replace(
                replace(
                  replace(coalesce(description, ''), '&nbsp;', ' '),
                  '&amp;', '&'
                ),
                '&quot;', '"'
              ),
              '&#39;', ''''
            ),
            '&apos;', ''''
          ),
          '<(br\s*/?|/p|/h[1-6]|/li|/div)>',
          E'\n',
          'gi'
        ),
        '<[^>]+>',
        '',
        'g'
      )
    ),
    sync_hash = null
where is_source_managed = true
  and description ~ '<[^>]+>';

alter table public.cars enable trigger protect_synced_car_source_fields;
