import { money, spineStamp } from "@/lib/format";
import { cn } from "@/components/ui";
import type { SpineEvent } from "@/lib/thread";

/**
 * The Spine.
 *
 * One vertical line. Messages, state changes and money events hang off it in a
 * single chronological order, each stamped with a UTC timecode. There is no
 * separate activity tab, because splitting the money out of the conversation is
 * the failure this product exists to fix.
 *
 * Boldness lives here. Everything around it is flat and quiet.
 */
export function Spine({ events }: { events: SpineEvent[] }) {
  return (
    <ol className="relative flex flex-col gap-5 py-1">
      {/* the line itself */}
      <span
        aria-hidden
        className="absolute top-2 bottom-2 left-[3.5px] w-px bg-hairline"
      />
      {events.map((e, i) => (
        <li key={i} className="relative pl-6">
          <Node event={e} />
          {renderEvent(e)}
        </li>
      ))}
    </ol>
  );
}

function Node({ event }: { event: SpineEvent }) {
  const solid =
    event.kind === "accepted" ||
    event.kind === "released" ||
    (event.kind === "review" && event.approved);

  return (
    <span
      aria-hidden
      className={cn(
        "absolute top-1.5 left-0 block size-2 rounded-[4px]",
        solid
          ? "bg-graphite"
          : event.kind === "message"
            ? "border border-hairline bg-graphite"
            : "border border-bone/60 bg-graphite",
      )}
    />
  );
}

function Stamp({ at }: { at: string }) {
  return <span className="type-timecode text-[13px] text-slate">{spineStamp(at)}</span>;
}

function renderEvent(e: SpineEvent) {
  switch (e.kind) {
    case "accepted":
      return (
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="type-micro">Accepted</span>
            <Stamp at={e.at} />
          </div>
          <p className="type-small text-slate">
            <span className="type-timecode text-graphite">{money(e.amountCents)}</span>{" "}
            escrowed. The brand can&apos;t spend it and the creator can&apos;t
            withdraw it until the work is approved.
          </p>
        </div>
      );

    case "message":
      return (
        <div
          className={cn(
            "flex flex-col gap-1.5",
            e.mine && "items-end",
          )}
        >
          <div className="flex w-full flex-wrap items-baseline justify-between gap-2">
            <span className="type-timecode text-[13px] text-graphite">@{e.handle}</span>
            <Stamp at={e.at} />
          </div>
          <p
            className={cn(
              "max-w-[46ch] rounded-[4px] px-3.5 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap",
              e.mine
                ? "bg-graphite text-graphite"
                : "border border-hairline bg-transparent text-graphite",
            )}
          >
            {e.body}
          </p>
        </div>
      );

    case "deliverable":
      return (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="type-micro">Deliverable v{e.version} submitted</span>
            <Stamp at={e.at} />
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-[4px] border border-hairline bg-card p-3">
            {/* the 9:16 frame, drawn at the aspect ratio of the thing itself */}
            <span
              aria-hidden
              className="flex h-14 w-[31.5px] shrink-0 items-center justify-center rounded-[4px] border border-hairline bg-graphite"
            >
              <span className="type-timecode text-[11px] text-slate">9:16</span>
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              {e.fileUrl ? (
                <a
                  href={e.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="type-small text-graphite underline underline-offset-4"
                >
                  Open the uploaded file
                </a>
              ) : null}
              {e.deliveryUrl ? (
                <a
                  href={e.deliveryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="type-small break-all text-graphite underline underline-offset-4"
                >
                  {e.deliveryUrl}
                </a>
              ) : null}
              {e.note ? <p className="type-small text-slate">{e.note}</p> : null}
            </div>
          </div>
        </div>
      );

    case "review":
      return (
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            {/* A change request is a state, not a clock. Shape carries it: the
                node is hollow and the label is plain. */}
            <span className="type-micro">
              {e.approved
                ? `Deliverable v${e.version} approved`
                : `Changes requested on v${e.version}`}
            </span>
            <Stamp at={e.at} />
          </div>
          {e.note ? (
            <p className="type-small max-w-[52ch] text-slate">{e.note}</p>
          ) : null}
        </div>
      );

    case "released":
      return (
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="type-micro">Payment released</span>
            <Stamp at={e.at} />
          </div>
          <p className="type-timecode text-[18px] text-graphite">
            {money(e.amountCents, { cents: true })}
          </p>
        </div>
      );
  }
}
