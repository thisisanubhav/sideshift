import Link from "next/link";
import { requireCreator } from "@/lib/auth";
import { listNiches, listOpenCampaigns, type BrowseFilters } from "@/lib/queries";
import { CampaignCard } from "@/components/campaign-card";
import { Button, EmptyState } from "@/components/ui";
import { Filters } from "./filters";
import type { Platform } from "@/lib/types";

export const metadata = { title: "Browse campaigns — SideShift" };

function arr(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireCreator();
  const sp = await searchParams;

  const filters: BrowseFilters = {
    platforms: arr(sp.platform).filter((p): p is Platform =>
      ["tiktok", "reels", "shorts"].includes(p),
    ),
    niches: arr(sp.niche),
    minBudget: sp.min_budget ? Number(sp.min_budget) : null,
    repliesFastOnly: sp.replies_fast === "1",
    sort:
      sp.sort === "highest_pay" || sp.sort === "closing_soon"
        ? sp.sort
        : "newest",
  };

  const [campaigns, niches] = await Promise.all([
    listOpenCampaigns(filters),
    listNiches(),
  ]);

  const filtered =
    filters.platforms.length > 0 ||
    filters.niches.length > 0 ||
    filters.minBudget !== null ||
    filters.repliesFastOnly;

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
      <aside className="shrink-0 lg:w-56">
        <Filters filters={filters} niches={niches} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <div className="flex items-end justify-between gap-4">
          <h1 className="type-display-xl">Open campaigns</h1>
          <span className="type-timecode pb-1 text-[22px] text-ash">
            {campaigns.length}
          </span>
        </div>

        {campaigns.length === 0 ? (
          filtered ? (
            <EmptyState
              title="Nothing matches those filters"
              body="Every open campaign was filtered out. Widen the budget, add a platform, or drop the responsiveness filter to see the rest of the marketplace."
              action={
                <Link href="/c/browse">
                  <Button variant="secondary">Clear all filters</Button>
                </Link>
              }
            />
          ) : (
            <EmptyState
              title="No campaigns are open right now"
              body="Brands post new briefs most weekdays. Check back tomorrow — every campaign here has to answer your application inside 48 hours."
            />
          )
        ) : (
          <div className="flex flex-col gap-3">
            {campaigns.map((c) => (
              <CampaignCard
                key={c.id}
                campaign={c}
                href={`/c/campaigns/${c.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
