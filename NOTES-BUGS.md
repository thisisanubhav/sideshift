# Functional bugs found during the restyle pass

The restyle is visual-only, so these are logged rather than fixed. Each one is
reproduced and root-caused, not guessed at.

---

## 1. Every thread row and roster row shows `$0` instead of the escrowed amount

> **⚠️ VISIBLE ON THE RESTYLE PREVIEW.** This is the first thing a reviewer will
> notice on `/b` and both thread lists. The brand dashboard roster currently
> reads `@rowanlifts · Approved · $0 ESCROWED`, which contradicts itself on the
> same row. Left unfixed deliberately: the restyle pass is visual-only and the
> fix is in data fetching. It is a two-line change, described below.

**Severity: high.** It is wrong money, on the screens whose entire argument is
that both sides always see the same number. It also silently defaults the
payment *status* to `escrowed`, so a released payment would display as escrowed
in both lists.

**Where**
- `src/lib/threads.ts:36` — drives `/b/threads` and `/c/threads`
- `src/app/(app)/b/page.tsx:85` — drives the "Your creators" roster on `/b`

**Reproduce**
Sign in as `sunlit@sideshift.demo` and open `/b/threads`. Both rows read
`$0` beside an `ESCROWED` chip. The database holds $340 and $450.

**Cause**
`payments.thread_id` carries a `UNIQUE` constraint (`0001_schema.sql`), so
PostgREST correctly infers a **to-one** relationship and returns an *object*:

```json
{ "id": "c310d3d8…", "payments": { "status": "escrowed", "amount_cents": 45000 } }
```

Both call sites type it as an array and index it:

```ts
payments: { amount_cents: number; status: PaymentStatus }[] | null;
const payment = t.payments?.[0];   // undefined — it is not an array
```

`undefined` then falls through to `?? 0` and `?? "escrowed"`, which is why the
failure is silent and looks like real data rather than an error.

**Fix (not applied here)**
Type the embed as a single object and drop the index:

```ts
payments: { amount_cents: number; status: PaymentStatus } | null;
const payment = t.payments;
```

`deliverables` in the same queries is genuinely to-many, so the array handling
there is correct and must stay.

**Note:** Assessment A spotted the symptom on the brand dashboard
(`@rowanlifts · Approved · $0 ESCROWED`) and flagged it as a possible data
inconsistency. It is not a data problem — the rows are correct in Postgres.
It is this deserialisation bug, in two places.

---

## 2. `tests/thread.mjs` and `tests/improvements.mjs` mutate demo state

**Severity: low — known and documented, recorded here for completeness.**

`test:thread` drives the walkthrough thread to approved-and-paid, and
`test:improvements` needs a live response window to assert against. Running
either leaves the marketplace in a state where the other fails. Run
`supabase/demo-reset.sql` between runs. Already noted in the README.
