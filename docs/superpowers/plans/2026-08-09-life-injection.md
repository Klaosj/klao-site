# Life Injection Implementation Plan (wow-pass round 2)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Same execution model as the wow-pass plan: Opus orchestrates + reviews + commits; Sonnet implements; Wave A runs 5 parallel file-disjoint tasks.

**Goal:** Fix Klao's "เว็บมันแข็งๆ" — inject warmth (light + periwinkle in actual use), living motion (springs, tilt), and humanity (Thai wordmark, human micro-copy) WITHOUT changing the locked dark-charcoal direction.

**Branch:** continue on `feat/wow-pass` (stacked on the wow-pass commits; one merge decision at the end).

## Global Constraints

All constraints from `docs/superpowers/plans/2026-08-09-frontend-wow-pass.md` still bind verbatim: quoted apostrophe path · no `npm run build` · foreground long-timeout commands · no eslint.config.mjs · dictionary th↔en parity · A2/A3/A5/A6/A7/A8/A10 · theme.ts↔globals.css mirror · jsdom is layout-blind, browser QA is the visual gate. Additionally:
- The dark mood stays. No hue shifts of the base tokens; warmth comes from *light* (gradients/glow at low opacity) and from putting the existing peri/peri-deep to work.
- Reduced-motion kills every new animation/tilt/spring (add to the existing reduced-motion block or component CSS media queries).
- Grain/glow layers must be pure CSS (no image assets — A5/A6), `pointer-events: none`, and must not sit over light bands.

## Wave A (parallel ×5, file-disjoint) — then Wave B: orchestrator QA

| Task | Files (exclusive) |
|---|---|
| 1 Ambient light + grain + spring curve | `src/app/globals.css` only |
| 2 Work cards alive (tilt + hover life) | `src/components/motion/TiltCard.tsx` (new), `src/components/motion/tilt.css` (new), `src/components/sections/WorkGrid.tsx`, `tests/work-grid.test.tsx`, `tests/tilt-card.test.tsx` (new) |
| 3 Light-band seams | `src/components/sections/AboutBand.tsx`, `src/components/sections/ClientsBand.tsx`, `tests/bands.test.tsx`, `tests/clients-band.test.tsx` |
| 4 Thai wordmark + human copy | `src/lib/models.ts`, `src/content/fixtures/profile.json`, `src/lib/notion-mappers.ts`, `src/app/[locale]/page.tsx`, `src/lib/dictionary.ts`, `src/components/SiteFooter.tsx`, `tests/mappers.test.ts`, `tests/dictionary.test.ts`, `tests/site-footer.test.tsx` |
| 5 Living pointer + spotlight tint | `src/components/motion/PointerFx.tsx`, `src/components/motion/spotlight.css`, `tests/pointer-fx.test.tsx` |

---

### Task 1: Ambient light + grain + spring curve (globals.css only)

- [ ] **Step 1:** In `@layer components`, add the ambient layers. The hero stage and contact band get a soft periwinkle radial glow; every dark band gets film grain via an SVG-noise data URI. Both are pseudo-elements — zero markup changes, zero assets:

```css
  /* ---- Life injection: ambient light ---------------------------------- */
  /* Soft periwinkle light source behind the hero copy and the contact CTA.
     pointer-events none; z-index -1 keeps it under the content while the
     section background stays beneath both. */
  #hero [data-hero-stage]::before,
  #contact::before {
    content: '';
    position: absolute;
    inset: -10% -20%;
    z-index: -1;
    pointer-events: none;
    background:
      radial-gradient(42% 34% at 50% 38%, rgba(168, 174, 203, 0.16), transparent 70%),
      radial-gradient(30% 24% at 50% 60%, rgba(125, 134, 173, 0.10), transparent 70%);
  }
  #contact { position: relative; }

  /* Film grain on dark bands only (never the light bands). Tiny SVG
     fractal-noise tile, ~0.5KB inline, repeats. Low opacity so it reads as
     texture, not dirt. */
  section.bg-dark::after,
  section.bg-deep::after,
  #hero::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    opacity: 0.05;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }
```

Verify in-browser that grain does NOT cover the light bands (`#about`, `#clients` use `bg-light` — excluded by the selector) and that hero content still reads above the glow.

