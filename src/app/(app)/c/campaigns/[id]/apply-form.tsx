"use client";

import { useActionState, useState } from "react";
import { applyToCampaign, type ApplyState } from "../../actions";
import { Button, FormError, Input, Label, Textarea } from "@/components/ui";
import { money } from "@/lib/format";

export function ApplyForm({
  campaignId,
  budgetCents,
  baseRateCents,
}: {
  campaignId: string;
  budgetCents: number;
  baseRateCents: number;
}) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(
    applyToCampaign,
    {},
  );
  const [pitch, setPitch] = useState("");
  const suggested = Math.round((baseRateCents || budgetCents) / 100);

  if (state.ok) {
    return (
      <div className="flex flex-col gap-2 rounded-[10px] border border-bone/30 bg-raise-2 p-5">
        <p className="type-title">Application sent</p>
        <p className="type-small text-ash">
          The clock starts now. This brand has 48 hours to accept or decline —
          if they let it lapse, the application expires and the slot frees up.
          Track it on your applications page.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="campaign_id" value={campaignId} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pitch">Your pitch</Label>
        <Textarea
          id="pitch"
          name="pitch"
          required
          minLength={20}
          maxLength={1200}
          rows={5}
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
          placeholder="What you'd film, where you'd film it, and why this brief fits what you already make."
        />
        <p className="type-small flex justify-between text-ash">
          <span>Say what you&apos;d actually shoot. Brands skim these.</span>
          <span className="type-timecode">{pitch.length}/1200</span>
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rate">Your rate for this campaign</Label>
        <div className="flex items-center">
          <span className="type-timecode flex h-10 items-center rounded-l-[8px] border border-r-0 border-line-strong bg-raise px-3 text-ash">
            $
          </span>
          <Input
            id="rate"
            name="rate"
            type="number"
            min={1}
            step={1}
            required
            defaultValue={suggested}
            className="type-timecode rounded-l-none"
          />
        </div>
        <p className="type-small text-ash">
          The brand posted {money(budgetCents)} per creator. You can ask for more
          or less — what you name here is what gets escrowed if they accept.
        </p>
      </div>

      <FormError>{state.error}</FormError>

      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Sending your application…" : "Send application"}
      </Button>
    </form>
  );
}
