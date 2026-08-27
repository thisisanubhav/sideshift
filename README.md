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

The interface borrows from a video control room: quiet plum-black surfaces, clear
timecodes, vertical 9:16 markers, and two semantic accents.

| Token | Value | Meaning |
| --- | --- | --- |
| Pitch | `#17131C` | App background |
| Raise | `#221C29` | Elevated surface |
| Bone | `#EFEAF2` | Primary text and money |
| Ash | `#8B84A0` | Supporting text |
| Flare | `#FF5A3D` | Time and urgency only |
| Iris | `#7C6BFF` | Identity and selection only |

Archivo Expanded is reserved for display type, Instrument Sans carries interface
copy, and JetBrains Mono handles money, counts, countdowns, and timestamps. The
system uses one-pixel borders, restrained radii, visible keyboard focus, tabular
figures, and reduced-motion fallbacks. Color never carries status by itself.

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

```bash
# From the Supabase dashboard SQL editor or the Supabase CLI
supabase db push

# Apply migrations and the default seed file
supabase db reset

# Optional: add the extra walkthrough accounts
# supabase db query < supabase/seed-demo-accounts.sql
```

The migration history includes the schema, RLS policies, transition functions,
signup auto-confirmation for demo mode, public marketplace stats, and the final
responsiveness denominator fix. Migrations `0007` and `0008` are retained because
they were applied historically; `0009` reverses their Google sign-in behavior
forward.

For a production deployment, remove the demo auto-confirmation migration and keep
email verification enabled.

## Verification

```bash
npm run lint
npx tsc --noEmit
npm run test:rls
npm run test:signup
npm run test:smoke
npm run test:thread
npm run test:improvements
```

The integration suites use real Supabase JWTs and exercise the state machine rather
than mocking it. `test:thread` and `test:improvements` mutate demo data, so reset
the database between runs:

```bash
supabase db reset
# or run supabase/demo-reset.sql in the SQL editor
```

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
