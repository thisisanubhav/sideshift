"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCreator } from "@/lib/auth";

export type ApplyState = { error?: string; ok?: boolean };

export async function applyToCampaign(
  _prev: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  const creator = await requireCreator();
  const campaignId = String(formData.get("campaign_id") ?? "");
  const pitch = String(formData.get("pitch") ?? "").trim();
  const dollars = Number(String(formData.get("rate") ?? "").replace(/[^0-9.]/g, ""));

  if (pitch.length < 20) {
    return {
      error: `Your pitch needs at least 20 characters — you have ${pitch.length}. Say what you'd film and where.`,
    };
  }
  if (pitch.length > 1200) {
    return { error: `Keep the pitch under 1200 characters. Yours is ${pitch.length}.` };
  }
  if (!Number.isFinite(dollars) || dollars <= 0) {
    return { error: "Enter the rate you want for this campaign, in dollars." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("applications").insert({
    campaign_id: campaignId,
    creator_id: creator.creatorId,
    pitch,
    rate_cents: Math.round(dollars * 100),
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "You've already applied to this campaign." };
    }
    // The RLS insert policy rejects applications to closed or full campaigns.
    if (error.code === "42501") {
      return {
        error: "This campaign closed or filled its last slot while you were writing. Nothing was sent.",
      };
    }
    return { error: error.message };
  }

  revalidatePath(`/c/campaigns/${campaignId}`);
  revalidatePath("/c");
  revalidatePath("/c/browse");
  return { ok: true };
}

export async function withdrawApplication(formData: FormData) {
  await requireCreator();
  const id = String(formData.get("application_id") ?? "");
  const supabase = await createClient();
  await supabase.rpc("withdraw_application", { p_application_id: id });
  revalidatePath("/c");
}
