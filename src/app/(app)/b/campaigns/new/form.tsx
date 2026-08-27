"use client";

import { useActionState, useState } from "react";
import { createCampaign, type CampaignFormState } from "../../actions";
import { Button, FormError, Input, Label, Select, Textarea } from "@/components/ui";
import { PLATFORM_LABEL } from "@/lib/types";
import { money } from "@/lib/format";

const NICHES = [
  "Beauty & Skincare", "Fitness", "Food & Drink", "Home & Kitchen",
  "Finance", "Outdoors", "Tech & Audio", "Travel & Local",
  "Photo & Video", "Education",
];

export function NewCampaignForm() {
  const [state, action, pending] = useActionState<CampaignFormState, FormData>(
    createCampaign,
    {},
  );
  const [budget, setBudget] = useState(400);
  const [slots, setSlots] = useState(3);

  const committed = budget * slots;

  return (
    <form action={action} className="flex flex-col gap-7">
      <section className="flex flex-col gap-5">
        <h2 className="type-micro text-slate">The brief</h2>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Campaign title</Label>
          <Input
            id="title"
            name="title"
            required
            maxLength={120}
            placeholder="Barrier repair routine, morning and night"
          />
          <p className="type-small text-slate">
            This is the line creators scan in the marketplace. Say the deliverable,
            not the campaign code.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="brief">What you want made</Label>
          <Textarea
            id="brief"
            name="brief"
            required
            minLength={20}
            rows={7}
            placeholder="What to show, what to say, what you'll send them, and what would make you reject a cut. Be specific — vague briefs get vague videos."
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="niche">Niche</Label>
          <Select id="niche" name="niche" defaultValue="">
            <option value="">No particular niche</option>
            {NICHES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </Select>
        </div>
      </section>

      <section className="flex flex-col gap-5 border-t border-hairline pt-7">
        <h2 className="type-micro text-slate">Deliverable spec</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="platform">Platform</Label>
            <Select id="platform" name="platform" defaultValue="tiktok" required>
              {(["tiktok", "reels", "shorts"] as const).map((p) => (
                <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="video_count">Videos per creator</Label>
            <Input
              id="video_count" name="video_count" type="number"
              min={1} max={20} defaultValue={2} required
              className="type-timecode"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="duration_min">Minimum length (seconds)</Label>
            <Input
              id="duration_min" name="duration_min" type="number"
              min={5} max={600} defaultValue={15} required
              className="type-timecode"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="duration_max">Maximum length (seconds)</Label>
            <Input
              id="duration_max" name="duration_max" type="number"
              min={5} max={600} defaultValue={30} required
              className="type-timecode"
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-5 border-t border-hairline pt-7">
        <h2 className="type-micro text-slate">Budget and slots</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget">Budget per creator</Label>
            <div className="flex items-center">
              <span className="type-timecode flex h-10 items-center rounded-l-[4px] border border-r-0 border-hairline bg-card px-3 text-slate">
                $
              </span>
              <Input
                id="budget" name="budget" type="number" min={1} step={1}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value) || 0)}
                required
                className="type-timecode rounded-l-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slots">Creators wanted</Label>
            <Input
              id="slots" name="slots" type="number" min={1} max={50}
              value={slots}
              onChange={(e) => setSlots(Number(e.target.value) || 0)}
              required
              className="type-timecode"
            />
          </div>
        </div>

        {/* The total is stated before publishing, not discovered afterwards. */}
        <div className="flex items-baseline justify-between rounded-[4px] border border-hairline bg-graphite px-4 py-3.5">
          <span className="type-micro text-slate">You&apos;ll commit up to</span>
          <span className="type-timecode text-[24px] font-semibold">
            {money(Math.max(0, committed) * 100)}
          </span>
        </div>
        <p className="type-small -mt-2 text-slate">
          Money is escrowed one creator at a time, as you accept them — not when
          you publish. Creators can ask for a different rate; what you accept is
          what gets escrowed.
        </p>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="deadline">Videos due by</Label>
          <Input
            id="deadline" name="deadline" type="date" required
            className="type-timecode"
          />
        </div>
      </section>

      <FormError>{state.error}</FormError>

      <div className="flex flex-col gap-2.5 border-t border-hairline pt-6 sm:flex-row">
        <Button
          type="submit" name="intent" value="publish"
          variant="primary" disabled={pending} className="sm:flex-1"
        >
          {pending ? "Publishing…" : "Publish campaign"}
        </Button>
        <Button type="submit" name="intent" value="draft" variant="secondary" disabled={pending}>
          Save as draft
        </Button>
      </div>
    </form>
  );
}
