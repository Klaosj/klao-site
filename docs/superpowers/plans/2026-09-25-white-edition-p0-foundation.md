# White Edition — P0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the White Edition foundation (patched Next, light/dark tokens with a no-flash theme switch, the system-font + Thai-only Anuphan type stack, the shared CSS classes, Thai keep-runs, icons, sketches and the P0 removals) so that the current page already renders light and P1–P4 build on fixed names.

**Architecture:** One token layer in `src/app/globals.css` (raw CSS variables per theme, exposed to Tailwind v4 through `@theme inline static`, dark-era names repointed to the new roles), mirrored by `src/lib/theme.ts` and pinned by a parity test. An inline pre-paint script sets `html.js` and `data-theme` before first paint, and every rule that could dim content is gated on it. The new modules (theme, thai, icons, sketches, ThemeToggle, Reveal) are small leaf modules tested in isolation; dark-era sections are touched only where they would otherwise break or paint dark.

**Tech Stack:** Next.js 15.5.26 (App Router, Turbopack) · React 19.2 · Tailwind CSS 4.3 · Vitest 3 + Testing Library (jsdom per file) · Playwright from the local npx cache (screenshots only)

**Spec:** docs/superpowers/specs/2026-09-25-white-edition-design.md · Master plan (contracts, global constraints): docs/superpowers/plans/2026-09-25-white-edition.md

## Global Constraints

Inherits every line of the master plan's Global Constraints. Phase-specific additions:

- Work on `feat/white-edition` (master plan). Every task ends with `npm run check` green (tsc + eslint + vitest); `npm run build` also runs at Tasks 1, 7 and 14.
- No new npm dependency. The only new binary is the Thai font subset `public/fonts/anuphan-thai.woff2` (18,952 bytes, SIL OFL 1.1) with its licence `public/fonts/OFL.txt`.
- After Task 7 nothing imports `next/font` (Decision D1). Do not reintroduce it.
- Never run `npm audit fix`, with or without `--force`: it proposes Next 16.
- Dark-era sections are edited only where they would break or paint dark. Every legacy CSS block that stays is labelled with the phase that deletes it.
- Screenshots and scratch output go to `/tmp/klao-qa/` only, never into the repo.
- No file or string in `src/`, `public/`, `tests/` may contain the two removed project names after Task 13, including tests (the gate greps `tests/` too). The removal test builds its pattern from fragments for this reason.
- Copy: only strings that already exist in the prototype or the current dictionary (the public-repo rule).

## Review Focus

Master Review Focus lines this phase owns:

- **#2 Storage blocked** — `localStorage` throws on access (Safari private mode, blocked site data): theme falls back to Auto, the toggle still works for the session, nothing throws. → Task 4 (`readThemePref`, `writeThemePref`, pre-paint script with a throwing `localStorage` getter and a throwing `setItem`) and Task 9 (ThemeToggle switches the page with blocked storage).
- **#4 No JavaScript / before hydration** (P0 owns the `js` class) → Task 4 (pre-paint adds `js`, also when storage throws), Task 6 (the only rule that dims `.rv` sits behind both `html.js` and `prefers-reduced-motion: no-preference`, and never below .55), Task 10 (Reveal's server HTML carries `rv` and no inline style).
- **#5 Thai edge text** — no keep word, a `|`, a URL or English brand mixed in, an empty string. → Task 11 (plus a join-back invariant over prototype strings).

P0's own failure modes, most likely first:

- **P0-a Latin rendered in Anuphan.** The Thai subset file also maps U+0020, U+0041 `A`, U+00A0 and U+00C1. Without a Thai-only `unicode-range`, every capital A on /en would render in Anuphan. → Task 7 (font-face range test; built-CSS check) and the Appendix A screenshots.
- **P0-b White on white after the repoint.** The old primary pills and the SiteNav monogram pair `bg-light` with `text-dark`; with both names pointing at canvas they would vanish. → Task 5 (compat-rule test) and the Appendix A faint-text check (fails any visible text under 1.5:1).

---

## Decisions this plan makes (read before Task 1)

| # | Decision | Why |
|---|---|---|
| D1 | The Thai face is a plain CSS `@font-face` (`"Anuphan Thai"`, Google's Thai `unicode-range`) over a vendored file in `public/fonts/`, preloaded from the layout. **No `next/font`.** `tests/setup.ts` (a `next/font/google` mock) is deleted. | Measured in a scratch build, 25 Sep 2026: `next/font/google` with `subsets: ['thai']` still emits thai, vietnamese, latin-ext **and latin** faces (`subsets` only picks what to preload) plus an "Anuphan Fallback" face (local Arial, no range) that catches every Latin letter. `next/font/local` supports `declarations: [{ prop: 'unicode-range' }]`, but Turbopack drops it (`next build --turbopack` emits no range; webpack keeps it) and this repo builds with Turbopack. The subset file itself maps Latin `A`, space and nbsp, so the range is not optional. |
| D2 | `TiltCard`, `SpotlightList` and `MaskedHeading` stay. | They still have consumers: TiltCard ← WorkDeck (P2 replaces), SpotlightList ← CraftBand (P3), MaskedHeading ← seven sections (P5). Each later phase deletes its component and test once the consumer goes. |
| D3 | Two unlayered legacy rules: `.bg-light.text-dark` becomes a Kram button; Thai `h1–h3` without a `.t-*` class get `line-height: 1.5`. | The first stops white-on-white on six old CTAs and the nav monogram. The second keeps Thai marks off each other in the dark-era headings (the old rule, now excluding the new type classes). P5 deletes both with the legacy names. |
| D4 | The hero's annotation pills are renamed `.pill` → `.hero-pill`. | C9 `.pill` is now the shared 28 px chip; both in one layer would merge. |
| D5 | Where the spec text and the prototype CSS disagree, this plan uses: reveal = the prototype's (16 px, `.big` 24 px, 600 ms rise, 800 ms fade, drift), not spec §5.5's "30 px, 0.9 s glide"; phone eyebrow = the prototype (17/21, TH 23) — decided in master R21; `.t-panel` Thai = 28/38, phone 24/34, derived from "Thai one step smaller" because neither source defines it. | Flag all three to Klao at the P0 review; each is one line of CSS to change. |
| D6 | The og alt text loses its project list. | `public/og/og-*.png` still draw both removed projects; alt text may not name them and should not list what the image does not show. Re-rendering the cards from `design/og/*.html` is an open item for P5 / ship. |

## Files

| Action | Path | Task |
|---|---|---|
| Modify | `package.json`, `package-lock.json` | 1 |
| Create | `tests/removals.test.ts` | 2 (extended in 3, 13) |
| Delete | `src/components/motion/HeroMonument.tsx`, `tests/hero-monument.test.tsx` | 2 |
| Delete | `src/components/motion/PointerFx.tsx`, `tests/pointer-fx.test.tsx` | 3 |
| Modify | `src/app/[locale]/page.tsx` | 2 |
| Modify | `src/app/[locale]/layout.tsx` | 3, 5, 7, 13 |
| Modify | `src/app/globals.css` (rewritten in 5; appended in 6; font face in 7; `.seg` in 9) | 3, 5, 6, 7, 9 |
| Modify | `src/lib/theme.ts` (rewrite), `tests/theme.test.ts` (rewrite) | 4, 5 |
| Create | `tests/globals-css.test.ts` | 5 (extended in 6, 7, 9) |
| Modify | `src/components/sections/Hero.tsx`, `tests/hero.test.tsx`, `src/components/site-nav.css` | 2, 5 |
| Modify | `src/components/sections/CvBand.tsx` (comment only) | 3 |
| Create | `public/fonts/anuphan-thai.woff2`, `public/fonts/OFL.txt`, `tests/layout.test.tsx` | 7 |
| Delete | `tests/setup.ts`; Modify `vitest.config.ts`, `tests/work-deck.test.tsx` (comment) | 7 |
| Create | `src/components/icons.tsx`, `tests/icons.test.tsx` | 8 |
| Create | `src/components/ThemeToggle.tsx`, `tests/theme-toggle.test.tsx`; Modify `src/lib/dictionary.ts`, `src/components/SiteFooter.tsx`, `tests/site-footer.test.tsx` | 9 |
| Modify | `src/components/motion/Reveal.tsx`, `tests/reveal.test.tsx` (both rewritten) | 10 |
| Create | `src/lib/thai.ts`, `src/components/ThaiText.tsx`, `tests/thai.test.tsx` | 11 |
| Create | `src/components/sketches.tsx`, `tests/sketches.test.tsx` | 12 |
| Modify | `src/content/fixtures/projects.json`, `src/lib/image-alt.ts`, `tests/content.test.ts`, `tests/project-tour.test.tsx`, `tests/project-tour-helpers.test.ts`, `tests/work-deck.test.tsx`; Delete `public/images/aisecretary.jpg`, `public/images/dailybrief.jpg` | 13 |
| Outside repo | `/tmp/klao-qa/shoot.mjs` (Appendix A), `/tmp/klao-qa/nojs.mjs` (Appendix B) | 5, 7, 9, 14 |

Expected suite size after each task (tests, all passing): 1 → 415 · 2 → 409 · 3 → 398 · 4 → 409 · 5 → 509 · 6 → 540 · 7 → 546 · 8 → 552 · 9 → 563 · 10 → 566 · 11 → 582 · 12 → 597 · 13 → 598. A different count is fine if every test passes and the difference is explained (e.g. a test added by a review fix).

### Before Task 1

- [ ] `git switch feat/white-edition` (if it does not exist: `git switch -c feat/white-edition spec/white-edition`). `git status --short` shows nothing, or only the White Edition plan files.
- [ ] `mkdir -p /tmp/klao-qa`, then create `/tmp/klao-qa/shoot.mjs` from Appendix A (used at Tasks 5, 7, 9, 14) and `/tmp/klao-qa/nojs.mjs` from Appendix B (Task 14).
- [ ] `npm run check` → `Test Files  41 passed (41)`, `Tests  415 passed (415)`. This is the baseline.

---

### Task 1: Patch Next.js to 15.5.26

**Files:** Modify `package.json` (`dependencies.next`, `devDependencies.eslint-config-next`), `package-lock.json`
**Interfaces:** Consumes: nothing · Produces: `next@15.5.26`, `eslint-config-next@15.5.26` installed (nothing in code changes)

This task has no unit test: the "failing test" is the audit report naming the two advisories.

- [ ] **Step 1: Record the failing audit**

```bash
npm audit --omit=dev --json > /tmp/klao-qa/audit-before.json || true
node -e "const s=require('fs').readFileSync('/tmp/klao-qa/audit-before.json','utf8');for(const id of ['GHSA-2xp9-vwfh-vxw4','GHSA-p293-qw3h-jr36'])console.log(id,s.includes(id)?'REPORTED':'clear')"
```

- [ ] **Step 2: See it fail**

Expected output: `GHSA-2xp9-vwfh-vxw4 REPORTED` and `GHSA-p293-qw3h-jr36 REPORTED`.

- [ ] **Step 3: Implement**

```bash
npm install next@15.5.26 eslint-config-next@15.5.26
node -e "console.log(require('next/package.json').version, require('eslint-config-next/package.json').version)"
grep -n '"next"\|"eslint-config-next"' package.json
```

Expected: `15.5.26 15.5.26`; package.json shows `"next": "^15.5.26"` and `"eslint-config-next": "^15.5.26"`. If npm wrote an exact version without `^`, edit package.json to `^15.5.26` for both and run `npm install` once more.

- [ ] **Step 4: Run and pass**

```bash
npm audit --omit=dev --json > /tmp/klao-qa/audit-after.json || true
node -e "const a=require('/tmp/klao-qa/audit-after.json'),s=JSON.stringify(a);for(const id of ['GHSA-2xp9-vwfh-vxw4','GHSA-p293-qw3h-jr36'])if(s.includes(id)){console.error('still reported',id);process.exit(1)};console.log('both Next advisories cleared; still listed:',Object.keys(a.vulnerabilities||{}).join(', ')||'none')"
npm run check
npm run build
```

Expected: `both Next advisories cleared`. `postcss` may still be listed (Next 15.5.26 pins its own `postcss@8.4.31`, used only at build time on our own CSS), and `sharp` if npm kept 0.34.5 (used only by the image optimizer; the site has no `next/image` and no remote image patterns). Neither is exposed; record them in the commit body and do not run `npm audit fix`. `npm run check`: 415 tests pass. `npm run build` succeeds (it still downloads Space Grotesk and Anuphan from Google until Task 7).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): next 15.5.26 clears GHSA-2xp9-vwfh-vxw4 and GHSA-p293-qw3h-jr36

Hygiene, not an incident: the site uses no next/image, has no remote
image patterns and runs on Vercel Linux. npm audit still lists postcss
(pinned 8.4.31 inside next, build-time only) and possibly sharp (image
optimizer only); neither is reachable, and npm audit fix would jump to
Next 16, so it is not run.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 2: Remove HeroMonument

**Files:** Create `tests/removals.test.ts` · Modify `src/app/[locale]/page.tsx` (line 1; lines 29–37; lines 41–46), `src/components/sections/Hero.tsx` (comment, lines 29–32) · Delete `src/components/motion/HeroMonument.tsx`, `tests/hero-monument.test.tsx`
**Interfaces:** Consumes: nothing · Produces: `tests/removals.test.ts` with a `REMOVED_FILES` list that Tasks 3 and 13 (and P1–P5) extend. After this task `HEX` in `src/lib/theme.ts` has no consumer (Task 4 deletes it).

- [ ] **Step 1: Write the failing test** — create `tests/removals.test.ts`:

```ts
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// White Edition P0 removes the dark-era pieces (spec §6, §8). Deleting a file
// is easy to half-do: the component goes, but an import survives in a page
// nobody opened, and the build breaks on the next deploy. This file pins each
// removal twice -- the file is gone, and no quoted module specifier under
// src/ or tests/ still ends in its path -- so a revert or a stray merge shows
// up here before it shows up in `next build`. Later P0 tasks append to the
// list; P1-P5 append their own removals the same way.
const REMOVED_FILES = ['src/components/motion/HeroMonument.tsx'] as const;

const THIS_FILE = join('tests', 'removals.test.ts');

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('P0 removals', () => {
  it.each(REMOVED_FILES)('%s no longer exists', (path) => {
    expect(existsSync(path)).toBe(false);
  });

  it('leaves no import of a removed module behind', () => {
    const sources = [...walk('src'), ...walk('tests')].filter(
      (f) => /\.(ts|tsx)$/.test(f) && f !== THIS_FILE,
    );
    // Only source modules can be imported; assets (images) are checked by
    // their own tests. A specifier is any quoted string ending in the path
    // without its extension, so '@/components/...', '../components/...' and
    // a dynamic import(...) are all caught.
    const modules = REMOVED_FILES.filter((p) => /\.tsx?$/.test(p)).map((p) =>
      p.replace(/^src\//, '').replace(/\.tsx?$/, ''),
    );
    for (const file of sources) {
      const body = readFileSync(file, 'utf8');
      for (const mod of modules) {
        const specifier = new RegExp(`['"][^'"\\n]*${escapeRe(mod)}['"]`);
        expect(specifier.test(body), `${file} still imports ${mod}`).toBe(false);
      }
    }
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/removals.test.ts`
Expected: FAIL, 2 tests — `src/components/motion/HeroMonument.tsx no longer exists` and `src/app/[locale]/page.tsx still imports components/motion/HeroMonument`.

- [ ] **Step 3: Implement**

```bash
git rm src/components/motion/HeroMonument.tsx tests/hero-monument.test.tsx
```

In `src/app/[locale]/page.tsx`, delete line 1:

```tsx
import HeroMonument from '@/components/motion/HeroMonument';
```

Delete the wordmark block (lines 29–37, and the blank line after it):

```tsx
  // Owner-supplied: profile.nameNative (the Thai display name) drives the
  // /th monument text, so the wordmark reads in Thai rather than a
  // transliterated Latin fragment. HeroMonument already rasterises Thai
  // (THAI_RANGE) -- no changes needed there. Falls back to the Latin first
  // name (uppercased) on /en, or on /th when nameNative is null.
  const wordmark =
    locale === 'th' && profile.nameNative
      ? profile.nameNative
      : profile.name.split(' ')[0].toUpperCase();

```

Delete the comment and the mount (lines 41–46), so `<>` is followed directly by `<Hero profile={profile} locale={locale} />`:

```tsx
      {/* PointerFx is NOT mounted here anymore -- it moved to
          [locale]/layout.tsx in the 2026-08-15 QA pass (finding 15) so the
          cursor doesn't revert to the native arrow the moment a visitor
          follows the deck footer pill to /projects. HeroMonument stays: it
          rasterises `wordmark`, which only this route computes. */}
      <HeroMonument word={wordmark} heroSelector="#hero" />
```

In `src/components/sections/Hero.tsx`, replace the comment above `<section id="hero"`:

```tsx
    // 130vh, not the particle era's 180vh: the monument's stroke-draw
    // completes by DRAW_END (see HeroMonument.tsx's choreography constants),
    // so the pin no longer needs the extra viewport of travel the particle
    // assembly's long hold at full morph used to want.
```

with:

```tsx
    // 130vh with a sticky stage: the scroll the removed HeroMonument drew its
    // wordmark over. White Edition P1 replaces this section with HeroTour;
    // until then the stage simply stays pinned for an extra 30vh.
```

`profile.nameNative` stays in the model and fixtures (P1 may use it).

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/removals.test.ts && npm run check`
Expected: removals 2/2 pass; `npm run check` green, 409 tests. `grep -rn "HeroMonument" src tests` shows only `tests/removals.test.ts` and the new Hero.tsx comment.

- [ ] **Step 5: Commit**

```bash
git add tests/removals.test.ts src/app/[locale]/page.tsx src/components/sections/Hero.tsx
git commit -m "refactor(motion): remove HeroMonument and the home wordmark

The white page has no monument; P1's HeroTour takes the hero. A removal
test pins the file as gone and fails on any import left behind.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 3: Remove PointerFx (custom cursor + magnetic buttons)

**Files:** Modify `tests/removals.test.ts` (the `REMOVED_FILES` line), `src/app/[locale]/layout.tsx` (line 4; lines 174–193), `src/app/globals.css` (lines 122–129, 143–201, 425–432), `src/components/sections/CvBand.tsx` (comment, lines 24–26) · Delete `src/components/motion/PointerFx.tsx`, `tests/pointer-fx.test.tsx`
**Interfaces:** Consumes: `REMOVED_FILES` (Task 2) · Produces: no cursor/magnet CSS (`#cursor`, `--magX`, `--lagX`) anywhere; `.btn` is free for the C9 rule (Task 6).

- [ ] **Step 1: Write the failing test** — in `tests/removals.test.ts` replace

```ts
const REMOVED_FILES = ['src/components/motion/HeroMonument.tsx'] as const;
```

with

```ts
const REMOVED_FILES = [
  'src/components/motion/HeroMonument.tsx',
  'src/components/motion/PointerFx.tsx',
] as const;
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/removals.test.ts`
Expected: FAIL — `src/components/motion/PointerFx.tsx no longer exists` and `src/app/[locale]/layout.tsx still imports components/motion/PointerFx`.

- [ ] **Step 3: Implement**

```bash
git rm src/components/motion/PointerFx.tsx tests/pointer-fx.test.tsx
```

In `src/app/[locale]/layout.tsx`, delete line 4:

```tsx
import PointerFx from '@/components/motion/PointerFx';
```

and delete the comment plus mount (lines 174–193), leaving `<SiteNav locale={l} profile={profile} />` straight after the skip link:

```tsx
        {/* Moved up from [locale]/page.tsx in the 2026-08-15 QA pass
            (finding 15): mounted on the home route only, the custom
            mix-blend cursor and the magnetic `.btn` pull both vanished the
            instant a visitor followed the deck's footer pill to
            /projects -- the whole cursor swapping back to the native arrow
            mid-journey, which is far more perceivable than losing the
            magnet alone.

            Safe to render on every route under this layout without a
            per-route guard, because the component already no-ops by
            construction rather than by luck (see PointerFx.tsx): it
            returns before attaching anything under reduced motion; its
            `#hero .pill` query is scoped and simply returns [] off the home
            route, so the lag loop writes to nothing; its `.btn` query
            returns whatever that route actually has (the four
            /projects pills now included); and the cursor node itself is
            aria-hidden and hidden outright by CSS on coarse/no-hover
            pointers. It also has to sit inside <body>, not <head>, since it
            renders a real element. */}
        <PointerFx />
```

In `src/app/globals.css`, delete the three PointerFx blocks bottom-up (so line numbers stay valid): lines 425–432 (the reduced-motion PointerFx comment, `#cursor { display: none !important; }` and `.btn { transition: none !important; translate: none !important; }`), then lines 143–201 (the custom-cursor and magnetic-button blocks with their comments and the blank line after), then lines 122–129 (the pointer-lag comment, `#hero .pill { transform: translate(var(--lagX, 0px), var(--lagY, 0px)); }` and the blank line after). Before deleting, confirm the boundaries:

```bash
sed -n '425p;432p;143p;200p;122p;128p' src/app/globals.css
```

Expected (sed prints in file order, lines 122, 128, 143, 200, 425, 432):

```text
  /* One declaration for the pointer-lag transform, full stop. A second rule
  #hero .pill { transform: translate(var(--lagX, 0px), var(--lagY, 0px)); }
  /* Custom cursor (PointerFx). Position rides the `translate` CSS property,
  }
  /* PointerFx never attaches a listener or requests a frame under reduced
  .btn { transition: none !important; translate: none !important; }
```

If any line differs, stop: the file is not at the spec/white-edition baseline. Then:

```bash
sed -i '' '425,432d' src/app/globals.css
sed -i '' '143,201d' src/app/globals.css
sed -i '' '122,129d' src/app/globals.css
grep -n "#cursor {\|--magX\|--lagX\|\.btn {" src/app/globals.css
```

Expected: the grep prints nothing. (`sed -i ''` is the macOS form; on GNU sed use `sed -i`.)

In `src/components/sections/CvBand.tsx`, replace

```tsx
  // about whether a PDF exists to download. `.btn` opts the capsule into the
  // magnetic-pointer pull PointerFx drives (globals.css).
```

with

```tsx
  // about whether a PDF exists to download. `.btn` was the hook for the
  // PointerFx magnet (removed in White Edition P0); the class now picks up
  // the shared button rule in globals.css.
```

- [ ] **Step 4: Run and pass**

Run: `npm run check`
Expected: green, 398 tests (the 12 PointerFx tests are gone with their component).

- [ ] **Step 5: Commit**

```bash
git add tests/removals.test.ts src/app/[locale]/layout.tsx src/app/globals.css src/components/sections/CvBand.tsx
git commit -m "refactor(motion): remove PointerFx cursor and magnetic buttons

Frees the main thread on every pointer move (spec §9) and leaves .btn
for the shared White Edition button rule.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 4: `src/lib/theme.ts` — tokens, pre-paint script, read/write helpers (C2)

**Files:** Modify `src/lib/theme.ts` (full rewrite), `tests/theme.test.ts` (full rewrite)
**Interfaces:** Consumes: nothing (HEX's last consumer went in Task 2) · Produces (C2, plus two additive exports):

```ts
export type ThemePref = 'auto' | 'light' | 'dark';
export const THEME_STORAGE_KEY = 'klao-theme';
export const THEME_EVENT = 'klao:theme';                 // additive: CustomEvent<{ pref: ThemePref }> on window after every write
export type RawToken = 'canvas' | 'mist' | 'card' | 'raised' | 'ink-1' | 'ink-2' | 'ink-3' | 'kram' | 'kram-hover' | 'on-kram' | 'link' | 'focus' | 'line' | 'ctl' | 'curtain' | 'w-aje' | 'w-gonai' | 'w-site' | 'gonai';
// C2's sixteen plus the prototype colours master-plan R7 adds: raised, ctl, curtain.
export const TOKENS: { light: Record<RawToken, string>; dark: Record<RawToken, string> };
export function isThemePref(value: unknown): value is ThemePref; // additive
export const THEME_PREPAINT_SCRIPT: string;
export function readThemePref(): ThemePref;
export function writeThemePref(pref: ThemePref): void;
```

`HEX`, `TokenName`, `rgbFloat` and `PARTICLE_COLORS` are deleted.

- [ ] **Step 1: Write the failing test** — replace all of `tests/theme.test.ts` with:

```ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  THEME_EVENT,
  THEME_PREPAINT_SCRIPT,
  THEME_STORAGE_KEY,
  TOKENS,
  isThemePref,
  readThemePref,
  writeThemePref,
} from '@/lib/theme';

const root = document.documentElement;

// Safari private mode and "block all site data" make the `localStorage`
// getter itself throw (SecurityError), not just setItem. Vitest's jsdom
// environment makes `window` the global object and exposes `localStorage` as
// a configurable getter on it, so redefining that getter reproduces the real
// failure for both `window.localStorage` and a bare `localStorage`.
const realStorage = Object.getOwnPropertyDescriptor(window, 'localStorage')!;
function blockStorage() {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    },
  });
}

beforeEach(() => {
  window.localStorage.clear();
  root.removeAttribute('data-theme');
  root.classList.remove('js');
});

