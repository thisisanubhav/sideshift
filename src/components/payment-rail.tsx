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

  const released = status === "released";

  return (
    /**
     * Release is the terminal moment of the whole product and the only reason a
     * creator is here — and it used to render at exactly the same weight as the
     * escrowed state before it. The voice rule forbids being cheerful about
     * someone else's money, but *marked* and *cheerful* are different things.
     *
     * So it extends the grammar the system already has: the escrow chip fills
     * as the money moves. Here that fill scales to the whole card. No new
     * colour, no confetti — the surface simply inverts once it is paid.
     */
    <div
      className={cn(
        "flex flex-col gap-4",
        released && "-m-5 rounded-[4px] bg-graphite p-5 text-card",
      )}
    >
      <div className="flex flex-col gap-2.5">
        <span className="type-timecode text-[32px] leading-none font-semibold">
          {money(amountCents, { cents: true })}
        </span>
        <span
          data-payment-status={status}
          className={cn(
            "type-micro w-fit rounded-[4px] px-2.5 py-1",
            released
              ? "border border-card bg-graphite text-graphite"
              : "border border-graphite/45 text-graphite",
          )}
        >
          {PAYMENT_STATUS_LABEL[status]}
        </span>
      </div>

      <dl className="flex flex-col gap-0">
        {steps.map((s) => (
          <div
            key={s.key}
            className={cn(
              "flex items-baseline justify-between gap-3 border-t py-2 first:border-t-0",
              released ? "border-card/15" : "border-hairline",
            )}
          >
            <dt
              className={cn(
                "type-small",
                released ? "text-card" : s.at ? "text-graphite" : "text-slate",
              )}
            >
              {PAYMENT_STATUS_LABEL[s.key]}
            </dt>
            <dd
              className={cn(
                "type-timecode text-[13px]",
                released ? "text-card/70" : s.at ? "text-slate" : "text-slate/40",
              )}
            >
              {s.at ? spineStamp(s.at) : "—"}
            </dd>
          </div>
        ))}
      </dl>

      <p className={cn("type-small", released ? "text-card/80" : "text-slate")}>
        {status === "released"
          ? "Paid. Both sides are looking at the same timestamp."
          : status === "in_review"
            ? "Held while the brand reviews the cut. Approving releases it."
            : "Held since the moment the brand accepted. Neither side can move it until the work is approved."}
      </p>
    </div>
  );
}
