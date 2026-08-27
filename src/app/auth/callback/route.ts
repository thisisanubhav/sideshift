import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { homeFor } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

/**
 * OAuth return leg.
 *
 * Google tells us who someone is. It does not tell us which side of the
 * marketplace they are on, and this product cannot function without that — a
 * brand landing in the creator app is exactly the kind of ambiguous state the
 * whole build exists to prevent.
 *
 * So the role is chosen on our own page before the redirect, carried across in
 * a short-lived cookie, and claimed here. `claim_role` is a one-shot: it
 * refuses once the account has any campaigns, applications or threads, so it
 * cannot be replayed later to switch sides.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(oauthError)}`,
    );
  }
  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("That sign-in link was incomplete. Try again.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Google sign-in didn't complete. Try again.")}`,
    );
  }

  // The side they picked before leaving for Google.
  const wanted = request.cookies.get("ss_signup_role")?.value;
  let role: UserRole = wanted === "brand" ? "brand" : "creator";

  if (wanted === "brand" || wanted === "creator") {
    const { data } = await supabase.rpc("claim_role", { p_role: wanted });
    if (data === "brand" || data === "creator") role = data;
  } else {
    // Signing in rather than signing up: keep whatever they already are.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user?.id ?? "")
      .maybeSingle();
    if (profile?.role) role = profile.role as UserRole;
  }

  const response = NextResponse.redirect(`${origin}${homeFor(role)}`);
  response.cookies.delete("ss_signup_role");
  return response;
}
