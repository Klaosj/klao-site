# White Edition "Daylight" Implementation Plan (master)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace klao-site's dark home page with the white, Apple-calibrated "Daylight" page from the approved spec, with light/dark themes, keeping every word editable in Notion.

**Architecture:** Server components render content from Notion (fixtures as fallback); small client islands handle the tour, signature scrub, sheets, career detent, theme and ⌘K. One token layer in `globals.css` (raw CSS variables per theme, exposed to Tailwind v4 through `@theme inline`) replaces the dark band palette. Six sequential phases; each ends with `npm run check` and `npm run build` green and a page that renders.

**Tech Stack:** Next.js 15.5 (App Router, ISR 1 h) · React 19.2 · Tailwind CSS v4.3 · @notionhq/client · Vitest 3 + Testing Library (jsdom per file) · Playwright via `npx` for the QA matrix only.

**Spec:** `docs/superpowers/specs/2026-09-25-white-edition-design.md` (approved by Klao 2026-09-25). Reference prototype: `design/white-edition/prototype/index.html`. Measured scale: `design/white-edition/APPLE-SCALE.md`.

## Phase plans (execute in order)

| Phase | Plan | Delivers |
|---|---|---|
| P0 | `2026-09-25-white-edition-p0-foundation.md` | Next patch · light/dark tokens · theme pre-paint + toggle · fonts · Thai keep-runs · icons + sketches · removals (motion leftovers, AISecretary/DailyBrief) — the current page renders light |
| P1 | `2026-09-25-white-edition-p1-nav-hero.md` | Project model fields · new SiteNav (capsule, phone menu, thumb bar) · HeroTour (plays once) |
| P2 | `2026-09-25-white-edition-p2-signature-projects.md` | Signature scene · ProjectsIndex · ProjectSheet with `#work/<key>` |
| P3 | `2026-09-25-white-edition-p3-career-byday.md` | Career fields · CareerBand (rail, pills, detent, panel, toolbox) · Story DB · ByDay (two columns ≥ 1068) |
| P4 | `2026-09-25-white-edition-p4-faq-close-palette.md` | FAQ DB · FaqBand · CloseBand · new SiteFooter · ⌘K palette + Ask Preview |
| P5 | `2026-09-25-white-edition-p5-cleanup-qa.md` | Legacy token + old component removal · NOTION_SETUP docs · QA matrix script · preview/ship checklist |

Execution branch: `feat/white-edition`, created from `spec/white-edition` (so the spec, plans and prototype travel with it). Never push, merge or touch Notion without Klao's explicit OK at the gates in spec §12.

## Global Constraints

