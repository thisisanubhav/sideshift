import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCreator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCampaign } from "@/lib/queries";
import { money, duration, shortDate } from "@/lib/format";
import { PLATFORM_LABEL, DECLINE_REASON_LABEL, APPLICATION_STATUS_LABEL } from "@/lib/types";
import type { ApplicationStatus, DeclineReason } from "@/lib/types";
import { ResponsivenessBadge, SlotRail, VerticalCount } from "@/components/rail";
import { Countdown } from "@/components/countdown";
import { Button, Card, Chip } from "@/components/ui";
import { ApplyForm } from "./apply-form";

export default async function CampaignDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const creator = await requireCreator();
  const { id } = await params;

  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const supabase = await createClient();
  const [{ data: application }, { data: me }] = await Promise.all([
    supabase
      .from("applications")
      .select("id, status, rate_cents, expires_at, decline_reason, decline_note, created_at")
      .eq("campaign_id", id)
      .eq("creator_id", creator.creatorId)
      .maybeSingle(),
    supabase.from("creators").select("base_rate_cents").eq("id", creator.creatorId).single(),
  ]);

  const full = campaign.slots_filled >= campaign.slots_total;

  return (
    <div className="flex flex-col gap-8">
      <Link href="/c/browse" className="type-small w-fit text-ash hover:text-bone">
        ← All campaigns
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-7">
          <header className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <VerticalCount count={campaign.video_count} />
              <span className="type-micro text-ash">
                {campaign.video_count}× {PLATFORM_LABEL[campaign.platform]}
              </span>
            </div>
            <h1 className="type-display-xl text-balance">{campaign.title}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="type-timecode text-bone">@{campaign.brand.handle}</span>
              <span className="text-ash">·</span>
              <span className="text-ash">{campaign.brand.name}</span>
              {campaign.niche ? (
                <Chip tone="identity">{campaign.niche}</Chip>
              ) : null}
            </div>
            <ResponsivenessBadge
              answered={campaign.answered_in_window}
              decidable={campaign.decidable}
            />
          </header>

          <section className="flex flex-col gap-3">
            <h2 className="type-micro text-ash">The brief</h2>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
              {campaign.brief}
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="type-micro text-ash">Deliverable spec</h2>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-4">
              <Spec label="Videos" value={String(campaign.video_count)} />
              <Spec label="Platform" value={PLATFORM_LABEL[campaign.platform]} />
              <Spec
                label="Length"
                value={duration(campaign.duration_min_seconds, campaign.duration_max_seconds)}
              />
              <Spec label="Due" value={shortDate(campaign.deadline)} />
            </dl>
          </section>
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <Card className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-0.5">
              <span className="type-timecode text-[32px] leading-none font-semibold">
                {money(campaign.budget_cents_per_creator)}
              </span>
              <span className="type-micro text-ash">Posted budget per creator</span>
            </div>
            <SlotRail filled={campaign.slots_filled} total={campaign.slots_total} />
          </Card>

          <Card className="flex flex-col gap-4 p-5">
            {application ? (
              <ApplicationState application={application} />
            ) : full ? (
              <div className="flex flex-col gap-2">
                <p className="type-title">Every slot is filled</p>
                <p className="type-small text-ash">
                  This campaign took its last creator. Browse what&apos;s still open.
                </p>
                <Link href="/c/browse" className="pt-1">
                  <Button variant="secondary" className="w-full">
                    Back to open campaigns
                  </Button>
                </Link>
              </div>
            ) : (
              <ApplyForm
                campaignId={campaign.id}
                budgetCents={campaign.budget_cents_per_creator}
                baseRateCents={me?.base_rate_cents ?? 0}
              />
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 bg-raise p-3.5">
      <dt className="type-micro text-ash">{label}</dt>
      <dd className="type-timecode text-[15px]">{value}</dd>
    </div>
  );
}

function ApplicationState({
  application: a,
}: {
  application: {
    id: string;
    status: ApplicationStatus;
    rate_cents: number;
    expires_at: string;
    decline_reason: DeclineReason | null;
    decline_note: string | null;
  };
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="type-micro text-ash">Your application</span>
        <Chip
          tone={
            a.status === "accepted"
              ? "solid"
              : a.status === "pending"
                ? "outline"
                : "muted"
          }
        >
          {APPLICATION_STATUS_LABEL[a.status]}
        </Chip>
      </div>

      <p className="type-timecode text-[22px]">{money(a.rate_cents)}</p>

      {a.status === "pending" ? (
        <Countdown
          expiresAt={a.expires_at}
          initialMs={new Date(a.expires_at).getTime() - Date.now()}
        />
      ) : null}

      {/* No silent rejections: the reason is shown to the creator, always. */}
      {a.status === "declined" && a.decline_reason ? (
        <div className="flex flex-col gap-1.5 rounded-[8px] border border-line-strong bg-pitch p-3">
          <span className="type-micro text-ash">Why it was declined</span>
          <p className="type-small text-bone">
            {DECLINE_REASON_LABEL[a.decline_reason]}
          </p>
          {a.decline_note ? (
            <p className="type-small text-ash">“{a.decline_note}”</p>
          ) : null}
        </div>
      ) : null}

      {a.status === "expired" ? (
        <p className="type-small text-ash">
          This brand let the 48-hour window lapse without answering. The slot was
          freed and nothing was held against you.
        </p>
      ) : null}
    </div>
  );
}
