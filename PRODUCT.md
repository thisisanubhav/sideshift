# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Creators** — people who make short-form vertical video, mostly on their own phones,
often as a second income. They browse paid briefs, apply with a pitch and a rate,
film, deliver, and get paid. Their scarce resource is *effort spent on applications
that go nowhere*: a pitch takes an hour and most disappear into silence.

**Brands** — small teams (often one marketer, sometimes the founder) buying UGC ads.
They post a brief, pick creators, approve cuts, release money. Their scarce resource
is *attention*: they open the tool between other jobs, and every applicant they don't
answer is a decision they've silently made without noticing.

The two sides never browse each other symmetrically. Creators shop; brands triage.

## Product Purpose

Brands post paid short-form video campaigns. Creators apply. Everything after
acceptance — brief, chat, deliverable, approval, payment — happens in **one thread
per creator**, instead of being scattered across Slack, email and Instagram DMs.

Success is that neither party is ever uncertain what state they are in or when it
changed.

## Positioning

The mechanism a neighbouring product cannot truthfully copy: **the platform refuses
to let state go ambiguous, and prices the ambiguity publicly.**

Every application carries a 48-hour response window with a live countdown. Unanswered
applications expire on their own. A decline is impossible to store without a reason,
enforced by a database CHECK constraint rather than a form rule. And a brand's
**responsiveness rate** — the share of applications it answered inside the window,
computed from real applications — is printed on every public campaign card.

A competitor can copy the countdown. It cannot copy the incentive: the rate makes
ignoring people cost the brand its next hire. A marketplace that monetises creators
per-application (as the real SideShift does, capping the free tier at 10/day and
selling "unlimited applications" for $9.99/mo) is structurally disinclined to ship it.

## Operating Context

- Creators work on phones, frequently at night, between other jobs. Mobile is not a
  secondary surface.
- Brands work on desktop, in short interrupted sessions, usually triaging a queue.
- The native materials of the subject are the 9:16 rectangle, @handles, view counts,
  timecode, and a clock running out. The product is about video, so it should read
  like something that belongs next to CapCut, not next to Jira.
- Deliverables in real life arrive as links (Drive, Frame.io, a raw platform URL)
  far more often than as uploaded files — a 60-second 4K vertical is ~200MB.
- The whole thing must be demonstrable end to end, in two browsers, in five minutes.

## Capabilities and Constraints

**Built and real:** email auth with role chosen at signup and enforced server-side;
campaign creation (publish or draft); browse with working filters; apply with pitch
and rate; applicant review; accept (consumes a slot, opens a thread, escrows money —
one transaction); decline with mandatory reason; the thread (pinned brief, chat,
deliverable, approve / request changes); the payment state machine; brand dashboard
with committed-vs-released spend and a per-creator roster.

**Deliberately not built:** brand-side creator discovery, training/bootcamp,
leaderboards and gamification, real payment processing, real analytics ingestion,
notifications, admin panel, team seats, messaging outside a thread, view-based
payout bonuses, light mode, editing a published campaign, creator profile editing.

**Technical constraints that shape the product:**
- Payments are **display state only**. The state machine is real; no money moves.
- View counts are **seeded demo data** and must be labelled as such wherever shown.
- Status columns have no `UPDATE` policy; every transition goes through a
  `SECURITY DEFINER` Postgres function that authorises the caller itself.
- Expiry is computed lazily on read rather than by a scheduler, so an application
  that lapses while nobody is looking flips the moment someone looks.
- Signup auto-confirms via a database trigger — demo-mode, meaning email addresses
  are never verified.

**Terminology, fixed:** *campaign* (never "gig", "program" or "job" — the real
product uses all three for one thing); *thread*; *slot*; *escrowed / in review /
released*; *response window*.

## Brand Commitments

Name **SideShift**. The wordmark carries a 9:16 rectangle as the counter of the S —
the only place a logo mark appears.

Voice: plain, specific, and never cheerful about someone else's money. Buttons name
their consequence ("Approve and release $450", never "Submit") and an action keeps
its name through the whole flow. Empty states are invitations to act. Errors say what
went wrong and how to fix it.

Established visual system (incumbent authority, documented in the README):
six semantic tokens on a warm plum-black ground; **Flare `#FF5A3D` is time and
nothing else; Iris `#7C6BFF` is identity and nothing else; money carries no hue at
all** and takes the highest contrast instead. Status differentiates by shape and fill,
not colour, which is how six colours cover nine statuses without a legend.
Archivo Expanded for display (rationed to three instances per screen), Instrument
Sans for body, JetBrains Mono with tabular figures for every money value, view count,
countdown and timestamp. No gradients, no glows, no shadows — one 1px border.

Signature element: **the Spine** — one vertical timeline per thread carrying
messages, state changes and money events in a single chronological order, each node
stamped with a UTC timecode to the second.

## Evidence on Hand

- Live deploy: https://sideshift-seven.vercel.app
- Seeded marketplace: 8 brands, 22 creators, 12 open campaigns, 39 applications with
  real decision history. Every name, handle, niche, rate, brief and pitch is written
  prose — **there is no lorem ipsum and no "Creator 07" anywhere, and none may be
  introduced.**
- Competitive research from a real walkthrough of sideshift.app in
  [research/NOTES.md](research/NOTES.md): 74 screenshots, 27 brand / 47 creator. The
  brand side is entirely paywalled, so there is no reference for it.
- Render audit against real Chromium at 390px and 1280px: `tests/render.mjs`.
- 86 automated checks across five suites, all against the live deploy.

**Absences that must not be fabricated:** there are no real creators, no real brands,
no real money, no real view counts, and no analytics integration. Nothing may be
presented as a genuine testimonial, case study or performance figure.

## Product Principles

1. **State is never ambiguous.** If a participant could wonder "what happens now?",
   that is a bug, not a missing feature.
2. **Make the cost of silence visible to the person causing it.** The countdown is
   pointed at the brand, not the creator.
3. **A number never appears without what makes it trustworthy.** A percentage travels
   with its denominator; below three data points it makes no claim at all.
4. **Both sides read the same record.** Shared state is rendered by one component
   from one row, so parity is structural rather than maintained by hand.
5. **Ground the interface in the medium.** Vertical rectangles, handles, view counts
   and timecode are the material — not decoration applied on top of a dashboard.

## Accessibility & Inclusion

Responsive to 390px. Visible keyboard focus on every interactive element.
`prefers-reduced-motion` respected — the urgent-countdown pulse is suppressed, but
the countdown itself keeps counting, because a changing number is information rather
than animation. Tabular figures so a live countdown never shifts the layout.
Colour is never the sole carrier of meaning: status is distinguished by shape and
fill as well as hue.
