import { Card } from "@/components/ui";
import type { ThreadState } from "@/lib/thread";
import type { DeliverableStatus } from "@/lib/types";

type Latest = {
  id: string;
  version: number;
  status: DeliverableStatus;
  deliveryUrl: string | null;
  fileUrl: string | null;
} | null;

/**
 * The cut, in a tall 9:16 frame — the aspect ratio of the thing being bought.
 *
 * The label on the frame is derived from the thread state, not from the
 * deliverable's own status, so it can never disagree with the header or the
 * payment rail.
 */
export function DeliverableFrame({
  deliverable,
  state,
}: {
  deliverable: Latest;
  state: ThreadState;
}) {
  if (!deliverable) {
    return (
      <Card className="flex min-h-[180px] flex-col items-center justify-center gap-2 border-dashed p-6 text-center">
        <span className="type-micro text-slate">No cut yet</span>
        <p className="type-small max-w-[24ch] text-slate">
          {state === "awaiting_delivery"
            ? "The creator hasn't submitted anything. The money stays escrowed until they do."
            : "Waiting on the next version."}
        </p>
      </Card>
    );
  }

  const href = deliverable.fileUrl ?? deliverable.deliveryUrl;
  const live = state === "in_review";

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[9/16] bg-graphite">
        {/* Version tag, top left — the mockup's DRAFT_01 slate. */}
        <span className="type-micro absolute top-3 left-3 rounded-[4px] border border-card/25 bg-graphite/80 px-2 py-1 text-card">
          DRAFT_{String(deliverable.version).padStart(2, "0")}
        </span>

        {/* Tally light. Only lit while this cut is actually under review. */}
        {live ? (
          <span className="type-micro absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-[4px] bg-graphite/80 px-2 py-1 text-card">
            <span
              aria-hidden
              className="size-1.5 rounded-[4px] bg-tally-live motion-safe:animate-pulse"
            />
            REC
          </span>
        ) : null}

        <div className="flex h-full items-center justify-center px-6 text-center">
          <span className="type-timecode text-[13px] text-card/60">
            9:16 · no preview
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-hairline p-3">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="type-small inline-flex min-h-11 items-center text-graphite underline underline-offset-4"
          >
            {deliverable.fileUrl ? "Open the file" : "Open the delivery link"}
          </a>
        ) : null}
      </div>
    </Card>
  );
}
