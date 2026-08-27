import Link from "next/link";
import { Chip, type TallyTone } from "@/components/ui";
import { TallyCard, TallyStrip } from "@/components/tally";
import { money, stamp } from "@/lib/format";
import { PAYMENT_STATUS_LABEL, type PaymentStatus, type ThreadStatus } from "@/lib/types";

export type ThreadListItem = {
  id: string;
  status: ThreadStatus;
  created_at: string;
  campaignTitle: string;
  counterpartHandle: string;
  amount_cents: number;
  paymentStatus: PaymentStatus;
};

/**
 * Shared by both sides. The row a brand sees and the row a creator sees are the
 * same component reading the same payment row — that is the only way "both
 * sides see the same state" survives contact with a deadline.
 */
/** Escrowed money is standing by; money in review is live; released is clear. */
const PAYMENT_TONE: Record<PaymentStatus, TallyTone> = {
  escrowed: "standby",
  in_review: "live",
  released: "clear",
};

export function ThreadList({ items }: { items: ThreadListItem[] }) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((t) => (
        <Link key={t.id} href={`/t/${t.id}`}>
          <TallyCard className="flex flex-wrap items-center justify-between gap-3 p-4 transition-[border-color] hover:border-graphite/50 sm:p-5">
            <TallyStrip tone={PAYMENT_TONE[t.paymentStatus]} />
            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="type-title text-balance">{t.campaignTitle}</h3>
              <p className="type-small text-slate">
                <span className="type-timecode text-graphite">@{t.counterpartHandle}</span>{" "}
                · opened {stamp(t.created_at)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="type-timecode text-[18px]">{money(t.amount_cents)}</span>
              <Chip tone={t.paymentStatus === "released" ? "clear" : "neutral"}>
                {PAYMENT_STATUS_LABEL[t.paymentStatus]}
              </Chip>
            </div>
          </TallyCard>
        </Link>
      ))}
    </div>
  );
}
