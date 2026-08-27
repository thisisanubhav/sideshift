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
                className={cn("h-px w-3.5", i <= filled ? "bg-bone/50" : "bg-line-strong")}
              />
            ) : null}
            <span
              aria-hidden
              className={cn(
                "block size-2 rounded-full",
                i < filled ? "bg-bone" : "border border-line-strong bg-transparent",
              )}
            />
          </span>
        ))}
      </div>
      <span className="type-small text-ash">
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
}: {
  answered: number | null | undefined;
  decidable: number | null | undefined;
  className?: string;
}) {
  const r = computeResponsiveness(answered, decidable);

  if (r.kind === "new") {
    return (
      <span className={cn("type-small inline-flex items-center gap-1.5 text-ash", className)}>
        <span aria-hidden className="size-1.5 rounded-full bg-ash/60" />
        {r.label}
      </span>
    );
  }

  const tone =
    r.tone === "good" ? "text-bone" : r.tone === "mixed" ? "text-ash" : "text-flare";

  return (
    <span className={cn("type-small inline-flex items-center gap-1.5", tone, className)}>
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          r.tone === "good" ? "bg-bone" : r.tone === "mixed" ? "bg-ash" : "bg-flare",
        )}
      />
      <span className="type-timecode">{r.pct}%</span>
      <span>answered in time</span>
      <span className="text-ash">·</span>
      <span className="text-ash">
        {r.answered} of {r.decidable}
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
          // Raised off the card rather than sunk into it. At border-line-strong
          // on bg-raise these were invisible on a real screen — the one piece of
          // texture that says "vertical video" was doing no work at all.
          className={cn(
            "block w-[13px] rounded-[2px] border",
            active
              ? "border-iris/70 bg-iris/30"
              : "border-bone/30 bg-bone/[0.10]",
          )}
          style={{ height: 23 }}
        />
      ))}
      {count > shown ? (
        <span className="type-timecode pl-0.5 text-[11px] text-ash">+{count - shown}</span>
      ) : null}
    </span>
  );
}
