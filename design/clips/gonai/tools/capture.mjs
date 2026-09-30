// Capture the two real GoNai screens this clip uses, at 2x DPR.
//
// SAFETY: this creates one plan through the app, so it must only ever run against a LOCAL
// GoNai dev server with the dev JSON store (no Supabase env). It refuses to run unless
// GET /api/health reports {"store":"json"} and the base URL is localhost.
//
//   # in a checkout of GoNai branch fix/p0-truth-keepalive WITHOUT .env files:
//   env -u SUPABASE_URL -u SUPABASE_SERVICE_KEY GN_DATA_FILE=/tmp/gonai-store.json npx next dev -p 3220
//   # then, here:
//   GONAI_URL=http://localhost:3220 PLAYWRIGHT=<path to playwright/index.mjs> node tools/capture.mjs
//
// Output (git-ignored): work/captures/plan-880.png (880x780 viewport, full page, 2x)
//                       work/captures/share-390.png (390x844 phone, full page, 2x)
import fs from "node:fs";

const B = process.env.GONAI_URL ?? "http://localhost:3220";
const OUT = "work/captures";
const { chromium } = await import(process.env.PLAYWRIGHT ?? "playwright");

if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(B)) throw new Error(`refusing non-local URL ${B}`);
const health = await (await fetch(B + "/api/health")).json();
if (health.store !== "json") throw new Error(`refusing: store is ${health.store}, expected the local json store`);

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const offsite = (p) =>
  p.on("request", (r) => {
    if (!r.url().startsWith(B) && !r.url().startsWith("data:")) throw new Error("off-site request " + r.url());
  });

// 1. Make the plan exactly as a visitor would: work day from Lat Phrao, 450 baht (the app's
//    work default), add Beans Bar Mezzanine (Top 3 card 2) and Grandma's Kitchen (from "more").
const ctx = await browser.newContext({ viewport: { width: 1580, height: 900 } });
await ctx.addInitScript(() => localStorage.setItem("gn_onboarded", "1"));
const p = await ctx.newPage();
offsite(p);
let planId = null;
p.on("response", async (r) => {
  if (r.request().method() === "POST" && r.url().endsWith("/api/plans")) planId = (await r.json()).id;
});
await p.goto(B + "/app?intent=work&origin=ladprao&budget=450", { waitUntil: "networkidle" });
await p.getByRole("button", { name: "+ Add to plan" }).nth(1).click();
await p.waitForTimeout(2000);
await p.getByRole("button", { name: /See 2 more options/ }).click();
await p.waitForTimeout(1200);
await p
  .locator("article, div")
  .filter({ hasText: "Grandma's Kitchen (sample)" })
  .filter({ has: p.getByRole("button", { name: "+ Add to plan" }) })
  .last()
  .getByRole("button", { name: "+ Add to plan" })
  .click();
await p.waitForTimeout(2000);
const plan = await p.evaluate(async (id) => (await fetch("/api/plans/" + id)).json(), planId);
fs.writeFileSync(OUT + "/plan.json", JSON.stringify(plan, null, 2));
const state = await ctx.storageState();
await ctx.close();

// 2. Screens. Reduced motion so entrance animations are finished; the Next.js dev badge is hidden.
async function shot(path, width, height, file, mobile = false) {
  const c = await browser.newContext({
    storageState: state,
    viewport: { width, height },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
    ...(mobile ? { isMobile: true, hasTouch: true } : {}),
  });
  const pg = await c.newPage();
  offsite(pg);
  await pg.goto(B + path, { waitUntil: "networkidle" });
  await pg.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await pg.waitForTimeout(2500);
  await pg.screenshot({ path: `${OUT}/${file}`, fullPage: true });
  await c.close();
}
await shot(`/app/plan/${plan.id}`, 880, 780, "plan-880.png"); // in-app "Your plan"
await shot(plan.share_path, 390, 844, "share-390.png", true); // view-only shared plan on a phone
await browser.close();
console.log("plan", plan.id, "est", plan.est_total, "/", plan.budget_planned);
