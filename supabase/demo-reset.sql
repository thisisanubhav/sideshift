-- Restore the demo to a good starting state.
--
-- The countdowns in this app are real clocks, so a marketplace seeded on Tuesday
-- looks different on Thursday: pending applications will have genuinely expired
-- (which is the product working, and worth seeing once). Run this to put three
-- live windows back on the board and reopen the walkthrough thread.
--
-- Safe to run repeatedly. Only touches seeded demo data.

-- 1. Three pending applications with staggered windows, one visibly urgent.
update applications a
   set status = 'pending', responded_at = null, decline_reason = null,
       decline_note = null,
       expires_at = now() + interval '41 minutes'
  from campaigns c, creators cr, profiles p
 where c.id = a.campaign_id and cr.id = a.creator_id and p.id = cr.profile_id
   and c.title like 'Pour-over%' and p.handle = 'hana.pours';

update applications a
   set status = 'pending', responded_at = null, decline_reason = null,
       decline_note = null,
       expires_at = now() + interval '9 hours'
  from campaigns c, creators cr, profiles p
 where c.id = a.campaign_id and cr.id = a.creator_id and p.id = cr.profile_id
   and c.title like 'Pour-over%' and p.handle = 'the.slow.kitchen';

update applications a
   set status = 'pending', responded_at = null, decline_reason = null,
       decline_note = null,
       expires_at = now() + interval '44 hours'
  from campaigns c, creators cr, profiles p
 where c.id = a.campaign_id and cr.id = a.creator_id and p.id = cr.profile_id
   and c.title like 'Cold water%' and p.handle = 'foragerfinn';

-- 2. Reopen the walkthrough thread (Sunlit Skincare x @maya.builds) so the
--    submit -> review -> approve -> released path can be run start to finish.
with t as (
  select th.id from threads th
    join campaigns c on c.id = th.campaign_id
    join creators cr on cr.id = th.creator_id
    join profiles p on p.id = cr.profile_id
   where c.title like 'Barrier repair%' and p.handle = 'maya.builds'
)
delete from deliverables where thread_id in (select id from t);

update payments p
   set status = 'escrowed', in_review_at = null, released_at = null
  from threads th
  join campaigns c on c.id = th.campaign_id
  join creators cr on cr.id = th.creator_id
  join profiles pr on pr.id = cr.profile_id
 where p.thread_id = th.id
   and c.title like 'Barrier repair%' and pr.handle = 'maya.builds';

update threads th
   set status = 'active', completed_at = null
  from campaigns c, creators cr, profiles pr
 where c.id = th.campaign_id and cr.id = th.creator_id and pr.id = cr.profile_id
   and c.title like 'Barrier repair%' and pr.handle = 'maya.builds';

-- 3. Slot counts follow the accepted applications, never the other way round.
update campaigns c
   set slots_filled = coalesce((
         select count(*) from applications a
          where a.campaign_id = c.id and a.status = 'accepted'), 0);

update campaigns
   set status = 'open', closed_at = null
 where slots_filled < slots_total and status = 'closed';

select
  (select count(*) from applications where status = 'pending') as pending,
  (select round(extract(epoch from (min(expires_at) - now())) / 60)
     from applications where status = 'pending') as next_expiry_minutes,
  (select count(*) from campaigns where status = 'open') as open_campaigns;
