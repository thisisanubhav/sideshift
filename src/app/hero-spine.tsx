import { money } from "@/lib/format";

/**
 * The hero image is the product's own signature element, drawn with real
 * grammar: one vertical line carrying an accept, a message, a delivered 9:16
 * cut and a released payment, each stamped with a timecode.
 *
 * The old hero was a headline and two buttons. This one cannot be lifted into
 * another product, because it *is* the thing being sold — the argument that
 * everything for one creator lives on a single line.
 */
const NODES = [
  {
    solid: true,
    label: "Accepted",
    stamp: "23.08 · 13:25:08",
    body: (
      <p className="type-small text-slate">
        <span className="type-timecode text-graphite">{money(45000)}</span> escrowed.
        The brand can&apos;t spend it and the creator can&apos;t withdraw it.
      </p>
    ),
  },
  {
    solid: false,
    message: true,
    label: "@sunlit",
    stamp: "23.08 · 13:36:08",
    body: (
      <p className="max-w-[38ch] rounded-[4px] border border-hairline px-3.5 py-2.5 text-[15px] leading-relaxed">
        Shot list is on the way — ask here rather than email so it stays in one
        place.
      </p>
    ),
  },
  {
    solid: false,
    label: "Deliverable v1 submitted",
    stamp: "28.08 · 09:12:44",
    body: (
      <div className="flex items-center gap-3 rounded-[4px] border border-hairline bg-card p-3">
        <span
          aria-hidden
          className="flex h-14 w-[31.5px] shrink-0 items-center justify-center rounded-[4px] border border-graphite/30 bg-graphite"
        >
          <span className="type-timecode text-[11px] text-slate">9:16</span>
        </span>
        <span className="type-small text-slate">
          sunlit-am-routine.mp4 · 00:24
        </span>
      </div>
    ),
  },
  {
    solid: true,
    label: "Payment released",
    stamp: "28.08 · 14:51:02",
    body: (
      <p className="type-timecode text-[24px] text-graphite">
        {money(45000, { cents: true })}
      </p>
    ),
  },
];

export function HeroSpine() {
  return (
    <div
      className="relative overflow-hidden rounded-[4px] border border-hairline bg-card p-5 sm:p-6"
      role="img"
      aria-label="One thread: accepted and escrowed, a message from the brand, a 9:16 deliverable submitted, then payment released — all on one timeline."
    >
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-graphite/10" />
      <ol aria-hidden className="relative flex flex-col gap-5">
        <span className="absolute top-2 bottom-2 left-[3.5px] w-px bg-hairline" />
        {NODES.map((n, i) => (
          <li key={i} className="relative pl-6">
            <span
              className={
                "absolute top-1.5 left-0 block size-2 rounded-[4px] " +
                (n.solid
                  ? "bg-graphite"
                  : n.message
                    ? "border border-hairline bg-graphite"
                    : "border border-bone/60 bg-graphite")
              }
            />
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span
                  className={
                    n.message
                      ? "type-timecode text-[13px] text-graphite"
                      : "type-micro"
                  }
                >
                  {n.label}
                </span>
                <span className="type-timecode text-[13px] text-slate">
                  {n.stamp}
                </span>
              </div>
              {n.body}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
