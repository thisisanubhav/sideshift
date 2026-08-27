"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Keeps the thread live on both sides.
 *
 * Subscribed to exactly two tables — messages and payments — because those are
 * the two the demo requires to move without a refresh: the creator must see
 * "released" the instant the brand approves. Everything else refreshes on
 * navigation.
 *
 * It re-renders on the server rather than patching client state, so there is
 * one rendering path for the spine instead of two that can disagree.
 */
export function LiveThread({ threadId }: { threadId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const filter = `thread_id=eq.${threadId}`;

    const channel = supabase
      .channel(`thread:${threadId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "messages", filter },
        () => router.refresh())
      .on("postgres_changes",
        { event: "*", schema: "public", table: "payments", filter },
        () => router.refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, router]);

  return null;
}
