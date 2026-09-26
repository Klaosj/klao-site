'use client';

import { useEffect, useRef } from 'react';
import './signature.css';
import Reveal from '@/components/motion/Reveal';
import ThaiText from '@/components/ThaiText';
import { Icon } from '@/components/icons';
import { TileIcon, type TileName } from '@/components/sketches';
import {
  SIG_YEARS,
  shouldPin,
  sigFrame,
  sigGeometry,
  sigProgress,
  sigVars,
  type SigGeometry,
  type SigStyle,
} from '@/lib/signature';

// Everything the scene says, prepared on the server (sections/Signature.tsx): the island ships
// no dictionary and no project list, only the strings it renders.
export interface SignatureCopy {
  eyebrow: string;
  title: string;
  sub: string;
  cardKicker: string;
  cardQuestion: string | null;
  statValue: string;
  statTotal: string;
  cardLabel: string;
  capTitle: string;
  capSub: string;
  endTitle: string;
  endSub: string;
  openLabel: string;
  openHref: string | null;
  frameSrc: string | null;
  frameAlt: string;
}

// The five apps a 2022 trip took (map, calendar, wallet, transit, chat) and GoNai's pin that
// replaces them (ruling D-2): P0's TileIcon/TileName, not a second copy of the same paths.
// Decorative: the whole row is aria-hidden.
const APPS: readonly TileName[] = ['map', 'cal', 'wal', 'trn', 'cht'];

function supportsScrollTimeline(): boolean {
  return typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('animation-timeline: view()');
}

