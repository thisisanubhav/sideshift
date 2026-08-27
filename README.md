# SideShift

A rebuild of [sideshift.app](https://sideshift.app) — a marketplace where brands
post paid short-form video briefs and creators apply, deliver and get paid, with
the brief, the chat, the approval and the money in one thread.

Built as a take-home. Full write-up, setup steps and the "what I cut and why"
list land in Phase 4.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres, Auth,
Storage) · Vercel

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in from your Supabase project
npm run dev
```

Migrations live in `supabase/migrations/` and are applied in order.
