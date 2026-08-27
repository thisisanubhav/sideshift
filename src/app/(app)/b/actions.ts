"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireBrand } from "@/lib/auth";
import type { DeclineReason, Platform } from "@/lib/types";

export type CampaignFormState = { error?: string };

export async function createCampaign(
  _prev: CampaignFormState,
  formData: FormData,
): Promise<CampaignFormState> {
  const brand = await requireBrand();

  const publish = formData.get("intent") === "publish";
  const title = String(formData.get("title") ?? "").trim();
  const brief = String(formData.get("brief") ?? "").trim();
  const niche = String(formData.get("niche") ?? "").trim() || null;
  const platform = String(formData.get("platform") ?? "") as Platform;
  const videoCount = Number(formData.get("video_count"));
  const durMin = Number(formData.get("duration_min"));
  const durMax = Number(formData.get("duration_max"));
  const budget = Number(String(formData.get("budget") ?? "").replace(/[^0-9.]/g, ""));
  const slots = Number(formData.get("slots"));
  const deadline = String(formData.get("deadline") ?? "");

  if (title.length < 3) return { error: "Give the campaign a title creators will recognise." };
  if (brief.length < 20) {
    return {
      error: `The brief needs at least 20 characters — you have ${brief.length}. Creators decide from this.`,
    };
  }
  if (!["tiktok", "reels", "shorts"].includes(platform)) {
    return { error: "Pick the platform the videos are for." };
  }
  if (!Number.isFinite(videoCount) || videoCount < 1) {
    return { error: "How many videos do you want from each creator?" };
  }
  if (!Number.isFinite(durMin) || !Number.isFinite(durMax) || durMax < durMin) {
    return { error: "The maximum length has to be the same as or longer than the minimum." };
  }
  if (!Number.isFinite(budget) || budget <= 0) {
    return { error: "Set a budget per creator, in dollars." };
  }
  if (!Number.isFinite(slots) || slots < 1) {
    return { error: "How many creators do you want on this campaign?" };
  }
  if (!deadline) return { error: "Set the date the videos are due." };
  if (new Date(deadline).getTime() < Date.now()) {
    return { error: "That deadline is in the past. Pick a date creators can still hit." };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      brand_id: brand.brandId,
      title,
      brief,
      niche,
      platform,
      video_count: videoCount,
      duration_min_seconds: durMin,
      duration_max_seconds: durMax,
      budget_cents_per_creator: Math.round(budget * 100),
      slots_total: slots,
      deadline,
      status: publish ? "open" : "draft",
      published_at: publish ? now : null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/b");
  redirect(`/b/campaigns/${data.id}`);
}

export async function publishCampaign(formData: FormData) {
  await requireBrand();
  const id = String(formData.get("campaign_id") ?? "");
  const supabase = await createClient();
  await supabase
    .from("campaigns")
    .update({ status: "open", published_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/b");
  revalidatePath(`/b/campaigns/${id}`);
}

// ---------------------------------------------------------------------------
// Application decisions. Both go through SECURITY DEFINER functions that check
// authority in the database — the UI is not the enforcement point.
// ---------------------------------------------------------------------------

export type DecisionState = { error?: string; threadId?: string; declined?: boolean };

export async function acceptApplication(
  _prev: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  await requireBrand();
  const id = String(formData.get("application_id") ?? "");
  const campaignId = String(formData.get("campaign_id") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_application", {
    p_application_id: id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/b/campaigns/${campaignId}`);
  revalidatePath("/b/applicants");
  revalidatePath("/b");

  // Hand the new thread back so the card can confirm in place. Money just moved;
  // the card silently vanishing from the queue is not acknowledgement.
  return { threadId: typeof data === "string" ? data : undefined };
}

export async function declineApplication(
  _prev: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  await requireBrand();
  const id = String(formData.get("application_id") ?? "");
  const campaignId = String(formData.get("campaign_id") ?? "");
  const reason = String(formData.get("reason") ?? "") as DeclineReason;
  const note = String(formData.get("note") ?? "").trim();

  if (!reason) {
    return { error: "Pick a reason. The creator sees it, and that's the point." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("decline_application", {
    p_application_id: id,
    p_reason: reason,
    p_note: note || null,
  });
  if (error) return { error: error.message };

  revalidatePath(`/b/campaigns/${campaignId}`);
  revalidatePath("/b/applicants");
  revalidatePath("/b");
  return { declined: true };
}
