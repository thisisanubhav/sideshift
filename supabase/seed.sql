-- Demo marketplace.
--
-- 8 brands, 22 creators, 14 campaigns, 46 applications. Every name, handle,
-- niche, rate and brief is written to be plausible; there is no lorem ipsum
-- and no "Creator 07" anywhere.
--
-- Seeded accounts all share the password below so a reviewer can sign in as
-- anyone. Safe to publish: this project holds nothing but demo data.
--
--   password: sideshift2026
--
-- Applications are dated so that the marketplace has real history: brands have
-- genuinely different responsiveness rates, and three applications are pending
-- with the clock visibly running.

-- ---------------------------------------------------------------------------
-- Seeding helpers. Dropped at the end.
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto;

create or replace function seed_user(
  p_email text, p_role user_role, p_name text, p_handle text
) returns uuid language plpgsql as $$
declare
  v_id uuid := gen_random_uuid();
begin
  -- The token columns must be '' and not NULL. GoTrue scans them into
  -- non-nullable Go strings, so a NULL here makes every sign-in fail with
  -- "Database error querying schema" — which is exactly what happened the
  -- first time this seed ran.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new,
    email_change_token_current, email_change, phone_change,
    phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    p_email, crypt('sideshift2026', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('role', p_role::text, 'display_name', p_name, 'handle', p_handle),
    now(), now(),
    '', '', '', '', '', '', '', ''
  );

  -- GoTrue needs an identity row for password sign-in.
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
  values (
    gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', p_email), 'email', now(), now()
  );

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Brands. Responsiveness varies on purpose — that is the whole point of the
-- rate on the campaign card.
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('sunlit',         'Sunlit Skincare',   'Beauty & Skincare',  'Fragrance-free skincare made in small batches in Lisbon. We film everything on iPhone and we like it that way.'),
      ('northbound',     'Northbound Coffee', 'Food & Drink',       'Single-origin roastery in Portland. Six people, one drum roaster, no marketing team.'),
      ('gritathletic',   'Grit Athletic',     'Fitness',            'Training gear for people who lift in garages. Founded by two former collegiate throwers.'),
      ('kettleandfold',  'Kettle & Fold',     'Home & Kitchen',     'Enamelware and linen for small kitchens. Everything we make fits in a studio apartment.'),
      ('pocketledger',   'Pocket Ledger',     'Finance',            'A budgeting app for freelancers with irregular income. 400k downloads, still bootstrapped.'),
      ('terrabottle',    'Terra Bottle',      'Outdoors',           'Insulated bottles from recycled steel. B-corp, and we publish our supply chain.'),
      ('nightshiftaudio','Nightshift Audio',  'Tech & Audio',       'Studio monitors and interfaces for bedroom producers. We sponsor no one and never have.'),
      ('verdantgreens',  'Verdant Greens',    'Food & Drink',       'Cold-pressed greens delivered weekly across the Bay Area. No powders, no concentrate.')
    ) as t(handle, name, niche, bio)
  loop
    perform seed_user(r.handle || '@sideshift.demo', 'brand', r.name, r.handle);
    update brands b
       set niche = r.niche, bio = r.bio
      from profiles p
     where p.id = b.profile_id and p.handle = r.handle;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Creators.
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('maya.builds',     'Maya Oyelaran',    'Beauty & Skincare',  'Lisbon',       142000,  86000, 45000, array['tiktok','reels']::platform[],      'Skincare routines shot in real bathrooms with bad lighting. 4 years of it.'),
      ('deeptalksdani',   'Danielle Okafor',  'Finance',            'Atlanta',       98000,  61000, 38000, array['tiktok','shorts']::platform[],     'I explain money things to people who were never taught money things.'),
      ('rowanlifts',      'Rowan Petrisko',   'Fitness',            'Cleveland',    211000, 134000, 62000, array['reels','shorts']::platform[],      'Garage gym, 5am, no music. Strength content without the shouting.'),
      ('the.slow.kitchen','Priya Raghunathan','Food & Drink',       'Toronto',      176000, 112000, 55000, array['reels','tiktok']::platform[],      'One-pot dinners filmed in a galley kitchen you could touch both walls of.'),
      ('joaquin.frames',  'Joaquín Ferrer',   'Photo & Video',      'Mexico City',   64000,  47000, 32000, array['reels']::platform[],               'Cinematic product work that still looks handheld. I own three lenses.'),
      ('tessdoesgear',    'Tess Kowalczyk',   'Outdoors',           'Bozeman',      129000,  78000, 41000, array['tiktok','shorts']::platform[],     'Gear tested on actual trails, not on a table. Honest about what breaks.'),
      ('nabilonaudio',    'Nabil Haddad',     'Tech & Audio',       'Berlin',        87000,  59000, 36000, array['shorts','reels']::platform[],      'Bedroom producer. I review gear I have actually recorded a record with.'),
      ('sunday.linens',   'Ingrid Lauridsen', 'Home & Kitchen',     'Copenhagen',   103000,  68000, 39000, array['reels']::platform[],               'Slow home content. Very little talking, quite a lot of folding.'),
      ('coreymakes',      'Corey Adeyemi',    'Home & Kitchen',     'Manchester',    71000,  52000, 28000, array['tiktok']::platform[],              'Small-space DIY for renters who cannot drill holes.'),
      ('lenaonthego',     'Lena Vasquez',     'Travel & Local',     'Barcelona',    194000, 121000, 58000, array['reels','tiktok']::platform[],      'City guides for people with 36 hours and no car.'),
      ('brunoreps',       'Bruno Salvatierra','Fitness',            'São Paulo',    156000,  94000, 47000, array['tiktok','reels']::platform[],      'Calisthenics in public parks. Portuguese and English.'),
      ('hana.pours',      'Hana Sugimoto',    'Food & Drink',       'Seattle',       88000,  64000, 34000, array['tiktok','shorts']::platform[],     'Coffee without the snobbery. I have opinions about water.'),
      ('marcus.reads',    'Marcus Bell',      'Education',          'Chicago',      118000,  73000, 42000, array['shorts','tiktok']::platform[],     'Books and study systems for people who bounced off school.'),
      ('avaskincycle',    'Ava Lindqvist',    'Beauty & Skincare',  'Stockholm',    134000,  81000, 44000, array['reels','tiktok']::platform[],      'Sensitive-skin reviews. I patch test on camera and show the bad days.'),
      ('theoclips',       'Theo Mbeki',       'Photo & Video',      'Cape Town',     59000,  41000, 26000, array['reels','shorts']::platform[],      'Fast edits, real locations. I shoot mostly at golden hour because it is free.'),
      ('quietdesk',       'Yuki Tanabe',      'Tech & Audio',       'Osaka',         96000,  67000, 37000, array['shorts']::platform[],              'Desk setups and the software that actually stays installed.'),
      ('foragerfinn',     'Finn Ó Braonáin',  'Outdoors',           'Galway',        77000,  55000, 31000, array['tiktok','reels']::platform[],      'Coastal foraging and cold water. Rain is not a reason to stop filming.'),
      ('rae.saves',       'Rae Whitfield',    'Finance',            'Leeds',        112000,  70000, 40000, array['tiktok']::platform[],              'Budgeting on a real salary. I show my own numbers every month.'),
      ('salteddough',     'Noor Al-Amin',     'Food & Drink',       'Dubai',        148000,  92000, 49000, array['reels','tiktok']::platform[],      'Bread, mostly. Sourdough for people who have jobs.'),
      ('cyclecity.kim',   'Kim Da-eun',       'Travel & Local',     'Seoul',        167000, 105000, 52000, array['shorts','reels']::platform[],      'Commuting by bike in a city that was not built for it.'),
      ('grantonform',     'Grant Whitlock',   'Fitness',            'Melbourne',     83000,  58000, 33000, array['reels','shorts']::platform[],      'Form checks and mobility. Physio-adjacent, not physio-qualified.'),
      ('mira.plants',     'Mira Kaminski',    'Home & Kitchen',     'Warsaw',        69000,  49000, 27000, array['tiktok','reels']::platform[],      'Houseplants that survive north-facing flats. Mostly pothos, honestly.')
    ) as t(handle, name, niche, city, followers, views, rate, platforms, bio)
  loop
    perform seed_user(r.handle || '@sideshift.demo', 'creator', r.name, r.handle);
    update creators c
       set niche = r.niche, city = r.city, bio = r.bio, platforms = r.platforms,
           follower_count = r.followers, avg_views = r.views, base_rate_cents = r.rate
      from profiles p
     where p.id = c.profile_id and p.handle = r.handle;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Campaigns.
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('sunlit', 'Barrier repair routine, morning and night', 'We want honest before-and-after style routines using the Barrier Serum over 14 days. Show the texture, show the pilling if it pills, show your actual bathroom. No ring light, no script. Mention that it is fragrance-free within the first five seconds. We will send product plus a shipping code.', 'Beauty & Skincare', 'tiktok', 3, 15, 30, 45000, 4, 1, 18, 'open'),
      ('sunlit', 'Sunscreen re-application at your desk', 'A single video about re-applying SPF over makeup at 2pm without ruining it. Handheld, one take preferred. We care much more about it being useful than being polished.', 'Beauty & Skincare', 'reels', 1, 20, 40, 32000, 3, 2, 11, 'open'),
      ('northbound', 'Pour-over on a weekday morning', 'Show the full pour-over with our Ethiopia Guji at whatever hour you actually make coffee. We want the mess. Please weigh the beans on camera and say the ratio out loud. No latte art, we do not sell milk.', 'Food & Drink', 'reels', 2, 20, 40, 27500, 4, 0, 4, 'open'),
      ('gritathletic', 'Garage gym walkthrough with the sled', 'Take the Grit sled through a full conditioning finisher and talk through why you would use it over a treadmill. Show the plates loading. Film it in whatever space you train in, the worse the concrete the better.', 'Fitness', 'shorts', 1, 30, 60, 60000, 4, 3, 21, 'open'),
      ('gritathletic', 'Belt sizing, explained properly', 'Nobody explains lever belt sizing well and we get twelve emails a week about it. One video, tape measure on camera, cover the two most common mistakes.', 'Fitness', 'tiktok', 2, 20, 45, 42000, 2, 0, 14, 'open'),
      ('kettleandfold', 'Everything fits: small kitchen reset', 'Reset your kitchen using the enamel set and the linen runners. We want the before, honestly. Anyone whose kitchen is already tidy is the wrong fit for this brief.', 'Home & Kitchen', 'reels', 2, 25, 45, 38000, 3, 1, 16, 'open'),
      ('pocketledger', 'The month I earned nothing', 'Talk through how you budget in a month where invoices did not land. Use Pocket Ledger to show the irregular-income view. Real numbers or blurred numbers, your call, but not fake numbers.', 'Finance', 'tiktok', 2, 30, 60, 52000, 5, 2, 24, 'open'),
      ('pocketledger', 'Quarterly tax set-aside in 30 seconds', 'One short explaining the set-aside percentage feature. Assume the viewer has never filed as self-employed and is slightly scared of it.', 'Finance', 'shorts', 1, 20, 35, 35000, 3, 0, 12, 'open'),
      ('terrabottle', 'Cold water, four hours later', 'Take the 32oz somewhere genuinely cold or genuinely hot and prove the claim on camera with a thermometer. We would rather it underperform on video than be staged.', 'Outdoors', 'tiktok', 2, 15, 35, 41000, 4, 1, 19, 'open'),
      ('nightshiftaudio', 'First interface, first record', 'Set up the Halo 2i and record something in one sitting. Show the latency settings, show the driver install, do not skip the annoying part. Bedroom acoustics welcome.', 'Tech & Audio', 'shorts', 1, 45, 90, 58000, 3, 0, 20, 'open'),
      ('verdantgreens', 'What a week of deliveries looks like', 'Unbox four weekly deliveries across a month and show what you actually did with them, including the bits you wasted. Honesty about waste is fine and we would prefer it.', 'Food & Drink', 'reels', 4, 20, 40, 33000, 4, 2, 26, 'open'),
      ('verdantgreens', 'The 6am juice, unglamorous version', 'One video, no makeup, no styling, drinking the thing at whatever hour you drink it. We are trying to stop looking like a wellness brand.', 'Food & Drink', 'tiktok', 1, 15, 30, 24000, 5, 1, 2, 'open'),
      ('terrabottle', 'Supply chain, on camera', 'A longer explainer about where recycled steel comes from. We will give you the sourcing documents. This one needs someone comfortable with a serious tone.', 'Outdoors', 'shorts', 1, 60, 90, 70000, 2, 2, 6, 'closed'),
      ('kettleandfold', 'Linen care without a tumble dryer', 'Draft — still deciding whether this is one video or a series, and whether we send the full set or just the runners.', 'Home & Kitchen', 'reels', 2, 20, 40, 36000, 3, 0, 30, 'draft')
    ) as t(brand_handle, title, brief, niche, plat, vids, dmin, dmax, budget, slots, filled, days, status)
  -- Two of these deadlines sit deliberately close (2 and 4 days). Every open
  -- campaign used to be eight or more days out, which is not what a real
  -- marketplace looks like and meant the deadline never changed colour: the
  -- red / amber / grey thresholds on the browse card were real but unreachable.
  loop
    insert into campaigns (
      brand_id, title, brief, niche, platform, video_count,
      duration_min_seconds, duration_max_seconds, budget_cents_per_creator,
      slots_total, slots_filled, deadline, status, created_at, published_at, closed_at
    )
    select b.id, r.title, r.brief, r.niche, r.plat::platform, r.vids,
           r.dmin, r.dmax, r.budget, r.slots, r.filled,
           (now() + make_interval(days => r.days))::date,
           r.status::campaign_status,
           now() - make_interval(days => (r.days / 3 + 4)),
           case when r.status = 'draft' then null
                else now() - make_interval(days => (r.days / 3 + 3)) end,
           case when r.status = 'closed' then now() - interval '2 days' else null end
      from brands b join profiles p on p.id = b.profile_id
     where p.handle = r.brand_handle;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Applications.
