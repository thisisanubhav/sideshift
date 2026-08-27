import Link from "next/link";
import { PLATFORM_SHORT } from "@/lib/types";
import { money, duration, shortDate, daysUntil } from "@/lib/format";
import { ResponsivenessBadge, SlotRail, VerticalCount } from "@/components/rail";
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

  return (
    <Link
      href={href}
      className="group block rounded-[10px] border border-line bg-raise p-4 transition-colors hover:border-bone/25 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div className="flex shrink-0 flex-col gap-2">
          <VerticalCount count={c.video_count} />
          <span className="type-micro text-ash">{PLATFORM_SHORT[c.platform]}</span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h3 className="type-title text-balance group-hover:text-bone">{c.title}</h3>
          <p className="type-small text-ash">
            <span className="type-timecode text-bone">@{c.brand.handle}</span>
            {c.niche ? <> · {c.niche}</> : null}
          </p>
          <p className="type-small text-ash">
            {c.video_count}× {PLATFORM_SHORT[c.platform]} ·{" "}
            {duration(c.duration_min_seconds, c.duration_max_seconds)} · due{" "}
            {shortDate(c.deadline)}
            {days <= 10 ? (
              <span className="text-flare"> · {days}d left to deliver</span>
            ) : null}
          </p>
        </div>

        {/* Money gets no hue. It gets the highest contrast on the card instead. */}
        <div className="flex shrink-0 items-baseline gap-2 sm:flex-col sm:items-end sm:gap-0.5">
          <span className="type-timecode text-[26px] leading-none font-semibold text-bone">
            {money(c.budget_cents_per_creator)}
          </span>
          <span className="type-micro text-ash">per creator</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between">
        <SlotRail filled={c.slots_filled} total={c.slots_total} />
        <ResponsivenessBadge
          answered={c.answered_in_window}
          decidable={c.decidable}
        />
      </div>
    </Link>
  );
}