- [ ] **Step 2:** Give `.btn` a springy curve (replace the existing `transition: translate 0.35s cubic-bezier(0.16, 1, 0.3, 1);` inside the `.btn` rule):

```css
  .btn {
    translate: var(--magX, 0px) var(--magY, 0px);
    transition: translate 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
```

- [ ] **Step 3:** Peri put to work — links & focus. In `@layer components`, AFTER the existing `.nav-link:hover` rules in source order, add:

```css
  /* The accent finally does a job: interactive states are periwinkle. */
  .nav-link:hover, .nav-social:hover { color: var(--color-peri); }
  header.nav-on-light .nav-link:hover,
  header.nav-on-light .nav-social:hover { color: var(--color-peri-deep); }
  a:focus-visible, button:focus-visible {
    outline: 2px solid var(--color-peri);
    outline-offset: 3px;
    border-radius: 4px;
  }
```

- [ ] **Step 4:** Reduced-motion: confirm `.btn { transition: none !important; }` already exists in the reduced-motion block (it does — no addition needed; glow/grain are static).

- [ ] **Step 5:** `npm run check` green → report. (No test edits expected; globals.css is untested by jsdom.)

---

### Task 2: Work cards alive — TiltCard

- [ ] **Step 1 (failing test first):** `tests/tilt-card.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import TiltCard from '@/components/motion/TiltCard';

it('renders children inside the tilt wrapper', () => {
  render(<TiltCard><p>content</p></TiltCard>);
  expect(screen.getByText('content')).toBeTruthy();
  expect(screen.getByText('content').closest('[data-tilt]')).not.toBeNull();
});
```

Run → FAIL (module not found).

- [ ] **Step 2:** `src/components/motion/tilt.css`:

```css
[data-tilt] {
  transform: perspective(900px) rotateX(var(--tx, 0deg)) rotateY(var(--ty, 0deg)) translateY(var(--lift, 0px));
  transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.45s ease;
  will-change: transform;
}
[data-tilt]:hover {
  box-shadow:
    0 24px 60px -24px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(168, 174, 203, 0.22);
}
@media (prefers-reduced-motion: reduce), (hover: none) {
  [data-tilt] { transform: none !important; transition: none; }
  [data-tilt]:hover { box-shadow: none; }
}
```

- [ ] **Step 3:** `src/components/motion/TiltCard.tsx` — pointer-tracked tilt, max ±3.2°, lift −5px, all via CSS vars (no React state per move):

```tsx
'use client';

import { useRef, type ReactNode } from 'react';
import './tilt.css';

const MAX_DEG = 3.2;

/** Springy pointer-tracked tilt for cards. Writes CSS custom properties
 *  straight onto the node per pointermove — no React state, no rAF needed
 *  (the CSS transition smooths between event samples). Disabled for
 *  reduced-motion and touch by the CSS media queries in tilt.css. */
export default function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--ty', `${(px * 2 * MAX_DEG).toFixed(2)}deg`);
    el.style.setProperty('--tx', `${(-py * 2 * MAX_DEG).toFixed(2)}deg`);
    el.style.setProperty('--lift', '-5px');
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--tx', '0deg');
    el.style.setProperty('--ty', '0deg');
    el.style.setProperty('--lift', '0px');
  };

  return (
    <div ref={ref} data-tilt className={className} onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
    </div>
  );
}
```

- [ ] **Step 4:** In `WorkGrid.tsx`, wrap each card's content (the `{card}` inside the `<a>`/`<div>`) with `<TiltCard>` — the anchor stays outermost so the whole card remains one link. Add a peri accent to the caption stack line: its className `text-on-dark-soft` → `text-peri-deep`.

- [ ] **Step 5:** `npx vitest run tests/tilt-card.test.tsx tests/work-grid.test.tsx` then `npm run check` — green → report.

---

### Task 3: Light-band seams

The white bands currently butt against dark with a hard edge. Round the entry: each light band slides over the dark section above it with large rounded top corners — Tailwind-only, no CSS files.