afterEach(() => {
  Object.defineProperty(window, 'localStorage', realStorage);
  vi.restoreAllMocks();
});

describe('TOKENS', () => {
  it('carries the spec §5.1 light palette', () => {
    expect(TOKENS.light).toEqual({
      canvas: '#FFFFFF',
      mist: '#F5F6F8',
      card: '#FFFFFF',
      raised: '#FFFFFF',
      'ink-1': '#1A1C20',
      'ink-2': '#666970',
      'ink-3': '#83868C',
      kram: '#26314A',
      'kram-hover': '#3C475E',
      'on-kram': '#FFFFFF',
      link: '#506CAF',
      focus: '#506CAF',
      line: 'rgb(20 26 44 / .10)',
      ctl: 'rgb(236 237 241 / .72)',
      curtain: 'rgb(245 246 248 / .56)',
      'w-aje': '#F4F7FB',
      'w-gonai': '#F4F8F6',
      'w-site': '#F5F6F8',
      gonai: '#1C7A57',
    });
  });

  it('carries the spec §5.1 dark palette, token for token', () => {
    expect(Object.keys(TOKENS.dark).sort()).toEqual(Object.keys(TOKENS.light).sort());
    expect(TOKENS.dark.canvas).toBe('#0A0B0D');
    expect(TOKENS.dark.mist).toBe('#141518');
    expect(TOKENS.dark.card).toBe('#1C1E21');
    expect(TOKENS.dark['ink-1']).toBe('#F2F3F5');
    expect(TOKENS.dark['ink-2']).toBe('#A6A9B0');
    expect(TOKENS.dark['ink-3']).toBe('#777A80');
    expect(TOKENS.dark.kram).toBe('#E0E8F9');
    expect(TOKENS.dark.link).toBe('#91AAE1');
    expect(TOKENS.dark.line).toBe('rgb(255 255 255 / .10)');
    expect(TOKENS.dark.raised).toBe('#25262A');
    expect(TOKENS.dark.ctl).toBe('rgb(58 60 66 / .60)');
    expect(TOKENS.dark.curtain).toBe('rgb(0 0 0 / .56)');
  });

  it('keeps Kram the only accent: GoNai green exists as its own token, never as kram', () => {
    expect(TOKENS.light.kram).not.toBe(TOKENS.light.gonai);
    expect(TOKENS.light.gonai).toBe('#1C7A57');
  });
});

describe('isThemePref', () => {
  it('accepts exactly auto, light and dark', () => {
    expect(['auto', 'light', 'dark'].every(isThemePref)).toBe(true);
    expect(isThemePref('Dark')).toBe(false);
    expect(isThemePref('')).toBe(false);
    expect(isThemePref(null)).toBe(false);
  });
});

describe('THEME_PREPAINT_SCRIPT', () => {
  const run = () => new Function(THEME_PREPAINT_SCRIPT)();

  it('marks <html> with `js` so CSS may start gating reveals', () => {
    run();
    expect(root.classList.contains('js')).toBe(true);
  });

  it('applies a stored light or dark choice before paint', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    run();
    expect(root.getAttribute('data-theme')).toBe('dark');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    run();
    expect(root.getAttribute('data-theme')).toBe('light');
  });

  it('leaves Auto (and anything invalid) to prefers-color-scheme: no attribute', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'auto');
    run();
    expect(root.hasAttribute('data-theme')).toBe(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
    run();
    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  it('still adds `js` and does not throw when storage is blocked', () => {
    blockStorage();
    expect(run).not.toThrow();
    expect(root.classList.contains('js')).toBe(true);
    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  it('reads the same storage key the helpers write', () => {
    expect(THEME_PREPAINT_SCRIPT).toContain(JSON.stringify(THEME_STORAGE_KEY));
    expect(THEME_STORAGE_KEY).toBe('klao-theme');
  });
});

describe('readThemePref', () => {
  it('returns the stored choice', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    expect(readThemePref()).toBe('light');
  });

  it('returns auto when nothing, or nothing valid, is stored', () => {
    expect(readThemePref()).toBe('auto');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'DARK');
    expect(readThemePref()).toBe('auto');
  });

  it('falls back to auto without throwing when storage is blocked (Review Focus #2)', () => {
    blockStorage();
    expect(() => readThemePref()).not.toThrow();
    expect(readThemePref()).toBe('auto');
  });
});

describe('writeThemePref', () => {
  it('sets data-theme for light/dark, removes it for auto, and remembers each', () => {
    writeThemePref('dark');
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    writeThemePref('auto');
    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('auto');
  });

  it('announces the change so every mounted toggle can follow', () => {
    const heard: unknown[] = [];
    const listener = (e: Event) => heard.push((e as CustomEvent).detail);
    window.addEventListener(THEME_EVENT, listener);
    writeThemePref('light');
    window.removeEventListener(THEME_EVENT, listener);
    expect(heard).toEqual([{ pref: 'light' }]);
  });

  it('still switches the page for this session when storage is blocked (Review Focus #2)', () => {
    blockStorage();
    expect(() => writeThemePref('dark')).not.toThrow();
    expect(root.getAttribute('data-theme')).toBe('dark');
    // A toggle mounted later in the same page view reads the session's choice.
    expect(readThemePref()).toBe('dark');
  });

  it('survives a storage that is readable but refuses writes (quota)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    expect(() => writeThemePref('light')).not.toThrow();
    expect(root.getAttribute('data-theme')).toBe('light');
  });

  it('treats an invalid value from untyped callers as auto', () => {
    root.setAttribute('data-theme', 'dark');
    writeThemePref('sepia' as never);
    expect(root.hasAttribute('data-theme')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/theme.test.ts`
Expected: FAIL — the old module has no `THEME_EVENT`, `TOKENS`, `THEME_PREPAINT_SCRIPT`, `readThemePref`, `writeThemePref` or `isThemePref` (TypeError / undefined on the first use).

- [ ] **Step 3: Implement** — confirm nothing else uses the old exports, then replace all of `src/lib/theme.ts`:

```bash
grep -rn "HEX\b\|rgbFloat\|PARTICLE_COLORS\|TokenName" src tests --include='*.ts' --include='*.tsx'
```

Expected before the rewrite: matches only in `src/lib/theme.ts` (and none in tests once Step 1 is in place).

```ts
/** Theme source of truth for the White Edition (spec §5.1, master plan C1/C2).
 *
 *  `TOKENS` holds the colour values; `src/app/globals.css` repeats them as raw
 *  CSS variables for `:root` (light), `[data-theme="dark"]` and the system-dark
 *  media block, because CSS cannot import TypeScript. tests/theme.test.ts reads
 *  globals.css and fails when the two drift -- change a colour in both places
 *  or the suite goes red.
 *
 *  The rest of this file is the runtime side of the Auto/Light/Dark choice:
 *  the inline pre-paint script (so the first frame is already the right theme)
 *  and the read/write helpers the toggles use. Every storage access sits in a
 *  try/catch: Safari private mode and "block site data" make `localStorage`
 *  throw on access, and a theme preference is never worth a crashed page. */

export type ThemePref = 'auto' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'klao-theme';

/** Fired on `window` after every writeThemePref, so each mounted toggle
 *  (footer, phone menu, ⌘K) shows the same pressed state. */
export const THEME_EVENT = 'klao:theme';

export type RawToken =
  | 'canvas'
  | 'mist'
  | 'card'
  | 'raised'
  | 'ink-1'
  | 'ink-2'
  | 'ink-3'
  | 'kram'
  | 'kram-hover'
  | 'on-kram'
  | 'link'
  | 'focus'
  | 'line'
  | 'ctl'
  | 'curtain'
  | 'w-aje'
  | 'w-gonai'
  | 'w-site'
  | 'gonai';

export const TOKENS: { light: Record<RawToken, string>; dark: Record<RawToken, string> } = {
  light: {
    canvas: '#FFFFFF',
    mist: '#F5F6F8',
    card: '#FFFFFF',
    // Sheets, menus, ⌘K: one step above card in dark mode.
    raised: '#FFFFFF',
    'ink-1': '#1A1C20',
    'ink-2': '#666970',
    // Large text only: 3.6:1 on canvas passes for 18.66px bold / 24px, not body.
    'ink-3': '#83868C',
    kram: '#26314A',
    'kram-hover': '#3C475E',
    'on-kram': '#FFFFFF',
    link: '#506CAF',
    focus: '#506CAF',
    line: 'rgb(20 26 44 / .10)',
    // Small glass controls (.ctl, .seg); same value as the --glass-ctl variable.
    ctl: 'rgb(236 237 241 / .72)',
    // Backdrop behind open dialogs.
    curtain: 'rgb(245 246 248 / .56)',
    'w-aje': '#F4F7FB',
    'w-gonai': '#F4F8F6',
    'w-site': '#F5F6F8',
    gonai: '#1C7A57',
  },
  dark: {
    canvas: '#0A0B0D',
    mist: '#141518',
    card: '#1C1E21',
    raised: '#25262A',
    'ink-1': '#F2F3F5',
    'ink-2': '#A6A9B0',
    'ink-3': '#777A80',
    kram: '#E0E8F9',
    'kram-hover': '#ECF1FB',
    'on-kram': '#171F30',
    link: '#91AAE1',
    focus: '#91AAE1',
    line: 'rgb(255 255 255 / .10)',
    ctl: 'rgb(58 60 66 / .60)',
    curtain: 'rgb(0 0 0 / .56)',
    'w-aje': '#0E131A',
    'w-gonai': '#0E1414',
    'w-site': '#141518',
    gonai: '#79C3A1',
  },
};

export function isThemePref(value: unknown): value is ThemePref {
  return value === 'auto' || value === 'light' || value === 'dark';
}

/** Inlined into <head> by src/app/[locale]/layout.tsx and run before first
 *  paint. It does two things and nothing else:
 *   1. adds `js` to <html> -- CSS gates every reveal on `html.js`, so a page
 *      whose scripts never run (or run late) keeps all content visible;
 *   2. sets `data-theme` when the visitor chose Light or Dark. Auto means no
 *      attribute, and globals.css follows `prefers-color-scheme`.
 *  Plain ES5 on purpose: it runs before any bundle, in every browser. */
export const THEME_PREPAINT_SCRIPT = `(function(){var d=document.documentElement;d.classList.add('js');try{var t=window.localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==='light'||t==='dark')d.setAttribute('data-theme',t);}catch(e){}})();`;

/** The visitor's saved choice. 'auto' when nothing valid is stored.
 *  When storage itself is blocked, the choice made earlier in this page view
 *  still lives on <html data-theme> (writeThemePref sets it either way), so a
 *  toggle mounted later -- the phone menu, ⌘K -- shows the truth instead of
 *  snapping back to Auto. On first load with blocked storage there is no
 *  attribute, so this is 'auto'. */
export function readThemePref(): ThemePref {
  if (typeof window === 'undefined') return 'auto';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePref(stored) ? stored : 'auto';
  } catch {
    const attr = document.documentElement.getAttribute('data-theme');
    return attr === 'light' || attr === 'dark' ? attr : 'auto';
  }
}

/** Applies a choice now and remembers it when storage allows. The <html>
 *  attribute is set first and unconditionally, so the page switches theme
 *  even when the save fails -- the choice then lasts for this page view. */
export function writeThemePref(pref: ThemePref): void {
  const next: ThemePref = isThemePref(pref) ? pref : 'auto';
  const root = document.documentElement;
  if (next === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', next);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Blocked or full storage: nothing to do, the attribute above already applied.
  }
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { pref: next } }));
}
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/theme.test.ts && npm run check`
Expected: 17 theme tests pass; `npm run check` green, 409 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme.ts tests/theme.test.ts
git commit -m "feat(theme): light/dark TOKENS, pre-paint script, storage-safe theme helpers

TOKENS carries the spec §5.1 palette. The pre-paint script adds html.js
and applies a stored Light/Dark choice before first paint. Every storage
access is guarded: with localStorage blocked the page still switches for
the session and nothing throws. Drops the dark-era HEX/rgbFloat/
PARTICLE_COLORS exports, whose last consumer (HeroMonument) is gone.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 5: `globals.css` — raw tokens, Tailwind mapping, legacy repoint, light base (C1)

**Files:** Modify `src/app/globals.css` (full rewrite), `tests/theme.test.ts` (import block + appended parity section), `src/components/sections/Hero.tsx` (pill class + its comment), `tests/hero.test.tsx` (one test added), `src/components/site-nav.css` (lines 25–32), `src/app/[locale]/layout.tsx` (skip-link classes) · Create `tests/globals-css.test.ts`
**Interfaces:** Consumes: `TOKENS`, `RawToken` (Task 4) · Produces:
- Raw variables on `:root` / `[data-theme="dark"]` / system dark (C1 list) plus the prototype extras master-plan R7 asks for, light and dark: `--raised --ctl --curtain --e4 --shot-dim` (`--ctl` = C1's `--glass-ctl`, same value, both kept), and `--kram-press --glass-hi --glass-edge --sheen --sat`; motion `--ease-drift --ease-glide --ease-settle --ease-exit --ease-tick --dur-tap(120ms) --dur-quick --dur-ui(320ms) --dur-enter --dur-sheet --dur-rise --dur-fade`.
- Tailwind utilities from `@theme inline static`: `*-canvas *-mist *-card *-ink-1 *-ink-2 *-ink-3 *-kram *-kram-hover *-on-kram *-link *-focus *-line *-wash-aje *-wash-gonai *-wash-site *-gonai`, and `font-sans` = `"Anuphan Thai", -apple-system, …` (the face itself arrives in Task 7).
- Legacy names repointed exactly per C1 (`dark→canvas`, `deep→mist`, `light→canvas`, `peri→kram`, `peri-deep→link`, `on-dark→ink-1`, `on-dark-soft→ink-2`, `on-dark-faint→line`, `on-dark-mid→ink-3`, `on-light→ink-1`, `on-light-soft→ink-2`, `on-light-faint→line`, `paper→canvas`, `ink→ink-1`, `soft→ink-2`; `line`, `card` are the new names) and `font-display`/`font-thai` → the same stack.
- `.hero-pill`, `.hero-pill-1..3` (legacy, P1 deletes).

- [ ] **Step 1: Write the failing tests**

(a) In `tests/theme.test.ts` replace the import block at the top

```ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  THEME_EVENT,
  THEME_PREPAINT_SCRIPT,
  THEME_STORAGE_KEY,
  TOKENS,
  isThemePref,
  readThemePref,
  writeThemePref,
} from '@/lib/theme';
```

with

```ts
// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  THEME_EVENT,
  THEME_PREPAINT_SCRIPT,
  THEME_STORAGE_KEY,
  TOKENS,
  isThemePref,
  readThemePref,
  writeThemePref,
  type RawToken,
} from '@/lib/theme';
```

and append at the end of the file:

```ts
// ---------------------------------------------------------------------------
// TOKENS <-> globals.css parity. CSS cannot import TypeScript, so the colour
// values live twice; these tests are what keeps the two copies equal. The
// three blocks are found by the marker comments globals.css carries above
// them (`/* tokens:light */`, `/* tokens:dark:system */`,
// `/* tokens:dark:attr */`).
// ---------------------------------------------------------------------------
const CSS = readFileSync('src/app/globals.css', 'utf8');
const norm = (v: string) => v.replace(/\s+/g, ' ').trim().toLowerCase();

function tokenBlock(marker: string): Record<string, string> {
  const at = CSS.indexOf(`/* ${marker} */`);
  if (at < 0) throw new Error(`globals.css lost its /* ${marker} */ marker`);
  const rest = CSS.slice(at);
  const open = rest.indexOf('{', rest.indexOf(':root'));
  const body = rest.slice(open + 1, rest.indexOf('}', open));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], norm(m[2])]),
  );
}

describe('globals.css mirrors TOKENS', () => {
  const light = tokenBlock('tokens:light');
  const darkSystem = tokenBlock('tokens:dark:system');
  const darkAttr = tokenBlock('tokens:dark:attr');
  const names = Object.keys(TOKENS.light) as RawToken[];

  it.each(names)('light --%s matches TOKENS.light', (name) => {
    expect(light[name]).toBe(norm(TOKENS.light[name]));
  });

  it.each(names)('system-dark --%s matches TOKENS.dark', (name) => {
    expect(darkSystem[name]).toBe(norm(TOKENS.dark[name]));
  });

  it.each(names)('toggle-dark --%s matches TOKENS.dark', (name) => {
    expect(darkAttr[name]).toBe(norm(TOKENS.dark[name]));
  });

  it('keeps the two dark blocks identical, so Auto-on-a-dark-Mac and the Dark toggle look the same', () => {
    expect(darkAttr).toEqual(darkSystem);
  });

  it('defines the same variables in light and dark, so no token silently keeps its light value in dark', () => {
    expect(Object.keys(darkAttr).sort()).toEqual(Object.keys(light).sort());
  });
});
```

(b) Create `tests/globals-css.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// globals.css is the one token layer every phase builds on (master plan C1,
// C9). jsdom never computes styles, so these tests read the stylesheet as
// text and pin the parts other code relies on by name. They are deliberately
// about names and wiring, not pixel values -- tests/theme.test.ts owns the
// colour values.
const CSS = readFileSync('src/app/globals.css', 'utf8');
const NAV_CSS = readFileSync('src/components/site-nav.css', 'utf8');
// Comments may name what was removed; only live rules count.
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const CODE = stripComments(CSS);

/** Declarations of every `@theme ... { }` block, as name -> value. */
function themeDecls(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const block of CODE.matchAll(/@theme[^{]*\{([^}]*)\}/g)) {
    for (const m of block[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  }
  return out;
}

describe('Tailwind mapping (C1)', () => {
  const theme = themeDecls();

  it.each([
    ['color-canvas', 'var(--canvas)'],
    ['color-mist', 'var(--mist)'],
    ['color-card', 'var(--card)'],
    ['color-ink-1', 'var(--ink-1)'],
    ['color-ink-2', 'var(--ink-2)'],
    ['color-ink-3', 'var(--ink-3)'],
    ['color-kram', 'var(--kram)'],
    ['color-kram-hover', 'var(--kram-hover)'],
    ['color-on-kram', 'var(--on-kram)'],
    ['color-link', 'var(--link)'],
    ['color-focus', 'var(--focus)'],
    ['color-line', 'var(--line)'],
    ['color-wash-aje', 'var(--w-aje)'],
    ['color-wash-gonai', 'var(--w-gonai)'],
    ['color-wash-site', 'var(--w-site)'],
    ['color-gonai', 'var(--gonai)'],
  ])('--%s reads %s', (name, value) => {
    expect(theme[name]).toBe(value);
  });

  it.each([
    ['color-dark', 'var(--canvas)'],
    ['color-deep', 'var(--mist)'],
    ['color-light', 'var(--canvas)'],
    ['color-peri', 'var(--kram)'],
    ['color-peri-deep', 'var(--link)'],
    ['color-on-dark', 'var(--ink-1)'],
    ['color-on-dark-soft', 'var(--ink-2)'],
    ['color-on-dark-faint', 'var(--line)'],
    ['color-on-dark-mid', 'var(--ink-3)'],
    ['color-on-light', 'var(--ink-1)'],
    ['color-on-light-soft', 'var(--ink-2)'],
    ['color-on-light-faint', 'var(--line)'],
    ['color-paper', 'var(--canvas)'],
    ['color-ink', 'var(--ink-1)'],
    ['color-soft', 'var(--ink-2)'],
  ])('legacy --%s is repointed to %s until P5 deletes it', (name, value) => {
    expect(theme[name]).toBe(value);
  });

  it('holds no literal colour in any Tailwind colour token -- every one follows the theme', () => {
    for (const [name, value] of Object.entries(theme)) {
      if (!name.startsWith('color-')) continue;
      expect(value, `--${name}`).toMatch(/^var\(--[\w-]+\)$/);
    }
  });

  it('keeps the colour tokens on :root even before a utility uses them (hand-written CSS reads them)', () => {
    for (const block of CODE.matchAll(/@theme([^{]*)\{/g)) {
      expect(block[1]).toContain('inline');
      expect(block[1]).toContain('static');
    }
  });
});

describe('fonts', () => {
  const theme = themeDecls();

  it('drops Space Grotesk entirely', () => {
    expect(CODE).not.toMatch(/font-sg|Space Grotesk|Space_Grotesk/);
  });

  it('puts Anuphan Thai first and the system stack behind it for Latin', () => {
    expect(theme['font-sans']).toMatch(/^"Anuphan Thai", -apple-system, BlinkMacSystemFont/);
    expect(theme['font-sans']).toMatch(/sans-serif$/);
  });

  it('points the legacy display/thai font utilities at the same stack', () => {
    expect(theme['font-display']).toBe('var(--font-sans)');
    expect(theme['font-thai']).toBe('var(--font-sans)');
  });

  it('sets body copy to 17/25 with Thai at 1.65 and zero tracking', () => {
    expect(CSS).toMatch(/body \{[^}]*font-family: var\(--font-sans\);[^}]*font-size: 17px;[^}]*line-height: 25px;/);
    expect(CSS).toMatch(/body:lang\(th\) \{[^}]*line-height: 1\.65;[^}]*letter-spacing: 0;/);
  });
});

describe('no dark-era surface survives', () => {
  it('has no film grain, ambient glow or nav-on-light inversion left', () => {
    expect(CODE).not.toMatch(/feTurbulence|radial-gradient|nav-on-light|#17171a|#101013/i);
    expect(stripComments(NAV_CSS)).not.toMatch(/rgba\(23, 23, 26|nav-on-light/);
  });

  it('turns the old bg-light + text-dark primary pills into Kram buttons instead of white-on-white', () => {
    expect(CSS).toMatch(/\.bg-light\.text-dark \{[^}]*background-color: var\(--kram\);[^}]*color: var\(--on-kram\);/);
  });

  it('renames the hero annotation pills so the shared .pill chip is free', () => {
    expect(CSS).toMatch(/\.hero-pill \{/);
    expect(CODE).not.toMatch(/(^|[\s,}])\.pill-\d/m);
  });
});
```

(c) In `tests/hero.test.tsx`, directly after the test `'hides the annotation pills from assistive tech'`, add:

```tsx

  it('styles the annotation pills with .hero-pill, leaving the shared .pill chip class free', () => {
    const { container } = render(<Hero profile={profile} locale="en" />);
    const pills = container.querySelectorAll('[data-pills] > span');
    expect(pills).toHaveLength(3);
    pills.forEach((pill, i) => {
      expect(pill.classList.contains('hero-pill')).toBe(true);
      expect(pill.classList.contains(`hero-pill-${i + 1}`)).toBe(true);
      expect(pill.classList.contains('pill')).toBe(false);
    });
  });
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/theme.test.ts tests/globals-css.test.ts tests/hero.test.tsx`
Expected: FAIL — `tests/theme.test.ts` fails to collect with `globals.css lost its /* tokens:light */ marker`; `tests/globals-css.test.ts` fails the mapping tests (`expected undefined to be 'var(--canvas)'`), the font tests and the dark-leftover tests; the new hero test fails (`pill` class still present).

- [ ] **Step 3: Implement**

(a) Replace all of `src/app/globals.css` with:

```css
@import "tailwindcss";

/* =====================================================================
   White Edition tokens (spec §5.1 · master plan C1).
   Raw variables, one set per theme. src/lib/theme.ts `TOKENS` mirrors the
   nineteen colour tokens it names, and tests/theme.test.ts reads the three
   blocks below by their marker comments -- keep the markers, and change a
   colour here and in theme.ts together or the suite goes red.
   Light is the default. Dark comes from the system (Auto) or from
   <html data-theme="dark"> (the toggle); data-theme="light" pins light
   even on a dark system.
   ===================================================================== */

/* tokens:light */
:root {
  color-scheme: light;
  --canvas: #FFFFFF;
  --mist: #F5F6F8;
  --card: #FFFFFF;
  --raised: #FFFFFF;
  --ink-1: #1A1C20;
  --ink-2: #666970;
  --ink-3: #83868C;
  --kram: #26314A;
  --kram-hover: #3C475E;
  --kram-press: #20293F;
  --on-kram: #FFFFFF;
  --link: #506CAF;
  --focus: #506CAF;
  --select: #D6E0F7;
  --line: rgb(20 26 44 / .10);
  --spine: rgb(20 26 44 / .22);
  --out-hover: #F0F3F9;
  --w-aje: #F4F7FB;
  --w-gonai: #F4F8F6;
  --w-site: #F5F6F8;
  --gonai: #1C7A57;
  --e1: 0 0 0 1px rgb(20 26 44 / .06), 0 1px 2px rgb(20 26 44 / .05);
  --e2: 0 0 0 1px rgb(20 26 44 / .05), 0 2px 4px rgb(20 26 44 / .04), 0 12px 28px -8px rgb(20 26 44 / .12), 0 32px 64px -32px rgb(20 26 44 / .18);
  --e3: 0 1px 2px rgb(20 26 44 / .06), 0 8px 20px -6px rgb(20 26 44 / .12), 0 24px 48px -16px rgb(20 26 44 / .16);
  --e4: 0 2px 6px rgb(20 26 44 / .08), 0 24px 56px -12px rgb(20 26 44 / .24), 0 64px 120px -40px rgb(20 26 44 / .30);
  --curtain: rgb(245 246 248 / .56);
  /* Liquid Glass on white (spec §5.4). Alpha floor .78 keeps text over busy
     screenshots legible. */
  --glass-nav: rgb(255 255 255 / .78);
  --glass-pill: rgb(255 255 255 / .80);
  --glass-ctl: rgb(236 237 241 / .72);
  /* --ctl is the prototype's name for --glass-ctl; both stay, same value. */
  --ctl: rgb(236 237 241 / .72);
  --glass-rim: rgb(20 26 44 / .07);
  --glass-hi: rgb(255 255 255 / .9);
  --glass-edge: rgb(20 26 44 / .04);
  --sheen: rgb(255 255 255 / .45);
  --sat: 180%;
  --shot-dim: none;
}

/* tokens:dark:system */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --canvas: #0A0B0D;
    --mist: #141518;
    --card: #1C1E21;
    --raised: #25262A;
    --ink-1: #F2F3F5;
    --ink-2: #A6A9B0;
    --ink-3: #777A80;
    --kram: #E0E8F9;
    --kram-hover: #ECF1FB;
    --kram-press: #D3DDF4;
    --on-kram: #171F30;
    --link: #91AAE1;
    --focus: #91AAE1;
    --select: #2E3C5D;
    --line: rgb(255 255 255 / .10);
    --spine: rgb(255 255 255 / .22);
    --out-hover: #1C2230;
    --w-aje: #0E131A;
    --w-gonai: #0E1414;
    --w-site: #141518;
    --gonai: #79C3A1;
    --e1: inset 0 0 0 1px rgb(255 255 255 / .06);
    --e2: inset 0 1px 0 rgb(255 255 255 / .06), 0 0 0 1px rgb(255 255 255 / .06), 0 16px 40px -12px rgb(0 0 0 / .6);
    --e3: 0 0 0 1px rgb(255 255 255 / .08), 0 12px 32px -12px rgb(0 0 0 / .6);
    --e4: inset 0 1px 0 rgb(255 255 255 / .08), 0 32px 80px -20px rgb(0 0 0 / .7);
    --curtain: rgb(0 0 0 / .56);
    --glass-nav: rgb(28 30 33 / .78);
    --glass-pill: rgb(28 30 33 / .82);
    --glass-ctl: rgb(58 60 66 / .60);
    --ctl: rgb(58 60 66 / .60);
    --glass-rim: rgb(255 255 255 / .08);
    --glass-hi: rgb(255 255 255 / .10);
    --glass-edge: rgb(0 0 0 / .2);
    --sheen: rgb(255 255 255 / .06);
    --sat: 140%;
    --shot-dim: brightness(.92);
  }
}

