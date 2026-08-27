"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeFor } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

export type AuthState = { error?: string; notice?: string };

const HANDLE_RE = /^[a-z0-9._]{3,30}$/;

function normaliseHandle(raw: string) {
  return raw.trim().toLowerCase().replace(/^@/, "");
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const handle = normaliseHandle(String(formData.get("handle") ?? ""));
  const role = String(formData.get("role") ?? "") as UserRole;

  if (role !== "brand" && role !== "creator") {
    return { error: "Pick whether you're hiring creators or making videos." };
  }
  if (!displayName) {
    return {
      error:
        role === "brand"
          ? "Add your brand name — creators see it on every campaign."
          : "Add your name — brands see it on every application.",
    };
  }
  if (!HANDLE_RE.test(handle)) {
    return {
      error:
        "Handles are 3–30 characters, lowercase letters, numbers, dots and underscores only.",
    };
  }
  if (password.length < 8) {
    return { error: "Passwords need at least 8 characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role, display_name: displayName, handle } },
  });

  if (error) {
    // The profiles.handle unique constraint surfaces through the signup trigger.
    if (/duplicate key|handle/i.test(error.message)) {
      return { error: `@${handle} is taken. Try another handle.` };
    }
    return { error: error.message };
  }

  // GoTrue withholds the session at signup when "Confirm email" is on, but the
  // auto_confirm_users trigger (migration 0005) has already stamped
  // email_confirmed_at, so a password sign-in right now succeeds. This keeps the
  // two-browser walkthrough from stalling on an email nobody will click.
  if (!data.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      return {
        notice: `Account created. Check ${email} for a confirmation link, then sign in.`,
      };
    }
  }

  redirect(homeFor(role));
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "That email and password don't match an account." };
  }

  if (next.startsWith("/")) redirect(next);

  const { data } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user!.id)
    .single();

  redirect(homeFor((profile?.role ?? "creator") as UserRole));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
