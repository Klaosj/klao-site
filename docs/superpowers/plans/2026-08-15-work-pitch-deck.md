# Work Pitch Deck (Two Project Types) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat Work grid with a pitch-deck band that shows the owner's own projects in two typed chapters — Business first, then Build — one full-width question-led slide per project.

**Architecture:** Additive `Type`/`Outcome` fields flow Notion → `mapProject` → `Project` model (blank-safe defaults, existing rows unaffected). A new `WorkDeck` server component replaces `WorkGrid` on the homepage, preserving the wave-1 three-way link contract, `#work` anchor, and image/a11y attributes verbatim. `/projects` and the story-page receipts footer get the same type-aware stack gating.

**Tech Stack:** Next.js 15 (App Router, turbopack), React server components, Tailwind v4 tokens, Notion API, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-08-15-work-pitch-deck-design.md`

## Global Constraints

- Run tests per file with `npx vitest run tests/<file>`; full gate is `npm run check` (`tsc --noEmit && eslint . && vitest run`). `tsc` covers tests, so EVERY `Project` object literal must carry the new fields.
- Every user-visible string goes through `src/lib/dictionary.ts` in BOTH locales with `th !== en` (tests/dictionary.test.ts enforces; its shared-keys allowlist is empty).
- Notion schema changes are additive-only: blank/missing property → safe default (`type: 'build'`, `outcome: null`), never a dropped row.
- No fabricated content: fixtures stay the four real build projects; `outcome` is `null` everywhere until real numbers exist in Notion.
- Component tests: `// @vitest-environment jsdom` pragma, `afterEach(cleanup)`, stub `matchMedia` + `IntersectionObserver` in `beforeEach`, NO jest-dom matchers (use `toBeTruthy()` / `toBeNull()`).
- Preserve `id="work"` and the `t.selectedWork` `<h2>` eyebrow — `SiteNav.tsx:218` anchors to `#work`, `work/[slug]/page.tsx:140` links back to it, and `tests/smoke.test.tsx:79` asserts the eyebrow text on the home page.
- Preserve the wave-1 three-way link contract and the exact img attribute set (`width=800 height=450 loading="lazy" decoding="async"`, alt `` `${name} — ${description[locale]}` ``).
- Commit messages follow the repo's `type(scope): summary` style (see `git log --oneline`).

---

### Task 1: `Project.type` + `Project.outcome` — model, mapper, fixtures

**Files:**
- Modify: `src/lib/models.ts:44-58` (the `Project` interface, plus a new `ProjectType` export above it)
- Modify: `src/lib/notion-mappers.ts:38-56` (`mapProject`)
- Modify: `src/content/fixtures/projects.json` (all four objects)
- Modify: `tests/work-story.test.ts:32` (`baseProject` literal)
- Modify: `tests/sitemap-posts.test.ts:60` (`synthProjects` — both literals)
- Test: `tests/mappers.test.ts`

**Interfaces:**
- Consumes: `selectOf`, `text`, `localized` helpers already in `notion-mappers.ts` (lines 7-31); `select()` test helper already in `mappers.test.ts:6`.
- Produces: `export type ProjectType = 'business' | 'build'` and two new `Project` fields `type: ProjectType`, `outcome: Localized | null`. Notion property names: `Type` (Select: `Business`/`Build`), `OutcomeEN`, `OutcomeTH` (Text). Every later task relies on exactly these names.

- [ ] **Step 1: Write the failing mapper tests**

Append inside the existing `describe('mapProject', ...)` block in `tests/mappers.test.ts` (the `select` helper already exists at the top of the file):

```ts
  it('maps Type select Business to type business', () => {
    const page = { ...projectPage, properties: { ...projectPage.properties, Type: select('Business') } };
    expect(mapProject(page)!.type).toBe('business');
  });

  it('defaults type to build when Type is missing, blank, or unrecognised', () => {
    // Missing entirely (projectPage has no Type property at all):
    expect(mapProject(projectPage)!.type).toBe('build');
    // Present but empty:
    const blank = { ...projectPage, properties: { ...projectPage.properties, Type: select(null) } };
    expect(mapProject(blank)!.type).toBe('build');
    // Present but an unknown option — never a dropped row:
    const junk = { ...projectPage, properties: { ...projectPage.properties, Type: select('Startup') } };
    expect(mapProject(junk)!.type).toBe('build');
  });

  it('maps OutcomeEN/TH with th -> en fallback', () => {
    const page = {
      ...projectPage,
      properties: {
        ...projectPage.properties,
        OutcomeEN: rich('Validated with 3 paying pilots'),
        OutcomeTH: rich(''),
      },
    };
    expect(mapProject(page)!.outcome).toEqual({
      en: 'Validated with 3 paying pilots',
      th: 'Validated with 3 paying pilots',
    });
  });

  it('maps a row without Outcome to null (not dropped)', () => {
    const p = mapProject(projectPage);
    expect(p).not.toBeNull();
    expect(p!.outcome).toBeNull();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/mappers.test.ts`
