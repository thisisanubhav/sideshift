import * as React from "react";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-[8px] font-semibold " +
  "transition-colors disabled:cursor-not-allowed disabled:opacity-40 " +
  "whitespace-nowrap select-none";

const BUTTON_VARIANT = {
  // Money and commitment. The highest-contrast thing on any screen.
  primary: "bg-bone text-pitch hover:bg-white",
  secondary:
    "bg-raise-2 text-bone border border-line-strong hover:border-bone/40 hover:bg-raise-2/70",
  ghost: "text-ash hover:text-bone hover:bg-raise-2",
  danger: "bg-transparent text-flare border border-flare/40 hover:bg-flare/10",
} as const;

const BUTTON_SIZE = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-[14px]",
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

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[10px] border border-line bg-raise",
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("type-micro block text-ash", className)} {...props} />
  );
}

const FIELD_BASE =
  "w-full rounded-[8px] border border-line-strong bg-pitch px-3 text-bone " +
  "placeholder:text-ash/60 transition-colors hover:border-bone/25 " +
  "focus:border-iris focus:outline-none focus-visible:outline-none " +
  "disabled:opacity-50";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD_BASE, "h-10", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(FIELD_BASE, "min-h-24 py-2.5 leading-relaxed", className)} {...props} />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(FIELD_BASE, "h-10 appearance-none pr-8 cursor-pointer", className)}
      {...props}
    />
  );
}

/**
 * Status differentiates by shape and fill, not by hue — which is how a palette
 * of six colours covers nine statuses without a legend.
 *   outline  = still open, still moving
 *   solid    = terminal and good
 *   muted    = terminal and over
 */
export function Chip({
  tone = "outline",
  className,
  children,
}: {
  tone?: "outline" | "solid" | "muted" | "time" | "identity";
  className?: string;
  children: React.ReactNode;
}) {
  const tones = {
    outline: "border border-bone/45 text-bone",
    solid: "bg-bone text-pitch border border-bone",
    muted: "border border-line-strong text-ash line-through decoration-ash/50",
    time: "border border-flare/50 text-flare",
    identity: "border border-iris/50 text-iris",
  } as const;

  return (
    <span
      className={cn(
        "type-micro inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------

export function FormError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="type-small flex gap-2 rounded-[8px] border border-flare/40 bg-flare/10 px-3 py-2 text-flare"
    >
      {children}
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
    <div className="flex flex-col items-center gap-3 rounded-[10px] border border-dashed border-line-strong px-6 py-14 text-center">
      <p className="type-title max-w-sm text-balance">{title}</p>
      <p className="type-small max-w-md text-balance text-ash">{body}</p>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
