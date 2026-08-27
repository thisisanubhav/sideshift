import Link from "next/link";
import { requireCreator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { money, stamp } from "@/lib/format";
import {
  APPLICATION_STATUS_LABEL,
  DECLINE_REASON_LABEL,
  PLATFORM_SHORT,
} from "@/lib/types";
import type { ApplicationStatus, DeclineReason, Platform } from "@/lib/types";
import { Countdown } from "@/components/countdown";
import { Button, Card, Chip, EmptyState } from "@/components/ui";

export const metadata = { title: "Your applications — SideShift" };

type Row = {
  id: string;
  status: ApplicationStatus;
  rate_cents: number;
  expires_at: string;
  created_at: string;
  responded_at: string | null;
  decline_reason: DeclineReason | null;
  decline_note: string | null;
  campaigns: {
    id: string;
    title: string;
    platform: Platform;
    video_count: number;
    brands: { name: string; profiles: { handle: string } | null } | null;
  } | null;
};

const CHIP_TONE = {
  pending: "outline",
  accepted: "solid",
  declined: "muted",
  expired: "muted",
  withdrawn: "muted",
} as const;

export default async function CreatorApplications() {
  const creator = await requireCreator();
  const supabase = await createClient();

  // Sweep first: a window that lapsed while nobody was looking flips now.
  await supabase.rpc("expire_stale_applications");

  const [{ data }, { data: threads }] = await Promise.all([
    supabase
      .from("applications")
      .select(
        `id, status, rate_cents, expires_at, created_at, responded_at,
         decline_reason, decline_note,
         campaigns ( id, title, platform, video_count,
                     brands ( name, profiles ( handle ) ) )`,
      )
      .eq("creator_id", creator.creatorId)
      .order("created_at", { ascending: false }),
    supabase.from("threads").select("id, application_id").eq("creator_id", creator.creatorId),
  ]);

  const rows = (data ?? []) as unknown as Row[];
  const threadFor = new Map((threads ?? []).map((t) => [t.application_id, t.id]));

  const waiting = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="type-display-xl">Your applications</h1>
        {waiting > 0 ? (
          <p className="type-small pb-1 text-ash">
            <span className="type-timecode text-bone">{waiting}</span> awaiting a
            reply
          </p>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="You haven't applied to anything yet"
          body="Open briefs are paid, and every brand on SideShift has 48 hours to answer you. If they don't, the application expires and you find out — no silence."
          action={
            <Link href="/c/browse">
              <Button variant="primary">Browse open campaigns</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => {
            const c = r.campaigns;
            const threadId = threadFor.get(r.id);
            return (
              <Card key={r.id} className="flex flex-col gap-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <h2 className="type-title text-balance">
                      {c?.title ?? "Campaign removed"}
                    </h2>
                    <p className="type-small text-ash">
                      <span className="type-timecode text-bone">
                        @{c?.brands?.profiles?.handle ?? "unknown"}
                      </span>
                      {c ? (
                        <>
                          {" "}
                          · {c.video_count}× {PLATFORM_SHORT[c.platform]}
                        </>
                      ) : null}
                      {" "}· applied {stamp(r.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="type-timecode text-[20px]">
                      {money(r.rate_cents)}
                    </span>
                    <Chip tone={CHIP_TONE[r.status]}>
                      {APPLICATION_STATUS_LABEL[r.status]}
                    </Chip>
                  </div>
                </div>

                {r.status === "pending" ? (
                  <div className="border-t border-line pt-3">
                    <Countdown
                      expiresAt={r.expires_at}
                      initialMs={new Date(r.expires_at).getTime() - Date.now()}
                    />
                  </div>
                ) : null}

                {r.status === "accepted" && threadId ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                    <p className="type-small text-ash">
                      Accepted {r.responded_at ? stamp(r.responded_at) : ""} ·{" "}
                      {money(r.rate_cents)} escrowed
                    </p>
                    <Link href={`/t/${threadId}`}>
                      <Button variant="primary" size="sm">
                        Open thread
                      </Button>
                    </Link>
                  </div>
                ) : null}

                {/* The decline reason is the product. It is never hidden. */}
                {r.status === "declined" && r.decline_reason ? (
                  <div className="flex flex-col gap-1.5 border-t border-line pt-3">
                    <span className="type-micro text-ash">Why it was declined</span>
                    <p className="type-small">
                      {DECLINE_REASON_LABEL[r.decline_reason]}
                    </p>
                    {r.decline_note ? (
                      <p className="type-small text-ash">“{r.decline_note}”</p>
                    ) : null}
                  </div>
                ) : null}

                {r.status === "expired" ? (
                  <p className="type-small border-t border-line pt-3 text-ash">
                    The brand let the 48-hour window lapse without answering. The
                    slot was freed. This does not count against you.
                  </p>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
