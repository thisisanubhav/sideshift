import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBrand } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { money, duration, shortDate } from "@/lib/format";
import { PLATFORM_LABEL } from "@/lib/types";
import { SlotRail, VerticalCount } from "@/components/rail";
import { Button, Card, Chip, EmptyState } from "@/components/ui";
import { publishCampaign } from "../../actions";
import { ApplicantCard, type Applicant } from "./applicant";
import type { CampaignStatus, Platform } from "@/lib/types";

type CampaignDetail = {
  id: string;
  title: string;
  brief: string;
  status: CampaignStatus;
  platform: Platform;
  video_count: number;
  duration_min_seconds: number;
  duration_max_seconds: number;
  budget_cents_per_creator: number;
  slots_total: number;
  slots_filled: number;
  deadline: string;
};

export default async function BrandCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const brand = await requireBrand();
  const { id } = await params;
  const supabase = await createClient();

  await supabase.rpc("expire_stale_applications");

  const { data: raw } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("brand_id", brand.brandId)
    .maybeSingle();

  if (!raw) notFound();
  const campaign = raw as CampaignDetail;

  const [{ data: apps }, { data: threads }] = await Promise.all([
    supabase
      .from("applications")
      .select(
        `id, status, pitch, rate_cents, expires_at, created_at, responded_at,
         decline_reason, decline_note,
         creators!inner ( niche, city, follower_count, avg_views, platforms, bio,
                          profiles!inner ( handle, display_name ) )`,
      )
      .eq("campaign_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("threads").select("id, application_id").eq("campaign_id", id),
  ]);

  const threadFor = new Map((threads ?? []).map((t) => [t.application_id, t.id]));

  const applicants: Applicant[] = (apps ?? []).map((a) => {
    const cr = a.creators as unknown as {
      niche: string | null; city: string | null; follower_count: number;
      avg_views: number; platforms: Applicant["creator"]["platforms"];
      bio: string | null; profiles: { handle: string; display_name: string };
    };
    return {
      id: a.id,
      status: a.status,
      pitch: a.pitch,
      rate_cents: a.rate_cents,
      expires_at: a.expires_at,
      created_at: a.created_at,
      responded_at: a.responded_at,
      decline_reason: a.decline_reason,
      decline_note: a.decline_note,
      windowMs: new Date(a.expires_at).getTime() - Date.now(),
      thread_id: threadFor.get(a.id) ?? null,
      creator: {
        handle: cr.profiles.handle,
        display_name: cr.profiles.display_name,
        niche: cr.niche,
        city: cr.city,
        follower_count: cr.follower_count,
        avg_views: cr.avg_views,
        platforms: cr.platforms ?? [],
        bio: cr.bio,
      },
    };
  });

  const waiting = applicants.filter((a) => a.status === "pending");
  const settled = applicants.filter((a) => a.status !== "pending");
  const slotsLeft = campaign.slots_total - campaign.slots_filled;

  return (
    <div className="flex flex-col gap-8">
      <Link href="/b" className="type-small inline-flex min-h-11 w-fit items-center text-slate hover:text-graphite">
        ← Your campaigns
      </Link>

      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex items-center gap-3">
              <VerticalCount count={campaign.video_count} />
              <span className="type-micro text-slate">
                <span className="type-timecode">{campaign.video_count}</span>× {PLATFORM_LABEL[campaign.platform]} ·{" "}
                {duration(campaign.duration_min_seconds, campaign.duration_max_seconds)}
              </span>
            </div>
            <h1 className="type-display-xl text-balance">{campaign.title}</h1>
          </div>
          <Chip
            tone={
              campaign.status === "open"
                ? "neutral"
                : campaign.status === "draft"
                  ? "draft"
                  : "over"
            }
          >
            {campaign.status === "open" ? "Live" : campaign.status === "draft" ? "Draft" : "Closed"}
          </Chip>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="type-timecode text-[24px]">
            {money(campaign.budget_cents_per_creator)}
            <span className="type-micro pl-1.5 text-slate">per creator</span>
          </span>
          <SlotRail filled={campaign.slots_filled} total={campaign.slots_total} />
          <span className="type-small text-slate">due {shortDate(campaign.deadline)}</span>
        </div>

        {campaign.status === "draft" ? (
          <form action={publishCampaign} className="flex items-center gap-3">
            <input type="hidden" name="campaign_id" value={campaign.id} />
            <Button type="submit" variant="primary">
              Publish to the marketplace
            </Button>
            <span className="type-small text-slate">
              Creators can&apos;t see this yet.
            </span>
          </form>
        ) : null}
      </header>

      <Card className="flex flex-col gap-2 p-5">
        <h2 className="type-micro text-slate">The brief</h2>
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
          {campaign.brief}
        </p>
      </Card>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="type-micro text-slate">
            Waiting on you{waiting.length ? ` · ${waiting.length}` : ""}
          </h2>
          {slotsLeft > 0 ? (
            <span className="type-small text-slate">
              <span className="type-timecode">{slotsLeft}</span> slot{slotsLeft === 1 ? "" : "s"} still open
            </span>
          ) : (
            <span className="type-small text-slate">All slots filled</span>
          )}
        </div>

        {waiting.length === 0 ? (
          <EmptyState
            title={
              campaign.status === "draft"
                ? "Nobody can apply to a draft"
                : "No applications waiting"
            }
            body={
              campaign.status === "draft"
                ? "Publish the campaign and it appears in the marketplace immediately."
                : "You're clear. Every application to this campaign has an answer, which is exactly what keeps your response rate up."
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {waiting.map((a) => (
              <ApplicantCard
                key={a.id}
                applicant={a}
                campaignId={campaign.id}
                slotsLeft={slotsLeft}
              />
            ))}
          </div>
        )}
      </section>

      {settled.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="type-micro text-slate">Decided · {settled.length}</h2>
          <div className="flex flex-col gap-3">
            {settled.map((a) => (
              <ApplicantCard
                key={a.id}
                applicant={a}
                campaignId={campaign.id}
                slotsLeft={slotsLeft}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
