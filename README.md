# SideShift

SideShift is a focused marketplace for paid short-form video work. Brands publish
campaigns. Creators apply with a pitch and rate. Once a creator is accepted, the
brief, conversation, deliverable, approval, and payment state live in one shared
thread.

> The product idea is simple: make the next state impossible to misunderstand.

**Live demo:** [sideshift-seven.vercel.app](https://sideshift-seven.vercel.app)

## Why it exists

Creator marketplaces usually make three expensive things ambiguous:

- whether a brand will answer an application;
- why an application was declined;
- whether a deliverable has actually been paid.

SideShift makes each state explicit. Applications have a 48-hour response window,
declines require a reason, and both participants read the same payment record and
timestamps from the same thread.

## Walk through the demo

All seeded accounts use the password `sideshift2026`.

| Account | Role | Useful starting point |
| --- | --- | --- |
| `maya.builds@sideshift.demo` | Creator | An active thread, escrowed payment, and a declined application with its reason |
| `northbound@sideshift.demo` | Brand | Applicants waiting in a live response queue |
| `gritathletic@sideshift.demo` | Brand | Public responsiveness history that reflects missed windows |
| `sunlit@sideshift.demo` | Brand | The brand side of Maya's walkthrough thread |

### The five-minute path

1. Sign in as `northbound` and open the applicants queue. The dashboard puts the
   cost of an unanswered application first, including the next expiry countdown.
2. Accept one applicant. The slot is consumed, a thread opens, and funds move to
   escrow in the same database transaction.
3. Decline another applicant. A reason is required and is shown verbatim to the
   creator.
4. Open `maya.builds` and `sunlit` in separate browser windows. Submit a
   deliverable as the creator, then approve it as the brand.
5. Return to the creator view and watch the payment move to **Released**. Revisit
   `/c/browse` to see the brand's responsiveness rate update.

The countdowns are real. If a window has expired, that is the intended behavior:
the application becomes expired, its slot is freed, and the brand's public rate
reflects the missed response. Run `supabase/demo-reset.sql` to restore the seeded
walkthrough state.

## Product behavior

### Response windows

Every application receives a 48-hour `expires_at` timestamp. Expiry is evaluated
lazily by `expire_stale_applications()` on reads that need current state. This keeps
the behavior deterministic without a scheduler or background worker.

### Reasons are enforced in the database

A decline cannot be stored without a reason. The brand chooses from a fixed set and
may add a note. This is enforced by a Postgres constraint and transition function,
not only by client-side validation.

### One shared thread

The `/t/[id]` route serves both roles. Messages, state changes, deliverables, and
money events appear on one chronological Spine. `PaymentRail` is shared by both
roles, so escrow, review, release, and timestamps cannot drift between views.

### Responsiveness is public

Campaign cards show the share of applications a brand answered inside the window,
along with the denominator. Brands with fewer than three decidable applications are
shown as **New brand · no response history**, rather than being assigned a
misleading percentage.

Payments and view counts are demo state. No money moves and view counts are seeded;
the UI labels seeded view counts wherever they appear.

## Design direction

The interface borrows from a video control room, where a tally light tells the
room what is live without anyone having to ask. Statuses are tally states, numbers
are timecodes, and every surface stays quiet so the tally colors carry the signal.
That suits a product whose argument is that state is never ambiguous: the design
makes state the most legible thing on the screen.

| Token | Value | Meaning |
| --- | --- | --- |
| Bone | `#E9E7E1` | Page background |
| Card | `#FFFFFF` | Surfaces |
| Graphite | `#16191C` | Primary text, headers, primary buttons |
| Slate | `#6B7178` | Secondary text, labels |
| Tally live | `#FF4D2E` | Active, in production, urgent |
| Tally standby | `#E0A62B` | Pending, awaiting a response |
| Tally clear | `#3F9E77` | Approved, released, done |
| Hairline | `#D3D0C8` | Borders |

Bricolage Grotesque is reserved for display type, Public Sans carries interface
copy, and JetBrains Mono handles money, counts, countdowns, dates, and rates —
including numbers inside sentences. The system uses one-pixel borders, a 4px
radius throughout, no drop shadows, visible keyboard focus, tabular figures, and
reduced-motion fallbacks.

**A tally color may only appear where it reports real state** — never as
decorative fill, gradient, or background, and never as the sole carrier of
meaning: every status that uses color also states itself in words. The stock
Tailwind ramps are cleared to `initial` in `@theme`, so `bg-gray-800` and friends
do not resolve at all and a stray one is a visible bug rather than silent drift.

**The signature element is the tally strip**: a 4px bar down the left edge of any
card representing a relationship. For an application inside its response window
the bar *is* the window — it drains from full to empty across the 48 hours,
computed from the real `expires_at` and recomputed each second rather than
animated on a loop, and switches from standby to live under six hours.

That rule is easy to state and easy to break. On the browse card the strip was
lit by "this campaign has slots left", which every open campaign has: fifteen
cards, one color, no signal. It now lights only for what a creator can act on —
the last slot, or a deadline inside 24 hours. The delivery deadline turned red at
ten days out, spending the alarm color on nothing; red is now under 2 days, amber
under 5. The slot rail contradicted its own caption, drawing a solid dot for a
slot *taken* beside the words "4 of 5 slots left"; solid now means a slot still
open, so the rail drains as the campaign fills, in the same direction and with the
same meaning as the countdown above it.

Responsive to 390px, visible keyboard focus, `prefers-reduced-motion` respected,
CLS 0 on every screen.

## Stack

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS v4
- Supabase Auth, Postgres, Realtime, and private Storage
- Vercel deployment

The application uses Server Components by default. Mutations use Server Actions or
`SECURITY DEFINER` Postgres transition functions. Status columns intentionally have
no direct update policy, so a client cannot promote its own application or payment
through a raw API request.

## Local development

```bash
git clone https://github.com/thisisanubhav/sideshift
cd sideshift
npm install
cp .env.example .env.local
npm run dev
```

Set these values in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

Open [http://localhost:3000](http://localhost:3000).

### Database setup

Apply the SQL files in `supabase/migrations/` in filename order, then load the demo
data from `supabase/seed.sql`. If you need the additional accounts created during
the walkthrough, also run `supabase/seed-demo-accounts.sql`:

Against a hosted project, link once and push the migrations, then load the seed
files explicitly — nothing here seeds itself:

```bash
supabase link --project-ref <project-ref>
supabase db push

supabase db query --linked -f supabase/seed.sql
supabase db query --linked -f supabase/seed-demo-accounts.sql   # optional
```

Against a local stack, `db reset` applies every migration and runs `supabase/seed.sql`
in one step:

```bash
supabase start
supabase db reset
supabase db query --local -f supabase/seed-demo-accounts.sql    # optional
```

Do not mix the two. `db push` targets the linked remote project; `db reset`
targets the local database and drops it first. Either path also works by pasting
the files into the dashboard SQL editor in filename order.

The migration history includes the schema, RLS policies, transition functions,
signup auto-confirmation for demo mode, public marketplace stats, and the final
responsiveness denominator fix:

| File | What |
| --- | --- |
| `0001_schema.sql` | Tables, enums, constraints, the 48h window trigger, signup trigger |
| `0002_rls.sql` | Row-level security, helper functions, the private storage bucket |
| `0003_transitions.sql` | State-transition functions, lazy expiry, the responsiveness view |
| `0004_fix_null_authority_check.sql` | Privilege-escalation fix |
| `0005_auto_confirm_signups.sql` | Demo-mode signup with no email round-trip |
| `0006_public_marketplace_stats.sql` | `marketplace_stats()` — landing figures, readable without a session |
| `0007_oauth_role_claim.sql` | Google sign-in. **Reverted by `0009`** |
| `0008_unique_handle_for_oauth_signups.sql` | Handle de-duplication for OAuth. **Reverted by `0009`** |
| `0009_remove_google_signin.sql` | Reverses `0007` and `0008` forward |
| `0010_marketplace_stats_denominator.sql` | Adds `decidable_total`, so a 0% built from nothing is distinguishable from a real 0% |

`0007` and `0008` are retained rather than deleted. They were applied to the live
database and are recorded in its migration history, so removing the files would
leave the repo describing a schema that never existed. `0009` reverses them
forward, which is the only honest direction.

Together the seed files produce **10 brands, 24 creators, 15 open campaigns, and
60 applications** with real history. `seed-demo-accounts.sql` fills in two
accounts, `@ambitious_coder` and `@hollowbrook`, that were created by hand through
the signup form during the build: their logins worked and their screens were
completely empty, which is the one state a demo cannot afford. Their passwords are
not in this repo — the seeded accounts above are the ones to sign in with.

For a production deployment, remove the demo auto-confirmation migration and keep
email verification enabled.

## Verification

```bash
npm run lint
npx tsc --noEmit

npm run test:rls            #  9 row-level-security proofs, straight at PostgREST
npm run test:signup         # 11 checks: fresh signup on both sides, no email round-trip
npm run test:smoke          # 19 end-to-end checks against the live deploy
npm run test:thread         # 26 checks driving the full thread lifecycle
npm run test:improvements   # 22 checks: the product changes, on a rendered page
```

67 checks in total. The integration suites use real Supabase JWTs and exercise the
state machine rather than mocking it. `test:rls` is the one that matters most: it
makes the requests a hostile client would make, because hiding a button is not
access control.

`test:thread` and `test:improvements` mutate demo data — the first drives the
walkthrough thread all the way to approved-and-paid, and the second needs a live
response window to look at. Restore the walkthrough state between runs:

```bash
supabase db query --linked -f supabase/demo-reset.sql
# or paste supabase/demo-reset.sql into the dashboard SQL editor
```

`demo-reset.sql` is safe to run repeatedly and touches only seeded demo data. It
puts three fresh response windows back on the board (41 minutes, 9 hours, 44
hours) and reopens the walkthrough thread.

For visual checks, `tests/render.mjs` uses Chromium at 390px and 1280px to check
sideways scrolling, hydration errors, and primary-action placement. It is kept out
of `package.json` because it requires Playwright and a local Chromium install.

## Project map

```text
src/app/                 Routes, layouts, server actions, and page UI
src/components/          Shared controls, navigation, rails, and thread UI
src/lib/                 Auth, Supabase clients, queries, formatting, and types
supabase/migrations/     Schema, RLS, state transitions, and database views
supabase/seed.sql        Seed marketplace data
tests/                   RLS, signup, smoke, thread, improvement, and render checks
research/                Product and visual research notes
```

## Scope boundaries

SideShift intentionally does not include creator discovery for brands, notifications,
team seats, leaderboards, training content, analytics ingestion, real payment
processing, view-based bonuses, editing published campaigns, or in-app profile
editing. Those omissions keep the prototype centered on its core promise: one
shared record, with no ambiguous next step.

## License

This is a take-home rebuild for demonstration and evaluation. No production payment
processing or real creator analytics are connected.
