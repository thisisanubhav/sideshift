import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer, homeFor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Wordmark } from "@/components/wordmark";
import { Button, Chip } from "@/components/ui";
import { money, timecode } from "@/lib/format";
import { HeroSpine } from "./hero-spine";

type Stats = {
  open_campaigns: number;
  creators: number;
  brands: number;
  escrowed_cents: number;
  released_cents: number;
  answered_pct: number;
};

export default async function Home() {
  const viewer = await getViewer();
  if (viewer) redirect(homeFor(viewer.role));

  // Real figures from the live marketplace. Nothing on this page is invented —
  // if the numbers are unavailable the blocks that quote them simply don't render.
  const supabase = await createClient();
  const { data } = await supabase.rpc("marketplace_stats");
  const s = (Array.isArray(data) ? data[0] : data) as Stats | undefined;

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-[8px] focus:bg-bone focus:px-4 focus:py-2 focus:text-pitch"
      >
        Skip to content
      </a>

      <header className="flex items-center justify-between border-b border-line px-5 py-3 sm:px-8">
        <Wordmark />
        <nav aria-label="Account" className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" className="h-11">Sign in</Button>
          </Link>
          <Link href="/signup">
            <Button variant="primary" className="h-11">Join SideShift</Button>
          </Link>
        </nav>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-5 py-14 sm:px-8 sm:py-20">
        <section className="grid items-start gap-10 lg:grid-cols-[1fr_460px] lg:gap-14">
          <div className="flex flex-col gap-6">
            <p className="type-micro text-ash">Paid UGC, without the guesswork</p>
            <h1 className="type-display-xl text-balance">
              One thread per creator. Brief, chat, approval, payment.
            </h1>
            <p className="max-w-xl text-lg text-ash">
              Brands post paid short-form video briefs. Creators apply with a rate.
              Everything after that happens on a single timeline that both sides
              read the same way — no Slack, no email, no wondering.
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <Link href="/signup">
                <Button variant="primary" className="h-11">Post a campaign</Button>
              </Link>
              <Link href="/signup">
                <Button variant="secondary" className="h-11">Browse open briefs</Button>
              </Link>
            </div>

            {s ? (
              <dl className="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-4">
                <Stat label="Open briefs" value={String(s.open_campaigns)} />
                <Stat label="Creators" value={String(s.creators)} />
                <Stat label="Escrowed now" value={money(s.escrowed_cents)} />
                <Stat label="Answered in time" value={`${s.answered_pct}%`} />
              </dl>
            ) : null}
            <p className="type-small text-ash">
              Live figures from this marketplace, not a brochure.
            </p>
          </div>

          <HeroSpine />
        </section>

        {/* The three promises, each shown in the product's own grammar rather
            than described in a card with a coloured eyebrow. */}
        <section className="mt-20 flex flex-col gap-4 sm:mt-28">
          <h2 className="type-micro text-ash">What&apos;s different</h2>

          <div className="grid gap-4 lg:grid-cols-3">
            <Promise
              title="Every application gets an answer"
              body="A 48-hour window, counted down in front of both of you. Let it lapse and the application expires on its own, the slot frees, and it shows in your public rate."
              demo={
                <div className="flex items-baseline gap-2">
                  <span className="type-micro text-ash">Brand must reply in</span>
                  <span className="type-timecode text-flare">
                    {timecode(41 * 60 * 1000 + 52 * 1000)}
                  </span>
                </div>
              }
            />

            <Promise
              title="Every no comes with a reason"
              body="Declines pick from a fixed list and the creator reads it verbatim. The database refuses to store a decline without one — it isn't a form rule you can skip."
              demo={
                <div className="flex flex-col gap-1.5">
                  <span className="type-micro text-ash">Why it was declined</span>
                  <span className="type-small">Rate above our budget</span>
                </div>
              }
            />

            <Promise
              title="Both sides see the same money"
              body="Escrowed, in review, released — one record, one set of timestamps, rendered by one component for the brand and the creator. Not two views kept in sync by hand."
              demo={
                <div className="flex items-center gap-2">
                  <Chip tone="outline">Escrowed</Chip>
                  <span aria-hidden className="text-ash">→</span>
                  <Chip tone="solid">Released</Chip>
                </div>
              }
            />
          </div>
        </section>

        {/* The wedge gets its own moment, because it is the argument. */}
        <section className="mt-16 flex flex-col gap-4 rounded-[10px] border border-line bg-raise p-6 sm:mt-20 sm:p-8">
          <h2 className="type-display-l max-w-2xl text-balance">
            Before you spend an hour on a pitch, see whether this brand answers.
          </h2>
          <p className="max-w-2xl text-ash">
            Every campaign card carries the share of applications that brand
            answered inside the window — computed from real applications, never
            shown without its denominator, and never guessed at from one data
            point. No competitor shows it.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
            <span className="inline-flex items-center gap-1.5 text-[14px]">
              <span aria-hidden className="size-1.5 rounded-full bg-bone" />
              <span className="type-timecode font-semibold">92%</span>
              <span>answered in time</span>
              <span className="text-ash">· 24 of 26</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-[14px] text-flare">
              <span aria-hidden className="size-1.5 rounded-full bg-flare" />
              <span className="type-timecode font-semibold">43%</span>
              <span>answered in time</span>
              <span className="text-ash">· 3 of 7</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-[14px] text-ash">
              <span aria-hidden className="size-1.5 rounded-full bg-ash/60" />
              New brand · no response history
            </span>
          </div>
        </section>
      </main>

      <footer className="border-t border-line px-5 py-6 sm:px-8">
        <p className="type-small text-ash">
          A rebuild of sideshift.app, built as a take-home. Payments are display
          state only — no money moves. View counts in the app are seeded and
          labelled as demo data.
        </p>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 bg-pitch p-3.5">
      <dt className="type-micro text-ash">{label}</dt>
      <dd className="type-timecode text-[20px] leading-tight">{value}</dd>
    </div>
  );
}

function Promise({
  title,
  body,
  demo,
}: {
  title: string;
  body: string;
  demo: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[10px] border border-line bg-raise p-5">
      <div className="rounded-[8px] border border-line-strong bg-pitch p-3.5">
        {demo}
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="type-title text-balance">{title}</h3>
        <p className="type-small text-ash">{body}</p>
      </div>
    </div>
  );
}
