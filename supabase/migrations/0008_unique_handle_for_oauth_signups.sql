-- Google signups have no handle field, so handle_new_user() derives one from
-- the email local part. Two people at different domains with the same local
-- part ("maya@gmail.com", "maya@studio.co") would collide on the UNIQUE
-- constraint and the second signup would fail with a raw Postgres error.
--
-- Also: an email local part can contain characters the handle_shape CHECK
-- rejects (+ and -), which would fail every such signup.
--
-- And Google supplies a real name and avatar, which the old trigger discarded.

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role user_role;
  v_base text;
  v_handle citext;
  v_name text;
  n int := 0;
begin
  v_role := coalesce(new.raw_user_meta_data ->> 'role', 'creator')::user_role;

  -- Prefer the handle our own form supplies; otherwise build a legal one.
  v_base := lower(coalesce(
    new.raw_user_meta_data ->> 'handle',
    split_part(new.email, '@', 1)
  ));
  v_base := regexp_replace(v_base, '[^a-z0-9._]', '', 'g');
  if length(v_base) < 3 then
    v_base := v_base || 'user';
  end if;
  v_base := left(v_base, 24);

  v_handle := v_base;
  while exists (select 1 from profiles p where p.handle = v_handle) loop
    n := n + 1;
    v_handle := v_base || n::text;
  end loop;

  v_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    v_handle::text
  );

  insert into profiles (id, role, display_name, handle, avatar_url)
  values (new.id, v_role, v_name, v_handle,
          nullif(new.raw_user_meta_data ->> 'avatar_url', ''));

  if v_role = 'brand' then
    insert into brands (profile_id, name) values (new.id, v_name);
  else
    insert into creators (profile_id) values (new.id);
  end if;

  return new;
end;
$$;
