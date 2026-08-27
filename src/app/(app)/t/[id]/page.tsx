import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { getThread } from "@/lib/thread";
import { duration, shortDate } from "@/lib/format";
import { PLATFORM_LABEL } from "@/lib/types";
import { Card, Chip } from "@/components/ui";
import { PaymentRail } from "@/components/payment-rail";
import { VerticalCount } from "@/components/rail";
import { Spine } from "./spine";
import { Composer } from "./composer";
import { DeliverablePanel } from "./deliverable-panel";
import { LiveThread } from "./live";

/**
 * One route, both roles.
 *
 * The brief asks for brand and creator to see identical state; two routes would
 * make that a promise to keep in sync by hand. Here the only thing role changes
 * is which actions are offered — never what the state says.
 */
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
  const complete = thread.status === "complete";

  return (
    <div className="flex flex-col gap-6">
      <LiveThread threadId={thread.id} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={backHref} className="type-small text-ash hover:text-bone">
          ← Threads
        </Link>
        <Chip tone={complete ? "solid" : "outline"}>
          {complete
            ? "Complete"
            : thread.status === "in_review"
              ? "In review"
              : "Active"}
        </Chip>
      </div>

      <header className="flex flex-col gap-1">
        <h1 className="type-display-l text-balance">{thread.campaign.title}</h1>
        <p className="text-ash">
          with{" "}
          <span className="type-timecode text-bone">
            @{thread.counterpart.handle}
          </span>{" "}
          · {thread.counterpart.name}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:gap-8">
        {/* On mobile the money and the actions come first: burying "Approve and
            release" under the whole message history is how a brand forgets to
            pay. On desktop the aside returns to the right rail. */}
        <div className="order-2 flex min-w-0 flex-col gap-5 lg:order-1">
          {/* The brief is pinned so it never scrolls away mid-argument. */}
          <details open className="group rounded-[10px] border border-line bg-raise">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-3">
                <VerticalCount count={thread.campaign.videoCount} />
                <span className="type-micro text-ash">The brief</span>
              </span>
              <span className="type-small text-ash group-open:hidden">Show</span>
              <span className="type-small hidden text-ash group-open:inline">Hide</span>
            </summary>
            <div className="flex flex-col gap-3 border-t border-line p-4">
              <p className="type-small text-ash">
                {thread.campaign.videoCount}× {PLATFORM_LABEL[thread.campaign.platform]}{" "}
                · {duration(thread.campaign.durationMin, thread.campaign.durationMax)}{" "}
                · due {shortDate(thread.campaign.deadline)}
              </p>
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                {thread.campaign.brief}
              </p>
            </div>
          </details>

          <Spine events={thread.events} />

          {complete ? (
            <p className="type-small rounded-[10px] border border-line bg-raise px-4 py-3 text-ash">
              This thread is complete and the payment has been released. It stays
              here as the record.
            </p>
          ) : (
            <div className="sticky bottom-0 -mx-4 border-t border-line bg-pitch/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-[10px] sm:border sm:px-3 sm:py-3">
              <Composer
                threadId={thread.id}
                counterpartHandle={thread.counterpart.handle}
              />
            </div>
          )}
        </div>

        <aside className="order-1 flex flex-col gap-4 lg:order-2 lg:sticky lg:top-24 lg:self-start">
          {/* Identical component, identical data, both roles. */}
          <Card className="p-5">
            <PaymentRail
              amountCents={thread.payment.amountCents}
              status={thread.payment.status}
              escrowedAt={thread.payment.escrowedAt}
              inReviewAt={thread.payment.inReviewAt}
              releasedAt={thread.payment.releasedAt}
            />
          </Card>

          <Card className="p-5">
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
