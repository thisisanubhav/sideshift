-- Privilege escalation fix.
--
-- approve_deliverable and request_changes guarded with:
--
--     if v_owner is null or v_owner <> v_brand_id then raise ... end if;
--
-- For a caller who is not a brand, `select id into v_brand_id from brands
-- where profile_id = auth.uid()` leaves v_brand_id NULL. `v_owner <> NULL` is
-- NULL, not true, so the OR is NULL, so the branch never fires and the guard
-- silently passes. A creator could call approve_deliverable on their own
-- submission and release their own escrowed payment.
--
-- Caught by tests/thread.mjs, which asserts the creator is refused. Before this
-- migration that call returned 204.
--
-- Two changes, belt and braces:
--   1. an explicit NULL check on the caller's brand id, matching what
--      accept_application and decline_application already did;
--   2. `is distinct from` instead of `<>`, which is NULL-safe.

create or replace function approve_deliverable(p_deliverable_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_brand_id  uuid;
  v_thread_id uuid;
  v_owner     uuid;
  v_status    deliverable_status;
begin
  select id into v_brand_id from brands where profile_id = auth.uid();
  if v_brand_id is null then
    raise exception 'Only the brand on this thread can approve a deliverable'
      using errcode = '42501';
  end if;

  select d.thread_id, t.brand_id, d.status into v_thread_id, v_owner, v_status
    from deliverables d join threads t on t.id = d.thread_id
   where d.id = p_deliverable_id for update of d;

  if v_owner is null or v_owner is distinct from v_brand_id then
    raise exception 'That deliverable is not on one of your threads'
      using errcode = '42501';
  end if;
  if v_status = 'approved' then
    raise exception 'This deliverable is already approved' using errcode = '22023';
  end if;

  update deliverables set status = 'approved', reviewed_at = now(),
         review_note = nullif(trim(coalesce(p_note, '')), '')
   where id = p_deliverable_id;

  update threads set status = 'complete', completed_at = now() where id = v_thread_id;

  update payments set status = 'released', released_at = now()
   where thread_id = v_thread_id and status <> 'released';
end;
$$;

create or replace function request_changes(p_deliverable_id uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_brand_id  uuid;
  v_thread_id uuid;
  v_owner     uuid;
  v_status    deliverable_status;
begin
  select id into v_brand_id from brands where profile_id = auth.uid();
  if v_brand_id is null then
    raise exception 'Only the brand on this thread can request changes'
      using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_note, '')), '') is null then
    raise exception 'Say what needs to change' using errcode = '23514';
  end if;

  select d.thread_id, t.brand_id, d.status into v_thread_id, v_owner, v_status
    from deliverables d join threads t on t.id = d.thread_id
   where d.id = p_deliverable_id for update of d;

  if v_owner is null or v_owner is distinct from v_brand_id then
    raise exception 'That deliverable is not on one of your threads'
      using errcode = '42501';
  end if;
  if v_status = 'approved' then
    raise exception 'This deliverable is already approved' using errcode = '22023';
  end if;

  update deliverables set status = 'changes_requested', reviewed_at = now(),
         review_note = trim(p_note)
   where id = p_deliverable_id;

  update threads set status = 'active' where id = v_thread_id;

  update payments set status = 'escrowed', in_review_at = null
   where thread_id = v_thread_id and status = 'in_review';
end;
$$;

-- accept_application already checked `if v_brand_id is null`, but its campaign
-- comparison used `<>` too. Harmless today because the null check fires first;
-- made NULL-safe anyway so the pattern is consistent everywhere.
create or replace function accept_application(p_application_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_app       applications%rowtype;
  v_campaign  campaigns%rowtype;
  v_brand_id  uuid;
  v_thread_id uuid;
begin
  select id into v_brand_id from brands where profile_id = auth.uid();
  if v_brand_id is null then
    raise exception 'Only a brand can accept an application' using errcode = '42501';
  end if;

  select * into v_app from applications where id = p_application_id for update;
  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;

  select * into v_campaign from campaigns where id = v_app.campaign_id for update;

  if v_campaign.brand_id is distinct from v_brand_id then
    raise exception 'This application is not on your campaign' using errcode = '42501';
  end if;
  if v_app.status <> 'pending' then
    raise exception 'This application is already %', v_app.status using errcode = '22023';
  end if;
  if v_app.expires_at < now() then
    raise exception 'The 48-hour response window on this application has closed' using errcode = '22023';
  end if;
  if v_campaign.slots_filled >= v_campaign.slots_total then
    raise exception 'Every slot on this campaign is filled' using errcode = '22023';
  end if;

  update applications set status = 'accepted', responded_at = now() where id = v_app.id;

  update campaigns
     set slots_filled = slots_filled + 1,
         status    = case when slots_filled + 1 >= slots_total then 'closed'::campaign_status else status end,
         closed_at = case when slots_filled + 1 >= slots_total then now() else closed_at end
   where id = v_campaign.id;

  insert into threads (campaign_id, brand_id, creator_id, application_id)
  values (v_campaign.id, v_brand_id, v_app.creator_id, v_app.id)
  returning id into v_thread_id;

  insert into payments (thread_id, amount_cents, status, escrowed_at)
  values (v_thread_id, v_app.rate_cents, 'escrowed', now());

  return v_thread_id;
end;
$$;

create or replace function decline_application(
  p_application_id uuid, p_reason decline_reason, p_note text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_brand_id uuid;
  v_owner_id uuid;
  v_status   application_status;
begin
  select id into v_brand_id from brands where profile_id = auth.uid();
  if v_brand_id is null then
    raise exception 'Only a brand can decline an application' using errcode = '42501';
  end if;
  if p_reason is null then
    raise exception 'A decline needs a reason' using errcode = '23514';
  end if;

  select c.brand_id, a.status into v_owner_id, v_status
    from applications a join campaigns c on c.id = a.campaign_id
   where a.id = p_application_id for update of a;

  if v_owner_id is null then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;
  if v_owner_id is distinct from v_brand_id then
    raise exception 'This application is not on your campaign' using errcode = '42501';
  end if;
  if v_status <> 'pending' then
    raise exception 'This application is already %', v_status using errcode = '22023';
  end if;

  update applications
     set status = 'declined', responded_at = now(), decline_reason = p_reason,
         decline_note = nullif(trim(coalesce(p_note, '')), '')
   where id = p_application_id;
end;
$$;
