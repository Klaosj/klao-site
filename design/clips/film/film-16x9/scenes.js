/* scenes.js — the film: its words, the scene layout and the one paused GSAP timeline.
   Byte-identical in film-16x9/ and film-1x1/ (tools/build.sh refuses to render if they differ). Each cut's
   index.html sets window.CUT (geometry) before this file loads, and its type sizes in CSS.

   Words: every string in COPY is verbatim from spec 2026-10-01 §3.1 (copied from klao-site.vercel.app on
   1 Oct 2026). A beat may show a subset of its cell; nothing is reworded, no number is added and no status
   label is dropped. Cafénista's "simulated data" / "ข้อมูลจำลอง" is part of its kicker, which is on screen,
   fully opaque, for the whole Cafénista beat (28.0–36.0 s) and fades with the beat's last frame of content.

   Beats (spec §3.2), 40.0 s at 30 fps:
     0–4     title     frame 0 is the finished card (the poster); it holds, then leaves at 3.42
     4–12    Signature the 2022 card and five grey app tiles → the tiles gather into one pile, its top tile
                       turns into GoNai's pin, the 2022 card steps back, the 2026 side arrives
     12–20   GoNai     kicker + question; then the question leaves, the kicker rises into the band, the
     20–28   Aje         window rises and the sting plays once (5.0 s), holds its last frame, the beat leaves
     28–36   Cafénista   (the same pattern; its longer question holds 0.8 s longer and it leaves at 36.0)
     36–40   end       name, the one accent mark, URL; final hold from 37.02 */
