/**
 * Every number the user sees goes through here, so a rate is never formatted
 * two different ways on two different screens.
 */

export function money(cents: number, opts: { cents?: boolean } = {}) {
  const v = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts.cents ? 2 : 0,
    maximumFractionDigits: opts.cents ? 2 : 0,
  }).format(v);
}

/** 86000 -> "86.0K", 1_700_000 -> "1.7M". The vernacular of the medium. */
export function views(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function followers(n: number) {
  return views(n);
}

/**
 * Countdown as timecode: 41:52:18. Not "2 days left".
 *
 * A video person reads timecode without thinking, and hours-minutes-seconds
 * makes urgency legible in a way a rounded day count hides — "2 days" and
 * "49 hours" feel the same; 01:12:44 does not.
 */
export function timecode(ms: number) {
  if (ms <= 0) return "00:00:00";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Absolute, unambiguous, and identical for both sides of a thread.
 *
 * Pinned to UTC deliberately. Without it the server formats in the deploy's
 * timezone and the browser formats in the viewer's, which (a) hydrates with a
 * mismatch inside client components and (b) means a brand in London and a
 * creator in São Paulo quote different times at each other for the same event.
 * One clock, named.
 */
export function stamp(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }) + " UTC";
}

/**
 * The stamp on every node of the spine: 27.08 · 14:02:11.
 *
 * Seconds are not pedantry — they are what makes "the brand approved this
 * eleven seconds after I sent it" and "four days later" read differently at a
 * glance. Fixed to UTC so the brand and the creator, in different timezones,
 * are quoting each other the same number.
 */
export function spineStamp(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)} · ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function duration(min: number, max: number) {
  return min === max ? `${min}s` : `${min}–${max}s`;
}

export function daysUntil(dateIso: string) {
  const d = new Date(dateIso).getTime() - Date.now();
  return Math.ceil(d / 86_400_000);
}

// ---------------------------------------------------------------------------
// Brand responsiveness.
//
// A naked percentage on a sample of one is exactly the kind of ambiguity this
// app exists to remove, so the rate is never shown without its denominator, and
// never shown at all below a threshold where it would be noise.
// ---------------------------------------------------------------------------

export const RESPONSIVENESS_MIN_SAMPLE = 3;

export type Responsiveness =
  | { kind: "new"; label: string }
  | { kind: "rate"; pct: number; answered: number; decidable: number; label: string; tone: "good" | "mixed" | "poor" };

export function responsiveness(
  answered: number | null | undefined,
  decidable: number | null | undefined,
): Responsiveness {
  const a = answered ?? 0;
  const d = decidable ?? 0;

  if (d < RESPONSIVENESS_MIN_SAMPLE) {
    return { kind: "new", label: "New brand · no response history" };
  }

  const pct = Math.round((a / d) * 100);
  const tone = pct >= 80 ? "good" : pct >= 50 ? "mixed" : "poor";
  return {
    kind: "rate",
    pct,
    answered: a,
    decidable: d,
    tone,
    label: `${pct}% answered in time · ${a} of ${d}`,
  };
}
