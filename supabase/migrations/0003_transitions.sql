-- State transitions.
--
-- Every transition in the product is one SECURITY DEFINER function that checks
-- the caller's authority itself, writes a timestamp, and moves related rows in
-- the same transaction. Nothing in the app updates a status column directly.

-- Expiry is the transition nobody performs, so it needs no responded_at:
-- expires_at is already the moment it happened.
alter table applications drop constraint decided_has_timestamp;
alter table applications add constraint decided_has_timestamp check (
  (status in ('accepted', 'declined', 'withdrawn')) = (responded_at is not null)
);

-- ---------------------------------------------------------------------------
-- Lazy expiry.
--
-- Deliberately not pg_cron. This is called on the reads that care (brand
-- dashboard, campaign detail, creator applications) so the observable behaviour
-- is identical without standing infrastructure. Trade-off noted in the README:
-- an application that lapses while nobody is looking flips the moment someone
-- looks.
-- ---------------------------------------------------------------------------

create or replace function expire_stale_applications()
returns integer language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  update applications
     set status = 'expired'
   where status = 'pending'
     and expires_at < now();
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Accept: consumes a slot, opens the thread, escrows the money. One transaction.
-- ---------------------------------------------------------------------------

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

  -- Lock the campaign so two concurrent accepts cannot oversell the last slot.
  select * into v_campaign from campaigns where id = v_app.campaign_id for update;

  if v_campaign.brand_id <> v_brand_id then
    raise exception 'This application is not on your campaign' using errcode = '42501';
  end if;
  if v_app.status <> 'pending' then
    raise exception 'This application is already %', v_app.status using errcode = '22023';
  end if;
  if v_app.expires_at < now() then
    raise exception 'The 48-hour response window on this application has closed'
      using errcode = '22023';
  end if;
  if v_campaign.slots_filled >= v_campaign.slots_total then
    raise exception 'Every slot on this campaign is filled' using errcode = '22023';
  end if;

  update applications
     set status = 'accepted', responded_at = now()
   where id = v_app.id;

  update campaigns
     set slots_filled = slots_filled + 1,
         status   = case when slots_filled + 1 >= slots_total then 'closed'::campaign_status
                         else status end,
         closed_at = case when slots_filled + 1 >= slots_total then now()
                          else closed_at end
   where id = v_campaign.id;

  insert into threads (campaign_id, brand_id, creator_id, application_id)
  values (v_campaign.id, v_brand_id, v_app.creator_id, v_app.id)
  returning id into v_thread_id;

  -- The accepted rate is the escrowed amount: the brand agreed to what the
  -- creator asked for, not to the campaign's advertised budget.
  insert into payments (thread_id, amount_cents, status, escrowed_at)
  values (v_thread_id, v_app.rate_cents, 'escrowed', now());

  return v_thread_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Decline: a reason is mandatory, and the creator sees it.
-- ---------------------------------------------------------------------------

