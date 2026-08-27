# Phase 2 — campaigns, browse, apply, accept/decline, seed

## What shipped

Brand posts a campaign (publish or draft). Creator browses with filters that
filter, opens a campaign, applies with a pitch and a rate. Brand reviews
applicants, accepts (slot decrements, thread opens, money escrows) or declines
with a mandatory reason the creator reads. Seeded marketplace behind all of it.

## Decisions

**Filters live in the URL, and the form submits itself on change.** A filtered
marketplace is a link you can send someone, and an "Apply filters" button is a
step between deciding and seeing that nobody wants.

**"Replies fast only" is filtered in application code, not SQL.** The rate is
derived from an aggregate view; pushing the predicate into SQL would mean a
correlated subquery per row for a marketplace that is a few dozen rows wide.
Revisit at 10k campaigns, not before.

**The responsiveness rate never appears without its denominator**, and does not
appear at all below 3 decidable applications — it says "New brand · no response
history" instead. A naked percentage on n=1 is the exact ambiguity the app
exists to remove.

**Accept escrows the creator's asked rate, not the campaign budget.** Verified
end to end: accepting @foragerfinn on a $410 campaign escrowed $330, the rate
they actually asked for.

**`slots_filled` is derived, never hand-maintained.** The seed originally set it
by hand and immediately drifted from the accepted-application count. Now it is
recomputed from reality.

## Interruption

The 8x agent-capture brief arrived mid-phase, after the seed was applied. I
stopped Phase 2 at a stable point, installed the capture hooks, verified them
with two canaries across two sessions, and resumed. See CAPTURE-TEST.md.

## What broke

**Every seeded sign-in failed with "Database error querying schema".** Inserting
into `auth.users` by hand left the token columns (`confirmation_token`,
`recovery_token`, `email_change`, and five others) NULL. GoTrue scans those into
non-nullable Go strings, so the query blows up before it ever checks a password.
Fixed on the live database and in `supabase/seed.sql`, so a fresh apply does not
reproduce it. Cost about ten minutes and would have cost the demo if I had not
tested sign-in.

## Verification

Not "it compiles". A scripted end-to-end run against the **live deploy**, signed
in as real seeded users by minting the `@supabase/ssr` auth cookie: **19/19
passed**. It covers anonymous redirects on all four protected route prefixes,
browse rendering with a real campaign, the responsiveness rate appearing, the
platform filter genuinely excluding a TikTok campaign when filtering to Shorts,
the replies-fast filter narrowing results, a declined application showing its
reason on the creator's page, the brand dashboard showing committed vs released,
the applicant queue showing a live countdown, and both cross-role guards
(creator → `/b` bounces to `/c`, brand → `/c/browse` bounces to `/b`).

Separately, the accept transaction was exercised directly against the database
with the brand's JWT claims in scope, checked for all four side effects
(status, slot, thread, escrowed payment), and then rolled back so the demo keeps
its three pending applications — including the one with 41 minutes on the clock.

## Cost

~3h. Running total ~6h of 12, including the capture detour.