Expected: the four new tests FAIL (`.type` / `.outcome` are `undefined`); all pre-existing tests still pass.

- [ ] **Step 3: Add the model fields**

In `src/lib/models.ts`, directly above `export interface Project`:

```ts
// Which pitch-deck chapter a project belongs to (spec 2026-08-15 §2).
// 'build' is the mapper's default so a Projects database that has never
// heard of the Type select keeps rendering exactly as before — the same
// additive-property treatment as CareerEntry.RoleTH / Profile.Clients.
export type ProjectType = 'business' | 'build';
```

Inside `export interface Project` add, after `order: number;`:

```ts
  // Pitch deck (spec 2026-08-15): chapter and the one-line receipt.
  // outcome is null when Notion's OutcomeEN is blank — the line simply
  // doesn't render, never a placeholder (owner's receipts rule).
  type: ProjectType;
  outcome: Localized | null;
```

- [ ] **Step 4: Extend `mapProject`**

In `src/lib/notion-mappers.ts`, inside the returned object of `mapProject` (after `order:`):

```ts
    type: selectOf(page.properties.Type) === 'Business' ? 'business' : 'build',
    outcome: text(page.properties.OutcomeEN)
      ? localized(text(page.properties.OutcomeEN), text(page.properties.OutcomeTH))
      : null,
```

- [ ] **Step 5: Update the fixture and the two test literals**

In `src/content/fixtures/projects.json`, add to EACH of the four objects, immediately after its `"order"` line:

```json
    "type": "build",
    "outcome": null,
```

(First object for reference — the other three get the identical two lines:)

```json
  {
    "id": "fx-dailybrief",
    "name": "DailyBrief",
    "description": { "en": "Automated news pipeline: RSS to Thai summaries delivered to Notion every morning.", "th": "ระบบข่าวอัตโนมัติ: RSS แปลสรุปเป็นไทย ส่งเข้า Notion ทุกเช้า" },
    "stack": ["Python", "Notion API"],
    "liveUrl": null,
    "repoUrl": null,
    "imageSrc": "/images/dailybrief.jpg",
    "featured": true,
    "order": 3,
    "type": "build",
    "outcome": null,
    "question": { "en": "Why does the morning news take so long to read?", "th": "ทำไมอ่านข่าวเช้าให้จบมันนานนัก?" },
    "slug": null
  }
```

In `tests/work-story.test.ts`, the `baseProject` literal (line 32) gains the same two fields:

```ts
  type: 'build',
  outcome: null,
```

In `tests/sitemap-posts.test.ts`, BOTH objects inside `synthProjects` (line 60) gain:

```ts
    type: 'build',
    outcome: null,
```

- [ ] **Step 6: Run the tests and the type check**

Run: `npx vitest run tests/mappers.test.ts tests/work-story.test.ts tests/sitemap-posts.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors. (`tests/work-grid.test.tsx` will now FAIL tsc — its `Project[]` literals lack the new fields. Add the two fields (`type: 'build'`, `outcome: null`) to its two object literals at lines 29-43 and 146-158 as a stopgap; the file is deleted in Task 4.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/models.ts src/lib/notion-mappers.ts src/content/fixtures/projects.json tests/mappers.test.ts tests/work-story.test.ts tests/sitemap-posts.test.ts tests/work-grid.test.tsx
git commit -m "feat(model): Project.type + Project.outcome — Business/Build taxonomy (pitch deck task 1)"
```

---

### Task 2: Dictionary — deck labels + subtitle