create or replace function decline_application(
  p_application_id uuid,
  p_reason         decline_reason,
  p_note           text default null
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
    from applications a
    join campaigns c on c.id = a.campaign_id
   where a.id = p_application_id
   for update of a;

  if v_owner_id is null then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;
  if v_owner_id <> v_brand_id then
    raise exception 'This application is not on your campaign' using errcode = '42501';
  end if;
  if v_status <> 'pending' then
    raise exception 'This application is already %', v_status using errcode = '22023';
  end if;

  update applications
     set status = 'declined',
         responded_at = now(),
         decline_reason = p_reason,
         decline_note = nullif(trim(coalesce(p_note, '')), '')
   where id = p_application_id;
end;
$$;

create or replace function withdraw_application(p_application_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_creator_id uuid;
begin
  select id into v_creator_id from creators where profile_id = auth.uid();

  update applications
     set status = 'withdrawn', responded_at = now()
   where id = p_application_id
     and creator_id = v_creator_id
     and status = 'pending';

  if not found then
    raise exception 'That application is not yours, or is no longer pending'
      using errcode = '42501';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Deliverables. Submitting moves the money into review; approving releases it;
-- requesting changes puts it back into escrow.
-- ---------------------------------------------------------------------------

create or replace function submit_deliverable(
  p_thread_id    uuid,
  p_storage_path text default null,
  p_delivery_url text default null,
  p_note         text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_creator_id uuid;
  v_version    integer;
  v_id         uuid;
begin
  select id into v_creator_id from creators where profile_id = auth.uid();

  if not exists (
    select 1 from threads
     where id = p_thread_id and creator_id = v_creator_id and status <> 'complete'
  ) then
    raise exception 'That thread is not yours, or is already complete'
      using errcode = '42501';
  end if;

  if coalesce(nullif(trim(coalesce(p_storage_path, '')), ''),
              nullif(trim(coalesce(p_delivery_url, '')), '')) is null then
    raise exception 'Attach a file or paste a delivery link' using errcode = '23514';
  end if;

  select coalesce(max(version), 0) + 1 into v_version
    from deliverables where thread_id = p_thread_id;

  insert into deliverables (thread_id, version, storage_path, delivery_url, note)
  values (
    p_thread_id, v_version,
    nullif(trim(coalesce(p_storage_path, '')), ''),
    nullif(trim(coalesce(p_delivery_url, '')), ''),
    nullif(trim(coalesce(p_note, '')), '')
  )
  returning id into v_id;

  update threads set status = 'in_review' where id = p_thread_id;
  update payments
     set status = 'in_review', in_review_at = now()
   where thread_id = p_thread_id and status = 'escrowed';

  return v_id;
end;
$$;

create or replace function approve_deliverable(
  p_deliverable_id uuid,
  p_note           text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_brand_id  uuid;
  v_thread_id uuid;
  v_owner     uuid;
  v_status    deliverable_status;
begin
  select id into v_brand_id from brands where profile_id = auth.uid();

  select d.thread_id, t.brand_id, d.status into v_thread_id, v_owner, v_status
    from deliverables d join threads t on t.id = d.thread_id
   where d.id = p_deliverable_id
   for update of d;

  if v_owner is null or v_owner <> v_brand_id then
    raise exception 'That deliverable is not on one of your threads'
      using errcode = '42501';
  end if;
  if v_status = 'approved' then
    raise exception 'This deliverable is already approved' using errcode = '22023';
  end if;

  update deliverables
     set status = 'approved', reviewed_at = now(),
         review_note = nullif(trim(coalesce(p_note, '')), '')
   where id = p_deliverable_id;

  update threads set status = 'complete', completed_at = now() where id = v_thread_id;

  update payments
     set status = 'released', released_at = now()
   where thread_id = v_thread_id and status <> 'released';
end;
$$;

create or replace function request_changes(
  p_deliverable_id uuid,
  p_note           text
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_brand_id  uuid;
  v_thread_id uuid;
  v_owner     uuid;
  v_status    deliverable_status;
begin
  select id into v_brand_id from brands where profile_id = auth.uid();

  if nullif(trim(coalesce(p_note, '')), '') is null then
    raise exception 'Say what needs to change' using errcode = '23514';
  end if;

  select d.thread_id, t.brand_id, d.status into v_thread_id, v_owner, v_status
    from deliverables d join threads t on t.id = d.thread_id
   where d.id = p_deliverable_id
   for update of d;

  if v_owner is null or v_owner <> v_brand_id then
    raise exception 'That deliverable is not on one of your threads'
      using errcode = '42501';
  end if;
  if v_status = 'approved' then
    raise exception 'This deliverable is already approved' using errcode = '22023';
  end if;

  update deliverables
     set status = 'changes_requested', reviewed_at = now(), review_note = trim(p_note)
   where id = p_deliverable_id;

  update threads set status = 'active' where id = v_thread_id;

  -- Money goes back to plain escrow until the next cut lands.
  update payments
     set status = 'escrowed', in_review_at = null
   where thread_id = v_thread_id and status = 'in_review';
end;
$$;

-- ---------------------------------------------------------------------------
-- Brand responsiveness: the share of applications this brand answered inside
-- the 48h window. Computed from real applications, never stored.
--
-- Denominator counts only applications the brand could have answered: accepted,
-- declined, or left to expire. Withdrawals are the creator's move, so they are
-- excluded rather than counted against the brand.
-- ---------------------------------------------------------------------------

-- security_invoker is deliberately OFF. Under RLS a creator can only read their
-- own applications, so an invoker-rights view would compute each creator's rate
-- from their own single data point. The view exposes counts only, never rows.
create or replace view brand_responsiveness
with (security_invoker = false) as
select
  c.brand_id,
  count(*) filter (
    where a.status in ('accepted', 'declined') and a.responded_at <= a.expires_at
  )::integer as answered_in_window,
  count(*) filter (
    where a.status in ('accepted', 'declined', 'expired')
  )::integer as decidable,
  count(*) filter (where a.status = 'pending')::integer as still_pending
from campaigns c
join applications a on a.campaign_id = c.id
group by c.brand_id;

grant select on brand_responsiveness to authenticated, anon;

-- ---------------------------------------------------------------------------

grant execute on function
  expire_stale_applications(),
  accept_application(uuid),
  decline_application(uuid, decline_reason, text),
  withdraw_application(uuid),
  submit_deliverable(uuid, text, text, text),
  approve_deliverable(uuid, text),
  request_changes(uuid, text)
to authenticated;

-- Realtime, on exactly the two tables the demo needs to move without a refresh.
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table payments;
