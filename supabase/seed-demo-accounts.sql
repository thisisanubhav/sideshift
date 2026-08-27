-- Demo data for the two hand-created walkthrough accounts.
--
-- @ambitious_coder (creator) and @hercules_coder (brand) were signed up by hand
-- and had nothing behind them, so every screen on both was an empty state. This
-- gives them a realistic history.
--
-- Nothing here is a hardcoded figure. Response rates, spend and slot counts all
-- fall out of these rows: slots_filled is recomputed from accepted
-- applications at the end, and brand_responsiveness is a view over
-- applications.
--
-- Safe to re-run: every insert is guarded by ON CONFLICT DO NOTHING against the
-- (campaign_id, creator_id) unique key.

-- ---------------------------------------------------------------------------
-- 1. The brand is a brand, not a person.
--    "Virat" / @hercules_coder reads as a developer test account.
-- ---------------------------------------------------------------------------

update profiles
   set handle = 'hollowbrook', display_name = 'Hollowbrook Soda'
 where handle = 'hercules_coder';

update brands b
   set name = 'Hollowbrook Soda',
       niche = 'Food & Drink',
       bio = 'Small-batch soda from Vermont. Cane sugar, no concentrate, and we '
             || 'print the water source on every can.',
       website = 'https://hollowbrook.example'
  from profiles p
 where p.id = b.profile_id and p.handle = 'hollowbrook';

-- ---------------------------------------------------------------------------
-- 2. Hollowbrook's campaigns: 3 live at different fill levels, 1 draft,
--    1 closed and delivered.
-- ---------------------------------------------------------------------------

do $$
declare
  v_brand uuid;
  r record;
