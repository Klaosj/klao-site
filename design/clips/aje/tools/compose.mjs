// compose.mjs — write both compositions from a capture (tools/capture.mjs).
//   node tools/compose.mjs <capture-dir> <source-dir>
// Each cut gets: index.html (stage + the app's live DOM embedded as viewport boxes + the one paused GSAP timeline),
// ui/aje-<cut>.css (the app's scoped stylesheet), ui/fonts.css + ui/fonts/, assets/aje.jpg (16:9 frame 0).
// Geometry below is in the app's CSS px unless it says canvas px. Timing lives in the TIMELINE blocks.
import fs from 'node:fs';
import path from 'node:path';
import { vpMarkup, VP_RUNTIME_CSS } from './vp.mjs';

const [CAP, SRC] = process.argv.slice(2);
const KLAO_SITE = process.env.KLAO_SITE; // klao-site repo root: frame 0 = public/images/aje.jpg, byte for byte

// klao-site frame.md: stage, one hairline + one e2 shadow per surface
const STAGE = '#F5F6F8';
const SHADOW = '0 0 0 1px rgba(20,26,44,.05), 0 2px 4px rgba(20,26,44,.04), 0 12px 28px -8px rgba(20,26,44,.12), 0 32px 64px -32px rgba(20,26,44,.18)';

// the motion helpers both cuts share: frame.md curves solved as real cubic-béziers, plus Aje's own curves
const EASES = `
      function bezier(x1, y1, x2, y2) {
        const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
        const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
        const sx = (t) => ((ax * t + bx) * t + cx) * t;
        const sy = (t) => ((ay * t + by) * t + cy) * t;
        const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
        return (p) => {
          if (p <= 0) return 0;
          if (p >= 1) return 1;
          let t = p;
          for (let i = 0; i < 8; i++) { const e = sx(t) - p, d = dx(t); if (Math.abs(e) < 1e-7) return sy(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
          let lo = 0, hi = 1; t = p;
          for (let i = 0; i < 40; i++) { const v = sx(t); if (Math.abs(v - p) < 1e-7) break; if (v < p) lo = t; else hi = t; t = (lo + hi) / 2; }
          return sy(t);
        };
      }
      const ARRIVE = bezier(.32, .72, 0, 1);    // frame.md --ease-settle
      const MOVE   = bezier(.28, .11, .32, 1);   // frame.md --ease-drift
      const LEAVE  = bezier(.4, 0, 1, 1);        // frame.md --ease-exit
      const RISE   = bezier(.2, .8, .2, 1);      // Aje globals.css: .quest { animation: rise .5s cubic-bezier(.2,.8,.2,1) }
      const APP_OUT = bezier(0, 0, .58, 1);      // Aje globals.css: the receipt / note entrances use CSS ease-out`;

function clean(markup) {
  // Framer Motion leaves "opacity: 1; transform: none;" on settled elements: visually nothing, but it would read as a
  // CSS transform under the GSAP tweens, so it goes. The rest are HyperFrames audit annotations (attributes only):
  // the sticky header is meant to cover what scrolls under it; the idea name sits inside the brand by design;
  // the closed picker's list is never rendered.
  return markup.replace(/ style="opacity: 1; transform: none;"/g, '')
    .replace('<header class="top"', '<header class="top" data-layout-allow-occlusion')
    .replace('<div class="brand">', '<div class="brand" data-layout-allow-overlap>')
    .replace('<span class="vn">', '<span class="vn" data-layout-allow-overlap>')
    .replace(/(<details class="quest-picker"[^>]*>[\s\S]*?)<ul>/, '$1<ul data-layout-ignore>');
}