(function () {
  const COPY = {
    en: {
      title: 'Business developer who builds his own tools.',
      name: 'Suwichak Jarunopratamp',
      sigKicker: '2022 → 2026',
      sigTitle: 'The idea, then the app.',
      cardKicker: '2022 · Tripedia · Co-founder',
      cardQuestion: 'Why does planning one trip take five apps?',
      statValue: '30',
      statTotal: '500',
      cardLabel: 'final teams · KATALYST Startup Launchpad',
      nowTitle: 'GoNai · Live',
      nowSub: 'One-day Bangkok trip planner with exact budgets, built as a weekend project.',
      gonai: { kicker: 'GoNai · Live · since Aug 2026', question: 'One day in Bangkok — what’s the real budget?' },
      aje: { kicker: 'Aje · Working prototype', question: 'Is this idea worth a weekend, or a year?' },
      cafenista: {
        kicker: 'Cafénista · Prototype · simulated data',
        question: "Can one screen tell an owner who's away how the machine, the bar and the till are doing?",
      },
      url: 'klao-site.vercel.app',
    },
    th: {
      title: 'นัก Business Development ที่สร้างเครื่องมือใช้เอง',
      name: 'Suwichak Jarunopratamp',
      sigKicker: '2022 → 2026',
      sigTitle: 'ไอเดียมาก่อน แล้วค่อยเป็นแอป',
      cardKicker: '2022 · Tripedia · Co-founder',
      cardQuestion: 'ทำไมวางแผนทริปเดียวต้องใช้ตั้งห้าแอป?',
      statValue: '30',
      statTotal: '500',
      cardLabel: 'ทีมสุดท้าย · KATALYST Startup Launchpad',
      nowTitle: 'GoNai · เปิดใช้งานแล้ว',
      nowSub: 'แอปวางแผนเที่ยวกรุงเทพฯ 1 วัน พร้อมงบประมาณละเอียด สร้างเสร็จในสุดสัปดาห์เดียว',
      gonai: { kicker: 'GoNai · เปิดใช้งานแล้ว · ตั้งแต่ ส.ค. 2026', question: 'ไปเที่ยวหนึ่งวัน งบจริงๆ เท่าไหร่?' },
      aje: { kicker: 'Aje · Prototype ใช้งานได้', question: 'ไอเดียนี้คุ้มกับหนึ่งสุดสัปดาห์ หรือทั้งปี?' },
      cafenista: {
        kicker: 'Cafénista · Prototype · ข้อมูลจำลอง',
        question: 'จอเดียวบอกเจ้าของที่ไม่อยู่ร้านได้ไหม ว่าเครื่อง บาร์ และยอดขายเป็นยังไง?',
      },
      url: 'klao-site.vercel.app',
    },
  };

  /* ── timing (s) ─────────────────────────────────────────────────────────────────────────────────────── */
  const FPS = 30;
  const PRE = 12 / FPS; // the sting's frame 0, held while its window rises (tools/build.sh pads the same 12 frames)
  const STING = 150 / FPS; // each sting plays once, 5.0 s
  const OUT = 0.28; // every leave: frame.md's 200–320 ms
  /* Per app beat, relative to its start B:
       B − 0.50  kicker in (opacity, ARRIVE 0.48 s: fully in by B − 0.02)
       B − 0.36  question in (y 28 → 0, ARRIVE 0.6 s)
       B + qe    question out (LEAVE 0.28 s) · + 0.02 the kicker rises into the band (MOVE 0.6 s)
       B + qe + 0.30  the window rises (y 72 → 0, MOVE 0.65 s), showing the sting's frame 0 for PRE (0.4 s);
                 then the sting plays its 150 frames once and holds its last frame
       out       the beat leaves (opacity, y + 24, LEAVE 0.28 s) */
  const APP_BEATS = [
    // B = beat start · qe = the question starts to leave · out = the beat starts to leave
    { key: 'gonai', B: 12, qe: 1.5, out: 19.22 },
    { key: 'aje', B: 20, qe: 1.5, out: 27.22 },
    { key: 'cafenista', B: 28, qe: 2.3, out: 36.0 }, // a longer question; leaves inside the end beat, so its label covers 28–36
  ];
  const frames = (s) => Math.round(s * FPS) / FPS;
  for (const a of APP_BEATS) {
    a.win = frames(a.B + a.qe + 0.3); // the window starts to rise once the question is gone; the video clip starts here
    a.play = a.win + PRE; // the sting's own first frame plays
    a.dur = Math.ceil((a.out + OUT - a.win) * FPS - 1e-6) / FPS; // the clip runs until the beat has left
  }

  /* ── helpers ────────────────────────────────────────────────────────────────────────────────────────── */
  const THAI = /[฀-๿]/;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  /* The site's ThaiText display mode (src/lib/thai.ts): every space-delimited token that holds Thai stays
     whole, so a Thai line only ever breaks at a space. Latin text breaks normally. */
  const keep = (text) =>
    text
      .split(' ')
      .map((tok) => (THAI.test(tok) ? `<span class="kt">${esc(tok)}</span>` : esc(tok)))
      .join(' ');
  const fail = (msg) => {
    console.error(`film: ${msg}`);
    throw new Error(`film: ${msg}`);
  };
  /* A deliberate display break (frame.md's "short display titles"): the cut chooses where a title breaks;
     the words must still be the §3.1 string exactly. */
  const lines = (arr, whole) => {
    if (arr.join(' ') !== whole) fail(`display lines "${arr.join(' | ')}" are not "${whole}"`);
    return arr.map((s) => `<span class="ln">${keep(s)}</span>`).join('');
  };

  /* klao-site eases (frame.md), solved as real cubic-béziers so GSAP gets the exact curve (as the stings do). */
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
      for (let i = 0; i < 8; i++) {
        const e = sx(t) - p, d = dx(t);
        if (Math.abs(e) < 1e-7) return sy(t);
        if (Math.abs(d) < 1e-6) break;
        t -= e / d;
      }
      let lo = 0, hi = 1;
      t = p;
      for (let i = 0; i < 40; i++) {
        const v = sx(t);
        if (Math.abs(v - p) < 1e-7) break;
        if (v < p) lo = t;
        else hi = t;
        t = (lo + hi) / 2;
      }
      return sy(t);
    };
  }
  const ARRIVE = bezier(0.32, 0.72, 0, 1); // --ease-settle
  const MOVE = bezier(0.28, 0.11, 0.32, 1); // --ease-drift
  const LEAVE = bezier(0.4, 0, 1, 1); // --ease-exit

  /* The prototype's TI tiles (src/components/sketches.tsx TILE_PATHS): 24 × 24 line icons in the Signature
     scene's order (map, calendar, wallet, transit, chat), and GoNai's pin. */
  const TILES = {
    map: '<path d="M3.5 6.5l5-2 7 2 5-2v13l-5 2-7-2-5 2z"/><path d="M8.5 4.5v13M15.5 6.5v13"/>',
    cal: '<rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    wal: '<rect x="3.5" y="6" width="17" height="13" rx="2.5"/><path d="M3.5 9.5h13"/><path d="M15.5 13.5h2"/>',
    trn: '<rect x="6" y="3.5" width="12" height="13" rx="3"/><path d="M6 10.5h12M9 20l1.5-3.5M15 20l-1.5-3.5"/><path d="M9 13.5h.01M15 13.5h.01"/>',
    cht: '<path d="M4.5 5.5h15v10h-9l-4.5 3.5v-3.5h-1.5z"/>',
    pin: '<path d="M12 20.5s6-5.2 6-10.5a6 6 0 0 0-12 0c0 5.3 6 10.5 6 10.5z"/><circle cx="12" cy="10" r="2.2"/>',
  };
  const icon = (name) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TILES[name]}</svg>`;
  const APPS = ['map', 'cal', 'wal', 'trn', 'cht'];
  /* The site's pile (src/lib/signature.ts `pile`): offsets from the pile's centre, × the cut's tile scale. */
  const PILE = [[0, 0, 0], [5, 4, 5], [-5, 6, -6], [8, 9, 9], [-8, 10, -10]];

  /* ── locale (a HyperFrames variable; ?locale= outside HyperFrames, for tools/film-audit.mjs) ─────────── */
  const vars = (window.__hyperframes && window.__hyperframes.getVariables && window.__hyperframes.getVariables()) || {};
  const asked = vars.locale || new URLSearchParams(location.search).get('locale');
  const L = asked === 'th' ? 'th' : 'en';
  const t = COPY[L];
  const C = window.CUT;
  document.documentElement.lang = L;
  window.FILM = { COPY, L, APP_BEATS, PRE, STING }; // read by tools/film-audit.mjs

  /* ── words into the page ────────────────────────────────────────────────────────────────────────────── */
  const $ = (id) => document.getElementById(id) || fail(`#${id} missing`);
  const put = (id, s) => {
    $(id).innerHTML = s;
  };
  put('t-head', lines(C.titleLines[L], t.title));
  put('t-name', keep(t.name));
  put('s-kick', keep(t.sigKicker));
  put('s-title', keep(t.sigTitle));
  put('s-card-kick', keep(t.cardKicker));
  put('s-card-q', keep(t.cardQuestion));
  $('s-stat-v').textContent = t.statValue;
  $('s-stat-t').textContent = t.statTotal;
  put('s-card-lab', keep(t.cardLabel));
  put('s-now-t1', keep(t.nowTitle));
  put('s-now-t2', keep(t.nowSub));
  put(
    's-tiles',
    APPS.map(
      (n, i) =>
        `<div class="tile" id="tile-${n}" style="z-index:${APPS.length - i}">${icon(n)}${
          i === 0 ? `<span class="face" id="s-face">${icon('pin')}</span>` : ''
        }</div>`,
    ).join(''),
  );
  for (const a of APP_BEATS) {
    const sec = $(`a-${a.key}`);
    sec.querySelector('.a-kick').innerHTML = keep(t[a.key].kicker);
    sec.querySelector('.a-q').innerHTML = keep(t[a.key].question);
    // the clip's timing in the HTML must be the timing the timeline animates (a stale edit fails loudly)
    const v = $(`v-${a.key}`);
    const ds = Number(v.getAttribute('data-start'));
    const dd = Number(v.getAttribute('data-duration'));
    if (Math.abs(ds - a.win) > 1e-6 || Math.abs(dd - a.dur) > 1e-6)
      fail(`#v-${a.key} data-start/duration ${ds}/${dd}, timeline expects ${a.win.toFixed(4)}/${a.dur.toFixed(4)}`);
  }
  put('e-name', lines(C.endLines[L], t.name));
  put('e-url', esc(t.url));

  /* ── layout, once the faces are in (heights depend on them), then the timeline ─────────────────────── */
  const faces = [
    document.fonts.load('600 100px "Film Display"', 'B'),
    document.fonts.load('500 40px "Film Thai"', 'ก'),
    document.fonts.load('600 40px "Film Thai"', 'ก'),
  ];
  /* index.html registers the timeline this resolves to on window.__timelines['main'] (HyperFrames' contract).
     Wrapped in an object: a GSAP timeline is itself a thenable (it resolves when it finishes playing), so a
     paused one handed straight to a promise would never settle. */
  window.FILM.ready = Promise.all(faces)
    .then(() => document.fonts.ready)
    .then(() => ({ timeline: build() }));

  function build() {
    const { W, H, X } = C;
    const px = (n) => `${Math.round(n)}px`;
    const place = (el, x, y) => {
      el.style.left = px(x);
      el.style.top = px(y);
    };
    const hOf = (el) => el.offsetHeight;
    const wOf = (el) => el.offsetWidth;

    /* title: one block, left on the text edge, optically centred */
    const tb = $('t-block');
    place(tb, X, (H - hOf(tb)) / 2 + C.titleDy);

    /* Signature */
    const head = $('s-head');
    const card = $('s-card');
    const now = $('s-now');
    const T = C.sig.tile;
    const cardH = hOf(card);
    const cardW = wOf(card);
    // the square lays the 2026 side out under the card: GoNai's tile with its name beside it, the line below
    // at full width. Laid out before measuring, so the group can be centred with it.
    if (C.sig.mode === 'row') {
      // the name sits on the tile's centre line. Padding, not flex: a flex line would turn the text and the Thai
      // keep-run into separate items and drop the space between them ("GoNai ·เปิดใช้งานแล้ว").
      const t1 = $('s-now-t1');
      t1.style.boxSizing = 'border-box';
      t1.style.height = px(T);
      t1.style.paddingTop = px((T - parseFloat(getComputedStyle(t1).lineHeight)) / 2);
      t1.style.marginLeft = px(T + C.sig.nowGap);
      $('s-now-t2').style.marginTop = px(C.sig.subGap);
      now.style.width = px(W - 2 * X);
    }
    // the group (head, card and, on the square, the 2026 side under it) is centred on the frame
    const group = hOf(head) + C.sig.cardGap + cardH + (C.sig.mode === 'row' ? C.sig.rowGap + hOf(now) : 0);
    const headTop = (H - group) / 2 + C.sig.dy;
    place(head, X, headTop);
    const cardTop = headTop + hOf(head) + C.sig.cardGap;
    place(card, X, cardTop);
    let scatter, pileC;
    if (C.sig.mode === 'side') {
      // 2022 card on the left · the five apps loose beside it · 2026 column on the right, centred on the card
      const cy = cardTop + cardH / 2;
      const ox = X + cardW;
      scatter = C.sig.scatter.map(([dx, dy, r]) => [ox + dx, cy + dy, r]);
      now.style.width = px(C.sig.nowW);
      $('s-now-text').style.marginTop = px(T + C.sig.nowGap);
      const nowH = hOf(now);
      const nowTop = cy - nowH / 2;
      place(now, C.sig.nowX, nowTop);
      pileC = [C.sig.nowX + T / 2, nowTop + T / 2];
    } else {
      // 'row' (square): the five apps in a loose row under the card; the pile lands at the row's left end,
      // where GoNai's tile heads the 2026 side
      const rowY = cardTop + cardH + C.sig.rowGap + T / 2;
      scatter = C.sig.scatter.map(([dx, dy, r]) => [W / 2 + dx, rowY + dy, r]);
      pileC = [X + T / 2, rowY];
      place(now, X, rowY - T / 2);
    }
    const k = T / 56; // the site's tiles are 56 px
    const pile = PILE.map(([dx, dy, r]) => [pileC[0] + dx * k, pileC[1] + dy * k, r]);
    const tiles = APPS.map((n) => $(`tile-${n}`));
    const at = ([cx, cy, r]) => ({ x: cx - T / 2, y: cy - T / 2, rotation: r });

    /* app beats: kicker in the band above the docked window; during the question it sits just above it */
    for (const a of APP_BEATS) {
      const sec = $(`a-${a.key}`);
      const kick = sec.querySelector('.a-kick');
      const q = sec.querySelector('.a-q');
      const win = sec.querySelector('.win');
      const wl = (W - C.win.w) / 2;
      const wt = H - C.win.h;
      win.style.width = px(C.win.w);
      win.style.height = px(C.win.h);
      place(win, wl, wt);
      const kh = hOf(kick);
      const band = (wt - kh) / 2;
      place(kick, X, band);
      const block = kh + C.qGap + hOf(q);
      const top = (H - block) / 2 + C.qDy;
      place(q, X, top + kh + C.qGap);
      a.lift = Math.round(top - band); // the kicker's offset during the question
    }

    /* end card */
    const eb = $('e-block');
    place(eb, X, (H - hOf(eb)) / 2 + C.endDy);

    /* ── rest state = frame 0 (the poster): the finished title card; everything else waits ─────────── */
    gsap.set(['#s-kick', '#s-title'], { opacity: 0, y: 20 });
    gsap.set(card, { opacity: 0, scale: 0.97, transformOrigin: '50% 50%' });
    tiles.forEach((el, i) => gsap.set(el, { ...at(scatter[i]), opacity: 0, transformOrigin: '50% 50%' }));
    gsap.set('#s-face', { opacity: 0 });
    gsap.set(['#s-now-t1', '#s-now-t2'], { opacity: 0, y: 16 });
    for (const a of APP_BEATS) {
      const sec = $(`a-${a.key}`);
      gsap.set(sec.querySelector('.a-kick'), { opacity: 0, y: a.lift });
      gsap.set(sec.querySelector('.a-q'), { opacity: 0, y: 28 });
      gsap.set(sec.querySelector('.win'), { opacity: 0, y: 72 });
    }
    gsap.set(['#e-name'], { opacity: 0, y: 20 });
    gsap.set('#e-mark', { scaleX: 0, transformOrigin: '0% 50%' });
    gsap.set('#e-url', { opacity: 0 });

    const tl = gsap.timeline({ paused: true });

    /* 0–4 · title: holds, then leaves (3.42–3.70) */
    tl.to('#t', { opacity: 0, y: -14, duration: OUT, ease: LEAVE }, 3.42);

    /* 4–12 · Signature
       build    3.72 head · 3.86 the 2022 card · 3.96 the five apps (stagger 0.05; whole build < 0.5 s), so the
                beat's first frame (4.0) already shows its head
       breathe  7.10 the apps gather into one pile (map first, 0.95 s; the slowest move, ~3.4× the 0.28 s leaves)
                · 7.20 the card steps back (0.96, 0.55)
       resolve  8.20 the top tile turns into GoNai's pin · 8.40 the pile under it goes · 8.55 the 2026 side
       leave    11.22 */
    tl.to(['#s-kick', '#s-title'], { opacity: 1, y: 0, duration: 0.55, ease: ARRIVE, stagger: 0.08 }, 3.72);
    tl.to(card, { opacity: 1, scale: 1, duration: 0.6, ease: MOVE }, 3.86);
    tl.to(tiles, { opacity: 1, duration: 0.5, ease: ARRIVE, stagger: 0.05 }, 3.96);
    const piled = pile.map(at); // one tween for the five (frame.md: ≤ 2 tweens per ease in a beat); map first
    tl.to(tiles, { x: (i) => piled[i].x, y: (i) => piled[i].y, rotation: (i) => piled[i].rotation, duration: 0.95, ease: MOVE, stagger: 0.04 }, 7.1);
    tl.to(card, { scale: 0.96, opacity: 0.55, duration: 0.8, ease: MOVE }, 7.2);
    tl.to('#s-face', { opacity: 1, duration: 0.45, ease: ARRIVE }, 8.2);
    tl.to(tiles.slice(1), { opacity: 0, duration: 0.3, ease: LEAVE }, 8.4);
    tl.to(['#s-now-t1', '#s-now-t2'], { opacity: 1, y: 0, duration: 0.55, ease: ARRIVE, stagger: 0.08 }, 8.55);
    tl.to('#s', { opacity: 0, y: -12, duration: OUT, ease: LEAVE }, 11.22);

    /* 12–36 · the three apps */
    for (const a of APP_BEATS) {
      const sec = $(`a-${a.key}`);
      const kick = sec.querySelector('.a-kick');
      const q = sec.querySelector('.a-q');
      const win = sec.querySelector('.win');
      tl.to(kick, { opacity: 1, duration: 0.48, ease: ARRIVE }, a.B - 0.5); // fully in by B − 0.02
      tl.to(q, { opacity: 1, y: 0, duration: 0.6, ease: ARRIVE }, a.B - 0.36);
      tl.to(q, { opacity: 0, y: -14, duration: OUT, ease: LEAVE }, a.B + a.qe);
      tl.to(kick, { y: 0, duration: 0.6, ease: MOVE }, a.B + a.qe + 0.02);
      tl.to(win, { opacity: 1, y: 0, duration: 0.65, ease: MOVE }, a.win);
      tl.to(sec, { opacity: 0, y: 24, duration: OUT, ease: LEAVE }, a.out);
    }

    /* 36–40 · end: name, the one accent mark, URL; final hold from 37.02 */
    tl.to('#e-name', { opacity: 1, y: 0, duration: 0.55, ease: ARRIVE }, 36.3);
    tl.to('#e-mark', { scaleX: 1, duration: 0.6, ease: MOVE }, 36.42);
    tl.to('#e-url', { opacity: 1, duration: 0.48, ease: ARRIVE }, 36.5);

    tl.seek(0);
    return tl;
  }
})();
