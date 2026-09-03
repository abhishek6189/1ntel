-- Store the revised dealer application details and use the verified mobile number for login lookup.
alter table public.dealer_requests add column if not exists auth_email text;
alter table public.dealer_requests add column if not exists omvic_registration_number text;
alter table public.dealer_requests add column if not exists business_phone text;
alter table public.dealer_requests add column if not exists business_email text;
alter table public.dealer_requests add column if not exists dealership_address text;
alter table public.dealer_requests add column if not exists website text;
alter table public.dealer_requests add column if not exists authorization_confirmed boolean not null default false;

alter table public.profiles add column if not exists omvic_registration_number text;
alter table public.profiles add column if not exists dealership_address text;
alter table public.profiles add column if not exists website text;
alter table public.profiles add column if not exists authorization_confirmed boolean not null default false;

drop function if exists public.get_dealer_login_identity(text);

create function public.get_dealer_login_identity(p_phone text)
returns table (
  auth_email text,
  email text,
  phone text,
  role text,
  dealer_status text,
  is_banned boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    dr.auth_email::text,
    coalesce(p.email::text, dr.business_email::text, dr.email::text),
    coalesce(p.phone::text, dr.business_phone::text, dr.phone::text),
    p.role::text,
    p.dealer_status::text,
    coalesce(p.is_banned, false)
  from public.dealer_requests dr
  join public.profiles p on p.id = dr.user_id
  where right(regexp_replace(coalesce(dr.business_phone::text, dr.phone::text), '[^0-9]', '', 'g'), 10)
      = right(regexp_replace(p_phone, '[^0-9]', '', 'g'), 10)
    and lower(coalesce(dr.status::text, '')) = 'approved'
    and lower(coalesce(p.role::text, '')) = 'dealer'
    and lower(coalesce(p.dealer_status::text, '')) = 'approved'
  order by dr.created_at desc
  limit 1;
$$;

revoke all on function public.get_dealer_login_identity(text) from public;
grant execute on function public.get_dealer_login_identity(text) to anon, authenticated;
