"use client";

import { useEffect, useState } from "react";
import { cn, type TallyTone } from "@/components/ui";

/**
 * A confirmation that keeps the button's own wording.
 *
 * "Approve and release $450" produces "Payment released". "Decline with reason"
 * produces "Declined, and @handle was told why". The action never changes its
 * name between the click and the confirmation, so nobody has to work out
 * whether the thing they pressed is the thing that happened.
 *
 * Deliberately tiny: no provider, no queue, no dependency. It renders when an
 * action's returned state carries a message and dismisses itself.
 */
export function Toast({
  message,
  tone = "clear",
}: {
  message?: string;
  tone?: TallyTone;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!message) return;
    setShown(true);
    const id = setTimeout(() => setShown(false), 6000);
    return () => clearTimeout(id);
  }, [message]);

  if (!message || !shown) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-50 flex justify-center sm:inset-x-auto sm:right-6 sm:bottom-6"
    >
      <div className="relative flex items-center gap-3 overflow-hidden rounded-[4px] border border-hairline bg-card py-3 pr-4 pl-5">
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-0 left-0 w-1",
            tone === "clear" ? "bg-tally-clear" : "bg-tally-standby",
          )}
        />
        <p className="text-[15px] text-graphite">{message}</p>
      </div>
    </div>
  );
}
