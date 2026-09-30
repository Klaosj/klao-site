// Capture the real Aje screen the clip uses, from a running Aje dev server (never a live model call).
//   AJE_URL            the running Aje web app (default http://localhost:3210; `cd web && npx next dev -p 3210`)
//   PLAYWRIGHT_MODULE  path to playwright's index.mjs (default: the `playwright` package)
// State: a fresh browser profile (empty localStorage) -> "See an example first" adds Aje's built-in example idea
// ("Dental LINE receptionist (example)", one test already reviewed) -> Next steps -> "Choose another test" ->
// the reviewed test "Talk to 5 clinic owners" -> back to the top of the page. Viewport 1280x900 at 2x DPR.
// The only thing hidden is Next.js's dev-tools badge (nextjs-portal), which is not part of Aje.
import fs from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const BASE = process.env.AJE_URL || 'http://localhost:3210';
const OUT = process.env.OUT_DIR || 'work/raw';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const modelCalls = [];
page.on('request', (r) => { const u = r.url(); if (u.includes('/api/') && !u.endsWith('/api/status')) modelCalls.push(u); });
const hideDevBadge = () => page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });

await page.goto(BASE + '/app', { waitUntil: 'networkidle' });
await hideDevBadge();
await page.waitForTimeout(1000);
await page.getByRole('button', { name: /See an example/ }).first().click();
await page.waitForTimeout(1500);
await page.getByRole('button', { name: /^Next steps/ }).last().click();
await page.waitForTimeout(1500);
await page.locator('summary', { hasText: 'Choose another test' }).click();
await page.waitForTimeout(500);
await page.locator('button[aria-pressed]', { hasText: 'Talk to 5 clinic owners' }).click();
await page.waitForTimeout(1500);
await page.mouse.move(1275, 250); // park the pointer on blank page so nothing shows a hover state
await page.evaluate(() => window.scrollTo(0, 0));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(2500); // entrances and the check-mark draw settle
await hideDevBadge();
await page.screenshot({ path: `${OUT}/next-steps-graded.png` });
const geo = await page.evaluate(() => {
  const box = (sel, re) => { const el = [...document.querySelectorAll(sel)].find((e) => re.test(e.textContent || '')); if (!el) return null; const r = el.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map((n) => Math.round(n * 10) / 10); };
  return { name: box('.vn', /Dental LINE receptionist/), level: box('header *', /^Level 3 of 9/), note: box('article.quest.focus div', /^Problem and Customer moved/), addMore: box('button', /^Add more evidence/), scrollY };
});
fs.writeFileSync(`${OUT}/next-steps-graded.json`, JSON.stringify(geo, null, 2));
console.log(JSON.stringify(geo), 'api calls besides /api/status:', modelCalls.length);
await browser.close();
