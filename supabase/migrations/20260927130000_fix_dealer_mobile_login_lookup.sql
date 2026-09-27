-- Support legacy/profile-only approved dealers when resolving mobile login.
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
  from public.profiles p
  left join lateral (
    select request.*
    from public.dealer_requests request
    where request.user_id = p.id
    order by
      case when lower(coalesce(request.status::text, '')) = 'approved' then 0 else 1 end,
      request.created_at desc
    limit 1
  ) dr on true
  where right(
      regexp_replace(coalesce(dr.business_phone::text, dr.phone::text, p.phone::text), '[^0-9]', '', 'g'),
      10
    ) = right(regexp_replace(p_phone, '[^0-9]', '', 'g'), 10)
    and lower(coalesce(p.role::text, '')) = 'dealer'
    and lower(coalesce(p.dealer_status::text, '')) = 'approved'
  order by dr.created_at desc nulls last, p.created_at desc
  limit 1;
$$;

revoke all on function public.get_dealer_login_identity(text) from public;
grant execute on function public.get_dealer_login_identity(text) to anon, authenticated;
