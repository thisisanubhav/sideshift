-- Demo-mode signup: no email round-trip.
--
-- The definition of done requires signing up as a brand in one browser and a
-- creator in another, in one sitting. With GoTrue's "Confirm email" setting on,
-- signup returns a user but no session, and the flow stalls on a link nobody is
-- going to click during a walkthrough.
--
-- The usual fix is a dashboard toggle. This does it as a migration instead,
-- which is reproducible from the repo and does not depend on who is logged into
-- the Supabase dashboard:
--
--   GoTrue decides whether to *issue a session at signup* from its own config,
--   but it decides whether to *allow a sign-in* by reading email_confirmed_at
--   off the row. Stamping that column on insert means the account is usable
--   immediately; the signup action then signs the user straight in.
--
-- This is a deliberate demo-mode trade-off and is documented in the README:
-- it means email addresses are never verified. A production deployment would
-- drop this migration and leave confirmation on.

create or replace function auto_confirm_new_users()
returns trigger
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;

-- BEFORE INSERT, so the column is set on the row GoTrue writes.
-- Runs alongside the existing AFTER INSERT trigger that creates the profile.
drop trigger if exists auto_confirm_users on auth.users;
create trigger auto_confirm_users
  before insert on auth.users
  for each row execute function auto_confirm_new_users();