- Next `^15.5.26` (P0 bumps from 15.5.23); React 19.2; Tailwind v4.3; no new runtime dependencies (no cmdk, no motion library, no icon package — icons are inlined from the prototype's Phosphor subset, MIT).
- Light is the default theme; dark via `prefers-color-scheme` or the toggle (`localStorage['klao-theme']` = `auto|light|dark`); no flash of the wrong theme on load.
- Only `transform` and `opacity` animate. Exactly one scroll-linked animation on the page (Signature). Under `prefers-reduced-motion: reduce` nothing autoplays and **no content is ever hidden**.
- Kram `#26314A` is the only accent. GoNai green `#1C7A57` appears only inside GoNai's frame, sheet and "Open app".
- Thai is one size step smaller than English everywhere; Thai letter-spacing is 0; Thai display text uses keep-runs; `|` in copy marks the one allowed break.
- No count-up animations. Big numerals only for 30 / 500 (Signature) and Career panel figures.
- Copy comes from the prototype (it is the approved draft). Spelling "Actmedia". English is "conversational". THB 1.1M is "My personal monthly sales target". No Apple copy or headings.
- AISecretary and DailyBrief appear nowhere in `src/`, `public/`, `tests/`.
- Two-layer content rule: every Notion field has a fixture counterpart in `src/content/fixtures/*.json`; mappers tolerate every new field being empty (pre-migration Notion must still render).
- The repo is **public**: no client, retailer, partner or project names from Klao's private BD notes; no internal figures. Only what the prototype already shows.
- Site updates via ISR about 1 h — never write "instant" or "immediately" in copy or docs.
- ⌘K Ask Preview makes **no model call and no network request**.
- Images ≤ 250 KB, always with width/height or aspect-ratio.
- Tests follow repo conventions: `// @vitest-environment jsdom` pragma per file, `afterEach(cleanup)`, stub `matchMedia` and `IntersectionObserver` in `beforeEach` (see `tests/hero.test.tsx`). Comments explain *why*, at the repo's density.
- Every phase ends with `npm run check` (tsc + eslint + vitest) and `npm run build` both green; commits happen task by task — no phase leaves the site unbuildable.

## Review Focus

1. **Pre-migration Notion:** a live Notion row without any of the new properties (Status, Media, Tour, StartDate; Story/FAQ DBs absent) must still render a sensible page — mapper defaults, never a crash or an empty section. Owner: P1 (projects), P3 (career, story), P4 (faq). Each adds a mapper test with a row that has only the old properties, and a `getStory`/`getFaq` test with `NOTION_TOKEN` set but the DB env var missing (→ fixtures).
2. **Storage blocked:** Safari private mode / blocked site data makes `localStorage` throw — theme falls back to `auto`, the toggle still works for the session, nothing throws. Owner: P0 theme tests.
3. **Bad sheet URLs:** `#work/`, `#work/unknown`, `#work/GoNai` (wrong case) open nothing and throw nothing; Back after opening a sheet closes it; loading a URL with a valid hash opens that sheet. Owner: P2 sheet-url + ProjectSheet tests.
4. **No JavaScript / before hydration:** server HTML shows every section's content (tour first frame, signature static stack, all chapters, FAQ answers reachable) — reveals only enhance once `html.js` is set by the pre-paint script. Owner: P0 (the `js` class), P1/P2/P3 server-render tests asserting no inline `opacity:0` and content present.
5. **Thai edge text:** a Thai string with no keep-word, one with `|`, one mixing a URL or English brand, and an empty string all render without throwing and without dropping characters. Owner: P0 `keepRuns` tests.

---

## File structure (end state)

| Path | Responsibility | Phase |
|---|---|---|
| `src/app/globals.css` | Raw theme variables (`:root`, `[data-theme="dark"]`, system-dark), `@theme inline` mapping, base type scale (EN/TH), motion tokens, `.nw` keep-span, `html.js` reveal gating, reduced-motion + reduced-transparency blocks | P0 (+ small additions per phase) |
| `src/lib/theme.ts` | `TOKENS` (single source mirrored by globals.css), `ThemePref`, `THEME_STORAGE_KEY`, `THEME_PREPAINT_SCRIPT`, `readThemePref`, `writeThemePref` | P0 |
| `src/components/ThemeToggle.tsx` | Auto/Light/Dark segmented control (client) | P0 |
| `src/lib/thai.ts` · `src/components/ThaiText.tsx` | Keep-runs for Thai display text | P0 |
| `src/components/icons.tsx` | `Icon` from the prototype's inlined Phosphor subset | P0 |
| `src/components/sketches.tsx` | `Sketch` inline SVGs (By day, Talatify rings, Tripedia five→one) | P0 |
| `src/lib/models.ts` · `src/lib/notion-mappers.ts` · `src/lib/notion.ts` · `src/lib/content.ts` · `src/content/fixtures/*.json` | Content model additions per phase | P1, P3, P4 |
| `src/lib/format.ts` | `slugKey(s)` (added in P1 if absent) | P1 |
| `src/lib/sheet-url.ts` | `projectKey`, `sheetHash`, `parseSheetHash` | P2 |
| `src/components/SiteNav.tsx` (+ `site-nav.css`) | Capsule glass nav, active pill, phone menu, thumb bar | P1 |
| `src/components/sections/HeroTour.tsx` · `src/components/HeroTourStage.tsx` | Hero copy + tour stage (client) | P1 |
| `src/components/sections/Signature.tsx` · `src/components/SignatureScene.tsx` | 2022 → 2026 scene (client scrub + fallbacks) | P2 |
| `src/components/sections/ProjectsIndex.tsx` · `src/components/ProjectSheet.tsx` | Index + `<dialog>` sheet | P2 |
| `src/components/sections/CareerBand.tsx` · `src/components/CareerDetent.tsx` | Career rail/pills/panel/toolbox | P3 |
| `src/components/sections/ByDay.tsx` | Prologue, six chapters, closing line | P3 |
| `src/components/sections/FaqBand.tsx` | FAQ with Expand all + deep links | P4 |
| `src/components/sections/CloseBand.tsx` · `src/components/SiteFooter.tsx` | Close CTA, open question, footer (theme + language) | P4 |
| `src/components/palette/CommandPalette.tsx` · `src/lib/palette-index.ts` · `src/lib/ask.ts` | ⌘K + Ask Preview (lazy client) | P4 |
| `scripts/qa-matrix.mjs` | 16-combination Playwright QA (run with `npx`) | P5 |

Removed by the end: `HeroMonument`, `PointerFx`, `TiltCard`, `SpotlightList`, `MaskedHeading` (if unused), `Hero`, `TourBand`, `AboutBand`, `CraftBand`, `WorkDeck`, `CvBand`, `SkillsBand`, `QuestionsBand`, `ContactBand` (+ their tests and CSS), `HEX`/`rgbFloat`/`PARTICLE_COLORS`, the legacy token remap, Space Grotesk. `ClientsBand` stays in code, unrendered. `ProjectTour`/`ProjectFrame` are reworked or replaced in P1 (P1 decides, and deletes what it replaces).

## Contracts (names every phase must use exactly)

### C1 · Theme variables (P0)

Raw variables, defined for `:root` (light), `[data-theme="dark"]`, and `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }`. Values are the spec §5.1 table and the prototype's `:root` block.

`--canvas --mist --card --ink-1 --ink-2 --ink-3 --kram --kram-hover --on-kram --link --focus --select --line --spine --out-hover --w-aje --w-gonai --w-site --gonai --e1 --e2 --e3 --glass-nav --glass-pill --glass-ctl --glass-rim`

Tailwind (`@theme inline`): `--color-canvas: var(--canvas)` and likewise `mist card ink-1 ink-2 ink-3 kram kram-hover on-kram link focus line wash-aje(→--w-aje) wash-gonai wash-site gonai` → utilities `bg-canvas`, `text-ink-2`, `bg-kram`, `border-line`, `bg-wash-gonai`, …

Motion: `--ease-drift: cubic-bezier(.28,.11,.32,1)` `--ease-glide: cubic-bezier(.4,0,.6,1)` `--ease-settle: cubic-bezier(.32,.72,0,1)` `--ease-exit: cubic-bezier(.4,0,1,1)` `--ease-tick: cubic-bezier(.34,1.56,.64,1)` `--dur-ui: 320ms` `--dur-tap: 120ms`.

P0 repoints the old names so every existing component renders light until its phase replaces it: `dark→canvas`, `deep→mist`, `light→canvas`, `peri→kram`, `peri-deep→link`, `on-dark→ink-1`, `on-dark-soft→ink-2`, `on-dark-faint→line`, `on-dark-mid→ink-3`, `on-light→ink-1`, `on-light-soft→ink-2`, `on-light-faint→line`, legacy `paper→canvas`, `ink→ink-1`, `soft→ink-2`, `line→line`, `card→card`. P5 deletes them once `grep` shows zero usages.

### C2 · Theme API — `src/lib/theme.ts` (P0)

```ts
export type ThemePref = 'auto' | 'light' | 'dark';
export const THEME_STORAGE_KEY = 'klao-theme';
export type RawToken = 'canvas' | 'mist' | 'card' | 'ink-1' | 'ink-2' | 'ink-3' | 'kram' | 'kram-hover' | 'on-kram' | 'link' | 'focus' | 'line' | 'w-aje' | 'w-gonai' | 'w-site' | 'gonai';
export const TOKENS: { light: Record<RawToken, string>; dark: Record<RawToken, string> };
export const THEME_PREPAINT_SCRIPT: string; // IIFE for <head>: adds class `js` to <html>; sets data-theme when stored pref is light|dark; try/catch around storage
export function readThemePref(): ThemePref;          // 'auto' when storage is missing/throws/invalid
export function writeThemePref(pref: ThemePref): void; // updates <html data-theme> (removed for auto) + storage (try/catch)
```

### C3 · Thai keep-runs — `src/lib/thai.ts`, `src/components/ThaiText.tsx` (P0)

```ts
export const THAI_RE: RegExp;                 // /[฀-๿]/
export const THAI_KEEP: readonly string[];    // the prototype's KEEP array, verbatim
export interface Run { text: string; keep: boolean }
export function keepRuns(text: string): Run[]; // keep-list words, Thai dates (DATERE), number+unit (UNITRE) become keep runs; '|' splits into separate runs and is removed; non-Thai text returns [{ text, keep: false }]
```
`<ThaiText text={string} />` renders keep runs as `<span className="nw">` (`.nw { display: inline-block; white-space: nowrap }`), other runs as text.

### C4 · Icons and sketches (P0)

`<Icon name={IconName} className?={string} />` — `IconName` is the union of keys in the prototype's `IC` object (Phosphor, 256×256 viewBox, `fill="currentColor"`, `aria-hidden`). `<Sketch name={SketchName} />` — `SketchName` from the prototype's `SK` array plus `'rings'` (Talatify) and `'five'` (Tripedia).

### C5 · Content model (P1, P3, P4) — `src/lib/models.ts`

```ts
// P1
export type ProjectStatusKey = 'live' | 'proto' | 'pitched' | 'finalist';
export type ProjectMedia = 'img' | 'win' | 'notion' | 'rings' | 'five';
export type ProjectWash = 'aje' | 'gonai' | 'site' | 'none';
// Project gains:
statusKey: ProjectStatusKey | null; status: Localized | null; kicker: Localized | null;
media: ProjectMedia;              // default: imageSrc ? 'img' : 'win'
wash: ProjectWash;                // default 'none'
tour: boolean; tourOrder: number | null;
lineageOf: string | null;         // Project.id of the earlier idea (GoNai → Tripedia)
alt: Localized | null;
outcomes: { en: string[]; th: string[] }; // OutcomeEN/TH split on newlines (th falls back to en); `outcome` stays for existing pages
// P3
export interface CareerFigure { value: string; label: Localized; note: Localized | null }
// CareerEntry gains:
key: string;                      // slugKey(company) — FAQ deep links use `career:<key>`
start: string | null; end: string | null; // 'YYYY-MM'; end null = now
figure: CareerFigure | null;
export interface StoryChapter { id: string; title: Localized; body: Localized; rule: Localized; icon: string; sketch: string; order: number }
// Profile gains: prologue: Localized | null; closingLine: Localized | null;
// P4
export interface FaqLink { label: Localized; target: string } // 'work' | 'career:<key>' | 'toolbox' | 'contact' | 'work/<projectKey>' | https URL
export interface FaqItem { id: string; question: Localized; answer: Localized; links: FaqLink[]; order: number }
// Profile gains: basedIn: Localized | null; workingIn: string | null;
```
Notion properties per spec §7 (Projects: `StatusKey StatusEN StatusTH KickerEN KickerTH Media Wash Tour TourOrder LineageOf AltEN AltTH`; Career: `StartDate EndDate FigureValue FigureLabelEN FigureLabelTH FigureNoteEN FigureNoteTH`; Story DB: `TitleEN TitleTH BodyEN BodyTH RuleEN RuleTH Icon Sketch Order Published`; FAQ DB: `QuestionEN QuestionTH AnswerEN AnswerTH Links Order Published` with `Links` lines `LabelEN|LabelTH|target`; Profile: `PrologueEN PrologueTH ClosingLineEN ClosingLineTH BasedInEN BasedInTH WorkingIn`).
Getters: `getStory(): Promise<StoryChapter[]>` (P3), `getFaq(): Promise<FaqItem[]>` (P4), both sorted by `order`, and both return **fixtures when `NOTION_DB_STORY` / `NOTION_DB_FAQ` is unset** even if `NOTION_TOKEN` is set (unlike Questions, so the page never goes empty mid-migration). Fixtures `story.json`, `faq.json` carry the prototype copy.

### C6 · Sheet URL — `src/lib/sheet-url.ts` (P2)

```ts
export function projectKey(p: Pick<Project, 'slug' | 'name'>): string; // p.slug ?? slugKey(p.name)
export function sheetHash(key: string): string;                        // '#work/' + key
export function parseSheetHash(hash: string): string | null;           // /^#work\/([a-z0-9-]+)$/ else null
```

### C7 · Section ids, components and page order (final)

`#top` + `#tour` HeroTour → `#signature` Signature → `#work` ProjectsIndex → `#career` CareerBand (toolbox anchor `#toolbox` inside) → `#story` ByDay → `#faq` FaqBand → `#contact` CloseBand; SiteNav and SiteFooter in the layout. `next.config.ts` redirect `/:locale/career` → `/:locale#career` (P3). Nav links: Projects `#work`, Career `#career`, How I work `#story`, FAQ `#faq`, Contact `#contact`.

### C8 · Cross-island events (P1 → P4)

The nav ⌘K button and the FAQ "ask Klao" link dispatch `window.dispatchEvent(new CustomEvent('klao:palette', { detail: { query?: string } }))`; P4's palette listens. Until P4 lands, the button is rendered but the event has no listener (harmless). Career deep links dispatch `klao:career` with `{ detail: { key } }`; P3's CareerDetent listens.

### C9 · Shared CSS classes (defined in `globals.css` by P0; used by P1–P4)

Type scale (values = spec §5.2, EN and `:lang(th)` variants, phone ≤ 734 px): `.t-hero` (h1) · `.t-h2` (section headline) · `.t-title` (28/32 chapter & sheet titles) · `.t-panel` (32/36 career panel title) · `.t-faq` (FAQ question) · `.t-eyebrow` · `.t-lead` · `.t-body` · `.t-cap` · `.t-legal` · `.t-stat` (48/48 numerals, tabular).
Layout: `.wrap` (text column 980 px, phone gutter 20 px, 16 px under 360 px) · `.wrap-wide` (1040 px) · `.section` (desktop 144 px top, phone 96 px) · `.band` (mist band, 128 px top/bottom, 144 px margin above; phone 96/96).
Controls: `.btn` + `.btn-fill` (kram) / `.btn-out` (outline) — pill, 44 px, 17 px, weight 400 · `.pill` (28 px chip) · `.glass` (nav/pill glass incl. solid fallback) · `.tile` (r28, mist, no shadow) · `.win` (screenshot window r14 + `--e2`).
Motion: `.rv` reveal (fade-rise once at 85 % viewport; only active under `html.js` and `prefers-reduced-motion: no-preference`; toggled by adding `.in`) — the observer lives in `src/components/motion/Reveal.tsx` (P0 reworks the existing one to this class contract).
Thai: `.nw` keep-span (C3).

## Reconciliation (26 Sep 2026 — decisions taken while merging the phase plans)

These override anything in a phase plan that disagrees.

| # | Topic | Decision |
|---|---|---|
| R1 | `src/lib/deep-link.ts` | P1 Task 1 creates it (`PALETTE_EVENT`, `openPalette`). P4 Task 6 **replaces** the file with its superset (same two exports, same signature and detail shape) and adds `CAREER_EVENT` (re-exported from P3's `src/lib/career.ts`), `followTarget`, `goToTarget`. |
| R2 | Career keys | `key = slugKey(company)` — e.g. `a-bun-dance`, not the prototype's `abundance`. FAQ fixtures and deep links use the slug form (P3 lookup also accepts the joined form and a unique prefix). |
| R3 | Nav breakpoint | The nav folds into Menu at **≤ 899 px** (prototype behaviour). Other layout breakpoints stay 734 / 1068. |
| R4 | Single-language strings | `Profile.workingIn` and `CareerFigure.value` stay one string for both languages ("TH / EN", "THB 1.1M"). Known deviation from the prototype's Thai ("ไทย / อังกฤษ", "1.1 ล้านบาท"); can become `Localized` later without breaking Notion. |
| R5 | Copy that lives in code, not Notion | Ask Preview's canned set (`src/lib/ask.ts`), the footer legal line, the résumé meta line and other UI chrome live in `src/lib/dictionary.ts` / `ask.ts`. The FAQ answers Ask draws on are in Notion. Deviation from spec §7, recorded here. |
| R6 | Toolbox grouping | Stack = curated list, Methods = skills with tier `top`, Languages = dictionary. The prototype's "Learning now" and "Certified" cells are dropped. |
| R7 | Extra tokens | P0 adds the prototype's `--raised`, `--e4`, `--ctl`, `--curtain`, `--shot-dim` (light + dark) to C1. |
| R8 | Export shapes | `Icon` (named) + `IconName` · `ThaiText` (default) · `Sketch` (named) + `SketchName` + `SKETCH_NAMES` · `Reveal` (existing shape, P0 states it) · `ThemeToggle` (default, props `{ locale }`) · P0's temporary footer mount is marked `{/* P0-TEMP-THEME-TOGGLE */}` for P4 to remove. P0 lists any difference; its list wins. |
| R9 | Hero | The line under the headline renders `Profile.now`. No scroll-linked zoom in the hero (Signature stays the only scroll-linked animation). |
| R10 | Sheet title | 40/44 as in the prototype (not `.t-title`). |
| R11 | Signature tests | jsdom answers `CSS.supports('animation-timeline: view()')` with true, so tests stub `CSS` to exercise the fallback. Firefox is only simulated in Chrome — real Firefox is checked at the P5 preview gate. |
| R12 | Ship order | Unpublish the AISecretary and DailyBrief Notion rows **just before the merge** (with Klao's OK). After the merge the new index reads Notion, so rows left published would appear on the new page. |
| R13 | Preview QA | Vercel previews sit behind Vercel login and the Vercel connector returns 403, so P5's preview QA needs a share link (or Klao logged in) — ask at gate (a). |
| R14 | Résumé | Source is `~/Downloads/Suwichak Jarunopratamp - Resume 2026 (ATS).docx`; it still says "Met the store's THB 1.1M monthly sales target…". P5 gate (e) stops for Klao's wording before rebuilding the PDF. |
| R15 | Length budget | P5's QA enforces ≤ 8.6 (desktop) / ≤ 12 (phone) for every combination incl. Thai and reduced motion; if a Thai or reduced-motion run is over, report it to Klao rather than cutting spacing. |
| R16 | Share cards | `design/og/og-en.html` / `og-th.html` still listed AISecretary and DailyBrief → P5 Task 12b swaps in Aje and klao-site and regenerates `public/og/*.png`. |
| R17 | Fonts | **No `next/font`.** P0 self-hosts a Thai-only Anuphan subset (`public/fonts/anuphan-thai.woff2`, OFL, with `OFL.txt`) via `@font-face` + preload; `tests/setup.ts` is deleted and `vitest.config.ts` updated. P5 Task 3(d) is a no-op. Spec §5.2 amended. |
| R18 | Theme sync | `writeThemePref` dispatches `klao:theme`; every `ThemeToggle` listens, so the footer, phone menu and ⌘K toggles stay in step (adds to C8). |
| R19 | `.seg` | Defined once by P0 in `globals.css`. P4 must not redefine `.seg` in `site-footer.css` — drop those rules when executing P4 Task 10. P1's namespaced `.lt-seg` stays. `.glass.glass-pill` exists for the tour pill and signature captions. |
| R20 | Temporary toggle | P0 mounts it in `SiteFooter.tsx` marked `{/* P0-TEMP-THEME-TOGGLE */}`; P4's footer rewrite removes it (P4 plan corrected). |
| R21 | Spec vs prototype values | The reviewed prototype wins: reveal 16 px (24 px big), 600 ms rise / 800 ms fade, drift; phone eyebrow 17/21 (TH 23); Thai `.t-panel` 28/38 (phone 24/34) derived from "one step smaller". Spec §5.2/§5.5 amended; P0 plan updated. |
| R22 | Signature + lineage copy | The idea→app pair copy (`sigSub`, `sigCardKicker`, `sigCardLabel`, `lineage*`, `SIG_STAT`, `SIG_YEARS`) lives in `dictionary.ts` / `signature.ts`, not Notion — UI chrome like R5 (P2 preflight C-10). |
| R23 | Notion docs timing | `docs/NOTION_SETUP.md` for the new Story/FAQ databases and fields is written in P5 (spec §9 asked for same-commit docs); safe because every new DB/field falls back to fixtures while unset (P4 preflight C12). |
| R24 | Removal phases | P0 removes HeroMonument, PointerFx, HEX/rgbFloat/PARTICLE_COLORS and the two retired projects; TiltCard goes in P2, SpotlightList in P3, MaskedHeading and the legacy remap in P5 (spec §12 P0 row narrowed; P0 preflight A7). |
| R25 | Thai display text | C3 gains `keepRuns(text, { display: true })` / `<ThaiText text display />`: each space-delimited Thai token is kept whole, as the reviewed prototype's `disp()`. Every `.t-hero/.t-h2/.t-title/.t-panel/.t-faq` heading passes `display`. No `Intl.Segmenter` (spec §5.2 amended; P0 preflight A1). |
| R26 | C2 update | `RawToken` also has `'raised' \| 'ctl' \| 'curtain'`; `theme.ts` also exports `THEME_EVENT = 'klao:theme'` and `isThemePref`; if storage throws, `readThemePref` returns the session's `<html data-theme>` (light/dark) else `'auto'` (P0 preflight A3). |
| R27 | Polish amendments | `docs/superpowers/plans/2026-09-26-white-edition-polish.md` rows A01–A10 (approved by Klao 26 Sep) extend the named phase tasks and win over phase text; reference demos in `design/white-edition/polish-lab/index.html`. Photo hero deferred. |
| R28 | Overflow clip | No page-wide `body { overflow-x: clip }` (removed in the P0 fix wave); a section that intentionally bleeds clips its own wrapper. P5 QA measures overflow per element (`getBoundingClientRect().right > clientWidth`), and its self-test fixture mirrors the real CSS. |
| R29 | Working in | `Profile.workingIn` becomes `Localized \| null` (amends C5 and R4). Notion has `WorkingInEN` + `WorkingInTH` with the same rules as `BasedInEN/TH`; the mapper still reads a bare `WorkingIn` (the old name) as the English value. The fixture reads "TH / EN" / "ไทย / อังกฤษ" (Klao decision 3, 28 Sep). The Profile property list grows to 8. From the P5 preflight refresh, ruling PR1 (P5 T18-d). |