/* tokens:dark:attr */
:root[data-theme="dark"] {
  color-scheme: dark;
  --canvas: #0A0B0D;
  --mist: #141518;
  --card: #1C1E21;
  --raised: #25262A;
  --ink-1: #F2F3F5;
  --ink-2: #A6A9B0;
  --ink-3: #777A80;
  --kram: #E0E8F9;
  --kram-hover: #ECF1FB;
  --kram-press: #D3DDF4;
  --on-kram: #171F30;
  --link: #91AAE1;
  --focus: #91AAE1;
  --select: #2E3C5D;
  --line: rgb(255 255 255 / .10);
  --spine: rgb(255 255 255 / .22);
  --out-hover: #1C2230;
  --w-aje: #0E131A;
  --w-gonai: #0E1414;
  --w-site: #141518;
  --gonai: #79C3A1;
  --e1: inset 0 0 0 1px rgb(255 255 255 / .06);
  --e2: inset 0 1px 0 rgb(255 255 255 / .06), 0 0 0 1px rgb(255 255 255 / .06), 0 16px 40px -12px rgb(0 0 0 / .6);
  --e3: 0 0 0 1px rgb(255 255 255 / .08), 0 12px 32px -12px rgb(0 0 0 / .6);
  --e4: inset 0 1px 0 rgb(255 255 255 / .08), 0 32px 80px -20px rgb(0 0 0 / .7);
  --curtain: rgb(0 0 0 / .56);
  --glass-nav: rgb(28 30 33 / .78);
  --glass-pill: rgb(28 30 33 / .82);
  --glass-ctl: rgb(58 60 66 / .60);
  --ctl: rgb(58 60 66 / .60);
  --glass-rim: rgb(255 255 255 / .08);
  --glass-hi: rgb(255 255 255 / .10);
  --glass-edge: rgb(0 0 0 / .2);
  --sheen: rgb(255 255 255 / .06);
  --sat: 140%;
  --shot-dim: brightness(.92);
}

/* Motion (spec §5.5). Theme-independent. Only transform and opacity ever
   animate on this site. */
:root {
  --ease-drift: cubic-bezier(.28, .11, .32, 1);
  --ease-glide: cubic-bezier(.4, 0, .6, 1);
  --ease-settle: cubic-bezier(.32, .72, 0, 1);
  --ease-exit: cubic-bezier(.4, 0, 1, 1);
  --ease-tick: cubic-bezier(.34, 1.56, .64, 1);
  --dur-tap: 120ms;
  --dur-quick: 200ms;
  --dur-ui: 320ms;
  --dur-enter: 420ms;
  --dur-sheet: 500ms;
  --dur-rise: 600ms;
  --dur-fade: 800ms;
}

/* Higher contrast on request. Plain :root (0,1,0) on purpose: both dark
   blocks above out-rank it, so dark mode never inherits this light-only grey. */
@media (prefers-contrast: more) {
  :root { --ink-2: #4A4D54; }
}

/* Tailwind names for the raw variables (bg-canvas, text-ink-2, bg-kram,
   border-line, bg-wash-gonai, ...). `inline` makes each utility read the raw
   variable directly, so a theme switch on <html> repaints every utility with
   no second variable in between. `static` keeps these on :root even when no
   utility uses one yet, so hand-written CSS files can rely on them too.
   Fonts: Latin runs on the system stack (SF Pro on Apple devices). "Anuphan
   Thai" goes first, but its @font-face covers the Thai block only, so Latin
   characters fall straight through to the system font. */
@theme inline static {
  --color-canvas: var(--canvas);
  --color-mist: var(--mist);
  --color-card: var(--card);
  --color-ink-1: var(--ink-1);
  --color-ink-2: var(--ink-2);
  --color-ink-3: var(--ink-3);
  --color-kram: var(--kram);
  --color-kram-hover: var(--kram-hover);
  --color-on-kram: var(--on-kram);
  --color-link: var(--link);
  --color-focus: var(--focus);
  --color-line: var(--line);
  --color-wash-aje: var(--w-aje);
  --color-wash-gonai: var(--w-gonai);
  --color-wash-site: var(--w-site);
  --color-gonai: var(--gonai);
  --font-sans: "Anuphan Thai", -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, "Leelawadee UI", Thonburi, "Noto Sans Thai UI", "Noto Sans Thai", sans-serif;
}

/* LEGACY NAMES -- P5 deletes this block once `grep` finds no usage.
   The dark-era sections (Hero, TourBand, AboutBand, CraftBand, WorkDeck,
   QuestionsBand, SkillsBand, CvBand, ContactBand, SiteNav, SiteFooter) and the
   four untouched routes still spell colours with the old names. Pointing each
   old name at its White Edition role makes every one of them render light (or
   dark, with the theme) until its own phase replaces it: surfaces become
   canvas/mist, text becomes ink, the periwinkle accent becomes Kram. `line`
   and `card` need no alias -- the new block above already defines them.
   `--font-display` / `--font-thai` keep the old `font-display` / `font-thai`
   utilities working; both now resolve to the one stack above. */
@theme inline static {
  --color-dark: var(--canvas);
  --color-deep: var(--mist);
  --color-light: var(--canvas);
  --color-peri: var(--kram);
  --color-peri-deep: var(--link);
  --color-on-dark: var(--ink-1);
  --color-on-dark-soft: var(--ink-2);
  --color-on-dark-faint: var(--line);
  --color-on-dark-mid: var(--ink-3);
  --color-on-light: var(--ink-1);
  --color-on-light-soft: var(--ink-2);
  --color-on-light-faint: var(--line);
  --color-paper: var(--canvas);
  --color-ink: var(--ink-1);
  --color-soft: var(--ink-2);
  --font-display: var(--font-sans);
  --font-thai: var(--font-sans);
}

@layer base {
  html {
    background: var(--canvas);
    -webkit-text-size-adjust: 100%;
    scroll-padding-top: 76px;
  }
  /* Body 17/25 with SF Pro Text tracking (spec §5.2). Thai: one stack, looser
     leading, zero letter-spacing -- tracking pulls Thai marks off their base
     letters. */
  body {
    background: var(--canvas);
    color: var(--ink-1);
    font-family: var(--font-sans);
    font-size: 17px;
    line-height: 25px;
    letter-spacing: -.022em;
    font-synthesis-style: none;
    -webkit-font-smoothing: antialiased;
    overflow-x: clip;
  }
  body:lang(th) {
    line-height: 1.65;
    letter-spacing: 0;
  }
  /* Thai has no italic; emphasis is weight. */
  :lang(th) em,
  :lang(th) i {
    font-style: normal;
    font-weight: 600;
  }
  a {
    color: var(--link);
    text-decoration-thickness: 1px;
    text-underline-offset: .12em;
  }
  /* Thai marks sit below the baseline; a Latin offset cuts through them. */
  a:lang(th) { text-underline-offset: .3em; }
  button { letter-spacing: inherit; }
  ::selection {
    background: var(--select);
    color: var(--ink-1);
  }
  :focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }
  [tabindex="-1"]:focus { outline: none; }
}

/* LEGACY COMPONENT CSS -- still used by dark-era sections that P1-P4 replace;
   each block names its owner so the replacing phase can delete it. Colours
   now come from the White Edition tokens, so nothing here paints a dark band. */
@layer components {
  /* MaskedHeading (Hero, AboutBand, CraftBand, WorkDeck, ClientsBand,
     SkillsBand, ContactBand). The component adds `rv-mask` from its effect
     only, so words are never hidden without JavaScript. */
  .rv-mask { overflow: hidden; }
  .rv-mask .w {
    display: inline-block;
    transform: translateY(112%);
    transition: transform 0.95s cubic-bezier(0.16, 1, 0.3, 1);
    transition-delay: calc(var(--wi, 0) * 52ms);
  }
  .rv-mask.in .w { transform: none; }

  /* Hero annotation pills (Hero.tsx, replaced in P1). Renamed from `.pill`,
     which is now the shared 28 px chip. Decoration only (aria-hidden). */
  .hero-pill {
    position: absolute;
    z-index: 3;
    white-space: nowrap;
    font-size: 11px;
    font-weight: 500;
    color: var(--ink-1);
    background: var(--mist);
    border: 1px solid var(--line);
    border-radius: 100px;
    padding: 8px 15px;
  }
  .hero-pill-1 { right: 13%; left: auto; top: 27%; animation: hero-pill-drift-1 9s ease-in-out infinite 1.1s; }
  .hero-pill-2 { right: 7%; top: 43%; animation: hero-pill-drift-2 11s ease-in-out infinite 1.5s; }
  .hero-pill-3 { right: 18%; left: auto; bottom: 30%; animation: hero-pill-drift-3 10s ease-in-out infinite 0.8s; }
  @keyframes hero-pill-drift-1 { 0%, 100% { translate: 0 0; } 50% { translate: 0 -10px; } }
  @keyframes hero-pill-drift-2 { 0%, 100% { translate: 0 0; } 50% { translate: 0 12px; } }
  @keyframes hero-pill-drift-3 { 0%, 100% { translate: 0 0; } 50% { translate: 7px -7px; } }
  @media (max-width: 1080px) {
    .hero-pill { display: none; }
  }

  /* SiteNav links (replaced in P1). One colour pair for every band now that
     no band is dark -- the old nav-on-light inversion has nothing to invert. */
  .nav-link,
  .nav-social {
    color: var(--ink-2);
    transition: color 0.25s;
  }
  .nav-link:hover,
  .nav-social:hover { color: var(--ink-1); }
  .nav-mark { transition: background 0.4s, color 0.4s, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
  .nav-mark:hover { transform: rotate(-12deg) scale(1.06); }

  /* Hero portrait halo (replaced in P1). */
  .halo { animation: halo-spin 24s linear infinite; }
  @keyframes halo-spin { to { transform: rotate(360deg); } }

  /* Underline that draws in from the left (SiteNav links, replaced in P1). */
  .u-draw { position: relative; }
  .u-draw::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: -2px;
    height: 1px;
    background: currentColor;
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .u-draw:hover::after,
  .u-draw:focus-visible::after { transform: scaleX(1); }
}

/* LEGACY, unlayered on purpose (unlayered CSS outranks Tailwind's utilities
   layer). The dark-era primary pills paired `bg-light` with `text-dark`: a
   light fill with dark text on a dark band. With both names now pointing at
   canvas they would read white on white, so the pair becomes the White
   Edition primary button instead: Kram fill, on-Kram text. Covers Hero,
   ContactBand and WorkDeck CTAs, both not-found pages and the SiteNav
   monogram. P5 deletes it with the legacy names. */
.bg-light.text-dark {
  background-color: var(--kram);
  color: var(--on-kram);
}

/* LEGACY, unlayered: Thai marks stack above and below the base letter and
   need more leading than the old headings' tight `leading-[1.08]` utilities
   give (MaskedHeading headings in the dark-era sections). The White Edition
   type classes carry their own Thai line-heights, so they are excluded. */
:lang(th) :is(h1, h2, h3):not(.t-hero, .t-h2, .t-title, .t-panel, .t-faq) {
  line-height: 1.5;
}

@media (prefers-reduced-motion: reduce) {
  .rv-mask .w { transform: none !important; transition: none !important; }
  .hero-pill { animation: none !important; }
  /* Releases Hero's 130vh sticky stage: a reduced-motion visitor should not
     scroll through empty space. */
  #hero { height: auto !important; min-height: 100vh; }
  #hero [data-hero-stage] {
    position: static !important;
    height: auto !important;
    min-height: 100vh;
    opacity: 1 !important;
    visibility: visible !important;
  }
  /* Rotation is motion; the colour fade on .nav-mark is not, so only
     transform is neutralised. */
  .nav-mark:hover { transform: none !important; }
  /* The burger's X must still appear -- only its tween goes. */
  .nav-burger span { transition-property: opacity !important; }
  .halo { animation: none !important; }
  .u-draw::after { transition: none !important; }
}
```

(b) In `src/components/sections/Hero.tsx` replace

```tsx
        {/* Decoration only -- the same three facts appear in the copy below.
            Absolutely positioned (see #hero .pill in globals.css), so its
```

with

```tsx
        {/* Decoration only -- the same three facts appear in the copy below.
            Absolutely positioned (see .hero-pill in globals.css), so its
```

and replace

```tsx
            <span key={label} className={`pill pill-${i + 1}`} style={{ ['--pi' as string]: String(i) }}>
```

with

```tsx
            <span key={label} className={`hero-pill hero-pill-${i + 1}`} style={{ ['--pi' as string]: String(i) }}>
```

(c) In `src/components/site-nav.css` replace

```css
  header.nav-chrome.nav-solid { background-color: rgba(23, 23, 26, 0.94); }
  /* Over a light band the solid fill must be light, or the inverted
     dark-on-light link colors land on a dark background. */
  header.nav-chrome.nav-solid.nav-on-light { background-color: rgba(255, 255, 255, 0.96); }

  /* Burger inherits currentColor; give it the same inversion the links get. */
  header.nav-chrome .nav-burger { color: var(--color-on-dark); }
  header.nav-on-light .nav-burger { color: var(--color-on-light); }
```

with

```css
  /* White Edition P0: every band is light (or dark, with the theme), so the
     scrolled header is one canvas-coloured fill and the burger one ink colour.
     The old nav-on-light inversion had nothing left to invert. P1 replaces
     this file with the capsule glass nav. */
  header.nav-chrome.nav-solid { background-color: color-mix(in srgb, var(--canvas) 94%, transparent); }
  header.nav-chrome .nav-burger { color: var(--ink-1); }
```

SiteNav.tsx keeps toggling the `nav-on-light` class (its tests assert that); the class simply has no styles now.

(d) In `src/app/[locale]/layout.tsx`, in the skip link's `className`, replace `focus:bg-light` with `focus:bg-kram` and `focus:text-dark` with `focus:text-on-kram`:

```tsx
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-kram focus:px-5 focus:py-3 focus:text-[13px] focus:font-semibold focus:text-on-kram"
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/theme.test.ts tests/globals-css.test.ts tests/hero.test.tsx && npm run check`
Expected: theme 76, globals-css 40, hero all pass; `npm run check` green, 509 tests.

- [ ] **Step 5: Screenshot check** (Appendix A; the pre-paint script does not exist yet, so only the light default and the system-dark path are checked)

Start `npm run dev` in the background (for example the Bash tool with `run_in_background`), then:

Run: `MODES=light,system-dark PREPAINT=0 node /tmp/klao-qa/shoot.mjs p0-t5`
Expected: 8 lines `ok`, then `all shots ok`. Open `/tmp/klao-qa/p0-t5/en-light-1440.png`, `th-light-390.png` and `en-system-dark-1440.png` and confirm: a white page with no charcoal band anywhere (tour and craft bands are the pale mist grey); the hero's "Start a conversation" pill is Kram navy with white text; the nav monogram is a Kram disc; the system-dark shots are near-black with light text. Thai is still in the system Thai font here (Anuphan arrives in Task 7). Stop the dev server (`pkill -f "next dev"`).

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css tests/theme.test.ts tests/globals-css.test.ts src/components/sections/Hero.tsx tests/hero.test.tsx src/components/site-nav.css src/app/[locale]/layout.tsx
git commit -m "feat(css): White Edition token layer; the current page renders light

Raw light/dark variables (spec §5.1) with a TOKENS parity test, Tailwind
names via @theme inline static, and the dark-era colour names repointed
to their White Edition roles until P5. Film grain, glow, nav-on-light and
the dark nav fill are gone; the old bg-light+text-dark pills become Kram
buttons instead of white on white. Latin now runs on the system stack.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 6: Shared classes — type scale, layout, controls, glass, surfaces, `.nw`, `.rv` (C9)

**Files:** Modify `src/app/globals.css` (append one block at the end), `tests/globals-css.test.ts` (append one section at the end)
**Interfaces:** Consumes: the raw variables from Task 5 · Produces (all in `@layer components`, so Tailwind utilities on the same element still win):
- Type: `.t-hero .t-h2 .t-title .t-panel .t-faq .t-eyebrow .t-lead .t-body .t-cap .t-legal .t-stat`, each with a `:lang(th)` variant (except `.t-stat`) and phone (≤ 734 px) values; `.t-h2` also steps at ≤ 1068 px.
- Layout: `.wrap` (980), `.wrap-wide` (1040), `.section` (144 / phone 96 top), `.band` (mist, 144 above, 128 / phone 96 inside).
- Controls: `.btn` + `.btn-fill` / `.btn-out`; `.pill` (28 px chip); `.glass` + `.glass.glass-pill` (the prototype's `.glass.pill`) + `.ctl` (small glass controls), all turning solid for reduced transparency, higher contrast, no backdrop support.
- Surfaces: `.tile` (r28, mist, no shadow); `.win` (screenshot window, r14, `--e2`, hairline, `--shot-dim` on its img).
- `.nw` (C3 keep-span: inline-block + nowrap).
- `.rv` / `.rv.big` / `.rv.in`: dims to .55 and lowers 16 px (24 px for `.big`) only under `html.js` and `prefers-reduced-motion: no-preference`; `--i` keeps the old sections' 75 ms stagger.
- View-transition timing for the theme cross-fade (Task 9), off under reduced motion.

- [ ] **Step 1: Write the failing test** — append to the end of `tests/globals-css.test.ts`:

```ts
// ---------------------------------------------------------------------------
// Shared classes (C9). P1-P4 are written against these names in parallel;
// renaming one here breaks every section that uses it, so each name is pinned.
// ---------------------------------------------------------------------------
/** Splits a selector list on top-level commas (not the ones inside :not()). */
function splitSelectors(list: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of list) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** Every declaration block whose selector list contains `selector` exactly. */
function rulesFor(selector: string): string[] {
  const out: string[] = [];
  for (const m of CODE.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (splitSelectors(m[1]).includes(selector)) out.push(m[2]);
  }
  return out;
}

/** The balanced `{ ... }` block that opens at the first `{` after `from`. */
function blockFrom(css: string, from: number): string {
  const open = css.indexOf('{', from);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) return css.slice(from, i + 1);
  }
  throw new Error('unbalanced braces in globals.css');
}

