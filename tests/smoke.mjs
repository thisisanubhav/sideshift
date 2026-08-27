// End-to-end smoke test against the live deploy, signed in as seeded users.
// Builds the @supabase/ssr auth cookie by hand so we can curl real pages.

const BASE = process.argv[2] || "https://sideshift-seven.vercel.app";
const REF = "ekjmytmifvanmifaxyfn";
const URL_SB = `https://${REF}.supabase.co`;
const KEY = "sb_publishable_PbEqThbinY0Rdi7n8isO6w_pXA14wrI";
const COOKIE = `sb-${REF}-auth-token`;
const CHUNK = 3180;

async function signIn(email) {
  const r = await fetch(`${URL_SB}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "sideshift2026" }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`sign-in failed for ${email}: ${JSON.stringify(j)}`);
  return j;
}

function cookieHeader(session) {
  const payload = {
    access_token: session.access_token,
    token_type: session.token_type,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    refresh_token: session.refresh_token,
    user: session.user,
  };
  const encoded = "base64-" + Buffer.from(JSON.stringify(payload)).toString("base64");
  if (encoded.length <= CHUNK) return `${COOKIE}=${encoded}`;
  const parts = [];
  for (let i = 0; i < encoded.length; i += CHUNK) {
    parts.push(`${COOKIE}.${parts.length}=${encoded.slice(i, i + CHUNK)}`);
  }
  return parts.join("; ");
}

async function get(path, cookie) {
  const r = await fetch(`${BASE}${path}`, {
    headers: cookie ? { cookie } : {},
    redirect: "manual",
  });
  const body = r.status === 200 ? await r.text() : "";
  return { status: r.status, location: r.headers.get("location"), body };
}

// Tags are stripped before matching: numbers render inside mono spans, so
// "4 of 5 slots left" is split across elements in the raw HTML.
const text = (html) =>
  html.replace(/<!--\s*-->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const checks = [];
function check(name, pass, detail = "") {
  checks.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const run = async () => {
  // 1. Anonymous users are bounced off app routes.
  for (const p of ["/b", "/c", "/c/browse", "/t/whatever"]) {
    const r = await get(p);
    check(`anon ${p} redirects to login`,
      r.status === 307 && (r.location || "").includes("/login"),
      `${r.status} ${r.location ?? ""}`);
  }

  // 2. Creator side.
  const creator = await signIn("maya.builds@sideshift.demo");
  const cc = cookieHeader(creator);

  const browse = await get("/c/browse", cc);
  check("creator /c/browse renders", browse.status === 200, `${browse.status}`);
  check("browse lists a seeded campaign",
    browse.body.includes("Barrier repair") || browse.body.includes("Pour-over"));
  check("browse shows a responsiveness rate",
    browse.body.includes("answered in time"));
  check("browse shows the new-brand state or a rate",
    browse.body.includes("answered in time") || browse.body.includes("no response history"));
  check("browse shows slots left", /\d+ of \d+ slots? left|All slots filled/.test(text(browse.body)));

  const filtered = await get("/c/browse?platform=shorts", cc);
  check("platform filter actually filters",
    filtered.status === 200 && !filtered.body.includes("Barrier repair"),
    "TikTok campaign absent when filtering to Shorts");

  const fast = await get("/c/browse?replies_fast=1", cc);
  check("replies-fast filter returns fewer than unfiltered",
    (fast.body.match(/per creator/g) || []).length <
    (browse.body.match(/per creator/g) || []).length);

  const apps = await get("/c", cc);
  check("creator applications page renders", apps.status === 200);
  check("declined application shows its reason to the creator",
    apps.body.includes("Why it was declined"));

  // 3. Brand side.
  const brand = await signIn("northbound@sideshift.demo");
  const bc = cookieHeader(brand);

  const dash = await get("/b", bc);
  check("brand dashboard renders", dash.status === 200);
  check("dashboard shows committed vs released", dash.body.includes("Committed") && dash.body.includes("Released"));

  const queue = await get("/b/applicants", bc);
  check("applicant queue renders", queue.status === 200);
  check("queue shows a pending applicant with a countdown",
    queue.body.includes("Brand must reply in"));

  // 4. Cross-role guards.
  const creatorOnBrand = await get("/b", cc);
  check("creator hitting /b is redirected to /c",
    creatorOnBrand.status === 307 && (creatorOnBrand.location || "").includes("/c"),
    `${creatorOnBrand.status} ${creatorOnBrand.location ?? ""}`);

  const brandOnCreator = await get("/c/browse", bc);
  check("brand hitting /c/browse is redirected to /b",
    brandOnCreator.status === 307 && (brandOnCreator.location || "").includes("/b"),
    `${brandOnCreator.status} ${brandOnCreator.location ?? ""}`);

  const failed = checks.filter((c) => !c.pass);
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) process.exit(1);
};

run().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
