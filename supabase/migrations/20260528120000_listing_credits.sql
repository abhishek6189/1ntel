alter table public.profiles
  add column if not exists free_listings_used integer not null default 0,
  add column if not exists paid_listing_credits integer not null default 0;

create table if not exists public.listing_credit_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text,
  credits integer not null default 1,
  created_at timestamp with time zone not null default now()
);

alter table public.listing_credit_payments enable row level security;

drop policy if exists "Users can view their listing credit payments" on public.listing_credit_payments;
create policy "Users can view their listing credit payments"
on public.listing_credit_payments
for select
using (auth.uid() = user_id);

do $$
begin
  if to_regclass('public.cars') is not null then
    update public.profiles p
    set free_listings_used = least(2, listing_counts.total)
    from (
      select seller_id, count(*)::integer as total
      from public.cars
      group by seller_id
    ) listing_counts
    where p.id = listing_counts.seller_id;
  end if;
end $$;

create or replace function public.consume_listing_slot(_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_profile public.profiles%rowtype;
begin
  select *
  into selected_profile
  from public.profiles
  where id = _user_id
  limit 1
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'Profile not found.');
  end if;

  if coalesce(selected_profile.free_listings_used, 0) < 2 then
    update public.profiles
    set free_listings_used = free_listings_used + 1
    where id = selected_profile.id;

    return jsonb_build_object('ok', true, 'slot', 'free');
  end if;

  if coalesce(selected_profile.paid_listing_credits, 0) > 0 then
    update public.profiles
    set paid_listing_credits = paid_listing_credits - 1
    where id = selected_profile.id;

    return jsonb_build_object('ok', true, 'slot', 'paid');
  end if;

  return jsonb_build_object('ok', false, 'reason', 'Listing limit reached. Buy an individual listing credit.');
end;
$$;

create or replace function public.add_paid_listing_credit(_user_id uuid, _credits integer default 1)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set paid_listing_credits = coalesce(paid_listing_credits, 0) + greatest(_credits, 0)
  where id = _user_id;
end;
$$;

create or replace function public.record_listing_credit_payment(
  _user_id uuid,
  _stripe_checkout_session_id text,
  _stripe_payment_intent_id text default null,
  _credits integer default 1
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
  safe_credits integer;
begin
  safe_credits := greatest(coalesce(_credits, 1), 1);

  insert into public.listing_credit_payments (
    user_id,
    stripe_checkout_session_id,
    stripe_payment_intent_id,
    credits
  )
  values (
    _user_id,
    _stripe_checkout_session_id,
    _stripe_payment_intent_id,
    safe_credits
  )
  on conflict (stripe_checkout_session_id) do nothing;

  get diagnostics inserted_count = row_count;

  if inserted_count = 0 then
    return false;
  end if;

  perform public.add_paid_listing_credit(_user_id, safe_credits);
  return true;
end;
$$;
