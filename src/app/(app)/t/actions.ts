"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";

export type ThreadState = { error?: string; toast?: string };

export async function sendMessage(
  _prev: ThreadState,
  formData: FormData,
): Promise<ThreadState> {
  const viewer = await requireViewer();
  const threadId = String(formData.get("thread_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!body) return { error: "Write something first." };
  if (body.length > 4000) return { error: "That message is over 4000 characters." };

  const supabase = await createClient();
  // RLS checks participation; a non-participant insert is rejected here.
  const { error } = await supabase
    .from("messages")
    .insert({ thread_id: threadId, sender_profile_id: viewer.userId, body });

  if (error) return { error: "That message didn't send. Check your connection and try again." };

  revalidatePath(`/t/${threadId}`);
  return {};
}

export async function submitDeliverable(
  _prev: ThreadState,
  formData: FormData,
): Promise<ThreadState> {
  const viewer = await requireViewer();
  if (viewer.role !== "creator") return { error: "Only the creator can submit work." };

  const threadId = String(formData.get("thread_id") ?? "");
  const deliveryUrl = String(formData.get("delivery_url") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const file = formData.get("file");

  let storagePath: string | null = null;
  const supabase = await createClient();

  if (file instanceof File && file.size > 0) {
    if (file.size > 25 * 1024 * 1024) {
      return {
        error: `That file is ${(file.size / 1024 / 1024).toFixed(0)}MB. The limit is 25MB — paste a delivery link instead for anything bigger.`,
      };
    }
    // Path convention <thread_id>/<file>; the storage policy keys off folder 1.
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
    const path = `${threadId}/${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage
      .from("deliverables")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (upErr) {
      return { error: `Upload failed: ${upErr.message}. You can paste a delivery link instead.` };
    }
    storagePath = path;
  }

  if (!storagePath && !deliveryUrl) {
    return { error: "Attach a file or paste a delivery link." };
  }

  const { error } = await supabase.rpc("submit_deliverable", {
    p_thread_id: threadId,
    p_storage_path: storagePath,
    p_delivery_url: deliveryUrl || null,
    p_note: note || null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/t/${threadId}`);
  return { toast: "Sent for review" };
}

export async function approveDeliverable(
  _prev: ThreadState,
  formData: FormData,
): Promise<ThreadState> {
  const viewer = await requireViewer();
  if (viewer.role !== "brand") return { error: "Only the brand can approve." };

  const threadId = String(formData.get("thread_id") ?? "");
  const id = String(formData.get("deliverable_id") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_deliverable", {
    p_deliverable_id: id,
    p_note: note || null,
  });
  if (error) return { error: error.message };

  revalidatePath(`/t/${threadId}`);
  revalidatePath("/b");
  // Same words as the button that caused it.
  return { toast: "Payment released" };
}

export async function requestChanges(
  _prev: ThreadState,
  formData: FormData,
): Promise<ThreadState> {
  const viewer = await requireViewer();
  if (viewer.role !== "brand") return { error: "Only the brand can request changes." };

  const threadId = String(formData.get("thread_id") ?? "");
  const id = String(formData.get("deliverable_id") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!note) {
    return { error: "Say what needs to change. Sending this back with no notes wastes both of you a day." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("request_changes", {
    p_deliverable_id: id,
    p_note: note,
  });
  if (error) return { error: error.message };

  revalidatePath(`/t/${threadId}`);
  return { toast: "Changes requested" };
}
