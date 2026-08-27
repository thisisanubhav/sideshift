import { createClient } from "@/lib/supabase/server";
import type { ThreadListItem } from "@/components/thread-list";
import type { PaymentStatus, ThreadStatus } from "@/lib/types";

type Row = {
  id: string;
  status: ThreadStatus;
  created_at: string;
  campaigns: { title: string } | null;
  brands: { profiles: { handle: string } | null } | null;
  creators: { profiles: { handle: string } | null } | null;
  // to-ONE: payments.thread_id carries a UNIQUE constraint, so PostgREST
  // embeds this as an object. Typing it as an array silently produced $0.
  payments: { amount_cents: number; status: PaymentStatus } | null;
};

/**
 * One query for both sides. RLS decides which rows come back, so the caller
 * does not filter by role — it only says whose handle to show on the other end.
 */
export async function listThreads(
  showSide: "brand" | "creator",
): Promise<ThreadListItem[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("threads")
    .select(
      `id, status, created_at,
       campaigns ( title ),
       brands ( profiles ( handle ) ),
       creators ( profiles ( handle ) ),
       payments ( amount_cents, status )`,
    )
    .order("created_at", { ascending: false });

  return ((data ?? []) as unknown as Row[]).map((t) => {
    const payment = t.payments;
    const counterpart =
      showSide === "brand"
        ? t.creators?.profiles?.handle
        : t.brands?.profiles?.handle;
    return {
      id: t.id,
      status: t.status,
      created_at: t.created_at,
      campaignTitle: t.campaigns?.title ?? "Campaign removed",
      counterpartHandle: counterpart ?? "unknown",
      amount_cents: payment?.amount_cents ?? 0,
      paymentStatus: payment?.status ?? "escrowed",
    };
  });
}
