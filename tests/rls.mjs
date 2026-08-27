// Row-level security proofs.
//
// These talk to PostgREST directly with real user JWTs — no app, no UI. That is
// the point: hiding a button is not access control, so every assertion here is
// the request a hostile client would actually make.
//
//   node tests/rls.mjs
//
// Requires the seeded demo accounts (supabase/seed.sql).

const REF = process.env.SUPABASE_REF ?? "ekjmytmifvanmifaxyfn";
const SB = `https://${REF}.supabase.co`;
const KEY =
  process.env.SUPABASE_ANON_KEY ?? "sb_publishable_PbEqThbinY0Rdi7n8isO6w_pXA14wrI";
const PASSWORD = "sideshift2026";

const checks = [];
function check(name, pass, detail = "") {
  checks.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

async function signIn(email) {
  const r = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`sign-in failed for ${email}`);
  return j.access_token;
}

function api(token) {
  const headers = {
    apikey: KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  return {
    get: async (path) => {
      const r = await fetch(`${SB}/rest/v1/${path}`, { headers });
      return { status: r.status, body: await r.json().catch(() => null) };
    },
    post: async (path, body) => {
      const r = await fetch(`${SB}/rest/v1/${path}`, {
        method: "POST", headers, body: JSON.stringify(body),
      });
      return { status: r.status, body: await r.text() };
    },
    patch: async (path, body) => {
      const r = await fetch(`${SB}/rest/v1/${path}`, {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify(body),
      });
      return { status: r.status, body: await r.text() };
    },
  };
}

const run = async () => {
  // maya has a thread; rowan is an unrelated creator; sunlit owns maya's
  // campaign; northbound is an unrelated brand.
  const [mayaT, rowanT, sunlitT, northT] = await Promise.all([
    signIn("maya.builds@sideshift.demo"),
    signIn("rowanlifts@sideshift.demo"),
    signIn("sunlit@sideshift.demo"),
    signIn("northbound@sideshift.demo"),
  ]);
  const maya = api(mayaT), rowan = api(rowanT);
  const sunlit = api(sunlitT), north = api(northT);

  // ---------------------------------------------------------------------
  // 1. A creator cannot read another creator's thread. (Required by brief.)
  // ---------------------------------------------------------------------
  const mine = await maya.get("threads?select=id,campaign_id");
  const mayaThread = mine.body?.[0]?.id;
  check("setup: maya can read her own thread", Boolean(mayaThread), mayaThread ?? "none");

  const stolen = await rowan.get(`threads?select=id&id=eq.${mayaThread}`);
  check(
    "a creator CANNOT read another creator's thread",
    stolen.status === 200 && Array.isArray(stolen.body) && stolen.body.length === 0,
    `${stolen.status}, ${stolen.body?.length ?? "?"} rows`,
  );

  // ---------------------------------------------------------------------
  // 2. …nor its messages, nor can they post into it.
  // ---------------------------------------------------------------------
  const msgs = await rowan.get(`messages?select=id&thread_id=eq.${mayaThread}`);
  check(
    "a creator CANNOT read messages in another creator's thread",
    msgs.status === 200 && msgs.body?.length === 0,
    `${msgs.body?.length ?? "?"} rows`,
  );

  const rowanProfile = await rowan.get("profiles?select=id&limit=1");
  const intrusion = await rowan.post("messages", {
    thread_id: mayaThread,
    sender_profile_id: rowanProfile.body?.[0]?.id,
    body: "This message should never be stored.",
  });
  check(
    "a creator CANNOT post a message into another creator's thread",
    intrusion.status === 401 || intrusion.status === 403,
    `${intrusion.status}`,
  );

  const pay = await rowan.get(`payments?select=id&thread_id=eq.${mayaThread}`);
  check(
    "a creator CANNOT read the payment on another creator's thread",
    pay.status === 200 && pay.body?.length === 0,
    `${pay.body?.length ?? "?"} rows`,
  );

  // ---------------------------------------------------------------------
  // 3. A brand only sees applications to its own campaigns.
  // ---------------------------------------------------------------------
  const sunlitApps = await sunlit.get("applications?select=id,campaign_id");
  const northApps = await north.get("applications?select=id,campaign_id");
  const sunlitIds = new Set((sunlitApps.body ?? []).map((a) => a.id));
  const overlap = (northApps.body ?? []).filter((a) => sunlitIds.has(a.id));
  check(
    "a brand CANNOT see another brand's applications",
    overlap.length === 0,
    `${sunlitApps.body?.length ?? 0} vs ${northApps.body?.length ?? 0}, overlap ${overlap.length}`,
  );

  // ---------------------------------------------------------------------
  // 4. The interesting one: a creator cannot promote their own application.
  //    This is the escalation an RLS-by-hiding-the-button app actually has.
  // ---------------------------------------------------------------------
  const own = await maya.get("applications?select=id,status&status=eq.pending&limit=1");
  const anyOwn = await maya.get("applications?select=id,status&limit=1");
  const target = own.body?.[0]?.id ?? anyOwn.body?.[0]?.id;

  const escalate = await maya.patch(`applications?id=eq.${target}`, {
    status: "accepted",
  });
  const changed = (() => {
    try { return JSON.parse(escalate.body)?.length > 0; } catch { return false; }
  })();
  check(
    "a creator CANNOT set their own application to accepted",
    !changed,
    `${escalate.status}, ${changed ? "ROW CHANGED" : "no rows changed"}`,
  );

  // ---------------------------------------------------------------------
  // 5. …nor release their own money by editing the payments row.
  // ---------------------------------------------------------------------
  const myPay = await maya.get("payments?select=id,status&limit=1");
  const payId = myPay.body?.[0]?.id;
  if (payId) {
    const grab = await maya.patch(`payments?id=eq.${payId}`, { status: "released" });
    const moved = (() => {
      try { return JSON.parse(grab.body)?.length > 0; } catch { return false; }
    })();
    check(
      "a creator CANNOT mark their own payment released",
      !moved,
      `${grab.status}, ${moved ? "ROW CHANGED" : "no rows changed"}`,
    );
  }

  // ---------------------------------------------------------------------
  // 6. Draft campaigns are invisible to everyone but their owner.
  // ---------------------------------------------------------------------
  const drafts = await maya.get("campaigns?select=id,status&status=eq.draft");
  check(
    "a creator CANNOT see draft campaigns",
    drafts.status === 200 && drafts.body?.length === 0,
    `${drafts.body?.length ?? "?"} rows`,
  );

  const failed = checks.filter((c) => !c.pass);
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) process.exit(1);
};

run().catch((e) => {
  console.error("ERROR", e.message);
  process.exit(1);
});