function head(w, h, css) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${w}, height=${h}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <link rel="stylesheet" href="ui/fonts.css" />
${css.map((c) => `    <link rel="stylesheet" href="ui/${c}" />`).join('\n')}`;
}

function copyUi(cutDir, cssCuts) {
  const ui = path.join(cutDir, 'ui');
  fs.mkdirSync(ui, { recursive: true });
  fs.cpSync(path.join(CAP, 'fonts'), path.join(ui, 'fonts'), { recursive: true });
  // Tailwind's base font stack ends in emoji families; no text here uses them. local() declarations satisfy
  // HyperFrames' font_family_without_font_face lint without shipping anything.
  fs.writeFileSync(path.join(ui, 'fonts.css'), fs.readFileSync(path.join(CAP, 'fonts.css'), 'utf8') +
    ['Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'].map((f) => `@font-face { font-family: "${f}"; src: local("${f}"); }`).join('\n') + '\n');
  for (const c of cssCuts) fs.copyFileSync(path.join(CAP, c, 'aje.css'), path.join(ui, `aje-${c}.css`));
}

/* ───────────────────────── 16:9 · 1580×900 ───────────────────────── */
{
  const W = 1580, H = 900, Z = 1.44;   // Thai "ไทย" (12 px) → 17.3 canvas px ≈ 13.1 px on a 1200 px sheet
  // Two windows onto Aje's desktop viewport (1280×900), the same width, stacked:
  //  · the header with the idea's name, as it sits at the top of the page (nothing behind it). The crop stops before
  //    the level meter (x 899.8), so the example's level never reads as BikeFix's.
  //  · the test card, page scrolled 260 px, viewport y 66–551 (the band right under the header). Aje's header has no
  //    blur (computed backdrop-filter: none), so a crop that put the card under it would show the page's text through it.
  const X0 = 24, X1 = 866.25;
  const STRIP = { y0: 4, y1: 50 };
  const CARD = { scroll: 260, vy0: 66, vy1: 551 };
  const GAP = 12;
  const winW = Math.round((X1 - X0) * Z);
  const sh = Math.round((STRIP.y1 - STRIP.y0) * Z), ch = Math.round((CARD.vy1 - CARD.vy0) * Z);
  const x = Math.round((W - winW) / 2), sy = Math.round((H - (sh + GAP + ch)) / 2), cy = sy + sh + GAP;
  const FOCUS = { x: 1155, y: 502 };       // aje.jpg: "Open next test →" on BikeFix's Review
  const dir = path.join(SRC, 'sting-16x9');
  copyUi(dir, ['d']);
  fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
  if (KLAO_SITE) fs.copyFileSync(path.join(KLAO_SITE, 'public/images/aje.jpg'), path.join(dir, 'assets/aje.jpg'));
  const strip = clean(vpMarkup(CAP, 'd', { scroll: 0, headerOnly: true, idPrefix: 's' }));
  const page = clean(vpMarkup(CAP, 'd', { scroll: CARD.scroll }));
  const html = `${head(W, H, ['aje-d.css'])}
    <style>
      /* ── klao-site frame (frame.md): quiet stage, the app is the only colour */
      html, body { margin: 0; padding: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: ${STAGE}; }
      #root { position: relative; width: 100%; height: 100%; background: ${STAGE}; overflow: hidden; }
      #bg { position: absolute; inset: 0; background: ${STAGE}; }
      /* the two windows move as one; radius 18, one hairline + one e2 shadow each (the e2 stack opens with the hairline) */
      #group { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; transform-origin: ${FOCUS.x}px ${FOCUS.y}px; }
      .surf { position: absolute; left: ${x}px; width: ${winW}px; overflow: hidden; border-radius: 18px; box-shadow: ${SHADOW}; background: #0b1330; isolation: isolate; }
      #strip { top: ${sy}px; height: ${sh}px; }
      #cardwin { top: ${cy}px; height: ${ch}px; }
      /* Aje's viewport at ${Z}×, laid out at its real CSS size and zoomed so text stays crisp; each window crops it */
      #strip .vp-d { zoom: ${Z}; margin: ${-STRIP.y0}px 0 0 ${-X0}px; }
      #cardwin .vp-d { zoom: ${Z}; margin: ${-CARD.vy0}px 0 0 ${-X0}px; }
      /* frame 0 = public/images/aje.jpg, shown 1:1 */
      #still { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; transform-origin: ${FOCUS.x}px ${FOCUS.y}px; }
      /* entirely outside the crops for the whole clip: hidden so the audits see what the viewer sees (pixels unchanged) */
      #strip .vp-d .ready,
      #cardwin .vp-d header.top, #cardwin .vp-d .account, #cardwin .vp-d .path-strip, #cardwin .vp-d .qhead, #cardwin .vp-d details.quest-picker,
      #cardwin .vp-d .qt > .chip, #cardwin .vp-d .quest .act, #cardwin .vp-d .quest-disclosure, #cardwin .vp-d .evidence-history,
      #cardwin .vp-d details.lib { visibility: hidden; }
${VP_RUNTIME_CSS}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="5" data-width="${W}" data-height="${H}">
      <div id="bg"></div>
      <div id="group">
        <div id="strip" class="surf" data-layout-allow-overflow data-layout-allow-overlap>${strip}</div>
        <div id="cardwin" class="surf" data-layout-allow-overflow data-layout-allow-overlap>${page}</div>
      </div>
      <img id="still" src="assets/aje.jpg" alt="" data-layout-allow-overlap data-layout-allow-occlusion />
    </div>
    <script>
      /* =====================================================================
         Aje UI sting · 1580×900 · 30 fps · 5.0 s · plays once, holds.
         Frame 0 is public/images/aje.jpg (BikeFix Home, Review, level 2 of 9).
         Then Aje's real Next steps for its built-in example idea: the header with its name,
         "Dental LINE receptionist (example)", is on screen whenever the example's data is.
         build   0.30–1.30  zoom through "Open next test →"; the header, then the test card (Aje's own rise)
         breathe 1.60–2.45  "Evidence reviewed" checks in; the two score chips arrive
         resolve 3.60–4.02  "Problem and Customer moved on field evidence…" resolves
         hold    4.03–5.00  nothing moves
         ===================================================================== */
${EASES}
      const head = document.querySelector('#strip header.top');
      const vp = document.querySelector('#cardwin .vp-d');
      const scroller = vp.querySelector('.vp-scroller');
      const card = [...vp.querySelectorAll('article.quest.focus')].find((a) => !a.closest('[hidden]'));
      const receipt = card.querySelector('.quest-receipt');
      const check = receipt.querySelector('path');
      const chips = [...card.querySelectorAll('.result > span')];   // Problem · Customer · Reviewed
      const note = card.querySelector('.qnote');

      /* ── rest state · immediate sets, outside the paused timeline */
      gsap.set(scroller, { y: -${CARD.scroll} });                       // the page scroll
      gsap.set('#group', { scale: 0.96 });
      gsap.set(head, { opacity: 0 });                                  // no text under the dissolve: only Aje's sky shows through
      gsap.set(card, { opacity: 0, y: 14 });                           // Aje's rise keyframe: from opacity 0, translateY(14px)
      gsap.set(receipt, { opacity: 0, y: 14 });
      gsap.set(check, { strokeDasharray: 20, strokeDashoffset: 20 });  // Aje: .is-fresh .quest-receipt path
      gsap.set(chips, { opacity: 0 });
      gsap.set(chips.slice(0, 2), { y: 6 });                           // Aje QuestResult: initial { opacity: 0, y: 6 }
      gsap.set(note, { opacity: 0, y: 14 });

      const tl = gsap.timeline({ paused: true });

      /* ── BUILD · zoom through "Open next test →" into the example's Next steps */
      tl.to('#still', { scale: 1.06, duration: 0.6, ease: MOVE }, 0.3);
      tl.to('#still', { opacity: 0, duration: 0.32, ease: LEAVE }, 0.45);
      tl.set('#still', { visibility: 'hidden' }, 0.78);                 // gone: no longer over the windows
      tl.to('#group', { scale: 1, duration: 0.55, ease: ARRIVE }, 0.36);
      tl.to(head, { opacity: 1, duration: 0.3, ease: APP_OUT }, 0.7);   // the idea's name, "(example)", before its data
      tl.to(card, { opacity: 1, y: 0, duration: 0.5, ease: RISE }, 0.8); // the test card settles in

      /* ── BREATHE · the review lands: receipt + check (Aje's is-fresh order), then the score chips */
      tl.to(receipt, { opacity: 1, y: 0, duration: 0.36, ease: APP_OUT }, 1.6);
      tl.to(check, { strokeDashoffset: 0, duration: 0.4, ease: MOVE }, 1.72);
      tl.to(chips[0], { opacity: 1, y: 0, duration: 0.45, ease: ARRIVE }, 1.95);   // Problem F → B · +56
      tl.to(chips[1], { opacity: 1, y: 0, duration: 0.45, ease: ARRIVE }, 2.05);   // Customer D → C · +23
      tl.to(chips[2], { opacity: 1, duration: 0.3, ease: APP_OUT }, 2.15);         // "Reviewed" trails the two scores

      /* ── RESOLVE · the advisor's line */
      tl.to(note, { opacity: 1, y: 0, duration: 0.42, ease: APP_OUT }, 3.6);

      window.__timelines['main'] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  // motion intent, verified by \`hyperframes check\` on the same seeked timeline the renderer uses
  const q = '#d-quest-q1';
  fs.writeFileSync(path.join(dir, 'index.motion.json'), JSON.stringify({ duration: 5, assertions: [
    { kind: 'appearsBy', selector: q, bySec: 1.2 },
    { kind: 'appearsBy', selector: q + ' .quest-receipt', bySec: 1.9 },
    { kind: 'appearsBy', selector: q + ' .result > span:nth-child(1)', bySec: 2.3 },
    { kind: 'appearsBy', selector: q + ' .result > span:nth-child(2)', bySec: 2.4 },
    { kind: 'appearsBy', selector: q + ' .qnote', bySec: 3.95 },
    { kind: 'before', a: q, b: q + ' .quest-receipt' },
    { kind: 'before', a: q + ' .quest-receipt', b: q + ' .result > span:nth-child(1)' },
    { kind: 'before', a: q + ' .result > span:nth-child(2)', b: q + ' .qnote' },
    { kind: 'staysInFrame', selector: '#cardwin' },
    { kind: 'before', a: '#strip header.top', b: q },
  ] }, null, 2) + '\n');
  console.log('16x9', { x, sy, winW, sh, cy, ch, Z });
}