- [ ] **Step 1:** `AboutBand.tsx` section className: add `rounded-t-[32px] sm:rounded-t-[44px] -mt-8 pt-[13vh]` (keep everything else: `bg-light px-6 py-[11vh] text-on-light` — `py-[11vh]` still sets bottom padding, the explicit `pt-[13vh]` wins top). `z-[2]` already present keeps the band over the dark section above.
- [ ] **Step 2:** Same three classes on `ClientsBand.tsx`'s section.
- [ ] **Step 3:** Check `tests/bands.test.tsx` / `tests/clients-band.test.tsx` for exact-className assertions on those sections; update if any.
- [ ] **Step 4:** `npm run check` green → report. (Orchestrator browser-verifies: seams curve, no gap flash, SiteNav's `section.bg-light` detection unaffected — the class list still contains `bg-light`.)

---

### Task 4: Thai wordmark + human micro-copy

- [ ] **Step 1 (failing tests first):** `tests/mappers.test.ts`: following the file's existing optional-property test pattern, assert the profile mapper reads a `NameNative` rich-text property into `nameNative`, and defaults to `null` when absent. `tests/site-footer.test.tsx`: assert the footer renders the `footerNote` copy (query by the English string below). Run → FAIL.
- [ ] **Step 2:** `src/lib/models.ts` — `Profile` gains `nameNative: string | null` (doc comment: native-script display name; drives the /th particle wordmark; null → Latin wordmark on both locales).
- [ ] **Step 3:** `src/content/fixtures/profile.json` — add `"nameNative": "สุวิจักขณ์"`.
- [ ] **Step 4:** `src/lib/notion-mappers.ts` — map optional `NameNative` (rich text, same helper other optional text fields use), default `null`.
- [ ] **Step 5:** `src/app/[locale]/page.tsx` — the word passed to `ParticleField` becomes locale-aware (match the existing variable/prop names in the file):

```tsx
const wordmark =
  locale === 'th' && profile.nameNative
    ? profile.nameNative
    : profile.name.split(' ')[0].toUpperCase();
```

(ParticleField already rasterises Thai — THAI_RANGE/THAI_STACK — no changes there.)
- [ ] **Step 6:** `src/lib/dictionary.ts` — add to BOTH locales (parity is compile-checked):

```ts
// SiteFooter's human line. True of the owner (the projects were built
// nights-and-weekends per profile.now) — personality, not fabrication.
footerNote: 'Built at night, powered by good coffee.',
```

```ts
footerNote: 'สร้างตอนกลางคืน ด้วยกาแฟดีๆ หลายแก้ว',
```

- [ ] **Step 7:** `src/components/SiteFooter.tsx` — render `footerNote` beside/above the copyright line, `text-[11px] text-on-dark-soft`, plain text (no emoji — voice rules).
- [ ] **Step 8:** `npx vitest run tests/mappers.test.ts tests/dictionary.test.ts tests/site-footer.test.tsx` then `npm run check` — green → report.

---

### Task 5: Living pointer + spotlight tint

- [ ] **Step 1:** `PointerFx.tsx` — strengthen the magnetic pull ~35%: locate the pull factors (0.22 horizontal / 0.32 vertical per spec §4) and scale to `0.30` / `0.42`. Keep the event-driven (non-rAF) design and reduced-motion early return untouched.
- [ ] **Step 2:** `spotlight.css` — the active craft line warms up; append to the existing `.spot.spot-on` rule:

```css
.spot.spot-on {
  color: var(--color-on-dark);
  opacity: 1;
  text-shadow: 0 0 24px rgba(168, 174, 203, 0.35);
}
```

(reduced-motion block unchanged — a static text-shadow is not motion.)
- [ ] **Step 3:** `tests/pointer-fx.test.tsx` — update expected constants only if the pull factors are asserted; otherwise untouched.
- [ ] **Step 4:** `npm run check` green → report.

---

### Wave B: orchestrator QA (no subagent)

- [ ] Browser sweep desktop+mobile, EN+TH: glow subtle behind hero/contact; grain on dark only; seams curve; cards tilt + spring back; buttons springy; peri hovers; TH hero assembles **สุวิจักขณ์**; footer note both languages.
- [ ] Hero still ≥60fps with glow+grain active (re-trace).
- [ ] Reduced-motion: no tilt, no springs, static everything.
- [ ] `npm run check` + Lighthouse a11y ≥95 re-run.
- [ ] Ledger + memory update.

## Deferred (needs Klao's assets)

**About-story photos** (burger shop / coffee bar / late-night desk): Klao drops files into `public/images/story/` (any names, jpg/webp ≤300KB each) → follow-up task wires them into the 01/02/03 beats with graceful text-only fallback. Not built until photos exist.
