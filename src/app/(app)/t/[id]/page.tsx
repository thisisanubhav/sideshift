import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer, requireViewer } from "@/lib/auth";
import { getThread, THREAD_STATE_LABEL, type ThreadState } from "@/lib/thread";
import { duration, money, shortDate } from "@/lib/format";
import { PLATFORM_LABEL } from "@/lib/types";
import { Card, Chip, type TallyTone } from "@/components/ui";
import { PaymentRail } from "@/components/payment-rail";
import { Spine } from "./spine";
import { Composer } from "./composer";
import { DeliverablePanel } from "./deliverable-panel";
import { DeliverableFrame } from "./deliverable-frame";
import { LiveThread } from "./live";

/**
 * One route, both roles.
 *
 * The brief asks for brand and creator to see identical state; two routes would
 * make that a promise to keep in sync by hand. Role changes which actions are
 * offered — never what the state says.
 */

/** Every status indicator on this screen reads from this one map. */
const STATE_TONE: Record<ThreadState, TallyTone> = {
  awaiting_delivery: "standby",
  in_review: "live",
  changes_requested: "standby",
  complete: "clear",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) return { title: "Thread — SideShift" };
  const { id } = await params;
  const thread = await getThread(id, viewer);
  return {
    title: thread
      ? `@${thread.counterpart.handle} · ${thread.campaign.title} — SideShift`
      : "Thread — SideShift",
  };
}

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requireViewer();
  const { id } = await params;

  const thread = await getThread(id, viewer);
  if (!thread) notFound();

  const backHref = viewer.role === "brand" ? "/b/threads" : "/c/threads";
  const isCreator = viewer.role === "creator";
  const complete = thread.state === "complete";

  return (
    <div className="flex flex-col gap-5">
      <LiveThread threadId={thread.id} />

      {/* ONE status chip, derived from thread.state. There is no second answer
          to "what is happening now" anywhere on this screen, and no actions up
          here competing with the ones beside the payment they act on. */}
      <header className="flex flex-col gap-3">
        <Link href={backHref} className="type-small w-fit text-slate hover:text-graphite">
          ← Threads
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="type-display-l text-balance">{thread.campaign.title}</h1>
            <p className="text-slate">
              <span className="type-timecode text-graphite">
                @{thread.counterpart.handle}
              </span>{" "}
              · {thread.counterpart.name}
            </p>
          </div>
          <Chip tone={STATE_TONE[thread.state]} dot>
            {THREAD_STATE_LABEL[thread.state]}
          </Chip>
        </div>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,330px)_minmax(0,1fr)_264px]">
        {/* Column 1 — the brief, then the cut. */}
        <div className="order-2 flex flex-col gap-4 lg:order-1">
          <details
            open={!isCreator}
            className="group rounded-[4px] border border-hairline bg-card"
          >
            <summary className="type-micro flex cursor-pointer list-none items-center justify-between p-4 text-slate [&::-webkit-details-marker]:hidden">
              Brief details
              <span aria-hidden>
                <span className="group-open:hidden">Show</span>
                <span className="hidden group-open:inline">Hide</span>
              </span>
            </summary>
            <div className="border-t border-hairline p-4">
              {/* A tight aligned data grid, not prose. */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Spec label="Platform" value={PLATFORM_LABEL[thread.campaign.platform]} />
                <Spec label="Format" value="9:16 vertical" />
                <Spec
                  label="Count"
                  value={String(thread.campaign.videoCount).padStart(2, "0")}
                />
                <Spec label="Deadline" value={shortDate(thread.campaign.deadline)} />
                <Spec
                  label="Length"
                  value={duration(thread.campaign.durationMin, thread.campaign.durationMax)}
                />
                <Spec label="Fee" value={money(thread.payment.amountCents)} />
              </dl>
              <p className="mt-4 border-t border-hairline pt-4 text-[15px] leading-relaxed whitespace-pre-wrap">
                {thread.campaign.brief}
              </p>
            </div>
          </details>

          <DeliverableFrame deliverable={thread.latestDeliverable} state={thread.state} />
        </div>

        {/* Column 2 — the thread. Grows to the height of the frame beside it,
            so the message history no longer stops short of the video. */}
        <Card className="order-3 flex min-h-[560px] flex-col lg:order-2 lg:min-h-[720px]">
          <h2 className="type-micro border-b border-hairline p-4 text-slate">Thread</h2>
          <div className="flex-1 overflow-y-auto p-4">
            <Spine events={thread.events} />
          </div>
          {complete ? (
            <p className="type-small border-t border-hairline p-4 text-slate">
              This thread is complete and the payment has been released. It stays
              here as the record.
            </p>
          ) : (
            <div className="border-t border-hairline p-3">
              <Composer
                threadId={thread.id}
                counterpartHandle={thread.counterpart.handle}
              />
            </div>
          )}
        </Card>

        {/* Column 3 — the money, and the two actions that move it. */}
        <aside className="order-1 flex flex-col gap-4 lg:order-3 lg:sticky lg:top-20">
          <Card className="p-4">
            <PaymentRail
              amountCents={thread.payment.amountCents}
              status={thread.payment.status}
              escrowedAt={thread.payment.escrowedAt}
              inReviewAt={thread.payment.inReviewAt}
              releasedAt={thread.payment.releasedAt}
            />
          </Card>

          <Card className="p-4">
            <DeliverablePanel
              threadId={thread.id}
              role={viewer.role}
              latest={thread.latestDeliverable}
              amountCents={thread.payment.amountCents}
              complete={complete}
            />
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="type-micro text-slate">{label}</dt>
      <dd className="type-timecode text-[15px]">{value}</dd>
    </div>
  );
}