--
-- Mixed statuses per brand so that brand_responsiveness returns genuinely
-- different rates. Three are still pending with the clock running: one with
-- roughly 40 minutes left, so the countdown is visibly urgent in a demo.
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
  v_campaign uuid;
  v_creator  uuid;
  v_created  timestamptz;
  v_expires  timestamptz;
  v_responded timestamptz;
begin
  for r in
    select * from (values
      -- campaign title fragment, creator handle, status, hours ago applied,
      -- hours after applying that the brand answered (null = never), rate, reason, pitch
      ('Barrier repair',   'maya.builds',      'accepted', 96,  6,    45000, null, 'Fourteen days is exactly how long my skin takes to stop arguing with a new serum, so the timeline works. I film in a north-facing bathroom with no ring light, which I think is what you are asking for.'),
      ('Barrier repair',   'avaskincycle',     'declined', 92,  9,    52000, 'rate_above_budget', 'I patch test on camera and I will show the days it does not go well. My rate is above your posted budget but I can do three videos rather than two at that number.'),
      ('Barrier repair',   'lenaonthego',      'declined', 88,  14,   48000, 'audience_mismatch', 'My audience is travel-first but skincare-for-travel performs well for me. Happy to angle it as a routine that survives a carry-on.'),
      ('Barrier repair',   'hana.pours',       'expired',  80,  null, 40000, null, 'I know I am a coffee account. I also have very reactive skin and have wanted to talk about it. Understand if this is a stretch.'),
      ('Sunscreen re',     'avaskincycle',     'accepted', 70,  4,    34000, null, 'Reapplying over makeup at 2pm is the single question I get most and I have never had a brand let me answer it properly. One take, at my desk, no cuts.'),
      ('Sunscreen re',     'maya.builds',      'declined', 68,  7,    38000, 'slots_filled', 'Happy to do this one as a follow-up to the barrier brief if the slots are still there.'),

      ('Pour-over',        'hana.pours',       'pending',  46,  null, 30000, null, 'I have opinions about water and I will be saying the ratio out loud whether you ask me to or not. Guji is my favourite origin to film because the colour shift in the bloom is obvious on camera.'),
      ('Pour-over',        'the.slow.kitchen', 'pending',  12,  null, 28000, null, 'My kitchen is a galley and the counter is always slightly wet. If you want the mess, I have the mess.'),

      ('Garage gym',       'rowanlifts',       'accepted', 120, 11,   62000, null, 'I train in a garage with a cracked slab and no heating, which I think is the aesthetic. I can load plates on camera and talk through why a sled beats a treadmill for conditioning without sounding like an infomercial.'),
      ('Garage gym',       'brunoreps',        'accepted', 118, 20,   58000, null, 'I do most of my filming in public parks but I have access to a garage set-up for this. Can deliver in Portuguese and English at no extra cost.'),
      ('Garage gym',       'grantonform',      'accepted', 110, 40,   50000, null, 'Form-check angle: I would use the sled to talk about what people get wrong with hip position. Slightly different take on the brief, tell me if it is too far off.'),
      ('Garage gym',       'tessdoesgear',     'expired',  104, null, 44000, null, 'Outdoors account rather than gym, but sled work outside on gravel would look genuinely different from everything else you will get.'),
      ('Garage gym',       'marcus.reads',     'expired',  100, null, 42000, null, 'Long shot. I make study-systems content but I lift, and the crossover audience is bigger than you would think.'),
      ('Belt sizing',      'grantonform',      'expired',  90,  null, 36000, null, 'Tape measure on camera, two common mistakes, done in under forty seconds. This is a video I have wanted to make for two years.'),
      ('Belt sizing',      'rowanlifts',       'expired',  86,  null, 60000, null, 'I get asked about lever sizing constantly. My rate is at the top of your range because belts are the thing my audience actually buys.'),

      ('Everything fits',  'sunday.linens',    'accepted', 64,  5,    39000, null, 'Very little talking and quite a lot of folding is a fair description of my whole channel, so this brief reads like it was written for me. My kitchen before is genuinely bad.'),
      ('Everything fits',  'coreymakes',       'declined', 60,  8,    30000, 'not_the_right_fit', 'Renter angle: everything I do has to come back off the wall. Could frame the reset around not being able to drill.'),
      ('Everything fits',  'mira.plants',      'declined', 58,  16,   27000, 'wrong_format_or_platform', 'I would want to bring plants into the reset, which may be off-brief. Say the word and I will keep it to the enamel and linen.'),

      ('The month I',      'rae.saves',        'accepted', 140, 3,    40000, null, 'I publish my own numbers every month, so a month where invoices did not land is a video I have already lived. I will not blur the figures.'),
      ('The month I',      'deeptalksdani',    'accepted', 136, 9,    44000, null, 'I explain money to people who were never taught it, and irregular income is the thing that breaks every budgeting app I have tried. Interested to see if yours holds up.'),
      ('The month I',      'marcus.reads',     'declined', 130, 26,   38000, 'audience_mismatch', 'My audience is students rather than freelancers but the overlap on irregular income is real.'),
      ('The month I',      'rowanlifts',       'expired',  126, null, 55000, null, 'Fitness creator, self-employed for six years, and the invoice gap is the thing nobody in my niche talks about.'),
      ('Quarterly tax',    'rae.saves',        'declined', 74,  12,   36000, 'slots_filled', 'Thirty seconds is tight for tax but the set-aside percentage is one number, so it is doable.'),
      ('Quarterly tax',    'deeptalksdani',    'expired',  72,  null, 42000, null, 'Assume the viewer is scared of it is the correct instruction and I would like to meet it.'),

      ('Cold water',       'tessdoesgear',     'accepted', 52,  7,    41000, null, 'I will take it somewhere genuinely cold and I will film the thermometer even if it underperforms. That is more or less my entire brand.'),
      ('Cold water',       'foragerfinn',      'pending',  4,   null, 33000, null, 'Atlantic coast in February qualifies as genuinely cold. I can do the four-hour test across a full tide cycle, which gives you a nicer edit than a kitchen counter.'),
      ('Cold water',       'lenaonthego',      'declined', 48,  10,   45000, 'not_the_right_fit', 'City angle rather than trail. Would test it across a day of walking rather than a hike.'),

      ('First interface',  'nabilonaudio',     'expired',  150, null, 38000, null, 'I have recorded an actual record on a Halo 2i, so I can talk about the driver install honestly instead of pretending it was smooth.'),
      ('First interface',  'quietdesk',        'expired',  146, null, 37000, null, 'Desk-setup angle. I would show the cable management people will need and nobody mentions.'),
      ('First interface',  'theoclips',        'declined', 140, 30,   30000, 'not_the_right_fit', 'Video-first rather than audio-first, but I record my own voiceovers and the set-up story would be from a beginner perspective.'),

      ('What a week',      'the.slow.kitchen', 'accepted', 58,  6,    35000, null, 'Four deliveries across a month including the bits I wasted is an unusually honest brief and I want to take it at face value. I will film the fridge at the end of week three, which is when it goes wrong.'),
      ('What a week',      'salteddough',      'accepted', 56,  13,   38000, null, 'Bread account, but greens end up in most of what I cook. The waste angle is the part I would lead with.'),
      ('What a week',      'hana.pours',       'declined', 54,  22,   32000, 'wrong_format_or_platform', 'I am mostly TikTok rather than Reels but can deliver both cuts.'),
      ('The 6am juice',    'salteddough',      'accepted', 44,  8,    26000, null, 'No makeup, no styling, 6am, and I will be visibly unhappy about it. That is the video.'),
      ('The 6am juice',    'mira.plants',      'declined', 42,  18,   24000, 'rate_above_budget', 'Happy to shoot this alongside a plant-watering morning routine if that reads as too off-brief.'),
      ('The 6am juice',    'cyclecity.kim',    'declined', 40,  25,   28000, 'audience_mismatch', 'Commuter angle: the 6am juice before a 7am ride is a real thing I do.'),

      ('Supply chain',     'foragerfinn',      'accepted', 200, 14,   68000, null, 'I can hold a serious tone and I have read enough B-corp reporting to ask the right questions of the sourcing documents.'),
      ('Supply chain',     'joaquin.frames',   'accepted', 196, 19,   70000, null, 'Cinematic but handheld is exactly what a supply-chain explainer needs so it does not look like a corporate video. Three lenses, one of them long.'),
      ('Supply chain',     'theoclips',        'declined', 190, 33,   26000, 'slots_filled', 'Fast edits and real locations. Could shoot the material-handling side at a scrapyard here.')
    ) as t(campaign_frag, creator_handle, status, hours_ago, answer_after, rate, reason, pitch)
  loop
    select c.id into v_campaign
      from campaigns c where c.title like r.campaign_frag || '%' limit 1;
    select cr.id into v_creator
      from creators cr join profiles p on p.id = cr.profile_id
     where p.handle = r.creator_handle;

    if v_campaign is null or v_creator is null then
      raise notice 'skipped % / %', r.campaign_frag, r.creator_handle;
      continue;
    end if;

    v_created := now() - make_interval(hours => r.hours_ago);
    v_expires := v_created + interval '48 hours';
    v_responded := case when r.answer_after is null then null
                        else v_created + make_interval(hours => r.answer_after) end;

    insert into applications (
      campaign_id, creator_id, pitch, rate_cents, status,
      expires_at, created_at, responded_at, decline_reason
    ) values (
      v_campaign, v_creator, r.pitch, r.rate, r.status::application_status,
      v_expires, v_created, v_responded, r.reason::decline_reason
    )
    on conflict (campaign_id, creator_id) do nothing;
  end loop;
