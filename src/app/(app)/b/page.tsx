import Link from "next/link";
import { requireBrand } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { money, shortDate, timecode, views } from "@/lib/format";
import {
  DELIVERABLE_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  PLATFORM_SHORT,
  type CampaignStatus,
  type DeliverableStatus,
  type PaymentStatus,
  type Platform,
} from "@/lib/types";

type RosterRow = {
  id: string;
  campaigns: { title: string } | null;
  creators: { avg_views: number; profiles: { handle: string } | null } | null;
  payments: { amount_cents: number; status: PaymentStatus }[] | null;
  deliverables: { version: number; status: DeliverableStatus }[] | null;
};
import { ResponsivenessBadge, SlotRail, VerticalCount } from "@/components/rail";
import { Button, Card, Chip, EmptyState } from "@/components/ui";

export const metadata = { title: "Your campaigns — SideShift" };

type CampaignRow = {
  id: string;
  title: string;
  status: CampaignStatus;
  platform: Platform;
  video_count: number;
  budget_cents_per_creator: number;
  slots_total: number;
  slots_filled: number;
  deadline: string;
  created_at: string;
};

export default async function BrandDashboard() {
  const brand = await requireBrand();
  const supabase = await createClient();

  await supabase.rpc("expire_stale_applications");

  const [{ data: campaigns }, { data: pending }, { data: payments }, { data: rate }] =
    await Promise.all([
      supabase
        .from("campaigns")
        .select(
          "id, title, status, platform, video_count, budget_cents_per_creator, slots_total, slots_filled, deadline, created_at",
        )
        .eq("brand_id", brand.brandId)
        .order("created_at", { ascending: false }),
      supabase
        .from("applications")
        .select("id, expires_at, campaign_id, campaigns!inner(brand_id)")
        .eq("status", "pending")
        .eq("campaigns.brand_id", brand.brandId)
        .order("expires_at", { ascending: true }),
      supabase
        .from("payments")
        .select("amount_cents, status, threads!inner(brand_id)")
        .eq("threads.brand_id", brand.brandId),
      supabase
        .from("brand_responsiveness")
        .select("answered_in_window, decidable")
        .eq("brand_id", brand.brandId)
        .maybeSingle(),
    ]);

  const { data: roster } = await supabase
    .from("threads")
    .select(
      `id, status,
       campaigns ( title ),
       creators ( avg_views, profiles ( handle ) ),
       payments ( amount_cents, status ),
       deliverables ( version, status )`,
    )
    .eq("brand_id", brand.brandId)
    .order("created_at", { ascending: false });

  const crew = ((roster ?? []) as unknown as RosterRow[]).map((t) => {
    const pay = t.payments?.[0];
    const latest = (t.deliverables ?? []).sort((a, b) => b.version - a.version)[0];
    return {
      id: t.id,
      handle: t.creators?.profiles?.handle ?? "unknown",
      campaign: t.campaigns?.title ?? "—",
      avgViews: t.creators?.avg_views ?? 0,
      amount: pay?.amount_cents ?? 0,
      payStatus: pay?.status ?? ("escrowed" as PaymentStatus),
      work: latest
        ? DELIVERABLE_STATUS_LABEL[latest.status]
        : "Not submitted yet",
    };
  });

  const rows = (campaigns ?? []) as CampaignRow[];
  const open = rows.filter((c) => c.status === "open");
  const drafts = rows.filter((c) => c.status === "draft");

  const escrowed = (payments ?? [])
    .filter((p) => p.status !== "released")
    .reduce((n, p) => n + p.amount_cents, 0);
  const released = (payments ?? [])
    .filter((p) => p.status === "released")
    .reduce((n, p) => n + p.amount_cents, 0);

  // The number a brand should feel: applications they are about to burn.
  const soon = (pending ?? []).filter(
    (a) => new Date(a.expires_at).getTime() - Date.now() < 12 * 3600 * 1000,
  );
  const nextToLapse = pending?.[0];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="type-display-xl">{brand.displayName}</h1>
        <Link href="/b/campaigns/new">
          <Button variant="primary">Post a campaign</Button>
        </Link>
      </div>

      {/* Product fix #1, made expensive to ignore: the cost of not replying is
          the first thing on the brand's own dashboard. */}
      {soon.length > 0 && nextToLapse ? (
        <Link
          href="/b/applicants"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-flare/45 bg-flare/10 px-4 py-3.5 transition-colors hover:border-flare/70"
        >
          <p className="text-flare">
            <span className="type-timecode font-semibold">{soon.length}</span>{" "}
            {soon.length === 1 ? "application expires" : "applications expire"} on
            you in under 12 hours
          </p>
          <span className="type-timecode text-flare">
            next in {timecode(new Date(nextToLapse.expires_at).getTime() - Date.now())}
          </span>
        </Link>
      ) : null}

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-4">
        <Stat label="Open campaigns" value={String(open.length)} />
        <Stat
          label="Slots filled"
          value={`${open.reduce((n, c) => n + c.slots_filled, 0)} / ${open.reduce((n, c) => n + c.slots_total, 0)}`}
        />
        <Stat label="Committed" value={money(escrowed)} hint="escrowed, not yet paid" />
        <Stat label="Released" value={money(released)} hint="paid to creators" />
      </dl>

      {crew.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="type-micro text-ash">Your creators</h2>
            <span className="type-micro text-ash/60">
              view counts are seeded demo data
            </span>
          </div>

          <div className="overflow-x-auto rounded-[10px] border border-line">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-raise">
                  {["Creator", "Campaign", "Avg views", "Work", "Payment"].map((h) => (
                    <th key={h} className="type-micro px-4 py-2.5 font-semibold text-ash">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {crew.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-b-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/t/${c.id}`}
                        className="type-timecode text-[14px] text-bone underline-offset-4 hover:underline"
                      >
                        @{c.handle}
                      </Link>
                    </td>
                    <td className="type-small max-w-[220px] truncate px-4 py-3 text-ash">
                      {c.campaign}
                    </td>
                    <td className="type-timecode px-4 py-3 text-[14px] text-ash">
                      {views(c.avgViews)}
                    </td>
                    <td className="type-small px-4 py-3">{c.work}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-baseline gap-2">
                        <span className="type-timecode text-[14px]">
                          {money(c.amount)}
                        </span>
                        <Chip tone={c.payStatus === "released" ? "solid" : "outline"}>
                          {PAYMENT_STATUS_LABEL[c.payStatus]}
                        </Chip>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="type-micro text-ash">Campaigns</h2>
          <ResponsivenessBadge
            answered={rate?.answered_in_window}
            decidable={rate?.decidable}
          />
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="No campaigns yet"
            body="Post a brief and creators start applying the same day. You'll see each applicant here with a live countdown on your reply."
            action={
              <Link href="/b/campaigns/new">
                <Button variant="primary">Post your first campaign</Button>
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((c) => {
              const waiting = (pending ?? []).filter((a) => a.campaign_id === c.id).length;
              return (
                <Link
                  key={c.id}
                  href={`/b/campaigns/${c.id}`}
                  className="group flex flex-col gap-4 rounded-[10px] border border-line bg-raise p-4 transition-colors hover:border-bone/25 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-4">
                      <VerticalCount count={c.video_count} />
                      <div className="flex min-w-0 flex-col gap-1">
                        <h3 className="type-title text-balance">{c.title}</h3>
                        <p className="type-small text-ash">
                          {c.video_count}× {PLATFORM_SHORT[c.platform]} · due{" "}
                          {shortDate(c.deadline)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="type-timecode text-[20px]">
                        {money(c.budget_cents_per_creator)}
                      </span>
                      <Chip
                        tone={
                          c.status === "open"
                            ? "outline"
                            : c.status === "draft"
                              ? "identity"
                              : "muted"
                        }
                      >
                        {c.status === "open" ? "Live" : c.status === "draft" ? "Draft" : "Closed"}
                      </Chip>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                    <SlotRail filled={c.slots_filled} total={c.slots_total} />
                    {waiting > 0 ? (
                      <span className="type-small text-flare">
                        <span className="type-timecode">{waiting}</span> waiting on
                        you
                      </span>
                    ) : (
                      <span className="type-small text-ash">Nothing waiting</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {drafts.length > 0 ? (
          <p className="type-small text-ash">
            {drafts.length} draft{drafts.length === 1 ? "" : "s"} not visible to
            creators yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 bg-raise p-4">
      <dt className="type-micro text-ash">{label}</dt>
      <dd className="type-timecode text-[22px] leading-tight">{value}</dd>
      {hint ? <p className="type-small text-ash">{hint}</p> : null}
    </div>
  );
}
