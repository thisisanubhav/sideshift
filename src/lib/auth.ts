import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export type Viewer = {
  userId: string;
  email: string | null;
  role: UserRole;
  displayName: string;
  handle: string;
  /** Set when role is 'brand'. */
  brandId: string | null;
  /** Set when role is 'creator'. */
  creatorId: string | null;
};

/**
 * The single source of truth for who is asking.
 *
 * Role comes from the profiles table, never from a cookie, a header, or a
 * form field the client could set. Every guard below reads through here.
 */
export async function getViewer(): Promise<Viewer | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name, handle")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  const [{ data: brand }, { data: creator }] = await Promise.all([
    profile.role === "brand"
      ? supabase.from("brands").select("id").eq("profile_id", user.id).single()
      : Promise.resolve({ data: null }),
    profile.role === "creator"
      ? supabase.from("creators").select("id").eq("profile_id", user.id).single()
      : Promise.resolve({ data: null }),
  ]);

  return {
    userId: user.id,
    email: user.email ?? null,
    role: profile.role,
    displayName: profile.display_name,
    handle: profile.handle,
    brandId: brand?.id ?? null,
    creatorId: creator?.id ?? null,
  };
}

export function homeFor(role: UserRole) {
  return role === "brand" ? "/b" : "/c";
}

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}

/** A creator landing on a brand route is sent to their own dashboard, not 404'd. */
export async function requireBrand(): Promise<Viewer & { brandId: string }> {
  const viewer = await requireViewer();
  if (viewer.role !== "brand" || !viewer.brandId) redirect(homeFor(viewer.role));
  return viewer as Viewer & { brandId: string };
}

export async function requireCreator(): Promise<Viewer & { creatorId: string }> {
  const viewer = await requireViewer();
  if (viewer.role !== "creator" || !viewer.creatorId) redirect(homeFor(viewer.role));
  return viewer as Viewer & { creatorId: string };
}
