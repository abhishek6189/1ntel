-- Dealer login needs to resolve the internal Auth email before a session
-- exists. Expose only the minimum fields and only for approved dealers.
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
    p.email::text,
    p.phone::text,
    p.role::text,
    p.dealer_status::text,
    coalesce(p.is_banned, false)
  from public.profiles p
  where trim(p.dealer_license_number::text) = trim(p_license)
    and lower(coalesce(p.role::text, '')) = 'dealer'
    and lower(coalesce(p.dealer_status::text, '')) = 'approved'
  limit 1;
$$;

revoke all on function public.get_dealer_login_identity(text) from public;
grant execute on function public.get_dealer_login_identity(text) to anon, authenticated;
