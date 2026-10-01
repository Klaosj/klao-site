// capture.mjs — make the round-1 plan on a LOCAL GoNai dev server (JSON store) and capture
// reference renders + DOM + CSS for the sting rebuild.
//
// SAFETY: refuses to run unless the base URL is localhost and /api/health reports store "json".
// Every browser request that leaves the local server aborts the run.
//
//   GONAI_URL=http://localhost:3240 PLAYWRIGHT=<playwright/index.mjs> OUT=<dir> node capture.mjs
import fs from "node:fs";
import path from "node:path";

const B = process.env.GONAI_URL ?? "http://localhost:3240";
const OUT = process.env.OUT ?? "captures";
const { chromium } = await import(process.env.PLAYWRIGHT ?? "playwright");

if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(B)) throw new Error(`refusing non-local URL ${B}`);
const health = await (await fetch(B + "/api/health")).json();
if (health.store !== "json") throw new Error(`refusing: store is ${health.store}, expected the local json store`);

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "chrome" });
const offsite = (p) =>
  p.on("request", (r) => {
    if (!r.url().startsWith(B) && !r.url().startsWith("data:")) {
      console.error("off-site request " + r.url());
      process.exit(2);
    }
  });

// 1. The plan, made as a visitor would (same steps as round 1's capture):
//    work day from Lat Phrao, 450 baht, Beans Bar Mezzanine (Top 3 card 2) + Grandma's Kitchen (from "more").
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
fs.writeFileSync(path.join(OUT, "plan.json"), JSON.stringify(plan, null, 2));
const state = await ctx.storageState();
fs.writeFileSync(path.join(OUT, "state.json"), JSON.stringify(state)); // local dev cookie only
await ctx.close();

// 2. Renders. Reduced motion so entrance animations are finished; the Next.js dev badge hidden.
async function shot(url, width, height, name, { mobile = false, dpr = 3 } = {}) {
  const c = await browser.newContext({
    storageState: state,
    viewport: { width, height },
    deviceScaleFactor: dpr,
    reducedMotion: "reduce",
    ...(mobile ? { isMobile: true, hasTouch: true } : {}),
  });
  const pg = await c.newPage();
  offsite(pg);
  await pg.goto(B + url, { waitUntil: "networkidle" });
  await pg.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await pg.evaluate(() => document.fonts.ready);
  await pg.waitForTimeout(2500);
  // viewport shot, not fullPage: a fullPage capture re-lays the page out and Chrome then draws the
  // stop card's ☕ (inside .o-mono) from Menlo in monochrome, which a visitor never sees
  await pg.screenshot({ path: path.join(OUT, `${name}.png`) });
  // boxes of the parts the sting rebuilds (CSS px, page coordinates)
  const boxes = await pg.evaluate(() => {
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: +b.x.toFixed(2), y: +(b.y + scrollY).toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2) };
    };
    const q = (s) => document.querySelector(s);
    const qa = (s) => [...document.querySelectorAll(s)];
    return {
      h1: r(q("main h1") ?? q("h1")),
      cards: qa(".gn-card-e").map(r),
      banner: r(q(".gn-warn-banner")),
      bar: r(q(".gn-bar")),
      barTrack: r(q(".gn-bar")?.parentElement),
      doc: { w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight },
    };
  });
  const html = await pg.evaluate(() => (document.querySelector("main") ?? document.body).outerHTML);
  fs.writeFileSync(path.join(OUT, `${name}.boxes.json`), JSON.stringify(boxes, null, 2));
  fs.writeFileSync(path.join(OUT, `${name}.html`), html);
  if (name.startsWith("plan-390")) {
    // the app's compiled CSS as served (Tailwind v4 output + globals.css + next/font faces)
    const css = await pg.evaluate(async () => {
      const out = [];
      for (const l of document.querySelectorAll('link[rel="stylesheet"]')) out.push(await (await fetch(l.href)).text());
      for (const s of document.querySelectorAll("style")) out.push(s.textContent);
      return out.join("\n/* ---- */\n");
    });
    fs.writeFileSync(path.join(OUT, "app.css"), css);
  }
  await c.close();
  console.log(name, JSON.stringify(boxes.doc));
}

await shot(`/app/plan/${plan.id}`, 390, 1200, "plan-390", { mobile: true });
const widths = (process.env.WIDTHS ?? "402,512").split(",").map(Number);
for (const w of widths) await shot(`/app/plan/${plan.id}`, w, 1200, `plan-${w}`, { mobile: w < 640 });
await shot(plan.share_path, 390, 844, "share-390", { mobile: true });
await browser.close();
console.log("plan", plan.id, "est", plan.est_total, "/", plan.budget_planned);
