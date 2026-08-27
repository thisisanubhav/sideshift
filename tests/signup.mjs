// Proves the two-browser walkthrough can actually start: a brand-new account
// signs up and is immediately usable, with no email round-trip.
//
//   node tests/signup.mjs

const REF = process.env.SUPABASE_REF ?? "ekjmytmifvanmifaxyfn";
const SB = `https://${REF}.supabase.co`;
const KEY =
  process.env.SUPABASE_ANON_KEY ?? "sb_publishable_PbEqThbinY0Rdi7n8isO6w_pXA14wrI";
const BASE = process.argv[2] || "https://sideshift-seven.vercel.app";
const COOKIE = `sb-${REF}-auth-token`;
const CHUNK = 3180;

const checks = [];
const check = (n, p, d = "") => {
  checks.push(p);
  console.log(`${p ? "PASS" : "FAIL"}  ${n}${d ? `  — ${d}` : ""}`);
};

const stamp = Date.now().toString(36);

async function signUp(role, handle) {
  const email = `qa.${handle}.${stamp}@sideshift.test`;
  const r = await fetch(`${SB}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password: "walkthrough2026",
      data: { role, display_name: `QA ${role}`, handle: `${handle}${stamp}` },
    }),
  });
  return { email, status: r.status, body: await r.json() };
}

async function signIn(email) {
  const r = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "walkthrough2026" }),
  });
  return { status: r.status, body: await r.json() };
}

function cookieFor(session) {
  const payload = {
    access_token: session.access_token, token_type: session.token_type,
    expires_in: session.expires_in, expires_at: session.expires_at,
    refresh_token: session.refresh_token, user: session.user,
  };
  const enc = "base64-" + Buffer.from(JSON.stringify(payload)).toString("base64");
  if (enc.length <= CHUNK) return `${COOKIE}=${enc}`;
  const parts = [];
  for (let i = 0; i < enc.length; i += CHUNK)
    parts.push(`${COOKIE}.${parts.length}=${enc.slice(i, i + CHUNK)}`);
  return parts.join("; ");
}

const run = async () => {
  // --- brand ---
  const b = await signUp("brand", "qabrand");
  check("brand signup accepted", b.status === 200, `${b.status}`);
  check("signup stamped email_confirmed_at (no email round-trip)",
    Boolean(b.body?.confirmed_at || b.body?.email_confirmed_at ||
            b.body?.user?.email_confirmed_at),
    b.body?.confirmed_at ?? b.body?.email_confirmed_at ?? "none");

  const bIn = await signIn(b.email);
  check("brand can sign in immediately after signup",
    Boolean(bIn.body?.access_token), `${bIn.status}`);

  const bCookie = cookieFor(bIn.body);
  const bDash = await fetch(`${BASE}/b`, {
    headers: { cookie: bCookie }, redirect: "manual",
  });
  check("brand lands on the brand dashboard", bDash.status === 200, `${bDash.status}`);
  const bHtml = bDash.status === 200 ? await bDash.text() : "";
  check("new brand sees the empty state, not a blank page",
    bHtml.includes("No campaigns yet"));

  // --- creator ---
  const c = await signUp("creator", "qacreator");
  check("creator signup accepted", c.status === 200, `${c.status}`);

  const cIn = await signIn(c.email);
  check("creator can sign in immediately after signup",
    Boolean(cIn.body?.access_token), `${cIn.status}`);

  const cCookie = cookieFor(cIn.body);
  const cBrowse = await fetch(`${BASE}/c/browse`, {
    headers: { cookie: cCookie }, redirect: "manual",
  });
  check("creator lands on browse", cBrowse.status === 200, `${cBrowse.status}`);
  const cHtml = cBrowse.status === 200 ? await cBrowse.text() : "";
  check("creator sees the seeded marketplace", cHtml.includes("per creator"));

  // --- the signup trigger built both role rows ---
  const prof = await fetch(
    `${SB}/rest/v1/profiles?select=role,handle&handle=eq.qabrand${stamp}`,
    { headers: { apikey: KEY, Authorization: `Bearer ${bIn.body.access_token}` } },
  );
  const profJson = await prof.json();
  check("signup trigger created the profile with the chosen role",
    profJson?.[0]?.role === "brand", JSON.stringify(profJson?.[0] ?? {}));

  const brandRow = await fetch(
    `${SB}/rest/v1/brands?select=id&profile_id=eq.${bIn.body.user.id}`,
    { headers: { apikey: KEY, Authorization: `Bearer ${bIn.body.access_token}` } },
  );
  check("signup trigger created the brands row",
    (await brandRow.json())?.length === 1);

  console.log(`\nCreated: ${b.email} / ${c.email}  (password walkthrough2026)`);
  const failed = checks.filter((x) => !x).length;
  console.log(`${checks.length - failed}/${checks.length} passed`);
  if (failed) process.exit(1);
};

run().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
