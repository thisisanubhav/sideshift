import { money, spineStamp } from "@/lib/format";
import { cn } from "@/components/ui";
import { PAYMENT_STATUS_LABEL, type PaymentStatus } from "@/lib/types";

/**
 * The money, rendered by ONE component for both roles.
 *
 * The brand and the creator import the same file and read the same payment row,
 * so "both sides see the same state and the same timestamp" is structural
 * rather than a thing to keep in sync by hand. There is no brand variant.
 *
 * Money carries no hue. It gets the highest contrast on the screen instead, and
 * the chip *fills* as the money moves: outlined while held, solid once paid.
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
  const steps = [
    { key: "escrowed" as const, at: escrowedAt },
    { key: "in_review" as const, at: inReviewAt },
    { key: "released" as const, at: releasedAt },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        <span className="type-timecode text-[32px] leading-none font-semibold">
          {money(amountCents, { cents: true })}
        </span>
        <span
          className={cn(
            "type-micro w-fit rounded-full px-2.5 py-1",
            status === "released"
              ? "bg-bone text-pitch"
              : "border border-bone/45 text-bone",
          )}
        >
          {PAYMENT_STATUS_LABEL[status]}
        </span>
      </div>

      <dl className="flex flex-col gap-0">
        {steps.map((s) => (
          <div
            key={s.key}
            className="flex items-baseline justify-between gap-3 border-t border-line py-2 first:border-t-0"
          >
            <dt className={cn("type-small", s.at ? "text-bone" : "text-ash")}>
              {PAYMENT_STATUS_LABEL[s.key]}
            </dt>
            <dd
              className={cn(
                "type-timecode text-[12px]",
                s.at ? "text-ash" : "text-ash/40",
              )}
            >
              {s.at ? spineStamp(s.at) : "—"}
            </dd>
          </div>
        ))}
      </dl>

      <p className="type-small text-ash">
        {status === "released"
          ? "Paid. Both sides are looking at the same timestamp."
          : status === "in_review"
            ? "Held while the brand reviews the cut. Approving releases it."
            : "Held since the moment the brand accepted. Neither side can move it until the work is approved."}
      </p>
    </div>
  );
}