describe('shared classes (C9)', () => {
  it.each([
    '.t-hero', '.t-h2', '.t-title', '.t-panel', '.t-faq', '.t-eyebrow', '.t-lead',
    '.t-body', '.t-cap', '.t-legal', '.t-stat',
    '.wrap', '.wrap-wide', '.section', '.band',
    '.btn', '.btn-fill', '.btn-out', '.pill', '.glass', '.tile', '.win', '.nw',
  ])('defines %s', (selector) => {
    expect(rulesFor(selector).length, `${selector} has no rule`).toBeGreaterThan(0);
  });

  it('gives every display class a Thai variant with zero letter-spacing', () => {
    for (const cls of ['.t-hero', '.t-h2', '.t-title', '.t-panel', '.t-faq', '.t-eyebrow', '.t-lead', '.t-body', '.t-cap', '.t-legal']) {
      const thai = rulesFor(`${cls}:lang(th)`).join(' ');
      expect(thai, `${cls}:lang(th)`).toMatch(/letter-spacing: 0;/);
    }
  });

  it('sets Thai one size step below English for the headline classes', () => {
    const px = (decls: string) => Number(/font-size: (\d+)px/.exec(decls)?.[1]);
    expect(px(rulesFor('.t-h2:lang(th)')[0])).toBeLessThan(px(rulesFor('.t-h2')[0]));
    expect(px(rulesFor('.t-title:lang(th)')[0])).toBeLessThan(px(rulesFor('.t-title')[0]));
    expect(px(rulesFor('.t-faq:lang(th)')[0])).toBeLessThan(px(rulesFor('.t-faq')[0]));
    expect(rulesFor('.t-hero:lang(th)')[0]).toContain('clamp(34px, 3.9vw, 56px)');
  });

  it('uses the Apple CTA: 44 px pill at weight 400', () => {
    const btn = rulesFor('.btn')[0];
    expect(btn).toContain('min-height: 44px;');
    expect(btn).toContain('font-weight: 400;');
    expect(btn).toContain('border-radius: 999px;');
    expect(rulesFor('.btn-fill')[0]).toContain('background: var(--kram);');
  });

  it('keeps tiles flat (r28, mist, no shadow) and gives screenshot windows the e2 shadow', () => {
    expect(rulesFor('.tile')[0]).toMatch(/border-radius: 28px;[\s\S]*box-shadow: none;/);
    expect(rulesFor('.win')[0]).toContain('box-shadow: var(--e2);');
  });

  it('makes .nw an unbreakable inline-block (C3 keep-span)', () => {
    const nw = rulesFor('.nw')[0];
    expect(nw).toContain('display: inline-block;');
    expect(nw).toContain('white-space: nowrap;');
  });

  it('turns glass solid for reduced transparency, higher contrast and no backdrop-filter support', () => {
    expect(CODE).toMatch(/@media \(prefers-reduced-transparency: reduce\)[\s\S]*?\.glass/);
    expect(CODE).toMatch(/@media \(prefers-contrast: more\)[\s\S]*?\.glass/);
    expect(CODE).toMatch(/@supports not \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\)[\s\S]*?\.glass/);
  });

  // Review Focus #4: before hydration, or with scripts off, nothing may be
  // hidden. The only rule that dims .rv must sit behind BOTH gates.
  it('dims .rv only under html.js and prefers-reduced-motion: no-preference, and never below .55', () => {
    const at = CODE.indexOf('@media (prefers-reduced-motion: no-preference)');
    expect(at, 'no-preference media block').toBeGreaterThan(-1);
    const gated = blockFrom(CODE, at);
    expect(gated).toMatch(/html\.js \.rv \{[^}]*opacity: \.55;/);
    expect(gated).toMatch(/html\.js \.rv\.in \{ opacity: 1; transform: none; \}/);
    // Outside that block no rule may touch a .rv element's opacity.
    const rest = CODE.replace(gated, '');
    for (const m of rest.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (/\.rv\b(?!-)/.test(m[1])) expect(m[2], m[1].trim()).not.toContain('opacity');
    }
  });

  it('keeps the phone breakpoint at 734 px and phone legal text at 14 px', () => {
    expect(CODE).toMatch(/@media \(max-width: 734px\)[\s\S]*?\.t-hero \{ font-size: 40px; line-height: 44px; \}/);
    expect(CODE).toMatch(/\.t-legal:lang\(th\) \{ font-size: 14px; line-height: 21px; \}/);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/globals-css.test.ts`
Expected: FAIL — `defines .t-hero` … `defines .nw` (`.t-hero has no rule`), and the Thai, CTA, tile, glass, `.rv` and breakpoint tests.

- [ ] **Step 3: Implement** — append to the end of `src/app/globals.css`:

```css
/* =====================================================================
   Shared White Edition classes (master plan C9). P1-P4 build every
   section from these; tests/globals-css.test.ts pins their names.
   Values: spec §5.2-§5.5 and the prototype's Apple-calibrated CSS.
   Breakpoints are apple.com's: phone <= 734 px, tablet <= 1068 px.
   Thai is one size step smaller than English and never tracked.
   All of it sits in @layer components, so a Tailwind utility on the same
   element (mt-8, text-center, ...) still wins.
   ===================================================================== */
@layer components {
  /* ---- type scale ---------------------------------------------------- */
  .t-hero {
    margin: 0;
    font-size: clamp(40px, 4.45vw, 64px);
    line-height: 1.0625;
    font-weight: 600;
    letter-spacing: -.009em;
    text-wrap: balance;
  }
  .t-hero:lang(th) {
    font-size: clamp(34px, 3.9vw, 56px);
    line-height: 1.3;
    letter-spacing: 0;
  }
  .t-h2 {
    margin: 0;
    font-size: 48px;
    line-height: 52px;
    font-weight: 600;
    letter-spacing: -.003em;
    text-wrap: balance;
  }
  .t-h2:lang(th) { font-size: 44px; line-height: 57px; letter-spacing: 0; }
  .t-title {
    margin: 0;
    font-size: 28px;
    line-height: 32px;
    font-weight: 600;
    letter-spacing: .007em;
    text-wrap: balance;
  }
  .t-title:lang(th) { font-size: 26px; line-height: 36px; letter-spacing: 0; }
  .t-panel {
    margin: 0;
    font-size: 32px;
    line-height: 36px;
    font-weight: 600;
    letter-spacing: .004em;
  }
  .t-panel:lang(th) { font-size: 28px; line-height: 38px; letter-spacing: 0; }
  .t-faq {
    margin: 0;
    font-size: 28px;
    line-height: 32px;
    font-weight: 600;
    letter-spacing: .007em;
  }
  .t-faq:lang(th) { font-size: 26px; line-height: 36px; letter-spacing: 0; }
  .t-eyebrow {
    margin: 0 0 10px;
    font-size: 21px;
    line-height: 25px;
    font-weight: 600;
    color: var(--ink-2);
    letter-spacing: .011em;
  }
  .t-eyebrow:lang(th) { line-height: 28px; letter-spacing: 0; }
  .t-lead {
    margin: 14px 0 0;
    font-size: 21px;
    line-height: 29px;
    color: var(--ink-2);
    letter-spacing: .011em;
    text-wrap: pretty;
  }
  .t-lead:lang(th) { line-height: 32px; letter-spacing: 0; }
  .t-body {
    font-size: 17px;
    line-height: 25px;
    letter-spacing: -.022em;
  }
  .t-body:lang(th) { line-height: 1.65; letter-spacing: 0; }
  .t-cap {
    font-size: 14px;
    line-height: 20px;
    color: var(--ink-2);
    letter-spacing: -.016em;
  }
  .t-cap:lang(th) { line-height: 22px; letter-spacing: 0; }
  .t-legal {
    font-size: 12px;
    line-height: 18px;
    color: var(--ink-2);
    letter-spacing: -.016em;
  }
  .t-legal:lang(th) { font-size: 13px; line-height: 20px; letter-spacing: 0; }
  /* Big numerals: only 30 / 500 (Signature) and the Career panel figures. */
  .t-stat {
    font-size: 48px;
    line-height: 48px;
    font-weight: 600;
    letter-spacing: -.003em;
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 1068px) {
    .t-h2 { font-size: 40px; line-height: 44px; letter-spacing: 0; }
    .t-h2:lang(th) { font-size: 36px; line-height: 47px; }
  }
  @media (max-width: 734px) {
    .t-hero { font-size: 40px; line-height: 44px; }
    .t-hero:lang(th) { font-size: 36px; line-height: 47px; }
    .t-h2 { font-size: 32px; line-height: 36px; letter-spacing: .004em; }
    .t-h2:lang(th) { font-size: 28px; line-height: 38px; letter-spacing: 0; }
    .t-title { font-size: 22px; line-height: 28px; letter-spacing: .01em; }
    .t-title:lang(th) { font-size: 22px; line-height: 32px; letter-spacing: 0; }
    .t-panel { font-size: 28px; line-height: 32px; }
    .t-panel:lang(th) { font-size: 24px; line-height: 34px; }
    .t-faq { font-size: 21px; line-height: 25px; letter-spacing: .011em; }
    .t-faq:lang(th) { font-size: 19px; line-height: 28px; letter-spacing: 0; }
    /* Phone eyebrow = the prototype's 17/21 (TH 23), which Klao reviewed in v6;
       the spec table's 21/25 was a transcription slip (master R21). */
    .t-eyebrow { font-size: 17px; line-height: 21px; }
    .t-eyebrow:lang(th) { line-height: 23px; }
    .t-lead { font-size: 19px; line-height: 27px; }
    .t-lead:lang(th) { line-height: 29px; }
    /* Phone text never drops below 14 px (QA matrix criterion). */
    .t-legal,
    .t-legal:lang(th) { font-size: 14px; line-height: 21px; }
  }
  @media (max-width: 360px) {
    .t-hero { font-size: 36px; line-height: 40px; }
    .t-hero:lang(th) { font-size: 31px; line-height: 40px; }
  }

  /* ---- layout -------------------------------------------------------- */
  .wrap { width: min(980px, 100% - 40px); margin-inline: auto; }
  .wrap-wide { width: min(1040px, 100% - 40px); margin-inline: auto; }
  @media (max-width: 360px) {
    .wrap,
    .wrap-wide { width: calc(100% - 32px); }
  }
  .section { padding-top: 144px; }
  .band {
    background: var(--mist);
    margin-top: 144px;
    padding: 128px 0;
  }
  @media (max-width: 734px) {
    .section { padding-top: 96px; }
    .band { margin-top: 96px; padding: 96px 0; }
  }

  /* ---- controls ------------------------------------------------------ */
  /* Apple CTA: pill, 44 px, 17 px, weight 400 -- never bold. */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 44px;
    padding: 0 22px;
    border: 0;
    border-radius: 999px;
    font-size: 17px;
    font-weight: 400;
    line-height: 1.2;
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    transition: transform 220ms var(--ease-settle), background-color 200ms linear;
  }
  .btn:active { transform: scale(.97); transition-duration: var(--dur-tap); }
  .btn-fill { background: var(--kram); color: var(--on-kram); }
  .btn-out { background: transparent; color: var(--ink-1); box-shadow: inset 0 0 0 1px var(--ink-3); }
  @media (hover: hover) and (pointer: fine) {
    .btn-fill:hover { background: var(--kram-hover); }
    .btn-out:hover { background: var(--out-hover); }
  }
  /* 28 px chip (stack tags, status words). */
  .pill {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 0 12px;
    border-radius: 999px;
    background: var(--mist);
    color: var(--ink-1);
    font-size: 14px;
    line-height: 20px;
    white-space: nowrap;
  }

  /* ---- glass (spec §5.4) --------------------------------------------- */
  /* Consumers position the element themselves (sticky/fixed/relative);
     the sheen layer needs that positioned box. */
  .glass {
    isolation: isolate;
    background: var(--glass-nav);
    -webkit-backdrop-filter: blur(20px) saturate(var(--sat));
    backdrop-filter: blur(20px) saturate(var(--sat));
    box-shadow: inset 0 1px 0 var(--glass-hi), inset 0 -1px 0 var(--glass-edge), 0 0 0 1px var(--glass-rim), var(--e3);
  }
  .glass::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(180deg, var(--sheen), transparent 45%);
    pointer-events: none;
    z-index: -1;
  }
  /* The tour pill (prototype `.glass.pill`, renamed: .pill is the chip). */
  .glass.glass-pill {
    background: var(--glass-pill);
    -webkit-backdrop-filter: blur(16px) saturate(160%);
    backdrop-filter: blur(16px) saturate(160%);
  }
  /* Small glass controls (tour paddles, sheet close). */
  .ctl {
    background: var(--ctl);
    -webkit-backdrop-filter: blur(12px) saturate(160%);
    backdrop-filter: blur(12px) saturate(160%);
    border: 0;
    color: var(--ink-1);
    cursor: pointer;
  }
  /* Glass turns solid wherever blur is missing or unwanted. Safari ignores
     prefers-reduced-transparency, so contrast-more and no-backdrop support
     get the same solid fill. */
  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .glass,
    .glass.glass-pill { background: var(--canvas); }
    .ctl { background: var(--mist); }
  }
  @media (prefers-reduced-transparency: reduce) {
    .glass,
    .glass.glass-pill { background: var(--canvas); -webkit-backdrop-filter: none; backdrop-filter: none; }
    .ctl { background: var(--mist); -webkit-backdrop-filter: none; backdrop-filter: none; }
  }
  @media (prefers-contrast: more) {
    .glass,
    .glass.glass-pill { background: var(--canvas); box-shadow: 0 0 0 2px var(--ink-1); }
  }
  @media (forced-colors: active) {
    .glass,
    .glass.glass-pill { border: 1px solid CanvasText; }
  }

  /* ---- surfaces ------------------------------------------------------ */
  /* Apple tile: r28, mist, no shadow. */
  .tile { border-radius: 28px; background: var(--mist); box-shadow: none; }
  /* Screenshot window: hairline + soft shadow, so white UI shots do not
     vanish on white. Dark mode swaps the shadow for inset rims (--e2) and
     dims the shot a touch (--shot-dim). */
  .win {
    position: relative;
    overflow: hidden;
    border-radius: 14px;
    background: var(--canvas);
    box-shadow: var(--e2);
  }
  .win::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow: inset 0 0 0 .5px rgb(0 0 0 / .14);
    pointer-events: none;
  }
  .win img { filter: var(--shot-dim); }

  /* ---- Thai keep-span (C3) ------------------------------------------- */
  .nw { display: inline-block; white-space: nowrap; }
}

/* ---- reveal (C9) -----------------------------------------------------
   Fade-rise once when the element crosses the 85 % line
   (src/components/motion/Reveal.tsx adds `.in`). Gated twice: `html.js`
   (set by the pre-paint script, so no-JS visitors never lose content) and
   no-preference motion. It starts from .55, never 0 -- content is dimmed
   for a moment, never hidden. `--i` keeps the old sections' stagger. */
@layer components {
  @media (prefers-reduced-motion: no-preference) {
    html.js .rv {
      opacity: .55;
      transform: translateY(16px);
      transition:
        opacity var(--dur-fade) var(--ease-drift),
        transform var(--dur-rise) var(--ease-drift);
      transition-delay: calc(var(--i, 0) * 75ms);
    }
    html.js .rv.big { transform: translateY(24px); }
    html.js .rv.in { opacity: 1; transform: none; }
  }
}

/* Theme switches cross-fade through the View Transitions API when the
   browser has it (ThemeToggle); under reduced motion there is no fade. */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 240ms;
  animation-timing-function: var(--ease-glide);
}
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) { animation: none !important; }
}
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/globals-css.test.ts && npm run check`
Expected: globals-css 71 pass; `npm run check` green, 540 tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css tests/globals-css.test.ts
git commit -m "feat(css): shared White Edition classes (type scale, layout, controls, glass, reveal)

The C9 names P1-P4 build on, with Apple-calibrated EN values, Thai one
step smaller and never tracked, and a reveal that only dims content
under html.js and no-preference motion, never below .55.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 7: Fonts (system Latin + Thai-only Anuphan) and the pre-paint script in `<head>`

**Files:** Create `public/fonts/anuphan-thai.woff2`, `public/fonts/OFL.txt`, `tests/layout.test.tsx` · Modify `src/app/globals.css` (insert the `@font-face` block after line 1), `src/app/[locale]/layout.tsx` (imports; the font block, baseline lines 12–35; the `<html>` line), `tests/globals-css.test.ts` (one test inserted), `vitest.config.ts` (lines 8–12), `tests/work-deck.test.tsx` (comment, lines 9–15) · Delete `tests/setup.ts`
**Interfaces:** Consumes: `THEME_PREPAINT_SCRIPT` (Task 4), the `--font-sans` stack (Task 5) · Produces: font family `"Anuphan Thai"` (weights 400–700, Thai block only) at `/fonts/anuphan-thai.woff2`, preloaded; at runtime `<html class="js">` and `data-theme` from the pre-paint script; no `next/font` import anywhere; no `--font-anuphan` / `--font-sg` variables (nothing may reference them).

- [ ] **Step 1: Write the failing tests**

(a) Create `tests/layout.test.tsx`:

```tsx
import { readFileSync, statSync } from 'node:fs';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import RootLayout from '@/app/[locale]/layout';
import { THEME_PREPAINT_SCRIPT } from '@/lib/theme';

// RootLayout is an async server component; awaiting it returns the element
// tree without rendering SiteNav/SiteFooter (they stay unexpanded elements),
// which is all these tests need: the <html> props and what sits in <head>.
type Props = {
  children?: ReactNode;
  className?: string;
  lang?: string;
  suppressHydrationWarning?: boolean;
  dangerouslySetInnerHTML?: { __html: string };
  rel?: string;
  href?: string;
  as?: string;
  type?: string;
  crossOrigin?: string;
};

function childrenOf(el: ReactElement<Props>): ReactElement<Props>[] {
  const kids: ReactNode[] = [];
  const add = (n: ReactNode) => {
    if (Array.isArray(n)) n.forEach(add);
    else kids.push(n);
  };
  add(el.props.children);
  return kids.filter((k): k is ReactElement<Props> => isValidElement(k));
}

async function renderLayout(locale: 'en' | 'th') {
  return (await RootLayout({
    children: null,
    params: Promise.resolve({ locale }),
  })) as ReactElement<Props>;
}

async function headOf(locale: 'en' | 'th') {
  const head = childrenOf(await renderLayout(locale)).find((c) => c.type === 'head');
  if (!head) throw new Error('RootLayout rendered no <head>');
  return childrenOf(head);
}

describe('RootLayout: theme pre-paint', () => {
  it('puts the pre-paint script first in <head>, verbatim', async () => {
    const [first] = await headOf('en');
    expect(first.type).toBe('script');
    expect(first.props.dangerouslySetInnerHTML?.__html).toBe(THEME_PREPAINT_SCRIPT);
  });

  it('suppresses the <html> hydration warning the pre-paint attributes would cause', async () => {
    const html = await renderLayout('th');
    expect(html.type).toBe('html');
    expect(html.props.lang).toBe('th');
    expect(html.props.suppressHydrationWarning).toBe(true);
  });
});

