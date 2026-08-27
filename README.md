# SideShift

A rebuild of [sideshift.app](https://sideshift.app) — a marketplace where brands post
paid short-form video briefs and creators apply, deliver and get paid, with the
brief, the chat, the approval and the money in **one thread per creator**.

**Live:** https://sideshift-seven.vercel.app

## Sign in and look around

Every seeded account uses the password `sideshift2026`.

| Account | What it shows |
|---|---|
| `maya.builds@sideshift.demo` | Creator. Has an open thread with money escrowed, plus a declined application with its reason. |
| `northbound@sideshift.demo` | Brand with a queue. Two applicants waiting — **one with about 40 minutes left on the clock**. |
| `gritathletic@sideshift.demo` | Brand with a bad record. Four applications left to expire, and the public rate says so. |
| `sunlit@sideshift.demo` | Brand on the other end of Maya's thread. Open it in a second browser to watch payment release live. |

> **The countdowns are real clocks.** When I submitted this there were three live
> response windows: 41 minutes, 9 hours and 44 hours. If you are reading this a
> few days later, some will have genuinely expired — which is the product working,
> and worth seeing once. `supabase/demo-reset.sql` puts three fresh windows back
> and reopens the walkthrough thread.

## The five-minute path

1. Sign in as `northbound`. The dashboard leads with **how many applications are
   about to expire on you** and a countdown to the next one.
2. Open the Pour-over campaign. Accept one applicant — the slot decrements, a
   thread opens, and the money escrows in one transaction. Decline the other; you
   cannot send it without picking a reason.
3. Sign in as that creator in another browser. The decline reason is on their
   applications page. No silence.
4. Open `maya.builds` and `sunlit` side by side on the same thread. Submit a
   deliverable as the creator, approve it as the brand, and watch **Released**
   appear on the creator's screen without a refresh.
5. Go back to `/c/browse`. The responsiveness rate on the card has moved to
   reflect what you just did.

---

## The three things I changed, and why

Public reviews of the real product cluster around three complaints: brands never
reply, creators get dropped with no explanation, and nobody knows where the money
is. They are one bug wearing three hats — **the platform lets state go ambiguous**.
So the fixes are structural, not cosmetic.

### 1. Applications expire, and the brand pays for that publicly

Every application carries `expires_at`, set to 48 hours by a database trigger. The
creator sees a live countdown in timecode. If the brand does nothing, the
application expires on its own and the slot frees.

The part that gives it teeth: the brand's own dashboard **leads** with
*"2 applications expire on you in under 12 hours"* and the timecode to the next
one. Ignoring people is no longer free or invisible.

Expiry is computed lazily — `expire_stale_applications()` runs on the reads that
care — rather than standing up pg_cron. Identical observable behaviour, no
infrastructure. The trade-off: an application that lapses while nobody is looking
flips the moment someone looks.

### 2. A decline without a reason is impossible

Not "the form requires it". The database refuses to store it:

```sql
constraint decline_needs_reason check (
  (status = 'declined') = (decline_reason is not null)
)
```

The brand picks from a fixed list and can add a note. The creator reads both,
verbatim, on their applications page and on the campaign. There is no code path,
client or otherwise, that produces a silent rejection.

### 3. One money object, one timeline, one component

`PaymentRail` is a single file imported by **both** roles, rendering one `payments`
row. There is no brand variant and no creator variant, so "both sides see the same
state and the same timestamp" is structural rather than a promise to keep in sync.
Escrowed → in review → released, each with its own timestamp column, each written
by the transition that caused it.

`tests/thread.mjs` asserts that both rendered pages contain a byte-identical set
of timestamps.

### The wedge: brand responsiveness on the public card

Computed from real applications in the database — what share this brand answered
inside the window — and shown on every campaign card before a creator spends an
hour writing a pitch. No competitor shows it, and it is what makes fix #1 bite.

Two deliberate choices:

- **The percentage never appears without its denominator.** `41% answered in time ·
  7 of 17`. A naked percentage on a sample of one is exactly the ambiguity this app
  exists to remove.
- **Below three decidable applications it makes no claim at all** — it says
  *"New brand · no response history"*. Inventing 100% from n=1 would be a lie, and
  0% would be worse.

**"Replies fast only" is a real filter.**

---

## What I cut and why

| Cut | Why |
|---|---|
| Brand-side creator discovery and search | Out of scope in the brief. The application flow is the product; browse-and-recruit is a second marketplace. |
| Bootcamp / training | Out of scope. In the real product it is a large paywalled content library, unrelated to the transaction. |
| Leaderboards, tiers, streaks | Out of scope. The real product gamifies the creator side; it does nothing for state clarity. |
| Real payment processing | Out of scope. Payment is display-state only. The state machine is real; no money moves. |
| Real social analytics ingestion | Out of scope. View counts are seeded and **labelled "demo data"** everywhere they appear. |
| Notifications | Out of scope. The countdown and the dashboard banner do the same job in-app. |
| Admin panel, team seats | Out of scope. Single-user accounts on both sides. |
| Messaging outside a campaign thread | Out of scope, and against the thesis. A separate inbox is the failure mode being fixed. |
| **View-based payout bonuses** | Mentioned in the brief's product description but absent from its scope list. I treated it as cut rather than half-build it. Seeded view counts stay display-only. |
| **Light mode** | One deliberate dark theme. A toggle is an hour I would rather spend on the thread. |
| **Editing a published campaign** | You can publish a draft, but not revise a live brief. Doing it properly means versioning briefs that creators have already applied to, and doing it improperly is worse than not having it. |
| **Creator profile editing** | Profiles are seeded and rendered but not editable in-app. Reading them is what the brand flow needs; editing them is a settings screen with no bearing on the thesis. |
| **pg_cron for expiry** | Replaced with lazy expiry. Same behaviour, 45 minutes of setup saved. |
| **shadcn/ui** | Installed nothing. Every primitive here is hand-built, because each one was going to be fully restyled anyway and the defaults are the look I was asked to avoid. Deviation from the brief's stack, stated here rather than hidden. |

---

## Design

Six tokens, dark-first, one theme. Colour is **semantic, never decorative**:

| Token | Hex | Role |
|---|---|---|
| Pitch | `#17131C` | Page ground. Warm plum-black, not neutral. |
| Raise | `#221C29` | Cards. Flat fill, one 1px border. No gradients, no glows, no shadows. |
| Bone | `#EFEAF2` | Text — **and money**. |
| Ash | `#8B84A0` | Secondary text and labels. |
| Flare | `#FF5A3D` | **Time only.** Countdowns, expiry, overdue. Nothing else is ever this colour. |
| Iris | `#7C6BFF` | **Identity only.** Selection, active state. |

Two rules do most of the work. **Money has no hue** — it is the most important
number, so it gets the highest contrast instead, and the escrow chip *fills* as
the money moves: outlined while held, solid once paid. **Status differentiates by
shape and fill, not colour** — outlined is open, solid is terminal-and-good, struck
is terminal-and-over. That is how six colours cover nine statuses without a legend.

**Type:** Archivo Expanded for display, rationed to three instances per screen;
Instrument Sans for body; JetBrains Mono with tabular figures for every money
value, view count, countdown and timestamp — so a ticking countdown never shifts
the layout by a pixel.

**Signature element — the Spine.** One vertical line down the thread carrying
messages, state changes and money events in a single chronological order, each
node stamped with a UTC timecode to the second. There is no separate activity log,
because splitting the money out of the conversation is the failure this product
exists to fix. It compresses to a horizontal slot rail on cards and dashboard rows,
so the same object represents state everywhere.

Responsive to 390px, visible keyboard focus, `prefers-reduced-motion` respected,
tabular figures to avoid layout shift.

---

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres, Auth,
Storage) · Vercel.

