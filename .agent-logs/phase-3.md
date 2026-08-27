# Phase 3 — the thread

## What shipped

`/t/[id]`, one route for both roles. Pinned collapsible brief, the Spine, a
composer, deliverable submission (upload or link), brand approve / request
changes, and the payment state machine moving live on both sides.

## The Spine

Chat, state changes and money events are **one list in one order**, each node
stamped with a UTC timecode to the second. There is no separate activity log,
because splitting the money out of the conversation is the failure this product
exists to fix.

The test I set for it in Phase 0 was: delete it and something becomes
unknowable. It passes — it is the only place timestamps live and the only place
the sequence of "you messaged, then submitted, then they asked for changes, then
paid" is legible as one thing. I did not end up building a separate activity
list anywhere, which was the failure condition.

Seconds in the stamp are not pedantry: "approved eleven seconds after I sent it"
and "approved four days later" have to read differently at a glance. Fixed to
UTC so two people in two timezones quote each other the same number.

## Both sides, one component

`PaymentRail` is a single file imported by both roles, reading one `payments`
row. There is no brand variant. The test asserts both rendered pages contain a
byte-identical set of timestamps — 22 of them on the final run.

## The bug worth reading about

**A creator could approve their own deliverable and release their own payment.**

`approve_deliverable` guarded with:

```sql
if v_owner is null or v_owner <> v_brand_id then raise ... end if;
```

For a creator, `select id into v_brand_id from brands where profile_id =
auth.uid()` leaves `v_brand_id` NULL. `v_owner <> NULL` is NULL, not true. So
the whole OR is NULL, the branch never fires, and the guard silently passes.
`request_changes` had the same shape.

This is precisely the privilege escalation I claimed in the Phase 1 log that the
SECURITY DEFINER architecture prevents. The architecture was right; my
implementation of it had a three-character hole. It was only caught because the
test drives the RPC directly with a creator's JWT instead of trusting that the
button is hidden — the UI never offered the action, so no amount of clicking
would have found it.

Fixed in `0004_fix_null_authority_check.sql`: an explicit `v_brand_id is null`
check plus `is distinct from` everywhere instead of `<>`. Applied the same
NULL-safe comparison to `accept_application` and `decline_application`, which
were not exploitable (their null checks fired first) but had the same fragile
pattern.

Before: creator approve returned 204. After: 403.

## Other decisions

**Realtime on two tables only** — `messages` and `payments`. It calls
`router.refresh()` rather than patching client state, so the spine has one
rendering path instead of two that can disagree. Everything else refreshes on
navigation.

**Deliverable takes a link or a file.** The link is the realistic path — a
60-second 4K vertical is 200MB and real creators send a Drive URL. The 25MB
upload to a private RLS'd bucket is there because the brief asked for storage,
and it works, but the demo should use the link.

**Enter sends, Shift+Enter breaks the line.** Composer autogrows to 160px.

## Verification

`tests/thread.mjs` — 25/25 against the **live deploy**, driving the whole
lifecycle as three different signed-in users over real HTTP: submit → request
changes → resubmit → approve, checking the payment status attribute on both
rendered pages at every step, plus the non-participant getting a 404 and the
creator being refused the approve RPC.

One assertion of mine was wrong before the code was: I checked
`!body.includes("In review")` to prove money had reverted to escrow, but the
rail always renders "In review" as a row label. Added `data-payment-status` and
asserted on that instead of grepping prose.

## Cost

~2.5h. Running total ~8.5h of 12.
