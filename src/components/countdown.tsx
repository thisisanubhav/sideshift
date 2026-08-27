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
    <span
      className={cn("inline-flex items-baseline gap-2", className)}
      aria-live={urgent ? "polite" : "off"}
    >
      {showLabel ? (
        <span className="type-micro text-ash">
          {expired ? "Window closed" : "Brand must reply in"}
        </span>
      ) : null}
      <span
        className={cn(
          "type-timecode tabular-nums",
          expired ? "text-ash line-through" : urgent ? "text-flare" : "text-bone",
          urgent && "motion-safe:animate-pulse",
        )}
      >
        {timecode(ms)}
      </span>
    </span>
  );
}
