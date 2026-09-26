# White Edition — P1 Project model, Nav, Hero tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Project the White Edition fields, rebuild the nav as the floating glass capsule (with the phone menu and thumb bar), and replace the dark Hero + TourBand with HeroTour — hero copy plus a tour that plays once, Aje → GoNai → klao-site.

**Architecture:** Pure helpers first (`slugKey`, `mailtoHref`, `openPalette`, section hrefs, tour membership, a tour playback reducer), then the model/mapper/fixtures, then small client islands (LocaleToggle, NavMenu, ThumbBar, SiteNav, HeroTourStage) composed by server components (HeroTour, the home page). The tour keeps one JS clock (a remaining-time `setTimeout`) and drives CSS animations whose play-state follows a `data-hold` attribute; server HTML already shows the first frame and its subtitle.

**Tech Stack:** Next.js 15.5 App Router · React 19.2 · Tailwind CSS v4.3 (component CSS in `@layer components`) · Vitest 3 + Testing Library (jsdom per file) · Playwright via the npx cache for screenshots only.

**Spec:** docs/superpowers/specs/2026-09-25-white-edition-design.md · Master plan (contracts, global constraints): docs/superpowers/plans/2026-09-25-white-edition.md

## Global Constraints

Inherits every line of the master plan's Global Constraints. Phase-specific additions:

- CSS class namespaces: `sn-` (SiteNav, ThumbBar `sn-tbar`), `nm-` (NavMenu), `lt-` (LocaleToggle), `ht-` (HeroTour, HeroTourStage). Never define a bare generic class (`.pill`, `.card`, `.stage`, `.slide`, `.tile`): C9 owns the shared names.
- A positioned glass element is written with two classes (`.sn-cap.glass`, `.ht-pill.glass`, `.sn-tbar.glass`), so it wins over whatever C9's `.glass` sets, whatever the stylesheet order.
- The capsule nav is `position: fixed`, not sticky: `/projects`, `/writing`, `/career`, `/work/[slug]` already clear a fixed header with `pt-28`, so they need no change. The home hero carries the capsule's height in its own top padding (90 px desktop; 88 px + safe area on phone).
- Breakpoints follow the prototype: section links, ⌘K and Contact fold into **Menu** at ≤ 899 px; the compact capsule and the thumb bar appear at ≤ 734 px.
- The prototype's scroll-linked hero zoom (its "H4") is dropped: Signature (P2) stays the page's only scroll-linked animation. The active-pill width and the progress-dot width change instantly, because only `transform` and `opacity` animate.
- Tour timing: one JS timer with remaining-time bookkeeping, plus CSS animations paused through `.ht-tour[data-hold]`. No Web Animations API (jsdom has none, and tests drive fake timers).
- `|` never appears in **project** fixture copy (`ProjectCard` on `/projects` still prints it raw). It may appear in `Profile.headline`, which only `ThaiText` renders.
- The line under the hero headline is `Profile.now`: the prototype's "Senior BD at Actmedia · building AI tools nights & weekends" is the fixture's Now text word for word. `Profile.byline` is not rendered on the White Edition home page.
- In P1 the tour's subtitle links to `#work`. P2 changes it to the sheet hash (C6); see Contract gaps.
- New tests reuse `tests/helpers/*` (`project`, `profile`, `io`, `dialog`, `media`, `time`), which this phase creates.

## Review Focus

- **Master #1 · Pre-migration Notion (projects):** Task 2 adds the mapper test for a row that has only the old properties (every new field at its default, row never dropped, `media` = `img`/`win` from the screenshot). Task 4 adds the `tourProjects` fallback test: with no Tour ticks, the hero still tours every project that has a screenshot. Task 11 adds the test for no tourable projects: the hero renders without `#tour` and without an empty stage.
- **Master #4 · No JavaScript / before hydration:** Task 11 adds the server-HTML test for HeroTour. It checks the headline, both actions, and the first frame with its image (eager, `fetchpriority="high"`) and subtitle, with no inline `opacity:0` and no `data-top`. Task 9 adds the SiteNav server-HTML test (every link present). Task 12 adds the HomePage server-HTML test (`#top`/`#tour` before `#work`, no `#hero`).
- Exercised, not owned: master #5 (Thai edge text). Task 11 renders the Thai headline that contains `|` and asserts that no `|` leaks and that a keep-span is present.

---

## Files

| Path | What P1 does |
|---|---|
| `src/lib/format.ts` | + `slugKey`, `MAIL_SUBJECT`, `mailtoHref` (Task 1) |
| `src/lib/deep-link.ts` | new: `PALETTE_EVENT`, `openPalette` (C8) (Task 1) |
| `src/lib/models.ts` | + C5 P1 types, `PROJECT_STATUS_KEYS/MEDIA/WASHES`, Project fields (Task 2) |
| `src/lib/notion-mappers.ts` | `mapProject` reads the new properties with defaults (Task 2) |
| `src/content/fixtures/projects.json` | rewritten: 24-Sep lineup (Task 3) |
| `public/images/aje.jpg`, `gonai.jpg` | replaced by the prototype's crops (no scrollbar, 1580×900, ≤ 250 KB) (Task 3) |
| `src/lib/image-alt.ts` | GoNai sentence matches the new capture (Task 3) |
| `src/lib/project-tour.ts` | new membership rule + `tourKicker`, `tourDwellMs`, `toTourSlides`, types (Task 4); `TOUR_MS` removed (Task 12) |
| `src/lib/tour-player.ts` | new: pure playback reducer (Task 5) |
| `src/components/LocaleToggle.tsx` + `locale-toggle.css` | rewritten as the EN/ไทย segmented control (Task 6) |
| `src/lib/nav.ts` | new: `NAV_SECTIONS`, `NavSection`, `NAV_LABEL_KEY`, `sectionHref` (Task 7) |
| `src/components/NavMenu.tsx` + `nav-menu.css` | new: Menu button + phone menu dialog (Task 7) |
| `src/components/ThumbBar.tsx` + `thumb-bar.css` | new: phone thumb bar (Task 8) |
| `src/components/SiteNav.tsx` + `site-nav.css` | rewritten: capsule (Task 9) |
| `src/app/globals.css` | old nav-on-light rules out (Task 9); old `#hero` rules out (Task 12) |
| `src/components/HeroTourStage.tsx` + `hero-tour-stage.css` | new client tour stage (Task 10) |
| `src/components/sections/HeroTour.tsx` + `hero-tour.css` | new server hero section (Task 11) |
| `src/app/[locale]/page.tsx` | HeroTour replaces Hero + TourBand (Task 12) |
| `src/content/fixtures/profile.json` | Actmedia spelling, Thai headline break mark (Task 12) |
| `src/lib/dictionary.ts` | P1 keys (Tasks 7–11); `tourLabel`, `tourStill` removed (Task 12) |
| **Delete** (Task 12) | `src/components/sections/Hero.tsx`, `src/components/sections/TourBand.tsx`, `src/components/ProjectTour.tsx`, `src/components/project-tour.css`, `tests/hero.test.tsx`, `tests/tour-band.test.tsx`, `tests/project-tour.test.tsx` |
| **Kept on purpose** | `MaskedHeading` (still imported by AboutBand, CraftBand, WorkDeck, SkillsBand, ClientsBand, ContactBand; P5 removes it) · `ProjectFrame` (ProjectCard and WorkDeck use it) |
| Tests (new) | `format`, `events`, `projects-fixture`, `tour-player`, `locale-toggle`, `nav`, `nav-menu`, `thumb-bar`, `hero-tour-stage`, `hero-tour`; helpers `tests/helpers/{project,profile,io,dialog,media,time}.ts` |
| Tests (changed) | `mappers`, `content`, `project-tour-helpers` (rewrite), `site-nav` (rewrite), `dictionary`, `smoke`, and the `P1_DEFAULTS` spread in `project-card`, `project-frame`, `sitemap-posts`, `work-deck`, `work-story` |

## Screenshot script (used by Tasks 9, 12, 13)

Screenshots never go into the repo. When a task says "run the screenshot script", create `/tmp/klao-qa/p1-shots.mjs` if it is missing, using exactly this content:

```js
// /tmp/klao-qa/p1-shots.mjs — White Edition P1 screenshots. Outside the repo on purpose.
// Usage: node /tmp/klao-qa/p1-shots.mjs [nav|menu|hero|all]   (needs `npm run dev` on :3000)
import { chromium } from '/Users/suvichakjarunopratamp/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:3000';
const OUT = '/tmp/klao-qa';
const mode = process.argv[2] ?? 'all';
mkdirSync(OUT, { recursive: true });

async function waitForServer() {
  for (let i = 0; i < 90; i++) {
    try {
      const r = await fetch(`${BASE}/en`);
      if (r.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`${BASE}/en did not answer within 90 s — is \`npm run dev\` running?`);
}

const VIEWPORTS = [
  { name: 'desk', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
];
const LOCALES = ['en', 'th'];
const THEMES = ['light', 'dark'];
// Tour clock (prototype TOUR): Aje 6.0 s · GoNai 5.5 s · klao-site 7.0 s; Thai ×1.1.
const MID_MS = { en: 7000, th: 7700 }; // inside the GoNai frame
const END_MS = { en: 19500, th: 21300 }; // after the last frame: closing subtitle

const problems = [];
async function overflow(page, label) {
  const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth }));
  if (m.sw > m.w) problems.push(`${label}: horizontal overflow ${m.sw} > ${m.w}`);
}

await waitForServer();
const browser = await chromium.launch({ channel: 'chrome' });
for (const vp of VIEWPORTS) {
  for (const locale of LOCALES) {
    for (const theme of THEMES) {
      const tag = `${vp.name}-${locale}-${theme}`;
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, colorScheme: theme });
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(`${BASE}/${locale}`, { waitUntil: 'load' });
      await page.waitForTimeout(400);
      if (['all', 'hero', 'nav'].includes(mode)) {
        await page.screenshot({ path: `${OUT}/p1-${tag}-0s.png` });
        await overflow(page, tag);
      }
      if (['all', 'hero'].includes(mode)) {
        await page.waitForTimeout(MID_MS[locale]);
        await page.screenshot({ path: `${OUT}/p1-${tag}-mid.png` });
        await page.waitForTimeout(END_MS[locale] - MID_MS[locale]);
        await page.screenshot({ path: `${OUT}/p1-${tag}-end.png` });
      }
      if (['all', 'nav'].includes(mode) && vp.name === 'desk') {
        await page.evaluate(() => document.getElementById('work')?.scrollIntoView());
        await page.waitForTimeout(700);
        await page.screenshot({ path: `${OUT}/p1-${tag}-nav-active.png` });
      }
      if (['all', 'menu'].includes(mode) && vp.name === 'phone') {
        await page.evaluate(() => scrollTo(0, 1400));
        await page.waitForTimeout(700);
        await page.screenshot({ path: `${OUT}/p1-${tag}-thumbbar.png` });
        await page.getByRole('button', { name: locale === 'th' ? 'เมนู' : 'Menu' }).click();
        await page.waitForTimeout(700);
        await page.screenshot({ path: `${OUT}/p1-${tag}-menu.png` });
      }
      if (errors.length) problems.push(`${tag}: console errors: ${errors.join(' | ')}`);
      await ctx.close();
    }
  }
}
if (['all', 'hero'].includes(mode)) {
  // Reduced motion: nothing autoplays, ‹ › paddles instead of Pause.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en`, { waitUntil: 'load' });
  await page.waitForTimeout(8000);
  await page.screenshot({ path: `${OUT}/p1-desk-en-light-reduced.png` });
  await ctx.close();
}
await browser.close();
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no horizontal overflow, no console errors');
process.exitCode = problems.length ? 1 : 0;
```

To run it: start `npm run dev` as a background process from the repo root, then `node /tmp/klao-qa/p1-shots.mjs <mode>` (allow about 4 minutes for `all`). Stop the dev server afterwards. Open the PNGs with the Read tool to review them.

---

### Task 1: Shared helpers — `slugKey`, `mailtoHref`, `openPalette`

**Files:**
- Modify: `src/lib/format.ts` (append after `formatDate`, currently lines 3–15)
- Create: `src/lib/deep-link.ts`
- Test: `tests/format.test.ts` (new), `tests/palette-event.test.ts` (new)

**Interfaces:**
- Consumes: nothing.
- Produces: `slugKey(s: string): string` (checked: no slug helper existed in `src/`) · `MAIL_SUBJECT = 'Hello from klao-site'` · `mailtoHref(email: string): string` · in `src/lib/deep-link.ts` (the module P4's plan extends): `PALETTE_EVENT = 'klao:palette'` · `openPalette(query?: string): void` (C8), whose detail is `{}` or `{ query }`.

- [ ] **Step 1: Write the failing tests**

`tests/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MAIL_SUBJECT, mailtoHref, slugKey } from '@/lib/format';