export default function SignatureScene({ copy }: { copy: SignatureCopy }) {
  const rootRef = useRef<HTMLElement>(null);

  // One effect owns the motion; React owns only the markup. The markup below IS the static
  // stack the server sends (Review Focus #4). This effect upgrades it to the pinned scene when
  // there is room and motion is allowed, and undoes every class and inline style it wrote on the
  // way out. No React state: the island never re-renders after hydration, so the `pin` class and
  // the inline styles it writes are never overwritten by a render.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const one = (name: string) => root.querySelector<HTMLElement>(`[data-sig-part="${name}"]`);
    const all = (name: string) => Array.from(root.querySelectorAll<HTMLElement>(`[data-sig-part="${name}"]`));
    const track = root.querySelector<HTMLElement>('[data-sig="track"]');
    const stage = root.querySelector<HTMLElement>('[data-sig="stage"]');
    const head = one('head');
    const card = one('card');
    const chip = one('chip');
    const tint = one('tint');
    const capA = one('capA');
    const capB = one('capB');
    const frame = one('frame'); // absent when the later project has no screenshot
    const face = one('face');
    const apps = all('app');
    const years = all('year');
    if (!track || !stage || !head || !card || !chip || !tint || !capA || !capB) return;

    const cssPath = supportsScrollTimeline();
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let geo: SigGeometry | null = null;
    let start = 0;
    let len = 1;
    let last = -1;
    let raf = 0;
    let listening = false;
    let inView = typeof IntersectionObserver === 'undefined'; // no observer: treat as always in view
    let resizeTimer = 0;
    // The two numbers the pin decision was last computed from (fix round 1, Important): a real
    // `resize` is compared against these, so a toolbar-only change that moves neither is ignored.
    let lastWidth = 0;
    let lastHeight = 0;
    let roRaf = 0;
    let cardResized = false;
    let io: IntersectionObserver | null = null;
    let ro: ResizeObserver | null = null;

    const clear = () => {
      for (const el of root.querySelectorAll<HTMLElement>('[data-sig-part]')) el.removeAttribute('style');
    };
    const paintStyle = (el: HTMLElement, s: SigStyle) => {
      el.style.opacity = s.opacity;
      el.style.transform = s.transform;
    };
    const measure = () => {
      start = track.getBoundingClientRect().top + window.scrollY;
      len = Math.max(1, track.offsetHeight - stage.offsetHeight);
    };
    // Fallback path only: the CSS path never runs per-frame JavaScript.
    const paint = (force: boolean) => {
      if (!geo || cssPath) return;
      const p = sigProgress(window.scrollY, start, len);
      if (!force && Math.abs(p - last) < 0.0005) return;
      last = p;
      const f = sigFrame(p, geo);
      paintStyle(head, f.head);
      paintStyle(card, f.card);
      paintStyle(capA, f.capA);
      paintStyle(capB, f.capB);
      if (frame) paintStyle(frame, f.frame);
      apps.forEach((el, i) => {
        const s = f.tiles[i];
        if (s) paintStyle(el, s);
      });
      if (face) face.style.opacity = f.face;
      tint.style.opacity = f.tint;
      chip.style.opacity = f.chip;
      years.forEach((el, i) => {
        el.style.opacity = i === f.year ? '1' : '0';
      });
    };
    const place = (g: SigGeometry) => {
      card.style.left = `${g.card.left}px`;
      card.style.top = `${g.card.top}px`;
      chip.style.left = `${g.chip.left}px`;
      chip.style.top = `${g.chip.top}px`;
      if (frame) {
        frame.style.width = `${g.frame.width}px`;
        frame.style.left = `${g.frame.left}px`;
        frame.style.top = `${g.frame.top}px`;
      }
      apps.forEach((el, i) => {
        el.style.zIndex = String(apps.length - i);
      });
      if (!cssPath) return;
      const v = sigVars(g);
      apps.forEach((el, i) => {
        const t = v.tiles[i];
        if (!t) return;
        el.style.setProperty('--s', t.s);
        el.style.setProperty('--k', t.k);
        el.style.setProperty('--p', t.p);
      });
      frame?.style.setProperty('--z0', v.frameStart);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        paint(false);
      });
    };
    // Scroll work exists only while it can matter: fallback path, pinned, and within a screen of
    // the viewport. Reduced motion, short screens and the CSS path never attach a scroll listener.
    const syncListening = () => {
      const want = !cssPath && geo !== null && inView;
      if (want === listening) return;
      listening = want;
      if (want) {
        window.addEventListener('scroll', onScroll, { passive: true });
        measure();
        paint(true);
      } else {
        window.removeEventListener('scroll', onScroll);
      }
    };
    const layout = () => {
      // `document.documentElement.clientHeight`, not `window.innerHeight` (fix round 1,
      // Important): mobile Safari/Chrome resize the window whenever their toolbar collapses or
      // expands -- close to every scroll-direction change -- which moves `innerHeight` by ~70 px
      // without moving this stable height, and matches the pinned stage's own `100svh`.
      const width = window.innerWidth;
      const height = document.documentElement.clientHeight;
      lastWidth = width;
      lastHeight = height;
      const pin = shouldPin({ reducedMotion: reduce.matches, width, height });
      root.classList.toggle('pin', pin);
      clear();
      geo = null;
      last = -1;
      // The card-resize watch (below) only matters while pinned: drop it on unpin, re-attach on
      // re-pin (`observe` on an already-observed target is a no-op, so this is safe every call).
      ro?.disconnect();
      if (pin) {
        // Read after `.pin` applies: the card's pinned width is what the tiles orbit.
        geo = sigGeometry({ width: stage.clientWidth, height: stage.clientHeight, cardWidth: card.offsetWidth, cardHeight: card.offsetHeight });
        place(geo);
        measure();
        paint(true);
        ro?.observe(document.body);
        ro?.observe(card);
      }
      syncListening();
    };
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        // Toolbar-only resizes move `window.innerHeight` but not `window.innerWidth` or the
        // stable height `layout()` reads; skip the relayout when neither actually moved, so the
        // scene doesn't pin/unpin -- or just churn its inline styles -- on every scroll-direction
        // change on a phone (fix round 1, Important).
        if (window.innerWidth === lastWidth && document.documentElement.clientHeight === lastHeight) return;
        layout();
      }, 120);
    };

    if (!cssPath) {
      if (typeof IntersectionObserver !== 'undefined') {
        io = new IntersectionObserver(
          (entries) => {
            for (const e of entries) inView = e.isIntersecting;
            syncListening();
          },
          { rootMargin: '100% 0px 100% 0px' },
        );
        io.observe(root);
      }
      // Content above can change height after load (images, fonts), and the pinned card can
      // reflow on its own (e.g. a Thai font swap re-wrapping the card question) -- either goes
      // stale without this (fix round 1, item 3). rAF-throttled so a burst of callbacks in one
      // frame does one flush; `layout()` (not just `measure()`) is what a card resize needs,
      // since the card's own size feeds `sigGeometry`. `layout()` attaches and detaches this
      // observer itself (observed only while pinned), so it also disconnects on unpin.
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver((entries) => {
          for (const e of entries) if (e.target === card) cardResized = true;
          if (roRaf) return;
          roRaf = requestAnimationFrame(() => {
            roRaf = 0;
            if (!geo) return;
            if (cardResized) {
              cardResized = false;
              layout();
            } else {
              measure();
            }
          });
        });
      }
    }
    window.addEventListener('resize', onResize);
    reduce.addEventListener?.('change', layout);
    layout();

    return () => {
      io?.disconnect();
      ro?.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      reduce.removeEventListener?.('change', layout);
      window.clearTimeout(resizeTimer);
      if (raf) cancelAnimationFrame(raf);
      if (roRaf) cancelAnimationFrame(roRaf);
      root.classList.remove('pin');
      clear();
    };
  }, []);

  return (
    <section ref={rootRef} id="signature" className="sig" aria-labelledby="sig-h">
      <div className="sig-track" data-sig="track">
        <div className="sig-stage" data-sig="stage">
          <div className="sig-tint" data-sig-part="tint" aria-hidden="true" />
          <Reveal as="header" className="sig-head">
            <div className="sig-head-in" data-sig-part="head">
              <p className="t-eyebrow">{copy.eyebrow}</p>
              <h2 id="sig-h" className="t-h2">
                <ThaiText text={copy.title} display />
              </h2>
              <p className="t-lead">
                <ThaiText text={copy.sub} />
              </p>
            </div>
          </Reveal>
          <div className="sig-chip" data-sig-part="chip" aria-hidden="true">
            {SIG_YEARS.map((year, i) => (
              <span key={year} className="sig-year" data-sig-part="year" data-y={i}>
                {year}
              </span>
            ))}
          </div>
          <div className="sig-card" data-sig-part="card">
            <p className="t-cap sig-card-kick">{copy.cardKicker}</p>
            {copy.cardQuestion && (
              <p className="sig-card-q">
                <ThaiText text={copy.cardQuestion} />
              </p>
            )}
            <p className="t-stat sig-stat">
              {copy.statValue}
              <span className="sig-stat-of"> / </span>
              {copy.statTotal}
            </p>
            <p className="t-cap sig-card-label">{copy.cardLabel}</p>
          </div>
          <div className="sig-apps" aria-hidden="true">
            {APPS.map((name, i) => (
              <div key={name} className="sig-app" data-sig-part="app">
                <TileIcon name={name} className="sig-ln" />
                {i === 0 && (
                  <span className="sig-app-face" data-sig-part="face">
                    <TileIcon name="pin" className="sig-ln" />
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="sig-cap sig-cap-a glass glass-pill" data-sig-part="capA">
            <p className="sig-cap-t1">
              <ThaiText text={copy.capTitle} />
            </p>
            <p className="sig-cap-t2">{copy.capSub}</p>
          </div>
          {copy.frameSrc && (
            <div className="sig-frame" data-sig-part="frame">
              <img src={copy.frameSrc} alt={copy.frameAlt} width={1600} height={900} loading="lazy" decoding="async" />
            </div>
          )}
          <div className="sig-cap sig-cap-b glass glass-pill" data-sig-part="capB">
            <div>
              <p className="sig-cap-t1">{copy.endTitle}</p>
              <p className="sig-cap-t2">{copy.endSub}</p>
            </div>
            {copy.openHref && (
              <a className="sig-open" href={copy.openHref} target="_blank" rel="noreferrer">
                {copy.openLabel} <Icon name="arrow-up-right" />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
