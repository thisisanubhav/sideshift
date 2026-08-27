-- Row level security.
--
-- Reading is governed by policies. *Writing a status field is not* — every state
-- transition goes through a SECURITY DEFINER function in 0003 that authorises the
-- caller explicitly. There is deliberately no UPDATE policy on applications,
-- deliverables or payments, so a creator cannot promote their own application to
-- 'accepted' even with a raw API token. See tests/rls.test.ts.

-- ---------------------------------------------------------------------------
-- Helpers. SECURITY DEFINER so that policies on profiles/brands/creators do not
-- recurse into themselves when resolving the caller's identity.
-- ---------------------------------------------------------------------------

create or replace function current_role_of_user()
returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function current_brand_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from brands where profile_id = auth.uid()
$$;

create or replace function current_creator_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from creators where profile_id = auth.uid()
$$;

-- Is the caller one of the two participants in this thread?
create or replace function is_thread_participant(p_thread_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from threads t
    join brands b on b.id = t.brand_id
    join creators c on c.id = t.creator_id
    where t.id = p_thread_id
      and (b.profile_id = auth.uid() or c.profile_id = auth.uid())
  )
$$;

-- ---------------------------------------------------------------------------
alter table profiles     enable row level security;
alter table brands       enable row level security;
alter table creators     enable row level security;
alter table campaigns    enable row level security;
alter table applications enable row level security;
alter table threads      enable row level security;
alter table messages     enable row level security;
alter table deliverables enable row level security;
alter table payments     enable row level security;

-- ---------------------------------------------------------------------------
-- Identity. Handles and display names are marketplace-public to signed-in users:
-- a creator must be able to see who is running a campaign, and a brand must be
-- able to see the profile of someone who applied to theirs.
-- ---------------------------------------------------------------------------

create policy profiles_read on profiles
  for select to authenticated using (true);
create policy profiles_update_own on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy brands_read on brands
  for select to authenticated using (true);
create policy brands_update_own on brands
  for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy creators_read on creators
  for select to authenticated using (true);
create policy creators_update_own on creators
  for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Campaigns. Open ones are visible to every signed-in user. Drafts are visible
-- only to the brand that owns them.
-- ---------------------------------------------------------------------------

create policy campaigns_read_open_or_own on campaigns
  for select to authenticated
  using (status <> 'draft' or brand_id = current_brand_id());

create policy campaigns_insert_own on campaigns
  for insert to authenticated
  with check (brand_id = current_brand_id() and current_role_of_user() = 'brand');

create policy campaigns_update_own on campaigns
  for update to authenticated
  using (brand_id = current_brand_id())
  with check (brand_id = current_brand_id());

create policy campaigns_delete_own_draft on campaigns
  for delete to authenticated
  using (brand_id = current_brand_id() and status = 'draft');

-- ---------------------------------------------------------------------------
-- Applications. A creator reads only their own. A brand reads only those sent
-- to campaigns it owns. No UPDATE policy exists on purpose.
-- ---------------------------------------------------------------------------

create policy applications_read_own_side on applications
  for select to authenticated
  using (
    creator_id = current_creator_id()
    or exists (
      select 1 from campaigns c
      where c.id = applications.campaign_id and c.brand_id = current_brand_id()
    )
  );

create policy applications_insert_own on applications
  for insert to authenticated
  with check (
    creator_id = current_creator_id()
    and current_role_of_user() = 'creator'
    and status = 'pending'
    and responded_at is null
    and decline_reason is null
    and exists (
      select 1 from campaigns c
      where c.id = campaign_id
        and c.status = 'open'
        and c.slots_filled < c.slots_total
    )
  );

-- ---------------------------------------------------------------------------
-- Threads and their contents. Participants only, both sides symmetric.
-- ---------------------------------------------------------------------------

create policy threads_read_participants on threads
  for select to authenticated
  using (
    brand_id = current_brand_id() or creator_id = current_creator_id()
  );

create policy messages_read_participants on messages
  for select to authenticated
  using (is_thread_participant(thread_id));

create policy messages_insert_participants on messages
  for insert to authenticated
  with check (
    sender_profile_id = auth.uid() and is_thread_participant(thread_id)
  );

create policy deliverables_read_participants on deliverables
  for select to authenticated
  using (is_thread_participant(thread_id));

-- Only the creator side of the thread can submit work.
create policy deliverables_insert_creator on deliverables
  for insert to authenticated
  with check (
    status = 'submitted'
    and reviewed_at is null
    and exists (
      select 1 from threads t
      join creators c on c.id = t.creator_id
      where t.id = thread_id and c.profile_id = auth.uid()
    )
  );

-- Payments are read-only to both sides and identical for both sides.
create policy payments_read_participants on payments
  for select to authenticated
  using (is_thread_participant(thread_id));

-- ---------------------------------------------------------------------------
-- Storage: deliverable files live in a private bucket, keyed by thread id.
-- Path convention: <thread_id>/<filename>
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'deliverables', 'deliverables', false, 26214400,
  array['video/mp4','video/quicktime','video/webm','image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;

create policy deliverable_files_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'deliverables'
    and is_thread_participant((storage.foldername(name))[1]::uuid)
  );

create policy deliverable_files_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'deliverables'
    and exists (
      select 1 from threads t
      join creators c on c.id = t.creator_id
      where t.id = (storage.foldername(name))[1]::uuid
        and c.profile_id = auth.uid()
    )
  );
