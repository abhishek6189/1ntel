create or replace function public.get_dealer_login_identity(p_license text)
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
    null::text as auth_email,
    coalesce(p.email::text, dr.email::text),
    coalesce(p.phone::text, dr.phone::text),
    p.role::text,
    p.dealer_status::text,
    coalesce(p.is_banned, false)
  from public.dealer_requests dr
  join public.profiles p on p.id = dr.user_id
  where trim(coalesce(dr.dealer_license_number::text, dr.license_number::text)) = trim(p_license)
    and lower(coalesce(dr.status::text, '')) = 'approved'
    and lower(coalesce(p.role::text, '')) = 'dealer'
    and lower(coalesce(p.dealer_status::text, '')) = 'approved'
  order by dr.created_at desc
  limit 1;
$$;

revoke all on function public.get_dealer_login_identity(text) from public;
grant execute on function public.get_dealer_login_identity(text) to anon, authenticated;

