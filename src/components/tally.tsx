"use client";

import { useEffect, useState } from "react";
import { cn, type TallyTone } from "@/components/ui";

/**
 * The tally strip — the signature element.
 *
 * A 4px bar down the left edge of any card that represents a relationship: an
 * application, a thread, a campaign slot. In a control room the tally light is
 * how the whole room knows what is live without asking anyone, and that is
 * exactly the job here: state, legible before you read a word.
 *
 * Everything around it stays quiet. This is the one bold element in the app.
 */

const FILL: Record<TallyTone, string> = {
  neutral: "bg-slate/35",
  live: "bg-tally-live",
  standby: "bg-tally-standby",
  clear: "bg-tally-clear",
  draft: "bg-slate/25",
  over: "bg-slate/25",
};

/** Static strip: a relationship whose state is not a clock. */
export function TallyStrip({
  tone = "neutral",
  className,
}: {
  tone?: TallyTone;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-y-0 left-0 w-1",
        FILL[tone],
        className,
      )}
    />
  );
}

/**
 * Draining strip: an application inside its 48-hour response window.
 *
 * The bar is the window. It starts full at the moment the application is sent
 * and empties as the window closes, so a brand scanning a queue can see who is
 * nearly out of time without reading a single number.
 *
 * It is computed from the real `expires_at`, never animated on a loop: the fill
 * is `remaining / 48h`, recomputed each second. `initialMs` comes from the
 * server so the first client render matches the server render exactly.
 */
export function TallyCountdownStrip({
  expiresAt,
  initialMs,
  windowMs = 48 * 3600 * 1000,
  className,
}: {
  expiresAt: string;
  initialMs: number;
  windowMs?: number;
  className?: string;
}) {
  const [ms, setMs] = useState(initialMs);

  useEffect(() => {
    const target = new Date(expiresAt).getTime();
    const tick = () => setMs(target - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const remaining = Math.max(0, Math.min(ms, windowMs));
  const fill = remaining / windowMs;

  // Under six hours the tally goes live: this is no longer "pending", it is
  // "about to be lost".
  const urgent = remaining > 0 && remaining < 6 * 3600 * 1000;
  const tone: TallyTone = remaining <= 0 ? "over" : urgent ? "live" : "standby";

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-0 w-1 overflow-hidden bg-slate/15"
    >
      <span
        className={cn(
          // Top-anchored so the remaining window sits beside the title rather
          // than shrinking away into the corner of the card.
          "absolute inset-x-0 top-0 block",
          FILL[tone],
          // The value changes every second, so the transition only smooths the
          // step. Under reduced motion it is removed and the bar simply sits at
          // its correct height.
          "motion-safe:transition-[height] motion-safe:duration-1000 motion-safe:ease-linear",
          className,
        )}
        style={{ height: `${(fill * 100).toFixed(3)}%` }}
      />
    </span>
  );
}

/**
 * Card wrapper that carries a strip. Keeps the `relative` + left padding in one
 * place so every relationship card indents its content by the same amount.
 */
export function TallyCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[4px] border border-hairline bg-card pl-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
