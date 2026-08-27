"use client";

import { useEffect, useState } from "react";
import { timecode } from "@/lib/format";
import { cn } from "@/components/ui";

/**
 * The live response window.
 *
 * `initialMs` is computed on the server so the first client render matches it
 * exactly — no hydration mismatch, and no blank frame that shifts the layout
 * when the real value arrives. Tabular figures keep the width fixed as it ticks.
 *
 * Under prefers-reduced-motion this still counts. A number changing once a
 * second is information, not animation; what reduced motion suppresses is the
 * pulse on the urgent state.
 */
export function Countdown({
  expiresAt,
  initialMs,
  className,
  showLabel = true,
}: {
  expiresAt: string;
  initialMs: number;
  className?: string;
  showLabel?: boolean;
}) {
  const [ms, setMs] = useState(initialMs);

  useEffect(() => {
    const target = new Date(expiresAt).getTime();
    const tick = () => setMs(target - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const expired = ms <= 0;
  // Under four hours is the point where a creator should be told to chase it.
  const urgent = !expired && ms < 4 * 3600 * 1000;

  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      {showLabel ? (
        <span className="type-micro text-ash">
          {expired ? "Window closed" : "Brand must reply in"}
        </span>
      ) : null}

      {/*
        The ticking text is hidden from assistive tech. It changes every second,
        so announcing it live means a screen reader reads a timecode once per
        second, forever — and several cards can be urgent at once on the brand's
        queue. The information is not lost: the coarse sibling below carries it.
      */}
      <span
        aria-hidden
        className={cn(
          "type-timecode tabular-nums",
          expired ? "text-ash line-through" : urgent ? "text-flare" : "text-bone",
          urgent && "motion-safe:animate-pulse",
        )}
      >
        {timecode(ms)}
      </span>

      <span className="sr-only" aria-live="polite">
        {announce(ms)}
      </span>
    </span>
  );
}

/**
 * The same fact at a cadence a person can stand.
 *
 * Bucketed so the string only changes at meaningful thresholds — a screen
 * reader announces "under 30 minutes left" once, not 1,800 times.
 */
function announce(ms: number) {
  if (ms <= 0) return "Response window closed.";
  const mins = Math.floor(ms / 60000);
  if (mins < 15) return "Under 15 minutes left for the brand to reply.";
  if (mins < 30) return "Under 30 minutes left for the brand to reply.";
  if (mins < 60) return "Under an hour left for the brand to reply.";
  const hours = Math.floor(mins / 60);
  if (hours < 4) return `About ${hours} hours left for the brand to reply.`;
  if (hours < 24) return `About ${hours} hours left for the brand to reply.`;
  return `About ${Math.floor(hours / 24)} days left for the brand to reply.`;
}
