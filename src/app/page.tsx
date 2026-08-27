import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer, homeFor } from "@/lib/auth";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui";

const PROMISES = [
  {
    label: "48-hour window",
    title: "Every application gets an answer",
    body: "Applications carry a live countdown. If a brand lets it lapse, the application expires and the slot frees itself. Nobody waits on silence.",
  },
  {
    label: "No silent declines",
    title: "Every no comes with a reason",
    body: "A decline names a reason from a fixed list, and the creator reads it. The database refuses to store a decline without one.",
  },
  {
    label: "One money timeline",
    title: "Both sides see the same number",
    body: "Escrowed, in review, released — one record, one set of timestamps, rendered the same way for the brand and the creator.",
  },
];

export default async function Home() {
  const viewer = await getViewer();
  if (viewer) redirect(homeFor(viewer.role));

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-8">
        <Wordmark />
        <nav className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/signup">
            <Button variant="primary" size="sm">
              Join SideShift
            </Button>
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-16 sm:px-8 sm:py-24">
        <section className="flex flex-col gap-6">
          <p className="type-micro text-iris">Paid UGC, without the guesswork</p>
          <h1 className="type-display-xl max-w-3xl text-balance">
            One thread per creator. Brief, chat, approval, payment.
          </h1>
          <p className="max-w-xl text-lg text-ash">
            Brands post paid short-form video briefs. Creators apply with a rate.
            Everything after that happens in a single thread that both sides read
            the same way.
          </p>
          <div className="flex flex-wrap gap-2.5 pt-2">
            <Link href="/signup">
              <Button variant="primary">Post a campaign</Button>
            </Link>
            <Link href="/signup">
              <Button variant="secondary">Browse open briefs</Button>
            </Link>
          </div>
        </section>

        <section className="mt-20 grid gap-4 sm:mt-28 md:grid-cols-3">
          {PROMISES.map((p) => (
            <div
              key={p.label}
              className="flex flex-col gap-3 rounded-[10px] border border-line bg-raise p-5"
            >
              <span className="type-micro text-flare">{p.label}</span>
              <h2 className="type-title text-balance">{p.title}</h2>
              <p className="type-small text-ash">{p.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-line px-5 py-6 sm:px-8">
        <p className="type-small text-ash">
          A rebuild of sideshift.app, built as a take-home. View counts shown in
          the app are seeded demo data.
        </p>
      </footer>
    </div>
  );
}