describe('slugKey', () => {
  it('lower-cases a project or company name into a URL-safe key', () => {
    expect(slugKey('GoNai')).toBe('gonai');
    expect(slugKey('klao-site')).toBe('klao-site');
    expect(slugKey('Actmedia')).toBe('actmedia');
  });

  it('turns every other run of characters into one hyphen and trims hyphens at both ends', () => {
    expect(slugKey('MMB Technology Co., Ltd.')).toBe('mmb-technology-co-ltd');
    expect(slugKey('A Bun Dance (Craft Burger)')).toBe('a-bun-dance-craft-burger');
    expect(slugKey('  VELA Central World  ')).toBe('vela-central-world');
  });

  it('keeps the base letter of an accented name instead of dropping it', () => {
    expect(slugKey('Résumé Café')).toBe('resume-cafe');
  });

  it('only ever returns the [a-z0-9-] shape that parseSheetHash (C6) accepts', () => {
    for (const s of ['Talatify', 'Tripedia', 'Aje', 'GoNai', 'klao-site', 'Casetify', '100% Real!!']) {
      expect(slugKey(s)).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it('keeps the Latin part of a mixed Thai + English name', () => {
    expect(slugKey('GoNai ไปไหน')).toBe('gonai');
  });

  it("returns '' when nothing slug-safe is left (Thai-only, empty, punctuation) and never throws", () => {
    expect(slugKey('ตลาดสด')).toBe('');
    expect(slugKey('')).toBe('');
    expect(slugKey('---')).toBe('');
  });
});

describe('mailtoHref', () => {
  it('opens a draft with the site subject line, URL-encoded', () => {
    expect(MAIL_SUBJECT).toBe('Hello from klao-site');
    expect(mailtoHref('klao@example.com')).toBe('mailto:klao@example.com?subject=Hello%20from%20klao-site');
  });
});
```

`tests/palette-event.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { PALETTE_EVENT, openPalette } from '@/lib/deep-link';

describe('openPalette (C8)', () => {
  const seen: unknown[] = [];
  const listener = (e: Event) => seen.push((e as CustomEvent).detail);

  afterEach(() => {
    window.removeEventListener(PALETTE_EVENT, listener);
    seen.length = 0;
  });

  it("dispatches 'klao:palette' on window with an empty detail when there is no query", () => {
    window.addEventListener(PALETTE_EVENT, listener);
    openPalette();
    expect(PALETTE_EVENT).toBe('klao:palette');
    expect(seen).toEqual([{}]);
  });

  it('carries the query when there is one', () => {
    window.addEventListener(PALETTE_EVENT, listener);
    openPalette('talatify');
    expect(seen).toEqual([{ query: 'talatify' }]);
  });

  it('is harmless while nothing listens (the palette lands in P4)', () => {
    expect(() => openPalette()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/format.test.ts tests/palette-event.test.ts`
Expected: FAIL. `format.test.ts` fails with `slugKey is not a function` (or the import has no `MAIL_SUBJECT` export), and `palette-event.test.ts` fails with `Failed to resolve import "@/lib/deep-link"`.

- [ ] **Step 3: Implement**

Append to `src/lib/format.ts`, below `formatDate`:

```ts
/**
 * A URL- and id-safe key for a display name (White Edition contracts C5/C6):
 * a project's sheet hash (`#work/<key>`, used when Notion has no Slug) and a
 * career entry's deep link (`career:<key>`). No equivalent existed before P1
 * (checked: no slugify/toSlug helper anywhere in src/).
 *
 * NFKD plus dropping the combining marks keeps the base letter of an accented
 * name ("Café" -> "cafe"). Every other run of characters outside [a-z0-9]
 * becomes one hyphen, trimmed at both ends. Thai (or any non-Latin) text has no
 * slug-safe characters and yields '' — callers treat '' as "no key", which is
 * why a Notion Slug wins over this whenever one is set (C6).
 */
export function slugKey(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** The subject every "Start a conversation" link pre-fills (prototype MAILTO),
 *  so mail that came from the site is recognisable in the inbox. */
export const MAIL_SUBJECT = 'Hello from klao-site';

/** One mailto for every "Start a conversation": hero, phone menu, thumb bar,
 *  and (P4) the close section. */
export function mailtoHref(email: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(MAIL_SUBJECT)}`;
}
```

Create `src/lib/deep-link.ts`:

```ts
/**
 * Window-level events between client islands that never import each other
 * (contract C8). The nav's ⌘K button, the phone menu's search row and P4's FAQ
 * "ask Klao" link all ask the palette to open through one named event; the
 * palette (P4) is the only listener. Until P4 lands nothing listens, and the
 * dispatch is harmless.
 *
 * P1 starts this module with the palette half only. P4's plan grows the same
 * file (CAREER_EVENT, followTarget, goToTarget) with these two exports
 * unchanged, so SiteNav and NavMenu keep importing from here.
 */
export const PALETTE_EVENT = 'klao:palette';

interface PaletteDetail {
  query?: string;
}

export function openPalette(query?: string): void {
  const detail: PaletteDetail = query ? { query } : {};
  window.dispatchEvent(new CustomEvent<PaletteDetail>(PALETTE_EVENT, { detail }));
}
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/format.test.ts tests/palette-event.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/deep-link.ts tests/format.test.ts tests/palette-event.test.ts
git commit -m "feat(format): slugKey, mailtoHref and the klao:palette event

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 2: Project model and mapper (C5, P1 block)

**Files:**
- Modify: `src/lib/models.ts` (after `ProjectType`, currently line 44; `Project` interface, currently lines 46–66)
- Modify: `src/lib/notion-mappers.ts` (imports line 1–2; helper block lines 6–28; `mapProject` lines 38–60)
- Create: `tests/helpers/project.ts`
- Test: `tests/mappers.test.ts` (append a describe block)
- Modify (type-only, add `...P1_DEFAULTS`): `tests/project-card.test.tsx`, `tests/project-frame.test.tsx`, `tests/sitemap-posts.test.ts`, `tests/work-deck.test.tsx`, `tests/work-story.test.ts`, `tests/project-tour.test.tsx`, `tests/tour-band.test.tsx`, `tests/project-tour-helpers.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces (models.ts): `type ProjectStatusKey = 'live' | 'proto' | 'pitched' | 'finalist'` · `type ProjectMedia = 'img' | 'win' | 'notion' | 'rings' | 'five'` · `type ProjectWash = 'aje' | 'gonai' | 'site' | 'none'` · `PROJECT_STATUS_KEYS`, `PROJECT_MEDIA`, `PROJECT_WASHES` (readonly arrays, the "valid values" idiom of `SKILL_TIERS`) · `Project` gains `statusKey, status, kicker, media, wash, tour, tourOrder, lineageOf, alt, outcomes` exactly as C5.
- Produces (tests/helpers/project.ts): `P1_DEFAULTS: Pick<Project, …the ten new fields…>` · `makeProject(overrides: Partial<Project> & Pick<Project, 'id' | 'name'>): Project`.

- [ ] **Step 1: Write the failing test**

Create `tests/helpers/project.ts`:

```ts
import type { Project } from '@/lib/models';

type P1Fields = 'statusKey' | 'status' | 'kicker' | 'media' | 'wash' | 'tour' | 'tourOrder' | 'lineageOf' | 'alt' | 'outcomes';

/**
 * The White Edition (C5) Project fields at the values a pre-migration Notion
 * row maps to (media 'img' = "has a screenshot"). Older tests spread this into
 * their Project literals so they keep type-checking without restating fields
 * they don't exercise. Later phases extend it when Project grows again.
 */
export const P1_DEFAULTS: Pick<Project, P1Fields> = {
  statusKey: null,
  status: null,
  kicker: null,
  media: 'img',
  wash: 'none',
  tour: false,
  tourOrder: null,
  lineageOf: null,
  alt: null,
  outcomes: { en: [], th: [] },
};

/** A complete Project for tests: a build with a screenshot, every field set. */
export function makeProject(overrides: Partial<Project> & Pick<Project, 'id' | 'name'>): Project {
  return {
    description: { en: `${overrides.name} in one line`, th: `${overrides.name} หนึ่งบรรทัด` },
    stack: [],
    liveUrl: null,
    repoUrl: null,
    imageSrc: `/api/img/page/${overrides.id}/Screenshot`,
    featured: true,
    order: 1,
    type: 'build',
    outcome: null,
    question: null,
    slug: null,
    ...P1_DEFAULTS,
    ...overrides,
  };
}
```

Append to `tests/mappers.test.ts` (after the existing `describe('mapProject', …)` block; `projectPage`, `rich`, `select` are already defined at the top of the file):

```ts
const numberProp = (n: number | null) => ({ number: n });
const checkboxProp = (b: boolean) => ({ checkbox: b });
const relationProp = (...ids: string[]) => ({ relation: ids.map((id) => ({ id })), has_more: false });

describe('mapProject — White Edition fields (C5)', () => {
  const fullRow = {
    id: 'gonai-id',
    properties: {
      ...projectPage.properties,
      StatusKey: select('live'),
      StatusEN: rich('Live · since Aug 2026'),
      StatusTH: rich('เปิดใช้งานแล้ว · ตั้งแต่ ส.ค. 2026'),
      KickerEN: rich('Build · Live'),
      KickerTH: rich('สร้างเอง · เปิดใช้งานแล้ว'),
      Media: select('win'),
      Wash: select('gonai'),
      Tour: checkboxProp(true),
      TourOrder: numberProp(2),
      LineageOf: relationProp('tripedia-id'),
      AltEN: rich('GoNai home screen.'),
      AltTH: rich('หน้าแรกของ GoNai'),
      OutcomeEN: rich('Live since Aug 2026\nNotion as the only CMS'),
      OutcomeTH: rich('ออนไลน์ตั้งแต่ ส.ค. 2026\nNotion เป็น CMS เดียว'),
    },
  };

  it('maps a full row', () => {
    expect(mapProject(fullRow)).toMatchObject({
      statusKey: 'live',
      status: { en: 'Live · since Aug 2026', th: 'เปิดใช้งานแล้ว · ตั้งแต่ ส.ค. 2026' },
      kicker: { en: 'Build · Live', th: 'สร้างเอง · เปิดใช้งานแล้ว' },
      media: 'win',
      wash: 'gonai',
      tour: true,
      tourOrder: 2,
      lineageOf: 'tripedia-id',
      alt: { en: 'GoNai home screen.', th: 'หน้าแรกของ GoNai' },
      outcomes: {
        en: ['Live since Aug 2026', 'Notion as the only CMS'],
        th: ['ออนไลน์ตั้งแต่ ส.ค. 2026', 'Notion เป็น CMS เดียว'],
      },
    });
  });

  it('keeps a pre-migration row (old properties only) on the page, every new field at its default (Review Focus #1)', () => {
    const p = mapProject(projectPage); // has a Screenshot, none of the new properties
    expect(p).not.toBeNull();
    expect(p).toMatchObject({
      statusKey: null,
      status: null,
      kicker: null,
      media: 'img',
      wash: 'none',
      tour: false,
      tourOrder: null,
      lineageOf: null,
      alt: null,
      outcomes: { en: [], th: [] },
    });
  });

  it("defaults media to 'win' on a pre-migration row without a screenshot", () => {
    const page = { ...projectPage, properties: { ...projectPage.properties, Screenshot: { files: [] } } };
    expect(mapProject(page)!.media).toBe('win');
  });

  it('falls back to the default for an unknown select option, never passing it through or dropping the row', () => {
    const page = {
      ...projectPage,
      properties: { ...projectPage.properties, StatusKey: select('shipped'), Media: select('video'), Wash: select('purple') },
    };
    const p = mapProject(page)!;
    expect(p.statusKey).toBeNull();
    expect(p.media).toBe('img');
    expect(p.wash).toBe('none');
  });

  it('takes the first related page as the lineage, and an empty relation as none', () => {
    const two = { ...projectPage, properties: { ...projectPage.properties, LineageOf: relationProp('first', 'second') } };
    expect(mapProject(two)!.lineageOf).toBe('first');
    const none = { ...projectPage, properties: { ...projectPage.properties, LineageOf: relationProp() } };
    expect(mapProject(none)!.lineageOf).toBeNull();
  });

  it('keeps TourOrder 0 as a real position and a blank number as null', () => {
    const zero = { ...projectPage, properties: { ...projectPage.properties, TourOrder: numberProp(0) } };
    expect(mapProject(zero)!.tourOrder).toBe(0);
    const blank = { ...projectPage, properties: { ...projectPage.properties, TourOrder: numberProp(null) } };
    expect(mapProject(blank)!.tourOrder).toBeNull();
  });

  it('splits outcomes one per line, skips blank lines, and falls back th -> en per list', () => {
    const page = {
      ...projectPage,
      properties: { ...projectPage.properties, OutcomeEN: rich('One\n\n  Two  \n'), OutcomeTH: rich('') },
    };
    expect(mapProject(page)!.outcomes).toEqual({ en: ['One', 'Two'], th: ['One', 'Two'] });
  });

  it('keeps the old single-string outcome for the pages that still read it', () => {
    expect(mapProject(fullRow)!.outcome).toEqual({
      en: 'Live since Aug 2026\nNotion as the only CMS',
      th: 'ออนไลน์ตั้งแต่ ส.ค. 2026\nNotion เป็น CMS เดียว',
    });
  });

  it('leaves status, kicker and alt null when only the Thai half is filled (EN is the gate, as for Question)', () => {
    const page = {
      ...projectPage,
      properties: { ...projectPage.properties, StatusTH: rich('ไทยอย่างเดียว'), KickerTH: rich('ไทย'), AltTH: rich('ไทย') },
    };
    const p = mapProject(page)!;
    expect(p.status).toBeNull();
    expect(p.kicker).toBeNull();
    expect(p.alt).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/mappers.test.ts`
Expected: FAIL. The new block fails, for example `expected { … } to match object { statusKey: 'live', … }`, because `mapProject` does not produce the new fields yet.

- [ ] **Step 3: Implement**

In `src/lib/models.ts`, insert after `export type ProjectType = 'business' | 'build';`:

```ts
// White Edition P1 (spec 2026-09-25 §7, contract C5). Each Notion select gets
// the same "valid values + one declaration" array SKILL_TIERS and
// QUESTION_STATUSES use, so notion-mappers.ts validates against exactly the
// list the type names — an unknown option falls back to the field's default.
export type ProjectStatusKey = 'live' | 'proto' | 'pitched' | 'finalist';
export const PROJECT_STATUS_KEYS: readonly ProjectStatusKey[] = ['live', 'proto', 'pitched', 'finalist'];

// What a project shows: a screenshot ('img'), a screenshot in a browser window
// ('win'), the Notion-row vignette ('notion', klao-site), or a line drawing
// ('rings' = Talatify's TAM/SAM/SOM, 'five' = Tripedia's five apps -> one).
export type ProjectMedia = 'img' | 'win' | 'notion' | 'rings' | 'five';
export const PROJECT_MEDIA: readonly ProjectMedia[] = ['img', 'win', 'notion', 'rings', 'five'];

// The tint behind a project's picture (tour stage, P2 sheet) — the only place
// project colour appears on the page (spec §3, 24 Sep).
export type ProjectWash = 'aje' | 'gonai' | 'site' | 'none';
export const PROJECT_WASHES: readonly ProjectWash[] = ['aje', 'gonai', 'site', 'none'];
```

In the `Project` interface, add after `slug: string | null;`:

```ts
  // White Edition P1 (C5). Every field below is additive: mapProject gives a
  // pre-migration Notion row (none of these properties yet) the default noted
  // here, so the live site keeps rendering while Klao adds the properties.
  statusKey: ProjectStatusKey | null; // StatusKey select; null = no status mark
  status: Localized | null; // StatusEN/TH, e.g. "Live · since Aug 2026"
  kicker: Localized | null; // KickerEN/TH, "<chapter> · <detail>", e.g. "Build · Working prototype"
  media: ProjectMedia; // Media select; default imageSrc ? 'img' : 'win'
  wash: ProjectWash; // Wash select; default 'none'
  tour: boolean; // Tour checkbox: plays in the hero tour
  tourOrder: number | null; // TourOrder; null sorts after every numbered project
  lineageOf: string | null; // LineageOf relation: Project.id of the earlier idea (GoNai -> Tripedia)
  alt: Localized | null; // AltEN/TH: what the picture shows; null falls back to image-alt.ts
  outcomes: { en: string[]; th: string[] }; // OutcomeEN/TH one per line (th falls back to en); `outcome` stays for the old pages
```

In `src/lib/notion-mappers.ts`, change the imports (lines 1–2) to:

```ts
import type { CareerEntry, ContentBlock, Localized, OpenQuestion, PostMeta, Profile, Project, QuestionStatus, RichSpan, Skill, SkillTier } from './models';
import { PROJECT_MEDIA, PROJECT_STATUS_KEYS, PROJECT_WASHES, QUESTION_STATUSES, SKILL_TIERS } from './models';
```

Inside the first `/* eslint-disable … */ … /* eslint-enable … */` helper block, add just before the `/* eslint-enable */` line (after `selectOf`):

```ts
// Number that may be blank: TourOrder distinguishes "not set" (null) from 0,
// unlike Order, whose blank has always meant 0.
const numOrNull = (prop: any): number | null => (typeof prop?.number === 'number' ? prop.number : null);
// Relation property: `{ relation: [{ id }], has_more }`. Only the first related
// page counts (a project has one earlier idea); an empty list is "none".
const relationFirst = (prop: any): string | null => {
  const first = (prop?.relation ?? [])[0];
  return typeof first?.id === 'string' && first.id ? first.id : null;
};
```

Below `const lines = …;` (line 28) add:

```ts
// EN is the gate, as for Question/Outcome: a Thai-only value maps to null.
const optLocalized = (en: string, th: string): Localized | null => (en ? localized(en, th) : null);
// A select value that must be one of `allowed`; anything else (missing, blank,
// an option added in Notion but not in code) is null, so the caller's default wins.
function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}
```

Replace the whole `mapProject` function with:

```ts
export function mapProject(page: NotionPage): Project | null {
  const name = text(page.properties.Name);
  if (!name) return skip('Projects', page, 'missing Name');
  const imageSrc = fileProxy(page, 'Screenshot');
  const outcomesEn = lines(text(page.properties.OutcomeEN));
  const outcomesTh = lines(text(page.properties.OutcomeTH));
  return {
    id: page.id,
    name,
    description: localized(text(page.properties.DescriptionEN), text(page.properties.DescriptionTH)),
    stack: multi(page.properties.Stack),
    liveUrl: urlOf(page.properties.LiveURL),
    repoUrl: urlOf(page.properties.RepoURL),
    imageSrc,
    featured: check(page.properties.Featured),
    order: num(page.properties.Order),
    type: selectOf(page.properties.Type) === 'Business' ? 'business' : 'build',
    outcome: text(page.properties.OutcomeEN)
      ? localized(text(page.properties.OutcomeEN), text(page.properties.OutcomeTH))
      : null,
    question: text(page.properties.QuestionEN)
      ? localized(text(page.properties.QuestionEN), text(page.properties.QuestionTH))
      : null,
    slug: text(page.properties.Slug) || null,
    // White Edition P1 (C5, spec §7). Each default below is what a Projects
    // database that has never heard of the property maps to (Review Focus #1).
    statusKey: oneOf(selectOf(page.properties.StatusKey), PROJECT_STATUS_KEYS),
    status: optLocalized(text(page.properties.StatusEN), text(page.properties.StatusTH)),
    kicker: optLocalized(text(page.properties.KickerEN), text(page.properties.KickerTH)),
    media: oneOf(selectOf(page.properties.Media), PROJECT_MEDIA) ?? (imageSrc ? 'img' : 'win'),
    wash: oneOf(selectOf(page.properties.Wash), PROJECT_WASHES) ?? 'none',
    tour: check(page.properties.Tour),
    tourOrder: numOrNull(page.properties.TourOrder),
    lineageOf: relationFirst(page.properties.LineageOf),
    alt: optLocalized(text(page.properties.AltEN), text(page.properties.AltTH)),
    outcomes: { en: outcomesEn, th: outcomesTh.length ? outcomesTh : [...outcomesEn] },
  };
}
```

Then keep the older tests type-checking. In each file below, add `import { P1_DEFAULTS } from './helpers/project';` under the existing imports and add `...P1_DEFAULTS,` as the **last property** of each listed Project literal (P0 may have edited nearby lines; the anchor is the literal itself):

| File | Literal(s) |
|---|---|
| `tests/project-card.test.tsx` | `const base: Project = { … }` |
| `tests/project-frame.test.tsx` | `const base: Project = { … }` |
| `tests/sitemap-posts.test.ts` | both objects in `const synthProjects: Project[] = [ … ]` |
| `tests/work-deck.test.tsx` | `const build: Project = { … }` and `const business: Project = { … }` |
| `tests/work-story.test.ts` | `const baseProject: Omit<Project, …> = { … }` |
| `tests/tour-band.test.tsx` | `const shipped: Project = { … }` |
| `tests/project-tour.test.tsx` | the object returned by `make` — put `...P1_DEFAULTS,` just **before** `...extra,` |
| `tests/project-tour-helpers.test.ts` | the object returned by `make` — put `...P1_DEFAULTS,` just **before** `...extra,` |

For example, in `tests/project-card.test.tsx`:

```ts
  question: null,
  slug: null,
  ...P1_DEFAULTS,
};
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/mappers.test.ts && npx tsc --noEmit && npm test`
Expected: all green. `tsc` stays clean because `projectsFixture as Project[]` in `content.ts` is still a legal assertion: each fixture entry is comparable to `Project`, and extra required fields on `Project` do not break the comparison. The fixture itself gains the fields in Task 3.

- [ ] **Step 5: Commit**

```bash
git add src/lib/models.ts src/lib/notion-mappers.ts tests/helpers/project.ts tests/mappers.test.ts tests/project-card.test.tsx tests/project-frame.test.tsx tests/sitemap-posts.test.ts tests/work-deck.test.tsx tests/work-story.test.ts tests/tour-band.test.tsx tests/project-tour.test.tsx tests/project-tour-helpers.test.ts
git commit -m "feat(model): White Edition project fields, read from Notion with pre-migration defaults

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 3: Projects fixture — the 24-Sep lineup, and the new screenshots

**Files:**
- Modify (full rewrite): `src/content/fixtures/projects.json`
- Replace: `public/images/aje.jpg`, `public/images/gonai.jpg` (copied from `design/white-edition/prototype/img/`)
- Modify: `src/lib/image-alt.ts` (the `GONAI` constant, currently line 11–12)
- Test: `tests/projects-fixture.test.ts` (new) · `tests/content.test.ts` (two `it` blocks)

**Interfaces:**
- Consumes: `Project`, `PROJECT_STATUS_KEYS`, `PROJECT_MEDIA`, `PROJECT_WASHES` (Task 2), `mapProject` (Task 2).
- Produces: fixture ids `fx-talatify`, `fx-tripedia`, `fx-aje`, `fx-gonai`, `fx-klao-site`. GoNai's `lineageOf` is `'fx-tripedia'`. Tour order is Aje 1, GoNai 2, klao-site 3. klao-site is `media: 'notion'` with no image.

Image decision: the current `aje.jpg` and `gonai.jpg` are 1600×900 captures with a browser scrollbar down the right edge (213 KB and 143 KB). The prototype copies are 1580×900 with the scrollbar cropped out (121 KB and 68 KB). The GoNai copy is also the newer capture, whose cards read "Fares from official tables" instead of the old traveler count. The prototype copies replace them, and both stay ≤ 250 KB. The old `public/images/klao-site.jpg` (a dark-theme screenshot) is left on disk untouched: no fixture uses it any more, and `IMAGE_ALT` still describes it for a live Notion row that has that screenshot.

- [ ] **Step 1: Write the failing tests**

Create `tests/projects-fixture.test.ts`:

```ts
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import projects from '@/content/fixtures/projects.json';
import type { Project } from '@/lib/models';
import { PROJECT_MEDIA, PROJECT_STATUS_KEYS, PROJECT_WASHES } from '@/lib/models';
import { mapProject } from '@/lib/notion-mappers';

const fixtures = projects as Project[];
const byName = (name: string) => fixtures.find((p) => p.name === name)!;

describe('projects fixture (the 24-Sep lineup)', () => {
  it('is the approved lineup, in page order', () => {
    const ordered = [...fixtures].sort((a, b) => a.order - b.order).map((p) => p.name);
    expect(ordered).toEqual(['Talatify', 'Tripedia', 'Aje', 'GoNai', 'klao-site']);
  });

  it('carries exactly the fields the Notion mapper produces — the two-layer rule', () => {
    const minimalRow = { id: 'row', properties: { Name: { title: [{ plain_text: 'X' }] } } };
    const keys = Object.keys(mapProject(minimalRow)!).sort();
    for (const p of fixtures) expect(Object.keys(p).sort(), p.name).toEqual(keys);
  });

  it('uses only valid select values', () => {
    for (const p of fixtures) {
      if (p.statusKey !== null) expect(PROJECT_STATUS_KEYS).toContain(p.statusKey);
      expect(PROJECT_MEDIA).toContain(p.media);
      expect(PROJECT_WASHES).toContain(p.wash);
    }
  });

  it('fills status, kicker, alt and question in both languages on every project', () => {
    for (const p of fixtures) {
      for (const field of [p.status, p.kicker, p.alt, p.question]) {
        expect(field?.en, p.name).toBeTruthy();
        expect(field?.th, p.name).toBeTruthy();
      }
    }
  });

  it('tours the three builds, Aje → GoNai → klao-site', () => {
    const toured = fixtures.filter((p) => p.tour).sort((a, b) => (a.tourOrder ?? 99) - (b.tourOrder ?? 99));
    expect(toured.map((p) => p.name)).toEqual(['Aje', 'GoNai', 'klao-site']);
  });

  it('links GoNai back to Tripedia — same idea, four years apart — and nothing else', () => {
    expect(byName('GoNai').lineageOf).toBe(byName('Tripedia').id);
    expect(fixtures.filter((p) => p.lineageOf !== null)).toHaveLength(1);
  });

  it('gives klao-site the Notion-row vignette instead of the old dark screenshot', () => {
    expect(byName('klao-site').media).toBe('notion');
    expect(byName('klao-site').imageSrc).toBeNull();
  });

  it('points every screenshot at a real file in public/, at most 250 KB', () => {
    for (const p of fixtures.filter((x) => x.imageSrc)) {
      const size = statSync(join('public', p.imageSrc!)).size;
      expect(size, `${p.imageSrc} is ${size} bytes`).toBeLessThanOrEqual(250 * 1024);
    }
  });

  it('keeps the single-line outcome in step with the outcomes list', () => {
    for (const p of fixtures) {
      if (p.outcomes.en.length === 0) expect(p.outcome).toBeNull();
      else expect(p.outcome).toEqual({ en: p.outcomes.en.join(' · '), th: p.outcomes.th.join(' · ') });
    }
  });

  it('keeps "|" break marks out of project copy — /projects still prints it without ThaiText', () => {
    expect(JSON.stringify(fixtures)).not.toContain('|');
  });
});
```

In `tests/content.test.ts`, inside `it('returns every featured project, uncapped', …)`, replace the regression-guard line that names a project by its old position (today `expect(featured.map((p) => p.name)).toContain('DailyBrief');`; P0 may already have changed it) with:

```ts
    expect(featured.map((p) => p.name)).toContain('klao-site');
```

Replace the whole `it('carries Aje and klao-site as featured builds…', …)` block, whatever P0 left in it, with:

```ts
  it('carries the 24-Sep lineup: three builds led by Aje, two business plays', async () => {
    const featured = await getFeaturedProjects();
    expect(featured.filter((p) => p.type === 'build').map((p) => p.name)).toEqual(['Aje', 'GoNai', 'klao-site']);
    expect(featured.filter((p) => p.type === 'business').map((p) => p.name)).toEqual(['Talatify', 'Tripedia']);
    const aje = featured.find((p) => p.name === 'Aje')!;
    expect(aje.outcome?.en).toContain('Working prototype');
    expect(aje.liveUrl).toBeNull();
    const site = featured.find((p) => p.name === 'klao-site')!;
    expect(site.liveUrl).toBe('https://klao-site.vercel.app');
    expect(site.repoUrl).toBe('https://github.com/Klaosj/klao-site');
  });
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/projects-fixture.test.ts tests/content.test.ts`
Expected: FAIL. The keys test fails with `expected [ … ] to equal [ …, 'alt', … ]`, the tour test fails with `expected [] to equal [ 'Aje', 'GoNai', 'klao-site' ]`, and the content lineup test fails.

- [ ] **Step 3: Implement**

```bash
cp design/white-edition/prototype/img/aje.jpg public/images/aje.jpg
cp design/white-edition/prototype/img/gonai.jpg public/images/gonai.jpg
```

Replace `src/content/fixtures/projects.json` with (copy is the prototype's `P` and `STATUS`, verbatim, except that Aje's Thai question drops its `|`):

```json
[
  {
    "id": "fx-talatify",
    "name": "Talatify",
    "description": {
      "en": "Fresh-market delivery platform: local wet-market vendors sell online and deliver straight to restaurants and cafés. Co-founder; pitched at the TEP startup screening round, 2025.",
      "th": "แพลตฟอร์มส่งของสดจากตลาด: พ่อค้าแม่ค้าตลาดสดขายออนไลน์และส่งตรงถึงร้านอาหารและคาเฟ่ เป็น Co-founder นำเสนอในรอบคัดเลือก TEP startup ปี 2025"
    },
    "stack": [],
    "liveUrl": null,
    "repoUrl": null,
    "imageSrc": null,
    "featured": true,
    "order": 1,
    "type": "business",
    "outcome": {
      "en": "Market sized (TAM–SAM–SOM, SOM THB 37M, an estimate) · 5 revenue streams · First-year financial plan · Clickable prototype",
      "th": "ขนาดตลาด TAM–SAM–SOM (SOM 37 ล้านบาท เป็นการประเมิน) · 5 ช่องทางรายได้ · แผนการเงินปีแรก · prototype กดได้จริง"
    },
    "question": {
      "en": "Can a restaurant get wet-market fresh produce without the morning market run?",
      "th": "ร้านอาหารจะได้ของสดจากตลาด โดยไม่ต้องไปจ่ายตลาดเองตอนเช้า ได้ไหม?"
    },
    "slug": null,
    "statusKey": "pitched",
    "status": { "en": "Pitched · TEP 2025", "th": "นำเสนอแล้ว · TEP 2025" },
    "kicker": { "en": "Business · Co-founder · 2025", "th": "ธุรกิจ · Co-founder · 2025" },
    "media": "rings",
    "wash": "none",
    "tour": false,
    "tourOrder": null,
    "lineageOf": null,
    "alt": {
      "en": "Three nested rings labelled TAM, SAM and SOM, with SOM filled. Method, not to scale.",
      "th": "วงกลมซ้อนสามวง TAM, SAM และ SOM โดยระบาย SOM วิธีคิด ไม่ใช่สัดส่วนจริง"
    },
    "outcomes": {
      "en": ["Market sized (TAM–SAM–SOM, SOM THB 37M, an estimate)", "5 revenue streams", "First-year financial plan", "Clickable prototype"],
      "th": ["ขนาดตลาด TAM–SAM–SOM (SOM 37 ล้านบาท เป็นการประเมิน)", "5 ช่องทางรายได้", "แผนการเงินปีแรก", "prototype กดได้จริง"]
    }
  },
  {
    "id": "fx-tripedia",
    "name": "Tripedia",
    "description": {
      "en": "Travel-tech startup idea: one platform that plans the whole trip in one place. Co-founder at KATALYST Startup Launchpad 2022, the idea GoNai was later built from.",
      "th": "ไอเดียสตาร์ทอัพท่องเที่ยว: แพลตฟอร์มเดียวที่วางแผนทั้งทริปจบในที่เดียว เป็น Co-founder ใน KATALYST Startup Launchpad 2022 และเป็นไอเดียต้นทางที่ GoNai ถูกสร้างขึ้นจริงในภายหลัง"
    },
    "stack": [],
    "liveUrl": null,
    "repoUrl": null,
    "imageSrc": null,
    "featured": true,
    "order": 2,
    "type": "business",
    "outcome": {
      "en": "Final 30 of 500 teams · Market sized (TAM–SAM–SOM) · Subscription + partner-margin revenue model",
      "th": "เข้ารอบ 30 ทีมสุดท้ายจาก 500 ทีม · ขนาดตลาด TAM–SAM–SOM · โมเดลรายได้ subscription + ส่วนแบ่งจากพาร์ตเนอร์"
    },
    "question": {
      "en": "Why does planning one trip take five apps?",
      "th": "ทำไมวางแผนทริปเดียวต้องใช้ตั้งห้าแอป?"
    },
    "slug": null,
    "statusKey": "finalist",
    "status": { "en": "Final 30 of 500 · 2022", "th": "รอบ 30 ทีมสุดท้ายจาก 500 · 2022" },
    "kicker": { "en": "Business · Co-founder · 2022", "th": "ธุรกิจ · Co-founder · 2022" },
    "media": "five",
    "wash": "none",
    "tour": false,
    "tourOrder": null,
    "lineageOf": null,
    "alt": {
      "en": "Five separate app squares become one.",
      "th": "แอปห้าตัวแยกกัน รวมเป็นหนึ่งเดียว"
    },
    "outcomes": {
      "en": ["Final 30 of 500 teams", "Market sized (TAM–SAM–SOM)", "Subscription + partner-margin revenue model"],
      "th": ["เข้ารอบ 30 ทีมสุดท้ายจาก 500 ทีม", "ขนาดตลาด TAM–SAM–SOM", "โมเดลรายได้ subscription + ส่วนแบ่งจากพาร์ตเนอร์"]
    }
  },
  {
    "id": "fx-aje",
    "name": "Aje",
    "description": {
      "en": "Idea-grading workspace for startup ideas: write one paragraph, get it graded against proven frameworks, and leave with one small test to run next.",
      "th": "เวิร์กสเปซตัดเกรดไอเดียสตาร์ทอัพ: เขียนหนึ่งย่อหน้า ระบบให้เกรดตาม framework ที่พิสูจน์แล้ว แล้วได้การทดสอบเล็กๆ หนึ่งอย่างไปทำต่อ"
    },
    "stack": ["Next.js", "Claude API", "Ollama"],
    "liveUrl": null,
    "repoUrl": null,
    "imageSrc": "/images/aje.jpg",
    "featured": true,
    "order": 3,
    "type": "build",
    "outcome": {
      "en": "Working prototype · 8-dimension report card with letter grades · 16 hand-drawn framework diagrams · Advisor runs on Claude or a local model",
      "th": "prototype ใช้งานได้จริง · report card 8 มิติพร้อมเกรด · framework diagram 16 ใบวาดเอง · advisor รันบน Claude หรือโมเดล local"
    },
    "question": {
      "en": "Is this idea worth a weekend, or a year?",
      "th": "ไอเดียนี้คุ้มกับหนึ่งสุดสัปดาห์ หรือทั้งปี?"
    },
    "slug": null,
    "statusKey": "proto",
    "status": { "en": "Working prototype", "th": "Prototype ใช้งานได้" },
    "kicker": { "en": "Build · Working prototype", "th": "สร้างเอง · Prototype ใช้งานได้" },
    "media": "img",
    "wash": "aje",
    "tour": true,
    "tourOrder": 1,
    "lineageOf": null,
    "alt": {
      "en": "Aje’s Review screen for a sample idea, BikeFix Home: the idea, its biggest uncertainty and the next test.",
      "th": "หน้า Review ของ Aje สำหรับไอเดียตัวอย่าง BikeFix Home: ตัวไอเดีย ความไม่แน่นอนที่ใหญ่ที่สุด และการทดสอบถัดไป"
    },
    "outcomes": {
      "en": ["Working prototype", "8-dimension report card with letter grades", "16 hand-drawn framework diagrams", "Advisor runs on Claude or a local model"],
      "th": ["prototype ใช้งานได้จริง", "report card 8 มิติพร้อมเกรด", "framework diagram 16 ใบวาดเอง", "advisor รันบน Claude หรือโมเดล local"]
    }
  },
  {
    "id": "fx-gonai",
    "name": "GoNai",
    "description": {
      "en": "One-day Bangkok trip planner with exact budgets, built as a weekend project.",
      "th": "แอปวางแผนเที่ยวกรุงเทพฯ 1 วัน พร้อมงบประมาณละเอียด สร้างเสร็จในสุดสัปดาห์เดียว"
    },
    "stack": ["Next.js", "Supabase"],
    "liveUrl": "https://gonai-three.vercel.app",
    "repoUrl": null,
    "imageSrc": "/images/gonai.jpg",
    "featured": true,
    "order": 4,
    "type": "build",
    "outcome": null,
    "question": {
      "en": "One day in Bangkok — what’s the real budget?",
      "th": "ไปเที่ยวหนึ่งวัน งบจริงๆ เท่าไหร่?"
    },
    "slug": null,
    "statusKey": "live",
    "status": { "en": "Live · since Aug 2026", "th": "เปิดใช้งานแล้ว · ตั้งแต่ ส.ค. 2026" },
    "kicker": { "en": "Build · Live", "th": "สร้างเอง · เปิดใช้งานแล้ว" },
    "media": "win",
    "wash": "gonai",
    "tour": true,
    "tourOrder": 2,
    "lineageOf": "fx-tripedia",
    "alt": {
      "en": "GoNai home screen: Plan a full day out, know every baht before you leave, with a budget prompt.",
      "th": "หน้าแรกของ GoNai: วางแผนเที่ยวทั้งวัน รู้ทุกบาทก่อนออกจากบ้าน พร้อมช่องพิมพ์งบประมาณ"
    },
    "outcomes": { "en": [], "th": [] }
  },
  {
    "id": "fx-klao-site",
    "name": "klao-site",
    "description": {
      "en": "This site. A bilingual personal hub where every project, career entry and line of copy is edited in Notion and goes live within the hour, with no deploy.",
      "th": "เว็บนี้เอง: hub ส่วนตัวสองภาษาที่ทุกโปรเจกต์ ประวัติงาน และข้อความ แก้ใน Notion แล้วขึ้นเว็บภายในหนึ่งชั่วโมง ไม่ต้อง deploy"
    },
    "stack": ["Next.js", "Notion API", "Vercel"],
    "liveUrl": "https://klao-site.vercel.app",
    "repoUrl": "https://github.com/Klaosj/klao-site",
    "imageSrc": null,
    "featured": true,
    "order": 5,
    "type": "build",
    "outcome": {
      "en": "Live since Aug 2026 · Notion as the only CMS · EN/TH · 400+ automated tests",
      "th": "ออนไลน์ตั้งแต่ ส.ค. 2026 · Notion เป็น CMS เดียว · EN/TH · เทสต์อัตโนมัติ 400+ ข้อ"
    },
    "question": {
      "en": "Can a personal site update itself from Notion, in two languages?",
      "th": "เว็บส่วนตัวอัปเดตตัวเองจาก Notion สองภาษาได้ไหม?"
    },
    "slug": null,
    "statusKey": "live",
    "status": { "en": "Live · since Aug 2026", "th": "เปิดใช้งานแล้ว · ตั้งแต่ ส.ค. 2026" },
    "kicker": { "en": "Build · This site", "th": "สร้างเอง · เว็บนี้เอง" },
    "media": "notion",
    "wash": "site",
    "tour": true,
    "tourOrder": 3,
    "lineageOf": null,
    "alt": {
      "en": "The project’s own Notion row: name, type, stack and status.",
      "th": "แถวข้อมูลของโปรเจกต์นี้ใน Notion: ชื่อ ประเภท stack และสถานะ"
    },
    "outcomes": {
      "en": ["Live since Aug 2026", "Notion as the only CMS", "EN/TH", "400+ automated tests"],
      "th": ["ออนไลน์ตั้งแต่ ส.ค. 2026", "Notion เป็น CMS เดียว", "EN/TH", "เทสต์อัตโนมัติ 400+ ข้อ"]
    }
  }
]
```

In `src/lib/image-alt.ts`, replace the `GONAI` constant with (the new capture's floating card reads "Fares from official tables"):

```ts
const GONAI =
  'A white landing-page hero with an airplane-and-Thai-flag logomark, a bold headline about planning a full day out and knowing every baht before leaving, a budget search field, a black "start planning" button, and small floating cards noting fares from official tables and a BTS fare between two stations.';
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/projects-fixture.test.ts tests/content.test.ts tests/image-alt.test.ts && ls -l public/images/aje.jpg public/images/gonai.jpg`
Expected: PASS. The two files are 121,505 and 67,641 bytes.

- [ ] **Step 5: Commit**

```bash
git add src/content/fixtures/projects.json public/images/aje.jpg public/images/gonai.jpg src/lib/image-alt.ts tests/projects-fixture.test.ts tests/content.test.ts
git commit -m "content(projects): the 24-Sep lineup with every White Edition field, cleaner Aje and GoNai captures

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 4: Tour membership and slides — `src/lib/project-tour.ts`

**Files:**
- Modify (full rewrite): `src/lib/project-tour.ts`
- Test (full rewrite): `tests/project-tour-helpers.test.ts`

**Interfaces:**
- Consumes: `Project`, `ProjectWash`, `Locale` (Task 2) · `imageAlt` (`src/lib/image-alt.ts`) · `makeProject` (Task 2).
- Produces:
  - `TOUR_MS` (kept only until Task 12, for the old ProjectTour)
  - `TOUR_DWELL_MS = { img: 6000, win: 5500, notion: 7000 }`
  - `TH_DWELL_FACTOR = 1.1`
  - `tourDwellMs(p: Pick<Project, 'media'>, locale: Locale): number`
  - `tourProjects(projects: Project[]): Project[]`
  - `windowTitle(project: Project): string` (unchanged)
  - `tourKicker(p: Project, locale: Locale): string`
  - `TOUR_CAPTION_HREF = '#work'`
  - `interface TourSlide { id: string; name: string; kicker: string; question: string; href: string; media: 'img' | 'notion'; src: string | null; alt: string; wash: ProjectWash; dwellMs: number }`
  - `interface TourVignette { titleEn: string; titleTh: string; photoSrc: string | null }`
  - `toTourSlides(projects: Project[], locale: Locale): TourSlide[]`

- [ ] **Step 1: Write the failing test**

Replace `tests/project-tour-helpers.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import projectsFixture from '@/content/fixtures/projects.json';
import { IMAGE_ALT } from '@/lib/image-alt';
import type { Project } from '@/lib/models';
import {
  TH_DWELL_FACTOR,
  TOUR_CAPTION_HREF,
  TOUR_DWELL_MS,
  toTourSlides,
  tourDwellMs,
  tourKicker,
  tourProjects,
  windowTitle,
} from '@/lib/project-tour';
import { makeProject } from './helpers/project';

const aje = makeProject({
  id: 'aje',
  name: 'Aje',
  order: 3,
  tour: true,
  tourOrder: 1,
  media: 'img',
  wash: 'aje',
  kicker: { en: 'Build · Working prototype', th: 'สร้างเอง · Prototype ใช้งานได้' },
  question: { en: 'Is this idea worth a weekend, or a year?', th: 'ไอเดียนี้คุ้มกับหนึ่งสุดสัปดาห์ หรือทั้งปี?' },
});
const gonai = makeProject({
  id: 'gonai',
  name: 'GoNai',
  order: 4,
  tour: true,
  tourOrder: 2,
  media: 'win',
  wash: 'gonai',
  liveUrl: 'https://gonai-three.vercel.app',
  kicker: { en: 'Build · Live', th: 'สร้างเอง · เปิดใช้งานแล้ว' },
});
const site = makeProject({
  id: 'site',
  name: 'klao-site',
  order: 5,
  tour: true,
  tourOrder: 3,
  media: 'notion',
  wash: 'site',
  imageSrc: null,
  liveUrl: 'https://klao-site.vercel.app',
  kicker: { en: 'Build · This site', th: 'สร้างเอง · เว็บนี้เอง' },
});
const talatify = makeProject({ id: 'talatify', name: 'Talatify', order: 1, type: 'business', media: 'rings', imageSrc: null });

describe('tourProjects', () => {
  it('plays the Tour-ticked projects in TourOrder, whatever their page order, without mutating the input', () => {
    const input = [site, talatify, gonai, aje];
    const snapshot = [...input];
    expect(tourProjects(input).map((p) => p.name)).toEqual(['Aje', 'GoNai', 'klao-site']);
    expect(input).toEqual(snapshot);
  });

  it('puts a ticked project without a TourOrder after the numbered ones', () => {
    const late = makeProject({ id: 'late', name: 'Late', order: 0, tour: true, tourOrder: null });
    expect(tourProjects([late, gonai, aje]).map((p) => p.name)).toEqual(['Aje', 'GoNai', 'Late']);
  });

  it('skips a ticked project with nothing to show (no screenshot, not the Notion vignette)', () => {
    const blank = makeProject({ id: 'blank', name: 'Blank', tour: true, tourOrder: 0, media: 'win', imageSrc: null });
    expect(tourProjects([blank, aje]).map((p) => p.name)).toEqual(['Aje']);
  });

  it('before Notion has the Tour checkbox, falls back to the old rule: every project with a screenshot, by page order (Review Focus #1)', () => {
    const pre = [
      makeProject({ id: 'b', name: 'B', order: 2 }),
      makeProject({ id: 'none', name: 'None', order: 0, imageSrc: null, media: 'win' }),
      makeProject({ id: 'a', name: 'A', order: 1 }),
    ];
    expect(tourProjects(pre).map((p) => p.name)).toEqual(['A', 'B']);
  });

  it('returns an empty list when nothing can be shown', () => {
    expect(tourProjects([talatify])).toEqual([]);
    expect(tourProjects([])).toEqual([]);
  });

  it('plays Aje → GoNai → klao-site from the real fixtures', () => {
    expect(tourProjects(projectsFixture as Project[]).map((p) => p.name)).toEqual(['Aje', 'GoNai', 'klao-site']);
  });
});

describe('tourKicker', () => {
  it('reproduces the prototype subtitles: name, the kicker minus its chapter, and the host of a live window', () => {
    expect(tourKicker(aje, 'en')).toBe('Aje · Working prototype');
    expect(tourKicker(gonai, 'en')).toBe('GoNai · Live · gonai-three.vercel.app');
    expect(tourKicker(site, 'en')).toBe('klao-site · This site');
    expect(tourKicker(aje, 'th')).toBe('Aje · Prototype ใช้งานได้');
    expect(tourKicker(gonai, 'th')).toBe('GoNai · เปิดใช้งานแล้ว · gonai-three.vercel.app');
    expect(tourKicker(site, 'th')).toBe('klao-site · เว็บนี้เอง');
  });

  it('keeps a one-part kicker whole', () => {
    expect(tourKicker({ ...aje, kicker: { en: 'Prototype', th: 'ต้นแบบ' } }, 'en')).toBe('Aje · Prototype');
  });

  it('falls back to the status, then to the bare name, on a pre-migration row', () => {
    expect(tourKicker({ ...aje, kicker: null, status: { en: 'Working prototype', th: 'Prototype ใช้งานได้' } }, 'en')).toBe(
      'Aje · Working prototype',
    );
    expect(tourKicker({ ...aje, kicker: null, status: null }, 'en')).toBe('Aje');
  });
});

describe('tourDwellMs', () => {
  it('uses the prototype dwell per kind of frame and gives Thai 10 % longer', () => {
    expect(TOUR_DWELL_MS).toEqual({ img: 6000, win: 5500, notion: 7000 });
    expect(TH_DWELL_FACTOR).toBe(1.1);
    expect(tourDwellMs(aje, 'en')).toBe(6000);
    expect(tourDwellMs(gonai, 'en')).toBe(5500);
    expect(tourDwellMs(site, 'en')).toBe(7000);
    expect(tourDwellMs(aje, 'th')).toBe(6600);
    expect(tourDwellMs(gonai, 'th')).toBe(6050);
    expect(tourDwellMs(site, 'th')).toBe(7700);
  });
});

describe('toTourSlides', () => {
  it('turns the tour projects into plain, serialisable slides for the client stage', () => {
    const slides = toTourSlides([talatify, site, gonai, aje], 'en');
    expect(slides.map((s) => s.id)).toEqual(['aje', 'gonai', 'site']);
    expect(slides[0]).toEqual({
      id: 'aje',
      name: 'Aje',
      kicker: 'Aje · Working prototype',
      question: 'Is this idea worth a weekend, or a year?',
      href: TOUR_CAPTION_HREF,
      media: 'img',
      src: '/api/img/page/aje/Screenshot',
      alt: IMAGE_ALT['/images/aje.jpg'],
      wash: 'aje',
      dwellMs: 6000,
    });
    expect(slides[1].media).toBe('img'); // a 'win' project is a plain card in the tour
    expect(slides[2]).toMatchObject({ media: 'notion', src: null, wash: 'site', dwellMs: 7000 });
  });

  it("prefers the project's own alt text, in the page's language", () => {
    const withAlt = { ...aje, alt: { en: 'Aje review screen.', th: 'หน้า Review ของ Aje' } };
    expect(toTourSlides([withAlt], 'th')[0].alt).toBe('หน้า Review ของ Aje');
  });

  it('captions with the question, or the description when a project has none', () => {
    expect(toTourSlides([{ ...gonai, question: null }], 'th')[0].question).toBe(gonai.description.th);
  });

  it('shows the Notion vignette for a media=notion project even when Notion also holds a screenshot for it', () => {
    const live = { ...site, imageSrc: '/api/img/page/site/Screenshot' };
    expect(toTourSlides([live], 'en')[0]).toMatchObject({ media: 'notion', src: null });
  });
});

describe('windowTitle', () => {
  it('uses the live URL host when there is one', () => {
    expect(windowTitle(makeProject({ id: 'g', name: 'GoNai', liveUrl: 'https://gonai-three.vercel.app/en?x=1' }))).toBe(
      'gonai-three.vercel.app',
    );
  });

  it('falls back to the project name without a live URL, or with an unparseable one', () => {
    expect(windowTitle(makeProject({ id: 'a', name: 'Aje' }))).toBe('Aje');
    expect(windowTitle(makeProject({ id: 'b', name: 'Broken', liveUrl: 'not a url' }))).toBe('Broken');
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/project-tour-helpers.test.ts`
Expected: FAIL. The imports `TOUR_DWELL_MS`, `toTourSlides`, `tourKicker` and the rest are undefined, and `tourProjects` returns the old screenshot-only list.

- [ ] **Step 3: Implement**

Replace `src/lib/project-tour.ts` with:

```ts
import { imageAlt } from './image-alt';
import type { Locale, Project, ProjectWash } from './models';

/** The old ProjectTour's fixed slide length. Only ProjectTour still reads it;
 *  it goes with ProjectTour when HeroTour takes the page (this phase, Task 12). */
export const TOUR_MS = 7000;

/** Dwell per frame in ms, by what the frame shows (prototype TOUR, 24 Sep): a
 *  dense app screen ('img', Aje) 6.0 s, a live landing page ('win', GoNai)
 *  5.5 s, the Notion-row vignette ('notion', klao-site) 7.0 s — it plays two
 *  beats, English then Thai at 3.2 s. Line drawings never tour. */
export const TOUR_DWELL_MS = { img: 6000, win: 5500, notion: 7000 } as const;

/** Thai is read a little slower at the same size; the prototype gives every
 *  Thai frame 10 % longer. */
export const TH_DWELL_FACTOR = 1.1;

export function tourDwellMs(p: Pick<Project, 'media'>, locale: Locale): number {
  const base = p.media === 'win' ? TOUR_DWELL_MS.win : p.media === 'notion' ? TOUR_DWELL_MS.notion : TOUR_DWELL_MS.img;
  return Math.round(base * (locale === 'th' ? TH_DWELL_FACTOR : 1));
}

/** A frame the stage can draw: a screenshot, or the Notion vignette (which
 *  needs no image). */
const showable = (p: Project): boolean =>
  p.media === 'notion' || (typeof p.imageSrc === 'string' && p.imageSrc.length > 0);

/**
 * Tour membership (spec §6): projects with the Tour checkbox, in TourOrder
 * (unnumbered ones last, then page order), skipping any that has nothing to
 * show. Until Klao adds the Tour checkbox in Notion no row is ticked, and the
 * tour falls back to the rule it had before White Edition — every project
 * with a screenshot, by page order — so the live hero never loses its stage
 * mid-migration (Review Focus #1). Never mutates the caller's array.
 */
export function tourProjects(projects: Project[]): Project[] {
  const ticked = projects.filter((p) => p.tour && showable(p));
  if (ticked.length > 0) {
    return [...ticked].sort(
      (a, b) => (a.tourOrder ?? Number.POSITIVE_INFINITY) - (b.tourOrder ?? Number.POSITIVE_INFINITY) || a.order - b.order,
    );
  }
  return projects.filter(showable).sort((a, b) => a.order - b.order);
}

/** The window-chrome title: the live host when there is one (it reads as
 *  "this runs at …"), else the project name. */
export function windowTitle(project: Project): string {
  if (project.liveUrl) {
    try {
      return new URL(project.liveUrl).host;
    } catch {
      // fall through to the name
    }
  }
  return project.name;
}

/**
 * The small line under a tour subtitle, e.g. "GoNai · Live · gonai-three.vercel.app".
 * Kicker copy is written "<chapter> · <detail…>" ("Build · Live"); the tour
 * only shows builds and puts the name first, so it drops the chapter word. A
 * one-part kicker stays whole. A project framed as a live window ('win') adds
 * its host. Pre-migration rows (no kicker) use the status, then the bare name.
 */
export function tourKicker(p: Project, locale: Locale): string {
  const parts = [p.name];
  if (p.kicker) {
    const segments = p.kicker[locale].split(' · ');
    parts.push(...(segments.length > 1 ? segments.slice(1) : segments));
  } else if (p.status) {
    parts.push(p.status[locale]);
  }
  if (p.media === 'win' && p.liveUrl) {
    const host = windowTitle(p);
    if (host !== p.name) parts.push(host);
  }
  return parts.filter(Boolean).join(' · ');
}

/** Where a tour subtitle leads. P1: the projects index. P2 swaps this for the
 *  project's own sheet (`sheetHash(projectKey(p))`, contract C6). */
export const TOUR_CAPTION_HREF = '#work';

/** One tour frame, flattened on the server so the client stage receives plain
 *  serialisable data in the page's own language. */
export interface TourSlide {
  id: string;
  name: string;
  kicker: string;
  question: string;
  href: string;
  media: 'img' | 'notion';
  src: string | null;
  alt: string;
  wash: ProjectWash;
  dwellMs: number;
}

/** What the klao-site frame draws: the site's own headline as a Notion row,
 *  then as the page it becomes (from Profile, so it always matches the h1). */
export interface TourVignette {
  titleEn: string;
  titleTh: string;
  photoSrc: string | null;
}

export function toTourSlides(projects: Project[], locale: Locale): TourSlide[] {
  return tourProjects(projects).map((p) => {
    const media = p.media === 'notion' ? 'notion' : 'img';
    const src = media === 'img' ? p.imageSrc : null;
    return {
      id: p.id,
      name: p.name,
      kicker: tourKicker(p, locale),
      question: (p.question ?? p.description)[locale],
      href: TOUR_CAPTION_HREF,
      media,
      src,
      alt: p.alt?.[locale] || (src ? imageAlt(src, p.name) : ''),
      wash: p.wash,
      dwellMs: tourDwellMs(p, locale),
    };
  });
}
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/project-tour-helpers.test.ts tests/project-tour.test.tsx tests/tour-band.test.tsx && npx tsc --noEmit`
Expected: PASS. The old ProjectTour/TourBand tests still pass: their projects carry no Tour ticks, so they take the fallback rule, which is the old rule.

- [ ] **Step 5: Commit**

```bash
git add src/lib/project-tour.ts tests/project-tour-helpers.test.ts
git commit -m "feat(tour): membership by the Tour checkbox, prototype dwell times, server-built slides

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 5: Tour playback rules — `src/lib/tour-player.ts`

**Files:**
- Create: `src/lib/tour-player.ts`
- Test: `tests/tour-player.test.ts` (new)

**Interfaces:**
- Consumes: nothing.
- Produces: `type TourPhase = 'idle' | 'playing' | 'paused' | 'manual' | 'done'` · `interface TourState { index: number; under: number | null; phase: TourPhase; run: number }` · `type TourAction` (`start{at}`, `advance{count}`, `pause`, `resume`, `go{to,count}`, `settled`, `stop`) · `initialTourState` · `tourReducer(s: TourState, a: TourAction): TourState`.

- [ ] **Step 1: Write the failing test**

Create `tests/tour-player.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { initialTourState, tourReducer, type TourState } from '@/lib/tour-player';

const at = (over: Partial<TourState>): TourState => ({ ...initialTourState, ...over });

describe('tourReducer', () => {
  it('starts idle on the first frame, nothing underneath', () => {
    expect(initialTourState).toEqual({ index: 0, under: null, phase: 'idle', run: 0 });
  });

  it('start: plays from the given frame and bumps `run` so the clock restarts', () => {
    expect(tourReducer(initialTourState, { type: 'start', at: 0 })).toEqual({ index: 0, under: null, phase: 'playing', run: 1 });
  });

  it('advance: moves one frame on and keeps the old frame underneath for the crossfade', () => {
    expect(tourReducer(at({ phase: 'playing', run: 1 }), { type: 'advance', count: 3 })).toEqual({
      index: 1,
      under: 0,
      phase: 'playing',
      run: 1,
    });
  });

  it('advance on the last frame ends the tour there — it plays once, never wraps', () => {
    expect(tourReducer(at({ index: 2, phase: 'playing', run: 1 }), { type: 'advance', count: 3 })).toEqual({
      index: 2,
      under: null,
      phase: 'done',
      run: 1,
    });
  });

  it('advance is ignored unless playing (a late timer after a pause or a visitor click)', () => {
    for (const phase of ['idle', 'paused', 'manual', 'done'] as const) {
      const s = at({ phase });
      expect(tourReducer(s, { type: 'advance', count: 3 })).toBe(s);
    }
  });

  it('pause and resume only move between playing and paused', () => {
    const paused = tourReducer(at({ phase: 'playing' }), { type: 'pause' });
    expect(paused.phase).toBe('paused');
    expect(tourReducer(paused, { type: 'resume' }).phase).toBe('playing');
    const idle = at({});
    expect(tourReducer(idle, { type: 'pause' })).toBe(idle);
    expect(tourReducer(idle, { type: 'resume' })).toBe(idle);
  });

  it('go: a visitor pick hands control to the visitor, wraps at both ends, and crossfades from the old frame', () => {
    expect(tourReducer(at({ phase: 'playing' }), { type: 'go', to: -1, count: 3 })).toMatchObject({ index: 2, under: 0, phase: 'manual' });
    expect(tourReducer(at({ index: 2, phase: 'done' }), { type: 'go', to: 3, count: 3 })).toMatchObject({ index: 0, under: 2, phase: 'manual' });
  });

  it('go to the frame already showing only changes the mode', () => {
    expect(tourReducer(at({ index: 1, phase: 'playing' }), { type: 'go', to: 1, count: 3 })).toEqual({
      index: 1,
      under: null,
      phase: 'manual',
      run: 0,
    });
  });

  it('go on an empty tour does nothing (never a NaN index)', () => {
    const s = at({});
    expect(tourReducer(s, { type: 'go', to: 1, count: 0 })).toBe(s);
  });

  it('replay from done starts again at the first frame, crossfading from the last', () => {
    expect(tourReducer(at({ index: 2, phase: 'done', run: 1 }), { type: 'start', at: 0 })).toEqual({
      index: 0,
      under: 2,
      phase: 'playing',
      run: 2,
    });
  });

  it('settled drops the frame underneath once the crossfade is over', () => {
    expect(tourReducer(at({ index: 1, under: 0 }), { type: 'settled' })).toMatchObject({ index: 1, under: null });
    const clean = at({});
    expect(tourReducer(clean, { type: 'settled' })).toBe(clean);
  });

  it('stop (reduced motion switched on mid-tour) hands control to the visitor', () => {
    expect(tourReducer(at({ phase: 'playing' }), { type: 'stop' }).phase).toBe('manual');
    expect(tourReducer(at({ phase: 'paused' }), { type: 'stop' }).phase).toBe('manual');
    const done = at({ phase: 'done' });
    expect(tourReducer(done, { type: 'stop' })).toBe(done);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/tour-player.test.ts`
Expected: FAIL with `Failed to resolve import "@/lib/tour-player"`.

- [ ] **Step 3: Implement**

Create `src/lib/tour-player.ts`:

```ts
/**
 * The hero tour's playback rules (spec §6: plays once and ends on the last
 * frame; a visitor pick stops it; Play resumes). Pure, so the rules are tested
 * without a DOM. HeroTourStage owns the clock (one setTimeout with
 * remaining-time bookkeeping) and dispatches these actions.
 *
 * `under` is the frame that stays visible underneath while the new one fades
 * in on top — a top-layer crossfade, never a 50/50 blend. `run` bumps on every
 * (re)start, so the stage's clock knows to take a fresh dwell.
 */
export type TourPhase = 'idle' | 'playing' | 'paused' | 'manual' | 'done';

export interface TourState {
  index: number;
  under: number | null;
  phase: TourPhase;
  run: number;
}

export type TourAction =
  | { type: 'start'; at: number }
  | { type: 'advance'; count: number }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'go'; to: number; count: number }
  | { type: 'settled' }
  | { type: 'stop' };

export const initialTourState: TourState = { index: 0, under: null, phase: 'idle', run: 0 };

const wrap = (i: number, count: number): number => ((i % count) + count) % count;

function moveTo(s: TourState, to: number): Pick<TourState, 'index' | 'under'> {
  return to === s.index ? { index: s.index, under: s.under } : { index: to, under: s.index };
}

export function tourReducer(s: TourState, a: TourAction): TourState {
  switch (a.type) {
    case 'start':
      return { ...s, ...moveTo(s, a.at), phase: 'playing', run: s.run + 1 };
    case 'advance':
      if (s.phase !== 'playing') return s;
      return s.index + 1 < a.count ? { ...s, ...moveTo(s, s.index + 1) } : { ...s, phase: 'done' };
    case 'pause':
      return s.phase === 'playing' ? { ...s, phase: 'paused' } : s;
    case 'resume':
      return s.phase === 'paused' ? { ...s, phase: 'playing' } : s;
    case 'go':
      if (a.count < 1) return s;
      return { ...s, ...moveTo(s, wrap(a.to, a.count)), phase: 'manual' };
    case 'settled':
      return s.under === null ? s : { ...s, under: null };
    case 'stop':
      return s.phase === 'playing' || s.phase === 'paused' ? { ...s, phase: 'manual' } : s;
  }
}
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/tour-player.test.ts && npx tsc --noEmit`
Expected: PASS (12 tests), `tsc` clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tour-player.ts tests/tour-player.test.ts
git commit -m "feat(tour): pure playback rules — plays once, visitor picks stop it, replay from the start

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 6: EN/ไทย segmented control — `LocaleToggle`

**Files:**
- Modify (full rewrite): `src/components/LocaleToggle.tsx`
- Create: `src/components/locale-toggle.css`
- Test: `tests/locale-toggle.test.tsx` (new)
- Modify: `tests/site-nav.test.tsx`: delete the two cases that pin the old toggle markup, `it('includes the language switcher', …)` (it looks for `role="navigation"`) and `it('gives the embedded LocaleToggle EN/ไทย links the same invisible hit-area padding', …)` (it looks for `p-1.5 -m-1.5`). Task 9 rewrites the rest of the file.

**Interfaces:**
- Consumes: `dict[locale].navLanguage` (exists).
- Produces: `switchLocaleHref(pathname: string, target: Locale): string` · `export default function LocaleToggle({ wide }: { wide?: boolean })`. The component renders `div.lt-seg[role=group]` (plus `.lt-wide` when `wide`) with two links, `EN` then `ไทย`, marked with `lang`, `hrefLang` and `aria-current="page"`.

- [ ] **Step 1: Write the failing test**

Create `tests/locale-toggle.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LocaleToggle, { switchLocaleHref } from '@/components/LocaleToggle';
import { dict } from '@/lib/dictionary';

vi.mock('next/navigation', () => ({ usePathname: vi.fn(() => '/en') }));

afterEach(() => {
  cleanup();
  vi.mocked(usePathname).mockReturnValue('/en');
});

describe('switchLocaleHref', () => {
  it('swaps only the locale segment and keeps the rest of the path', () => {
    expect(switchLocaleHref('/en', 'th')).toBe('/th');
    expect(switchLocaleHref('/en/', 'th')).toBe('/th');
    expect(switchLocaleHref('/th/writing/some-post', 'en')).toBe('/en/writing/some-post');
    expect(switchLocaleHref('/en/projects', 'en')).toBe('/en/projects');
  });
});

describe('LocaleToggle', () => {
  it('is one labelled group of two links, EN then ไทย, each tagged with its own language', () => {
    render(<LocaleToggle />);
    const group = screen.getByRole('group', { name: dict.en.navLanguage });
    const links = Array.from(group.querySelectorAll('a'));
    expect(links.map((a) => a.textContent)).toEqual(['EN', 'ไทย']);
    expect(links.map((a) => a.getAttribute('lang'))).toEqual(['en', 'th']);
    expect(links.map((a) => a.getAttribute('hreflang'))).toEqual(['en', 'th']);
  });

  it('marks the current language and points both links at the same page', () => {
    vi.mocked(usePathname).mockReturnValue('/th/career');
    render(<LocaleToggle />);
    const [en, th] = Array.from(document.querySelectorAll('.lt-seg a'));
    expect(en.getAttribute('href')).toBe('/en/career');
    expect(th.getAttribute('href')).toBe('/th/career');
    expect(en.hasAttribute('aria-current')).toBe(false);
    expect(th.getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('group').getAttribute('aria-label')).toBe(dict.th.navLanguage);
  });

  it('falls back to English on the root when there is no router (unit tests, not-found)', () => {
    vi.mocked(usePathname).mockReturnValue(null as unknown as string);
    render(<LocaleToggle />);
    expect(document.querySelector('.lt-seg a[aria-current]')?.textContent).toBe('EN');
  });

  it('stretches to the full row inside the phone menu', () => {
    const { container } = render(<LocaleToggle wide />);
    expect(container.querySelector('.lt-seg')?.classList.contains('lt-wide')).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/locale-toggle.test.tsx`
Expected: FAIL. `switchLocaleHref` is not exported, and there is no element with role `group` (the old markup is a `<nav>`).

- [ ] **Step 3: Implement**

Replace `src/components/LocaleToggle.tsx` with:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { dict } from '@/lib/dictionary';
import type { Locale } from '@/lib/models';
import './locale-toggle.css';

/** The same page in the other language: swap the first path segment and keep
 *  the rest (the logic the old toggle had). The hash is not carried: section
 *  ids exist on both locales' home pages, and a sheet or palette state isn't
 *  worth restoring across a language switch. */
export function switchLocaleHref(pathname: string, target: Locale): string {
  const rest = pathname.split('/').slice(2).filter(Boolean).join('/');
  return `/${target}${rest ? `/${rest}` : ''}`;
}

const ITEMS: readonly { locale: Locale; label: string }[] = [
  { locale: 'en', label: 'EN' },
  { locale: 'th', label: 'ไทย' },
];

/**
 * EN/ไทย as a segmented control (spec §6; prototype `.seg`). These stay real
 * links, not buttons: each language is its own route (/en, /th) with its own
 * hreflang, so the switch works without JavaScript and search engines see both.
 * The group is labelled in the CURRENT page's language; the two labels are
 * always the language's own name.
 */
export default function LocaleToggle({ wide = false }: { wide?: boolean }) {
  const pathname = usePathname() ?? '/en';
  const current: Locale = pathname.split('/')[1] === 'th' ? 'th' : 'en';
  return (
    <div role="group" aria-label={dict[current].navLanguage} className={wide ? 'lt-seg lt-wide' : 'lt-seg'}>
      {ITEMS.map(({ locale, label }) => (
        <Link
          key={locale}
          href={switchLocaleHref(pathname, locale)}
          prefetch={false}
          lang={locale}
          hrefLang={locale}
          aria-current={current === locale ? 'page' : undefined}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
```

Create `src/components/locale-toggle.css`:

```css
/* LocaleToggle — EN/ไทย segmented control (prototype .seg). Used in the nav
   capsule and, stretched (.lt-wide), in the phone menu; P4's footer can reuse
   it. The raised segment is the current language. The ::after grows each
   segment's hit area to at least 44 px tall without changing its look. */
@layer components {
  .lt-seg { display: inline-flex; gap: 2px; padding: 2px; border-radius: 16px; background: var(--glass-ctl); }
  .lt-seg a {
    position: relative;
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 40px; min-height: 28px; padding: 0 10px;
    border-radius: 14px;
    font-size: 14px; color: var(--ink-1); text-decoration: none;
  }
  .lt-seg a::after { content: ""; position: absolute; inset: -8px -1px; }
  .lt-seg a[aria-current] { background: var(--canvas); box-shadow: var(--e1); font-weight: 600; }
  .lt-seg.lt-wide { display: flex; width: 100%; }
  .lt-seg.lt-wide a { flex: 1; min-height: 36px; font-size: 15px; }
}
```

Delete the two old cases from `tests/site-nav.test.tsx` as described under **Files**.

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/locale-toggle.test.tsx tests/site-nav.test.tsx && npx tsc --noEmit`
Expected: PASS. The remaining old site-nav cases don't touch the toggle's markup.

- [ ] **Step 5: Commit**

```bash
git add src/components/LocaleToggle.tsx src/components/locale-toggle.css tests/locale-toggle.test.tsx tests/site-nav.test.tsx
git commit -m "feat(nav): EN/ไทย as a segmented control, still real per-locale links

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 7: Section links and the phone menu — `nav.ts`, `NavMenu`

**Files:**
- Create: `src/lib/nav.ts`, `src/components/NavMenu.tsx`, `src/components/nav-menu.css`
- Create: `tests/helpers/dialog.ts`, `tests/helpers/profile.ts`
- Modify: `src/lib/dictionary.ts` (append P1 nav keys to `en` and `th`)
- Modify: `tests/dictionary.test.ts` (`sharedKeys`, currently line 32)
- Test: `tests/nav.test.ts` (new), `tests/nav-menu.test.tsx` (new)

**Interfaces:**
- Consumes:
  - `openPalette` (Task 1) and `mailtoHref` (Task 1)
  - `LocaleToggle({ wide })` (Task 6)
  - **P0** `ThemeToggle`, assumed `export default function ThemeToggle({ locale }: { locale: Locale })` (see Contract gaps)
  - **P0** `Icon`, assumed `import { Icon } from '@/components/icons'`
  - C9 `.btn .btn-fill .btn-out`
- Produces:
  - nav.ts: `NAV_SECTIONS = ['work','career','story','faq'] as const` · `type NavSection` · `NAV_LABEL_KEY: Record<NavSection, 'navWork'|'navCareer'|'navStory'|'navFaq'>` · `sectionHref(hash: \`#${string}\`, pathname: string, locale: Locale): string`
  - `export default function NavMenu({ locale, profile, active }: { locale: Locale; profile: Profile; active: NavSection | null })`, which renders the Menu button `.nm-open` and a `<dialog class="nm">`
  - dictionary keys `navWork navCareer navStory navFaq navBrandAria navMenu navCloseMenu navSearchPrompt navAppearance copyEmail resumeShort`
  - test helpers `stubDialog()` and `makeProfile(overrides?)`

- [ ] **Step 1: Write the failing tests**

Create `tests/helpers/dialog.ts`:

```ts
/**
 * jsdom 30 has <dialog> but no showModal()/close(). These stand in for the
 * browser: showModal()/show() set `open`, and close() clears it and fires the
 * non-bubbling `close` event, the one React's onClose listens for (a real
 * browser also fires it after Esc).
 */
export function stubDialog(): void {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.show = function show(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}
```

Create `tests/helpers/profile.ts`:

```ts
import type { Profile } from '@/lib/models';

/** A complete Profile for the White Edition tests, with prototype copy.
 *  Later phases add their new Profile fields here. */
export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    name: 'Suwichak Jarunopratamp (Klao)',
    headline: {
      en: 'Business developer who builds his own tools.',
      th: 'นัก Business Development ที่สร้างเครื่องมือ|ใช้เอง',
    },
    byline: { en: 'Bangkok · BD × Data Analytics', th: 'กรุงเทพฯ · BD × Data Analytics' },
    now: {
      en: 'Senior BD at Actmedia · building AI tools nights & weekends',
      th: 'Senior BD ที่ Actmedia · สร้างเครื่องมือ AI นอกเวลางาน',
    },
    photoSrc: '/images/portrait.jpg',
    linkedin: 'https://linkedin.example/klao',
    github: 'https://github.example/klao',
    email: 'klao@example.com',
    resumeUrl: '/resume.pdf',
    clients: [],
    nameNative: null,
    ...overrides,
  };
}
```

Create `tests/nav.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { dict } from '@/lib/dictionary';
import { NAV_LABEL_KEY, NAV_SECTIONS, sectionHref } from '@/lib/nav';

describe('NAV_SECTIONS (C7)', () => {
  it('lists the four section links in page order', () => {
    expect(NAV_SECTIONS).toEqual(['work', 'career', 'story', 'faq']);
  });

  it('labels them with the prototype words in both languages', () => {
    expect(NAV_SECTIONS.map((s) => dict.en[NAV_LABEL_KEY[s]])).toEqual(['Projects', 'Career', 'How I work', 'FAQ']);
    expect(NAV_SECTIONS.map((s) => dict.th[NAV_LABEL_KEY[s]])).toEqual(['โปรเจกต์', 'เส้นทางอาชีพ', 'วิธีทำงาน', 'FAQ']);
  });
});

describe('sectionHref', () => {
  it('stays a bare hash on the home page, with or without a trailing slash', () => {
    expect(sectionHref('#work', '/en', 'en')).toBe('#work');
    expect(sectionHref('#faq', '/th/', 'th')).toBe('#faq');
  });

  it('points back at the same-language home page from any other route', () => {
    expect(sectionHref('#work', '/en/projects', 'en')).toBe('/en#work');
    expect(sectionHref('#contact', '/th/writing/some-post', 'th')).toBe('/th#contact');
  });
});
```

Create `tests/nav-menu.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NavMenu from '@/components/NavMenu';
import { dict } from '@/lib/dictionary';
import { PALETTE_EVENT } from '@/lib/deep-link';
import type { Locale } from '@/lib/models';
import { stubDialog } from './helpers/dialog';
import { makeProfile } from './helpers/profile';

vi.mock('next/navigation', () => ({ usePathname: vi.fn(() => '/en') }));
// P0's ThemeToggle has its own tests; here it only has to be present, in the right language.
vi.mock('@/components/ThemeToggle', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ locale }: { locale: string }) => createElement('div', { 'data-testid': 'theme-toggle', 'data-locale': locale }),
  };
});

beforeEach(() => {
  stubDialog();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.mocked(usePathname).mockReturnValue('/en');
});

const menuButton = (locale: Locale = 'en') => screen.getByRole('button', { name: dict[locale].navMenu });
const openMenu = (locale: Locale = 'en') => {
  fireEvent.click(menuButton(locale));
  return document.querySelector('dialog') as HTMLDialogElement;
};

describe('NavMenu', () => {
  it('is a Menu button that opens a modal dialog and reports its state', () => {
    render(<NavMenu locale="en" profile={makeProfile()} active={null} />);
    const button = menuButton();
    expect(button.getAttribute('aria-haspopup')).toBe('dialog');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    const dialog = openMenu();
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.getAttribute('aria-label')).toBe(dict.en.navMenu);
    expect(button.getAttribute('aria-controls')).toBe(dialog.id);
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('lists the four sections and marks the one in view', () => {
    render(<NavMenu locale="en" profile={makeProfile()} active="career" />);
    const dialog = openMenu();
    const links = Array.from(dialog.querySelectorAll<HTMLAnchorElement>('a[data-sec]'));
    expect(links.map((a) => a.textContent)).toEqual([dict.en.navWork, dict.en.navCareer, dict.en.navStory, dict.en.navFaq]);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['#work', '#career', '#story', '#faq']);
    expect(links[1].getAttribute('aria-current')).toBe('location');
    expect(links[0].hasAttribute('aria-current')).toBe(false);
  });

  it('points the section links at the home page from any other route', () => {
    vi.mocked(usePathname).mockReturnValue('/th/projects');
    render(<NavMenu locale="th" profile={makeProfile()} active={null} />);
    const dialog = openMenu('th');
    const hrefs = Array.from(dialog.querySelectorAll('a[data-sec]')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/th#work', '/th#career', '/th#story', '/th#faq']);
    expect(within(dialog).getByRole('link', { name: 'Suwichak กลับขึ้นด้านบน' }).getAttribute('href')).toBe('/th#top');
  });

  it('offers the actions: start a conversation, copy the email, the résumé', () => {
    render(<NavMenu locale="en" profile={makeProfile()} active={null} />);
    const dialog = openMenu();
    expect(within(dialog).getByRole('link', { name: dict.en.startConversation }).getAttribute('href')).toBe(
      'mailto:klao@example.com?subject=Hello%20from%20klao-site',
    );
    expect(within(dialog).getByRole('button', { name: dict.en.copyEmail })).toBeTruthy();
    const resume = within(dialog).getByRole('link', { name: dict.en.resumeShort });
    expect(resume.getAttribute('href')).toBe('/resume.pdf');
    expect(resume.getAttribute('target')).toBe('_blank');
  });

  it('copies the email, confirms it on the button, and says so to screen readers', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    render(<NavMenu locale="en" profile={makeProfile()} active={null} />);
    const dialog = openMenu();
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: dict.en.copyEmail }));
    });
    expect(writeText).toHaveBeenCalledWith('klao@example.com');
    expect(within(dialog).getByRole('button', { name: dict.en.copied })).toBeTruthy();
    expect(dialog.querySelector('[aria-live="polite"]')?.textContent).toBe(dict.en.copied);
  });

  it('claims nothing when the clipboard refuses (non-secure context)', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    render(<NavMenu locale="en" profile={makeProfile()} active={null} />);
    const dialog = openMenu();
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: dict.en.copyEmail }));
    });
    expect(within(dialog).getByRole('button', { name: dict.en.copyEmail })).toBeTruthy();
    expect(dialog.querySelector('[aria-live="polite"]')?.textContent).toBe('');
  });

  it('leaves out every action and link it has no data for', () => {
    render(<NavMenu locale="en" profile={makeProfile({ email: '', resumeUrl: null, linkedin: '', github: '' })} active={null} />);
    const dialog = openMenu();
    expect(dialog.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(within(dialog).queryByRole('button', { name: dict.en.copyEmail })).toBeNull();
    expect(within(dialog).queryByRole('link', { name: dict.en.resumeShort })).toBeNull();
    expect(within(dialog).queryByRole('link', { name: /LinkedIn/ })).toBeNull();
    expect(within(dialog).queryByRole('link', { name: /GitHub/ })).toBeNull();
  });

  it('links LinkedIn and GitHub in a new tab without leaking a referrer', () => {
    render(<NavMenu locale="en" profile={makeProfile()} active={null} />);
    const dialog = openMenu();
    const li = within(dialog).getByRole('link', { name: /LinkedIn/ });
    expect(li.getAttribute('href')).toBe('https://linkedin.example/klao');
    expect(li.getAttribute('target')).toBe('_blank');
    expect(li.getAttribute('rel')).toBe('noreferrer');
    expect(within(dialog).getByRole('link', { name: /GitHub/ }).getAttribute('href')).toBe('https://github.example/klao');
  });

  it('hands off to the ⌘K palette: closes itself and dispatches klao:palette', () => {
    const seen = vi.fn();
    window.addEventListener(PALETTE_EVENT, seen);
    render(<NavMenu locale="en" profile={makeProfile()} active={null} />);
    const dialog = openMenu();
    fireEvent.click(within(dialog).getByRole('button', { name: dict.en.navSearchPrompt }));
    expect(seen).toHaveBeenCalledTimes(1);
    expect(dialog.hasAttribute('open')).toBe(false);
    window.removeEventListener(PALETTE_EVENT, seen);
  });

  it('carries the language and appearance switches, in the page language', () => {
    vi.mocked(usePathname).mockReturnValue('/th');
    render(<NavMenu locale="th" profile={makeProfile()} active={null} />);
    const dialog = openMenu('th');
    expect(within(dialog).getByRole('group', { name: dict.th.navLanguage })).toBeTruthy();
    expect(within(dialog).getByText(dict.th.navAppearance)).toBeTruthy();
    expect(within(dialog).getByTestId('theme-toggle').getAttribute('data-locale')).toBe('th');
  });

  it('closes from its close button and hands focus back to Menu', () => {
    render(<NavMenu locale="en" profile={makeProfile()} active={null} />);
    const dialog = openMenu();
    fireEvent.click(within(dialog).getByRole('button', { name: dict.en.navCloseMenu }));
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(menuButton());
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
  });

  it('closes when a section link is followed, and when the backdrop is clicked', () => {
    render(<NavMenu locale="en" profile={makeProfile()} active={null} />);
    let dialog = openMenu();
    fireEvent.click(dialog.querySelector('a[data-sec="faq"]') as HTMLElement);
    expect(dialog.hasAttribute('open')).toBe(false);
    dialog = openMenu();
    fireEvent.click(dialog); // the target is the dialog itself = its backdrop
    expect(dialog.hasAttribute('open')).toBe(false);
  });

  it('stays in sync when the browser closes it on Esc (the dialog fires close by itself)', () => {
    render(<NavMenu locale="en" profile={makeProfile()} active={null} />);
    const dialog = openMenu();
    act(() => {
      dialog.close();
    });
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/nav.test.ts tests/nav-menu.test.tsx`
Expected: FAIL with `Failed to resolve import "@/lib/nav"` and `Failed to resolve import "@/components/NavMenu"`.

- [ ] **Step 3: Implement**

Append to the **end of the `en` object** in `src/lib/dictionary.ts` (just before its closing `};`):

```ts
  // White Edition P1 — navigation (contract C7). Words from the prototype's UI.en.
  navWork: 'Projects',
  navCareer: 'Career',
  navStory: 'How I work',
  navFaq: 'FAQ',
  // `{name}` becomes the first word of profile.name. The visible brand text is
  // that name, so the accessible name starts with it (WCAG 2.5.3).
  navBrandAria: '{name}, back to top',
  navMenu: 'Menu',
  navCloseMenu: 'Close menu',
  navSearchPrompt: 'Search or jump to…',
  navAppearance: 'Appearance',
  copyEmail: 'Copy email',
  resumeShort: 'Résumé',
```

Append to the **end of the `th` object** (just before its closing `};`):

```ts
  navWork: 'โปรเจกต์',
  navCareer: 'เส้นทางอาชีพ',
  navStory: 'วิธีทำงาน',
  navFaq: 'FAQ',
  navBrandAria: '{name} กลับขึ้นด้านบน',
  navMenu: 'เมนู',
  navCloseMenu: 'ปิดเมนู',
  navSearchPrompt: 'ค้นหา หรือไปที่…',
  navAppearance: 'การแสดงผล',
  copyEmail: 'คัดลอกอีเมล',
  resumeShort: 'เรซูเม่',
```

In `tests/dictionary.test.ts`, change `const sharedKeys = new Set<string>();` to the line below. If P0 already added entries, keep them and add `'navFaq'`.

```ts
    const sharedKeys = new Set<string>(['navFaq']); // "FAQ" is the Thai UI's word too (prototype UI.th.nav)
```

Create `src/lib/nav.ts`:

```ts
import type { Locale } from './models';

/**
 * C7: the capsule's section links, in page order. Contact is not in this list:
 * it is the capsule's own pill (and the thumb bar's first button), because it
 * is an action, not a place to read.
 */
export const NAV_SECTIONS = ['work', 'career', 'story', 'faq'] as const;
export type NavSection = (typeof NAV_SECTIONS)[number];

/** The dictionary key for each section link's label. */
export const NAV_LABEL_KEY = {
  work: 'navWork',
  career: 'navCareer',
  story: 'navStory',
  faq: 'navFaq',
} as const satisfies Record<NavSection, string>;

/**
 * A home-page anchor that works from every route: a bare hash on the home page
 * (the browser scrolls in place), `/{locale}#id` everywhere else, so a link
 * never points at an id the current page doesn't have. The same rule as the old
 * SiteNav's `anchorHref`, shared now by the capsule and the phone menu.
 */
export function sectionHref(hash: `#${string}`, pathname: string, locale: Locale): string {
  const home = pathname === `/${locale}` || pathname === `/${locale}/`;
  return home ? hash : `/${locale}${hash}`;
}
```

Create `src/components/NavMenu.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState, type MouseEvent } from 'react';
import { Icon } from '@/components/icons';
import LocaleToggle from '@/components/LocaleToggle';
import ThemeToggle from '@/components/ThemeToggle';
import { dict } from '@/lib/dictionary';
import { openPalette } from '@/lib/deep-link';
import { mailtoHref } from '@/lib/format';
import type { Locale, Profile } from '@/lib/models';
import { NAV_LABEL_KEY, NAV_SECTIONS, sectionHref, type NavSection } from '@/lib/nav';
import './nav-menu.css';

const COPIED_MS = 2000;

/**
 * The phone menu (spec §6; prototype renderMenu): the Menu button that sits in
 * the capsule at ≤ 899 px, and the panel it opens: search, the four sections,
 * the three actions, language, appearance, LinkedIn and GitHub.
 *
 * A native modal <dialog>: the browser traps focus, makes the page behind it
 * inert, and closes it on Esc, so none of that is hand-rolled here (the old
 * overlay did all three by hand). Every way out (close button, a link, the
 * backdrop, Esc) ends in the dialog's `close` event, and onClose is the one
 * place that syncs state and hands focus back to Menu.
 */
export default function NavMenu({ locale, profile, active }: { locale: Locale; profile: Profile; active: NavSection | null }) {
  const t = dict[locale];
  const pathname = usePathname() ?? `/${locale}`;
  const href = (hash: `#${string}`) => sectionHref(hash, pathname, locale);
  const first = profile.name.trim().split(/\s+/)[0];
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  const show = () => {
    dialogRef.current?.showModal();
    setOpen(true);
  };
  const hide = () => dialogRef.current?.close();
  const onClose = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };
  // A click whose target is the <dialog> itself landed on its ::backdrop.
  const onBackdrop = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) hide();
  };
  const search = () => {
    hide();
    openPalette();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
    } catch {
      // No clipboard (non-secure context) or permission refused: say nothing
      // rather than claim a copy that didn't happen. The address is still in
      // the mailto link above.
      return;
    }
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), COPIED_MS);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="nm-open"
        aria-haspopup="dialog"
        aria-controls={id}
        aria-expanded={open}
        onClick={show}
      >
        {t.navMenu}
      </button>
      <dialog ref={dialogRef} id={id} className="nm" aria-label={t.navMenu} onClose={onClose} onClick={onBackdrop}>
        <div className="nm-head">
          <Link href={href('#top')} className="nm-brand" aria-label={t.navBrandAria.replace('{name}', first)} onClick={hide}>
            <span className="nm-mono" aria-hidden="true">
              {first.charAt(0).toUpperCase()}
            </span>
            <span>{first}</span>
          </Link>
          <button type="button" className="nm-close" aria-label={t.navCloseMenu} onClick={hide}>
            <Icon name="x" />
          </button>
        </div>

        <button type="button" className="nm-search" onClick={search}>
          <Icon name="magnifying-glass" /> {t.navSearchPrompt}
        </button>

        <div className="nm-grid">
          {NAV_SECTIONS.map((sec) => (
            <Link
              key={sec}
              href={href(`#${sec}`)}
              data-sec={sec}
              aria-current={active === sec ? 'location' : undefined}
              onClick={hide}
            >
              {t[NAV_LABEL_KEY[sec]]}
            </Link>
          ))}
        </div>

        {(profile.email || profile.resumeUrl) && (
          <>
            <div className="nm-div" />
            <div className="nm-act">
              {profile.email && (
                <a className="btn btn-fill" href={mailtoHref(profile.email)}>
                  {t.startConversation}
                </a>
              )}
              {profile.email && (
                <button type="button" className="btn btn-out" onClick={copy}>
                  {copied ? t.copied : t.copyEmail}
                </button>
              )}
              {profile.resumeUrl && (
                <a className="btn btn-out" href={profile.resumeUrl} target="_blank" rel="noopener">
                  {t.resumeShort}
                </a>
              )}
            </div>
            <span className="sr-only" aria-live="polite">
              {copied ? t.copied : ''}
            </span>
          </>
        )}

        <div className="nm-div" />
        <div className="nm-pref">
          <p className="nm-label">{t.navLanguage}</p>
          <LocaleToggle wide />
          <p className="nm-label">{t.navAppearance}</p>
          <ThemeToggle locale={locale} />
        </div>

        {(profile.linkedin || profile.github) && (
          <div className="nm-links">
            {profile.linkedin && (
              <a href={profile.linkedin} target="_blank" rel="noreferrer">
                LinkedIn ›
              </a>
            )}
            {profile.github && (
              <a href={profile.github} target="_blank" rel="noreferrer">
                GitHub ›
              </a>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
```

Create `src/components/nav-menu.css`:

```css
/* NavMenu — the Menu button and the phone menu panel (prototype .menu-b,
   .menu, .mhead, .msearch, .mgrid, .mact, .mpref, .mlinks). The button only
   exists at ≤ 899 px, where the capsule's own links, ⌘K and Contact fold away.
   Classes are `nm-` so nothing meets C9's shared names; the actions reuse C9's
   `.btn`. Only transform and opacity animate. */
@layer components {
  .nm-open { display: none; }
  @media (max-width: 899px) {
    .nm-open {
      position: relative;
      display: inline-flex; align-items: center;
      min-height: 32px; padding: 0 14px;
      border: 0; border-radius: 16px; background: transparent;
      box-shadow: inset 0 0 0 1px var(--ink-3);
      font-size: 14px; font-weight: 500; color: var(--ink-1);
      cursor: pointer;
    }
    .nm-open::after { content: ""; position: absolute; inset: -6px -2px; }
  }

  .nm {
    width: min(358px, 100% - 32px); max-width: none; max-height: calc(100svh - 16px);
    margin: 8px auto auto; padding: 16px;
    border: 0; border-radius: 28px;
    background: var(--card); color: var(--ink-1);
    box-shadow: 0 24px 60px -20px rgb(0 0 0 / .35);
    overflow: auto; overscroll-behavior: contain;
  }
  .nm::backdrop { background: rgb(0 0 0 / .24); }
  @media (prefers-reduced-motion: no-preference) {
    .nm[open] { animation: nm-in var(--dur-ui) var(--ease-settle); }
  }
  @media (prefers-reduced-motion: reduce) {
    .nm[open] { animation: nm-fade 150ms linear; }
  }

  .nm-head { display: flex; align-items: center; justify-content: space-between; }
  .nm-brand { display: inline-flex; align-items: center; gap: 10px; min-height: 44px; font-size: 17px; font-weight: 600; color: var(--ink-1); text-decoration: none; }
  .nm-mono { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--ink-1); color: var(--canvas); font-size: 14px; font-weight: 600; letter-spacing: 0; }
  .nm-close {
    position: relative;
    display: grid; place-items: center;
    width: 36px; height: 36px;
    border: 0; border-radius: 50%;
    background: var(--glass-ctl); color: var(--ink-1);
    font-size: 16px; cursor: pointer;
  }
  .nm-close::after { content: ""; position: absolute; inset: -4px; }
  .nm-search {
    display: flex; align-items: center; gap: 10px;
    width: 100%; min-height: 44px; margin-top: 14px; padding: 0 14px;
    border: 0; border-radius: 12px;
    background: var(--mist); color: var(--ink-2);
    font-size: 16px; text-align: left; cursor: pointer;
  }
  .nm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 14px; }
  .nm-grid a {
    display: flex; align-items: center; justify-content: center;
    min-height: 44px; border-radius: 22px;
    box-shadow: inset 0 0 0 1px var(--line);
    font-size: 17px; font-weight: 500; color: var(--ink-1); text-decoration: none;
  }
  .nm-grid a[aria-current] { background: var(--ink-1); color: var(--canvas); box-shadow: none; }
  .nm-div { height: 1px; margin: 16px 0; background: var(--line); }
  .nm-act { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .nm-act .btn { padding: 0 12px; font-size: 16px; }
  .nm-act .btn:first-child { grid-column: 1 / -1; }
  .nm-pref { display: grid; gap: 10px; }
  .nm-label { margin: 0; font-size: 14px; font-weight: 600; color: var(--ink-2); }
  .nm-links { display: flex; gap: 20px; margin-top: 12px; }
  .nm-links a { display: inline-flex; align-items: center; min-height: 44px; font-size: 17px; color: var(--link); text-decoration: none; }

  @keyframes nm-in { from { opacity: 0; transform: translateY(24px) scale(.985); } }
  @keyframes nm-fade { from { opacity: 0; } }
}
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/nav.test.ts tests/nav-menu.test.tsx tests/dictionary.test.ts && npx tsc --noEmit`
Expected: PASS. If `tsc` rejects `<ThemeToggle locale={locale} />` or the `Icon` import, P0 chose a different shape. Adapt this one call site or import and record it under Contract gaps.

- [ ] **Step 5: Commit**

```bash
git add src/lib/nav.ts src/components/NavMenu.tsx src/components/nav-menu.css src/lib/dictionary.ts tests/helpers/dialog.ts tests/helpers/profile.ts tests/nav.test.ts tests/nav-menu.test.tsx tests/dictionary.test.ts
git commit -m "feat(nav): phone menu as a native dialog — search, sections, actions, language, appearance

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 8: Phone thumb bar — `ThumbBar`

**Files:**
- Create: `src/components/ThumbBar.tsx`, `src/components/thumb-bar.css`, `tests/helpers/io.ts`
- Modify: `src/lib/dictionary.ts` (append `navQuickActions` to `en` and `th`)
- Test: `tests/thumb-bar.test.tsx` (new)

**Interfaces:**
- Consumes: `mailtoHref` (Task 1) · `dict.startConversation` (exists) and `dict.resumeShort` (Task 7) · C9 `.glass .btn .btn-fill .btn-out`.
- Produces:
  - `export default function ThumbBar({ locale, profile, heroGone }: { locale: Locale; profile: Profile; heroGone: boolean })`, which renders `div.sn-tbar.glass[role=region]` with `data-show` present when it should be visible
  - dictionary key `navQuickActions`
  - test helper `FakeIO` (`instances`, `watching(el)`, `fire(entries)`, `options`) and `installFakeIO()`

- [ ] **Step 1: Write the failing test**

Create `tests/helpers/io.ts`:

```ts
import { act } from '@testing-library/react';
import { vi } from 'vitest';

type Entry = Partial<IntersectionObserverEntry> & { target: Element };

/**
 * A controllable IntersectionObserver for jsdom, which has none. Components
 * construct it as they would in a browser; a test finds the observer watching
 * an element and delivers the entries a browser would have computed.
 */
export class FakeIO {
  static instances: FakeIO[] = [];
  readonly targets: Element[] = [];
  readonly callback: IntersectionObserverCallback;
  readonly options: IntersectionObserverInit;

  constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
    this.callback = callback;
    this.options = options;
    FakeIO.instances.push(this);
  }

  observe(el: Element): void {
    this.targets.push(el);
  }

  unobserve(el: Element): void {
    const i = this.targets.indexOf(el);
    if (i >= 0) this.targets.splice(i, 1);
  }

  disconnect(): void {
    this.targets.length = 0;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  fire(entries: Entry[]): void {
    act(() => {
      this.callback(entries as IntersectionObserverEntry[], this as unknown as IntersectionObserver);
    });
  }

  /** The newest live observer watching `el`. Throws when there is none, so a
   *  test can never fire into the void and pass by accident. */
  static watching(el: Element): FakeIO {
    const io = [...FakeIO.instances].reverse().find((o) => o.targets.includes(el));
    if (!io) throw new Error(`no IntersectionObserver is watching <${el.tagName.toLowerCase()}${el.id ? ` id="${el.id}"` : ''}>`);
    return io;
  }
}

export function installFakeIO(): void {
  FakeIO.instances = [];
  vi.stubGlobal('IntersectionObserver', FakeIO);
}
```

Create `tests/thumb-bar.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ThumbBar from '@/components/ThumbBar';
import { dict } from '@/lib/dictionary';
import { FakeIO, installFakeIO } from './helpers/io';
import { makeProfile } from './helpers/profile';

vi.mock('next/navigation', () => ({ usePathname: vi.fn(() => '/en') }));

beforeEach(() => {
  installFakeIO();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.mocked(usePathname).mockReturnValue('/en');
});

const bar = () => screen.getByRole('region', { name: dict.en.navQuickActions });
const rect = (top: number) => ({ top }) as DOMRectReadOnly;

describe('ThumbBar', () => {
  it('holds the two phone actions: start a conversation, and the résumé in a new tab', () => {
    render(<ThumbBar locale="en" profile={makeProfile()} heroGone={false} />);
    const links = Array.from(bar().querySelectorAll('a'));
    expect(links.map((a) => a.textContent)).toEqual([dict.en.startConversation, dict.en.resumeShort]);
    expect(links[0].getAttribute('href')).toBe('mailto:klao@example.com?subject=Hello%20from%20klao-site');
    expect(links[1].getAttribute('href')).toBe('/resume.pdf');
    expect(links[1].getAttribute('target')).toBe('_blank');
    expect(bar().classList.contains('glass')).toBe(true);
  });

  it("stays hidden while the hero's own buttons are on screen", () => {
    render(<ThumbBar locale="en" profile={makeProfile()} heroGone={false} />);
    expect(bar().hasAttribute('data-show')).toBe(false);
  });

  it("shows once the hero's buttons have scrolled away", () => {
    render(<ThumbBar locale="en" profile={makeProfile()} heroGone />);
    expect(bar().hasAttribute('data-show')).toBe(true);
  });

  it('steps aside while the contact section, which repeats both actions, is on screen', () => {
    render(
      <>
        <section id="contact" />
        <ThumbBar locale="en" profile={makeProfile()} heroGone />
      </>,
    );
    const contact = document.getElementById('contact')!;
    const io = FakeIO.watching(contact);
    expect(io.options.threshold).toEqual([0, 0.3, 0.6]);
    io.fire([{ target: contact, intersectionRatio: 0.5, isIntersecting: true, boundingClientRect: rect(200) }]);
    expect(bar().hasAttribute('data-show')).toBe(false);
    io.fire([{ target: contact, intersectionRatio: 0, isIntersecting: false, boundingClientRect: rect(2000) }]);
    expect(bar().hasAttribute('data-show')).toBe(true);
  });

  it('counts a tall contact section as on screen once its top passes 70 % of the viewport', () => {
    render(
      <>
        <section id="contact" />
        <ThumbBar locale="en" profile={makeProfile()} heroGone />
      </>,
    );
    const contact = document.getElementById('contact')!;
    FakeIO.watching(contact).fire([{ target: contact, intersectionRatio: 0.1, isIntersecting: true, boundingClientRect: rect(100) }]);
    expect(bar().hasAttribute('data-show')).toBe(false);
  });

  it('steps aside while the on-screen keyboard takes the bottom of the viewport', () => {
    const vv = Object.assign(new EventTarget(), { height: 800 });
    vi.stubGlobal('visualViewport', vv);
    render(<ThumbBar locale="en" profile={makeProfile()} heroGone />);
    expect(bar().hasAttribute('data-show')).toBe(true);
    vv.height = 300; // jsdom's innerHeight is 768: under 75 % means a keyboard is up
    act(() => {
      vv.dispatchEvent(new Event('resize'));
    });
    expect(bar().hasAttribute('data-show')).toBe(false);
  });

  it('renders nothing without an email or a résumé to offer', () => {
    const { container } = render(<ThumbBar locale="en" profile={makeProfile({ email: '', resumeUrl: null })} heroGone />);
    expect(container.innerHTML).toBe('');
  });

  it('speaks Thai', () => {
    render(<ThumbBar locale="th" profile={makeProfile()} heroGone />);
    const region = screen.getByRole('region', { name: dict.th.navQuickActions });
    expect(Array.from(region.querySelectorAll('a')).map((a) => a.textContent)).toEqual([dict.th.startConversation, dict.th.resumeShort]);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/thumb-bar.test.tsx`
Expected: FAIL with `Failed to resolve import "@/components/ThumbBar"`.

- [ ] **Step 3: Implement**

Append to the end of `en` in `src/lib/dictionary.ts`:

```ts
  navQuickActions: 'Quick actions',
```

Append to the end of `th`:

```ts
  navQuickActions: 'ทางลัด',
```

Create `src/components/ThumbBar.tsx`:

```tsx
'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { dict } from '@/lib/dictionary';
import { mailtoHref } from '@/lib/format';
import type { Locale, Profile } from '@/lib/models';
import './thumb-bar.css';

/**
 * The phone thumb bar (spec §6; prototype .tbar): the two actions a visitor
 * came for, within thumb reach. CSS shows it only at ≤ 734 px. It appears once
 * the hero's own buttons have scrolled away above (`heroGone`, measured by
 * SiteNav, which also fills its Contact pill from it). It steps aside while the
 * contact section, which repeats both actions, is on screen, and while the
 * on-screen keyboard takes the bottom of the viewport. An open menu, sheet or
 * palette is a modal dialog in the top layer, which covers the bar by itself.
 */
export default function ThumbBar({ locale, profile, heroGone }: { locale: Locale; profile: Profile; heroGone: boolean }) {
  const t = dict[locale];
  const pathname = usePathname();
  const [contactInView, setContactInView] = useState(false);
  const [keyboard, setKeyboard] = useState(false);

  // Re-run per route: the layout (and this bar) outlives a client-side
  // navigation, and the #contact element on the new page is a different node.
  useEffect(() => {
    setContactInView(false);
    const contact = document.getElementById('contact');
    if (!contact || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setContactInView(
          entry.intersectionRatio >= 0.3 || (entry.isIntersecting && entry.boundingClientRect.top < innerHeight * 0.7),
        );
      },
      { threshold: [0, 0.3, 0.6] },
    );
    io.observe(contact);
    return () => io.disconnect();
  }, [pathname]);

  useEffect(() => {
    const vv = typeof visualViewport === 'undefined' ? null : visualViewport;
    if (!vv) return;
    const onResize = () => setKeyboard(vv.height < 0.75 * innerHeight);
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  if (!profile.email && !profile.resumeUrl) return null;
  const show = heroGone && !contactInView && !keyboard;

  return (
    <div className="sn-tbar glass" role="region" aria-label={t.navQuickActions} data-show={show ? '' : undefined}>
      {profile.email && (
        <a className="btn btn-fill" href={mailtoHref(profile.email)}>
          {t.startConversation}
        </a>
      )}
      {profile.resumeUrl && (
        <a className="btn btn-out" href={profile.resumeUrl} target="_blank" rel="noopener">
          {t.resumeShort}
        </a>
      )}
    </div>
  );
}
```

Create `src/components/thumb-bar.css`:

```css
/* ThumbBar — phone only (spec §5.3: 56 px bar, 44 px buttons, safe area;
   prototype .tbar). Hidden with visibility as well as opacity, so an invisible
   bar is also out of the tab order and the accessibility tree. `.glass` comes
   from C9; the two-class selectors win over anything `.glass` itself sets.
   Only transform and opacity animate (visibility flips at the end). */
@layer components {
  .sn-tbar { display: none; }
  @media (max-width: 734px) {
    .sn-tbar.glass {
      position: fixed; left: 12px; right: 12px; bottom: calc(12px + env(safe-area-inset-bottom)); z-index: 40;
      display: flex; gap: 8px;
      height: 56px; padding: 6px; border-radius: 28px;
      opacity: 0; transform: translateY(140%); visibility: hidden;
      transition: opacity 200ms var(--ease-exit), transform 200ms var(--ease-exit), visibility 0s 200ms;
    }
    .sn-tbar.glass[data-show] {
      opacity: 1; transform: none; visibility: visible;
      transition: opacity var(--dur-ui) var(--ease-settle), transform var(--dur-ui) var(--ease-settle), visibility 0s;
    }
    .sn-tbar .btn { flex: 1; min-height: 44px; padding: 0 12px; font-size: 16px; }
    .sn-tbar .btn-out { flex: 0 0 auto; }
    /* Room at the page's end, so the bar never covers the last line. Only the
       home page (the one with #hero-cta) ever shows the bar. */
    html:has(#hero-cta) body { padding-bottom: 88px; }
  }
  @media (max-width: 360px) {
    .sn-tbar .btn { font-size: 15px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .sn-tbar.glass, .sn-tbar.glass[data-show] { transform: none; }
  }
}
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/thumb-bar.test.tsx tests/dictionary.test.ts && npx tsc --noEmit`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ThumbBar.tsx src/components/thumb-bar.css src/lib/dictionary.ts tests/helpers/io.ts tests/thumb-bar.test.tsx
git commit -m "feat(nav): phone thumb bar — start a conversation and the résumé, within thumb reach

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 9: The capsule — `SiteNav` rewrite

**Files:**
- Modify (full rewrite): `src/components/SiteNav.tsx`, `src/components/site-nav.css`
- Modify: `src/app/globals.css` (delete every old nav rule; see Step 3)
- Modify: `src/lib/dictionary.ts` (append `navContact`, `navSearch`)
- Test (full rewrite): `tests/site-nav.test.tsx`

**Interfaces:**
- Consumes: `NAV_SECTIONS`, `NAV_LABEL_KEY`, `sectionHref`, `NavSection` (Task 7) · `NavMenu` (Task 7) · `ThumbBar` (Task 8) · `LocaleToggle` (Task 6) · `openPalette` (Task 1) · P0 `Icon` · C9 `.glass`.
- Produces: `export default function SiteNav({ locale, profile }: { locale: Locale; profile: Profile })`. Props are unchanged, so `layout.tsx` needs no edit. The component renders `header.sn-wrap > nav.sn-cap.glass` followed by `<ThumbBar>`. It reads the DOM hooks `#work #career #story #faq` (active pill), `#hero-cta` (`heroGone`) and `#contact` (via ThumbBar). Adds dictionary keys `navContact` and `navSearch`.

- [ ] **Step 1: Write the failing test**

Replace `tests/site-nav.test.tsx` with:

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SiteNav from '@/components/SiteNav';
import { dict } from '@/lib/dictionary';
import { PALETTE_EVENT } from '@/lib/deep-link';
import { FakeIO, installFakeIO } from './helpers/io';
import { makeProfile } from './helpers/profile';

vi.mock('next/navigation', () => ({ usePathname: vi.fn(() => '/en') }));
// NavMenu and ThumbBar have their own test files; here they only need to show
// what SiteNav hands them.
vi.mock('@/components/NavMenu', async () => {
  const { createElement } = await import('react');
  return {
    default: (p: { locale: string; active: string | null }) =>
      createElement('div', { 'data-testid': 'nav-menu', 'data-locale': p.locale, 'data-active': p.active ?? '' }),
  };
});
vi.mock('@/components/ThumbBar', async () => {
  const { createElement } = await import('react');
  return {
    default: (p: { heroGone: boolean }) => createElement('div', { 'data-testid': 'thumb-bar', 'data-hero-gone': String(p.heroGone) }),
  };
});

beforeEach(() => {
  installFakeIO();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.mocked(usePathname).mockReturnValue('/en');
});

const profile = makeProfile();
const nav = (locale: 'en' | 'th' = 'en') => screen.getByRole('navigation', { name: dict[locale].navMain });
const sectionLinks = (locale: 'en' | 'th' = 'en') => Array.from(nav(locale).querySelectorAll<HTMLAnchorElement>('a[data-sec]'));
const rect = (top: number) => ({ top }) as DOMRectReadOnly;

// The home page's hooks: the four C7 sections, #top, #contact, and the hero's button row.
function HomeHooks() {
  return (
    <>
      {['top', 'work', 'career', 'story', 'faq', 'contact'].map((id) => (
        <section key={id} id={id} />
      ))}
      <div id="hero-cta" />
    </>
  );
}

describe('SiteNav', () => {
  it('is a floating glass capsule with none of the old scroll chrome', () => {
    const { container } = render(<SiteNav locale="en" profile={profile} />);
    expect(container.querySelector('header')?.className).toBe('sn-wrap');
    expect(nav().classList.contains('glass')).toBe(true);
    expect(nav().classList.contains('sn-cap')).toBe(true);
    fireEvent.scroll(window);
    expect(container.querySelector('.nav-on-light, .nav-solid, .nav-hidden, .nav-chrome')).toBeNull();
  });

  it('opens with the brand: monogram and first name, back to the top', () => {
    render(<SiteNav locale="en" profile={profile} />);
    const brand = within(nav()).getByRole('link', { name: 'Suwichak, back to top' });
    expect(brand.getAttribute('href')).toBe('#top');
    expect(brand.querySelector('.sn-mono')?.textContent).toBe('S');
    expect(brand.querySelector('.sn-mono')?.nextElementSibling?.textContent).toBe('Suwichak');
  });

  it('derives the brand from profile.name, never a hardcoded string', () => {
    render(<SiteNav locale="en" profile={makeProfile({ name: 'zara test' })} />);
    expect(within(nav()).getByRole('link', { name: 'zara, back to top' }).querySelector('.sn-mono')?.textContent).toBe('Z');
  });

  it('links the four C7 sections in page order, as bare hashes on the home page', () => {
    render(<SiteNav locale="en" profile={profile} />);
    expect(sectionLinks().map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      [dict.en.navWork, '#work'],
      [dict.en.navCareer, '#career'],
      [dict.en.navStory, '#story'],
      [dict.en.navFaq, '#faq'],
    ]);
    expect(within(nav()).getByRole('link', { name: dict.en.navContact }).getAttribute('href')).toBe('#contact');
  });

  it('points every home anchor at /{locale}#id from another route, never a dead hash', () => {
    vi.mocked(usePathname).mockReturnValue('/th/projects');
    render(<SiteNav locale="th" profile={profile} />);
    expect(sectionLinks('th').map((a) => a.getAttribute('href'))).toEqual(['/th#work', '/th#career', '/th#story', '/th#faq']);
    expect(within(nav('th')).getByRole('link', { name: dict.th.navContact }).getAttribute('href')).toBe('/th#contact');
    expect(within(nav('th')).getByRole('link', { name: 'Suwichak กลับขึ้นด้านบน' }).getAttribute('href')).toBe('/th#top');
  });

  it('speaks Thai on /th', () => {
    vi.mocked(usePathname).mockReturnValue('/th');
    render(<SiteNav locale="th" profile={profile} />);
    expect(sectionLinks('th').map((a) => a.textContent)).toEqual(['โปรเจกต์', 'เส้นทางอาชีพ', 'วิธีทำงาน', 'FAQ']);
    expect(screen.getByTestId('nav-menu').getAttribute('data-locale')).toBe('th');
  });

  it('has a ⌘K button that asks the palette to open (C8), harmless until the palette exists', () => {
    const seen = vi.fn();
    window.addEventListener(PALETTE_EVENT, seen);
    render(<SiteNav locale="en" profile={profile} />);
    const button = within(nav()).getByRole('button', { name: dict.en.navSearch });
    expect(button.getAttribute('aria-keyshortcuts')).toBe('Meta+K Control+K');
    fireEvent.click(button);
    expect(seen).toHaveBeenCalledTimes(1);
    expect((seen.mock.calls[0][0] as CustomEvent).detail).toEqual({});
    window.removeEventListener(PALETTE_EVENT, seen);
  });

  it('puts ⌘K, the EN/ไทย switch, Contact and the phone Menu on the right, in that order', () => {
    render(<SiteNav locale="en" profile={profile} />);
    const right = Array.from(nav().querySelector('.sn-right')!.children);
    expect(right[0].getAttribute('aria-label')).toBe(dict.en.navSearch);
    expect(right[1].getAttribute('role')).toBe('group');
    expect(right[1].getAttribute('aria-label')).toBe(dict.en.navLanguage);
    expect(right[2].textContent).toBe(dict.en.navContact);
    expect(right[3].getAttribute('data-testid')).toBe('nav-menu');
  });

  it('slides the active pill onto the section crossing the middle band of the viewport', () => {
    render(
      <>
        <HomeHooks />
        <SiteNav locale="en" profile={profile} />
      </>,
    );
    const work = document.getElementById('work')!;
    const career = document.getElementById('career')!;
    const io = FakeIO.watching(work);
    expect(io.options.rootMargin).toBe('-45% 0px -54% 0px');
    expect(FakeIO.watching(career)).toBe(io); // one observer for all four
    io.fire([{ target: work, isIntersecting: true }]);
    expect(sectionLinks()[0].getAttribute('aria-current')).toBe('location');
    expect(nav().querySelector('.sn-act')!.hasAttribute('data-on')).toBe(true);
    expect(screen.getByTestId('nav-menu').getAttribute('data-active')).toBe('work');
    io.fire([
      { target: work, isIntersecting: false },
      { target: career, isIntersecting: true },
    ]);
    expect(sectionLinks().map((a) => a.hasAttribute('aria-current'))).toEqual([false, true, false, false]);
    io.fire([{ target: career, isIntersecting: false }]);
    expect(sectionLinks().some((a) => a.hasAttribute('aria-current'))).toBe(false);
    expect(nav().querySelector('.sn-act')!.hasAttribute('data-on')).toBe(false);
  });

  it('watches nothing on a page without those hooks (every route but home)', () => {
    render(<SiteNav locale="en" profile={profile} />);
    // Checked by what SiteNav would observe, not by a global count, so an
    // observer some other library creates can't make this pass or fail.
    expect(FakeIO.instances.find((o) => o.options.rootMargin === '-45% 0px -54% 0px')).toBeUndefined();
    expect(FakeIO.instances.some((o) => o.targets.some((el) => el.tagName === 'SECTION' || el.id === 'hero-cta'))).toBe(false);
  });

  it('fills Contact and wakes the thumb bar once the hero buttons scroll away above', () => {
    render(
      <>
        <HomeHooks />
        <SiteNav locale="en" profile={profile} />
      </>,
    );
    const cta = document.getElementById('hero-cta')!;
    const contact = within(nav()).getByRole('link', { name: dict.en.navContact });
    expect(contact.hasAttribute('data-filled')).toBe(false);
    expect(screen.getByTestId('thumb-bar').getAttribute('data-hero-gone')).toBe('false');
    FakeIO.watching(cta).fire([{ target: cta, isIntersecting: false, boundingClientRect: rect(-120) }]);
    expect(contact.hasAttribute('data-filled')).toBe(true);
    expect(screen.getByTestId('thumb-bar').getAttribute('data-hero-gone')).toBe('true');
    FakeIO.watching(cta).fire([{ target: cta, isIntersecting: true, boundingClientRect: rect(300) }]);
    expect(contact.hasAttribute('data-filled')).toBe(false);
  });

  it('does not count the hero buttons as gone while they are still below the fold', () => {
    render(
      <>
        <HomeHooks />
        <SiteNav locale="en" profile={profile} />
      </>,
    );
    const cta = document.getElementById('hero-cta')!;
    FakeIO.watching(cta).fire([{ target: cta, isIntersecting: false, boundingClientRect: rect(1200) }]);
    expect(within(nav()).getByRole('link', { name: dict.en.navContact }).hasAttribute('data-filled')).toBe(false);
  });

  it('server-renders every link, so the nav works before (and without) JavaScript (Review Focus #4)', () => {
    const html = renderToStaticMarkup(<SiteNav locale="en" profile={profile} />);
    for (const href of ['#top', '#work', '#career', '#story', '#faq', '#contact', '/th']) {
      expect(html).toContain(`href="${href}"`);
    }
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/site-nav.test.tsx`
Expected: FAIL. The old component renders `header.nav-chrome` and has no `.sn-cap`, no ⌘K button and no Contact link.

- [ ] **Step 3: Implement**

Append to the end of `en` in `src/lib/dictionary.ts`:

```ts
  navContact: 'Contact',
  navSearch: 'Search (⌘K)',
```

Append to the end of `th`:

```ts
  navContact: 'ติดต่อ',
  navSearch: 'ค้นหา (⌘K)',
```

Replace `src/components/SiteNav.tsx` with:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import LocaleToggle from '@/components/LocaleToggle';
import NavMenu from '@/components/NavMenu';
import ThumbBar from '@/components/ThumbBar';
import { dict } from '@/lib/dictionary';
import { openPalette } from '@/lib/deep-link';
import type { Locale, Profile } from '@/lib/models';
import { NAV_LABEL_KEY, NAV_SECTIONS, sectionHref, type NavSection } from '@/lib/nav';
import './site-nav.css';

/** The line a section must cross to count as "the one you're reading": a thin
 *  band 45 % of the way down the viewport (prototype syncActive). */
const ACTIVE_BAND = '-45% 0px -54% 0px';

/**
 * The floating capsule (spec §5.4, §6; prototype .cap-nav). Always visible:
 * nothing hides it on scroll, and nothing re-colours it over a band, because
 * the White Edition page has one light surface and the glass carries the
 * contrast. The old nav-on-light probe and its hide-on-scroll are gone.
 *
 * Desktop: brand · four section links with a sliding pill on the one in view ·
 * ⌘K · EN/ไทย · Contact (filled once the hero's own buttons have scrolled away).
 * At ≤ 899 px the links, ⌘K and Contact fold into NavMenu; at ≤ 734 px
 * ThumbBar carries the two actions.
 */
export default function SiteNav({ locale, profile }: { locale: Locale; profile: Profile }) {
  const t = dict[locale];
  // usePathname() is null outside a mounted App Router (unit tests); the
  // locale's own root reproduces the home page's in-page behaviour there.
  const pathname = usePathname() ?? `/${locale}`;
  const href = (hash: `#${string}`) => sectionHref(hash, pathname, locale);
  const first = profile.name.trim().split(/\s+/)[0];
  const [active, setActive] = useState<NavSection | null>(null);
  const [heroGone, setHeroGone] = useState(false);
  const linksRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  // Which section is being read. Re-run per route: the layout, and so this
  // nav, outlives a client-side navigation, and other routes have none of
  // these ids (nothing is observed there).
  useEffect(() => {
    setActive(null);
    if (typeof IntersectionObserver === 'undefined') return;
    const sections = NAV_SECTIONS.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;
    const inBand = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) inBand.set(e.target.id, e.isIntersecting);
        setActive(NAV_SECTIONS.find((id) => inBand.get(id)) ?? null);
      },
      { rootMargin: ACTIVE_BAND },
    );
    for (const el of sections) io.observe(el);
    return () => io.disconnect();
  }, [pathname]);

  // The hero's buttons have left the viewport upwards. A row still below the
  // fold (top > 0) doesn't count: the visitor hasn't passed it yet.
  useEffect(() => {
    setHeroGone(false);
    const cta = document.getElementById('hero-cta');
    if (!cta || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setHeroGone(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    io.observe(cta);
    return () => io.disconnect();
  }, [pathname]);

  // Put the pill under the active link. It slides with transform only; its
  // width is set without a transition (only transform and opacity animate).
  // Measured before paint, and again whenever the link row resizes (web font
  // swap, locale change).
  useLayoutEffect(() => {
    const box = linksRef.current;
    const pill = pillRef.current;
    if (!box || !pill) return;
    const place = () => {
      const link = active ? box.querySelector<HTMLAnchorElement>(`a[data-sec="${active}"]`) : null;
      if (!link) {
        pill.removeAttribute('data-on');
        return;
      }
      pill.style.width = `${link.offsetWidth}px`;
      pill.style.transform = `translateX(${link.offsetLeft}px)`;
      pill.setAttribute('data-on', '');
    };
    place();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(place);
    ro.observe(box);
    return () => ro.disconnect();
  }, [active, locale]);

  return (
    <>
      <header className="sn-wrap">
        <nav className="sn-cap glass" aria-label={t.navMain}>
          <Link href={href('#top')} className="sn-brand" aria-label={t.navBrandAria.replace('{name}', first)}>
            <span className="sn-mono" aria-hidden="true">
              {first.charAt(0).toUpperCase()}
            </span>
            <span>{first}</span>
          </Link>
          <div className="sn-links" ref={linksRef}>
            <span className="sn-act" ref={pillRef} aria-hidden="true" />
            {NAV_SECTIONS.map((sec) => (
              <Link key={sec} href={href(`#${sec}`)} data-sec={sec} aria-current={active === sec ? 'location' : undefined}>
                {t[NAV_LABEL_KEY[sec]]}
              </Link>
            ))}
          </div>
          <div className="sn-right">
            <button
              type="button"
              className="sn-icon sn-search"
              aria-label={t.navSearch}
              aria-keyshortcuts="Meta+K Control+K"
              onClick={() => openPalette()}
            >
              <Icon name="magnifying-glass" />
            </button>
            <LocaleToggle />
            <Link href={href('#contact')} className="sn-pill sn-contact" data-filled={heroGone ? '' : undefined}>
              {t.navContact}
            </Link>
            <NavMenu locale={locale} profile={profile} active={active} />
          </div>
        </nav>
      </header>
      <ThumbBar locale={locale} profile={profile} heroGone={heroGone} />
    </>
  );
}
```

Replace `src/components/site-nav.css` with:

```css
/* SiteNav — the floating capsule (spec §5.4 glass, §6 nav; prototype
   .navwrap/.cap-nav). `position: fixed`, not the prototype's sticky: every
   other route (/projects, /writing, /career, /work/[slug]) already clears a
   fixed header with its own pt-28, so the capsule drops onto them with no
   layout change. The home hero adds the capsule's 62 px to its own top padding
   (sections/hero-tour.css).

   Classes are `sn-` so nothing here meets C9's shared names. Glass comes from
   C9's `.glass`; the rule that positions it uses two classes (`.sn-cap.glass`)
   so it wins whatever `.glass` itself sets. Only transform and opacity animate:
   the active pill slides with transform, its width snaps, and the Contact
   pill's fill changes without a colour transition. */
@layer components {
  html { scroll-padding-top: 76px; }

  .sn-wrap {
    position: fixed; top: 0; left: 0; right: 0; z-index: 50;
    display: flex; justify-content: center;
    padding: 10px 24px 0;
    pointer-events: none;
  }
  .sn-cap.glass {
    position: relative; pointer-events: auto;
    display: flex; align-items: center; gap: 12px;
    width: min(1024px, 100%); height: 52px;
    padding: 0 10px 0 14px; border-radius: 18px;
  }
  .sn-brand { display: inline-flex; align-items: center; gap: 10px; min-height: 44px; font-size: 17px; font-weight: 600; color: var(--ink-1); text-decoration: none; }
  .sn-mono { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--ink-1); color: var(--canvas); font-size: 14px; font-weight: 600; letter-spacing: 0; }

  .sn-links { position: relative; display: flex; gap: 4px; margin-left: auto; padding: 12px 0; contain: layout paint; }
  .sn-links a {
    position: relative; z-index: 1;
    padding: 0 12px; border-radius: 14px;
    font-size: 14px; line-height: 28px; color: var(--ink-1); text-decoration: none;
    opacity: .8;
  }
  .sn-links a:hover, .sn-links a[aria-current] { opacity: 1; }
  .sn-links a[aria-current] { font-weight: 600; }
  .sn-act {
    position: absolute; top: 12px; left: 0;
    width: 0; height: 28px; border-radius: 14px;
    background: color-mix(in srgb, var(--ink-1) 7%, transparent);
    opacity: 0;
    transition: transform var(--dur-ui) var(--ease-settle), opacity 200ms linear;
  }
  .sn-act[data-on] { opacity: 1; }

  .sn-right { display: flex; align-items: center; gap: 8px; }
  .sn-icon {
    position: relative;
    display: grid; place-items: center;
    width: 32px; height: 32px;
    border: 0; border-radius: 50%; background: transparent;
    font-size: 17px; color: var(--ink-1); cursor: pointer;
  }
  .sn-icon::after { content: ""; position: absolute; inset: -6px; }
  @media (hover: hover) {
    .sn-icon:hover { background: color-mix(in srgb, var(--ink-1) 6%, transparent); }
  }
  .sn-pill {
    position: relative;
    display: inline-flex; align-items: center;
    min-height: 28px; padding: 0 14px; border-radius: 14px;
    box-shadow: inset 0 0 0 1px var(--ink-3);
    font-size: 14px; font-weight: 500; white-space: nowrap; color: var(--ink-1); text-decoration: none;
  }
  .sn-pill::after { content: ""; position: absolute; inset: -8px -2px; }
  .sn-pill[data-filled] { background: var(--kram); color: var(--on-kram); box-shadow: none; }

  @media (max-width: 899px) {
    .sn-links, .sn-search, .sn-contact { display: none; }
    .sn-right { margin-left: auto; }
  }
  @media (max-width: 734px) {
    .sn-wrap { padding: calc(8px + env(safe-area-inset-top)) 16px 0; }
    .sn-cap.glass { padding: 0 8px 0 10px; border-radius: 16px; }
    .sn-brand { font-size: 15px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .sn-act { transition: opacity 200ms linear; }
  }
}
```

Now delete the old nav's rules from `src/app/globals.css`. P0 may already have removed or rewritten some of these; the definition of done is the empty grep below. List what is left:

```bash
grep -nE "nav-(on-light|link|social|mark|burger|chrome|solid|hidden)|data-lang-nav" src/app/globals.css
```

Delete, with each block's own explanatory comment:

1. The `/* SiteNav (T11): a fixed, transparent header …` block through the `header.nav-on-light .nav-mark { … }` rule. It holds `.nav-link, .nav-social`, `.nav-mark` and the three `header.nav-on-light …` rules.
2. `.nav-link:hover, .nav-social:hover { color: var(--color-peri); }`, with the "The accent finally does a job" comment, and the `/* QA 2026-08-15 (contrast table) … */` comment with its `header.nav-on-light .nav-link:hover, … { … }` rule.
3. The whole unlayered block that starts `/* LocaleToggle uses the legacy \`text-soft\`/\`border-line\` names …` and ends at `header.nav-on-light .nav-mark { … }`.
4. In the reduced-motion block: `.nav-mark:hover { transform: none !important; }` and `.nav-burger span { transition-property: opacity !important; }`, each with its comment.
5. In the light-surface focus rule, drop the two `header.nav-on-light` selectors and the comment bullet that describes them. Keep the rest of the rule as P0 left it, including its declarations:

```css
  section.bg-light a:focus-visible,
  section.bg-light button:focus-visible {
    outline-color: var(--color-dark);
  }
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/site-nav.test.tsx && grep -rnE "nav-(on-light|link|social|mark|burger|chrome|solid|hidden)|data-lang-nav|LIGHT_BAND_SELECTOR" src tests; npm run check`
Expected: the site-nav tests PASS (13 tests), the grep prints nothing, and `npm run check` is green.

- [ ] **Step 5: Screenshot check**

Start `npm run dev` in the background and run the screenshot script (see **Screenshot script** above) twice: `node /tmp/klao-qa/p1-shots.mjs nav`, then `node /tmp/klao-qa/p1-shots.mjs menu`. Review `/tmp/klao-qa/p1-desk-*-0s.png`, `p1-desk-*-nav-active.png` and `p1-phone-*-menu.png`:
- Desktop: one capsule, 1024 px wide, centred 10 px from the top, glass over white (light) and over near-black (dark). In order: brand, four links, ⌘K, EN/ไทย (current raised), Contact outline pill.
- `nav-active`: the pill sits under "Projects" / "โปรเจกต์" (WorkDeck still carries `#work`).
- Phone: brand + EN/ไทย + Menu only. The menu panel is centred at the top, 358 px wide, with search row, 2×2 section grid, "Start a conversation" full width, Copy email + Résumé, Language, Appearance, LinkedIn/GitHub. Thai labels don't break mid-word.
- The script prints `no horizontal overflow, no console errors`.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/components/SiteNav.tsx src/components/site-nav.css src/app/globals.css src/lib/dictionary.ts tests/site-nav.test.tsx
git commit -m "feat(nav): floating glass capsule with a sliding active pill; the nav-on-light probe is gone

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 10: The tour stage — `HeroTourStage`

**Files:**
- Create: `src/components/HeroTourStage.tsx`, `src/components/hero-tour-stage.css`, `tests/helpers/media.ts`, `tests/helpers/time.ts`
- Modify: `src/lib/dictionary.ts` (append tour keys) · `tests/dictionary.test.ts` (`sharedKeys`)
- Test: `tests/hero-tour-stage.test.tsx` (new)

**Interfaces:**
- Consumes:
  - `TourSlide`, `TourVignette` (Task 4) · `tourReducer`, `initialTourState` (Task 5)
  - `dict.tourListLabel/tourPrev/tourNext/tourPause/tourPlay` (existing)
  - P0 `Icon` (`caret-left`, `caret-right`, `pause`, `play`) · P0 `ThaiText` (default export, `text` prop)
  - C1 `--w-aje --w-gonai --w-site --mist --canvas --e2 --glass-pill --glass-ctl --ease-*` · C9 `.glass`
- Produces:
  - `export default function HeroTourStage({ slides, vignette, locale }: { slides: TourSlide[]; vignette: TourVignette; locale: Locale })`, which renders `<section id="tour" class="ht-tour">`
  - dictionary keys `tourOf tourChapters tourReplay tourEndTitle tourEndKicker`
  - test helpers `stubMatchMedia(matches?)` and `tick(ms)`

- [ ] **Step 1: Write the failing test**

Create `tests/helpers/media.ts`:

```ts
import { vi } from 'vitest';

/** Stubs matchMedia as tests/hero.test.tsx always has, but lets a test choose
 *  which queries match (reduced motion, hover). Listeners are accepted and
 *  never called. */
export function stubMatchMedia(matches: (query: string) => boolean = () => false): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matches(query),
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }));
}
```

Create `tests/helpers/time.ts`:

```ts
import { act } from '@testing-library/react';
import { vi } from 'vitest';

/**
 * Advance fake time in 50 ms steps, each inside act(). The tour schedules each
 * frame's timer from an effect, and React flushes effects only when act()
 * returns, so one big advanceTimersByTime() would stop after the first frame.
 * Every tour duration is a multiple of 50 ms, so a timer due on a step
 * boundary is re-armed on time.
 */
export function tick(ms: number): void {
  for (let left = ms; left > 0; left -= 50) {
    const step = Math.min(50, left);
    act(() => {
      vi.advanceTimersByTime(step);
    });
  }
}
```

Create `tests/hero-tour-stage.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HeroTourStage from '@/components/HeroTourStage';
import { dict } from '@/lib/dictionary';
import type { TourSlide, TourVignette } from '@/lib/project-tour';
import { FakeIO, installFakeIO } from './helpers/io';
import { stubMatchMedia } from './helpers/media';
import { tick } from './helpers/time';

const slides: TourSlide[] = [
  {
    id: 'aje',
    name: 'Aje',
    kicker: 'Aje · Working prototype',
    question: 'Is this idea worth a weekend, or a year?',
    href: '#work',
    media: 'img',
    src: '/images/aje.jpg',
    alt: 'Aje review screen.',
    wash: 'aje',
    dwellMs: 6000,
  },
  {
    id: 'gonai',
    name: 'GoNai',
    kicker: 'GoNai · Live · gonai-three.vercel.app',
    question: 'One day in Bangkok — what’s the real budget?',
    href: '#work',
    media: 'img',
    src: '/images/gonai.jpg',
    alt: 'GoNai home screen.',
    wash: 'gonai',
    dwellMs: 5500,
  },
  {
    id: 'site',
    name: 'klao-site',
    kicker: 'klao-site · This site',
    question: 'Can a personal site update itself from Notion, in two languages?',
    href: '#work',
    media: 'notion',
    src: null,
    alt: '',
    wash: 'site',
    dwellMs: 7000,
  },
];
const vignette: TourVignette = {
  titleEn: 'Business developer who builds his own tools.',
  titleTh: 'นัก Business Development ที่สร้างเครื่องมือ|ใช้เอง',
  photoSrc: '/images/portrait.jpg',
};

beforeEach(() => {
  vi.useFakeTimers();
  stubMatchMedia();
  installFakeIO();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const renderStage = (locale: 'en' | 'th' = 'en') => render(<HeroTourStage slides={slides} vignette={vignette} locale={locale} />);
const tour = () => document.getElementById('tour') as HTMLElement;
const stage = () => tour().querySelector('.ht-stage') as HTMLElement;
const frames = () => Array.from(tour().querySelectorAll('.ht-slide'));
const tabs = () => within(tour()).getAllByRole('tab');
const selected = () => tabs().findIndex((b) => b.getAttribute('aria-selected') === 'true');
const question = () => tour().querySelector('.ht-qt')!.textContent;
const kicker = () => tour().querySelector('.ht-k')!.textContent;
const playButton = () => tour().querySelector('.ht-play') as HTMLButtonElement;
const inView = (ratio = 1) => FakeIO.watching(stage()).fire([{ target: stage(), intersectionRatio: ratio, isIntersecting: ratio > 0 }]);

describe('HeroTourStage', () => {
  it('opens on the first frame with its subtitle, before anything plays', () => {
    renderStage();
    expect(frames()).toHaveLength(3);
    expect(frames()[0].hasAttribute('data-on')).toBe(true);
    expect(frames()[1].hasAttribute('data-on')).toBe(false);
    expect(question()).toBe(slides[0].question);
    expect(kicker()).toBe('Aje · Working prototype');
    expect(selected()).toBe(0);
    expect(playButton().getAttribute('aria-label')).toBe(dict.en.tourPlay);
  });

  it('is a labelled carousel of slides, each tab pointing at its slide', () => {
    renderStage();
    expect(tour().getAttribute('aria-roledescription')).toBe('carousel');
    expect(tour().getAttribute('aria-label')).toBe(dict.en.tourListLabel);
    expect(frames()[0].getAttribute('aria-roledescription')).toBe('slide');
    expect(frames()[0].getAttribute('aria-label')).toBe('1 of 3');
    expect(within(tour()).getByRole('tablist').getAttribute('aria-label')).toBe(dict.en.tourChapters);
    expect(tabs()[1].getAttribute('aria-label')).toBe('GoNai · 2 of 3');
    expect(tabs()[1].getAttribute('aria-controls')).toBe(frames()[1].id);
  });

  it('starts by itself once at least half of the stage is in view', () => {
    renderStage();
    tick(20000);
    expect(selected()).toBe(0); // not in view yet
    inView(0.4);
    tick(20000);
    expect(selected()).toBe(0); // under half
    inView(0.6);
    expect(playButton().getAttribute('aria-label')).toBe(dict.en.tourPause);
  });

  it('advances on each frame’s own clock, the new frame fading in on top of the old one', () => {
    renderStage();
    inView();
    tick(5999);
    expect(selected()).toBe(0);
    tick(1);
    expect(selected()).toBe(1);
    const [aje, gonai] = frames();
    expect(gonai.hasAttribute('data-top')).toBe(true); // fading in on top
    expect(aje.hasAttribute('data-on')).toBe(true); // still showing underneath — no 50/50 blend
    expect(aje.hasAttribute('data-top')).toBe(false);
    tick(800);
    expect(aje.hasAttribute('data-on')).toBe(false); // dropped once the fade is over
    expect(question()).toBe(slides[1].question);
    tick(5500 - 800 - 1);
    expect(selected()).toBe(1);
    tick(1);
    expect(selected()).toBe(2);
  });

  it('plays once: ends on the last frame with the closing subtitle and a replay button', () => {
    renderStage();
    inView();
    tick(6000 + 5500 + 7000);
    expect(selected()).toBe(2);
    expect(question()).toBe(dict.en.tourEndTitle);
    expect(tour().querySelector('.ht-q')!.getAttribute('href')).toBe('#signature');
    expect(kicker()).toBe(dict.en.tourEndKicker);
    expect(playButton().getAttribute('aria-label')).toBe(dict.en.tourReplay);
    expect(tabs().every((b) => b.hasAttribute('data-done'))).toBe(true);
    tick(60000);
    expect(selected()).toBe(2); // never wraps
  });

  it('replays from the first frame', () => {
    renderStage();
    inView();
    tick(18500);
    fireEvent.click(playButton());
    expect(selected()).toBe(0);
    expect(playButton().getAttribute('aria-label')).toBe(dict.en.tourPause);
    tick(6000);
    expect(selected()).toBe(1);
  });

  it('puts Pause first in the tab order, and resumes with the time that was left', () => {
    renderStage();
    inView();
    expect(tour().querySelectorAll('a[href], button')[0]).toBe(playButton());
    tick(2000);
    fireEvent.click(playButton());
    expect(playButton().getAttribute('aria-label')).toBe(dict.en.tourPlay);
    tick(30000);
    expect(selected()).toBe(0);
    fireEvent.click(playButton());
    tick(3999);
    expect(selected()).toBe(0);
    tick(1);
    expect(selected()).toBe(1);
  });

  it('holds while the pointer is over the stage, on devices that hover', () => {
    stubMatchMedia((q) => q === '(hover: hover)');
    renderStage();
    inView();
    tick(1000);
    fireEvent.pointerEnter(stage());
    tick(20000);
    expect(selected()).toBe(0);
    fireEvent.pointerLeave(stage());
    tick(4999);
    expect(selected()).toBe(0);
    tick(1);
    expect(selected()).toBe(1);
  });

  it('holds while focus is inside the tour, except on the Pause button itself', () => {
    renderStage();
    inView();
    tick(1000);
    fireEvent.focus(tabs()[0]);
    tick(20000);
    expect(selected()).toBe(0);
    fireEvent.blur(tabs()[0]);
    fireEvent.focus(playButton());
    tick(5000);
    expect(selected()).toBe(1);
  });

  it('holds while the browser tab is hidden', () => {
    let hidden = false;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    try {
      renderStage();
      inView();
      tick(1000);
      hidden = true;
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      tick(20000);
      expect(selected()).toBe(0);
      hidden = false;
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      tick(5000);
      expect(selected()).toBe(1);
    } finally {
      Reflect.deleteProperty(document, 'hidden');
    }
  });

  it('holds while scrolled out of view, and picks up where it left off', () => {
    renderStage();
    inView();
    tick(1000);
    inView(0);
    tick(20000);
    expect(selected()).toBe(0);
    inView(1);
    tick(5000);
    expect(selected()).toBe(1);
  });

  it('lets the visitor pick a frame: the tour stops there, and Play carries on from it', () => {
    renderStage();
    inView();
    tick(1000);
    fireEvent.click(tabs()[2]);
    expect(selected()).toBe(2);
    expect(playButton().getAttribute('aria-label')).toBe(dict.en.tourPlay);
    expect(question()).toBe(slides[2].question); // the frame's own subtitle, not the ending
    tick(30000);
    expect(selected()).toBe(2);
    fireEvent.click(playButton());
    expect(playButton().getAttribute('aria-label')).toBe(dict.en.tourPause);
    tick(7000);
    expect(question()).toBe(dict.en.tourEndTitle);
  });

  it('moves with the arrow keys, Home and End, taking focus along (roving tabindex)', () => {
    renderStage();
    const list = within(tour()).getByRole('tablist');
    tabs()[0].focus();
    fireEvent.keyDown(list, { key: 'ArrowRight' });
    expect(selected()).toBe(1);
    expect(document.activeElement).toBe(tabs()[1]);
    expect(tabs()[1].tabIndex).toBe(0);
    expect(tabs()[0].tabIndex).toBe(-1);
    fireEvent.keyDown(list, { key: 'End' });
    expect(selected()).toBe(2);
    fireEvent.keyDown(list, { key: 'ArrowRight' });
    expect(selected()).toBe(0); // a visitor's step wraps; only autoplay stops at the end
    fireEvent.keyDown(list, { key: 'ArrowLeft' });
    expect(selected()).toBe(2);
    fireEvent.keyDown(list, { key: 'Home' });
    expect(selected()).toBe(0);
  });

  it('swipes sideways on the stage, and ignores a mostly vertical drag (a scroll)', () => {
    renderStage();
    fireEvent.pointerDown(stage(), { clientX: 300, clientY: 100 });
    fireEvent.pointerUp(stage(), { clientX: 200, clientY: 110 });
    expect(selected()).toBe(1);
    fireEvent.pointerDown(stage(), { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(stage(), { clientX: 180, clientY: 100 });
    expect(selected()).toBe(0);
    fireEvent.pointerDown(stage(), { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(stage(), { clientX: 150, clientY: 300 });
    expect(selected()).toBe(0);
  });

  it('under reduced motion never autoplays and shows ‹ › instead of Pause; every frame stays reachable', () => {
    stubMatchMedia((q) => q === '(prefers-reduced-motion: reduce)');
    renderStage();
    inView();
    tick(60000);
    expect(selected()).toBe(0);
    expect(tour().querySelector('.ht-play')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: dict.en.tourNext }));
    expect(selected()).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: dict.en.tourPrev }));
    fireEvent.click(screen.getByRole('button', { name: dict.en.tourPrev }));
    expect(selected()).toBe(2);
  });

  it('does not autoplay when the visitor asked to save data', () => {
    vi.stubGlobal('navigator', { connection: { saveData: true } });
    renderStage();
    inView();
    tick(20000);
    expect(selected()).toBe(0);
    expect(playButton().getAttribute('aria-label')).toBe(dict.en.tourPlay);
  });

  it('keeps the subtitle quiet while autoplaying, and announces it when the visitor drives', () => {
    renderStage();
    const live = () => tour().querySelector('.ht-cap')!.getAttribute('aria-live');
    expect(live()).toBe('polite');
    inView();
    expect(live()).toBe('off');
    fireEvent.click(tabs()[1]);
    expect(live()).toBe('polite');
  });

  it('runs the camera push and the progress fill only while autoplaying, sized to the frame', () => {
    renderStage();
    const img = () => frames()[0].querySelector('img')!;
    const fill = () => tabs()[0].querySelector('b')!;
    expect(img().hasAttribute('data-run')).toBe(false);
    inView();
    expect(img().hasAttribute('data-run')).toBe(true);
    expect(img().style.getPropertyValue('--ht-cam-ms')).toBe('6700ms');
    expect(fill().hasAttribute('data-run')).toBe(true);
    expect(fill().style.getPropertyValue('--ht-ms')).toBe('6000ms');
    fireEvent.click(playButton()); // pause: the animations stay, frozen by data-hold
    expect(tour().hasAttribute('data-hold')).toBe(true);
    fireEvent.click(tabs()[1]); // manual: nothing runs
    expect(tour().querySelector('[data-run]')).toBeNull();
  });

  it('loads the first frame eagerly at high priority and the rest lazily, all with fixed dimensions', () => {
    renderStage();
    const imgs = Array.from(tour().querySelectorAll('img.ht-cam'));
    expect(imgs[0].getAttribute('loading')).toBe('eager');
    expect(imgs[0].getAttribute('fetchpriority')).toBe('high');
    expect(imgs[1].getAttribute('loading')).toBe('lazy');
    for (const img of imgs) {
      expect(img.getAttribute('width')).toBe('1580');
      expect(img.getAttribute('height')).toBe('900');
    }
    expect(imgs[0].getAttribute('alt')).toBe('Aje review screen.');
  });

  it('ends on the klao-site Notion-row vignette: the headline in both languages, decorative for screen readers', () => {
    renderStage();
    const vig = tour().querySelector('.ht-vig') as HTMLElement;
    const text = (vig.textContent ?? '').replace(/ /g, ' '); // keep-runs (C3) may use no-break spaces
    expect(vig.getAttribute('aria-hidden')).toBe('true');
    expect(text).toContain('Business developer who builds his own tools.');
    expect(text).toContain('นัก Business Development ที่สร้างเครื่องมือใช้เอง');
    expect(text).not.toContain('|');
    expect(vig.querySelector('img')?.getAttribute('alt')).toBe('');
  });

  it('plays the vignette beat (EN, then TH) only while the tour runs, and rests on TH otherwise', () => {
    renderStage();
    const beat = () => tour().querySelector('.ht-vig')!.getAttribute('data-beat');
    expect(beat()).toBe('en');
    inView();
    tick(6000 + 5500);
    expect(beat()).toBe('play');
    tick(7000);
    expect(beat()).toBe('th');
  });

  it('with a single frame shows just the frame and its subtitle: no dots, no Play, no autoplay', () => {
    render(<HeroTourStage slides={[slides[0]]} vignette={vignette} locale="en" />);
    expect(tour().querySelector('[role="tablist"]')).toBeNull();
    expect(tour().querySelector('.ht-play')).toBeNull();
    inView();
    tick(20000);
    expect(question()).toBe(slides[0].question);
  });

  it('speaks Thai', () => {
    renderStage('th');
    expect(tour().getAttribute('aria-label')).toBe(dict.th.tourListLabel);
    expect(tabs()[0].getAttribute('aria-label')).toBe('Aje · 1 จาก 3');
    expect(playButton().getAttribute('aria-label')).toBe(dict.th.tourPlay);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/hero-tour-stage.test.tsx`
Expected: FAIL with `Failed to resolve import "@/components/HeroTourStage"`.

- [ ] **Step 3: Implement**

Append to the end of `en` in `src/lib/dictionary.ts`:

```ts
  // White Edition P1 — hero tour (prototype UI.en). `{n}` / `{total}` are
  // filled in by HeroTourStage.
  tourOf: '{n} of {total}',
  tourChapters: 'Chapters',
  tourReplay: 'Replay the tour',
  tourEndTitle: 'The idea, then the app.',
  tourEndKicker: '2022 → 2026 ↓',
```

Append to the end of `th`:

```ts
  tourOf: '{n} จาก {total}',
  tourChapters: 'ตอน',
  tourReplay: 'ดูทัวร์อีกครั้ง',
  tourEndTitle: 'ไอเดียมาก่อน แล้วค่อยเป็นแอป',
  tourEndKicker: '2022 → 2026 ↓',
```

In `tests/dictionary.test.ts`, add `'tourEndKicker'` to `sharedKeys`. The years and arrows are the same in both languages:

```ts
    const sharedKeys = new Set<string>(['navFaq', 'tourEndKicker']);
```

Create `src/components/HeroTourStage.tsx`:

```tsx
'use client';

import { useEffect, useId, useReducer, useRef, useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from 'react';
import { Icon } from '@/components/icons';
import ThaiText from '@/components/ThaiText';
import { dict } from '@/lib/dictionary';
import type { Locale, ProjectWash } from '@/lib/models';
import type { TourSlide, TourVignette } from '@/lib/project-tour';
import { initialTourState, tourReducer } from '@/lib/tour-player';
import './hero-tour-stage.css';

const WASH: Record<ProjectWash, string> = {
  aje: 'var(--w-aje)',
  gonai: 'var(--w-gonai)',
  site: 'var(--w-site)',
  none: 'var(--mist)',
};
/** The crossfade takes 700 ms (CSS); the frame underneath goes a beat later. */
const SETTLE_MS = 800;
/** The camera keeps pushing through the next crossfade (prototype: dwell + 700). */
const CAMERA_TAIL_MS = 700;
/** A drag this long, and clearly more sideways than down, is a swipe. */
const SWIPE_PX = 40;
const KEY_STEP: Record<string, (index: number, count: number) => number> = {
  ArrowRight: (i) => i + 1,
  ArrowLeft: (i) => i - 1,
  Home: () => 0,
  End: (_, count) => count - 1,
};

function saveDataOn(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}

type Props = { slides: TourSlide[]; vignette: TourVignette; locale: Locale };

/**
 * The hero tour (spec §6; prototype `tour`). It plays once through the tour
 * projects and ends on the last frame (klao-site's Notion-row vignette) with a
 * subtitle that leads into the Signature scene. Kept from the old ProjectTour:
 * pause on hover, focus, a hidden tab or out of view; reduced motion synced
 * after mount. Changed: no loop, a top-layer crossfade only, a slow 1.00 → 1.03
 * camera push, and Pause first in the tab order.
 *
 * Timing: one JS clock (a setTimeout per frame, with the remaining time kept
 * across pauses) decides when frames change. Everything visual is a CSS
 * animation whose play-state follows `data-hold` on the section, so a paused
 * tour freezes where it stands. The playback rules live in tour-player.ts.
 *
 * Server render (and first paint without JS) is the idle state: the first
 * frame is on, with its subtitle, and nothing is hidden inline.
 */
export default function HeroTourStage({ slides, vignette, locale }: Props) {
  const t = dict[locale];
  const count = slides.length;
  const uid = useId();
  const [s, dispatch] = useReducer(tourReducer, initialTourState);
  const [reduced, setReduced] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const playRef = useRef<HTMLButtonElement>(null);
  const dotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const swipeFrom = useRef<{ x: number; y: number } | null>(null);
  const clock = useRef({ key: '', left: 0 });

  const autoplay = s.phase === 'playing' || s.phase === 'paused';
  const ended = s.phase === 'done';
  const held = hovering || focusInside || !inView || pageHidden;
  const running = s.phase === 'playing' && !held;

  // Media preferences are read after mount, so the server HTML and the first
  // client render agree (no hydration mismatch for reduced-motion visitors).
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    setCanHover(matchMedia('(hover: hover)').matches);
    const onChange = (e: MediaQueryListEvent) => {
      setReduced(e.matches);
      if (e.matches) dispatch({ type: 'stop' });
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setInView(entry.intersectionRatio >= 0.5), { threshold: [0, 0.5, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const sync = () => setPageHidden(document.hidden);
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  // Plays once: the only automatic start is from 'idle', the first time at
  // least half of the stage is in view. Never under reduced motion or Save-Data.
  useEffect(() => {
    if (s.phase === 'idle' && inView && !reduced && count > 1 && !saveDataOn()) dispatch({ type: 'start', at: 0 });
  }, [s.phase, inView, reduced, count]);

  // The clock. A new (run, frame) pair takes that frame's full dwell; a pause
  // or hold keeps whatever time was left.
  const clockKey = `${s.run}:${s.index}`;
  useEffect(() => {
    if (!running) return;
    if (clock.current.key !== clockKey) clock.current = { key: clockKey, left: slides[s.index].dwellMs };
    const startedAt = Date.now();
    let fired = false;
    const id = setTimeout(() => {
      fired = true;
      dispatch({ type: 'advance', count });
    }, clock.current.left);
    return () => {
      clearTimeout(id);
      if (!fired) clock.current.left = Math.max(0, clock.current.left - (Date.now() - startedAt));
    };
  }, [running, clockKey, slides, s.index, count]);

  // Drop the frame underneath once the new one has fully faded in on top.
  useEffect(() => {
    if (s.under === null) return;
    const id = setTimeout(() => dispatch({ type: 'settled' }), SETTLE_MS);
    return () => clearTimeout(id);
  }, [s.under, s.index]);

  const go = (to: number, moveFocus = false) => {
    if (count === 0) return;
    const next = ((to % count) + count) % count;
    dispatch({ type: 'go', to: next, count });
    if (moveFocus) dotRefs.current[next]?.focus();
  };

  const onPlay = () => {
    if (s.phase === 'playing') dispatch({ type: 'pause' });
    else if (s.phase === 'paused') dispatch({ type: 'resume' });
    else dispatch({ type: 'start', at: ended ? 0 : s.index });
  };

  const onDotsKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = KEY_STEP[e.key];
    if (!step) return;
    e.preventDefault();
    go(step(s.index, count), true);
  };

  // Focus anywhere in the tour holds it, so a keyboard visitor reading a
  // subtitle is never overtaken, except on Play/Pause itself, the control
  // whose whole job is to let the tour run.
  const onFocus = (e: FocusEvent<HTMLElement>) => setFocusInside(e.target !== playRef.current);
  const onBlur = () => setFocusInside(false);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    swipeFrom.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const from = swipeFrom.current;
    swipeFrom.current = null;
    if (!from) return;
    const dx = e.clientX - from.x;
    const dy = e.clientY - from.y;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > 1.5 * Math.abs(dy)) go(s.index + (dx < 0 ? 1 : -1));
  };

  const of = (n: number) => t.tourOf.replace('{n}', String(n)).replace('{total}', String(count));
  const current = slides[s.index];
  const playLabel = ended ? t.tourReplay : s.phase === 'playing' ? t.tourPause : t.tourPlay;
  // The vignette plays its EN -> TH beat while autoplay sits on it; at rest it
  // shows EN before the tour has run and TH after (prototype vigBeat).
  const beatFor = (i: number): VignetteBeat => (i === s.index && autoplay ? 'play' : s.phase === 'idle' ? 'en' : 'th');

  return (
    <section
      id="tour"
      className="ht-tour"
      aria-roledescription="carousel"
      aria-label={t.tourListLabel}
      data-hold={held || s.phase === 'paused' ? '' : undefined}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <div className="ht-stage-z">
        <div
          ref={stageRef}
          className="ht-stage"
          onPointerEnter={canHover ? () => setHovering(true) : undefined}
          onPointerLeave={canHover ? () => setHovering(false) : undefined}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          {slides.map((slide, i) => {
            const on = i === s.index || i === s.under;
            const camera = (autoplay || ended) && on;
            return (
              <div
                key={slide.id}
                id={`${uid}-slide-${i}`}
                className="ht-slide"
                role="tabpanel"
                aria-roledescription="slide"
                aria-label={of(i + 1)}
                aria-hidden={i === s.index ? undefined : true}
                data-on={on ? '' : undefined}
                data-top={i === s.index && s.under !== null ? '' : undefined}
                style={{ ['--ht-wash' as string]: WASH[slide.wash] }}
              >
                <div className="ht-card">
                  {slide.media === 'notion' ? (
                    <Vignette vignette={vignette} beat={beatFor(i)} />
                  ) : slide.src ? (
                    <img
                      className="ht-cam"
                      src={slide.src}
                      alt={slide.alt}
                      width={1580}
                      height={900}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      fetchPriority={i === 0 ? 'high' : undefined}
                      decoding="async"
                      data-run={camera ? '' : undefined}
                      style={{ ['--ht-cam-ms' as string]: `${slide.dwellMs + CAMERA_TAIL_MS}ms` }}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
          {reduced && count > 1 && (
            <>
              <button type="button" className="ht-paddle ht-prev ht-ctl" aria-label={t.tourPrev} onClick={() => go(s.index - 1)}>
                <Icon name="caret-left" />
              </button>
              <button type="button" className="ht-paddle ht-next ht-ctl" aria-label={t.tourNext} onClick={() => go(s.index + 1)}>
                <Icon name="caret-right" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="ht-pill glass">
        {!reduced && count > 1 && (
          <button ref={playRef} type="button" className="ht-play ht-ctl" aria-label={playLabel} onClick={onPlay}>
            {ended ? <ReplayGlyph /> : <Icon name={s.phase === 'playing' ? 'pause' : 'play'} />}
          </button>
        )}
        <div className="ht-cap" aria-live={s.phase === 'playing' ? 'off' : 'polite'}>
          {/* Keyed so a new subtitle remounts and replays its small entrance;
              the live region around it stays put so it can announce. */}
          <div key={ended ? 'end' : current.id} className="ht-cap-in">
            {ended ? (
              <a className="ht-q" href="#signature">
                <span className="ht-qt">
                  <ThaiText text={t.tourEndTitle} />
                </span>
              </a>
            ) : (
              <a className="ht-q" href={current.href}>
                <span className="ht-qt">
                  <ThaiText text={current.question} />
                </span>
                <span className="ht-chev" aria-hidden="true">
                  ›
                </span>
              </a>
            )}
            <span className="ht-k">{ended ? t.tourEndKicker : current.kicker}</span>
          </div>
        </div>
        {count > 1 && (
          <div className="ht-dots" role="tablist" aria-label={t.tourChapters} onKeyDown={onDotsKey}>
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                ref={(el) => {
                  dotRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                className="ht-dot"
                aria-selected={i === s.index}
                aria-controls={`${uid}-slide-${i}`}
                aria-label={`${slide.name} · ${of(i + 1)}`}
                tabIndex={i === s.index ? 0 : -1}
                data-done={ended || (i < s.index && s.phase !== 'idle') ? '' : undefined}
                onClick={() => go(i)}
              >
                <i>
                  <b
                    data-run={autoplay && i === s.index ? '' : undefined}
                    style={{ ['--ht-ms' as string]: `${slide.dwellMs}ms` }}
                  />
                </i>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

type VignetteBeat = 'en' | 'th' | 'play';

/**
 * klao-site's frame: the site's own headline as a Notion row, then as the page
 * it becomes, English first and Thai 3.2 s later (prototype renderVignette).
 * It depicts Notion's light UI, so its colours and labels are fixed on
 * purpose, not tokens or dictionary copy. Decorative: the subtitle below
 * carries the meaning.
 */
function Vignette({ vignette, beat }: { vignette: TourVignette; beat: VignetteBeat }) {
  return (
    <div className="ht-vig" data-beat={beat} aria-hidden="true">
      <div className="ht-vig-n">
        <div className="ht-vt">Notion · Site copy</div>
        <div className="ht-vrow" data-row="en">
          <b>Title EN</b>
          <span lang="en">{vignette.titleEn}</span>
          <i className="ht-ul" />
        </div>
        <div className="ht-vrow" data-row="th">
          <b>Title TH</b>
          <span lang="th">
            <ThaiText text={vignette.titleTh} />
          </span>
          <i className="ht-ul" />
        </div>
        <div className="ht-vrow">
          <b>Status</b>
          <span>Published</span>
        </div>
      </div>
      <div className="ht-vig-h">
        {vignette.photoSrc && <img src={vignette.photoSrc} alt="" width={36} height={36} loading="lazy" />}
        <div className="ht-vh1" data-v="en" lang="en">
          {vignette.titleEn}
        </div>
        <div className="ht-vh1" data-v="th" lang="th">
          <ThaiText text={vignette.titleTh} />
        </div>
        <small>klao-site · EN / TH</small>
      </div>
    </div>
  );
}

/** Replay glyph (prototype, inline: not part of the Phosphor subset). */
function ReplayGlyph() {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4v4h4"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
```

Create `src/components/hero-tour-stage.css`:

```css
/* HeroTourStage — the project tour under the hero copy (spec §4 row 1, §6;
   prototype .tour/.stage/.slide/.card/.vig/.tpill/.tdot). Classes are `ht-` so
   they never meet C9's shared names. Only transform and opacity animate. The
   one JS clock lives in HeroTourStage.tsx; every animation here pauses with it
   through `.ht-tour[data-hold]`. No scroll-linked animation: the prototype's
   stage zoom on scroll is dropped, because Signature is the page's only one. */
@layer components {
  .ht-tour { position: relative; margin-top: 32px; }
  .ht-stage-z { width: min(1040px, 100% - 48px); margin: 0 auto; }
  .ht-stage {
    position: relative; aspect-ratio: 20 / 9; overflow: hidden;
    border-radius: 28px; background: var(--mist);
    contain: layout paint; touch-action: pan-y;
  }

  /* Frames. Only the current one is on (and, during one crossfade, the one it
     covers). The new frame fades in ON TOP of the old one, never a 50/50 blend. */
  .ht-slide { position: absolute; inset: 0; background: var(--ht-wash, var(--mist)); opacity: 0; visibility: hidden; }
  .ht-slide[data-on] { opacity: 1; visibility: visible; }
  .ht-slide[data-top] { z-index: 2; animation: ht-in 700ms var(--ease-glide) both; }

  .ht-card {
    position: absolute; top: 40px; left: 7%; width: 86%; aspect-ratio: 1580 / 900;
    overflow: hidden; border-radius: 14px;
    background: var(--canvas); box-shadow: var(--e2);
  }
  .ht-card::after { content: ""; position: absolute; inset: 0; border-radius: inherit; box-shadow: inset 0 0 0 .5px rgb(0 0 0 / .14); pointer-events: none; }
  .ht-cam { display: block; width: 100%; height: 100%; object-fit: cover; }
  /* The camera: a slow, linear 1.00 -> 1.03 push across the frame's dwell and
     on through the next crossfade (duration set inline per frame). */
  .ht-cam[data-run] { animation: ht-push var(--ht-cam-ms, 6700ms) linear forwards; }

  /* Screenshots of light UIs sit a touch dimmer in dark mode (prototype --shot-dim). */
  :root[data-theme="dark"] .ht-cam,
  :root[data-theme="dark"] .ht-vig { filter: brightness(.92); }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) .ht-cam,
    :root:not([data-theme="light"]) .ht-vig { filter: brightness(.92); }
  }

  /* klao-site vignette: a picture of Notion's light UI, so fixed colours on purpose. */
  .ht-vig { position: absolute; inset: 0; display: grid; grid-template-columns: 1fr 1.15fr; text-align: left; background: #fff; color: #1A1C20; }
  .ht-vig-n { padding: 28px 26px; border-right: 1px solid rgb(20 26 44 / .08); font-size: 14px; }
  .ht-vt { margin-bottom: 14px; font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: #666970; }
  .ht-vrow { position: relative; display: grid; grid-template-columns: 88px 1fr; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgb(20 26 44 / .08); }
  .ht-vrow b { font-size: 13px; font-weight: 500; color: #666970; }
  .ht-vrow span { font-size: 14px; line-height: 20px; }
  .ht-ul { position: absolute; left: 100px; right: 0; bottom: -1px; height: 2px; background: #26314A; transform: scaleX(0); transform-origin: 0 50%; }
  .ht-vig-h { position: relative; display: grid; place-content: center; justify-items: center; gap: 10px; padding: 24px; text-align: center; }
  .ht-vig-h img { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
  .ht-vh1 { grid-area: 2 / 1; max-width: 15em; font-size: 24px; line-height: 1.2; font-weight: 600; }
  .ht-vh1[lang="th"] { line-height: 1.35; }
  .ht-vig-h small { grid-area: 3 / 1; font-size: 12px; color: #666970; }
  .ht-vh1[data-v="th"] { opacity: 0; }
  .ht-vig[data-beat="en"] [data-row="en"] .ht-ul { transform: none; }
  .ht-vig[data-beat="th"] .ht-vh1[data-v="en"] { opacity: 0; }
  .ht-vig[data-beat="th"] .ht-vh1[data-v="th"] { opacity: 1; }
  .ht-vig[data-beat="th"] [data-row="th"] .ht-ul { transform: none; }
  .ht-vig[data-beat="play"] .ht-vh1[data-v="en"] { animation: ht-out 500ms var(--ease-glide) 3200ms both; }
  .ht-vig[data-beat="play"] .ht-vh1[data-v="th"] { animation: ht-in 500ms var(--ease-glide) 3200ms both; }
  .ht-vig[data-beat="play"] [data-row="en"] .ht-ul { animation: ht-ul-out 300ms var(--ease-settle) 3200ms both; }
  .ht-vig[data-beat="play"] [data-row="th"] .ht-ul { animation: ht-ul-in 300ms var(--ease-settle) 3200ms both; }

  /* Glass controls (spec §5.4 "Controls") with the solid fallback. */
  .ht-ctl {
    border: 0; color: var(--ink-1); cursor: pointer;
    background: var(--glass-ctl);
    -webkit-backdrop-filter: blur(12px) saturate(160%); backdrop-filter: blur(12px) saturate(160%);
  }
  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .ht-ctl { background: var(--mist); }
  }
  @media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
    .ht-ctl { background: var(--mist); -webkit-backdrop-filter: none; backdrop-filter: none; }
  }
  .ht-paddle { position: absolute; top: 50%; z-index: 4; display: grid; place-items: center; width: 36px; height: 36px; margin-top: -18px; border-radius: 50%; font-size: 16px; }
  .ht-paddle::after { content: ""; position: absolute; inset: -4px; }
  .ht-prev { left: 16px; }
  .ht-next { right: 16px; }

  /* The subtitle pill (spec §5.4 "Tour pill": 56 px, r28, white .80, blur 16). */
  .ht-pill.glass {
    position: sticky; bottom: 24px; z-index: 6;
    display: flex; align-items: center; gap: 12px;
    width: min(760px, 100% - 48px); min-height: 56px;
    margin: -28px auto 0; padding: 8px 18px 8px 8px;
    border-radius: 28px; text-align: left;
    background: var(--glass-pill);
    -webkit-backdrop-filter: blur(16px) saturate(160%); backdrop-filter: blur(16px) saturate(160%);
  }
  .ht-pill.glass:not(:has(.ht-play)) { padding-left: 18px; }
  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .ht-pill.glass { background: var(--canvas); }
  }
  @media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
    .ht-pill.glass { background: var(--canvas); -webkit-backdrop-filter: none; backdrop-filter: none; }
  }
  .ht-play { position: relative; flex: none; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; font-size: 16px; }
  .ht-play::after { content: ""; position: absolute; inset: -2px; }
  .ht-cap { flex: 1; min-width: 0; }
  .ht-cap-in { display: grid; }
  .ht-q {
    justify-self: start; max-width: 100%; min-height: 24px;
    font-size: 17px; line-height: 22px; font-weight: 600; color: var(--ink-1); text-decoration: none;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .ht-q:hover .ht-qt { text-decoration: underline; text-underline-offset: .15em; }
  .ht-chev { display: inline-block; margin-left: 4px; transition: transform 200ms var(--ease-settle); }
  .ht-q:hover .ht-chev { transform: translateX(2px); }
  .ht-k { font-size: 13px; line-height: 18px; color: var(--ink-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  :lang(th) .ht-k { line-height: 20px; }

  /* Progress dots. The selected dot's width changes instantly; only its fill
     animates (transform). */
  .ht-dots { flex: none; display: flex; align-items: center; contain: layout paint; }
  .ht-dot { display: grid; place-items: center; width: 24px; height: 24px; padding: 0; border: 0; background: none; cursor: pointer; }
  .ht-dot[aria-selected="true"] { width: 52px; }
  .ht-dot i { position: relative; display: block; width: 8px; height: 8px; overflow: hidden; border-radius: 4px; background: var(--ink-3); }
  .ht-dot[aria-selected="true"] i { width: 36px; background: color-mix(in srgb, var(--ink-1) 22%, transparent); }
  .ht-dot b { position: absolute; inset: 0; background: var(--ink-1); transform: scaleX(0); transform-origin: 0 50%; }
  .ht-dot[data-done] b { transform: none; }
  .ht-dot b[data-run] { animation: ht-fill var(--ht-ms, 6000ms) linear forwards; }

  /* One pause for everything the clock drives. */
  .ht-tour[data-hold] :is(.ht-cam, .ht-dot b, .ht-vh1, .ht-ul) { animation-play-state: paused; }

  /* Load choreography (prototype H2/H3): the stage tilts up into place and the
     pill rises, only once JS is running and motion is welcome. */
  @media (prefers-reduced-motion: no-preference) {
    html.js .ht-stage { animation: ht-stage-in 1000ms var(--ease-drift) 360ms both; }
    html.js .ht-pill.glass { animation: ht-pill-in 420ms var(--ease-settle) 720ms both; }
    html.js .ht-cap-in { animation: ht-cap-in 300ms var(--ease-settle) both; }
  }
  @media (max-width: 734px) and (prefers-reduced-motion: no-preference) {
    html.js .ht-stage { animation-name: ht-stage-in-phone; }
  }
  @media (prefers-reduced-motion: reduce) {
    .ht-slide[data-top] { animation-duration: 150ms; animation-timing-function: linear; }
    .ht-cam[data-run], .ht-dot b[data-run], .ht-vig * { animation: none; }
    .ht-dot[aria-selected="true"] b { transform: none; }
    .ht-chev { transition: none; }
  }

  /* Phone: 6:5 stage, full-bleed picture, the pill below the stage (spec §6). */
  @media (max-width: 734px) {
    .ht-tour { margin-top: 28px; }
    .ht-stage-z { width: calc(100% - 24px); }
    .ht-stage { aspect-ratio: 6 / 5; border-radius: 18px; }
    .ht-card { inset: 0; width: auto; top: 0; left: 0; aspect-ratio: auto; border-radius: 0; box-shadow: none; }
    .ht-card::after { display: none; }
    .ht-vig { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
    .ht-vig-n { padding: 16px 16px 8px; border-right: 0; border-bottom: 1px solid rgb(20 26 44 / .08); }
    .ht-vt { margin-bottom: 4px; font-size: 14px; }
    .ht-vrow { grid-template-columns: 76px 1fr; padding: 6px 0; }
    .ht-vrow b { font-size: 14px; }
    .ht-ul { left: 88px; }
    .ht-vh1 { font-size: 20px; }
    .ht-vig-h small { font-size: 14px; }
    .ht-paddle { display: none; }
    .ht-pill.glass {
      position: relative; bottom: auto;
      flex-wrap: wrap; gap: 4px 12px;
      width: calc(100% - 24px); margin: 12px auto 0; padding: 10px 14px 6px 10px;
      border-radius: 24px;
    }
    .ht-q { font-size: 16px; white-space: normal; text-wrap: balance; }
    .ht-k { font-size: 14px; }
    .ht-dots { width: 100%; justify-content: center; }
    .ht-dot { width: 44px; height: 32px; }
    .ht-dot[aria-selected="true"] { width: 56px; }
  }

  @keyframes ht-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ht-out { from { opacity: 1; } to { opacity: 0; } }
  @keyframes ht-push { from { transform: none; } to { transform: scale(1.03); } }
  @keyframes ht-fill { from { transform: scaleX(0); } to { transform: none; } }
  @keyframes ht-ul-in { from { transform: scaleX(0); } to { transform: none; } }
  @keyframes ht-ul-out { from { transform: none; } to { transform: scaleX(0); } }
  @keyframes ht-cap-in { from { opacity: 0; transform: translateY(4px); } }
  @keyframes ht-pill-in { from { opacity: 0; transform: translateY(12px); } }
  @keyframes ht-stage-in { from { transform: perspective(1800px) translateY(24px) rotateX(8deg); } }
  @keyframes ht-stage-in-phone { from { transform: translateY(16px); } }
}
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/hero-tour-stage.test.tsx tests/dictionary.test.ts && npx tsc --noEmit`
Expected: PASS (23 stage tests, and the dictionary tests including the shared-keys check).

- [ ] **Step 5: Commit**

HeroTourStage isn't on a page yet (Task 12 puts it there), so its screenshot check is in Task 12.

```bash
git add src/components/HeroTourStage.tsx src/components/hero-tour-stage.css src/lib/dictionary.ts tests/helpers/media.ts tests/helpers/time.ts tests/hero-tour-stage.test.tsx tests/dictionary.test.ts
git commit -m "feat(hero): tour stage that plays once — top-layer crossfade, camera push, glass subtitles

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 11: The hero section — `HeroTour`

**Files:**
- Create: `src/components/sections/HeroTour.tsx`, `src/components/sections/hero-tour.css`
- Modify: `src/lib/dictionary.ts` (append `resumePdf`)
- Test: `tests/hero-tour.test.tsx` (new)

**Interfaces:**
- Consumes: `toTourSlides` (Task 4) · `HeroTourStage` (Task 10) · `mailtoHref` (Task 1) · `dict.greeting`, `dict.startConversation` (existing) · P0 `ThaiText` · C9 `.wrap .t-hero .btn .btn-fill`.
- Produces: `export default function HeroTour({ profile, projects, locale }: { profile: Profile; projects: Project[]; locale: Locale })`. It renders `<section id="top">`, with the h1 `#hero-title` and the actions row `#hero-cta` (the DOM hook SiteNav/ThumbBar read), and nests `#tour` when there is anything to tour. Adds dictionary key `resumePdf`.

- [ ] **Step 1: Write the failing test**

Create `tests/hero-tour.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HeroTour from '@/components/sections/HeroTour';
import projectsFixture from '@/content/fixtures/projects.json';
import { dict } from '@/lib/dictionary';
import type { Project } from '@/lib/models';
import { FakeIO, installFakeIO } from './helpers/io';
import { stubMatchMedia } from './helpers/media';
import { makeProfile } from './helpers/profile';
import { tick } from './helpers/time';

const projects = projectsFixture as Project[];
const profile = makeProfile();

beforeEach(() => {
  stubMatchMedia();
  installFakeIO();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const top = () => document.getElementById('top') as HTMLElement;
const h1 = () => screen.getByRole('heading', { level: 1 });

describe('HeroTour', () => {
  it('is the #top section: greeting chip, the headline as the page h1, and the Now line under it', () => {
    render(<HeroTour profile={profile} projects={projects} locale="en" />);
    expect(h1().textContent).toBe(profile.headline.en);
    expect(h1().classList.contains('t-hero')).toBe(true);
    expect(top().getAttribute('aria-labelledby')).toBe(h1().id);
    expect(top().querySelector('.ht-hi')?.textContent).toBe("Hi, I'm Suwichak");
    expect(top().querySelector('.ht-hi img')?.getAttribute('alt')).toBe('');
    expect(top().querySelector('.ht-sub')?.textContent).toBe(profile.now.en);
  });

  it('offers the two actions: a mailto with the site subject, and the résumé in a new tab', () => {
    render(<HeroTour profile={profile} projects={projects} locale="en" />);
    const row = document.getElementById('hero-cta')!;
    const [mail, resume] = Array.from(row.querySelectorAll('a'));
    expect(mail.textContent).toBe(dict.en.startConversation);
    expect(mail.getAttribute('href')).toBe('mailto:klao@example.com?subject=Hello%20from%20klao-site');
    expect(mail.classList.contains('btn-fill')).toBe(true);
    expect(resume.textContent).toBe(dict.en.resumePdf);
    expect(resume.getAttribute('href')).toBe('/resume.pdf');
    expect(resume.getAttribute('target')).toBe('_blank');
  });

  it('drops an action it has no data for, the whole row when it has neither, and the photo when there is none', () => {
    render(<HeroTour profile={makeProfile({ resumeUrl: null })} projects={projects} locale="en" />);
    expect(document.getElementById('hero-cta')!.querySelectorAll('a')).toHaveLength(1);
    cleanup();
    render(<HeroTour profile={makeProfile({ email: '', resumeUrl: null, photoSrc: null })} projects={projects} locale="en" />);
    expect(document.getElementById('hero-cta')).toBeNull();
    expect(top().querySelector('.ht-hi img')).toBeNull();
  });

  it('omits the Now line when Profile has none in this language', () => {
    render(<HeroTour profile={makeProfile({ now: { en: '', th: '' } })} projects={projects} locale="en" />);
    expect(top().querySelector('.ht-sub')).toBeNull();
  });

  it('keeps the "|" break mark out of the Thai headline and holds keep-words together', () => {
    render(<HeroTour profile={profile} projects={projects} locale="th" />);
    // Normalise no-break spaces: keep-runs (C3) may join words with U+00A0.
    const plain = (s: string | null | undefined) => (s ?? '').replace(/ /g, ' ');
    expect(plain(h1().textContent)).toBe('นัก Business Development ที่สร้างเครื่องมือใช้เอง');
    expect(h1().querySelector('.nw')).not.toBeNull();
    expect(plain(top().querySelector('.ht-hi')?.textContent)).toBe('สวัสดีครับ ผม Suwichak');
  });

  it('shows the tour under the copy, playing the fixture lineup Aje → GoNai → klao-site', () => {
    render(<HeroTour profile={profile} projects={projects} locale="en" />);
    const tour = document.getElementById('tour')!;
    expect(top().contains(tour)).toBe(true);
    expect(Array.from(tour.querySelectorAll('[role="tab"]')).map((b) => b.getAttribute('aria-label'))).toEqual([
      'Aje · 1 of 3',
      'GoNai · 2 of 3',
      'klao-site · 3 of 3',
    ]);
  });

  it('gives Thai visitors 10 % longer on each frame', () => {
    vi.useFakeTimers();
    render(<HeroTour profile={profile} projects={projects} locale="th" />);
    const stage = document.querySelector('.ht-stage')!;
    FakeIO.watching(stage).fire([{ target: stage, intersectionRatio: 1, isIntersecting: true }]);
    const selected = () =>
      Array.from(document.querySelectorAll('[role="tab"]')).findIndex((b) => b.getAttribute('aria-selected') === 'true');
    tick(6599);
    expect(selected()).toBe(0);
    tick(1);
    expect(selected()).toBe(1);
  });

  it('leaves the stage out entirely when no project can be toured (Review Focus #1)', () => {
    render(<HeroTour profile={profile} projects={projects.filter((p) => p.type === 'business')} locale="en" />);
    expect(document.getElementById('tour')).toBeNull();
    expect(h1()).toBeTruthy();
  });

  it('server HTML already shows the headline, both actions and the first frame with its subtitle, nothing parked at opacity 0 (Review Focus #4)', () => {
    const html = renderToStaticMarkup(<HeroTour profile={profile} projects={projects} locale="en" />);
    expect(html).toContain('Business developer who builds his own tools.');
    expect(html).toContain('mailto:klao@example.com?subject=Hello%20from%20klao-site');
    expect(html).toContain('Is this idea worth a weekend, or a year?');
    expect(html).toContain('Aje · Working prototype');
    expect(html).toMatch(/<img[^>]*src="\/images\/aje\.jpg"[^>]*fetchpriority="high"/);
    expect(html).toContain('data-on=""');
    expect(html).not.toMatch(/opacity:\s*0/);
    expect(html).not.toContain('data-top');
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/hero-tour.test.tsx`
Expected: FAIL with `Failed to resolve import "@/components/sections/HeroTour"`.

- [ ] **Step 3: Implement**

Append to the end of `en` in `src/lib/dictionary.ts`:

```ts
  resumePdf: 'Résumé (PDF) ›',
```

Append to the end of `th`:

```ts
  resumePdf: 'เรซูเม่ (PDF) ›',
```

Create `src/components/sections/HeroTour.tsx`:

```tsx
import HeroTourStage from '@/components/HeroTourStage';
import ThaiText from '@/components/ThaiText';
import { dict } from '@/lib/dictionary';
import { mailtoHref } from '@/lib/format';
import type { Locale, Profile, Project } from '@/lib/models';
import { toTourSlides } from '@/lib/project-tour';
import './hero-tour.css';

/**
 * The first screen (spec §4 row 1): who he is, in one headline, the two things
 * to do next, and the tour of what he has built (C7: `#top` with `#tour` inside).
 *
 * Server component: every word here is in the first HTML response, so the hero
 * reads complete before (and without) JavaScript, the tour's first frame and
 * its subtitle included (Review Focus #4). HeroTourStage is the only client
 * island, and it receives plain serialisable slides built here.
 */
export default function HeroTour({ profile, projects, locale }: { profile: Profile; projects: Project[]; locale: Locale }) {
  const t = dict[locale];
  const first = profile.name.trim().split(/\s+/)[0];
  // The line under the headline is Profile.Now: the prototype's "Senior BD at
  // Actmedia · building AI tools nights & weekends" is the fixture's Now text,
  // word for word. Byline ("Bangkok · BD × Data Analytics …") is not on the
  // White Edition home page.
  const now = profile.now[locale];
  const slides = toTourSlides(projects, locale);
  const hasActions = Boolean(profile.email || profile.resumeUrl);

  return (
    <section id="top" className="ht-hero" aria-labelledby="hero-title">
      <div className="wrap ht-copy">
        <p className="ht-hi ht-in-a">
          {/* Decorative: the greeting beside it already names him. */}
          {profile.photoSrc && <img src={profile.photoSrc} alt="" width={64} height={64} />}
          <span>
            <ThaiText text={`${t.greeting} ${first}`} />
          </span>
        </p>
        <h1 id="hero-title" className="t-hero ht-h1 ht-in-b">
          <ThaiText text={profile.headline[locale]} />
        </h1>
        {now && (
          <p className="ht-sub ht-in-c">
            <ThaiText text={now} />
          </p>
        )}
        {hasActions && (
          // #hero-cta is the hook SiteNav watches: once this row has scrolled
          // away above, Contact fills and the phone thumb bar appears.
          <div id="hero-cta" className="ht-ctas ht-in-d">
            {profile.email && (
              <a className="btn btn-fill" href={mailtoHref(profile.email)}>
                {t.startConversation}
              </a>
            )}
            {profile.resumeUrl && (
              <a className="ht-lnk" href={profile.resumeUrl} target="_blank" rel="noopener">
                {t.resumePdf}
              </a>
            )}
          </div>
        )}
      </div>
      {slides.length > 0 && (
        <HeroTourStage
          slides={slides}
          vignette={{ titleEn: profile.headline.en, titleTh: profile.headline.th, photoSrc: profile.photoSrc || null }}
          locale={locale}
        />
      )}
    </section>
  );
}
```

Create `src/components/sections/hero-tour.css`:

```css
/* HeroTour — the #top section's copy (spec §4 row 1, §5.2; prototype
   .hero/.byline/.hsub/.ctas). The headline's size and tracking come from C9's
   .t-hero; this file only places things. The capsule nav is fixed
   (site-nav.css), so the hero carries its height in its own top padding:
   10 + 52 px of nav plus the prototype's 28 px. */
@layer components {
  .ht-hero { padding-top: 90px; text-align: center; }
  .ht-hi { display: inline-flex; align-items: center; gap: 12px; margin: 0 0 22px; font-size: 19px; font-weight: 600; }
  .ht-hi img { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; object-position: 50% 38%; }
  .ht-h1 { max-width: 12.5em; margin: 0 auto; text-wrap: balance; }
  .ht-sub {
    max-width: 40em; margin: 12px auto 0;
    font-size: 21px; line-height: 29px; letter-spacing: .011em;
    color: var(--ink-2); text-wrap: pretty;
  }
  :lang(th) .ht-sub { line-height: 32px; letter-spacing: 0; }
  .ht-ctas { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 22px; margin-top: 24px; }
  .ht-lnk { display: inline-flex; align-items: center; min-height: 44px; font-size: 17px; color: var(--link); text-decoration: none; }
  .ht-lnk:hover { text-decoration: underline; text-underline-offset: .12em; }

  /* Load choreography (prototype H1). The h1 is the LCP element, so it only
     moves (transform) and is never hidden; the rest fade and rise. Only after
     JS has marked <html>, and only when motion is welcome. */
  @media (prefers-reduced-motion: no-preference) {
    html.js .ht-in-a, html.js .ht-in-c, html.js .ht-in-d { animation: ht-rise 600ms var(--ease-settle) both; }
    html.js .ht-in-b { animation: ht-rise-t 600ms var(--ease-settle) 80ms both; }
    html.js .ht-in-c { animation-delay: 160ms; }
    html.js .ht-in-d { animation-delay: 240ms; }
  }

  @media (max-width: 734px) {
    .ht-hero { padding-top: calc(88px + env(safe-area-inset-top)); }
    .wrap.ht-copy { width: calc(100% - 32px); }
    .ht-hi { margin-bottom: 16px; font-size: 17px; }
    .ht-hi img { width: 44px; height: 44px; }
    .ht-sub { max-width: 22em; font-size: 17px; line-height: 24px; }
    :lang(th) .ht-sub { line-height: 27px; }
    .ht-ctas { gap: 12px 18px; margin-top: 20px; }
    .ht-ctas .btn { width: min(100%, 350px); }
  }

  @keyframes ht-rise { from { opacity: 0; transform: translateY(12px); } }
  @keyframes ht-rise-t { from { transform: translateY(20px); } }
}
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/hero-tour.test.tsx tests/dictionary.test.ts && npx tsc --noEmit`
Expected: PASS (9 hero tests).

- [ ] **Step 5: Commit**

HeroTour goes on the page in Task 12; its screenshots are taken there.

```bash
git add src/components/sections/HeroTour.tsx src/components/sections/hero-tour.css src/lib/dictionary.ts tests/hero-tour.test.tsx
git commit -m "feat(hero): HeroTour — greeting, headline, Now line, two actions and the tour, all in server HTML

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 12: Put HeroTour on the page; remove Hero, TourBand, ProjectTour

**Files:**
- Modify (full rewrite): `src/app/[locale]/page.tsx`
- Modify (full rewrite): `src/content/fixtures/profile.json`
- Modify: `src/lib/project-tour.ts` (delete `TOUR_MS`) · `src/lib/dictionary.ts` (delete `tourLabel`, `tourStill` in both locales) · `src/components/ProjectFrame.tsx` (two stale comments) · `src/app/globals.css` (old hero rules)
- Delete: `src/components/sections/Hero.tsx`, `src/components/sections/TourBand.tsx`, `src/components/ProjectTour.tsx`, `src/components/project-tour.css`, `tests/hero.test.tsx`, `tests/tour-band.test.tsx`, `tests/project-tour.test.tsx`
- Test: `tests/smoke.test.tsx` (one new `it`) · `tests/dictionary.test.ts` (replace the tour-labels `it`)

**Interfaces:**
- Consumes: `HeroTour` (Task 11).
- Produces: the home page in C7 order for P1: `#top`/`#tour` first, then the pre-White-Edition bands that P2–P4 replace. `MaskedHeading` stays: AboutBand, CraftBand, WorkDeck, SkillsBand, ClientsBand and ContactBand still import it, so it has consumers and P5 removes it.

- [ ] **Step 1: Write the failing test**

Add to `tests/smoke.test.tsx`, inside `describe('smoke: pages render in both locales (fixture mode)', …)`:

```ts
  it('opens the home page with HeroTour (#top holding #tour), not the old hero or tour band', async () => {
    for (const locale of locales) {
      const html = renderToStaticMarkup(await HomePage(p(locale)));
      expect(html).toContain('id="top"');
      expect(html).toContain('id="tour"');
      expect(html).toContain('id="hero-cta"');
      expect(html).not.toContain('id="hero"');
      expect(html).not.toContain('tour-band');
      expect(html.indexOf('id="top"')).toBeLessThan(html.indexOf('id="work"'));
    }
  });
```

In `tests/dictionary.test.ts`, replace the whole `it('carries the project-tour labels in both locales', …)` block with:

```ts
  it('carries the hero-tour labels in both locales', () => {
    expect(dict.en.tourListLabel).toBe('Project tour');
    expect(dict.en.tourPause).toBe('Pause the tour');
    expect(dict.en.tourPlay).toBe('Play the tour');
    expect(dict.en.tourReplay).toBe('Replay the tour');
    expect(dict.en.tourEndTitle).toBe('The idea, then the app.');
    expect('tourLabel' in dict.en).toBe(false);
    expect('tourStill' in dict.en).toBe(false);
    for (const k of ['tourListLabel', 'tourPrev', 'tourNext', 'tourPause', 'tourPlay', 'tourReplay', 'tourChapters', 'tourOf', 'tourEndTitle', 'tourEndKicker'] as const) {
      expect(dict.th[k]).toBeTruthy();
    }
  });
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/smoke.test.tsx tests/dictionary.test.ts`
Expected: FAIL. The home HTML has `id="hero"` and no `id="top"`, and `'tourLabel' in dict.en` is still true.

- [ ] **Step 3: Implement**

Replace `src/app/[locale]/page.tsx` with the file below. If P0 changed the props of any remaining band, keep P0's call for that band.

```tsx
import AboutBand from '@/components/sections/AboutBand';
import ClientsBand from '@/components/sections/ClientsBand';
import ContactBand from '@/components/sections/ContactBand';
import CraftBand from '@/components/sections/CraftBand';
import CvBand from '@/components/sections/CvBand';
import HeroTour from '@/components/sections/HeroTour';
import QuestionsBand from '@/components/sections/QuestionsBand';
import SkillsBand from '@/components/sections/SkillsBand';
import WorkDeck from '@/components/sections/WorkDeck';
import { getCareer, getFeaturedProjects, getProfile, getQuestions, getSkills } from '@/lib/content';
import { assertLocale } from '@/lib/locale';

// See layout.tsx: a layout-level `dynamicParams = false` poisons
// writing/[slug], so it is set per leaf page instead.
export const dynamicParams = false;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = assertLocale((await params).locale);
  const [profile, projects, career, skills, questions] = await Promise.all([
    getProfile(),
    getFeaturedProjects(),
    getCareer(),
    getSkills(),
    getQuestions(),
  ]);

  return (
    <>
      {/* White Edition (spec §4 row 1): the hero copy and the project tour are
          one section (#top with #tour inside). It replaces the old dark Hero
          and the separate TourBand. The bands below are the pre-White-Edition
          ones; P2–P4 replace them in C7 order, so this list shrinks phase by
          phase. */}
      <HeroTour profile={profile} projects={projects} locale={locale} />
      <AboutBand profile={profile} locale={locale} />
      <CraftBand locale={locale} />
      <WorkDeck projects={projects} locale={locale} />
      <QuestionsBand questions={questions} locale={locale} />
      <ClientsBand clients={profile.clients} locale={locale} />
      <SkillsBand skills={skills} locale={locale} />
      <CvBand entries={career} locale={locale} resumeUrl={profile.resumeUrl} />
      <ContactBand profile={profile} locale={locale} />
    </>
  );
}
```

Replace `src/content/fixtures/profile.json`. Changes: the spelling "Actmedia" (global constraint), and the one allowed break in the Thai headline (`|` before "ใช้เอง", so it never sits orphaned on a phone line; only ThaiText renders the headline now):

```json
{
  "name": "Suwichak Jarunopratamp (Klao)",
  "nameNative": "สุวิจักขณ์",
  "headline": {
    "en": "Business developer who builds his own tools.",
    "th": "นัก Business Development ที่สร้างเครื่องมือ|ใช้เอง"
  },
  "byline": {
    "en": "Bangkok · BD × Data Analytics · shipping apps with AI",
    "th": "กรุงเทพฯ · BD × Data Analytics · สร้างแอปด้วย AI"
  },
  "now": {
    "en": "Senior BD at Actmedia · building AI tools nights & weekends",
    "th": "Senior BD ที่ Actmedia · สร้างเครื่องมือ AI นอกเวลางาน"
  },
  "clients": [
    "Casetify",
    "Actmedia",
    "VELA Central World",
    "MMB Technology Co., Ltd",
    "A Bun Dance (Craft Burger)"
  ],
  "photoSrc": "/images/portrait.jpg",
  "linkedin": "https://www.linkedin.com/in/suvichuk-jarunopratump",
  "github": "https://github.com/Klaosj",
  "email": "suvichuk.j@gmail.com",
  "resumeUrl": "/suwichak-jarunopratamp-resume.pdf"
}
```

Delete the replaced components and their tests and CSS:

```bash
git rm src/components/sections/Hero.tsx src/components/sections/TourBand.tsx src/components/ProjectTour.tsx src/components/project-tour.css tests/hero.test.tsx tests/tour-band.test.tsx tests/project-tour.test.tsx
```

In `src/lib/project-tour.ts`, delete the `TOUR_MS` constant together with its doc comment.

In `src/lib/dictionary.ts`, delete `tourLabel` and `tourStill` from both `en` and `th`, with any comment that only describes them. Keep `tourListLabel`, `tourPrev`, `tourNext`, `tourPause` and `tourPlay`: the stage uses them.

In `src/components/ProjectFrame.tsx`, update the two comments that still mention the old tour:

```ts
  /** Window-chrome title (e.g. windowTitle(project) for a live app). Cards pass
   *  none: the name is the visible h3 beside them. */
  title?: string;
  /** Load eagerly, for a frame that is above the fold. */
  priority?: boolean;
```

and

```ts
// Server-safe (no hooks, no 'use client'): WorkDeck and ProjectCard are server
// components and render this directly.
```

In `src/app/globals.css`, delete what is left of the old Hero's styles. P0 may already have removed some. Check with:

```bash
grep -nE "#hero|data-hero-stage|data-pills|data-status-pill|data-portrait-placeholder|\.pill-[123]|pill-drift|\.halo|halo-spin" src/app/globals.css
```

Delete each hit's rule, and its comment when the comment is only about it. There are two special cases:
- The combined selector `#hero, #contact { overflow-x: clip; }` becomes `#contact { overflow-x: clip; }`: ContactBand is still on the page.
- The old hero-decoration `.pill` base rule (absolutely positioned, reads `--lagX`/`--pi`) goes if P0 left it. P0's C9 `.pill` (the 28 px chip) stays. `.u-draw` stays too: ContactBand uses it.

- [ ] **Step 4: Run and pass**

Run:

```bash
npm run check
grep -rnE "sections/Hero['\"]|TourBand|ProjectTour|project-tour\.css|TOUR_MS|tourLabel|tourStill" src tests
grep -nE "#hero|data-hero-stage|pill-drift|\.halo" src/app/globals.css
```

Expected: `npm run check` green, and both greps print nothing.

- [ ] **Step 5: Screenshot check**

Start `npm run dev` in the background and run `node /tmp/klao-qa/p1-shots.mjs hero` (see **Screenshot script**). Review, for EN/TH × light/dark × desk/phone:
- `-0s.png`: capsule nav above the greeting chip (64 px portrait, "Hi, I'm Suwichak"). The headline is centred on two balanced lines (Thai breaks only at `|`, before "ใช้เอง"), then the Now line and the two actions. The stage is 20:9 on desktop and 6:5 on phone, showing Aje on its pale-blue wash with the glass pill overlapping the stage's bottom edge (desktop) or sitting below it (phone): Pause, "Is this idea worth a weekend, or a year? ›", "Aje · Working prototype", three dots with the first one filling.
- `-mid.png`: GoNai on its pale-green wash, subtitle "One day in Bangkok — what's the real budget?", kicker ending `gonai-three.vercel.app`.
- `-end.png`: the klao-site Notion-row vignette with the Thai title showing, subtitle "The idea, then the app." / "2022 → 2026 ↓", the replay glyph, all dots filled.
- `p1-desk-en-light-reduced.png`: still on Aje after 8 s, ‹ › paddles on the stage, no Pause button.
- Dark: screenshots slightly dimmed, the pill dark glass, text readable.
- The script prints `no horizontal overflow, no console errors`.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add 'src/app/[locale]/page.tsx' src/content/fixtures/profile.json src/lib/project-tour.ts src/lib/dictionary.ts src/components/ProjectFrame.tsx src/app/globals.css tests/smoke.test.tsx tests/dictionary.test.ts
git commit -m "refactor(home): HeroTour takes the top of the page; Hero, TourBand and ProjectTour are gone

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

(`git rm` in Step 3 already staged the deletions.)

---

### Task 13: Phase gate

**Files:** none changed (verification only; commit only if a check forces a fix).

**Interfaces:** Consumes everything above. Produces the phase report.

- [ ] **Step 1: Full check and build**

Run: `npm run check && npm run build`
Expected: both green. The build uses fixture mode unless Notion env vars are set.

- [ ] **Step 2: Grep checks**

Run each command; each one must print nothing unless noted:

```bash
# removed components and the old nav are gone everywhere
grep -rnE "sections/Hero['\"]|TourBand|ProjectTour|project-tour\.css|TOUR_MS|tourLabel|tourStill" src tests
grep -rnE "nav-(on-light|chrome|solid|hidden|link|social|mark|burger)|data-lang-nav|LIGHT_BAND_SELECTOR" src tests
# AISecretary / DailyBrief stay out (master Global Constraints)
grep -rniE "aisecretary|dailybrief" src tests
ls public/images | grep -iE "aisecretary|dailybrief"
# no "instant"/"immediately" in P1 copy or code
grep -rniE "\binstant|immediately" src/components/SiteNav.tsx src/components/NavMenu.tsx src/components/ThumbBar.tsx src/components/HeroTourStage.tsx src/components/sections/HeroTour.tsx src/lib/project-tour.ts src/lib/tour-player.ts src/content/fixtures/projects.json
# P1 adds no scroll-linked animation (Signature, P2, is the only one)
grep -rn "animation-timeline" src/components
# only transform/opacity animate: every transition in P1 CSS lists nothing else (visibility flips are allowed)
grep -nE "transition:" src/components/site-nav.css src/components/nav-menu.css src/components/thumb-bar.css src/components/locale-toggle.css src/components/hero-tour-stage.css src/components/sections/hero-tour.css
```

The last command prints lines: read each one and confirm it names only `transform`, `opacity` or `visibility`. Then check the image budget:

```bash
wc -c public/images/aje.jpg public/images/gonai.jpg   # each ≤ 256000
```

- [ ] **Step 3: Screenshot review**

Start `npm run dev` in the background and run `node /tmp/klao-qa/p1-shots.mjs all` (see **Screenshot script**; takes about 4 minutes). Review every PNG under `/tmp/klao-qa/p1-*`:
- Nav, desktop: capsule, active pill on "Projects" after scrolling to `#work`, glass in both themes.
- Nav, phone menu open (EN/TH × light/dark): the whole panel fits in 844 px or scrolls inside itself, and the Thai labels don't break mid-word.
- Thumb bar, phone: visible after scrolling past the hero, 56 px, two buttons, above the home indicator.
- Hero tour at 0 s, mid and end, EN/TH × light/dark × desk/phone, as listed in Task 12 Step 5.
- The script prints `no horizontal overflow, no console errors`.

Stop the dev server.

- [ ] **Step 4: Report**

Write the phase report in chat:
- The tasks done, with commit hashes.
- Test count before and after (`npm test` summary line).
- The build result.
- The grep results.
- The screenshot paths reviewed, with anything that looked off.
- The open items under "Contract gaps" below that the next phase must pick up.

Nothing is pushed, merged or written to Notion in this phase.

---

## Contract gaps

1. **`ThemeToggle` props are not in C2.** P1 assumes `export default function ThemeToggle({ locale }: { locale: Locale })` (used once, in `NavMenu`). If P0 differs, change that one call.
2. **Import shapes assumed from P0:** `import { Icon } from '@/components/icons'` (named) and `import ThaiText from '@/components/ThaiText'` (default). Adjust the import lines if P0 chose otherwise. Icon names used: `magnifying-glass`, `x`, `pause`, `play`, `caret-left`, `caret-right`.
3. **New shared names P1 defines, for later phases to reuse rather than redefine:**
   - `slugKey`, `MAIL_SUBJECT`, `mailtoHref` (`format.ts`). P4's CloseBand should use `mailtoHref`.
   - `PALETTE_EVENT`, `openPalette` (`src/lib/deep-link.ts`). This is the same file and the same two exports P4's plan creates, so P4 **extends** it (adding `CAREER_EVENT`, `followTarget`, `goToTarget`) and does not recreate it; the signature and detail shape already match P4's.
   - Other P4 overlaps: P4 adds `fill(template, vars)` to `format.ts` and `copyText` in `clipboard.ts`. P1's `{name}`/`{n}`/`{total}` `.replace` calls and NavMenu's own clipboard call can move onto them then; nothing breaks if they don't.
   - `slugKey` keeps every word (`'MMB Technology Co., Ltd.'` becomes `'mmb-technology-co-ltd'`). P3 pins career keys from its real output, so no change is needed there.
   - `NAV_SECTIONS`, `NavSection`, `NAV_LABEL_KEY`, `sectionHref` (`nav.ts`).
   - `switchLocaleHref` and `LocaleToggle({ wide })`, for P4's footer language switch.
   - `PROJECT_STATUS_KEYS`, `PROJECT_MEDIA`, `PROJECT_WASHES` (`models.ts`).
   - `TourSlide`, `TourVignette`, `toTourSlides`, `tourKicker`, `tourDwellMs`, `TOUR_CAPTION_HREF` (`project-tour.ts`).
   - `tourReducer` (`tour-player.ts`).
4. **DOM hooks between sections:** `#hero-cta` (HeroTour's action row) is what SiteNav and ThumbBar watch. P4's CloseBand must keep the id `#contact` (C7), or the thumb bar will not step aside there.
5. **P2 hand-off:** in `toTourSlides`, replace `href: TOUR_CAPTION_HREF` with `sheetHash(projectKey(p))` (C6), then delete `TOUR_CAPTION_HREF`. The closing subtitle already links to `#signature`.
6. **Test helpers:** later phases extend `tests/helpers/profile.ts` (`makeProfile`) and `tests/helpers/project.ts` (`P1_DEFAULTS`, `makeProject`) when Profile or Project gain fields. `stubDialog`, `FakeIO`, `stubMatchMedia` and `tick` are ready for P2's sheet and P4's palette.
7. **Intermediate state inside the branch (fixed by later phases, not bugs of P1):**
   - Nav links to `#career`, `#story` and `#faq` dangle until P3/P4 (CvBand is still `#cv`), and the tour's closing link to `#signature` dangles until P2.
   - Desktop has no LinkedIn, GitHub or Writing link until P4's footer (the capsule has none, per the prototype); `/writing` and `/projects` lose their nav entry points.
   - `MaskedHeading` stays until P5.
   - `Profile.nameNative` is unused now that HeroMonument is gone; P5 may drop it.
8. **Not in any contract, so not built:** phone-specific tour crops (the prototype's `aje-phone.jpg`/`gonai-phone.jpg`) and per-image camera focal points. Project has one `imageSrc`, so on phones the stage centre-crops the desktop capture. Spec §13 lists the phone recaptures as open for Klao.
