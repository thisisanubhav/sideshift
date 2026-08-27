import { createClient } from "@/lib/supabase/server";
import type { CampaignStatus, Platform } from "@/lib/types";

export type CampaignCardData = {
  id: string;
  title: string;
  status: CampaignStatus;
  brief: string;
  niche: string | null;
  platform: Platform;
  video_count: number;
  duration_min_seconds: number;
  duration_max_seconds: number;
  budget_cents_per_creator: number;
  slots_total: number;
  slots_filled: number;
  deadline: string;
  published_at: string | null;
  brand: {
    id: string;
    name: string;
    handle: string;
  };
  answered_in_window: number;
  decidable: number;
};

export type BrowseFilters = {
  platforms: Platform[];
  niches: string[];
  minBudget: number | null;
  repliesFastOnly: boolean;
  sort: "newest" | "highest_pay" | "closing_soon";
};

type RawCampaign = Omit<CampaignCardData, "brand" | "answered_in_window" | "decidable"> & {
  brand_id: string;
  brands: {
    id: string;
    name: string;
    profiles: { handle: string } | null;
  } | null;
};

const SELECT = `
  id, title, status, brief, niche, platform, video_count,
  duration_min_seconds, duration_max_seconds, budget_cents_per_creator,
  slots_total, slots_filled, deadline, published_at, brand_id,
  brands!inner ( id, name, profiles!inner ( handle ) )
`;

/** Responsiveness is one aggregate read for the whole page, not one per card. */
async function attachResponsiveness(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: RawCampaign[],
): Promise<CampaignCardData[]> {
  const brandIds = [...new Set(rows.map((r) => r.brand_id))];
  const { data: rates } = brandIds.length
    ? await supabase
        .from("brand_responsiveness")
        .select("brand_id, answered_in_window, decidable")
        .in("brand_id", brandIds)
    : { data: [] };

  const byBrand = new Map(
    (rates ?? []).map((r) => [r.brand_id, r]),
  );

  return rows.map((r) => {
    const rate = byBrand.get(r.brand_id);
    return {
      ...r,
      brand: {
        id: r.brands?.id ?? r.brand_id,
        name: r.brands?.name ?? "Unknown brand",
        handle: r.brands?.profiles?.handle ?? "unknown",
      },
      answered_in_window: rate?.answered_in_window ?? 0,
      decidable: rate?.decidable ?? 0,
    };
  });
}

export async function listOpenCampaigns(
  filters: BrowseFilters,
): Promise<CampaignCardData[]> {
  const supabase = await createClient();

  // Sweep lapsed applications before reading, so slot counts and rates on this
  // page reflect the windows that have actually closed. Lazy expiry, no cron.
  await supabase.rpc("expire_stale_applications");

  let q = supabase.from("campaigns").select(SELECT).eq("status", "open");

  if (filters.platforms.length) q = q.in("platform", filters.platforms);
  if (filters.niches.length) q = q.in("niche", filters.niches);
  if (filters.minBudget) q = q.gte("budget_cents_per_creator", filters.minBudget);

  if (filters.sort === "highest_pay") {
    q = q.order("budget_cents_per_creator", { ascending: false });
  } else if (filters.sort === "closing_soon") {
    q = q.order("deadline", { ascending: true });
  } else {
    q = q.order("published_at", { ascending: false });
  }

  const { data, error } = await q;
  if (error) throw error;

  let cards = await attachResponsiveness(supabase, (data ?? []) as unknown as RawCampaign[]);

  // Applied after the aggregate read rather than in SQL: the rate is derived,
  // and at marketplace scale this is a few dozen rows.
  if (filters.repliesFastOnly) {
    cards = cards.filter(
      (c) => c.decidable >= 3 && c.answered_in_window / c.decidable >= 0.8,
    );
  }

  return cards;
}

export async function getCampaign(id: string): Promise<CampaignCardData | null> {
  const supabase = await createClient();
  await supabase.rpc("expire_stale_applications");

  const { data } = await supabase.from("campaigns").select(SELECT).eq("id", id).maybeSingle();
  if (!data) return null;

  const [card] = await attachResponsiveness(supabase, [data as unknown as RawCampaign]);
  return card;
}

/** Distinct niches actually present on open campaigns — no hardcoded taxonomy. */
export async function listNiches(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("campaigns")
    .select("niche")
    .eq("status", "open")
    .not("niche", "is", null);
  return [...new Set((data ?? []).map((r) => r.niche as string))].sort();
}
