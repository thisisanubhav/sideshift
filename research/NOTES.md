# SideShift walkthrough — what I took from the real product

Source: 74 screenshots of app.sideshift.app (27 brand, 47 creator), captured
2026-08-27. The images themselves are gitignored — 72MB of browser chrome is not
repo material. This file is the part that mattered.

## What I could and couldn't see

The **brand side is hard-paywalled** behind "Start free trial · $0 today". Campaign
creation, the applicant list, payouts and analytics were all behind a skeleton
loader and a modal. So there is no brand-side reference here; I'm designing that
half from the assignment brief.

The **creator side is fully explorable**, and that's the half that matters most
anyway — it's where the reviews complain.

## Vocabulary I'm adopting

The real product is inconsistent, so I picked one word per concept and will hold it:

| Their words | Mine | Why |
|---|---|---|
| "gigs" / "campaigns" / "programs" (3 words, 1 thing — even the URL is `/programs`) | **campaign**, everywhere | An action keeps its name through the whole flow. |
| "Which side are you on?" (login role picker) | kept verbatim | It's good. |
| "I'm a brand · Hire creators and run campaigns" / "I'm a creator · Get paid to make content for brands" | kept, near-verbatim | Says what happens, no jargon. |
| "Explore" → "Browse" tab | **Browse** | One level, not two. |
| "My Campaigns" (creator's accepted work) | **Threads** | Their name collides with the brand's campaigns. Mine is the thing itself. |
| "Message" | folded into the thread | Separate inbox is the failure mode this app exists to fix. |

## Card anatomy worth stealing

Their browse card: a **collage of vertical video stills with view counts burned into
each one** (1.7M, 9.4M, 677.1K, 1.5M), a price pill top-right ($1000/month), title,
brand name + verified tick, category tag.

The collage is the right instinct — vertical stills and view counts *are* the
material — but it's a flat image, so none of it is data. Mine renders the same
texture structurally: real 9:16 tiles, real view counts, and the numbers are
queryable instead of baked into a JPEG.

Their filters: Saved · Verified brands · Pricing model · Job Type · Creator Type ·
Rate. Sorts: Recommended · Newest · Highest pay. Mine keeps platform, budget,
niche — and adds the one they don't have.

## The thing that confirms the whole thesis

Across 47 creator screens there is **no response-time signal, no application
countdown, no slot counter on a card, and nowhere a decline reason could appear.**
A creator picks a campaign knowing the pay and nothing about whether the brand
will ever reply. All three of my product fixes are answering a gap that is
genuinely there, not a strawman.

## What they monetise (and what I'm not building)

- **"10/10 applications left today"** — the free tier rate-limits applications.
  Pro ($9.99/mo) unlocks "Unlimited applications", "More visibility to brands",
  "Skip the waitlist".
- Gamification: Bronze tier badge, a streak counter, a star counter.
- Big side sections: Training (a UGC bootcamp with locked modules), Affiliates
  (referral commissions), Portfolio.

All of it is out of scope and stays out. Worth noting the incentive though: a
product that charges creators for *more applications* has no reason to make brands
answer the ones they already sent. The responsiveness rate is the fix that a
subscription-funded marketplace is structurally disinclined to ship.

## Model difference I'm keeping

They price campaigns as a **monthly retainer** ("$1000/month"). The assignment
specifies budget per creator against a deliverable count, so mine is per-video.
Noted rather than adopted.
