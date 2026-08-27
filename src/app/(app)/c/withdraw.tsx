"use client";

import { useState, useTransition } from "react";
import { withdrawApplication } from "./actions";
import { Button } from "@/components/ui";

/**
 * Withdrawing is the creator's half of the same bargain the 48h window puts on
 * the brand: if you have moved on, say so and free the slot rather than leaving
 * it hanging. It asks once before doing it, because it cannot be undone —
 * re-applying to the same campaign is blocked by a unique constraint.
 */
export function WithdrawButton({ applicationId }: { applicationId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        Withdraw application
      </Button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="type-small text-slate">
        Withdraw for good? You can&apos;t apply to this campaign again.
      </span>
      <Button
        variant="danger"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const fd = new FormData();
            fd.set("application_id", applicationId);
            await withdrawApplication(fd);
          })
        }
      >
        {pending ? "Withdrawing…" : "Withdraw application"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Keep it
      </Button>
    </span>
  );
}