describe('RootLayout: fonts', () => {
  it('preloads the Thai face with the CORS mode fonts are fetched in', async () => {
    const link = (await headOf('th')).find((c) => c.type === 'link');
    expect(link?.props).toMatchObject({
      rel: 'preload',
      href: '/fonts/anuphan-thai.woff2',
      as: 'font',
      type: 'font/woff2',
      crossOrigin: 'anonymous',
    });
  });

  it('uses no next/font at all (no Space Grotesk, no Google download at build)', () => {
    const src = readFileSync('src/app/[locale]/layout.tsx', 'utf8');
    expect(src).not.toMatch(/from 'next\/font|Space_Grotesk/);
  });

  it('ships the vendored Thai subset as a real woff2 well under the asset budget, with its OFL licence', () => {
    const font = readFileSync('public/fonts/anuphan-thai.woff2');
    expect(font.subarray(0, 4).toString('latin1')).toBe('wOF2');
    expect(statSync('public/fonts/anuphan-thai.woff2').size).toBeLessThan(40 * 1024);
    expect(readFileSync('public/fonts/OFL.txt', 'utf8')).toContain('SIL Open Font License');
  });
});
```

(b) In `tests/globals-css.test.ts`, inside `describe('fonts', …)`, insert directly before `  it('points the legacy display/thai font utilities at the same stack', () => {`:

```ts
  it('declares the Thai face for the Thai block only, so Latin never renders in Anuphan', () => {
    const face = /@font-face \{([^}]*)\}/.exec(CODE)?.[1] ?? '';
    expect(face).toContain('font-family: "Anuphan Thai";');
    expect(face).toContain('font-weight: 400 700;');
    expect(face).toContain('font-display: swap;');
    expect(face).toContain('src: url("/fonts/anuphan-thai.woff2") format("woff2");');
    expect(face).toContain('unicode-range: U+02D7, U+0303, U+0331, U+0E01-0E5B, U+200C-200D, U+25CC;');
    // The subset file also holds a Latin "A", space and nbsp: without this
    // range every capital A on /en would render in Anuphan.
    expect(face).not.toMatch(/U\+0000|U\+0041|U\+0020/);
  });
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/layout.test.tsx tests/globals-css.test.ts`
Expected: FAIL — `RootLayout rendered no <head>`, the preload test, `uses no next/font at all` (layout still imports `next/font/google`), the woff2 test (`ENOENT … public/fonts/anuphan-thai.woff2`), and `declares the Thai face for the Thai block only` (no `@font-face`).

- [ ] **Step 3: Implement**

(a) Vendor the Thai subset and its licence. The URL is the `/* thai */` entry of `https://fonts.googleapis.com/css2?family=Anuphan:wght@400..700` (checked 25 Sep 2026):

```bash
mkdir -p public/fonts
curl -fsSL -o public/fonts/anuphan-thai.woff2 "https://fonts.gstatic.com/s/anuphan/v6/2sDeZGxYgY7LkLT0mX4Dam--C70lZQ.woff2"
curl -fsSL -o public/fonts/OFL.txt "https://raw.githubusercontent.com/google/fonts/main/ofl/anuphan/OFL.txt"
wc -c < public/fonts/anuphan-thai.woff2
shasum -a 256 public/fonts/anuphan-thai.woff2
head -1 public/fonts/OFL.txt
```

Expected: `18952`; `6966233243092b0ca96f875793aa1dd12fdb6193317abf6bbf7b658d3dc431ad`; `Copyright 2019 The Anuphan Project Authors (https://github.com/cadsondemak/Anuphan)`. If the hash differs, Google has published a new version: fetch the css2 URL above with a desktop Chrome user agent, take the `/* thai */` `src` URL and its `unicode-range`, and use those (the unicode-range must then match in globals.css and in the test).

(b) In `src/app/globals.css`, directly after line 1 (`@import "tailwindcss";`) and its blank line, insert:

```css
/* Thai glyphs only (spec §5.2). Latin runs on the system stack -- SF Pro on
   Apple devices -- so no Latin font file ships at all. This is the exact file
   Google Fonts serves for `Anuphan:wght@400..700`, thai subset (19 KB,
   SIL OFL 1.1 -- licence in public/fonts/OFL.txt), vendored because
   next/font cannot produce a Thai-only face here: next/font/google downloads
   every subset and adds a metric-adjusted Arial fallback face with no
   unicode-range (it would catch every Latin letter), and Turbopack's
   next/font/local drops the `declarations` option that would set one. The
   file itself also carries Latin glyphs (space, A, nbsp), so the
   unicode-range below is what keeps Latin text on the system font.
   One variable file covers every weight the page uses, 400 through 700.
   src/app/[locale]/layout.tsx preloads it. */
@font-face {
  font-family: "Anuphan Thai";
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url("/fonts/anuphan-thai.woff2") format("woff2");
  unicode-range: U+02D7, U+0303, U+0331, U+0E01-0E5B, U+200C-200D, U+25CC;
}
```

(c) In `src/app/[locale]/layout.tsx`:

Delete the import

```tsx
import { Anuphan, Space_Grotesk } from 'next/font/google';
```

and add, directly after `import { SITE_URL } from '@/lib/site';`:

```tsx
import { THEME_PREPAINT_SCRIPT } from '@/lib/theme';
```

Replace the whole font block (baseline lines 12–35):

```tsx
// Display pair. Self-hosted by next/font at build time (no runtime request
// to Google), subset per script, swap display. Three weights each (500 for
// display default, 600 for the AboutBand/ProjectCard/career `font-semibold`
// headings, 700 for bold) -- a bare 500/700 pair would otherwise
// CSS-font-match 600 up to 700, rendering "semibold" text bold. Both
// families ship as variable fonts, so the 600 weight is free: next/font
// emits extra @font-face declarations pointing at the SAME 7 woff2 files
// (one set per unicode-range subset) rather than fetching new ones --
// verified empirically (identical file hashes/sizes before and after this
// weight was added). Measured total ~131KB across all 7 files, well inside
// the A6 250KB budget.
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-sg',
  display: 'swap',
});
const anuphan = Anuphan({
  subsets: ['thai', 'latin'],
  weight: ['500', '600', '700'],
  variable: '--font-anuphan',
  display: 'swap',
});
```

with

```tsx
// The Thai face (the only font file this site ships) is declared in
// globals.css. Preloading it here means Thai text swaps to Anuphan early
// instead of after the stylesheet is parsed and Thai text is found.
const THAI_FONT_URL = '/fonts/anuphan-thai.woff2';
```

Replace

```tsx
    <html lang={l} className={`${spaceGrotesk.variable} ${anuphan.variable}`}>
      <body className="flex min-h-screen flex-col">
```

with

```tsx
    // suppressHydrationWarning: THEME_PREPAINT_SCRIPT adds `js` and may set
    // `data-theme` on <html> before React hydrates, so the client DOM
    // legitimately differs from the server HTML on this one element. It only
    // silences attribute warnings for <html> itself, not its children.
    <html lang={l} suppressHydrationWarning>
      <head>
        {/* Runs before first paint: no flash of the wrong theme, and `js` is
            on <html> before any reveal CSS could dim content. See
            src/lib/theme.ts for what it does and why it is ES5. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_PREPAINT_SCRIPT }} />
        <link rel="preload" href={THAI_FONT_URL} as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="flex min-h-screen flex-col">
```

(d) `tests/setup.ts` only mocked `next/font/google`, which nothing imports any more:

```bash
git rm tests/setup.ts
```

In `vitest.config.ts` replace

```ts
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // Mocks next/font/google, which only produces its real implementation
    // inside Next's own compiler pipeline (see tests/setup.ts for the full
    // rationale) -- without this, any test that transitively imports
    // src/app/[locale]/layout.tsx crashes on import.
    setupFiles: ['./tests/setup.ts'],
```

with

```ts
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
```

(e) In `tests/work-deck.test.tsx` replace the stale comment

```tsx
// Same manual-cleanup + stub setup as every other jsdom test in this repo.
// vitest.config.ts DOES declare setupFiles: ['./tests/setup.ts'], but that
// file only mocks next/font/google (which resolves to `{}` outside Next's
// own compiler) — it registers no RTL auto-cleanup and defines no browser
// globals. So every jsdom file still owns its own afterEach(cleanup) plus
// the matchMedia/IntersectionObserver stubs Reveal/TiltCard/MaskedHeading
// reach for.
```

with

```tsx
// Same manual-cleanup + stub setup as every other jsdom test in this repo.
// vitest.config.ts declares no setup file (White Edition P0 deleted
// tests/setup.ts once nothing imported next/font), so there is no RTL
// auto-cleanup and no browser globals: every jsdom file owns its own
// afterEach(cleanup) plus the matchMedia/IntersectionObserver stubs
// Reveal/TiltCard/MaskedHeading reach for.
```

- [ ] **Step 4: Run and pass**

```bash
npx vitest run tests/layout.test.tsx tests/globals-css.test.ts
npm run check
npm run build
grep -rho '@font-face{[^}]*Anuphan Thai[^}]*}' .next/static | head -1
grep -o '<link rel="preload" href="/fonts/anuphan-thai.woff2"[^>]*>' .next/server/app/en.html
grep -c 'fonts.gstatic\|__variable' .next/server/app/en.html
grep -rn "next/font\|--font-sg\|--font-anuphan\|Space_Grotesk" src tests
```

Expected: layout 5 and globals-css 72 pass; `npm run check` green, 546 tests; the build succeeds with no Google font download; the built `@font-face` ends in `unicode-range:U+2D7,U+303,U+331,U+E01-E5B,U+200C-200D,U+25CC}` (this is the check that caught Turbopack dropping `next/font/local` declarations — if the range is missing, stop); the preload `<link … crossorigin="anonymous"/>` is printed; the count is `0`; the last grep prints only the D1 comment in `src/app/globals.css`, the new comment in `tests/work-deck.test.tsx`, and the negative assertions in `tests/globals-css.test.ts` and `tests/layout.test.tsx` — no import, no variable.

- [ ] **Step 5: Screenshot check** (Appendix A, all modes)

Start `npm run dev` in the background, then run: `node /tmp/klao-qa/shoot.mjs p0-t7`
Expected: 12 lines `ok`, `all shots ok` (this now also checks `html.js` and `data-theme`: `dark` mode proves a stored Dark beats a light system, `system-dark` proves Auto follows the system). Open `th-light-390.png` and `en-light-1440.png`: Thai glyphs are Anuphan (even stroke, open counters), Latin in both locales is the system font (SF Pro on a Mac — compare the capital A in "Actmedia" with a Thai shot: same shape in both). No flash is visible in a screenshot, so also load `http://localhost:3000/th` once in Chrome with DevTools → Rendering → "Emulate CSS prefers-color-scheme: dark" after running `localStorage.setItem('klao-theme','light')` in the console: the page must stay white from the first frame. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add public/fonts/anuphan-thai.woff2 public/fonts/OFL.txt src/app/globals.css src/app/[locale]/layout.tsx tests/layout.test.tsx tests/globals-css.test.ts vitest.config.ts tests/work-deck.test.tsx
git commit -m "feat(fonts): system Latin + Thai-only Anuphan, and the pre-paint theme script

Space Grotesk and next/font go. Anuphan ships as one 19 KB Thai subset
(OFL, licence beside it) behind a Thai-only unicode-range, so Latin text
stays on SF Pro / the system font. next/font could not do this: google
emits a latin face plus an Arial fallback with no range, and Turbopack
drops next/font/local's unicode-range declaration. The pre-paint script
now runs in <head>: html.js and data-theme are set before first paint.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 8: `Icon` — the prototype's Phosphor subset (C4)

**Files:** Create `src/components/icons.tsx`, `tests/icons.test.tsx`
**Interfaces:** Consumes: nothing · Produces:

```ts
export type IconName = 'arrow-right' | 'arrow-up-right' | 'caret-left' | 'caret-right' | 'copy' | 'x' | 'magnifying-glass'
  | 'pause' | 'play' | 'target-duotone' | 'rocket-launch-duotone' | 'translate-duotone' | 'wrench-duotone'
  | 'chart-line-up-duotone' | 'key-duotone' | 'file-pdf-duotone' | 'envelope-duotone' | 'map-pin-duotone'
  | 'linkedin-logo' | 'github-logo' | 'sun' | 'moon' | 'circle-half' | 'command' | 'check-duotone'
  | 'code-duotone' | 'chat-circle-dots-duotone';        // derived: keyof typeof ICON_PATHS
export const ICON_NAMES: IconName[];
export function isIconName(value: string): value is IconName;
export function Icon(props: { name: IconName | (string & {}); className?: string }): JSX.Element | null;
export default Icon;                                    // the named export is the contract (R8); default is a convenience
```

`import { Icon, type IconName } from '@/components/icons'` is the shape P1–P4 use. `name` accepts every `IconName` (autocompleted) and also any string, so a Story `Icon` value read from Notion type-checks without a cast.

The svg is `viewBox="0 0 256 256"`, `width/height="1em"`, `fill="currentColor"`, `aria-hidden="true"`, `focusable="false"`. An unknown name (e.g. a Notion typo in the Story `Icon` select) renders nothing.

- [ ] **Step 1: Write the failing test** — create `tests/icons.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import Icon, { ICON_NAMES, isIconName } from '@/components/icons';

afterEach(cleanup);

// The prototype's `IC` object, key for key -- the icons the new page uses.
const PROTOTYPE_KEYS = [
  'arrow-right', 'arrow-up-right', 'caret-left', 'caret-right', 'copy', 'x', 'magnifying-glass',
  'pause', 'play', 'target-duotone', 'rocket-launch-duotone', 'translate-duotone', 'wrench-duotone',
  'chart-line-up-duotone', 'key-duotone', 'file-pdf-duotone', 'envelope-duotone', 'map-pin-duotone',
  'linkedin-logo', 'github-logo', 'sun', 'moon', 'circle-half', 'command', 'check-duotone',
  'code-duotone', 'chat-circle-dots-duotone',
];

describe('Icon', () => {
  it('carries exactly the prototype icon set', () => {
    expect([...ICON_NAMES].sort()).toEqual([...PROTOTYPE_KEYS].sort());
  });

  it('renders a decorative 256-unit svg that follows the text colour and size', () => {
    const { container } = render(<Icon name="sun" />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 256 256');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
    expect(svg.getAttribute('fill')).toBe('currentColor');
    expect(svg.getAttribute('width')).toBe('1em');
    expect(svg.querySelectorAll('path')).toHaveLength(1);
  });

  it('draws the duotone back layer at 0.2 opacity under the solid path', () => {
    const { container } = render(<Icon name="target-duotone" />);
    const paths = container.querySelectorAll('path');
    expect(paths).toHaveLength(2);
    expect(paths[0].getAttribute('opacity')).toBe('0.2');
    expect(paths[1].hasAttribute('opacity')).toBe(false);
  });

  it('passes className through for sizing', () => {
    const { container } = render(<Icon name="copy" className="size-5" />);
    expect(container.querySelector('svg')?.getAttribute('class')).toBe('size-5');
  });

  it('renders nothing, without throwing, for a name it does not know (e.g. a Notion typo)', () => {
    expect(() => render(<Icon name="rocket" />)).not.toThrow();
    expect(renderToStaticMarkup(<Icon name="rocket" />)).toBe('');
    expect(renderToStaticMarkup(<Icon name="" />)).toBe('');
  });

  it('narrows strings with isIconName', () => {
    expect(isIconName('moon')).toBe(true);
    expect(isIconName('Moon')).toBe(false);
    expect(isIconName('toString')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/icons.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/icons"`.

- [ ] **Step 3: Implement** — create `src/components/icons.tsx` (path data copied verbatim from the prototype's `IC` object; every icon there is `<path d>` plus an optional `opacity="0.2"` back layer):

```tsx
/* Icons for the White Edition: the Phosphor subset the approved prototype
   inlines (design/white-edition/prototype/index.html, the `IC` object) --
   Phosphor Icons, MIT licence, phosphoricons.com. Inlined rather than
   installed: no icon package is a runtime dependency (master plan Global
   Constraints), and 27 paths are smaller than any package's tree-shaken
   output. 256x256 viewBox, filled with currentColor; the duotone icons carry
   a second, 0.2-opacity back layer. */

type Path = readonly [d: string, opacity?: number];

const ICON_PATHS = {
  'arrow-right': [['M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z']],
  'arrow-up-right': [['M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16H192A8,8,0,0,1,200,64Z']],
  'caret-left': [['M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z']],
  'caret-right': [['M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z']],
  'copy': [['M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z']],
  'x': [['M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z']],
  'magnifying-glass': [['M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z']],
  'pause': [['M200,32H160a16,16,0,0,0-16,16V208a16,16,0,0,0,16,16h40a16,16,0,0,0,16-16V48A16,16,0,0,0,200,32Zm0,176H160V48h40ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Zm0,176H56V48H96Z']],
  'play': [['M232.4,114.49,88.32,26.35a16,16,0,0,0-16.2-.3A15.86,15.86,0,0,0,64,39.87V216.13A15.94,15.94,0,0,0,80,232a16.07,16.07,0,0,0,8.36-2.35L232.4,141.51a15.81,15.81,0,0,0,0-27ZM80,215.94V40l143.83,88Z']],
  'target-duotone': [['M176,128a48,48,0,1,1-48-48A48,48,0,0,1,176,128Z', 0.2], ['M221.87,83.16A104.1,104.1,0,1,1,195.67,49l22.67-22.68a8,8,0,0,1,11.32,11.32l-96,96a8,8,0,0,1-11.32-11.32l27.72-27.72a40,40,0,1,0,17.87,31.09,8,8,0,1,1,16-.9,56,56,0,1,1-22.38-41.65L184.3,60.39a87.88,87.88,0,1,0,23.13,29.67,8,8,0,0,1,14.44-6.9Z']],
  'rocket-launch-duotone': [['M184,120v61.65a8,8,0,0,1-2.34,5.65l-34.35,34.35a8,8,0,0,1-13.57-4.53L128,176ZM136,72H74.35a8,8,0,0,0-5.65,2.34L34.35,108.69a8,8,0,0,0,4.53,13.57L80,128ZM40,216c37.65,0,50.69-19.69,54.56-28.18L68.18,161.44C59.69,165.31,40,178.35,40,216Z', 0.2], ['M223.85,47.12a16,16,0,0,0-15-15c-12.58-.75-44.73.4-71.41,27.07L132.69,64H74.36A15.91,15.91,0,0,0,63,68.68L28.7,103a16,16,0,0,0,9.07,27.16l38.47,5.37,44.21,44.21,5.37,38.49a15.94,15.94,0,0,0,10.78,12.92,16.11,16.11,0,0,0,5.1.83A15.91,15.91,0,0,0,153,227.3L187.32,193A15.91,15.91,0,0,0,192,181.64V123.31l4.77-4.77C223.45,91.86,224.6,59.71,223.85,47.12ZM74.36,80h42.33L77.16,119.52,40,114.34Zm74.41-9.45a76.65,76.65,0,0,1,59.11-22.47,76.46,76.46,0,0,1-22.42,59.16L128,164.68,91.32,128ZM176,181.64,141.67,216l-5.19-37.17L176,139.31Zm-74.16,9.5C97.34,201,82.29,224,40,224a8,8,0,0,1-8-8c0-42.29,23-57.34,32.86-61.85a8,8,0,0,1,6.64,14.56c-6.43,2.93-20.62,12.36-23.12,38.91,26.55-2.5,36-16.69,38.91-23.12a8,8,0,1,1,14.56,6.64Z']],
  'translate-duotone': [['M224,184H144l40-80ZM96,127.56h0A95.78,95.78,0,0,0,128,56H64A95.78,95.78,0,0,0,96,127.56Z', 0.2], ['M247.15,212.42l-56-112a8,8,0,0,0-14.31,0l-21.71,43.43A88,88,0,0,1,108,126.93,103.65,103.65,0,0,0,135.69,64H160a8,8,0,0,0,0-16H104V32a8,8,0,0,0-16,0V48H32a8,8,0,0,0,0,16h87.63A87.7,87.7,0,0,1,96,116.35a87.74,87.74,0,0,1-19-31,8,8,0,1,0-15.08,5.34A103.63,103.63,0,0,0,84,127a87.55,87.55,0,0,1-52,17,8,8,0,0,0,0,16,103.46,103.46,0,0,0,64-22.08,104.18,104.18,0,0,0,51.44,21.31l-26.6,53.19a8,8,0,0,0,14.31,7.16L148.94,192h70.11l13.79,27.58A8,8,0,0,0,240,224a8,8,0,0,0,7.15-11.58ZM156.94,176,184,121.89,211.05,176Z']],
  'wrench-duotone': [['M224,96a64,64,0,0,1-94.94,56L73,217A24,24,0,0,1,39,183L104,126.94a64,64,0,0,1,80-90.29L144,80l5.66,26.34L176,112l43.35-40A63.8,63.8,0,0,1,224,96Z', 0.2], ['M226.76,69a8,8,0,0,0-12.84-2.88l-40.3,37.19-17.23-3.7-3.7-17.23,37.19-40.3A8,8,0,0,0,187,29.24,72,72,0,0,0,88,96,72.34,72.34,0,0,0,94,124.94L33.79,177c-.15.12-.29.26-.43.39a32,32,0,0,0,45.26,45.26c.13-.13.27-.28.39-.42L131.06,162A72,72,0,0,0,232,96,71.56,71.56,0,0,0,226.76,69ZM160,152a56.14,56.14,0,0,1-27.07-7,8,8,0,0,0-9.92,1.77L67.11,211.51a16,16,0,0,1-22.62-22.62L109.18,133a8,8,0,0,0,1.77-9.93,56,56,0,0,1,58.36-82.31l-31.2,33.81a8,8,0,0,0-1.94,7.1L141.83,108a8,8,0,0,0,6.14,6.14l26.35,5.66a8,8,0,0,0,7.1-1.94l33.81-31.2A56.06,56.06,0,0,1,160,152Z']],
  'chart-line-up-duotone': [['M224,64V208H32V48H208A16,16,0,0,1,224,64Z', 0.2], ['M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0V156.69l50.34-50.35a8,8,0,0,1,11.32,0L128,132.69,180.69,80H160a8,8,0,0,1,0-16h40a8,8,0,0,1,8,8v40a8,8,0,0,1-16,0V91.31l-58.34,58.35a8,8,0,0,1-11.32,0L96,123.31l-56,56V200H224A8,8,0,0,1,232,208Z']],
  'key-duotone': [['M232,98.36C230.73,136.92,198.67,168,160.09,168a71.68,71.68,0,0,1-26.92-5.17h0L120,176H96v24H72v24H40a8,8,0,0,1-8-8V187.31a8,8,0,0,1,2.34-5.65l58.83-58.83h0A71.68,71.68,0,0,1,88,95.91c0-38.58,31.08-70.64,69.64-71.87A72,72,0,0,1,232,98.36Z', 0.2], ['M216.57,39.43A80,80,0,0,0,83.91,120.78L28.69,176A15.86,15.86,0,0,0,24,187.31V216a16,16,0,0,0,16,16H72a8,8,0,0,0,8-8V208H96a8,8,0,0,0,8-8V184h16a8,8,0,0,0,5.66-2.34l9.56-9.57A79.73,79.73,0,0,0,160,176h.1A80,80,0,0,0,216.57,39.43ZM224,98.1c-1.09,34.09-29.75,61.86-63.89,61.9H160a63.7,63.7,0,0,1-23.65-4.51,8,8,0,0,0-8.84,1.68L116.69,168H96a8,8,0,0,0-8,8v16H72a8,8,0,0,0-8,8v16H40V187.31l58.83-58.82a8,8,0,0,0,1.68-8.84A63.72,63.72,0,0,1,96,95.92c0-34.14,27.81-62.8,61.9-63.89A64,64,0,0,1,224,98.1ZM192,76a12,12,0,1,1-12-12A12,12,0,0,1,192,76Z']],
  'file-pdf-duotone': [['M208,88H152V32Z', 0.2], ['M224,152a8,8,0,0,1-8,8H192v16h16a8,8,0,0,1,0,16H192v16a8,8,0,0,1-16,0V152a8,8,0,0,1,8-8h32A8,8,0,0,1,224,152ZM92,172a28,28,0,0,1-28,28H56v8a8,8,0,0,1-16,0V152a8,8,0,0,1,8-8H64A28,28,0,0,1,92,172Zm-16,0a12,12,0,0,0-12-12H56v24h8A12,12,0,0,0,76,172Zm88,8a36,36,0,0,1-36,36H112a8,8,0,0,1-8-8V152a8,8,0,0,1,8-8h16A36,36,0,0,1,164,180Zm-16,0a20,20,0,0,0-20-20h-8v40h8A20,20,0,0,0,148,180ZM40,112V40A16,16,0,0,1,56,24h96a8,8,0,0,1,5.66,2.34l56,56A8,8,0,0,1,216,88v24a8,8,0,0,1-16,0V96H152a8,8,0,0,1-8-8V40H56v72a8,8,0,0,1-16,0ZM160,80h28.69L160,51.31Z']],
  'envelope-duotone': [['M224,56l-96,88L32,56Z', 0.2], ['M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48Zm-96,85.15L52.57,64H203.43ZM98.71,128,40,181.81V74.19Zm11.84,10.85,12,11.05a8,8,0,0,0,10.82,0l12-11.05,58,53.15H52.57ZM157.29,128,216,74.18V181.82Z']],
  'map-pin-duotone': [['M128,24a80,80,0,0,0-80,80c0,72,80,128,80,128s80-56,80-128A80,80,0,0,0,128,24Zm0,112a32,32,0,1,1,32-32A32,32,0,0,1,128,136Z', 0.2], ['M128,64a40,40,0,1,0,40,40A40,40,0,0,0,128,64Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,128Zm0-112a88.1,88.1,0,0,0-88,88c0,31.4,14.51,64.68,42,96.25a254.19,254.19,0,0,0,41.45,38.3,8,8,0,0,0,9.18,0A254.19,254.19,0,0,0,174,200.25c27.45-31.57,42-64.85,42-96.25A88.1,88.1,0,0,0,128,16Zm0,206c-16.53-13-72-60.75-72-118a72,72,0,0,1,144,0C200,161.23,144.53,209,128,222Z']],
  'linkedin-logo': [['M216,24H40A16,16,0,0,0,24,40V216a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V40A16,16,0,0,0,216,24Zm0,192H40V40H216V216ZM96,112v64a8,8,0,0,1-16,0V112a8,8,0,0,1,16,0Zm88,28v36a8,8,0,0,1-16,0V140a20,20,0,0,0-40,0v36a8,8,0,0,1-16,0V112a8,8,0,0,1,15.79-1.78A36,36,0,0,1,184,140ZM100,84A12,12,0,1,1,88,72,12,12,0,0,1,100,84Z']],
  'github-logo': [['M208.31,75.68A59.78,59.78,0,0,0,202.93,28,8,8,0,0,0,196,24a59.75,59.75,0,0,0-48,24H124A59.75,59.75,0,0,0,76,24a8,8,0,0,0-6.93,4,59.78,59.78,0,0,0-5.38,47.68A58.14,58.14,0,0,0,56,104v8a56.06,56.06,0,0,0,48.44,55.47A39.8,39.8,0,0,0,96,192v8H72a24,24,0,0,1-24-24A40,40,0,0,0,8,136a8,8,0,0,0,0,16,24,24,0,0,1,24,24,40,40,0,0,0,40,40H96v16a8,8,0,0,0,16,0V192a24,24,0,0,1,48,0v40a8,8,0,0,0,16,0V192a39.8,39.8,0,0,0-8.44-24.53A56.06,56.06,0,0,0,216,112v-8A58.14,58.14,0,0,0,208.31,75.68ZM200,112a40,40,0,0,1-40,40H112a40,40,0,0,1-40-40v-8a41.74,41.74,0,0,1,6.9-22.48A8,8,0,0,0,80,73.83a43.81,43.81,0,0,1,.79-33.58,43.88,43.88,0,0,1,32.32,20.06A8,8,0,0,0,119.82,64h32.35a8,8,0,0,0,6.74-3.69,43.87,43.87,0,0,1,32.32-20.06A43.81,43.81,0,0,1,192,73.83a8.09,8.09,0,0,0,1,7.65A41.72,41.72,0,0,1,200,104Z']],
  'sun': [['M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z']],
  'moon': [['M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z']],
  'circle-half': [['M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm8,16.37a86.4,86.4,0,0,1,16,3V212.67a86.4,86.4,0,0,1-16,3Zm32,9.26a87.81,87.81,0,0,1,16,10.54V195.83a87.81,87.81,0,0,1-16,10.54ZM40,128a88.11,88.11,0,0,1,80-87.63V215.63A88.11,88.11,0,0,1,40,128Zm160,50.54V77.46a87.82,87.82,0,0,1,0,101.08Z']],
  'command': [['M180,144H160V112h20a36,36,0,1,0-36-36V96H112V76a36,36,0,1,0-36,36H96v32H76a36,36,0,1,0,36,36V160h32v20a36,36,0,1,0,36-36ZM160,76a20,20,0,1,1,20,20H160ZM56,76a20,20,0,0,1,40,0V96H76A20,20,0,0,1,56,76ZM96,180a20,20,0,1,1-20-20H96Zm16-68h32v32H112Zm68,88a20,20,0,0,1-20-20V160h20a20,20,0,0,1,0,40Z']],
  'check-duotone': [['M232,56V200a16,16,0,0,1-16,16H40a16,16,0,0,1-16-16V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56Z', 0.2], ['M205.66,85.66l-96,96a8,8,0,0,1-11.32,0l-40-40a8,8,0,0,1,11.32-11.32L104,164.69l90.34-90.35a8,8,0,0,1,11.32,11.32Z']],
  'code-duotone': [['M240,128l-48,40H64L16,128,64,88H192Z', 0.2], ['M69.12,94.15,28.5,128l40.62,33.85a8,8,0,1,1-10.24,12.29l-48-40a8,8,0,0,1,0-12.29l48-40a8,8,0,0,1,10.24,12.3Zm176,27.7-48-40a8,8,0,1,0-10.24,12.3L227.5,128l-40.62,33.85a8,8,0,1,0,10.24,12.29l48-40a8,8,0,0,0,0-12.29ZM162.73,32.48a8,8,0,0,0-10.25,4.79l-64,176a8,8,0,0,0,4.79,10.26A8.14,8.14,0,0,0,96,224a8,8,0,0,0,7.52-5.27l64-176A8,8,0,0,0,162.73,32.48Z']],
  'chat-circle-dots-duotone': [['M224,128A96,96,0,0,1,79.93,211.11h0L42.54,223.58a8,8,0,0,1-10.12-10.12l12.47-37.39h0A96,96,0,1,1,224,128Z', 0.2], ['M128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-4-1.08,7.85,7.85,0,0,0-2.53.42L40,216,52.47,178.6a8,8,0,0,0-.66-6.54A88,88,0,1,1,128,216Zm12-88a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm-44,0a12,12,0,1,1-12-12A12,12,0,0,1,96,128Zm88,0a12,12,0,1,1-12-12A12,12,0,0,1,184,128Z']],
} satisfies Record<string, readonly Path[]>;

export type IconName = keyof typeof ICON_PATHS;

const PATHS: Record<IconName, readonly Path[]> = ICON_PATHS;

export const ICON_NAMES = Object.keys(ICON_PATHS) as IconName[];

export function isIconName(value: string): value is IconName {
  return Object.prototype.hasOwnProperty.call(ICON_PATHS, value);
}

type IconProps = {
  /** An IconName, or any string from Notion (Story `Icon` select); an
   *  unknown name renders nothing instead of throwing. */
  name: IconName | (string & {});
  className?: string;
};

/** Decorative by design: every icon on the page sits next to its own text
 *  label, so the svg is hidden from assistive tech. Sized 1em so it follows
 *  the surrounding font size unless a class says otherwise. */
export function Icon({ name, className }: IconProps) {
  if (!isIconName(name)) return null;
  return (
    <svg
      viewBox="0 0 256 256"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {PATHS[name].map(([d, opacity], i) => (
        <path key={i} d={d} opacity={opacity} />
      ))}
    </svg>
  );
}

export default Icon;
```

Then prove the transcription against the prototype:

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('design/white-edition/prototype/index.html','utf8');
const IC=JSON.parse(html.split('\n').find(l=>l.startsWith('const IC = ')).slice(11).replace(/;\s*\$/,''));
const src=fs.readFileSync('src/components/icons.tsx','utf8');
let bad=0;for(const [k,v] of Object.entries(IC))for(const m of v.matchAll(/d=\"([^\"]+)\"/g))if(!src.includes(m[1])){bad++;console.log('missing',k)}
console.log('icons',Object.keys(IC).length,'missing paths',bad)"
```

Expected: `icons 27 missing paths 0`.

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/icons.test.tsx && npm run check`
Expected: 6 pass; `npm run check` green, 552 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/icons.tsx tests/icons.test.tsx
git commit -m "feat(icons): Icon from the prototype's inlined Phosphor subset

27 icons, no package: filled 256-unit paths with the duotone back layer,
decorative (aria-hidden), 1em so they follow the text. Unknown names
render nothing, so a Notion typo cannot break a section.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 9: `ThemeToggle` (Auto / Light / Dark), mounted in the current footer

**Files:** Create `src/components/ThemeToggle.tsx`, `tests/theme-toggle.test.tsx` · Modify `src/lib/dictionary.ts` (after `tourStill` in `en` and in `th`), `src/app/globals.css` (`.seg` block inserted before the Thai keep-span block), `src/components/SiteFooter.tsx` (import; after the copyright `<p>`), `tests/site-footer.test.tsx` (one test), `tests/globals-css.test.ts` (one section appended)
**Interfaces:** Consumes: `readThemePref`, `writeThemePref`, `THEME_EVENT`, `ThemePref` (Task 4); `Icon`, `IconName` (Task 8); `dict` · Produces:

```ts
// src/components/ThemeToggle.tsx ('use client') -- DEFAULT export (R8); `<ThemeToggle locale={locale} />` is the call P1 and P4 make
export default function ThemeToggle(props: { locale: Locale; icons?: boolean /* default true */; className?: string }): JSX.Element;
// renders <div role="group" aria-label={dict[locale].appearance} class="seg …"> with three
// <button aria-pressed> in the order Auto, Light, Dark
```

- `dict.en/th`: `appearance`, `themeAuto`, `themeLight`, `themeDark` (prototype copy: Appearance / Auto / Light / Dark · การแสดงผล / ตามเครื่อง / สว่าง / มืด — the prototype's Thai for Auto is ตามเครื่อง, "follow the device"). P1's phone menu and P4's footer reuse these keys.
- The footer mount is marked `{/* P0-TEMP-THEME-TOGGLE */}` (master-plan R8) so P4 can find and remove it.
- `.seg` segmented control in globals.css (28 px buttons, 44 px hit area, pressed = canvas + `--e1`).
- Choosing an option cross-fades through `document.startViewTransition` when available and motion is allowed; every mounted toggle follows `THEME_EVENT`.

- [ ] **Step 1: Write the failing tests**

(a) Create `tests/theme-toggle.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ThemeToggle from '@/components/ThemeToggle';
import { dict } from '@/lib/dictionary';
import { THEME_STORAGE_KEY, writeThemePref } from '@/lib/theme';

const root = document.documentElement;
const realStorage = Object.getOwnPropertyDescriptor(window, 'localStorage')!;

beforeEach(() => {
  window.localStorage.clear();
  root.removeAttribute('data-theme');
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});

afterEach(() => {
  cleanup();
  Object.defineProperty(window, 'localStorage', realStorage);
  vi.unstubAllGlobals();
  delete (document as { startViewTransition?: unknown }).startViewTransition;
});

const pressed = () =>
  screen.getAllByRole('button').filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.textContent);

describe('ThemeToggle', () => {
  it('is a labelled group of three buttons in the page language', () => {
    render(<ThemeToggle locale="th" />);
    expect(screen.getByRole('group', { name: dict.th.appearance })).toBeTruthy();
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      dict.th.themeAuto,
      dict.th.themeLight,
      dict.th.themeDark,
    ]);
  });

  it('marks Auto when nothing is stored', () => {
    render(<ThemeToggle locale="en" />);
    expect(pressed()).toEqual(['Auto']);
  });

  it('marks the stored choice after mount', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    render(<ThemeToggle locale="en" />);
    expect(pressed()).toEqual(['Dark']);
  });

  it('applies and remembers a choice', () => {
    render(<ThemeToggle locale="en" />);
    fireEvent.click(screen.getByRole('button', { name: 'Light' }));
    expect(root.getAttribute('data-theme')).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(pressed()).toEqual(['Light']);
    fireEvent.click(screen.getByRole('button', { name: 'Auto' }));
    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(pressed()).toEqual(['Auto']);
  });

  it('keeps every toggle on the page in step (footer, phone menu, ⌘K)', () => {
    render(
      <>
        <ThemeToggle locale="en" />
        <ThemeToggle locale="en" icons={false} />
      </>,
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Dark' })[0]);
    expect(pressed()).toEqual(['Dark', 'Dark']);
    act(() => writeThemePref('light'));
    expect(pressed()).toEqual(['Light', 'Light']);
  });

  it('shows an icon per option unless told not to', () => {
    const { container, unmount } = render(<ThemeToggle locale="en" />);
    expect(container.querySelectorAll('button svg')).toHaveLength(3);
    unmount();
    const bare = render(<ThemeToggle locale="en" icons={false} />);
    expect(bare.container.querySelectorAll('svg')).toHaveLength(0);
  });

  it('still switches the page for the session when storage is blocked (Review Focus #2)', () => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });
    render(<ThemeToggle locale="en" />);
    expect(pressed()).toEqual(['Auto']);
    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Dark' }))).not.toThrow();
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(pressed()).toEqual(['Dark']);
  });

  it('cross-fades through a view transition when the browser has one and motion is allowed', () => {
    const startViewTransition = vi.fn((update: () => void) => update());
    (document as { startViewTransition?: unknown }).startViewTransition = startViewTransition;
    render(<ThemeToggle locale="en" />);
    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
    expect(startViewTransition).toHaveBeenCalledOnce();
    expect(root.getAttribute('data-theme')).toBe('dark');
  });

  it('switches without a view transition under reduced motion', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), addEventListener() {}, removeEventListener() {} }));
    const startViewTransition = vi.fn((update: () => void) => update());
    (document as { startViewTransition?: unknown }).startViewTransition = startViewTransition;
    render(<ThemeToggle locale="en" />);
    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
    expect(startViewTransition).not.toHaveBeenCalled();
    expect(root.getAttribute('data-theme')).toBe('dark');
  });
});
```

(b) In `tests/site-footer.test.tsx`, directly before `  it('omits the freshness line entirely when no dated content exists', async () => {`, insert:

```tsx
  it('carries the Appearance toggle after the copyright line, in the page locale', async () => {
    const { default: SiteFooter } = await import('@/components/SiteFooter');
    const { default: ThemeToggle } = await import('@/components/ThemeToggle');
    const jsx = (await SiteFooter({ locale: 'th' })) as El;
    const children = jsx.props?.children as El[];
    // [freshness, footerNote, copyright, toggle] -- the copyright keeps index 2.
    expect(children[3].type).toBe(ThemeToggle);
    expect((children[3].props as { locale?: string }).locale).toBe('th');
  });

```

(c) Append to the end of `tests/globals-css.test.ts`:

```ts
describe('segmented control (.seg)', () => {
  it('styles the pressed segment and keeps a 44 px hit area on 28 px buttons', () => {
    expect(rulesFor('.seg').length).toBeGreaterThan(0);
    expect(rulesFor('.seg button')[0]).toContain('min-height: 28px;');
    expect(rulesFor('.seg button::after')[0]).toContain('inset: -8px -1px;');
    expect(rulesFor('.seg button[aria-pressed="true"]')[0]).toContain('background: var(--canvas);');
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/theme-toggle.test.tsx tests/site-footer.test.tsx tests/globals-css.test.ts`
Expected: FAIL — `Failed to resolve import "@/components/ThemeToggle"` (two files) and `styles the pressed segment…` (`.seg` has no rule).

- [ ] **Step 3: Implement**

(a) In `src/lib/dictionary.ts`, in `en`, replace

```ts
  tourStill: 'Still view',
};
```

with

```ts
  tourStill: 'Still view',
  // White Edition theme control (ThemeToggle): footer, phone menu, ⌘K.
  // Prototype copy. P1 and P4 reuse these keys rather than adding their own.
  appearance: 'Appearance',
  themeAuto: 'Auto',
  themeLight: 'Light',
  themeDark: 'Dark',
};
```

and in `th`, replace

```ts
  tourStill: 'มุมมองภาพนิ่ง',
};
```

with

```ts
  tourStill: 'มุมมองภาพนิ่ง',
  appearance: 'การแสดงผล',
  themeAuto: 'ตามเครื่อง',
  themeLight: 'สว่าง',
  themeDark: 'มืด',
};
```

(`tests/dictionary.test.ts` already enforces same keys, no empty strings and en ≠ th.)

(b) Create `src/components/ThemeToggle.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Icon, { type IconName } from '@/components/icons';
import { dict } from '@/lib/dictionary';
import type { Locale } from '@/lib/models';
import { THEME_EVENT, readThemePref, writeThemePref, type ThemePref } from '@/lib/theme';

const PREFS: readonly ThemePref[] = ['auto', 'light', 'dark'];
const ICONS: Record<ThemePref, IconName> = { auto: 'circle-half', light: 'sun', dark: 'moon' };

type Props = {
  locale: Locale;
  /** The footer shows an icon before each word; the phone menu (P1) does not. */
  icons?: boolean;
  className?: string;
};

/** Appearance: Auto / Light / Dark (spec §6 "Theme"). Lives in the footer,
 *  the phone menu and ⌘K -- never in the nav. The server cannot know the
 *  stored choice, so the first render marks Auto and the effect then syncs
 *  to what the pre-paint script already applied; the page itself never
 *  flashes, only this control's pressed state settles after hydration. */
export default function ThemeToggle({ locale, icons = true, className = '' }: Props) {
  const t = dict[locale];
  const labels: Record<ThemePref, string> = { auto: t.themeAuto, light: t.themeLight, dark: t.themeDark };
  const [pref, setPref] = useState<ThemePref>('auto');

  useEffect(() => {
    setPref(readThemePref());
    // Every toggle on the page (and ⌘K) follows whichever one was used.
    const follow = (e: Event) => setPref((e as CustomEvent<{ pref: ThemePref }>).detail.pref);
    window.addEventListener(THEME_EVENT, follow);
    return () => window.removeEventListener(THEME_EVENT, follow);
  }, []);

  const choose = (next: ThemePref) => {
    const apply = () => writeThemePref(next);
    // A 240 ms cross-fade where the browser has View Transitions (styles in
    // globals.css); a plain switch otherwise, and always under reduced motion.
    const doc = document as Document & { startViewTransition?: (update: () => void) => unknown };
    const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!calm && typeof doc.startViewTransition === 'function') doc.startViewTransition(apply);
    else apply();
  };

  return (
    <div role="group" aria-label={t.appearance} className={['seg', className].filter(Boolean).join(' ')}>
      {PREFS.map((p) => (
        <button key={p} type="button" aria-pressed={pref === p} onClick={() => choose(p)}>
          {icons && <Icon name={ICONS[p]} />}
          {labels[p]}
        </button>
      ))}
    </div>
  );
}
```

(c) In `src/app/globals.css`, inside the C9 `@layer components` block, insert directly before the line `  /* ---- Thai keep-span (C3) ------------------------------------------- */`:

```css
  /* ---- segmented control (ThemeToggle; P1 phone menu, P4 footer) ---- */
  .seg {
    display: inline-flex;
    gap: 2px;
    padding: 2px;
    border-radius: 16px;
    background: var(--ctl);
  }
  .seg button {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 28px;
    min-width: 40px;
    padding: 0 10px;
    border: 0;
    border-radius: 14px;
    background: transparent;
    color: var(--ink-1);
    font-size: 14px;
    cursor: pointer;
  }
  /* 28 px buttons, 44 px touch target: the hit area grows, the pill does not. */
  .seg button::after { content: ""; position: absolute; inset: -8px -1px; }
  .seg button[aria-pressed="true"] {
    background: var(--canvas);
    box-shadow: var(--e1);
    font-weight: 600;
  }
```

(d) In `src/components/SiteFooter.tsx` add the import as the first line:

```tsx
import ThemeToggle from '@/components/ThemeToggle';
```

and replace

```tsx
        © {new Date().getFullYear()} {profile.name}
      </p>
    </footer>
```

with

```tsx
        © {new Date().getFullYear()} {profile.name}
      </p>
      {/* P0-TEMP-THEME-TOGGLE */}
      {/* The theme control's temporary home: P4's new footer removes this
          mount (grep the marker above) and places ThemeToggle itself. */}
      <ThemeToggle locale={locale} className="mt-4" />
    </footer>
```

(JSX comments are not children, so the copyright line keeps index 2 and the toggle is index 3, as the new site-footer test expects.)

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/theme-toggle.test.tsx tests/site-footer.test.tsx tests/globals-css.test.ts tests/dictionary.test.ts && npm run check`
Expected: theme-toggle 9, site-footer 9, globals-css 73 pass; `npm run check` green, 563 tests. `grep -n "P0-TEMP-THEME-TOGGLE" src/components/SiteFooter.tsx` prints one line.

- [ ] **Step 5: Screenshot check**

Start `npm run dev` in the background, then run: `node /tmp/klao-qa/shoot.mjs p0-t9`
Expected: `all shots ok`. In `en-light-1440.png` and `th-dark-390.png` the footer shows the segmented control (Auto · Light · Dark with sun / half-circle / moon icons; Thai labels on /th) with the stored choice pressed. By hand in Chrome at `http://localhost:3000/en`: click Dark → the page cross-fades to dark; reload → still dark; click Auto → follows the system. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/components/ThemeToggle.tsx tests/theme-toggle.test.tsx src/lib/dictionary.ts src/app/globals.css src/components/SiteFooter.tsx tests/site-footer.test.tsx tests/globals-css.test.ts
git commit -m "feat(theme): Auto/Light/Dark toggle in the footer

Segmented control on the shared .seg style, prototype labels in both
languages. The choice applies at once, cross-fades where View Transitions
exist, is remembered when storage allows, and keeps every toggle on the
page in step. P4 moves it into the new footer.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 10: `Reveal` on the `.rv` / `.in` contract (C9)

**Files:** Modify `src/components/motion/Reveal.tsx` (full rewrite), `tests/reveal.test.tsx` (full rewrite)
**Interfaces:** Consumes: the `.rv` CSS (Task 6), `html.js` (Task 7) · Produces:

```ts
// DEFAULT export, the same shape as today (R8): `import Reveal from '@/components/motion/Reveal'`.
// Props are unchanged except the new optional `big`.
export default function Reveal(props: {
  children: ReactNode;
  as?: ElementType;      // default 'div'
  delayIndex?: number;   // sets --i (75 ms stagger), default 0 -- kept for the dark-era sections
  big?: boolean;         // adds `big` (24 px rise) for headline blocks
  className?: string;
}): JSX.Element;
// Server HTML: <Tag class="rv[ big][ className]" style="--i:N">. Adds `in` when the element crosses
// the 85 % line (rootMargin '0px 0px -15% 0px'), or at once under reduced motion / without IntersectionObserver.
```

The existing props are unchanged, so the nine dark-era sections that use Reveal need no edit.

- [ ] **Step 1: Write the failing test** — replace all of `tests/reveal.test.tsx` with:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Reveal from '@/components/motion/Reveal';

let observed: Element[] = [];
let options: IntersectionObserverInit | undefined;
let trigger: (els: Element[], isIntersecting?: boolean) => void = () => {};
let unobserveMock: ReturnType<typeof vi.fn>;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  observed = [];
  options = undefined;
  unobserveMock = vi.fn();
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  class IO {
    constructor(private cb: IntersectionObserverCallback, opts?: IntersectionObserverInit) {
      options = opts;
      trigger = (els, isIntersecting = true) =>
        this.cb(els.map((t) => ({ target: t, isIntersecting }) as IntersectionObserverEntry), this as never);
    }
    observe(el: Element) { observed.push(el); }
    unobserve(el: Element) { unobserveMock(el); }
    disconnect() {}
  }
  vi.stubGlobal('IntersectionObserver', IO);
});

describe('Reveal', () => {
  it('renders its children', () => {
    render(<Reveal>hello</Reveal>);
    expect(screen.getByText('hello')).toBeTruthy();
  });

  // Review Focus #4: the server HTML carries the class but no inline style
  // that could hide anything; CSS alone decides, and only under html.js.
  it('ships `rv` in the server HTML with no inline opacity or transform', () => {
    const html = renderToStaticMarkup(<Reveal as="h2">Title</Reveal>);
    expect(html).toContain('class="rv"');
    expect(html).toContain('Title');
    expect(html).not.toMatch(/opacity|transform|visibility|display:\s*none/);
  });

  it('adds `in` once the element crosses the 85 % line, then stops watching it', () => {
    const { container } = render(<Reveal>hello</Reveal>);
    const el = container.firstElementChild as HTMLElement;
    expect(observed).toContain(el);
    expect(options?.rootMargin).toBe('0px 0px -15% 0px');
    trigger([el], false);
    expect(el.classList.contains('in')).toBe(false);
    trigger([el]);
    expect(el.classList.contains('in')).toBe(true);
    expect(unobserveMock).toHaveBeenCalledWith(el);
  });

  it('reveals at once under reduced motion, without observing', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    const { container } = render(<Reveal>hello</Reveal>);
    expect((container.firstElementChild as HTMLElement).classList.contains('in')).toBe(true);
    expect(observed).toHaveLength(0);
  });

  it('reveals at once where IntersectionObserver does not exist', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { container } = render(<Reveal>hello</Reveal>);
    expect((container.firstElementChild as HTMLElement).classList.contains('in')).toBe(true);
  });

  it('marks headline blocks `big` and keeps caller classes', () => {
    const { container } = render(
      <Reveal big className="car-h">
        x
      </Reveal>,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toBe('rv big car-h');
  });

  it('sets the stagger index as a custom property', () => {
    const { container } = render(<Reveal delayIndex={3}>x</Reveal>);
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--i')).toBe('3');
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/reveal.test.tsx`
Expected: FAIL — `ships rv in the server HTML` (the old component adds `rv` only in its effect), the rootMargin assertion (`'0px 0px -12% 0px'`), `reveals at once under reduced motion` and `…IntersectionObserver does not exist` (the old one never adds `in` there), and `marks headline blocks big`.

- [ ] **Step 3: Implement** — replace all of `src/components/motion/Reveal.tsx` with:

```tsx
'use client';

import { useEffect, useRef, type ElementType, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  as?: ElementType;
  /** Stagger step for the dark-era sections (75 ms each, via --i). */
  delayIndex?: number;
  /** Headline blocks rise 24 px instead of 16 px (prototype `.rv.big`). */
  big?: boolean;
  className?: string;
};

/** Fade-rise once at the 85 % line (master plan C9).
 *
 *  The `rv` class is in the server HTML, but it hides nothing by itself:
 *  globals.css only dims `.rv` under `html.js` (set by the pre-paint script)
 *  AND `prefers-reduced-motion: no-preference`, and only to .55 opacity, never
 *  0. So a visitor without JavaScript, or before hydration, sees every word.
 *  This component's one job is to add `in` -- when the element crosses the
 *  line, or straight away when there is nothing to animate (reduced motion,
 *  no IntersectionObserver). */
export default function Reveal({ children, as: Tag = 'div', delayIndex = 0, big = false, className = '' }: Props) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (calm || typeof IntersectionObserver === 'undefined') {
      el.classList.add('in');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        }
      },
      // Bottom margin -15 %: "in view" starts at 85 % of the viewport height.
      { rootMargin: '0px 0px -15% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const classes = ['rv', big ? 'big' : '', className].filter(Boolean).join(' ');
  return (
    <Tag ref={ref} className={classes} style={{ ['--i' as string]: String(delayIndex) }}>
      {children}
    </Tag>
  );
}
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/reveal.test.tsx && npm run check`
Expected: 7 pass; `npm run check` green, 566 tests (the WorkDeck stagger test and the smoke renders still pass — the props did not change).

- [ ] **Step 5: Commit**

```bash
git add src/components/motion/Reveal.tsx tests/reveal.test.tsx
git commit -m "feat(motion): Reveal ships .rv in the HTML and only enhances

The class is server-rendered but hides nothing on its own: CSS dims it
only under html.js and no-preference motion, to .55, never 0. The
component adds .in at the 85% line, or at once when there is nothing to
animate.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 11: Thai keep-runs — `src/lib/thai.ts` + `<ThaiText>` (C3)

**Files:** Create `src/lib/thai.ts`, `src/components/ThaiText.tsx`, `tests/thai.test.tsx`
**Interfaces:** Consumes: `.nw` (Task 6) · Produces (C3):

```ts
export const THAI_RE: RegExp;                 // /[\u0E00-\u0E7F]/: the Thai block (C3 spells it with the literal characters)
export const THAI_KEEP: readonly string[];    // the prototype's KEEP array, verbatim
export interface Run { text: string; keep: boolean }
export function keepRuns(text: string): Run[];
export default function ThaiText(props: { text: string }): JSX.Element; // src/components/ThaiText.tsx -- DEFAULT export (R8), server-safe
```

Rules (ported from the prototype's `KEEP`, `DATERE`, `UNITRE`): keep-list words, Thai dates and number+unit pairs become keep runs; a Thai word group containing `|` is split at the `|` into keep runs on each side and the `|` is removed; everything else is plain text; adjacent plain text merges, adjacent keep runs stay separate. Non-Thai input returns `[{ text, keep: false }]` untouched (including `''`). Invariant: for Thai input, joining the runs gives the input minus `|`. `<ThaiText>` renders keep runs as `<span class="nw">`, puts `<wbr>` between two adjacent keep runs, and renders nothing for `''`.

- [ ] **Step 1: Write the failing test** — create `tests/thai.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import ThaiText from '@/components/ThaiText';
import { THAI_KEEP, THAI_RE, keepRuns, type Run } from '@/lib/thai';

afterEach(cleanup);

const joined = (runs: Run[]) => runs.map((r) => r.text).join('');
const kept = (runs: Run[]) => runs.filter((r) => r.keep).map((r) => r.text);

describe('THAI_RE / THAI_KEEP', () => {
  it('detects Thai characters only', () => {
    expect(THAI_RE.test('ไทย')).toBe(true);
    expect(THAI_RE.test('Thai 2026 – ok')).toBe(false);
  });

  it('carries the prototype keep list verbatim', () => {
    expect(THAI_KEEP).toEqual([
      'เบอร์เกอร์คราฟต์', 'พาร์ตเนอร์ชิป', 'ซัพพลายเออร์', 'นอกเวลางาน', 'กำไรขั้นต้น', 'สุดสัปดาห์',
      'เครื่องมือ', 'งบประมาณ', 'สตาร์ทอัพ', 'โปรเจกต์', 'บาริสต้า', 'ค้าปลีก', 'ไอเดีย', 'ดีล',
    ]);
  });
});

describe('keepRuns', () => {
  it('returns non-Thai text untouched as one plain run', () => {
    expect(keepRuns('Business developer who builds his own tools.')).toEqual([
      { text: 'Business developer who builds his own tools.', keep: false },
    ]);
  });

  // Review Focus #5 -- the four edge inputs.
  it('handles an empty string without throwing', () => {
    expect(keepRuns('')).toEqual([{ text: '', keep: false }]);
  });

  it('leaves Thai with no keep word as one plain run, nothing dropped', () => {
    const s = 'ร้านอาหารจะได้ของสดจากตลาด โดยไม่ต้องไปจ่ายตลาดเองตอนเช้า ได้ไหม?';
    expect(keepRuns(s)).toEqual([{ text: s, keep: false }]);
  });

  it('turns `|` into the one allowed break: each side kept whole, the bar removed', () => {
    const runs = keepRuns('นัก Business Development ที่สร้างเครื่องมือ|ใช้เอง');
    expect(runs).toEqual([
      { text: 'นัก Business Development ', keep: false },
      { text: 'ที่สร้างเครื่องมือ', keep: true },
      { text: 'ใช้เอง', keep: true },
    ]);
    expect(joined(runs)).toBe('นัก Business Development ที่สร้างเครื่องมือใช้เอง');
  });

  it('keeps a `|` group whole even with trailing text after a space', () => {
    const runs = keepRuns('ไอเดียนี้คุ้มกับ|หนึ่งสุดสัปดาห์ หรือทั้งปี?');
    expect(kept(runs)).toEqual(['ไอเดียนี้คุ้มกับ', 'หนึ่งสุดสัปดาห์']);
    expect(joined(runs)).toBe('ไอเดียนี้คุ้มกับหนึ่งสุดสัปดาห์ หรือทั้งปี?');
  });

  it('mixes Thai with a URL and English brand names without losing a character', () => {
    const s = 'ดูได้ที่ https://gonai-three.vercel.app และวางระบบ Salesforce CRM ให้ทีมขาย';
    const runs = keepRuns(s);
    expect(joined(runs)).toBe(s);
    expect(kept(runs)).toEqual([]);
  });

  it('keeps words from the keep list, longest first', () => {
    expect(keepRuns('ผมสร้างเครื่องมือใช้เอง')).toEqual([
      { text: 'ผมสร้าง', keep: false },
      { text: 'เครื่องมือ', keep: true },
      { text: 'ใช้เอง', keep: false },
    ]);
    expect(kept(keepRuns('ได้รูปแบบพาร์ตเนอร์ชิปกับค้าปลีก'))).toEqual(['พาร์ตเนอร์ชิป', 'ค้าปลีก']);
    expect(kept(keepRuns('ทำดีลให้คุ้มทั้งสองฝั่ง'))).toEqual(['ดีล']);
  });

  it('keeps Thai dates together, with or without the day', () => {
    expect(kept(keepRuns('ออนไลน์ตั้งแต่ ส.ค. 2026 · Notion'))).toEqual(['ส.ค. 2026']);
    expect(kept(keepRuns('เริ่ม 14 ก.ย. 2026 เป็นต้นไป'))).toEqual(['14 ก.ย. 2026']);
  });

  it('keeps a number with its unit, including ranges', () => {
    expect(kept(keepRuns('ทุกการเปิดตัวเดินตาม checklist 30 ข้อ'))).toEqual(['30 ข้อ']);
    expect(kept(keepRuns('SOM 37 ล้านบาท'))).toEqual(['37 ล้านบาท']);
    expect(kept(keepRuns('ใช้เวลา 3–5 เดือน'))).toEqual(['3–5 เดือน']);
    // The unit is itself a keep word; the number+unit pair wins as one run.
    expect(kept(keepRuns('ดูแล 3 โปรเจกต์'))).toEqual(['3 โปรเจกต์']);
  });

  it('never drops or reorders characters: runs join back to the input minus `|`', () => {
    const samples = [
      'ผมเปิดช่องทางใหม่กับค้าปลีก Modern Trade ตั้งแต่ติดต่อครั้งแรกจนได้รูปแบบพาร์ตเนอร์ชิป',
      'ทำไมวางแผนทริปเดียว|ต้องใช้ตั้งห้าแอป?',
      'ออนไลน์ตั้งแต่ ส.ค. 2026 · Notion เป็น CMS เดียว · EN/TH · เทสต์อัตโนมัติ 400+ ข้อ',
      '|ขึ้นต้นด้วยขีด และจบด้วยขีด|',
      'สร้างตอนกลางคืน ด้วยกาแฟดีๆ',
    ];
    for (const s of samples) {
      const runs = keepRuns(s);
      expect(joined(runs), s).toBe(s.replace(/\|/g, ''));
      expect(runs.every((r) => r.text.length > 0), s).toBe(true);
    }
  });
});

describe('<ThaiText>', () => {
  it('wraps keep runs in .nw spans and leaves the rest as text', () => {
    const { container } = render(<ThaiText text="ผมสร้างเครื่องมือใช้เอง" />);
    const spans = container.querySelectorAll('span.nw');
    expect(Array.from(spans).map((s) => s.textContent)).toEqual(['เครื่องมือ']);
    expect(container.textContent).toBe('ผมสร้างเครื่องมือใช้เอง');
  });

  it('puts a <wbr> between two adjacent keep runs -- the allowed break', () => {
    const html = renderToStaticMarkup(<ThaiText text="ที่สร้างเครื่องมือ|ใช้เอง" />);
    expect(html).toBe('<span class="nw">ที่สร้างเครื่องมือ</span><wbr/><span class="nw">ใช้เอง</span>');
  });

  it('renders English exactly as given, with no spans', () => {
    const html = renderToStaticMarkup(<ThaiText text="Have something that should exist?" />);
    expect(html).toBe('Have something that should exist?');
  });

  it('renders nothing for an empty string, without throwing', () => {
    expect(() => render(<ThaiText text="" />)).not.toThrow();
    expect(renderToStaticMarkup(<ThaiText text="" />)).toBe('');
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/thai.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/ThaiText"`.

- [ ] **Step 3: Implement**

Create `src/lib/thai.ts`:

```ts
/** Thai keep-runs (spec §5.2, master plan C3).
 *
 *  Thai is written without spaces between words, so a browser may break a
 *  line inside a word -- at display sizes that orphans a syllable ("ใช้เอง"
 *  split as "ใช้ / เอง") or cuts a compound in half ("เครื่อง / มือ"). This
 *  splits a string into runs; a `keep` run is rendered as an unbreakable
 *  `.nw` span by <ThaiText>, everything else wraps normally.
 *
 *  Keep runs, ported from the approved prototype
 *  (design/white-edition/prototype/index.html -- KEEP, DATERE, UNITRE):
 *   - words on the keep list (never split a compound);
 *   - Thai dates ("14 ส.ค. 2026", "ส.ค. 2026");
 *   - a number and its unit ("30 ข้อ", "37 ล้านบาท");
 *   - `|` in copy (usually typed in Notion) marks the one allowed break
 *     inside a Thai word group: the text on each side of it stays whole, and
 *     the `|` itself is removed.
 *  Nothing else changes: joining every run's text gives back the input with
 *  only the `|` characters removed. Text without Thai characters comes back
 *  untouched as a single run. */

export const THAI_RE = /[\u0E00-\u0E7F]/;

/** The prototype's KEEP array, verbatim and in its order (longest first, so
 *  the alternation below prefers the longer compound). */
export const THAI_KEEP: readonly string[] = [
  'เบอร์เกอร์คราฟต์',
  'พาร์ตเนอร์ชิป',
  'ซัพพลายเออร์',
  'นอกเวลางาน',
  'กำไรขั้นต้น',
  'สุดสัปดาห์',
  'เครื่องมือ',
  'งบประมาณ',
  'สตาร์ทอัพ',
  'โปรเจกต์',
  'บาริสต้า',
  'ค้าปลีก',
  'ไอเดีย',
  'ดีล',
];

export interface Run {
  text: string;
  keep: boolean;
}

// Thai month abbreviations as written in dates ("ส.ค.").
const MONTH = '(?:ม\\.ค\\.|ก\\.พ\\.|มี\\.ค\\.|เม\\.ย\\.|พ\\.ค\\.|มิ\\.ย\\.|ก\\.ค\\.|ส\\.ค\\.|ก\\.ย\\.|ต\\.ค\\.|พ\\.ย\\.|ธ\\.ค\\.)';
const DATE = `(?:\\d{1,2} )?${MONTH} \\d{4}`;
const UNIT =
  '\\d[\\d.,]*(?:–\\d[\\d.,]*)? (?:ล้านบาท|พันบาท|พันคน|พัน|เดือน|ทีม|แบบ|ราย|คน|โปรเจกต์|ข้อ|บิล|ปี|มิติ|ใบ)';
// Order matters where two could start at the same place: a date or a
// number+unit ("3 โปรเจกต์") wins over the bare keep word inside it.
const KEEP_SOURCE = [DATE, UNIT, ...THAI_KEEP].join('|');
// A run of non-space characters that contains at least one `|`.
const PIPE_GROUP = '\\S*\\|\\S*';

export function keepRuns(text: string): Run[] {
  if (!THAI_RE.test(text)) return [{ text, keep: false }];

  const runs: Run[] = [];
  const push = (t: string, keep: boolean) => {
    if (!t) return;
    const last = runs[runs.length - 1];
    // Neighbouring plain text merges; neighbouring keep runs stay apart,
    // because the gap between two of them is an allowed break.
    if (!keep && last && !last.keep) last.text += t;
    else runs.push({ text: t, keep });
  };
  const scan = (segment: string) => {
    const re = new RegExp(KEEP_SOURCE, 'g');
    let at = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(segment)) !== null) {
      push(segment.slice(at, m.index), false);
      push(m[0], true);
      at = m.index + m[0].length;
    }
    push(segment.slice(at), false);
  };

  const groups = new RegExp(PIPE_GROUP, 'g');
  let at = 0;
  let g: RegExpExecArray | null;
  while ((g = groups.exec(text)) !== null) {
    scan(text.slice(at, g.index));
    for (const piece of g[0].split('|')) {
      if (THAI_RE.test(piece)) push(piece, true);
      else scan(piece);
    }
    at = g.index + g[0].length;
  }
  scan(text.slice(at));
  return runs;
}
```

Create `src/components/ThaiText.tsx`:

```tsx
import { Fragment } from 'react';
import { keepRuns } from '@/lib/thai';

/** Renders copy with Thai keep-runs (master plan C3): each keep run becomes
 *  an unbreakable `.nw` span (inline-block + nowrap, globals.css), the rest is
 *  plain text. Two keep runs side by side get a <wbr> between them -- that
 *  gap is the one place the line may break (see src/lib/thai.ts).
 *  Non-Thai text renders exactly as given. No 'use client': it is pure and
 *  works in server and client components alike. */
export default function ThaiText({ text }: { text: string }) {
  const runs = keepRuns(text);
  return (
    <>
      {runs.map((run, i) =>
        run.keep ? (
          <Fragment key={i}>
            {i > 0 && runs[i - 1].keep ? <wbr /> : null}
            <span className="nw">{run.text}</span>
          </Fragment>
        ) : (
          <Fragment key={i}>{run.text}</Fragment>
        ),
      )}
    </>
  );
}
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/thai.test.tsx && npm run check`
Expected: 16 pass; `npm run check` green, 582 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/thai.ts src/components/ThaiText.tsx tests/thai.test.tsx
git commit -m "feat(thai): keep-runs and ThaiText for Thai display copy

Keep-list words, Thai dates and number+unit pairs never break; a | in
Notion copy marks the one allowed break inside a Thai word group. Runs
always join back to the input minus the |, so nothing is ever dropped.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 12: `Sketch` — By-day chapter sketches, Talatify rings, Tripedia five → one (C4)

**Files:** Create `src/components/sketches.tsx`, `tests/sketches.test.tsx`
**Interfaces:** Consumes: raw variables `--kram --on-kram --card --ink-2` (Task 5) · Produces:

```ts
// The runtime list (R8). Story `Sketch` select options and story.json use exactly these literals.
export const SKETCH_NAMES = ['room', 'cases', 'formats', 'rollout', 'handover', 'rings', 'five'] as const;
export type SketchName = (typeof SKETCH_NAMES)[number];
// room = ch.1 "Find the room" (NDA), cases = ch.2 low/base/high, formats = ch.3 shelf strip/archway/e-paper,
// rollout = ch.4 route to a shopfront, handover = ch.5 BD -> Ops; chapter 6 has no sketch (phase strip instead).
export function isSketchName(value: string): value is SketchName;
export function Sketch(props: {
  name: SketchName | (string & {});  // unknown or '' renders nothing
  small?: boolean;                   // rings/five thumbnail cut: no labels, shorter viewBox
  label?: string;                    // accessible name -> role="img"; omitted -> aria-hidden
  caption?: string;                  // rings full size: "Method, not to scale." / "วิธีคิด ไม่ใช่สัดส่วนจริง"
  className?: string;                // chapter sketches always carry class "sk" first
}): JSX.Element | null;                // NAMED export `Sketch` is the contract (R8)
export default Sketch;
export type TileName = 'map' | 'cal' | 'wal' | 'trn' | 'cht' | 'pin';
export function TileIcon(props: { name: TileName; className?: string }): JSX.Element; // the prototype's TI tiles, for P2's Signature
```

Chapter sketches are `viewBox="0 0 160 64"`; rings `0 0 320 260` (small `182`); five `0 0 390 182` (small `150`).

- [ ] **Step 1: Write the failing test** — create `tests/sketches.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import Sketch, { SKETCH_NAMES, TileIcon, isSketchName } from '@/components/sketches';

afterEach(cleanup);

describe('Sketch', () => {
  it('knows the five chapter sketches plus rings and five', () => {
    expect(SKETCH_NAMES).toEqual(['room', 'cases', 'formats', 'rollout', 'handover', 'rings', 'five']);
  });

  it.each(SKETCH_NAMES)('renders %s as a decorative svg by default', (name) => {
    const { container } = render(<Sketch name={name} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('role')).toBeNull();
    expect(svg.querySelectorAll('path, rect, circle').length).toBeGreaterThan(0);
  });

  it('gives chapter sketches the 160 x 64 box and the `sk` class the By-day layout sizes', () => {
    const { container } = render(<Sketch name="room" className="mt-4" />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 160 64');
    expect(svg.getAttribute('class')).toBe('sk mt-4');
    expect(svg.textContent).toBe('NDA');
  });

  it('becomes an image with an accessible name when given a label', () => {
    const { container } = render(<Sketch name="rings" label="Three nested rings labelled TAM, SAM and SOM." />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Three nested rings labelled TAM, SAM and SOM.');
    expect(svg.hasAttribute('aria-hidden')).toBe(false);
  });

  it('labels the full rings TAM / SAM / SOM with the caption, and drops all text in the thumbnail', () => {
    const full = renderToStaticMarkup(<Sketch name="rings" caption="Method, not to scale." />);
    for (const word of ['TAM', 'SAM', 'SOM', 'Method, not to scale.']) expect(full).toContain(word);
    expect(full).toContain('viewBox="0 0 320 260"');
    const thumb = renderToStaticMarkup(<Sketch name="rings" small caption="Method, not to scale." />);
    expect(thumb).not.toMatch(/TAM|SAM|SOM|Method/);
    expect(thumb).toContain('viewBox="0 0 320 182"');
  });

  it('draws five app tiles collapsing into one GoNai tile, icons only at full size', () => {
    const { container } = render(<Sketch name="five" />);
    expect(container.querySelectorAll('svg > g')).toHaveLength(6);
    expect(container.querySelector('rect[fill="#1C7A57"]')).toBeTruthy();
    expect(container.querySelectorAll('svg > g > g').length).toBe(6);
    cleanup();
    const thumb = render(<Sketch name="five" small />);
    expect(thumb.container.querySelectorAll('svg > g > g')).toHaveLength(0);
  });

  it('renders nothing, without throwing, for an unknown or empty name (chapter 6 has no sketch)', () => {
    expect(() => render(<Sketch name="phases" />)).not.toThrow();
    expect(renderToStaticMarkup(<Sketch name="phases" />)).toBe('');
    expect(renderToStaticMarkup(<Sketch name="" />)).toBe('');
  });

  it('narrows strings with isSketchName', () => {
    expect(isSketchName('five')).toBe(true);
    expect(isSketchName('Five')).toBe(false);
  });
});

describe('TileIcon', () => {
  it('renders a decorative 24-unit line icon', () => {
    const { container } = render(<TileIcon name="pin" className="size-6" />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('fill')).toBe('none');
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    expect(svg.getAttribute('class')).toBe('size-6');
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/sketches.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/sketches"`.

- [ ] **Step 3: Implement** — create `src/components/sketches.tsx` (geometry copied from the prototype's `SK`, `drawRings`, `drawFive`, `TI`):

```tsx
import type { ReactNode } from 'react';

/* Line drawings from the approved prototype
   (design/white-edition/prototype/index.html): the five By-day chapter
   sketches (`SK`), the Talatify TAM/SAM/SOM rings (`drawRings`) and the
   Tripedia "five apps -> one" strip (`drawFive`), plus the five app tiles it
   uses (`TI`), which the Signature scene can reuse through <TileIcon>.
   Ported to JSX so they render on the server. The prototype styled them
   with its `.ln` class; those styles are inlined here as SVG presentation
   attributes (a CSS class beat the 1.25 stroke attribute there, so the
   rendered stroke was 1.5 -- 1.5 is what is kept). Paints that use a CSS
   variable go through `style`, where var() works in every browser. */

const LINE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Every sketch name, in chapter order then the two project drawings. The
 *  Story DB `Sketch` select and story.json must use exactly these literals. */
export const SKETCH_NAMES = ['room', 'cases', 'formats', 'rollout', 'handover', 'rings', 'five'] as const;
export type SketchName = (typeof SKETCH_NAMES)[number];
type ChapterSketch = Exclude<SketchName, 'rings' | 'five'>;

/** Chapter sketches, 160 x 64, in chapter order (chapter 6 has the phase
 *  strip instead of a sketch). */
const CHAPTER: Record<ChapterSketch, ReactNode> = {
  // 01 Find the room: a room with a door gap, a table with a seat each side, arrow to an NDA.
  room: (
    <>
      <g {...LINE}>
        <path d="M24 58H6V6h96v52H44" />
        <rect x="38" y="26" width="30" height="12" rx="2" />
        <circle cx="30" cy="32" r="4" />
        <circle cx="76" cy="32" r="4" />
        <path d="M110 32h16m-5-5l5 5-5 5" />
        <path d="M134 14h14l6 6v30h-20z" />
      </g>
      <text x="144" y="41" textAnchor="middle">NDA</text>
    </>
  ),
  // 02 Make the deal work: low / base / high, no values.
  cases: (
    <>
      <g {...LINE}>
        <rect x="24" y="8" width="44" height="10" rx="2" />
        <rect x="24" y="27" width="78" height="10" rx="2" />
        <rect x="24" y="46" width="116" height="10" rx="2" />
      </g>
      <text x="8" y="17">L</text>
      <text x="8" y="36">B</text>
      <text x="8" y="55">H</text>
    </>
  ),
  // 03 Design what goes on the wall: shelf-edge strip, archway, e-paper tag.
  formats: (
    <g {...LINE}>
      <path d="M4 30h44M4 38h44" />
      <rect x="4" y="30" width="44" height="8" rx="1" />
      <path d="M4 54h44" />
      <path d="M62 58V28a18 18 0 0 1 36 0v30" />
      <path d="M70 58V29a10 10 0 0 1 20 0v29" />
      <rect x="114" y="16" width="36" height="42" rx="3" />
      <path d="M121 28h22M121 36h16M121 44h19" />
    </g>
  ),
  // 04 Put it in the stores: dashed route to a shopfront, price tag with a check.
  rollout: (
    <>
      <g {...LINE}>
        <path d="M6 50c20 0 22-20 44-20s24 18 40 18" strokeDasharray="3 4" />
        <path d="M92 58V30h40v28M92 30l4-10h32l4 10M104 58V44h12v14" />
        <path d="M140 8l14 0 0 14-12 12-14-14z" />
      </g>
      <text x="142" y="21" fontSize="10">
        ✓
      </text>
    </>
  ),
  // 05 Hand it over: key from BD to Ops; three linked nodes.
  handover: (
    <>
      <g {...LINE}>
        <rect x="4" y="18" width="34" height="24" rx="4" />
        <rect x="74" y="18" width="38" height="24" rx="4" />
        <path d="M44 30h22m-5-5l5 5-5 5" />
        <circle cx="128" cy="12" r="5" />
        <circle cx="152" cy="30" r="5" />
        <circle cx="128" cy="50" r="5" />
        <path d="M132 15l16 12M148 34l-16 12M128 17v28" />
      </g>
      <text x="21" y="34" textAnchor="middle">
        BD
      </text>
      <text x="93" y="34" textAnchor="middle">
        Ops
      </text>
    </>
  ),
};

/** The prototype's `TI` tiles: 24 x 24 line icons (map, calendar, wallet,
 *  train, chat) and GoNai's pin. */
const TILE_PATHS = {
  map: (
    <>
      <path d="M3.5 6.5l5-2 7 2 5-2v13l-5 2-7-2-5 2z" />
      <path d="M8.5 4.5v13M15.5 6.5v13" />
    </>
  ),
  cal: (
    <>
      <rect x="4" y="5.5" width="16" height="14" rx="2.5" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  wal: (
    <>
      <rect x="3.5" y="6" width="17" height="13" rx="2.5" />
      <path d="M3.5 9.5h13" />
      <path d="M15.5 13.5h2" />
    </>
  ),
  trn: (
    <>
      <rect x="6" y="3.5" width="12" height="13" rx="3" />
      <path d="M6 10.5h12M9 20l1.5-3.5M15 20l-1.5-3.5" />
      <path d="M9 13.5h.01M15 13.5h.01" />
    </>
  ),
  cht: <path d="M4.5 5.5h15v10h-9l-4.5 3.5v-3.5h-1.5z" />,
  pin: (
    <>
      <path d="M12 20.5s6-5.2 6-10.5a6 6 0 0 0-12 0c0 5.3 6 10.5 6 10.5z" />
      <circle cx="12" cy="10" r="2.2" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type TileName = keyof typeof TILE_PATHS;
const FIVE_APPS: readonly TileName[] = ['map', 'cal', 'wal', 'trn', 'cht'];

/** One 24 x 24 app tile icon (Signature scene tiles, Tripedia strip). */
export function TileIcon({ name, className }: { name: TileName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false" {...LINE}>
      {TILE_PATHS[name]}
    </svg>
  );
}

export function isSketchName(value: string): value is SketchName {
  return (SKETCH_NAMES as readonly string[]).includes(value);
}

type SketchProps = {
  /** A SketchName, or any string from Notion (Story `Sketch` select); an
   *  unknown or empty name renders nothing instead of throwing. */
  name: SketchName | (string & {});
  /** rings/five only: the thumbnail cut (no labels, shorter). */
  small?: boolean;
  /** Accessible name. With it the drawing is role="img"; without it the
   *  drawing is decoration (aria-hidden), as in the By-day chapters and the
   *  index thumbnails, whose text says the same thing. */
  label?: string;
  /** rings, full size only: the line under the rings (prototype copy
   *  "Method, not to scale." / "วิธีคิด ไม่ใช่สัดส่วนจริง"). */
  caption?: string;
  className?: string;
};

export function Sketch({ name, small = false, label, caption, className }: SketchProps) {
  if (!isSketchName(name)) return null;
  const a11y = label
    ? ({ role: 'img', 'aria-label': label } as const)
    : ({ 'aria-hidden': true, focusable: 'false' } as const);

  if (name === 'rings') {
    return (
      <svg
        viewBox={`0 0 320 ${small ? 182 : 260}`}
        className={className}
        fontSize={13}
        fontWeight={600}
        style={{ letterSpacing: 0 }}
        {...a11y}
      >
        <g fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="160" cy={small ? 91 : 125} r={small ? 84 : 105} />
          <circle cx="160" cy={small ? 111 : 145} r={small ? 62 : 72} />
        </g>
        <circle cx="160" cy={small ? 131 : 162} r={small ? 38 : 34} style={{ fill: 'var(--kram)' }} />
        {!small && (
          <g fill="currentColor">
            <text x="160" y="70" textAnchor="middle">
              TAM
            </text>
            <text x="160" y="118" textAnchor="middle">
              SAM
            </text>
            <text x="160" y="170" textAnchor="middle" style={{ fill: 'var(--on-kram)' }}>
              SOM
            </text>
            {caption ? (
              <text x="160" y="248" textAnchor="middle">
                {caption}
              </text>
            ) : null}
          </g>
        )}
      </svg>
    );
  }

  if (name === 'five') {
    const y = small ? 54 : 70;
    const arrowY = small ? 74 : 90;
    return (
      <svg viewBox={`0 0 390 ${small ? 150 : 182}`} className={className} {...a11y}>
        {FIVE_APPS.map((app, i) => (
          <g key={app} transform={`translate(${20 + i * 52} ${y})`}>
            <rect width="40" height="40" rx="10" stroke="currentColor" strokeWidth={1.25} style={{ fill: 'var(--card)' }} />
            {!small && (
              <g transform="translate(8 8)" {...LINE} style={{ stroke: 'var(--ink-2)' }}>
                {TILE_PATHS[app]}
              </g>
            )}
          </g>
        ))}
        <path d={`M290 ${arrowY}h22m-6-6l6 6-6 6`} {...LINE} />
        {/* GoNai, the one app the five became -- its own green (spec §5.1). */}
        <g transform={`translate(322 ${small ? 50 : 66})`}>
          <rect width="48" height="48" rx="12" fill="#1C7A57" />
          {!small && (
            <g transform="translate(12 12)" {...LINE} stroke="#FFFFFF">
              {TILE_PATHS.pin}
            </g>
          )}
        </g>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 160 64"
      className={['sk', className].filter(Boolean).join(' ')}
      fill="currentColor"
      fontSize={11}
      fontWeight={600}
      style={{ letterSpacing: 0 }}
      {...a11y}
    >
      {CHAPTER[name]}
    </svg>
  );
}

export default Sketch;
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/sketches.test.tsx && npm run check`
Expected: 15 pass; `npm run check` green, 597 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/sketches.tsx tests/sketches.test.tsx
git commit -m "feat(sketches): By-day chapter sketches, Talatify rings, Tripedia five-to-one

Line drawings from the prototype as server-rendered JSX: decorative by
default, an image with a label when asked. Unknown names (a Notion select
typo, chapter 6) render nothing. TileIcon exposes the five app tiles for
the Signature scene.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 13: Remove the two retired projects (spec §8)

**Files:** Modify `tests/removals.test.ts` (one test appended), `src/content/fixtures/projects.json` (two objects removed), `src/lib/image-alt.ts` (six lines), `src/app/[locale]/layout.tsx` (`ogAlt`), `tests/content.test.ts` (two assertions), `tests/project-tour.test.tsx` (fixtures renamed), `tests/project-tour-helpers.test.ts` (one line), `tests/work-deck.test.tsx` (one line) · Delete `public/images/aisecretary.jpg`, `public/images/dailybrief.jpg`
**Interfaces:** Consumes: `walk`, `REMOVED_FILES` (Task 2) · Produces: build projects in fixtures are `Aje`, `GoNai`, `klao-site` (Business: `Talatify`, `Tripedia`); `IMAGE_ALT` / `IMAGE_ALT_BY_PROJECT` cover `gonai`, `aje`, `klao-site` only. Other projects' fixtures are untouched (P1 rewrites projects.json). Notion rows are not touched (unpublishing them is a ship-time step Klao confirms).

- [ ] **Step 1: Write the failing test** — in `tests/removals.test.ts`, before the final `});` of the `describe`, add:

```ts

  // Spec §8 / success criterion 5: two projects leave the site entirely --
  // copy, fixtures, alt text and their screenshots in public/images. The
  // pattern is assembled from pieces so this file does not itself contain
  // the names: the phase gate greps src/, public/ and tests/ for them.
  it('mentions neither removed project anywhere in src/, public/ or tests/', () => {
    const gone = new RegExp(['ai' + 'secretary', 'daily' + 'brief'].join('|'), 'i');
    const textLike = /\.(ts|tsx|css|json|md|txt|svg|html)$/;
    for (const file of [...walk('src'), ...walk('public'), ...walk('tests')]) {
      expect(gone.test(file), `file name ${file}`).toBe(false);
      if (textLike.test(file)) expect(gone.test(readFileSync(file, 'utf8')), file).toBe(false);
    }
  });
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/removals.test.ts`
Expected: FAIL — the first hit, e.g. `file name public/images/aisecretary.jpg`.

- [ ] **Step 3: Implement**

(a) Screenshots:

```bash
git rm public/images/aisecretary.jpg public/images/dailybrief.jpg
```

(b) `src/content/fixtures/projects.json` — delete this object (between Tripedia and GoNai) including its trailing comma line:

```json
  {
    "id": "fx-dailybrief",
    "name": "DailyBrief",
    "description": {
      "en": "Automated news pipeline: RSS to Thai summaries delivered to Notion every morning.",
      "th": "ระบบข่าวอัตโนมัติ: RSS แปลสรุปเป็นไทย ส่งเข้า Notion ทุกเช้า"
    },
    "stack": [
      "Python",
      "Notion API"
    ],
    "liveUrl": null,
    "repoUrl": null,
    "imageSrc": "/images/dailybrief.jpg",
    "featured": true,
    "order": 7,
    "type": "build",
    "outcome": null,
    "question": {
      "en": "Why does the morning news take so long to read?",
      "th": "ทำไมอ่านข่าวเช้าให้จบมันนานนัก?"
    },
    "slug": null
  },
```

and this one (between GoNai and Aje):

```json
  {
    "id": "fx-aisecretary",
    "name": "AISecretary",
    "description": {
      "en": "macOS menu bar app tracking AI usage, quotas, and projects with a morning digest.",
      "th": "แอป menu bar บน macOS ติดตามการใช้ AI โควตา และโปรเจกต์ พร้อมสรุปทุกเช้า"
    },
    "stack": [
      "Swift",
      "SwiftUI"
    ],
    "liveUrl": null,
    "repoUrl": null,
    "imageSrc": "/images/aisecretary.jpg",
    "featured": true,
    "order": 5,
    "type": "build",
    "outcome": null,
    "question": {
      "en": "How much AI am I actually using?",
      "th": "เดือนนี้ใช้ AI ไปเท่าไหร่กันแน่?"
    },
    "slug": null
  },
```

Check: `node -e "const p=require('./src/content/fixtures/projects.json');console.log(p.map(x=>x.name).join(','))"` → `Talatify,Tripedia,GoNai,Aje,klao-site`.

(c) `src/lib/image-alt.ts` — delete eight lines in four places (the `AJE`, `GONAI` and `KLAO_SITE` lines around them stay). The `DAILYBRIEF` constant:

```ts
const DAILYBRIEF =
  'A workspace database of dated market briefs under tabs for all briefs, retail media and economic markets, each row pairing a title and date with a Thai-language top-story line and a business-signal checkbox.';
```

the `AISECRETARY` constant:

```ts
const AISECRETARY =
  'A floating dark quota panel titled "Aqua Quota" with tabs for six AI tools, a large countdown timer until the next reset, a blue progress bar at 28% of peak usage, an amber cost bar reading $1,246 of a $25 cap and "100% over cap", and a bottom row of stats for requests, tokens, cache rate and dollar value.';
```

their two `IMAGE_ALT` entries:

```ts
  '/images/dailybrief.jpg': DAILYBRIEF,
```

```ts
  '/images/aisecretary.jpg': AISECRETARY,
```

and their two `IMAGE_ALT_BY_PROJECT` entries:

```ts
  AISecretary: AISECRETARY,
```

```ts
  DailyBrief: DAILYBRIEF,
```

Check: `grep -c "" src/lib/image-alt.ts` → `44` (was 52).

(d) `src/app/[locale]/layout.tsx` — replace

```tsx
  const ogAlt: Record<Locale, string> = {
    en: 'Klao — business developer who builds his own tools. Selected work: GoNai, AISecretary, DailyBrief.',
    th: 'Klao — นัก Business Development ที่สร้างเครื่องมือใช้เอง ผลงานเด่น: GoNai, AISecretary, DailyBrief',
  };
```

with

```tsx
  // No project list here: the two removed projects (spec §8) are still drawn
  // on the current og-*.png cards, and alt text may not name them. When the
  // cards are re-rendered without them, a project list can come back.
  const ogAlt: Record<Locale, string> = {
    en: 'Klao — business developer who builds his own tools.',
    th: 'Klao — นัก Business Development ที่สร้างเครื่องมือใช้เอง',
  };
```

(e) `tests/content.test.ts` — replace

```ts
    expect(featured.map((p) => p.name)).toContain('DailyBrief');
```

with

```ts
    expect(featured.map((p) => p.name)).toContain('klao-site');
```

and replace

```ts
    expect(builds).toEqual(['Aje', 'GoNai', 'AISecretary', 'klao-site', 'DailyBrief']);
```

with

```ts
    expect(builds).toEqual(['Aje', 'GoNai', 'klao-site']);
```

(f) `tests/project-tour.test.tsx` — the two fixtures become Aje (no live URL, with an outcome) and klao-site (repo link only), which exercise the same branches. Run this exact rewrite:

```bash
perl -pi -e 's/\bsecretary\b/aje/g; s/\bbrief\b/site/g; s/AISecretary/Aje/g; s/DailyBrief/klao-site/g; s#Klaosj/dailybrief#Klaosj/klao-site#g; s/Runs every morning/Working prototype/g; s/รันทุกเช้า/prototype ใช้งานได้จริง/g' tests/project-tour.test.tsx
grep -n "const aje\|const site\|const three" tests/project-tour.test.tsx
```

Expected:

```text
39:const aje = make('a', 'Aje', 4, { outcome: { en: 'Working prototype', th: 'prototype ใช้งานได้จริง' } });
40:const site = make('d', 'klao-site', 5, { repoUrl: 'https://github.com/Klaosj/klao-site' });
42:const three = [site, talatify, aje, gonai];
```

(g) `tests/project-tour-helpers.test.ts` — replace

```ts
    expect(windowTitle(make('a', 1, { name: 'AISecretary' }))).toBe('AISecretary');
```

with

```ts
    expect(windowTitle(make('a', 1, { name: 'Aje' }))).toBe('Aje');
```

(h) `tests/work-deck.test.tsx` — replace

```ts
const secondBuild: Project = { ...build, id: 'p-build2', name: 'AISecretary', order: 4 };
```

with

```ts
const secondBuild: Project = { ...build, id: 'p-build2', name: 'Aje', order: 4 };
```

- [ ] **Step 4: Run and pass**

```bash
npx vitest run tests/removals.test.ts tests/content.test.ts tests/project-tour.test.tsx tests/project-tour-helpers.test.ts tests/work-deck.test.tsx tests/image-alt.test.ts tests/smoke.test.tsx
npm run check
grep -rli "aisecretary\|dailybrief" src public tests; echo "grep exit $?"
```

Expected: all listed files pass; `npm run check` green, 598 tests; the grep prints nothing and `grep exit 1` (no match).

- [ ] **Step 5: Commit**

```bash
git add tests/removals.test.ts src/content/fixtures/projects.json src/lib/image-alt.ts src/app/[locale]/layout.tsx tests/content.test.ts tests/project-tour.test.tsx tests/project-tour-helpers.test.ts tests/work-deck.test.tsx
git commit -m "content(projects): retire two projects from the site (spec §8)

Fixtures, screenshots, curated alt text and the og alt list go; tests
that used the names now use Aje and klao-site on the same code paths. A
removal test keeps both names out of src/, public/ and tests/. The
og-*.png cards still draw them and need re-rendering (open item); the
Notion rows are unpublished at ship time, with Klao's OK.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 14: Phase gate

**Files:** none (fixes, if any, go back into the files of the task that owns them)
**Interfaces:** Consumes: everything above · Produces: the P0 gate result for spec §12 ("tests green, pages render in both themes")

- [ ] **Step 1: Unit tests, types, lint**

Run: `npm run check`
Expected: green; `Tests  598 passed (598)` (or a different count with every test passing and the difference explained).

- [ ] **Step 2: Production build and built-output checks**

```bash
npm run build
grep -o '<html[^>]*>' .next/server/app/en.html
grep -c "d.classList.add('js')" .next/server/app/en.html
grep -o '<link rel="preload" href="/fonts/anuphan-thai.woff2"[^>]*>' .next/server/app/th.html
grep -rho '@font-face{[^}]*Anuphan Thai[^}]*}' .next/static | grep -c 'unicode-range:U+2D7,U+303,U+331,U+E01-E5B,U+200C-200D,U+25CC'
```

Expected: the build succeeds with no network font download; `<html lang="en">` (no `js` class in the server HTML — only the script adds it); `1`; the preload link; `1`.

- [ ] **Step 3: Repository greps**

```bash
grep -ri "aisecretary\|dailybrief" src public tests; echo "names exit $?"
grep -rn "Space_Grotesk\|font-sg" src; echo "grotesk exit $?"
grep -rn "from 'next/font" src tests; echo "next/font exit $?"
grep -rn "HEX\b\|rgbFloat\|PARTICLE_COLORS" src tests; echo "hex exit $?"
grep -rln "motion/HeroMonument\|motion/PointerFx" src tests
ls src/components/motion
```

Expected: `names exit 1`, `grotesk exit 1`, `next/font exit 1`, `hex exit 1` (1 = no match); the fifth grep lists only `tests/removals.test.ts`; the motion folder holds `MaskedHeading.tsx Reveal.tsx SpotlightList.tsx TiltCard.tsx spotlight.css tilt.css` (D2: kept for P2/P3/P5).

- [ ] **Step 4: Screenshots and the no-JavaScript check**

Start `npm run dev` in the background, then:

```bash
node /tmp/klao-qa/shoot.mjs p0-gate
node /tmp/klao-qa/nojs.mjs
```

Expected: 12 lines `ok` and `all shots ok`; then `js off {"jsClass":false,"rv":N,"dimmed":0,"below":0}` and `js on {"jsClass":true,…,"below":0}` with exit 0 (Review Focus #4: without JavaScript no `.rv` element is dimmed; with it nothing drops below .55).

- [ ] **Step 5: Review the 12 PNGs in `/tmp/klao-qa/p0-gate/`**

Confirm by eye:
- Light (`*-light-*`): white canvas; the only non-white bands are pale mist grey; no charcoal anywhere; primary pills are Kram navy with white text; the nav monogram is a Kram disc; the footer shows Auto · Light · Dark with Light pressed.
- Dark and system dark (`*-dark-*`, `*-system-dark-*`): near-black canvas (#0A0B0D), light text, pills pale Kram with dark text, screenshots slightly dimmed.
- Thai (`th-*`): Thai glyphs in Anuphan; Latin words inside Thai lines ("Business Development", "Actmedia") in the system font; no Thai mark touching the line above in any heading.
- Phone (`*-390`): nothing cut off at the right edge.
Expected and fine at this phase: the dark-era layout itself (hero pills, tour band, WorkDeck slides, CvBand, footer) is unchanged apart from colour and type — P1–P4 replace it; the Thai hero headline may still break inside "ใช้เอง" (P1 applies `<ThaiText>` with a `|`).

Stop the dev server (`pkill -f "next dev"`).

- [ ] **Step 6: Close out**

If any step failed, fix it in the files of the task that owns the behaviour, commit (`fix(p0): <what>` + the two trailer lines), and rerun Steps 1–5. When everything passes there is nothing to commit. Report to Klao: the test count, `/tmp/klao-qa/p0-gate/`, and the open items — (1) the three D5 values to confirm; (2) re-render `public/og/og-*.png` without the removed projects; (3) `npm audit` still lists postcss (and possibly sharp), unreachable; (4) TiltCard, SpotlightList and MaskedHeading stay until P2, P3 and P5 remove their last consumers.

---

## Appendix A: `/tmp/klao-qa/shoot.mjs`

Outside the repo; create once (`mkdir -p /tmp/klao-qa`, then save this file). Chrome must be installed (`channel: 'chrome'`); Playwright is imported from the local npx cache, so nothing is added to `package.json`.

```js
// White Edition P0 visual check -- lives outside the repo, never committed.
// Usage: node /tmp/klao-qa/shoot.mjs <label>
//   BASE      server to shoot (default http://localhost:3000)
//   MODES     comma list of light,dark,system-dark (default: all three)
//               light       = Light stored, light system
//               dark        = Dark stored, light system (the toggle beats the system)
//               system-dark = nothing stored, dark system (Auto follows the system)
//   PREPAINT  set to 0 before the pre-paint script exists (skips the
//             `js` class and data-theme checks)
// Shoots /en and /th at 1440x900 and 390x844 per mode, saves full-page PNGs
// to /tmp/klao-qa/<label>/, prints one line per shot, and exits 1 if any shot
// has a page/console error, horizontal overflow, the wrong page colour, a
// dark band in light mode, or text within 1.5:1 of its background.
import { chromium } from '/Users/suvichakjarunopratamp/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const label = process.argv[2] ?? 'p0';
const BASE = process.env.BASE ?? 'http://localhost:3000';
const MODES = (process.env.MODES ?? 'light,dark,system-dark').split(',');
const PREPAINT = process.env.PREPAINT !== '0';
const OUT = `/tmp/klao-qa/${label}`;
mkdirSync(OUT, { recursive: true });

const MODE = {
  light: { stored: 'light', scheme: 'light', attr: 'light', body: 'rgb(255, 255, 255)' },
  dark: { stored: 'dark', scheme: 'light', attr: 'dark', body: 'rgb(10, 11, 13)' },
  'system-dark': { stored: null, scheme: 'dark', attr: null, body: 'rgb(10, 11, 13)' },
};

// The first dev compile can take a while.
for (let i = 0; ; i++) {
  try {
    if ((await fetch(`${BASE}/en`)).ok) break;
  } catch {}
  if (i > 120) throw new Error(`${BASE}/en did not answer within 120 s`);
  await new Promise((r) => setTimeout(r, 1000));
}

const browser = await chromium.launch({ channel: 'chrome' });
let failed = 0;
for (const mode of MODES) {
  const m = MODE[mode];
  if (!m) throw new Error(`unknown mode ${mode}`);
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    for (const locale of ['en', 'th']) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: m.scheme });
      await ctx.addInitScript((stored) => {
        try {
          if (stored) localStorage.setItem('klao-theme', stored);
          else localStorage.removeItem('klao-theme');
        } catch {}
      }, m.stored);
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
      await page.goto(`${BASE}/${locale}`, { waitUntil: 'networkidle' });
      // Scroll to the bottom and back so every reveal has fired.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 30));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(900);
      const facts = await page.evaluate((isLight) => {
        const rgb = (c) => (c.match(/[\d.]+/g) || []).map(Number);
        const lum = ([r, g, b]) => {
          const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
        };
        const opaque = (c) => c.length >= 3 && (c.length < 4 || c[3] > 0.5);
        const bgOf = (el) => {
          for (let n = el; n; n = n.parentElement) {
            const c = rgb(getComputedStyle(n).backgroundColor);
            if (opaque(c)) return c;
          }
          return rgb(getComputedStyle(document.documentElement).backgroundColor);
        };
        const vw = window.innerWidth;
        const darkBands = [];
        if (isLight) {
          for (const el of document.querySelectorAll('body *')) {
            const r = el.getBoundingClientRect();
            if (r.width < vw * 0.5 || r.height < 200) continue;
            const c = rgb(getComputedStyle(el).backgroundColor);
            if (opaque(c) && lum(c) < 0.5) darkBands.push(`${el.tagName.toLowerCase()}#${el.id}`);
          }
        }
        const faint = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let t = walker.nextNode(); t; t = walker.nextNode()) {
          const el = t.parentElement;
          if (!el || !t.textContent.trim()) continue;
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          if (cs.visibility === 'hidden' || r.width === 0 || r.height === 0) continue;
          if (el.closest('[aria-hidden="true"], .sr-only')) continue;
          const l1 = lum(rgb(cs.color));
          const l2 = lum(bgOf(el));
          const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
          if (ratio < 1.5) faint.push(`"${t.textContent.trim().slice(0, 30)}" ${ratio.toFixed(2)}:1`);
        }
        return {
          js: document.documentElement.classList.contains('js'),
          attr: document.documentElement.getAttribute('data-theme'),
          body: getComputedStyle(document.body).backgroundColor,
          overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          darkBands: darkBands.slice(0, 5),
          faint: faint.slice(0, 8),
        };
      }, mode === 'light');
      const file = `${OUT}/${locale}-${mode}-${w}.png`;
      await page.screenshot({ path: file, fullPage: true });
      const problems = [
        ...errors.slice(0, 3).map((e) => `error: ${e}`),
        facts.overflowX > 0 && `horizontal overflow ${facts.overflowX}px`,
        facts.body !== m.body && `page colour ${facts.body}, expected ${m.body}`,
        PREPAINT && !facts.js && 'no `js` class on <html>',
        PREPAINT && facts.attr !== m.attr && `data-theme=${facts.attr}, expected ${m.attr}`,
        ...facts.darkBands.map((b) => `dark band ${b}`),
        ...facts.faint.map((f) => `faint text ${f}`),
      ].filter(Boolean);
      if (problems.length) failed++;
      console.log(`${problems.length ? 'FAIL' : 'ok  '} ${locale} ${mode} ${w}  ${file}`);
      for (const p of problems) console.log(`     ${p}`);
      await ctx.close();
    }
  }
}
await browser.close();
console.log(failed ? `${failed} shot(s) failed` : 'all shots ok');
process.exit(failed ? 1 : 0);
```

## Appendix B: `/tmp/klao-qa/nojs.mjs`

Outside the repo. Loads `/en` with JavaScript off and on, and fails if, without JavaScript, `html.js` exists or any `.rv` element is dimmed, or if, with JavaScript, `html.js` is missing or any `.rv` element sits below .55 opacity.

```js
import { chromium } from '/Users/suvichakjarunopratamp/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';
const BASE = process.env.BASE ?? 'http://localhost:3000';
for (let i = 0; ; i++) {
  try { if ((await fetch(`${BASE}/en`)).ok) break; } catch {}
  if (i > 120) throw new Error('no server');
  await new Promise((r) => setTimeout(r, 1000));
}
const browser = await chromium.launch({ channel: 'chrome' });
let bad = 0;
for (const js of [false, true]) {
  const ctx = await browser.newContext({ javaScriptEnabled: js, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en`, { waitUntil: 'load' });
  const r = await page.evaluate(() => ({
    jsClass: document.documentElement.classList.contains('js'),
    rv: document.querySelectorAll('.rv').length,
    dimmed: [...document.querySelectorAll('.rv')].filter((e) => getComputedStyle(e).opacity !== '1').length,
    below: [...document.querySelectorAll('.rv')].filter((e) => Number(getComputedStyle(e).opacity) < 0.55).length,
  }));
  console.log(js ? 'js on ' : 'js off', JSON.stringify(r));
  if (!js && (r.jsClass || r.dimmed || !r.rv)) bad++;
  if (js && (!r.jsClass || r.below)) bad++;
  await ctx.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
```

---

## Final export shapes (master-plan R8)

| Module | Export | Shape |
|---|---|---|
| `src/components/icons.tsx` | **named** `Icon` (+ default), `type IconName`, `ICON_NAMES`, `isIconName` | `Icon({ name: IconName \| (string & {}), className?: string })` → svg or `null` |
| `src/components/ThaiText.tsx` | **default** `ThaiText` | `ThaiText({ text: string })` |
| `src/lib/thai.ts` | named `THAI_RE`, `THAI_KEEP`, `type Run`, `keepRuns` | `keepRuns(text: string): Run[]` |
| `src/components/sketches.tsx` | **named** `Sketch` (+ default), `SKETCH_NAMES` (`as const`), `type SketchName`, `isSketchName`, `TileIcon`, `type TileName` | `Sketch({ name: SketchName \| (string & {}), small?, label?, caption?, className? })` → svg or `null`; `SKETCH_NAMES = ['room', 'cases', 'formats', 'rollout', 'handover', 'rings', 'five']` |
| `src/components/motion/Reveal.tsx` | **default** `Reveal` (unchanged shape) | `Reveal({ children, as?: ElementType = 'div', delayIndex?: number = 0, big?: boolean, className?: string })` |
| `src/components/ThemeToggle.tsx` | **default** `ThemeToggle` (`'use client'`) | `ThemeToggle({ locale: Locale, icons?: boolean = true, className?: string })` |
| `src/lib/theme.ts` | named `ThemePref`, `THEME_STORAGE_KEY`, `THEME_EVENT`, `RawToken`, `TOKENS`, `isThemePref`, `THEME_PREPAINT_SCRIPT`, `readThemePref`, `writeThemePref` | as C2, plus `THEME_EVENT` and `isThemePref` |
| `src/components/SiteFooter.tsx` | temporary mount | `{/* P0-TEMP-THEME-TOGGLE */}` directly above `<ThemeToggle locale={locale} className="mt-4" />` |

## Contract gaps (for the master plan and the P1–P5 authors)

Checked against the P1–P5 plans on disk (26 Sep 2026). Differences from what they assumed, then additions they can use:

1. **Fonts (D1).** `next/font` cannot produce a Thai-only face under Turbopack. The stack is `--font-sans` = `"Anuphan Thai", -apple-system, …` in globals.css; the face is a CSS `@font-face` over `/fonts/anuphan-thai.woff2`, preloaded by the layout. There is no `--font-anuphan` / `--font-sg` variable and **`tests/setup.ts` no longer exists** (nothing to mock; `vitest.config.ts` has no `setupFiles`). P5 Task 3 (d) becomes a no-op; drop `tests/setup.ts` from its `git add` line. Nobody may reintroduce `next/font`.
2. **Theme sync across islands (answers P4's gap 12).** `writeThemePref` dispatches `THEME_EVENT` (`'klao:theme'`, `CustomEvent<{ pref: ThemePref }>` on `window`) and every `ThemeToggle` listens, so a theme chosen in ⌘K updates the footer and phone-menu toggles without a reload. `readThemePref()` returns the `<html data-theme>` value when storage *throws*, so a toggle mounted later in the same page view shows the session's choice; with nothing chosen it is still `'auto'`.
3. **Tokens (R7).** `--raised --e4 --ctl --curtain --shot-dim` exist in all three theme blocks. The colours among them (`raised`, `ctl`, `curtain`) are also in `RawToken` / `TOKENS` and covered by the parity test; `--e4` (shadow) and `--shot-dim` (filter) are CSS-only. `--ctl` duplicates C1's `--glass-ctl` (same values; `.ctl` and `.seg` use `--ctl`, P1 uses `--glass-ctl` — both work). Also defined: `--kram-press --glass-hi --glass-edge --sheen --sat` and motion `--dur-quick --dur-enter --dur-sheet --dur-rise --dur-fade`; `--dur-tap` is C1's 120 ms (the prototype had 90 ms). Both Tailwind blocks are `@theme inline static`, so every `--color-*` also exists on `:root`; component CSS should still prefer the raw names.
4. **Icon.** Named `Icon` as P1–P4 import it; it is also the default export, and `name` additionally accepts any string (unknown → renders nothing). No caller change needed.
5. **Sketch (P2, P3).** P3's literals (`room`, `cases`, `formats`, `rollout`, `handover`, empty for chapter 6) match `SKETCH_NAMES`. `Sketch` also takes `small` (thumbnail cut: no labels, shorter viewBox), `label` (→ `role="img"` + `aria-label`; otherwise `aria-hidden`) and `caption` (rings only, "Method, not to scale." / "วิธีคิด ไม่ใช่สัดส่วนจริง"). P2's `<Sketch name={project.media} />` renders the full-size decorative drawing: its index thumbnails should pass `small`, and its sheet media should pass `label={project.alt[locale]}` and, for rings, `caption`. `TileIcon` / `TileName` exist for P2's Signature tiles.
6. **ThemeToggle.** Default export taking `{ locale }` as P1 and P4 call it; optional `icons` (the phone menu can pass `icons={false}` like the prototype) and `className`. Thai labels are the prototype's ตามเครื่อง / สว่าง / มืด (not ออโต้). P4 rewrites `SiteFooter.tsx` whole, which removes the marked mount; its Task 10 note that the temporary mount sits in `layout.tsx` is wrong — it is in `SiteFooter.tsx`, marked `P0-TEMP-THEME-TOGGLE`.
7. **Reveal.** Default export, same props as today plus optional `big`. Behaviour change every caller inherits: `rv` is now in the server HTML (dimmed only under `html.js` + no-preference motion, never below .55) and `in` is added at the 85 % line (`rootMargin: '0px 0px -15% 0px'`), or at once under reduced motion / without IntersectionObserver.
8. **C9 additions.** `.glass.glass-pill` is the prototype's `.glass.pill` (the tour pill; answers P2's gap 2, which fell back to plain `.glass`); `.ctl` is the small glass control; `.seg` is the segmented control in globals.css with the prototype values — P1's namespaced `.lt-seg` is fine; P4's own `.seg` in `site-footer.css` duplicates it and can be dropped (if both stay, P4's unlayered copy wins, same values). `.rv.big` is the 24 px headline rise. Prototype names that collide with C9 and must be renamed by the porting phase: the Signature's 56 px app `.tile`; `.btn.fill` / `.btn.out` → `.btn-fill` / `.btn-out`; `.h1 .h2 .lead .eyebrow .cap .legal` → `.t-hero .t-h2 .t-lead .t-eyebrow .t-cap .t-legal`. Until P5, an unlayered legacy rule gives Thai `h1–h3` without a `.t-*` class `line-height: 1.5`; new headings should use a C9 class or set their own Thai line-height at specificity ≥ (0,2,1).
9. **C3 detail.** `|` semantics: a Thai word group (non-space run) containing `|` becomes keep runs on each side; `<ThaiText>` puts `<wbr>` between adjacent keep runs. Non-Thai strings are returned verbatim, `|` included. The prototype's `\n` desktop-only break (`<br class="dbr">`) is not part of C3; P1 owns it if the hero needs it.
10. **Dictionary.** P0 adds `appearance`, `themeAuto`, `themeLight`, `themeDark` (en/th, prototype copy). No other phase adds these keys (checked).
11. **Kept on purpose.** `TiltCard` (WorkDeck → P2), `SpotlightList` (CraftBand → P3), `MaskedHeading` (seven sections → P5). Each deleting phase also deletes the component, its CSS and its test, and may add the path to `tests/removals.test.ts`.
12. **Spec vs prototype (D5).** Reveal follows the prototype, not spec §5.5's wording; phone eyebrow follows spec §5.2; `.t-panel` Thai sizes are derived. Klao confirms at the P0 review.
13. **Open items outside P0.** `public/og/og-*.png` still draw the removed projects (re-render from `design/og/*.html`, P5 or ship). The Thai font is served from `public/` with Vercel's default revalidating cache; if Lighthouse flags it at the preview, add a long-cache header for `/fonts/*` in `next.config.ts` (the file name would then need a version suffix). `npm audit` keeps listing postcss (pinned inside Next 15.5.26) and possibly sharp — unreachable, documented in the Task 1 commit.