end $$;

-- The pending three need windows that are still open, and one of them should be
-- visibly about to lapse so the countdown reads as urgent rather than decorative.
update applications a
   set expires_at = now() + interval '41 minutes'
  from campaigns c
 where c.id = a.campaign_id and a.status = 'pending' and c.title like 'Pour-over%'
   and a.creator_id = (select cr.id from creators cr join profiles p on p.id = cr.profile_id
                        where p.handle = 'hana.pours');

update applications a
   set expires_at = now() + interval '9 hours'
  from campaigns c
 where c.id = a.campaign_id and a.status = 'pending' and c.title like 'Pour-over%'
   and a.creator_id = (select cr.id from creators cr join profiles p on p.id = cr.profile_id
                        where p.handle = 'the.slow.kitchen');

-- ---------------------------------------------------------------------------
-- Threads, messages and payments for the accepted work, so the app has history
-- rather than a wall of empty states.
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

-- A first message from each brand, so no accepted creator opens an empty thread.
insert into messages (thread_id, sender_profile_id, body, created_at)
select t.id, b.profile_id,
       'Welcome aboard. Shot list and product tracking are on the way — anything you need before you film, ask here rather than email so it stays in one place.',
       t.created_at + interval '11 minutes'
  from threads t join brands b on b.id = t.brand_id;

drop function seed_user(text, user_role, text, text);
