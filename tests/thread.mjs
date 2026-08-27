// Phase 3: drive the full thread lifecycle through the real HTTP app, as two
// different signed-in users, and assert both sides read the same state.

const BASE = process.argv[2];
const THREAD = "c310d3d8-31fa-4e1d-9ac9-70f4b9bcf117";
const REF = "ekjmytmifvanmifaxyfn";
const SB = `https://${REF}.supabase.co`;
const KEY = "sb_publishable_PbEqThbinY0Rdi7n8isO6w_pXA14wrI";
const COOKIE = `sb-${REF}-auth-token`;
const CHUNK = 3180;

const checks = [];
const check = (n, p, d = "") => {
  checks.push(p);
  console.log(`${p ? "PASS" : "FAIL"}  ${n}${d ? `  — ${d}` : ""}`);
};

async function signIn(email) {
  const r = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "sideshift2026" }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`sign-in failed ${email}`);
  const payload = {
    access_token: j.access_token, token_type: j.token_type,
    expires_in: j.expires_in, expires_at: j.expires_at,
    refresh_token: j.refresh_token, user: j.user,
  };
  const enc = "base64-" + Buffer.from(JSON.stringify(payload)).toString("base64");
  let cookie;
  if (enc.length <= CHUNK) cookie = `${COOKIE}=${enc}`;
  else {
    const parts = [];
    for (let i = 0; i < enc.length; i += CHUNK)
      parts.push(`${COOKIE}.${parts.length}=${enc.slice(i, i + CHUNK)}`);
    cookie = parts.join("; ");
  }
  return { cookie, token: j.access_token };
}

const page = async (path, cookie) => {
  const r = await fetch(`${BASE}${path}`, { headers: { cookie }, redirect: "manual" });
  return { status: r.status, body: r.status === 200 ? await r.text() : "", loc: r.headers.get("location") };
};

// Call a Postgres RPC as that user — the same function the server action calls.
const rpc = async (fn, args, token) => {
  const r = await fetch(`${SB}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  return { ok: r.ok, status: r.status, body: await r.text() };
};

const run = async () => {
  const creator = await signIn("maya.builds@sideshift.demo");
  const brand = await signIn("sunlit@sideshift.demo");
  const stranger = await signIn("rowanlifts@sideshift.demo");

  // --- the thread renders for both participants ---
  const c1 = await page(`/t/${THREAD}`, creator.cookie);
  const b1 = await page(`/t/${THREAD}`, brand.cookie);
  check("creator can open the thread", c1.status === 200, `${c1.status}`);
  check("brand can open the thread", b1.status === 200, `${b1.status}`);
  check("brief is pinned in the thread", c1.body.includes("The brief") && c1.body.includes("Barrier Serum"));
  check("spine shows the accept event", c1.body.includes("Accepted"));
  check("spine shows the seeded opening message", c1.body.includes("Welcome aboard"));

  // --- RLS: a third creator cannot read it ---
  const s1 = await page(`/t/${THREAD}`, stranger.cookie);
  check("a non-participant creator gets 404, not the thread",
    s1.status === 404, `${s1.status}`);

  // --- both sides agree on the money, before ---
  const amount = "$450.00";
  check("creator sees the escrowed amount", c1.body.includes(amount));
  check("brand sees the same amount", b1.body.includes(amount));
  check("both sides show Escrowed",
    c1.body.includes("Escrowed") && b1.body.includes("Escrowed"));

  // --- creator submits a deliverable ---
  const sub = await rpc("submit_deliverable", {
    p_thread_id: THREAD,
    p_delivery_url: "https://drive.google.com/file/d/demo-barrier-v1",
    p_note: "First cut, day 14. Pilling shows at 0:11 as promised.",
  }, creator.token);
  check("creator can submit a deliverable", sub.ok, `${sub.status}`);

  const c2 = await page(`/t/${THREAD}`, creator.cookie);
  const b2 = await page(`/t/${THREAD}`, brand.cookie);
  const payStatus = (r) => ((r.body ?? r).match(/data-payment-status="([a-z_]+)"/) || [])[1];
  check("submission moves money to In review on the creator side", payStatus(c2) === "in_review", payStatus(c2));
  check("…and on the brand side too", payStatus(b2) === "in_review", payStatus(b2));
  check("brand is offered the approve action with the amount",
    b2.body.includes("Approve and release"));
  check("creator is NOT offered the approve action",
    !c2.body.includes("Approve and release"));

  // --- privilege escalation: creator tries to approve their own work ---
  const del = JSON.parse(sub.body || '""');
  const steal = await rpc("approve_deliverable", { p_deliverable_id: del }, creator.token);
  check("creator CANNOT approve their own deliverable", !steal.ok, `${steal.status}`);

  // --- brand requests changes, then approves ---
  const rc = await rpc("request_changes", {
    p_deliverable_id: del, p_note: "Say fragrance-free in the first five seconds, not at 0:09.",
  }, brand.token);
  check("brand can request changes", rc.ok, `${rc.status}`);

  const c3 = await page(`/t/${THREAD}`, creator.cookie);
  check("change request appears on the creator's spine", c3.body.includes("Changes requested"));
  check("money returns to Escrowed after a change request",
    payStatus(c3) === "escrowed", payStatus(c3));

  const sub2 = await rpc("submit_deliverable", {
    p_thread_id: THREAD,
    p_delivery_url: "https://drive.google.com/file/d/demo-barrier-v2",
    p_note: "v2 — fragrance-free is now the first line.",
  }, creator.token);
  check("creator can submit v2", sub2.ok, `${sub2.status}`);
  const del2 = JSON.parse(sub2.body || '""');

  const ap = await rpc("approve_deliverable", { p_deliverable_id: del2 }, brand.token);
  check("brand can approve", ap.ok, `${ap.status}`);

  // --- both sides, after ---
  const c4 = await page(`/t/${THREAD}`, creator.cookie);
  const b4 = await page(`/t/${THREAD}`, brand.cookie);
  check("creator sees Released", payStatus(c4) === "released", payStatus(c4));
  check("brand sees Released", payStatus(b4) === "released", payStatus(b4));
  check("payment-released event is on the spine", c4.body.includes("Payment released"));
  check("thread reads Complete on both sides",
    c4.body.includes("Complete") && b4.body.includes("Complete"));

  // the timestamp both sides quote must be byte-identical
  const stampRe = /Released<\/dt><dd[^>]*>([^<]+)</;
  const cs = c4.body.match(/(\d{2}\.\d{2} · \d{2}:\d{2}:\d{2})/g) || [];
  const bs = b4.body.match(/(\d{2}\.\d{2} · \d{2}:\d{2}:\d{2})/g) || [];
  check("both sides render the identical set of timestamps",
    cs.length > 0 && JSON.stringify(cs) === JSON.stringify(bs),
    `${cs.length} stamps, match=${JSON.stringify(cs) === JSON.stringify(bs)}`);

  const failed = checks.filter((c) => !c).length;
  console.log(`\n${checks.length - failed}/${checks.length} passed`);
  if (failed) process.exit(1);
};

run().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
