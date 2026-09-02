-- Give the newly approved temporary dealer its one-time cardless trial.
insert into public.subscriptions (
  user_id, plan, status, max_listings, current_period_start, current_period_end
)
select
  '2f871790-e926-4ee2-8cc8-dfc72f875df7'::uuid,
  'dealer',
  'trialing',
  35,
  now(),
  now() + interval '30 days'
where not exists (
  select 1 from public.subscriptions
  where user_id = '2f871790-e926-4ee2-8cc8-dfc72f875df7'::uuid
    and plan::text = 'dealer'
);

create or replace function public.has_listing_subscription_access(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    not exists (
      select 1 from public.profiles
      where id = target_user_id and lower(coalesce(role::text, '')) = 'dealer'
    )
    or exists (
      select 1
      from public.subscriptions
      where user_id = target_user_id
        and plan::text = 'dealer'
        and (
          status::text = 'active'
          or (
            status::text = 'trialing'
            and current_period_end is not null
            and current_period_end > now()
          )
        )
    );
$$;

revoke all on function public.has_listing_subscription_access(uuid) from public;
grant execute on function public.has_listing_subscription_access(uuid) to authenticated;

drop policy if exists "Dealer subscription required to create cars" on public.cars;
create policy "Dealer subscription required to create cars"
  on public.cars
  as restrictive
  for insert
  to authenticated
  with check (
    auth.uid() = seller_id
    and public.has_listing_subscription_access(auth.uid())
  );