**Files:**
- Modify: `src/lib/dictionary.ts` (both the `en` object and the `th` object)
- Test: `tests/dictionary.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `dict.<locale>.workTypeBusiness`, `dict.<locale>.workTypeBuild`, `dict.<locale>.deckSubtitle` — Task 3 and Task 5 render exactly these keys.

- [ ] **Step 1: Write the failing test**

Append inside `describe('dictionary', ...)` in `tests/dictionary.test.ts`:

```ts
  it('carries the work-deck chapter labels and subtitle in both locales', () => {
    expect(dict.en.workTypeBusiness).toBe('Business');
    expect(dict.en.workTypeBuild).toBe('Build');
    expect(dict.en.deckSubtitle).toBeTruthy();
    expect(dict.th.workTypeBusiness).toBeTruthy();
    expect(dict.th.workTypeBuild).toBeTruthy();
    expect(dict.th.deckSubtitle).toBeTruthy();
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/dictionary.test.ts`
Expected: FAIL (`workTypeBusiness` does not exist on `dict.en`).

- [ ] **Step 3: Add the keys**

In `src/lib/dictionary.ts`, in the `en` object after `selectedWork: 'Selected work',`:

```ts
  // Pitch deck (spec 2026-08-15 §5): the two chapter labels and the deck
  // subtitle. Chapter labels also head the /projects listing's two groups.
  workTypeBusiness: 'Business',
  workTypeBuild: 'Build',
  deckSubtitle: 'Business first. Every project opens with the question it answers.',
```

In the `th` object after its `selectedWork` line:

```ts
  workTypeBusiness: 'ธุรกิจ',
  workTypeBuild: 'งานสร้างเอง',
  deckSubtitle: 'ธุรกิจมาก่อน — ทุกโปรเจกต์เริ่มจากคำถามที่มันตอบ',
```

- [ ] **Step 4: Run the full dictionary suite**

Run: `npx vitest run tests/dictionary.test.ts`
Expected: PASS — including the generic key-parity, no-empty-string, and `th !== en` checks over the new keys.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dictionary.ts tests/dictionary.test.ts
git commit -m "feat(i18n): work-deck chapter labels + subtitle (pitch deck task 2)"
```

---

### Task 3: `WorkDeck` component (built and tested, not yet wired)

**Files:**
- Create: `src/components/sections/WorkDeck.tsx`
- Test: `tests/work-deck.test.tsx` (new; ports every still-relevant contract from `tests/work-grid.test.tsx`)

**Interfaces:**
- Consumes: `Project` with `type`/`outcome` (Task 1); `dict.<locale>.workTypeBusiness` / `workTypeBuild` / `deckSubtitle` / `selectedWork` / `viewCode` (Task 2); `Reveal` (`@/components/motion/Reveal`, props `key`/`delayIndex`/optional `className`); `TiltCard` (`@/components/motion/TiltCard`, wraps children); `eyebrowFont(locale, latinTracking)` from `@/lib/typography`.
- Produces: `export default function WorkDeck({ projects, locale }: { projects: Project[]; locale: Locale })` — Task 4 imports this from `@/components/sections/WorkDeck`.

- [ ] **Step 1: Write the failing test file**

Create `tests/work-deck.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorkDeck from '@/components/sections/WorkDeck';
import { dict } from '@/lib/dictionary';
import type { Project } from '@/lib/models';

// Same manual-cleanup + stub setup as every other jsdom test in this repo
// (no setupFiles in vitest.config.ts — see work-grid.test.tsx's history).
afterEach(cleanup);

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

const build: Project = {
  id: 'p-build',
  name: 'GoNai',
  description: { en: 'Trip planner', th: 'วางแผนทริป' },
  stack: ['Next.js', 'Supabase'],
  liveUrl: 'https://gonai.example',
  repoUrl: null,
  imageSrc: '/api/img/page/1/Cover',
  featured: true,
  order: 2,
  type: 'build',
  outcome: null,
  question: { en: 'One day in Bangkok — what is the real budget?', th: 'ไปเที่ยวหนึ่งวัน งบจริงเท่าไหร่?' },
  slug: null,
};

const business: Project = {
  id: 'p-biz',
  name: 'SME Studio',
  description: { en: 'Order-bot studio for Thai SMEs', th: 'สตูดิโอบอทรับออเดอร์สำหรับ SME ไทย' },
  // Deliberately non-empty: the deck must HIDE stack on a business slide
  // even when Notion carries one.
  stack: ['LINE API'],
  liveUrl: null,
  repoUrl: null,
  imageSrc: null,
  featured: true,
  order: 1,
  type: 'business',
  outcome: { en: 'Validated with 3 paying pilots', th: 'ผ่านการทดสอบกับลูกค้าจ่ายจริง 3 ราย' },
  question: { en: 'Can a solo operator serve Thai SMEs?', th: 'คนเดียวดูแล SME ไทยได้ไหม?' },
  slug: null,
};

describe('WorkDeck', () => {
  it('keeps the #work anchor and the selectedWork eyebrow heading', () => {
    const { container } = render(<WorkDeck projects={[build]} locale="en" />);
    expect(container.querySelector('section#work')).toBeTruthy();
    const h2 = container.querySelector('h2');
    expect(h2?.textContent).toBe(dict.en.selectedWork);
  });

  it('renders business slides before build slides regardless of input order, with per-chapter kicker numbering', () => {
    const secondBiz: Project = { ...business, id: 'p-biz2', name: 'Little Duck', order: 3 };
    render(<WorkDeck projects={[build, business, secondBiz]} locale="en" />);
    const kickers = screen.getAllByText(/^[BT]·\d{2} — /);
    expect(kickers.map((k) => k.textContent)).toEqual([
      `B·01 — ${dict.en.workTypeBusiness}`,
      `B·02 — ${dict.en.workTypeBusiness}`,
      `T·01 — ${dict.en.workTypeBuild}`,
    ]);
  });

  it('renders no Business chapter at all when every project is a build (fixture mode)', () => {
    render(<WorkDeck projects={[build]} locale="en" />);
    // Query the kicker shape, not the bare word "Business" — the deck
    // subtitle legitimately contains that word on every render.
    expect(screen.queryByText(/^B·\d{2} — /)).toBeNull();
    expect(screen.getByText(`T·01 — ${dict.en.workTypeBuild}`)).toBeTruthy();
  });

  it('never renders stack on a business slide, even when set', () => {
    render(<WorkDeck projects={[business]} locale="en" />);
    expect(screen.queryByText('LINE API')).toBeNull();
  });

  it('renders the stack join line on a build slide', () => {
    render(<WorkDeck projects={[build]} locale="en" />);
    expect(screen.getByText('Next.js · Supabase')).toBeTruthy();
  });

  it('renders the outcome receipt line when present and omits it when null', () => {
    render(<WorkDeck projects={[business, build]} locale="en" />);
    expect(screen.getByText('Validated with 3 paying pilots')).toBeTruthy();
    // build has outcome: null — exactly one receipt line in the whole deck.
    expect(screen.getAllByText(/Validated/)).toHaveLength(1);
  });

  it('leads with the question when present and starts at the name (rendered once) when absent', () => {
    const noQuestion: Project = { ...build, question: null };
    render(<WorkDeck projects={[noQuestion]} locale="en" />);
    expect(screen.getAllByText('GoNai')).toHaveLength(1);
    expect(screen.queryByText(/real budget/)).toBeNull();
  });

  it('links a storied slide to its internal case-study page as ONE link, no external anchors', () => {
    const storied: Project = { ...build, slug: 'gonai' };
    const { container } = render(<WorkDeck projects={[storied]} locale="en" />);
    const anchors = container.querySelectorAll('a');
    expect(anchors).toHaveLength(1);
    expect(anchors[0].getAttribute('href')).toBe('/en/work/gonai');
    expect(anchors[0].hasAttribute('target')).toBe(false);
    expect(within(anchors[0] as HTMLElement).getByText('One day in Bangkok — what is the real budget?')).toBeTruthy();
  });

  it('prefers live over repo on an unstoried slide and recovers the repo as a sibling View code link when both are set', () => {
    const both: Project = { ...build, liveUrl: 'https://live.example', repoUrl: 'https://repo.example' };
    const { container } = render(<WorkDeck projects={[both]} locale="en" />);
    const anchors = container.querySelectorAll('a');
    expect(anchors).toHaveLength(2);
    expect(anchors[0].getAttribute('href')).toBe('https://live.example');
    expect(anchors[0].getAttribute('target')).toBe('_blank');
    expect(anchors[0].getAttribute('rel')).toBe('noreferrer');
    const secondary = screen.getByText(dict.en.viewCode) as HTMLAnchorElement;
    expect(secondary.getAttribute('href')).toBe('https://repo.example');
    expect((anchors[0] as HTMLElement).contains(secondary)).toBe(false);
  });

  it('renders a plain non-link slide when unstoried with neither URL', () => {
    const bare: Project = { ...build, liveUrl: null, repoUrl: null };
    const { container } = render(<WorkDeck projects={[bare]} locale="en" />);
    expect(container.querySelector('a')).toBeNull();
    expect(screen.getByText('GoNai')).toBeTruthy();
  });

  it('keeps the exact cover img contract: 800x450, lazy, async, name-dash-description alt', () => {
    const { container } = render(<WorkDeck projects={[build]} locale="en" />);
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('width')).toBe('800');
    expect(img.getAttribute('height')).toBe('450');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
    expect(img.getAttribute('alt')).toBe('GoNai — Trip planner');
  });

  it('renders an imageless slide as text with no img element', () => {
    const { container } = render(<WorkDeck projects={[business]} locale="en" />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('SME Studio')).toBeTruthy();
  });

  it('renders only the active locale and keeps Thai eyebrow/kicker/stack out of font-mono', () => {
    render(<WorkDeck projects={[build]} locale="th" />);
    expect(screen.getByText(dict.th.selectedWork)).toBeTruthy();
    expect(screen.queryByText(dict.en.selectedWork)).toBeNull();
    expect(screen.getByText(build.description.th)).toBeTruthy();
    expect(screen.queryByText(build.description.en)).toBeNull();
    const eyebrow = screen.getByText(dict.th.selectedWork);
    expect(eyebrow.className).not.toContain('font-mono');
    expect(eyebrow.className).toContain('font-thai');
    const kicker = screen.getByText(`T·01 — ${dict.th.workTypeBuild}`);
    expect(kicker.className).not.toContain('font-mono');
    expect(kicker.className).toContain('font-thai');
    const stackLine = screen.getByText('Next.js · Supabase');
    expect(stackLine.className).not.toContain('font-mono');
    expect(stackLine.className).toContain('font-thai');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/work-deck.test.tsx`
Expected: FAIL — cannot resolve `@/components/sections/WorkDeck`.

- [ ] **Step 3: Implement `WorkDeck`**

Create `src/components/sections/WorkDeck.tsx`:

```tsx
import Link from 'next/link';
import Reveal from '@/components/motion/Reveal';
import TiltCard from '@/components/motion/TiltCard';
import { dict } from '@/lib/dictionary';
import type { Locale, Project } from '@/lib/models';
import { eyebrowFont } from '@/lib/typography';

// Chapter order IS this literal's order (spec 2026-08-15 §3): business
// leads. The B/T prefixes are locale-invariant design marks; only the
// label word is translated. A chapter with no projects contributes no
// slides at all (flatMap over an empty filter) — no header, no kicker —
// which is exactly fixture mode, where all four projects are builds.
const GROUPS = [
  { type: 'business', prefix: 'B', labelKey: 'workTypeBusiness' },
  { type: 'build', prefix: 'T', labelKey: 'workTypeBuild' },
] as const;

// Server component — no 'use client'; Reveal/TiltCard own their client
// boundaries, same composition as WorkGrid had.
export default function WorkDeck({ projects, locale }: { projects: Project[]; locale: Locale }) {
  const t = dict[locale];
  const slides = GROUPS.flatMap((g) =>
    projects
      .filter((p) => p.type === g.type)
      .map((project, i) => ({
        project,
        kicker: `${g.prefix}·${String(i + 1).padStart(2, '0')} — ${t[g.labelKey]}`,
      })),
  );

  return (
    <section id="work" className="relative z-[2] bg-dark px-6 py-[11vh]">
      {/* The eyebrow carries the section's heading role — same WCAG 1.3.1
          rationale as WorkGrid's h2 (2026-08-09 QA), and smoke.test.tsx
          pins this exact text on the home page. */}
      <h2 className={`text-[9.5px] uppercase text-on-dark-soft ${eyebrowFont(locale, 'tracking-[0.24em]')}`}>
        {t.selectedWork}
      </h2>
      <p className="mt-2 text-[13px] text-on-dark-soft">{t.deckSubtitle}</p>
      {slides.map(({ project, kicker }, i) => {
        // Image side alternates on the GLOBAL slide index so the rhythm
        // carries across the chapter boundary. Text stays first in source
        // order — mobile always stacks text then image.
        const flip = i % 2 === 1;
        const href = project.liveUrl ?? project.repoUrl;

        const slide = (
          <div className="grid items-center gap-8 border-t border-on-dark-faint py-14 md:grid-cols-2">
            <div className={flip ? 'md:order-2' : ''}>
              <p className={`text-[10px] uppercase text-peri-deep ${eyebrowFont(locale, 'tracking-[0.22em]')}`}>
                {kicker}
              </p>
              {/* Question leads when present (wave-1 principle, restated for
                  the deck): absent question → the slide simply starts at the
                  name, which renders exactly once. */}
              {project.question && (
                <p className="mt-3 text-[15px] italic text-peri">{project.question[locale]}</p>
              )}
              <h3 className="mt-2 font-display text-3xl font-semibold md:text-[40px] md:leading-[1.1]">
                {project.name}
              </h3>
              <p className="mt-3 max-w-[44ch] text-[14.5px] leading-[1.6] text-on-dark-soft">
                {project.description[locale]}
              </p>
              {/* The receipt line: only ever real numbers from Notion
                  (Outcome*), so null simply means no line — never a
                  placeholder. Rendered for both types. */}
              {project.outcome && (
                <p className="mt-4 border-l-2 border-peri-deep pl-3 text-[12.5px] text-peri-deep">
                  {project.outcome[locale]}
                </p>
              )}
              {/* Stack is a build-chapter fact. A business slide never
                  shows it, even when Notion carries one (spec §3.6). */}
              {project.type === 'build' && project.stack.length > 0 && (
                <p className={`mt-4 text-[11px] text-peri-deep ${eyebrowFont(locale, '')}`}>
                  {project.stack.join(' · ')}
                </p>
              )}
            </div>
            {project.imageSrc && (
              <TiltCard>
                <div className="frame overflow-hidden rounded-[12px] border border-on-dark-faint bg-deep">
                  {/* 800x450 (16:9) — the real intrinsic size of the fixture
                      assets; see work-grid.test.tsx's layout-shift history. */}
                  <img
                    src={project.imageSrc}
                    alt={`${project.name} — ${project.description[locale]}`}
                    width={800}
                    height={450}
                    loading="lazy"
                    decoding="async"
                    className="block w-full"
                  />
                </div>
              </TiltCard>
            )}
          </div>
        );

        return (
          <Reveal key={project.id} delayIndex={i}>
            {/* Three-way link contract, unchanged from WorkGrid/wave 1:
                1. storied — ONE internal Link to the case-study page;
                   live/repo live on that page's receipts footer, never here.
                2. unstoried + URL — external anchor, live preferred over
                   repo, new tab, no referrer.
                3. unstoried + neither — plain div, never a dangling anchor. */}
            {project.slug ? (
              <Link href={`/${locale}/work/${project.slug}`}>{slide}</Link>
            ) : href ? (
              <a href={href} target="_blank" rel="noreferrer">
                {slide}
              </a>
            ) : (
              <div>{slide}</div>
            )}
            {!project.slug && project.liveUrl && project.repoUrl && (
              // Secondary repo link — a SIBLING of the primary anchor, never
              // nested (invalid HTML). Same hit-area idiom (p-2/-m-2,
              // WCAG 2.5.8) as ProjectCard and the old WorkGrid.
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center justify-center p-2 -m-2 text-[11px] text-on-dark-soft underline hover:text-peri"
              >
                {t.viewCode}
              </a>
            )}
          </Reveal>
        );
      })}
    </section>
  );
}
```

- [ ] **Step 4: Run the deck tests**

Run: `npx vitest run tests/work-deck.test.tsx`
Expected: PASS (all 13).

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/WorkDeck.tsx tests/work-deck.test.tsx
git commit -m "feat(work): WorkDeck pitch-deck band — typed chapters, question-led slides (pitch deck task 3)"
```

---

### Task 4: Wire the homepage, retire `WorkGrid`

**Files:**
- Modify: `src/app/[locale]/page.tsx` (import at line 10, usage at line 44)
- Delete: `src/components/sections/WorkGrid.tsx`, `tests/work-grid.test.tsx`
- Modify (comment-only): `src/components/SiteNav.tsx:211`, `src/components/ProjectCard.tsx`, `src/components/sections/ContactBand.tsx`, `src/components/sections/CvBand.tsx` — these carry prose comments naming `WorkGrid`

**Interfaces:**
- Consumes: `WorkDeck` (Task 3) with the same `{ projects, locale }` props `WorkGrid` took — the `getFeaturedProjects()` data flow in `page.tsx` is untouched.
- Produces: nothing new; the home route now renders the deck.

- [ ] **Step 1: Swap the import and usage**

In `src/app/[locale]/page.tsx` replace:

```tsx
import WorkGrid from '@/components/sections/WorkGrid';
```

with:

```tsx
import WorkDeck from '@/components/sections/WorkDeck';
```

and replace `<WorkGrid projects={projects} locale={locale} />` with:

```tsx
<WorkDeck projects={projects} locale={locale} />
```

- [ ] **Step 2: Delete the old component and its test**

```bash
git rm src/components/sections/WorkGrid.tsx tests/work-grid.test.tsx
```

- [ ] **Step 3: Fix stale comment references**

`grep -rn "WorkGrid" src tests` — for each remaining hit (all inside prose comments in `SiteNav.tsx`, `ProjectCard.tsx`, `ContactBand.tsx`, `CvBand.tsx`), replace the word `WorkGrid` with `WorkDeck` where the comment describes the live home-page band. Re-run the grep; expected: zero hits.

- [ ] **Step 4: Run the affected suites and the full check**

Run: `npx vitest run tests/smoke.test.tsx tests/work-deck.test.tsx && npm run check`
Expected: PASS — smoke still finds `t.selectedWork` on the home page; no dangling imports; tsc/eslint clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(work): swap WorkDeck into the home page, retire WorkGrid (pitch deck task 4)"
```

---

### Task 5: `/projects` grouping + type-aware stack gating everywhere

**Files:**
- Modify: `src/app/[locale]/projects/page.tsx:26-37` (copy) and `77-99` (grouped render)
- Modify: `src/components/ProjectCard.tsx:53` (stack gate)
- Modify: `src/app/[locale]/work/[slug]/page.tsx:155` (receipts-footer stack gate)
- Test: `tests/project-card.test.tsx` (new)

**Interfaces:**
- Consumes: `Project.type` (Task 1), `dict.<locale>.workTypeBusiness` / `workTypeBuild` (Task 2), existing `ProjectCard` props.
- Produces: nothing new — presentation changes only.

- [ ] **Step 1: Write the failing `ProjectCard` tests**

Create `tests/project-card.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import ProjectCard from '@/components/ProjectCard';
import type { Project } from '@/lib/models';

afterEach(cleanup);

const base: Project = {
  id: 'p1',
  name: 'GoNai',
  description: { en: 'Trip planner', th: 'วางแผนทริป' },
  stack: ['Next.js', 'Supabase'],
  liveUrl: null,
  repoUrl: null,
  imageSrc: null,
  featured: true,
  order: 1,
  type: 'build',
  outcome: null,
  question: null,
  slug: null,
};

describe('ProjectCard', () => {
  it('renders the stack line for a build project', () => {
    render(<ProjectCard project={base} locale="en" />);
    expect(screen.getByText('Next.js · Supabase')).toBeTruthy();
  });

  it('renders no stack line for a business project, even when stack is set', () => {
    render(<ProjectCard project={{ ...base, type: 'business' }} locale="en" />);
    expect(screen.queryByText('Next.js · Supabase')).toBeNull();
  });

  it('renders no empty stack paragraph for a build project with an empty stack', () => {
    const { container } = render(<ProjectCard project={{ ...base, stack: [] }} locale="en" />);
    // The description <p> remains; the stack <p> must not render as an
    // empty element.
    const paragraphs = Array.from(container.querySelectorAll('p'));
    expect(paragraphs.some((p) => p.textContent === '')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/project-card.test.tsx`
Expected: the second and third tests FAIL (stack renders unconditionally today).

- [ ] **Step 3: Gate the two stack renders**

In `src/components/ProjectCard.tsx`, replace line 53:

```tsx
      <p className="mt-3 text-xs text-soft">{project.stack.join(' · ')}</p>
```

with:

```tsx
      {/* Stack is a build-type fact (spec 2026-08-15 §4) — business rows
          never show it, and an empty stack renders no empty element. */}
      {project.type === 'build' && project.stack.length > 0 && (
        <p className="mt-3 text-xs text-soft">{project.stack.join(' · ')}</p>
      )}
```

In `src/app/[locale]/work/[slug]/page.tsx`, replace line 155:

```tsx
        <span>{story.stack.join(' · ')}</span>
```

with:

```tsx
        {/* Gated: a business story has no stack, and an empty <span> is
            still a flex item — it would paint a stray gap-4 before the
            first link. */}
        {story.stack.length > 0 && <span>{story.stack.join(' · ')}</span>}
```

- [ ] **Step 4: Group the `/projects` listing**

In `src/app/[locale]/projects/page.tsx`, replace the body of `ProjectsPage` (lines 77-99) with:

```tsx
export default async function ProjectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = assertLocale((await params).locale);
  const t = dict[locale];
  const projects = await getProjects();
  // Business first, same chapter order as WorkDeck; an empty group renders
  // nothing (fixture mode has no business rows yet).
  const groups = [
    { label: t.workTypeBusiness, items: projects.filter((p) => p.type === 'business') },
    { label: t.workTypeBuild, items: projects.filter((p) => p.type === 'build') },
  ].filter((g) => g.items.length > 0);

  return (
    // See layout.tsx: the shared header is now fixed and transparent, and
    // <main> no longer constrains width for the redesigned full-bleed home
    // route -- this page carries its own reading-width column and top
    // padding to clear the header instead.
    <div className="mx-auto w-full max-w-3xl px-6 pb-16 pt-28">
      <h1 className="font-display text-3xl">{t.projects}</h1>
      {groups.map((g) => (
        <section key={g.label} className="mt-8">
          <h2 className="text-xs uppercase tracking-widest text-soft">{g.label}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((p) => (
              <ProjectCard key={p.id} project={p} locale={locale} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

(The `t.allProjects` heading goes away; the dictionary key stays — other
routes' nav labels are untouched.)

- [ ] **Step 5: Update the page's own copy (it currently claims software-only)**

Replace the `descriptions` and `ogAlt` constants (lines 26-37):

```tsx
const descriptions: Record<Locale, string> = {
  en: "Klao's own projects — business plays and shipped software, grouped into Business and Build — with stories, live links and source code where public.",
  th: 'โปรเจกต์ของเกลาเอง ทั้งฝั่งธุรกิจและซอฟต์แวร์ที่สร้างจริง แบ่งเป็นสองหมวด พร้อมเรื่องราว ลิงก์ใช้งานจริง และซอร์สโค้ดเท่าที่เปิดเผยได้',
};

const ogAlt: Record<Locale, string> = {
  en: 'Klao — own projects across business and build, told as case studies with receipts.',
  th: 'เกลา — โปรเจกต์ส่วนตัวทั้งฝั่งธุรกิจและฝั่งสร้าง เล่าเป็นเคสพร้อมใบเสร็จของผลลัพธ์',
};
```

- [ ] **Step 6: Run the affected suites**

Run: `npx vitest run tests/project-card.test.tsx tests/route-metadata.test.ts tests/work-story.test.ts`
Expected: PASS — route-metadata's `/projects` pins are content-shape checks (non-empty, contains "project", Thai script on /th, OG mirroring), all still satisfied by the new copy.

- [ ] **Step 7: Commit**

```bash
git add src/app/[locale]/projects/page.tsx src/components/ProjectCard.tsx "src/app/[locale]/work/[slug]/page.tsx" tests/project-card.test.tsx
git commit -m "feat(projects): Business/Build grouping + type-aware stack gating (pitch deck task 5)"
```

---

### Task 6: Notion setup docs + full gate

**Files:**
- Modify: `docs/NOTION_SETUP.md:41-77` (Projects table + prose)
- Verify: whole repo

**Interfaces:**
- Consumes: property names from Task 1 (`Type`, `OutcomeEN`, `OutcomeTH`) — the doc must match the mapper exactly.
- Produces: the owner-facing schema contract.

- [ ] **Step 1: Extend the Projects property table**

In `docs/NOTION_SETUP.md`, add three rows to the Projects table (after the `Order` row):

```markdown
| Type | Select: `Business` / `Build` | |
| OutcomeEN | Text | |
| OutcomeTH | Text | |
```

- [ ] **Step 2: Add the prose rules**

After the existing `Featured`/`Order` paragraph (lines 59-60), add:

```markdown
`Type` decides which pitch-deck chapter the project appears in on the home
page (and which group on /projects): `Business` rows lead, `Build` rows
follow. **A blank or unrecognised Type renders as Build** — existing rows
keep working untouched until you tag them.

`OutcomeEN`/`OutcomeTH` are the one-line receipt shown on the project's
slide ("Validated with 3 paying pilots"). Only real, checkable results —
leave blank until you have the number, and the line simply won't render.
Never write a placeholder here.
```

- [ ] **Step 3: Run the full gate**

Run: `npm run check && npm run build`
Expected: tsc, eslint, full vitest suite, and a fixture-mode production build all PASS.

- [ ] **Step 4: Commit**

```bash
git add docs/NOTION_SETUP.md
git commit -m "docs(notion): Type + Outcome properties for the pitch deck (pitch deck task 6)"
```

---

## Owner checklist (Notion, no code — after deploy)

1. Projects DB → add `Type` (Select, options exactly `Business` and `Build`), `OutcomeEN` (Text), `OutcomeTH` (Text).
2. Tag the four existing rows `Build`.
3. Add Business rows (SME Studio, Little Duck, …) with QuestionEN/TH + descriptions; Outcome only when the number is real.
4. Stories for business projects follow the existing slug-last rule: write the page body first, fill `Slug` last (the 404-trap ruling).
