// fidelity.mjs — render the rebuilt components (sting-16x9/ui.css + ui.js) at the same CSS width
// and DPR as the app captures, and save screenshots + card boxes for tools/fidelity.py.
//
//   PLAYWRIGHT=<playwright/index.mjs> node source/tools/fidelity.mjs <captures dir> <out dir>
// Captures come from tools/capture.mjs (plan-<w>.png/.boxes.json, share-390.png/.boxes.json).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ui = path.join(here, "..", "sting-16x9");
const [, , CAP, OUT] = process.argv;
fs.mkdirSync(OUT, { recursive: true });
const { chromium } = await import(process.env.PLAYWRIGHT ?? "playwright");
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "chrome" });

// same document shell as app/layout.tsx (+ app/app/layout.tsx main) for the plan page,
// and app/p/[id]/page.tsx for the share page
function page(kind) {
  const body =
    kind === "plan"
      ? `<main class="pb-16 sm:pb-0"><div class="mx-auto max-w-[1500px] space-y-4 px-4 py-4">
           <div id="h"></div>
           <div class="flex rounded-[11px] bg-bg-elev p-1"><button aria-current="page" class="gn-press flex-1 rounded-lg py-2 text-[13px] font-bold bg-pill text-bg">🗓 Plan + route</button><button class="gn-press flex-1 rounded-lg py-2 text-[13px] font-bold text-mut opacity-50">🧭 On the trip</button></div>
           <div class="gn-slide-l mx-auto max-w-2xl space-y-4"><div id="r"></div><ol class="space-y-3" id="s"></ol><div id="m"></div></div>
         </div></main>`
      : `<div class="min-h-screen bg-bg px-4 py-8 text-ink"><div class="mx-auto max-w-md"><div class="mb-6 text-center" style="height:48px"></div><div id="c"></div></div></div>`;
  return `<!doctype html><html lang="th" class="__variable_3237e5 __variable_b4c22e"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="ui.css"></head>
    <body class="min-h-screen bg-bg text-ink antialiased" style="font-family: var(--font-plex-thai), system-ui, sans-serif">${body}
    <script src="ui.js"></script><script>
      const $ = (id) => document.getElementById(id);
      const swap = (id, html) => { const el = $(id); if (el) el.outerHTML = html; };
      swap('h', GN.planHeader()); swap('r', GN.routeCard('route'));
      if ($('s')) $('s').innerHTML = GN.stopCard(0, 's0') + GN.stopCard(1, 's1');
      swap('m', GN.money('money', 'bar')); if ($('bar')) $('bar').style.width = GN.BAR_PCT + '%';
      swap('c', GN.shareCard('share'));
    </script></body></html>`;
}

for (const [kind, w, mobile] of [["plan", 512, true], ["plan", 412, true], ["share", 390, true]]) {
  const file = path.join(ui, `_fidelity-${kind}.html`);
  fs.writeFileSync(file, page(kind));
  const c = await browser.newContext({ viewport: { width: w, height: 1200 }, deviceScaleFactor: 3, reducedMotion: "reduce", isMobile: mobile, hasTouch: mobile });
  const pg = await c.newPage();
  await pg.goto("file://" + file);
  await pg.evaluate(() => GN.fontsReady());
  await pg.waitForTimeout(500);
  const name = `${kind}-${w}`;
  await pg.screenshot({ path: path.join(OUT, `${name}.png`) });
  const boxes = await pg.evaluate(() =>
    [...document.querySelectorAll(".gn-card-e")].map((el) => {
      const b = el.getBoundingClientRect();
      return { id: el.id, x: b.x, y: b.y + scrollY, w: b.width, h: b.height };
    }),
  );
  fs.writeFileSync(path.join(OUT, `${name}.boxes.json`), JSON.stringify(boxes, null, 2));
  fs.unlinkSync(file);
  await c.close();
  console.log(name, boxes.map((b) => `${b.id}:${b.w.toFixed(1)}x${b.h.toFixed(2)}`).join(" "));
}
await browser.close();
