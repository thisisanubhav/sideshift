# Phase 1 — foundation, schema, auth, live deploy

Goal: repo, Next.js skeleton, Supabase project, schema + RLS migrations, auth with
role selection, and a deployed URL. Broken-but-live beats polished-but-local.

## Decisions

**Mutations go through SECURITY DEFINER functions, not UPDATE policies.**
There is deliberately no `UPDATE` policy on `applications`, `deliverables` or
`payments`. Every state transition is a Postgres function that checks the caller's
authority itself (`accept_application`, `decline_application`, `submit_deliverable`,
`approve_deliverable`, `request_changes`, `withdraw_application`). Consequence: a
creator holding a raw API token cannot set their own application to `accepted`,
which is the privilege escalation an RLS-by-hiding-the-button app actually has.
That case is one of the RLS tests.

**"No silent declines" is a CHECK constraint, not a form rule.**
`(status = 'declined') = (decline_reason is not null)`. The database refuses to
store a decline without a reason. Product fix #2 cannot be bypassed by any client.

**Expiry is lazy, not scheduled.** `expire_stale_applications()` is called on the
reads that care instead of standing up pg_cron. Same observable behaviour, no
infrastructure. Trade-off: an application that lapses while nobody is looking
flips the moment someone looks. Documented in the README.

**`brand_responsiveness` is a definer-rights view.** Under RLS a creator can only
read their own applications, so an invoker-rights view would compute each creator's
view of the rate from their own single data point. The view exposes counts only,
never rows.

**Accept escrows the creator's asked rate, not the campaign's advertised budget.**
The brand accepted a specific offer; escrowing anything else would be a different
number from the one both parties agreed to.

**Threads are one route for both roles** (`/t/[id]`), not `/b/threads/[id]` and
`/c/threads/[id]`. The brief requires brand and creator to see identical state;
one component makes that structural instead of a thing to keep in sync.

## Deviations from the brief

- **`middleware.ts` → `proxy.ts`.** Next 16 deprecated the middleware convention.
- **shadcn/ui not installed yet.** Hand-built the primitives so far (button, input,
  chip, card, empty state) because every one of them was going to be fully
  restyled anyway. Radix-based primitives will come in where they earn their
  keep on accessibility behaviour — select, dialog, sheet — in Phase 2/3.

## Open item

Supabase email confirmation is still ON. It has to be switched off in the
dashboard or the two-browser walkthrough in the definition of done cannot
complete. Raised with the reviewer; README will list it as a setup step.

## Cost so far

~2h. On budget.
