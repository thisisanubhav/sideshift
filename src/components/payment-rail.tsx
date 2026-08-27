import { money, spineStamp } from "@/lib/format";
import { cn } from "@/components/ui";
import { PAYMENT_STATUS_LABEL, type PaymentStatus } from "@/lib/types";

/**
 * The money, rendered by ONE component for both roles.
 *
 * The brand and the creator import this same file and read the same payments
 * row, so "both sides see the same state and the same timestamp" is structural
 * rather than something to keep in sync by hand. There is no brand variant.
 *
 * Each step is a tally: done, current, or not yet. A completed step always
 * carries the timestamp it happened at, at every breakpoint.
 */
export function PaymentRail({
  amountCents,
  status,
  escrowedAt,
  inReviewAt,
  releasedAt,
}: {
  amountCents: number;
  status: PaymentStatus;
  escrowedAt: string;
  inReviewAt: string | null;
  releasedAt: string | null;
}) {
  const order: PaymentStatus[] = ["escrowed", "in_review", "released"];
  const currentIndex = order.indexOf(status);

  const steps = [
    { key: "escrowed" as const, at: escrowedAt, pending: "Not yet escrowed" },
    { key: "in_review" as const, at: inReviewAt, pending: "Awaiting a cut" },
    { key: "released" as const, at: releasedAt, pending: "Pending approval" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="type-micro text-slate">Payment status</h2>
        <span className="type-timecode text-[32px] leading-none">
          {money(amountCents, { cents: true })}
        </span>
      </div>

      <ol className="flex flex-col">
        {steps.map((s, i) => {
          const done = Boolean(s.at) && i <= currentIndex;
          const current = i === currentIndex;

          return (
            <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0">
              {/* the run between tallies */}
              {i < steps.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-3 bottom-0 left-[3px] w-px",
                    done ? "bg-tally-clear/40" : "bg-hairline",
                  )}
                />
              ) : null}

              <span
                aria-hidden
                className={cn(
                  "relative mt-1.5 size-[7px] shrink-0 rounded-[4px]",
                  done
                    ? "bg-tally-clear"
                    : current
                      ? "bg-tally-live"
                      : "border border-hairline bg-card",
                )}
              />

              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  className={cn(
                    "type-micro",
                    done ? "text-tally-clear" : current ? "text-tally-live" : "text-slate",
                  )}
                >
                  {PAYMENT_STATUS_LABEL[s.key]}
                </span>
                {s.at ? (
                  <span className="type-timecode text-[13px] text-slate">
                    {spineStamp(s.at)}
                  </span>
                ) : (
                  <span className="type-small text-slate">{s.pending}</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="type-small border-t border-hairline pt-3 text-slate">
        {status === "released"
          ? "Paid. Both sides are looking at the same timestamp."
          : status === "in_review"
            ? "Held while the brand reviews the cut. Approving releases it."
            : "Held since the brand accepted. Neither side can move it until the work is approved."}
      </p>

      {/* Kept for the end-to-end tests, which assert on payment state from the
          rendered page rather than from the database. */}
      <span data-payment-status={status} className="sr-only">
        {PAYMENT_STATUS_LABEL[status]}
      </span>
    </div>
  );
}
