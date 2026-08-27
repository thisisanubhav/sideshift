import Link from "next/link";
import { requireBrand } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button, EmptyState } from "@/components/ui";
import { ApplicantCard, type Applicant } from "../campaigns/[id]/applicant";

export const metadata = { title: "Applicants — SideShift" };

/**
 * Every open application across every campaign, soonest to lapse first.
 *
 * The order is the point: a brand should not have to go campaign by campaign to
 * find out which creator they are about to leave hanging.
 */
export default async function ApplicantQueue() {
  const brand = await requireBrand();
  const supabase = await createClient();

  await supabase.rpc("expire_stale_applications");

  const { data } = await supabase
    .from("applications")
    .select(
      `id, status, pitch, rate_cents, expires_at, created_at, responded_at,
       decline_reason, decline_note, campaign_id,
       campaigns!inner ( id, title, brand_id, slots_total, slots_filled ),
       creators!inner ( niche, city, follower_count, avg_views, platforms, bio,
                        profiles!inner ( handle, display_name ) )`,
    )
    .eq("status", "pending")
    .eq("campaigns.brand_id", brand.brandId)
    .order("expires_at", { ascending: true });

  const rows = data ?? [];

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="type-display-xl">Waiting on you</h1>
        <p className="text-ash">
          Sorted by how soon the window closes. Anything you let lapse expires on
          its own and shows up in your public response rate.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Nothing is waiting on you"
          body="Every application to your campaigns has an answer. That's what keeps your response rate up, and creators can see it."
          action={
            <Link href="/b">
              <Button variant="secondary">Back to campaigns</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {rows.map((a) => {
            const camp = a.campaigns as unknown as {
              id: string; title: string; slots_total: number; slots_filled: number;
            };
            const cr = a.creators as unknown as {
              niche: string | null; city: string | null; follower_count: number;
              avg_views: number; platforms: Applicant["creator"]["platforms"];
              bio: string | null; profiles: { handle: string; display_name: string };
            };

            const applicant: Applicant = {
              id: a.id,
              status: a.status,
              pitch: a.pitch,
              rate_cents: a.rate_cents,
              expires_at: a.expires_at,
              created_at: a.created_at,
              responded_at: a.responded_at,
              decline_reason: a.decline_reason,
              decline_note: a.decline_note,
              thread_id: null,
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

            return (
              <div key={a.id} className="flex flex-col gap-2">
                <Link
                  href={`/b/campaigns/${camp.id}`}
                  className="type-micro w-fit text-ash hover:text-bone"
                >
                  {camp.title} ↗
                </Link>
                <ApplicantCard
                  applicant={applicant}
                  campaignId={camp.id}
                  slotsLeft={camp.slots_total - camp.slots_filled}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