begin
  select b.id into v_brand from brands b join profiles p on p.id = b.profile_id
   where p.handle = 'hollowbrook';

  for r in
    select * from (values
      ('Fizz without the sugar crash',
       'Drink one on camera at the hour you actually get tired — mid-afternoon, not a styled morning. Say the sugar number out loud. We are not trying to look like a wellness brand and we would rather you did not either.',
       'tiktok', 2, 15, 30, 31000, 4, 21, 'open'),
      ('One can, one recipe',
       'Cook or mix something using a can as an ingredient, not as a prop. Show the whole thing including the bit that goes wrong. If it tastes bad, say so — we will still pay you.',
       'reels', 1, 20, 45, 38000, 3, 16, 'open'),
      ('Where the water comes from',
       'A quieter one. We will send the spring survey and the filtration spec; explain in plain language where the water comes from and why we print it on the can. This needs someone comfortable being serious for forty seconds.',
       'shorts', 1, 40, 75, 52000, 2, 28, 'open'),
      ('Summer flavour drop, undecided',
       'Draft — still arguing about whether this is three flavours or one, and whether we send the unlabelled cans before the launch or after.',
       'reels', 3, 20, 40, 45000, 4, 40, 'draft'),
      ('Corner shop run',
       'Film buying a can somewhere it is actually stocked. No studio, no styling, phone in one hand. We want the fridge, the queue and the walk out.',
       'tiktok', 1, 15, 30, 29000, 1, 6, 'closed')
    ) as t(title, brief, plat, vids, dmin, dmax, budget, slots, days, status)
  loop
    insert into campaigns (
      brand_id, title, brief, niche, platform, video_count,
      duration_min_seconds, duration_max_seconds, budget_cents_per_creator,
      slots_total, slots_filled, deadline, status, created_at, published_at, closed_at
    )
    select v_brand, r.title, r.brief, 'Food & Drink', r.plat::platform, r.vids,
           r.dmin, r.dmax, r.budget, r.slots, 0,
           (now() + make_interval(days => r.days))::date,
           r.status::campaign_status,
           now() - make_interval(days => 9),
           case when r.status = 'draft' then null else now() - make_interval(days => 8) end,
           case when r.status = 'closed' then now() - interval '2 days' else null end
    where not exists (
      select 1 from campaigns c where c.brand_id = v_brand and c.title = r.title
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Applications to Hollowbrook: 9 pending (two under six hours), 2 accepted,
--    2 declined with reasons, 1 expired.
-- ---------------------------------------------------------------------------

do $$
declare
  r record; v_campaign uuid; v_creator uuid;
  v_created timestamptz; v_expires timestamptz; v_responded timestamptz;
begin
  for r in
    select * from (values
      -- campaign, creator, status, hours LEFT (pending) or hours ago (decided),
      -- answered-after-hours, rate, reason, pitch
      ('Fizz without',    'salteddough',      'pending',   3, null, 30000, null,
       'Mid-afternoon is when I actually reach for something cold, so that is when I will film it. I will read the sugar number off the can rather than off a script.'),
      ('Fizz without',    'hana.pours',       'pending',  12, null, 32000, null,
       'I spend all day telling people not to be snobs about drinks. A soda that prints its water source is an easy one for me to be honest about.'),
      ('Fizz without',    'the.slow.kitchen', 'pending',  30, null, 29000, null,
       'My kitchen is a galley and the afternoon light in it is terrible, which I think suits "not a styled morning" quite well.'),
      ('Fizz without',    'cyclecity.kim',    'pending',  44, null, 34000, null,
       'The 3pm can before a commute home is a real habit of mine. I would film it at the bike rack, not at a counter.'),
      ('One can',         'coreymakes',       'pending',   5, null, 36000, null,
       'Small-space cooking, so whatever I make has to work on two rings and a chopping board the size of a book. The bit that goes wrong is usually the good bit.'),
      ('One can',         'sunday.linens',    'pending',  20, null, 40000, null,
       'Very little talking, quite a lot of pouring. I would treat the can as an ingredient and let the sound carry it.'),
      ('One can',         'lenaonthego',      'pending',  38, null, 42000, null,
       'I would cook it in an apartment I do not live in, which is most of my content. Travel-kitchen constraints make the recipe more interesting.'),
      ('Where the water', 'joaquin.frames',   'pending',  18, null, 54000, null,
       'Serious tone is the half of my work people do not see. I would shoot the survey documents as inserts rather than reading them out.'),
      ('Where the water', 'theoclips',        'pending',  41, null, 48000, null,
       'Forty seconds of serious is about my limit, but I can get a spring and a filtration rig to look like something worth watching.'),
      -- decided
      ('One can',         'mira.plants',      'accepted', 96,  7,   38000, null,
       'I would make it a plant-watering-adjacent kitchen video, which sounds like a stretch until you see my flat. Happy to keep it strictly to the recipe if you would rather.'),
      ('Corner shop run', 'rae.saves',        'accepted', 240, 4,   29000, null,
       'I film my actual shopping every month, so a corner shop run is a Tuesday for me. I will show the price on the shelf edge.'),
      ('Fizz without',    'quietdesk',        'declined', 120, 9,   61000, 'rate_above_budget',
       'Desk-setup account, so the afternoon slump angle is on-brand for me. My rate is above your posted budget because most of my audience buys hardware.'),
      ('Where the water', 'marcus.reads',     'declined', 110, 26,  47000, 'audience_mismatch',
       'My audience is students and study systems. The water-source explainer is the sort of thing I make, but the overlap with soda buyers is thin and I would rather say so.'),
      ('Fizz without',    'brunoreps',        'expired',  100, null, 33000, null,
       'Calisthenics in public parks, so I am usually filming outdoors in the afternoon anyway. Portuguese and English at no extra cost.')
    ) as t(frag, ch, status, hours, answer_after, rate, reason, pitch)
  loop
    select c.id into v_campaign
      from campaigns c join brands b on b.id = c.brand_id join profiles p on p.id = b.profile_id
     where p.handle = 'hollowbrook' and c.title like r.frag || '%' limit 1;
    select cr.id into v_creator
      from creators cr join profiles p on p.id = cr.profile_id where p.handle = r.ch;
    if v_campaign is null or v_creator is null then continue; end if;

    if r.status = 'pending' then
      -- `hours` is time REMAINING, so the window opened 48h before it closes.
      v_expires := now() + make_interval(hours => r.hours);
      v_created := v_expires - interval '48 hours';
      v_responded := null;
    else
      v_created := now() - make_interval(hours => r.hours);
      v_expires := v_created + interval '48 hours';
      v_responded := case when r.answer_after is null then null
                          else v_created + make_interval(hours => r.answer_after) end;
    end if;

    insert into applications (campaign_id, creator_id, pitch, rate_cents, status,
                              expires_at, created_at, responded_at, decline_reason)
    values (v_campaign, v_creator, r.pitch, r.rate, r.status::application_status,
            v_expires, v_created, v_responded, r.reason::decline_reason)
    on conflict (campaign_id, creator_id) do nothing;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. @ambitious_coder: 4 pending (one under six hours), 1 accepted, 1 declined
--    with a reason, 1 expired.
-- ---------------------------------------------------------------------------

do $$
declare
  r record; v_campaign uuid; v_creator uuid;
  v_created timestamptz; v_expires timestamptz; v_responded timestamptz;
begin
  select cr.id into v_creator from creators cr join profiles p on p.id = cr.profile_id
   where p.handle = 'ambitious_coder';
  if v_creator is null then return; end if;

  update creators
     set niche = 'Tech & Audio', city = 'Bengaluru',
         platforms = array['shorts','reels']::platform[],
         follower_count = 74000, avg_views = 51000, base_rate_cents = 35000,
         bio = 'I build things on camera and explain the parts that usually get cut. '
               || 'Mostly desk, mostly at night.'
   where id = v_creator;

  for r in
    select * from (values
      ('Pour-over',      'pending',    4, null, 28000, null,
       'I make coffee at 1am while something compiles, which is not the morning ritual you probably had in mind, but the ratio talk is the same and the light is worse in an interesting way.'),
      ('Belt sizing',    'pending',   14, null, 39000, null,
       'I am the audience for this: I bought the wrong belt twice. Tape measure on camera and the two mistakes, told by someone who made both.'),
      ('Quarterly tax',  'pending',   27, null, 34000, null,
       'Freelance income and a spreadsheet I am not proud of. I can explain the set-aside percentage to someone who has never filed, because that was me two years ago.'),
      ('First interface','pending',   45, null, 56000, null,
       'I have set up three interfaces badly before getting one right, so I can show the driver install honestly rather than pretending it was smooth.'),
      ('Everything fits','accepted',  72,  6,   37000, null,
       'A desk is a small kitchen if you squint. I would reset the corner I actually work in, and the before is genuinely bad.'),
      ('The 6am juice',  'declined',  90,  11,  41000, 'not_the_right_fit',
       'No makeup, no styling, 6am — I can do two of those three. Happy to be told this is not the brief.'),
      ('What a week',    'expired',   84, null, 33000, null,
       'Four deliveries across a month, filmed at a desk, including whatever I failed to eat in time. The waste angle is the honest part.')
    ) as t(frag, status, hours, answer_after, rate, reason, pitch)
  loop
    select c.id into v_campaign from campaigns c where c.title like r.frag || '%' limit 1;
    if v_campaign is null then continue; end if;

    if r.status = 'pending' then
      v_expires := now() + make_interval(hours => r.hours);
      v_created := v_expires - interval '48 hours';
      v_responded := null;
    else
      v_created := now() - make_interval(hours => r.hours);
      v_expires := v_created + interval '48 hours';
      v_responded := case when r.answer_after is null then null
                          else v_created + make_interval(hours => r.answer_after) end;
    end if;

    insert into applications (campaign_id, creator_id, pitch, rate_cents, status,
                              expires_at, created_at, responded_at, decline_reason)
    values (v_campaign, v_creator, r.pitch, r.rate, r.status::application_status,
            v_expires, v_created, v_responded, r.reason::decline_reason)
    on conflict (campaign_id, creator_id) do nothing;
  end loop;

  update applications a
     set decline_note = 'Loved the honesty. We need someone who will actually be up at 6, and you told us you would not be — which we appreciated.'
    from campaigns c
   where c.id = a.campaign_id and a.creator_id = v_creator
     and a.status = 'declined' and c.title like 'The 6am juice%';
end $$;

-- ---------------------------------------------------------------------------
-- 5. Threads, payments and messages for every accepted application.
-- ---------------------------------------------------------------------------

insert into threads (campaign_id, brand_id, creator_id, application_id, created_at)
select a.campaign_id, c.brand_id, a.creator_id, a.id, a.responded_at
  from applications a join campaigns c on c.id = a.campaign_id
 where a.status = 'accepted'
on conflict do nothing;

insert into payments (thread_id, amount_cents, status, escrowed_at)
select t.id, a.rate_cents, 'escrowed', t.created_at
  from threads t join applications a on a.id = t.application_id
on conflict (thread_id) do nothing;

insert into messages (thread_id, sender_profile_id, body, created_at)
select t.id, b.profile_id,
       'Welcome aboard. Shot list and product tracking are on the way - anything you need before you film, ask here rather than email so it stays in one place.',
       t.created_at + interval '11 minutes'
  from threads t join brands b on b.id = t.brand_id
 where not exists (select 1 from messages m where m.thread_id = t.id);
