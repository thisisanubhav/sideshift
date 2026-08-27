import * as React from "react";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Button
//
// Three styles. Primary is solid graphite — the one committing action on a
// screen. Secondary is a hairline outline on white. Destructive is reserved for
// actions that genuinely destroy something (withdrawing an application);
// declining is NOT destructive — it is the honest outcome this product wants
// brands to choose, so it uses secondary.
// ---------------------------------------------------------------------------

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

// Not `transition-colors`: that list includes outline-color, so the focus ring
// would interpolate up from the button's own colour instead of being at full
// contrast the instant focus lands.
const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-[4px] font-medium " +
  "transition-[background-color,border-color,color] duration-150 " +
  "disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap select-none";

const BUTTON_VARIANT = {
  primary: "bg-graphite text-card hover:bg-graphite/90",
  secondary: "bg-card text-graphite border border-hairline hover:border-graphite/60",
  ghost: "bg-transparent text-slate hover:bg-card hover:text-graphite",
  danger: "bg-card text-tally-live border border-tally-live/40 hover:border-tally-live",
} as const;

const BUTTON_SIZE = {
  sm: "h-9 px-3 text-[13px]",
  md: "h-11 px-4 text-[15px]",
} as const;

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(BUTTON_BASE, BUTTON_VARIANT[variant], BUTTON_SIZE[size], className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------

/** White surface, one hairline, 4px. No shadow anywhere in the app. */
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-[4px] border border-hairline bg-card", className)}
      {...props}
    />
  );
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("type-micro block text-slate", className)} {...props} />;
}

// Hairline border on white. The global :focus-visible supplies the 2px graphite
// ring, so fields never suppress their own focus state.
const FIELD_BASE =
  "w-full rounded-[4px] border border-hairline bg-card px-3 text-graphite " +
  "placeholder:text-slate/70 transition-[border-color] duration-150 " +
  "hover:border-slate/60 focus:border-graphite disabled:opacity-50";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD_BASE, "h-11", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(FIELD_BASE, "min-h-24 py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(FIELD_BASE, "h-11 cursor-pointer appearance-none pr-8", className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Badge — a tally state.
//
// A broadcast tally tells the room what is live right now. Colour here is
// carrying real state, which is the only thing tally colours are permitted to
// do. neutral / draft / over carry no state colour at all, because they are not
// tally states — they are the absence of one.
// ---------------------------------------------------------------------------

export type TallyTone =
  | "neutral" // nothing to report
  | "live" // in production, urgent, running out
  | "standby" // pending, awaiting a response
  | "clear" // approved, released, done
  | "draft" // not published yet
  | "over"; // expired, declined, withdrawn

const TONES: Record<TallyTone, { chip: string; dot: string }> = {
  neutral: { chip: "border-hairline text-graphite", dot: "bg-slate" },
  live: { chip: "border-tally-live/45 text-tally-live", dot: "bg-tally-live" },
  standby: { chip: "border-tally-standby/50 text-tally-standby", dot: "bg-tally-standby" },
  clear: { chip: "border-tally-clear/45 text-tally-clear", dot: "bg-tally-clear" },
  draft: { chip: "border-dashed border-hairline text-slate", dot: "bg-slate/50" },
  over: {
    chip: "border-hairline text-slate line-through decoration-slate/50",
    dot: "bg-slate/40",
  },
};

export function Chip({
  tone = "neutral",
  dot = false,
  className,
  children,
}: {
  tone?: TallyTone;
  /** Show the tally light itself, where the chip sits away from other context. */
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const t = TONES[tone];
  return (
    <span
      className={cn(
        "type-micro inline-flex items-center gap-1.5 rounded-[4px] border bg-card px-2 py-1",
        t.chip,
        className,
      )}
    >
      {dot ? <span aria-hidden className={cn("size-1.5 rounded-[4px]", t.dot)} /> : null}
      {children}
    </span>
  );
}

/** The bare tally light, for rows where a full chip would be too loud. */
export function TallyDot({
  tone = "neutral",
  className,
}: {
  tone?: TallyTone;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("block size-2 shrink-0 rounded-[4px]", TONES[tone].dot, className)}
    />
  );
}

// ---------------------------------------------------------------------------

export function FormError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="type-small flex gap-2 rounded-[4px] border border-tally-live/40 bg-card px-3 py-2 text-graphite"
    >
      <span aria-hidden className="text-tally-live">
        !
      </span>
      <span>{children}</span>
    </p>
  );
}

/** Every screen ships one of these. None of them is a blank div. */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[4px] border border-dashed border-hairline bg-card px-6 py-14 text-center">
      <p className="type-title max-w-sm text-balance">{title}</p>
      <p className="type-small max-w-md text-balance text-slate">{body}</p>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