/* ───────────────────────── 1:1 · 1080×1080 ───────────────────────── */
{
  const W = 1080, H = 1080, Z = 3.15;
  // the idea's name: the desktop header (only above 960 px does Aje show it), cropped to the brand
  const STRIP = { x0: 52, x1: 352, y0: 10, y1: 44 };
  // the test card: Aje's phone layout (320 px). The window shows viewport y 150–416; two scroll positions.
  const PHONE = { x0: 10, x1: 310, vy0: 150, vy1: 416, scrollA: 324, scrollB: 894.5 }; // A: card top → step 1 · B: the review
  const sw = Math.round((STRIP.x1 - STRIP.x0) * Z), sh = Math.round((STRIP.y1 - STRIP.y0) * Z);
  const cw = Math.round((PHONE.x1 - PHONE.x0) * Z), ch = Math.round((PHONE.vy1 - PHONE.vy0) * Z);
  const GAP = 14;
  const x = Math.round((W - cw) / 2), sy = Math.round((H - (sh + GAP + ch)) / 2), cy = sy + sh + GAP;
  const dir = path.join(SRC, 'sting-1x1');
  copyUi(dir, ['d', 'p']);
  const strip = clean(vpMarkup(CAP, 'd', { scroll: 0, headerOnly: true, idPrefix: 's' }));
  const phone = clean(vpMarkup(CAP, 'p', { scroll: PHONE.scrollA }));
  const html = `${head(W, H, ['aje-d.css', 'aje-p.css'])}
    <style>
      /* ── klao-site frame (frame.md): quiet stage, the app is the only colour */
      html, body { margin: 0; padding: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: ${STAGE}; }
      #root { position: relative; width: 100%; height: 100%; background: ${STAGE}; overflow: hidden; }
      #bg { position: absolute; inset: 0; background: ${STAGE}; }
      .surf { position: absolute; overflow: hidden; box-shadow: ${SHADOW}; background: #0b1330; isolation: isolate; }
      /* the idea's name: a window onto Aje's desktop header (radius 18) */
      #strip { left: ${x}px; top: ${sy}px; width: ${sw}px; height: ${sh}px; border-radius: 18px; }
      #strip .vp-d { zoom: ${Z}; margin: ${-STRIP.y0}px 0 0 ${-STRIP.x0}px; }
      /* the test card: a window onto Aje's phone screen (radius 36) */
      #cardwin { left: ${x}px; top: ${cy}px; width: ${cw}px; height: ${ch}px; border-radius: 36px; }
            #cardwin .vp-p { zoom: ${Z}; margin: ${-PHONE.vy0}px 0 0 ${-PHONE.x0}px; }
      /* entirely outside the crops for the whole clip: hidden so the audits see what the viewer sees (pixels unchanged) */
      #strip .vp-d .hlink, #strip .vp-d .lang-toggle, #strip .vp-d .ready,
      #cardwin .vp-p header.top, #cardwin .vp-p .account, #cardwin .vp-p .path-strip, #cardwin .vp-p .qhead, #cardwin .vp-p details.quest-picker,
      #cardwin .vp-p .test-steps li:nth-child(n+2), #cardwin .vp-p .quest .act, #cardwin .vp-p .quest-disclosure,
      #cardwin .vp-p .evidence-history, #cardwin .vp-p details.lib { visibility: hidden; }
${VP_RUNTIME_CSS}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="5" data-width="${W}" data-height="${H}">
      <div id="bg"></div>
      <div id="strip" class="surf" data-layout-allow-overflow data-layout-allow-overlap>${strip}</div>
      <div id="cardwin" class="surf" data-layout-allow-overflow data-layout-allow-overlap>${phone}</div>
    </div>
    <script>
      /* =====================================================================
         Aje UI sting · square 1080×1080 · 30 fps · 5.0 s · plays once, holds.
         Re-composed for a ~340 px phone column: Aje at ${Z}×, one card window, the idea's name above it.
         frame 0 (poster) the example's test card, "Talk to 5 clinic owners", readable
         build   0.30–1.02  the window moves down the card to its review (page out, page in; the sky stays)
         breathe 0.66–1.70  "Evidence reviewed" checks in as the section lands; the two score chips arrive
         resolve 3.60–4.02  "Problem and Customer moved on field evidence…" resolves
         hold    4.03–5.00  nothing moves
         ===================================================================== */
${EASES}
      const vp = document.querySelector('#cardwin .vp-p');
      const scroller = vp.querySelector('.vp-scroller');
      const card = [...vp.querySelectorAll('article.quest.focus')].find((a) => !a.closest('[hidden]'));
      const receipt = card.querySelector('.quest-receipt');
      const check = receipt.querySelector('path');
      const chips = [...card.querySelectorAll('.result > span')];
      const note = card.querySelector('.qnote');

      /* ── rest state = the poster: the card's top, settled (immediate sets, outside the paused timeline) */
      gsap.set(scroller, { y: -${PHONE.scrollA} });
      gsap.set(receipt, { opacity: 0, y: 14 });
      gsap.set(check, { strokeDasharray: 20, strokeDashoffset: 20 });
      gsap.set(chips, { opacity: 0 });
      gsap.set(chips.slice(0, 2), { y: 6 });
      gsap.set(note, { opacity: 0, y: 14 });

      const tl = gsap.timeline({ paused: true });

      /* ── BUILD · further down the same card: the page content leaves upward, the review section rises in.
         Only the page moves; Aje's sky is fixed to the viewport, as it is in the app. */
      const app = scroller.querySelector('.app');
      tl.to(app, { opacity: 0, y: ${(-36 / 3.15).toFixed(2)}, duration: 0.22, ease: LEAVE }, 0.3);   // 36 canvas px · Aje's own page change: out fast
      tl.set(scroller, { y: -${PHONE.scrollB} }, 0.52);
      tl.set([card.querySelector('.qt'), card.querySelector('.test-steps li')], { visibility: 'hidden' }, 0.52); // scrolled out of the window
      tl.fromTo(app, { y: ${(36 / 3.15).toFixed(2)} }, { opacity: 1, y: 0, duration: 0.5, ease: ARRIVE, immediateRender: false }, 0.52);

      /* ── BREATHE · the review lands with the section: receipt + check, then the score chips */
      tl.to(receipt, { opacity: 1, y: 0, duration: 0.36, ease: APP_OUT }, 0.66);  // rides in with the section
      tl.to(check, { strokeDashoffset: 0, duration: 0.4, ease: MOVE }, 0.8);
      tl.to(chips[0], { opacity: 1, y: 0, duration: 0.45, ease: ARRIVE }, 1.15);
      tl.to(chips[1], { opacity: 1, y: 0, duration: 0.45, ease: ARRIVE }, 1.25);
      tl.to(chips[2], { opacity: 1, duration: 0.3, ease: APP_OUT }, 1.35);

      /* ── RESOLVE · the advisor's line */
      tl.to(note, { opacity: 1, y: 0, duration: 0.42, ease: APP_OUT }, 3.6);

      window.__timelines['main'] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  const q = '#p-quest-q1';
  fs.writeFileSync(path.join(dir, 'index.motion.json'), JSON.stringify({ duration: 5, assertions: [
    { kind: 'appearsBy', selector: '#strip', bySec: 0 },
    { kind: 'appearsBy', selector: q + ' .quest-receipt', bySec: 1.05 },
    { kind: 'appearsBy', selector: q + ' .result > span:nth-child(1)', bySec: 1.5 },
    { kind: 'appearsBy', selector: q + ' .result > span:nth-child(2)', bySec: 1.6 },
    { kind: 'appearsBy', selector: q + ' .qnote', bySec: 3.95 },
    { kind: 'before', a: q + ' .quest-receipt', b: q + ' .result > span:nth-child(1)' },
    { kind: 'before', a: q + ' .result > span:nth-child(2)', b: q + ' .qnote' },
    { kind: 'staysInFrame', selector: '#cardwin' },
  ] }, null, 2) + '\n');
  console.log('1x1', { x, sy, sw, sh, cy, cw, ch, Z });
}
