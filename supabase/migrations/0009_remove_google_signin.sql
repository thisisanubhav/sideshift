-- Reverts 0007 and 0008. Google sign-in was removed on request.
--
-- 0007 and 0008 stay in the repo rather than being deleted: they were applied
-- to the live database and are recorded in its migration history, so removing
-- the files would leave the repo describing a schema that never existed. This
-- migration reverses them forward, which is the only honest direction.
--
-- 0008 is reverted too, not just 0007. Its de-duplicating handle loop silently
-- renamed a taken handle to `handle1` instead of raising, which broke the
-- "@handle is taken. Try another handle." error the email signup form depends
-- on. That behaviour only made sense while a handle had to be invented for an
-- OAuth user who was never asked for one.

drop function if exists claim_role(user_role);

-- Restored verbatim from 0001_schema.sql.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role user_role;
  v_handle citext;
begin
  v_role := coalesce(new.raw_user_meta_data ->> 'role', 'creator')::user_role;
  v_handle := lower(coalesce(
    new.raw_user_meta_data ->> 'handle',
    split_part(new.email, '@', 1)
  ));

  insert into profiles (id, role, display_name, handle)
  values (
    new.id, v_role,
    coalesce(new.raw_user_meta_data ->> 'display_name', v_handle::text),
    v_handle
  );

  if v_role = 'brand' then
    insert into brands (profile_id, name)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', v_handle::text));
  else
    insert into creators (profile_id) values (new.id);
  end if;

  return new;
end;
$$;
