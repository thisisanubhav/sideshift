import { cn } from "@/components/ui";
import { responsiveness as computeResponsiveness } from "@/lib/format";

/**
 * The Spine, compressed.
 *
 * In a thread the spine runs vertically and carries messages, state changes and
 * money events on one timeline. On a card there is no room for that, so the same
 * object collapses to a horizontal rail of slot nodes. One grammar in both
 * places: filled node = taken, hollow node = open.
 */
export function SlotRail({
  filled,
  total,
  className,
}: {
  filled: number;
  total: number;
  className?: string;
}) {
  const left = Math.max(0, total - filled);
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex items-center" role="img"
           aria-label={`${filled} of ${total} slots filled`}>
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className="flex items-center">
            {i > 0 ? (
              <span
                aria-hidden
                className={cn("h-px w-3.5", i <= filled ? "bg-graphite/40" : "bg-hairline")}
              />
            ) : null}
            <span
              aria-hidden
              className={cn(
                "block size-2 rounded-[4px]",
                i < filled ? "bg-graphite" : "border border-hairline bg-transparent",
              )}
            />
          </span>
        ))}
      </div>
      <span className="type-small text-slate">
        {left === 0
          ? "All slots filled"
          : `${left} of ${total} slot${total === 1 ? "" : "s"} left`}
      </span>
    </div>
  );
}

/**
 * Brand responsiveness — the highest-signal thing a creator needs before
 * spending an hour writing a pitch, and the number no competitor shows.
 *
 * Never a bare percentage: the denominator travels with it, and below three
 * decidable applications it does not claim a rate at all.
 */
export function ResponsivenessBadge({
  answered,
  decidable,
  className,
  size = "body",
}: {
  answered: number | null | undefined;
  decidable: number | null | undefined;
  className?: string;
  /**
   * `body` is the default on purpose. This used to render at 13px in the
   * bottom-right corner of the card — the least-scanned position on the least
   * prominent line — which meant the one number a creator most needs before
   * spending an hour on a pitch arrived after the decision was made. It now
   * sits in the identity line, read at the same moment as the handle.
   */
  size?: "body" | "small";
}) {
  const r = computeResponsiveness(answered, decidable);
  const text = size === "body" ? "text-[15px]" : "type-small";

  if (r.kind === "new") {
    return (
      <span className={cn(text, "inline-flex items-center gap-1.5 text-slate", className)}>
        <span aria-hidden className="size-1.5 rounded-[4px] bg-slate/60" />
        {r.label}
      </span>
    );
  }

  // Flare here is still time: the metric is literally "answered in time", and a
  // brand that misses the window is the same failure the countdown measures.
  const tone =
    r.tone === "good" ? "text-graphite" : r.tone === "mixed" ? "text-slate" : "text-tally-live";

  return (
    <span
      className={cn(text, "inline-flex flex-wrap items-center gap-x-1.5", tone, className)}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-[4px]",
          r.tone === "good" ? "bg-graphite" : r.tone === "mixed" ? "bg-slate" : "bg-tally-live",
        )}
      />
      <span className="type-timecode font-semibold">{r.pct}%</span>
      <span>answered in time</span>
      {/* The denominator is not optional. A percentage without it is exactly the
          ambiguity this product exists to remove. */}
      <span className="text-slate">
        · {r.answered} of {r.decidable}
      </span>
    </span>
  );
}

/**
 * The deliverable count, drawn as the thing being delivered: n vertical 9:16
 * tiles. Three bars means three videos, readable before you read the text.
 */
export function VerticalCount({
  count,
  className,
  active = false,
}: {
  count: number;
  className?: string;
  active?: boolean;
}) {
  const shown = Math.min(count, 4);
  return (
    <span
      className={cn("flex items-end gap-1", className)}
      role="img"
      aria-label={`${count} vertical video${count === 1 ? "" : "s"}`}
    >
      {Array.from({ length: shown }).map((_, i) => (
        <span
          key={i}
          aria-hidden
          // Raised off the card rather than sunk into it. At border-hairline
          // on bg-card these were invisible on a real screen — the one piece of
          // texture that says "vertical video" was doing no work at all.
          className={cn(
            "block w-[13px] rounded-[4px] border",
            active
              ? "border-graphite bg-graphite/15"
              : "border-hairline bg-bone",
          )}
          style={{ height: 23 }}
        />
      ))}
      {count > shown ? (
        <span className="type-timecode pl-0.5 text-[11px] text-slate">+{count - shown}</span>
      ) : null}
    </span>
  );
}
