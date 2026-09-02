-- Promote the verified 1ntel localhost account used by the site owner.
do $$
declare
  target_user_id constant uuid := 'fe66c9c7-edf7-46d2-afa1-d91989231f85'::uuid;
begin
  if not exists (select 1 from auth.users where id = target_user_id) then
    raise exception 'Verified auth user does not exist';
  end if;

  update public.profiles
  set role = 'admin'
  where id = target_user_id;

  if not found then
    raise exception 'Verified auth user has no matching profile';
  end if;
end
$$;

