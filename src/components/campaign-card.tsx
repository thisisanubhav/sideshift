import Link from "next/link";
import { PLATFORM_SHORT } from "@/lib/types";
import { money, duration, shortDate, daysUntil } from "@/lib/format";
import { ResponsivenessBadge, SlotRail, VerticalCount } from "@/components/rail";
import { TallyStrip } from "@/components/tally";
import type { TallyTone } from "@/components/ui";
import type { CampaignCardData } from "@/lib/queries";

/**
 * A wide row, not a tile in a grid.
 *
 * A grid of squares makes every campaign look alike; the things that differ and
 * matter — the money, the slots left, and whether this brand ever replies — are
 * worth putting in columns you can run your eye down.
 */
export function CampaignCard({
  campaign: c,
  href,
}: {
  campaign: CampaignCardData;
  href: string;
}) {
  const days = daysUntil(c.deadline);
  const slotsLeft = c.slots_total - c.slots_filled;

  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-[4px] border border-hairline bg-card p-4 pl-5 transition-[border-color] duration-150 hover:border-graphite/50 sm:p-5 sm:pl-5"
    >
      {/* A campaign with no slots left is over; one still taking creators is
          standing by. The tally says which before the card is read. */}
      <TallyStrip tone={slotsLeft > 0 ? "standby" : "over"} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div className="flex shrink-0 flex-col gap-2">
          <VerticalCount count={c.video_count} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h2 className="type-title text-balance text-graphite">{c.title}</h2>

          {/* Identity line: who this is, and whether they answer. Read together,
              at the same size, before the creator commits an hour to a pitch. */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="type-timecode text-[15px] text-graphite">
              @{c.brand.handle}
            </span>
            {c.niche ? <span className="text-[15px] text-slate">· {c.niche}</span> : null}
            <span aria-hidden className="text-slate">·</span>
            <ResponsivenessBadge
              answered={c.answered_in_window}
              decidable={c.decidable}
            />
          </div>

          <p className="type-small text-slate">
            <span className="type-timecode">{c.video_count}</span>× {PLATFORM_SHORT[c.platform]} ·{" "}
            {duration(c.duration_min_seconds, c.duration_max_seconds)} · due{" "}
            {shortDate(c.deadline)}
            {days <= 10 ? (
              <span className="text-tally-live"> · {days}d left to deliver</span>
            ) : null}
          </p>
        </div>

        {/* Money gets no hue. It gets the highest contrast on the card instead. */}
        <div className="flex shrink-0 items-baseline gap-2 sm:flex-col sm:items-end sm:gap-0.5">
          <span className="type-timecode text-[32px] leading-none font-semibold text-graphite">
            {money(c.budget_cents_per_creator)}
          </span>
          <span className="type-micro text-slate">per creator</span>
        </div>
      </div>

      <div className="mt-4 border-t border-hairline pt-3">
        <SlotRail filled={c.slots_filled} total={c.slots_total} />
      </div>
    </Link>
  );
}
