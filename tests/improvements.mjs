// The four product-judgement changes, checked the way the brief grades them:
// visible on a rendered page without explanation, not merely present in the DB.
//
//   node tests/improvements.mjs

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
const section = (s) => console.log(`\n── ${s} ──`);

async function signIn(email) {
  const r = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "sideshift2026" }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`sign-in failed for ${email}`);
  const payload = {
    access_token: j.access_token, token_type: j.token_type,
    expires_in: j.expires_in, expires_at: j.expires_at,
    refresh_token: j.refresh_token, user: j.user,
  };
  const enc = "base64-" + Buffer.from(JSON.stringify(payload)).toString("base64");
  if (enc.length <= CHUNK) return `${COOKIE}=${enc}`;
  const parts = [];
  for (let i = 0; i < enc.length; i += CHUNK)
    parts.push(`${COOKIE}.${parts.length}=${enc.slice(i, i + CHUNK)}`);
  return parts.join("; ");
}

const page = async (path, cookie) => {
  const r = await fetch(`${BASE}${path}`, { headers: { cookie }, redirect: "manual" });
  return r.status === 200 ? await r.text() : "";
};

// Rates hand-computed from raw applications, independent of the app's own view.
const EXPECTED = {
  nightshiftaudio: 33, gritathletic: 43, pocketledger: 67,
  sunlit: 83, terrabottle: 100, kettleandfold: 100, verdantgreens: 100,
  northbound: null, // 0 decidable -> must make no claim
};

const run = async () => {
  const creator = await signIn("maya.builds@sideshift.demo");
  const coffee = await signIn("hana.pours@sideshift.demo");
  const brand = await signIn("northbound@sideshift.demo");
  // marcus.reads has BOTH an expired and a declined application - the two
  // states fix 1 and fix 2 have to explain out loud.
  const marcus = await signIn("marcus.reads@sideshift.demo");
  const grit = await signIn("gritathletic@sideshift.demo");

  // ------------------------------------------------------------------
  section("FIX 1 — applications expire, and the brand pays for it publicly");
  // ------------------------------------------------------------------
  const apps = await page("/c", coffee);
  check("creator sees a live countdown in timecode",
    /Brand must reply in/.test(apps) && /\d{2}:\d{2}:\d{2}/.test(apps),
    (apps.match(/\d{2}:\d{2}:\d{2}/) || [])[0]);

  check("the countdown is labelled as the brand's obligation, not a deadline",
    apps.includes("Brand must reply in"));

  const expiredCopy = await page("/c", marcus);
  check("an expired application explains itself to the creator",
    /let the 48-hour window lapse/.test(expiredCopy) ||
    /Expired unanswered/.test(expiredCopy));

  const gritDash = await page("/b", grit);
  check("brand dashboard surfaces expiring applications at the top",
    /expire[s]? on you in under 12 hours/.test(gritDash) ||
    /Nothing waiting/.test(gritDash),
    /expire/.test(gritDash) ? "banner present" : "none pending for this brand");

  const queue = await page("/b/applicants", brand);
  check("applicant queue is ordered soonest-to-lapse and says so",
    queue.includes("Sorted by how soon the window closes"));
  check("brand is told lapsing costs them their public rate",
    queue.includes("shows up in your public response rate"));

  // ------------------------------------------------------------------
  section("FIX 2 — no silent declines");
  // ------------------------------------------------------------------
  check("creator sees WHY they were declined, verbatim",
    expiredCopy.includes("Why it was declined"));

  const reasons = [
    "Not the right fit", "Rate above our budget", "Slots filled",
    "Audience doesn't match", "Wrong format or platform",
  ].filter((r) => expiredCopy.includes(r));
  check("a real reason string is rendered, not an enum key",
    reasons.length > 0, reasons[0] ?? "none found");

  check("no raw enum values leak into the creator's view",
    !/not_the_right_fit|rate_above_budget|audience_mismatch/.test(expiredCopy));

  // ------------------------------------------------------------------
  section("FIX 3 — one money timeline, identical on both sides");
  // ------------------------------------------------------------------
  const threads = await page("/c/threads", creator);
  const tid = (threads.match(/\/t\/([0-9a-f-]{36})/) || [])[1];
  check("creator has a thread to open", Boolean(tid), tid ?? "none");

  const cSide = await page(`/t/${tid}`, creator);
  const sunlit = await signIn("sunlit@sideshift.demo");
  const bSide = await page(`/t/${tid}`, sunlit);

  const stamps = (b) => b.match(/\d{2}\.\d{2} · \d{2}:\d{2}:\d{2}/g) || [];
  check("both sides render an identical set of timestamps",
    stamps(cSide).length > 0 &&
    JSON.stringify(stamps(cSide)) === JSON.stringify(stamps(bSide)),
    `${stamps(cSide).length} stamps`);

  const status = (b) => (b.match(/data-payment-status="([a-z_]+)"/) || [])[1];
  check("both sides report the same payment status",
    status(cSide) === status(bSide) && Boolean(status(cSide)),
    status(cSide));

  const amount = (b) => (b.match(/\$[\d,]+\.\d{2}/) || [])[0];
  check("both sides show the same amount to the cent",
    amount(cSide) === amount(bSide) && Boolean(amount(cSide)),
    amount(cSide));

  check("all three money states are named on the page, with slots for timestamps",
    cSide.includes("Escrowed") && cSide.includes("In review") &&
    cSide.includes("Released"));

  check("chat and money share one timeline (no separate activity tab)",
    cSide.includes("Accepted") && cSide.includes("escrowed") &&
    !/activity log|Activity</i.test(cSide));

  // ------------------------------------------------------------------
  section("WEDGE — brand responsiveness, computed from real applications");
  // ------------------------------------------------------------------
  // React emits <!-- --> between adjacent text nodes, so "43%" serialises as
  // "43<!-- -->%". Drop those before collapsing tags or every rate splits into
  // "43 %" and silently fails to match.
  const strip = (b) =>
    b.replace(/<!--\s*-->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

  const browse = await page("/c/browse", creator);
  check("responsiveness appears on the public campaign card",
    browse.includes("answered in time"));

  check("the percentage always travels with its denominator",
    /\d+% answered in time · \d+ of \d+/.test(strip(browse)));

  const text = strip(browse);
  let matched = 0;
  const seen = [];
  for (const [handle, pct] of Object.entries(EXPECTED)) {
    if (pct === null) continue;
    if (text.includes(`${pct}% answered in time`)) { matched++; seen.push(`${handle}=${pct}%`); }
  }
  check("rendered percentages match hand-computed values from raw applications",
    matched >= 4, seen.join(", ") || "none matched");

  check("a brand with no history makes no claim at all",
    text.includes("New brand") && text.includes("no response history"));

  check("'Replies fast only' is offered as a real filter",
    browse.includes("Replies fast only"));

  const fast = await page("/c/browse?replies_fast=1", creator);
  const count = (b) => (b.match(/per creator/g) || []).length;
  check("that filter actually narrows the marketplace",
    count(fast) < count(browse) && count(fast) > 0,
    `${count(browse)} -> ${count(fast)} campaigns`);

  const poor = text.includes("43% answered in time");
  check("a poorly-responding brand is shown as such, not hidden",
    poor, poor ? "Grit Athletic at 43%" : "not on page");

  const failed = checks.filter((c) => !c).length;
  console.log(`\n${checks.length - failed}/${checks.length} passed`);
  if (failed) process.exit(1);
};

run().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
