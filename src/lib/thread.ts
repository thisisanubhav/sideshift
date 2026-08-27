import { createClient } from "@/lib/supabase/server";
import type {
  DeliverableStatus,
  PaymentStatus,
  Platform,
  ThreadStatus,
  UserRole,
} from "@/lib/types";

/**
 * One event stream per thread.
 *
 * Chat and state changes are the same list, in one order. Splitting them into a
 * conversation and an "activity log" is exactly how the real product loses
 * people: the money moves in a tab nobody has open. Here, "accepted",
 * "deliverable v2 submitted" and "payment released" are peers of the messages
 * around them, and every one carries a timestamp.
 */
export type SpineEvent =
  | { kind: "accepted"; at: string; amountCents: number; slot: number; slotsTotal: number }
  | { kind: "message"; at: string; body: string; handle: string; mine: boolean }
  | {
      kind: "deliverable";
      at: string;
      version: number;
      note: string | null;
      deliveryUrl: string | null;
      fileUrl: string | null;
      status: DeliverableStatus;
      id: string;
    }
  | { kind: "review"; at: string; version: number; approved: boolean; note: string | null }
  | { kind: "released"; at: string; amountCents: number };

export type ThreadView = {
  id: string;
  status: ThreadStatus;
  createdAt: string;
  viewerRole: UserRole;
  counterpart: { handle: string; name: string };
  campaign: {
    id: string;
    title: string;
    brief: string;
    platform: Platform;
    videoCount: number;
    durationMin: number;
    durationMax: number;
    deadline: string;
  };
  payment: {
    amountCents: number;
    status: PaymentStatus;
    escrowedAt: string;
    inReviewAt: string | null;
    releasedAt: string | null;
  };
  latestDeliverable: {
    id: string;
    version: number;
    status: DeliverableStatus;
    deliveryUrl: string | null;
    fileUrl: string | null;
  } | null;
  events: SpineEvent[];
};

export async function getThread(
  id: string,
  viewer: { userId: string; role: UserRole },
): Promise<ThreadView | null> {
  const supabase = await createClient();

  // RLS does the authorising: a non-participant simply gets nothing back.
  const { data: thread } = await supabase
    .from("threads")
    .select(
      `id, status, created_at,
       campaigns!inner ( id, title, brief, platform, video_count,
                         duration_min_seconds, duration_max_seconds, deadline,
                         slots_total ),
       brands!inner ( profiles!inner ( handle, display_name ) ),
       creators!inner ( profiles!inner ( handle, display_name ) ),
       applications!inner ( rate_cents, responded_at )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!thread) return null;

  const [{ data: messages }, { data: deliverables }, { data: payment }] =
    await Promise.all([
      supabase
        .from("messages")
        .select("id, body, created_at, sender_profile_id, profiles!inner(handle)")
        .eq("thread_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("deliverables")
        .select("*")
        .eq("thread_id", id)
        .order("version", { ascending: true }),
      supabase.from("payments").select("*").eq("thread_id", id).maybeSingle(),
    ]);

  const c = thread.campaigns as unknown as {
    id: string; title: string; brief: string; platform: Platform;
    video_count: number; duration_min_seconds: number;
    duration_max_seconds: number; deadline: string; slots_total: number;
  };
  const brandProfile = (thread.brands as unknown as { profiles: { handle: string; display_name: string } }).profiles;
  const creatorProfile = (thread.creators as unknown as { profiles: { handle: string; display_name: string } }).profiles;
  const application = thread.applications as unknown as { rate_cents: number; responded_at: string | null };

  const counterpart = viewer.role === "brand" ? creatorProfile : brandProfile;

  // Signed URLs for uploaded files. The bucket is private; only the two
  // participants can mint these, and they expire.
  const signed = new Map<string, string>();
  const paths = (deliverables ?? []).map((d) => d.storage_path).filter(Boolean) as string[];
  if (paths.length) {
    const { data } = await supabase.storage
      .from("deliverables")
      .createSignedUrls(paths, 3600);
    for (const s of data ?? []) {
      if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
    }
  }

  const events: SpineEvent[] = [];

  events.push({
    kind: "accepted",
    at: application.responded_at ?? thread.created_at,
    amountCents: payment?.amount_cents ?? application.rate_cents,
    slot: 1,
    slotsTotal: c.slots_total,
  });

  for (const m of messages ?? []) {
    events.push({
      kind: "message",
      at: m.created_at,
      body: m.body,
      handle: (m.profiles as unknown as { handle: string }).handle,
      mine: m.sender_profile_id === viewer.userId,
    });
  }

  for (const d of deliverables ?? []) {
    events.push({
      kind: "deliverable",
      at: d.submitted_at,
      version: d.version,
      note: d.note,
      deliveryUrl: d.delivery_url,
      fileUrl: d.storage_path ? (signed.get(d.storage_path) ?? null) : null,
      status: d.status,
      id: d.id,
    });
    if (d.reviewed_at) {
      events.push({
        kind: "review",
        at: d.reviewed_at,
        version: d.version,
        approved: d.status === "approved",
        note: d.review_note,
      });
    }
  }

  if (payment?.released_at) {
    events.push({
      kind: "released",
      at: payment.released_at,
      amountCents: payment.amount_cents,
    });
  }

  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const last = (deliverables ?? []).at(-1);

  return {
    id: thread.id,
    status: thread.status,
    createdAt: thread.created_at,
    viewerRole: viewer.role,
    counterpart: { handle: counterpart.handle, name: counterpart.display_name },
    campaign: {
      id: c.id,
      title: c.title,
      brief: c.brief,
      platform: c.platform,
      videoCount: c.video_count,
      durationMin: c.duration_min_seconds,
      durationMax: c.duration_max_seconds,
      deadline: c.deadline,
    },
    payment: {
      amountCents: payment?.amount_cents ?? application.rate_cents,
      status: payment?.status ?? "escrowed",
      escrowedAt: payment?.escrowed_at ?? thread.created_at,
      inReviewAt: payment?.in_review_at ?? null,
      releasedAt: payment?.released_at ?? null,
    },
    latestDeliverable: last
      ? {
          id: last.id,
          version: last.version,
          status: last.status,
          deliveryUrl: last.delivery_url,
          fileUrl: last.storage_path ? (signed.get(last.storage_path) ?? null) : null,
        }
      : null,
    events,
  };
}
