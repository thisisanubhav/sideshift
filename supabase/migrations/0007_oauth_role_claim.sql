-- Google sign-in needs a way to set the role that Google never asks for.
--
-- handle_new_user() reads the role out of raw_user_meta_data, which our own
-- signup form supplies. An OAuth signup has no such form, so the trigger
-- defaults the account to 'creator' — meaning a brand who clicks "Continue with
-- Google" would silently become a creator, on a product whose whole argument is
-- that state is never ambiguous.
--
-- The fix: the role is chosen on our page BEFORE the redirect to Google, and
-- claimed here on the way back.
--
-- This is deliberately not an UPDATE policy on profiles. It is a one-shot claim:
-- it only works while the account is genuinely new, so it cannot be replayed
-- later to switch sides and pick up someone else's campaigns or applications.

create or replace function claim_role(p_role user_role)
returns user_role
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_current user_role;
  v_has_history boolean;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  select role into v_current from profiles where id = v_uid;
  if v_current is null then
    raise exception 'No profile for this account' using errcode = 'P0002';
  end if;

  -- Already the right side: nothing to do, and safe to call repeatedly.
  if v_current = p_role then
    return v_current;
  end if;

  -- Anything that would be orphaned by a side-switch closes the door.
  select
    exists (select 1 from campaigns c join brands b on b.id = c.brand_id
             where b.profile_id = v_uid)
    or exists (select 1 from applications a join creators cr on cr.id = a.creator_id
                where cr.profile_id = v_uid)
    or exists (select 1 from threads t
                join brands b on b.id = t.brand_id
                join creators cr on cr.id = t.creator_id
               where b.profile_id = v_uid or cr.profile_id = v_uid)
  into v_has_history;

  if v_has_history then
    raise exception 'This account already has activity and cannot change side'
      using errcode = '22023';
  end if;

  update profiles set role = p_role where id = v_uid;

  -- Move the side-specific row across, carrying the display name over.
  if p_role = 'brand' then
    delete from creators where profile_id = v_uid;
    insert into brands (profile_id, name)
    select v_uid, display_name from profiles where id = v_uid
    on conflict (profile_id) do nothing;
  else
    delete from brands where profile_id = v_uid;
    insert into creators (profile_id)
    values (v_uid)
    on conflict (profile_id) do nothing;
  end if;

  return p_role;
end;
$$;

grant execute on function claim_role(user_role) to authenticated;
