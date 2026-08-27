# Phase 4 — tests, dashboard, mobile, README

## RLS test suite

`tests/rls.mjs`, 9 assertions, straight at PostgREST with real user JWTs. No app,
no UI — these are the requests a hostile client would actually make, because
hiding a button is not access control.

The brief asked for at least one proof that a creator cannot read another
creator's thread. That one is there, plus:

- cannot read its messages
- cannot post into it (403)
- cannot read its payment row
- a brand cannot see another brand's applications
- **a creator cannot PATCH their own application to `accepted`**
- **a creator cannot PATCH their own payment to `released`**
- a creator cannot see draft campaigns

The two bold ones are the interesting cases. They pass because there is
deliberately no `UPDATE` policy on those tables at all — every transition goes
through a `SECURITY DEFINER` function instead. PostgREST returns 200 with zero
rows changed rather than an error, so the assertion checks the *representation*
is empty rather than trusting the status code.

## Deviation from Phase 0

I said Vitest. These are plain `node` scripts instead — same assertions, zero
install, and consistent with the two suites already written in Phase 2 and 3.
Not worth a dependency and a config file for nine HTTP calls.

## Dashboard

Added the per-creator roster, which was the one part of scope item 7 still
missing (active campaigns, slots filled, committed vs released were already
there). Handle, campaign, avg views, work state, payment state — one row per
accepted creator, each linking to its thread. View counts are labelled
"seeded demo data" at the section header rather than on every cell.

## Mobile pass

The real problem at 390px was the thread: the payment rail and the
"Approve and release" button sat below the entire message history, which is how a
brand forgets to pay. The aside now orders first on mobile and returns to the
right rail from `lg` up.

Browse filters collapse behind a disclosure on phones with an active-filter count,
so the marketplace itself is above the fold.

The only fixed width in the codebase is the roster table's `min-w-[560px]`, and it
sits inside an `overflow-x-auto` container — wide content scrolls in its own box,
the page body never scrolls sideways.

## Demo durability

The countdowns are real clocks, so the marketplace looks different two days after
seeding: pending applications genuinely expire. That is the product working, but
it means an asynchronous reviewer might never see a live countdown.
`supabase/demo-reset.sql` restores three staggered windows and reopens the
walkthrough thread. Flagged in the README rather than left as a surprise.

Also worth noting: running the test suites *changes* the demo data — the thread
test drives a real thread to completion. Each run ends with a reset.

## Final state

All three suites green against the live deploy: **9 + 19 + 25 = 53/53**.

## Cost

~1.5h. Total ~10h of the 12-hour budget.
