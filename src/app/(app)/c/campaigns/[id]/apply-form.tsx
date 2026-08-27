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

  /**
   * Default to the POSTED budget, not the creator's usual rate.
   *
   * It used to default to the creator's base rate, which on a $275 brief
   * pre-filled 450 — 64% over — and "Rate above our budget" is a decline reason
   * this app ships. The form was quietly arming its own user with the second
   * most likely rejection. Asking for more is fine; it should be a decision,
   * not a default.
   */
  const posted = Math.round(budgetCents / 100);
  const usual = baseRateCents ? Math.round(baseRateCents / 100) : 0;
  const [rate, setRate] = useState(posted);
  const over = rate - posted;

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
        <p className="type-small flex items-baseline justify-between gap-3 text-ash">
          <span>Say what you&apos;d actually shoot. Brands skim these.</span>
          <span className="type-timecode shrink-0">{pitch.length}/1200</span>
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
            value={rate}
            onChange={(e) => setRate(Number(e.target.value) || 0)}
            className="type-timecode rounded-l-none"
          />
        </div>

        <p className="type-small text-ash">
          The brand posted {money(budgetCents)} per creator. What you name here is
          what gets escrowed if they accept.
        </p>

        {/* Asking above budget is allowed and sometimes right — but the creator
            should know they're doing it, and what it costs. */}
        {over > 0 ? (
          <p className="type-small text-flare">
            {money(over * 100)} above the posted budget. Brands can decline for
            this — and if they do, they have to tell you.
          </p>
        ) : null}

        {usual > 0 && usual !== rate ? (
          <button
            type="button"
            onClick={() => setRate(usual)}
            className="type-small w-fit text-bone underline underline-offset-4 hover:text-ash"
          >
            Your usual rate is {money(baseRateCents)} — ask for that instead
          </button>
        ) : null}
      </div>

      <FormError>{state.error}</FormError>

      <p className="type-small rounded-[8px] border border-line-strong bg-pitch px-3 py-2 text-ash">
        Once you send this, the brand has <span className="text-bone">48 hours</span>{" "}
        to accept or decline. If they let it lapse it expires on its own, the slot
        frees up, and it counts against their public response rate.
      </p>

      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Sending your application…" : "Send application"}
      </Button>
    </form>
  );
}