### Architecture worth knowing

**Status columns are unwritable through the API.** There is deliberately no
`UPDATE` policy on `applications`, `deliverables` or `payments`. Every state
transition is a `SECURITY DEFINER` Postgres function that authorises the caller
itself — `accept_application` consumes a slot, opens the thread and escrows in one
transaction. A creator holding a raw API token cannot promote their own
application, and `tests/rls.mjs` proves it.

**One route for the thread**, `/t/[id]`, for both roles. Two routes would make
identical state a thing to keep in sync by hand.

**Realtime on two tables only** — `messages` and `payments` — because those are the
two the demo needs to move without a refresh. It calls `router.refresh()` rather
than patching client state, so the spine has one rendering path.

---

## Local setup

```bash
git clone https://github.com/thisisanubhav/sideshift
cd sideshift
npm install
cp .env.example .env.local     # fill in from your Supabase project
npm run dev
```

`.env.local` needs:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key>
```

### Database

Migrations are in `supabase/migrations/` and apply in filename order:

| File | What |
|---|---|
| `0001_schema.sql` | Tables, enums, constraints, the 48h window trigger, signup trigger |
| `0002_rls.sql` | Row-level security, helper functions, the private storage bucket |
| `0003_transitions.sql` | State-transition functions, lazy expiry, the responsiveness view |
| `0004_fix_null_authority_check.sql` | Privilege-escalation fix (see below) |

Then `supabase/seed.sql` for the demo marketplace: 8 brands, 22 creators, 12 open
campaigns, 39 applications with real history.

**One manual step:** turn **off** Authentication → Sign In / Providers → Email →
*Confirm email*. Seeded accounts are pre-confirmed, but a fresh signup will
otherwise wait on an email that never gets clicked in a demo. Stated here rather
than silently assumed.

### Tests

```bash
npm run test:rls      # 9 row-level-security proofs, straight at PostgREST
npm run test:smoke    # 19 end-to-end checks against the live deploy
npm run test:thread   # 25 checks driving the full thread lifecycle
```

These hit the real database with real user JWTs rather than mocking. `test:rls`
is the one that matters: it makes the requests a hostile client would make,
because hiding a button is not access control.

---

## Two bugs found by testing, both worth reading

**A creator could approve their own deliverable and release their own payment.**
The guard was `if v_owner is null or v_owner <> v_brand_id then raise`. For a
creator, `v_brand_id` is NULL, `v_owner <> NULL` is NULL rather than true, so the
OR is NULL and the branch never fires. Fixed in `0004` with an explicit null check
and `is distinct from`. Caught only because `tests/thread.mjs` calls the RPC
directly with a creator's JWT — the UI never offered the action, so clicking around
would never have found it.

**Every seeded sign-in failed with "Database error querying schema."** Hand-inserting
into `auth.users` left eight token columns NULL; GoTrue scans those into
non-nullable Go strings and dies before checking the password. Fixed in
`supabase/seed.sql`.

## Agent logs

`.agent-logs/` holds the automatically captured prompt-and-response record plus a
hand-written decision log per phase. `CAPTURE-TEST.md` documents the capture setup,
including the fact that it was installed partway through the build rather than
before it, and what that means for coverage.
