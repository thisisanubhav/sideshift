/**
 * The wordmark carries the 9:16 rectangle — the app's native unit — as the
 * counter of the S. It is the only place the logo mark appears.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        aria-hidden
        className="flex h-5 w-[11.25px] items-end overflow-hidden rounded-[2px] bg-bone"
      >
        <span className="h-2 w-full bg-flare" />
      </span>
      <span className="type-display-l !text-[19px] tracking-[-0.02em]">
        SideShift
      </span>
    </span>
  );
}
