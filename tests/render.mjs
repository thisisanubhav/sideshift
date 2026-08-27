// Render audit: real Chromium at 390px and 1280px, checking for sideways
// scroll, console/hydration errors, and where the primary action lands.
//
// Not wired into package.json because it needs a browser the other suites
// don't:  npm i -D playwright && npx playwright install chromium
//
//   node tests/render.mjs
//
// This is what caught the hydration mismatch on /b/applicants and the
// invisible 9:16 tiles - neither was findable by asserting on HTML.

import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "https://sideshift-seven.vercel.app";
const REF = "ekjmytmifvanmifaxyfn";
const SB = `https://${REF}.supabase.co`;
const KEY = "sb_publishable_PbEqThbinY0Rdi7n8isO6w_pXA14wrI";
const COOKIE = `sb-${REF}-auth-token`;
const CHUNK = 3180;
const OUT = new URL(".", import.meta.url).pathname;

async function session(email) {
  const r = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "sideshift2026" }),
  });
  const j = await r.json();
  const payload = {
    access_token: j.access_token, token_type: j.token_type,
    expires_in: j.expires_in, expires_at: j.expires_at,
    refresh_token: j.refresh_token, user: j.user,
  };
  const enc = "base64-" + Buffer.from(JSON.stringify(payload)).toString("base64");
  const out = [];
  if (enc.length <= CHUNK) out.push({ name: COOKIE, value: enc });
  else {
    for (let i = 0, n = 0; i < enc.length; i += CHUNK, n++)
      out.push({ name: `${COOKIE}.${n}`, value: enc.slice(i, i + CHUNK) });
  }
  return out.map((c) => ({
    ...c, domain: "sideshift-seven.vercel.app", path: "/",
    httpOnly: false, secure: true, sameSite: "Lax",
  }));
}

const report = [];

async function shoot(browser, { name, email, path, width, height = 900 }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    isMobile: width < 500,
    hasTouch: width < 500,
  });
  await ctx.addCookies(await session(email));
  const page = await ctx.newPage();

  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);

  // Does the page scroll sideways? The quality floor says it must not.
  const overflow = await page.evaluate(() => {
    const de = document.documentElement;
    const offenders = [];
    for (const el of document.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > de.clientWidth + 1) {
        let p = el.parentElement, scrollable = false;
        while (p) {
          const ov = getComputedStyle(p).overflowX;
          if (ov === "auto" || ov === "scroll") { scrollable = true; break; }
          p = p.parentElement;
        }
        if (!scrollable) {
          offenders.push(`${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ")[0]} right=${Math.round(r.right)}`);
        }
      }
    }
    return {
      docScrollW: de.scrollWidth,
      clientW: de.clientWidth,
      scrollsSideways: de.scrollWidth > de.clientWidth + 1,
      offenders: offenders.slice(0, 5),
    };
  });

  // Is the primary action reachable without scrolling past everything?
  const primary = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button, a")].find((b) =>
      /Approve and release|Send application|Accept and escrow|Submit for review/.test(b.textContent || ""),
    );
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    return { label: btn.textContent.trim().slice(0, 40), top: Math.round(r.top + window.scrollY) };
  });

  const file = `${OUT}${name}.png`;
  await page.screenshot({ path: file, fullPage: true });
  const tallness = await page.evaluate(() => document.documentElement.scrollHeight);

  report.push({ name, width, overflow, primary, tallness, errors });
  await ctx.close();
  return file;
}

const browser = await chromium.launch();

const shots = [
  { name: "01-thread-390",     email: "maya.builds@sideshift.demo", path: "/t/c310d3d8-31fa-4e1d-9ac9-70f4b9bcf117", width: 390 },
  { name: "02-thread-1280",    email: "maya.builds@sideshift.demo", path: "/t/c310d3d8-31fa-4e1d-9ac9-70f4b9bcf117", width: 1280 },
  { name: "03-browse-390",     email: "maya.builds@sideshift.demo", path: "/c/browse", width: 390 },
  { name: "04-browse-1280",    email: "maya.builds@sideshift.demo", path: "/c/browse", width: 1280 },
  { name: "05-branddash-390",  email: "gritathletic@sideshift.demo", path: "/b", width: 390 },
  { name: "06-branddash-1280", email: "gritathletic@sideshift.demo", path: "/b", width: 1280 },
  { name: "07-applicants-390", email: "northbound@sideshift.demo",  path: "/b/applicants", width: 390 },
  { name: "08-apply-390",      email: "maya.builds@sideshift.demo", path: "/c/browse", width: 390 },
];

for (const s of shots) {
  try { await shoot(browser, s); } catch (e) { report.push({ name: s.name, error: String(e).slice(0, 200) }); }
}
await browser.close();

console.log("\n=== RENDER REPORT ===");
for (const r of report) {
  if (r.error) { console.log(`\n${r.name}: ERROR ${r.error}`); continue; }
  const ov = r.overflow;
  console.log(`\n${r.name}  (${r.width}px)`);
  console.log(`  sideways scroll: ${ov.scrollsSideways ? `YES — ${ov.docScrollW} > ${ov.clientW}` : "no"}`);
  if (ov.offenders.length) console.log(`  offenders: ${ov.offenders.join(" | ")}`);
  console.log(`  page height: ${r.tallness}px`);
  if (r.primary) console.log(`  primary action "${r.primary.label}" at y=${r.primary.top}`);
  if (r.errors.length) console.log(`  console errors: ${r.errors.slice(0, 3).join(" | ")}`);
}
fs.writeFileSync(`${OUT}report.json`, JSON.stringify(report, null, 2));
