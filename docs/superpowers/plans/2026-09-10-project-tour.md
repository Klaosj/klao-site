# Project Tour + real screenshots — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hero "project tour" that plays through real project screenshots in a window frame, share that frame with the deck and /projects rows, add the Aje and klao-site projects, and refresh screenshots.

**Architecture:** One pure helper module (`src/lib/project-tour.ts`) decides membership/order/title; one server-safe presentational component (`ProjectFrame`) draws the window + screenshot or a monogram cover; one client component (`ProjectTour`) owns playback state and renders a tablist + stage into the hero's CSS grid areas. Content stays two-layer (fixture JSON + Notion), no new Notion properties.

**Tech Stack:** Next.js 15.5 (App Router, Turbopack), React 19, Tailwind v4 + plain CSS files, Vitest 3 + Testing Library (jsdom per-file), TypeScript 6. No animation library.

**Spec:** `docs/superpowers/specs/2026-09-10-project-tour-design.md`

## Global Constraints

- Repo: `~/Desktop/Klao Workspace/Personal/klao-site`, branch `main` only. Commit style: `type(scope): summary` (`feat`, `fix`, `test`, `content`, `docs`, `chore`).
- Run every command in the foreground with an explicit timeout; never background `npm` or dev servers from a subagent.
- Never run `npm run build` while a dev server is running on the same `.next` (corrupts the dev cache).
- `eslint.config.mjs` is write-protected by a harness hook — do not touch it.
- Every jsdom test file owns its own `afterEach(cleanup)` and stubs `matchMedia` + `IntersectionObserver` in `beforeEach` (see any existing `tests/*.test.tsx`).
- Dictionary: every key exists in BOTH `en` and `th`, non-empty, and `en !== th` (pinned by `tests/dictionary.test.ts`).
- Thai text: no `italic`, no wide `tracking-*`; use `eyebrowFont(locale, ...)` from `src/lib/typography.ts` when a Latin eyebrow needs tracking.
- No placeholder copy in `src/` or fixtures (`tests/no-placeholders.test.tsx`): never the words placeholder/TODO/FIXME/lorem ipsum/example.dev in shipped files.
- Image contract (pinned by tests): `<img width="800" height="450" decoding="async">`, `loading="lazy"` unless `priority`, alt from `imageAlt(src)` and never containing the project name or description.
- Palette tokens live in `src/app/globals.css` `@theme` (`--color-peri #2f6955`, `--color-line #dce5df`, `--color-card #f0f5f2`, `--color-soft #53625c`, `--color-ink #20332d`, `--font-display`, `--font-thai`). Use them; do not invent new hues.
- Tasks 0, 7, 9, 11 are done by the main session (they need git authorship decisions, a browser/screen, or Notion MCP). Tasks 1–6, 8, 10 are subagent tasks.

---

### Task 0 (main session): commit the light redesign as its own commit

**Files:**
- Modify (already modified in the working tree): `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`, `src/app/globals.css`, `src/components/SiteNav.tsx`, `src/components/sections/{ContactBand,CraftBand,Hero,SkillsBand,WorkDeck}.tsx`, `src/components/site-nav.css`, `src/lib/theme.ts`, `tests/{bands,hero,theme,work-deck}.test.*`
- Untracked: `.diagram-design`, `docs/architecture-diagram.html`, `docs/feature-board.html`, `docs/superpowers/specs/2026-09-10-project-tour-design.md`, `docs/superpowers/plans/2026-09-10-project-tour.md`

- [ ] **Step 1: Confirm the tree is green as-is**

Run: `npm run check` (timeout 300 s)
Expected: `Test Files 36 passed`, `Tests 373 passed`, no tsc/eslint errors.

- [ ] **Step 2: Commit the redesign alone**

```bash
git add src/ tests/
git commit -m "feat(design): adopt the light redesign — paper surfaces, green accent, copy-first hero

Uncommitted working-tree redesign dated 2026-09-05 12:10 (origin outside this
repo's Claude Code sessions). HeroMonument/particles are no longer mounted;
hero is copy left + portrait right; WorkDeck is a two-column card grid;
CraftBand moves to the end. 373/373 tests green on this tree.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01KHy163swb8kMuwXaNUNakJ"
```

- [ ] **Step 3: Commit the docs**

```bash
git add .diagram-design docs/architecture-diagram.html docs/feature-board.html docs/superpowers/specs/2026-09-10-project-tour-design.md docs/superpowers/plans/2026-09-10-project-tour.md
git commit -m "docs: feature census diagrams (2026-08-29) + project-tour spec and plan (2026-09-10)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01KHy163swb8kMuwXaNUNakJ"
```

- [ ] **Step 4: Verify clean tree**

Run: `git status --short`
Expected: empty.

---

### Task 1: Tour copy in the dictionary

**Files:**
- Modify: `src/lib/dictionary.ts` (the `en` object ends near line 190; the `th` object ends near line 283, just before `export type UiDict`)
- Test: `tests/dictionary.test.ts`

**Interfaces:**
- Produces: `dict[locale].tourLabel | tourListLabel | tourPrev | tourNext | tourPause | tourPlay | tourStill` (all `string`), consumed by Task 5.

- [ ] **Step 1: Write the failing test**

Append inside the existing `describe('dictionary', ...)` block in `tests/dictionary.test.ts`:

```ts
  it('carries the project-tour labels in both locales', () => {
    expect(dict.en.tourLabel).toBe('Things I shipped, running');
    expect(dict.en.tourListLabel).toBe('Project tour');
    expect(dict.en.tourPrev).toBe('Previous project');
    expect(dict.en.tourNext).toBe('Next project');
    expect(dict.en.tourPause).toBe('Pause the tour');
    expect(dict.en.tourPlay).toBe('Play the tour');
    expect(dict.en.tourStill).toBe('Still view');
    for (const k of ['tourLabel', 'tourListLabel', 'tourPrev', 'tourNext', 'tourPause', 'tourPlay', 'tourStill'] as const) {
      expect(dict.th[k]).toBeTruthy();
    }
  });
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/dictionary.test.ts` (timeout 120 s)
Expected: FAIL — `tourLabel` is undefined (and a TypeScript complaint about the key).

- [ ] **Step 3: Add the keys**

In `src/lib/dictionary.ts`, add to the END of the `en` object (after `contentUpdated: ...`):

```ts
  // Project tour (spec 2026-09-10 §8): the hero's screenshot walkthrough.
  tourLabel: 'Things I shipped, running',
  tourListLabel: 'Project tour',
  tourPrev: 'Previous project',
  tourNext: 'Next project',
  tourPause: 'Pause the tour',
  tourPlay: 'Play the tour',
  tourStill: 'Still view',
```

and to the END of the `th` object (after `contentUpdated: ...`):

```ts
  tourLabel: 'ของที่ผมสร้าง และยังรันอยู่',
  tourListLabel: 'ทัวร์โปรเจกต์',
  tourPrev: 'โปรเจกต์ก่อนหน้า',
  tourNext: 'โปรเจกต์ถัดไป',
  tourPause: 'หยุดทัวร์ชั่วคราว',
  tourPlay: 'เล่นทัวร์',
  tourStill: 'มุมมองภาพนิ่ง',
```

- [ ] **Step 4: Run the dictionary tests**

Run: `npx vitest run tests/dictionary.test.ts`
Expected: PASS (all 6 tests, including key-parity and en≠th).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dictionary.ts tests/dictionary.test.ts
git commit -m "feat(dictionary): project-tour labels, en/th"
```

---

### Task 2: Tour helpers (membership, order, window title)

**Files:**
- Create: `src/lib/project-tour.ts`
- Test: `tests/project-tour-helpers.test.ts` (node environment — no jsdom header)

**Interfaces:**
- Consumes: `Project` from `src/lib/models.ts`.
- Produces:
  - `export const TOUR_MS: number` (7000)
  - `export function tourProjects(projects: Project[]): Project[]` — only projects whose `imageSrc` is a non-empty string, sorted ascending by `order`, input untouched.
  - `export function windowTitle(project: Project): string` — host of `liveUrl` when it parses as a URL, else `project.name`.

- [ ] **Step 1: Write the failing tests**

Create `tests/project-tour-helpers.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { TOUR_MS, tourProjects, windowTitle } from '@/lib/project-tour';
import type { Project } from '@/lib/models';

const make = (id: string, order: number, extra: Partial<Project> = {}): Project => ({
  id,
  name: id,
  description: { en: `${id} desc`, th: `${id} ไทย` },
  stack: [],
  liveUrl: null,
  repoUrl: null,
  imageSrc: `/api/img/page/${id}/Screenshot`,
  featured: true,
  order,
  type: 'build',
  outcome: null,
  question: null,
  slug: null,
  ...extra,
});

describe('tourProjects', () => {
  it('keeps only projects that have a screenshot, sorted by order, without mutating the input', () => {
    const input = [make('c', 3), make('nope', 0, { imageSrc: null }), make('a', 1), make('blank', 2, { imageSrc: '' })];
    const snapshot = [...input];
    expect(tourProjects(input).map((p) => p.id)).toEqual(['a', 'c']);
    expect(input).toEqual(snapshot);
  });

  it('returns an empty list when nothing has a screenshot', () => {
    expect(tourProjects([make('x', 1, { imageSrc: null })])).toEqual([]);
  });
});

describe('windowTitle', () => {
  it('uses the live URL host when there is one', () => {
    expect(windowTitle(make('g', 1, { name: 'GoNai', liveUrl: 'https://gonai-three.vercel.app/en?x=1' }))).toBe('gonai-three.vercel.app');
  });

  it('falls back to the project name without a live URL, or with an unparseable one', () => {
    expect(windowTitle(make('a', 1, { name: 'AISecretary' }))).toBe('AISecretary');
    expect(windowTitle(make('b', 1, { name: 'Broken', liveUrl: 'not a url' }))).toBe('Broken');
  });
});

describe('TOUR_MS', () => {
  it('is seven seconds', () => {
    expect(TOUR_MS).toBe(7000);
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run tests/project-tour-helpers.test.ts`
Expected: FAIL — cannot resolve `@/lib/project-tour`.

- [ ] **Step 3: Implement**

Create `src/lib/project-tour.ts`:

```ts
import type { Project } from './models';

/** One slide of the hero tour, in milliseconds. Also drives the CSS progress
 *  bar (ProjectTour passes it as `--tour-ms`), so there is one number. */
export const TOUR_MS = 7000;

/** Membership rule (spec 2026-09-10 §4): the tour shows things you can SEE
 *  running — only projects with a real screenshot. Business ideas without a
 *  screen stay in the deck with a monogram cover and join the tour the day a
 *  screenshot is uploaded to Notion. Never mutates the caller's array. */
export function tourProjects(projects: Project[]): Project[] {
  return projects
    .filter((p) => typeof p.imageSrc === 'string' && p.imageSrc.length > 0)
    .sort((a, b) => a.order - b.order);
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
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/project-tour-helpers.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/project-tour.ts tests/project-tour-helpers.test.ts
git commit -m "feat(tour): membership, order and window-title helpers"
```

---

### Task 3: ProjectFrame — window chrome + screenshot or monogram cover

**Files:**
- Create: `src/components/ProjectFrame.tsx`, `src/components/project-frame.css`
- Test: `tests/project-frame.test.tsx`

**Interfaces:**
- Consumes: `imageAlt(src)` from `src/lib/image-alt.ts`; `Project` type.
- Produces: `export default function ProjectFrame({ project, title, priority, className }: { project: Project; title?: string; priority?: boolean; className?: string })`. Root element has `data-project-frame` and class `pframe`. Screenshot `<img>` inside `.pframe-screen`. Cover is `div.pcover[data-cover][aria-hidden="true"]`. Title renders as `span.pframe-title` only when `title` is given.

- [ ] **Step 1: Write the failing tests**

Create `tests/project-frame.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import ProjectFrame from '@/components/ProjectFrame';
import { IMAGE_ALT, imageAlt } from '@/lib/image-alt';
import type { Project } from '@/lib/models';

afterEach(cleanup);

const base: Project = {
  id: 'p1',
  name: 'GoNai',
  description: { en: 'Trip planner', th: 'วางแผนทริป' },
  stack: ['Next.js'],
  liveUrl: 'https://gonai-three.vercel.app',
  repoUrl: null,
  imageSrc: '/api/img/page/1/Screenshot',
  featured: true,
  order: 1,
  type: 'build',
  outcome: null,
  question: null,
  slug: null,
};

describe('ProjectFrame', () => {
  it('renders the screenshot under the shared img contract', () => {
    const { container } = render(<ProjectFrame project={base} />);
    const img = container.querySelector('.pframe-screen img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(base.imageSrc);
    expect(img.getAttribute('width')).toBe('800');
    expect(img.getAttribute('height')).toBe('450');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
    expect(img.getAttribute('alt')).toBe(imageAlt(base.imageSrc as string));
    expect(img.getAttribute('alt')).not.toContain('GoNai');
  });

  it('loads eagerly when priority is set', () => {
    const { container } = render(<ProjectFrame project={base} priority />);
    expect(container.querySelector('img')?.getAttribute('loading')).toBe('eager');
  });

  it('uses the curated alt for a known fixture asset', () => {
    const { container } = render(<ProjectFrame project={{ ...base, imageSrc: '/images/gonai.jpg' }} />);
    expect(container.querySelector('img')?.getAttribute('alt')).toBe(IMAGE_ALT['/images/gonai.jpg']);
  });

  it('shows a decorative monogram cover, and no img, when there is no screenshot', () => {
    const { container } = render(<ProjectFrame project={{ ...base, name: 'Talatify', imageSrc: null }} />);
    expect(container.querySelector('img')).toBeNull();
    const cover = container.querySelector('[data-cover]') as HTMLElement;
    expect(cover.getAttribute('aria-hidden')).toBe('true');
    expect(cover.textContent).toBe('T');
  });

  it('shows the window title only when one is given, and hides the chrome from assistive tech', () => {
    const untitled = render(<ProjectFrame project={base} />);
    expect(untitled.container.querySelector('.pframe-title')).toBeNull();
    expect(untitled.container.querySelector('.pframe-chrome')?.getAttribute('aria-hidden')).toBe('true');
    cleanup();
    const titled = render(<ProjectFrame project={base} title="gonai-three.vercel.app" />);
    expect(titled.container.querySelector('.pframe-title')?.textContent).toBe('gonai-three.vercel.app');
  });

  it('marks the root so callers and tests can find it, and accepts a className', () => {
    const { container } = render(<ProjectFrame project={base} className="extra" />);
    const root = container.querySelector('[data-project-frame]') as HTMLElement;
    expect(root.classList.contains('pframe')).toBe(true);
    expect(root.classList.contains('extra')).toBe(true);
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run tests/project-frame.test.tsx`
Expected: FAIL — cannot resolve `@/components/ProjectFrame`.

- [ ] **Step 3: Implement the component**

Create `src/components/ProjectFrame.tsx`:

```tsx
import './project-frame.css';
import { imageAlt } from '@/lib/image-alt';
import type { Project } from '@/lib/models';

type Props = {
  project: Project;
  /** Window-chrome title. Cards pass none (the name is the visible h3 beside
   *  them); the hero tour passes windowTitle(project). */
  title?: string;
  /** First tour slide only: eager load so the LCP image isn't lazy. */
  priority?: boolean;
  className?: string;
};

// Server-safe (no hooks, no 'use client'): WorkDeck and ProjectCard are server
// components and render this directly; ProjectTour renders it from a client
// component, which is also fine.
export default function ProjectFrame({ project, title, priority = false, className = '' }: Props) {
  return (
    <div className={`pframe ${className}`.trim()} data-project-frame>
      {/* Decorative window chrome: a screen reader gets the image (or nothing,
          for the cover) and the visible text beside the frame, never "dot dot
          dot host". */}
      <div className="pframe-chrome" aria-hidden="true">
        <i />
        <i />
        <i />
        {title && <span className="pframe-title">{title}</span>}
      </div>
      <div className="pframe-screen">
        {project.imageSrc ? (
          <img
            src={project.imageSrc}
            alt={imageAlt(project.imageSrc)}
            width={800}
            height={450}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
          />
        ) : (
          // Monogram cover for a project with no screenshot yet (spec §5).
          // aria-hidden: it carries nothing a screen reader hasn't already
          // heard from the visible name next to the frame — and it is never
          // a fake UI (receipts rule).
          <div className="pcover" data-cover aria-hidden="true">
            {project.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}
```

Create `src/components/project-frame.css`:

```css
/* ProjectFrame — a quiet window around a real screenshot (spec 2026-09-10 §5).
   Colors are the light-redesign tokens from globals.css @theme. */
.pframe {
  border: 1px solid var(--color-line);
  border-radius: 12px;
  overflow: hidden;
  background: var(--color-light);
}
.pframe-chrome {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  background: var(--color-card);
  border-bottom: 1px solid var(--color-line);
}
.pframe-chrome > i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #c9d8ce;
}
.pframe-title {
  margin-left: 8px;
  min-width: 0;
  font-family: var(--font-display);
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--color-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pframe-screen {
  aspect-ratio: 16 / 9;
  background: #e9efea;
  display: grid;
}
.pframe-screen > img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* Tall captures keep their header and crop at the bottom. */
  object-position: top;
}
/* Monogram cover: display face, green paper, faint ruled lines. */
.pcover {
  position: relative;
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-size: clamp(56px, 8vw, 120px);
  font-weight: 600;
  letter-spacing: -0.06em;
  color: var(--color-peri);
  background: linear-gradient(135deg, #f0f5f2, #dfeae2);
}
.pcover::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(0deg, transparent 0 23px, rgba(47, 105, 85, 0.08) 23px 24px);
  pointer-events: none;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/project-frame.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Lint + types**

Run: `npx tsc --noEmit && npx eslint src/components/ProjectFrame.tsx tests/project-frame.test.tsx`
Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
git add src/components/ProjectFrame.tsx src/components/project-frame.css tests/project-frame.test.tsx
git commit -m "feat(frame): ProjectFrame — window chrome around a screenshot, monogram cover when none"
```

---

### Task 4: Deck cards and /projects rows use ProjectFrame

**Files:**
- Modify: `src/components/sections/WorkDeck.tsx` (image block near lines 104–118; `imageAlt` import at line 7)
- Modify: `src/components/ProjectCard.tsx` (image block near lines 26–40; `imageAlt` import at line 3)
- Modify: `src/app/globals.css` (`.project-image` rules near lines 88–90)
- Test: `tests/work-deck.test.tsx` (the "imageless slide" test near line 266), `tests/project-card.test.tsx`

**Interfaces:**
- Consumes: `ProjectFrame` (Task 3).
- Produces: every deck slide and every /projects row renders `[data-project-frame]`; behaviour of links/text unchanged.

- [ ] **Step 1: Extend the existing tests (they should fail first)**

In `tests/work-deck.test.tsx`, replace the test `'renders an imageless slide as text with no img element'` with:

```tsx
  it('renders an imageless slide with a monogram cover and no img element', () => {
    const { container } = render(<WorkDeck projects={[business]} locale="en" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[data-project-frame] [data-cover]')?.textContent).toBe('S');
    expect(screen.getByText('SME Studio')).toBeTruthy();
  });

  it('never puts a window title on a deck slide — the h3 beside it is the name', () => {
    const { container } = render(<WorkDeck projects={[build]} locale="en" />);
    expect(container.querySelector('[data-project-frame]')).toBeTruthy();
    expect(container.querySelector('.pframe-title')).toBeNull();
  });
```

In `tests/project-card.test.tsx`, add inside the describe:

```tsx
  it('renders the thumbnail inside the shared window frame, cover when no screenshot', () => {
    const { container } = render(<ProjectCard project={base} locale="en" />);
    expect(container.querySelector('[data-project-frame] [data-cover]')?.textContent).toBe('G');
    cleanup();
    const shot = render(<ProjectCard project={{ ...base, imageSrc: '/images/gonai.jpg' }} locale="en" />);
    const img = shot.container.querySelector('[data-project-frame] img') as HTMLImageElement;
    expect(img.getAttribute('width')).toBe('800');
    expect(img.getAttribute('loading')).toBe('lazy');
  });
```

- [ ] **Step 2: Run to see the new tests fail**

Run: `npx vitest run tests/work-deck.test.tsx tests/project-card.test.tsx`
Expected: the 3 new tests FAIL (no `[data-project-frame]`); everything else passes.

- [ ] **Step 3: WorkDeck — always render the frame**

In `src/components/sections/WorkDeck.tsx`:

1. Replace the import line `import { imageAlt } from '@/lib/image-alt';` with `import ProjectFrame from '@/components/ProjectFrame';` (the alt now lives inside the frame; an unused `imageAlt` import would fail eslint).
2. Replace the whole block

```tsx
                  {project.imageSrc && (
                    <div className="project-image">
                      <div className="frame overflow-hidden rounded-[12px] border border-on-dark-faint bg-deep">
                        <img
                          src={project.imageSrc}
                          alt={imageAlt(project.imageSrc)}
                          width={800}
                          height={450}
                          loading="lazy"
                          decoding="async"
                          className="block w-full"
                        />
                      </div>
                    </div>
                  )}
```

with

```tsx
                  {/* Always framed (spec 2026-09-10 §5): a project without a
                      screenshot gets the monogram cover instead of no visual,
                      so business ideas sit in the same grid rhythm as builds. */}
                  <div className="project-image">
                    <ProjectFrame project={project} />
                  </div>
```

- [ ] **Step 4: ProjectCard — same frame as a thumbnail**

In `src/components/ProjectCard.tsx`:

1. Replace `import { imageAlt } from '@/lib/image-alt';` with `import ProjectFrame from '@/components/ProjectFrame';`.
2. Replace the block from `{project.imageSrc ? (` through the closing `)}` of the grey placeholder `<div className="aspect-video ... bg-line ..." />` with:

```tsx
      <div className="w-full sm:mt-[3px] sm:w-64 sm:shrink-0">
        <ProjectFrame project={project} />
      </div>
```

- [ ] **Step 5: CSS — the frame replaces the old inner box**

In `src/app/globals.css`, replace

```css
.project-image .frame { border-radius: 6px; }
.project-image img { aspect-ratio: 16/9; object-fit: cover; }
```

with

```css
.project-image .pframe { border-radius: 8px; }
```

- [ ] **Step 6: Run the two suites, then everything**

Run: `npx vitest run tests/work-deck.test.tsx tests/project-card.test.tsx`
Expected: PASS.
Run: `npm run check` (timeout 300 s)
Expected: all green (the smoke test renders both components with real fixtures).

- [ ] **Step 7: Commit**

```bash
git add src/components/sections/WorkDeck.tsx src/components/ProjectCard.tsx src/app/globals.css tests/work-deck.test.tsx tests/project-card.test.tsx
git commit -m "feat(deck): every project slide and row carries the shared window frame"
```

---

### Task 5: ProjectTour — tablist + stage with autoplay

**Files:**
- Create: `src/components/ProjectTour.tsx`, `src/components/project-tour.css`
- Test: `tests/project-tour.test.tsx`

**Interfaces:**
- Consumes: `ProjectFrame` (Task 3), `TOUR_MS`, `tourProjects`, `windowTitle` (Task 2), `dict` keys from Task 1.
- Produces: `export default function ProjectTour({ projects, locale }: { projects: Project[]; locale: Locale })`, a `'use client'` component that returns a Fragment of two siblings: `div.tour-list-wrap` (label + `ol[role=tablist]`) and `div.tour-stage[role=tabpanel]`. Returns `null` when no project has a screenshot. Task 6 places it as the second child of `.hero-layout`.

- [ ] **Step 1: Write the failing tests**

Create `tests/project-tour.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectTour from '@/components/ProjectTour';
import { dict } from '@/lib/dictionary';
import { imageAlt } from '@/lib/image-alt';
import type { Project } from '@/lib/models';
import { TOUR_MS } from '@/lib/project-tour';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

const make = (id: string, name: string, order: number, extra: Partial<Project> = {}): Project => ({
  id,
  name,
  description: { en: `${name} in one line`, th: `${name} หนึ่งบรรทัด` },
  stack: [],
  liveUrl: null,
  repoUrl: null,
  imageSrc: `/api/img/page/${id}/Screenshot`,
  featured: true,
  order,
  type: 'build',
  outcome: null,
  question: { en: `Why ${name}?`, th: `ทำไมต้อง ${name}?` },
  slug: null,
  ...extra,
});

const gonai = make('g', 'GoNai', 3, { liveUrl: 'https://gonai-three.vercel.app' });
const secretary = make('a', 'AISecretary', 4, { outcome: { en: 'Runs every morning', th: 'รันทุกเช้า' } });
const brief = make('d', 'DailyBrief', 5, { repoUrl: 'https://github.com/Klaosj/dailybrief' });
const talatify = make('t', 'Talatify', 1, { imageSrc: null, type: 'business' });
const three = [brief, talatify, secretary, gonai];

const stageImg = (c: HTMLElement) => c.querySelector('.tour-stage img') as HTMLImageElement;
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

describe('ProjectTour', () => {
  it('lists only projects with a screenshot, in order, and opens on the first', () => {
    const { container } = render(<ProjectTour projects={three} locale="en" />);
    const items = screen.getAllByRole('tab');
    expect(items.map((b) => b.querySelector('span')?.textContent)).toEqual(['GoNai', 'AISecretary', 'DailyBrief']);
    expect(items[0].getAttribute('aria-selected')).toBe('true');
    expect(items[1].getAttribute('aria-selected')).toBe('false');
    expect(stageImg(container).getAttribute('src')).toBe(gonai.imageSrc);
    expect(stageImg(container).getAttribute('alt')).toBe(imageAlt(gonai.imageSrc as string));
    // Only the active tab shows its question and progress bar.
    expect(items[0].querySelector('em')?.textContent).toBe('Why GoNai?');
    expect(items[1].querySelector('em')).toBeNull();
    expect(items[0].querySelector('.tour-bar')).toBeTruthy();
    expect(items[1].querySelector('.tour-bar')).toBeNull();
  });

  it('loads the first slide eagerly and later slides lazily', () => {
    const { container } = render(<ProjectTour projects={three} locale="en" />);
    expect(stageImg(container).getAttribute('loading')).toBe('eager');
    fireEvent.click(screen.getAllByRole('tab')[1]);
    expect(stageImg(container).getAttribute('loading')).toBe('lazy');
  });

  it('titles the window with the live host, else the project name', () => {
    const { container } = render(<ProjectTour projects={three} locale="en" />);
    expect(container.querySelector('.pframe-title')?.textContent).toBe('gonai-three.vercel.app');
    fireEvent.click(screen.getAllByRole('tab')[1]);
    expect(container.querySelector('.pframe-title')?.textContent).toBe('AISecretary');
  });

  it('jumps to a clicked tab, wires tabpanel to it, and announces the move', () => {
    const { container } = render(<ProjectTour projects={three} locale="en" />);
    const second = screen.getAllByRole('tab')[1];
    fireEvent.click(second);
    expect(second.getAttribute('aria-selected')).toBe('true');
    expect(stageImg(container).getAttribute('src')).toBe(secretary.imageSrc);
    const panel = screen.getByRole('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe(second.id);
    expect(second.getAttribute('aria-controls')).toBe(panel.id);
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe('AISecretary · 2 / 3');
  });

  it('advances on its own every TOUR_MS and wraps, without announcing', () => {
    vi.useFakeTimers();
    const { container } = render(<ProjectTour projects={three} locale="en" />);
    tick(TOUR_MS);
    expect(stageImg(container).getAttribute('src')).toBe(secretary.imageSrc);
    tick(TOUR_MS);
    expect(stageImg(container).getAttribute('src')).toBe(brief.imageSrc);
    tick(TOUR_MS);
    expect(stageImg(container).getAttribute('src')).toBe(gonai.imageSrc);
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe('');
  });

  it('holds still while the pointer is over the stage, and resumes after', () => {
    vi.useFakeTimers();
    const { container } = render(<ProjectTour projects={three} locale="en" />);
    const stage = screen.getByRole('tabpanel');
    fireEvent.mouseEnter(stage);
    tick(TOUR_MS * 2);
    expect(stageImg(container).getAttribute('src')).toBe(gonai.imageSrc);
    fireEvent.mouseLeave(stage);
    tick(TOUR_MS);
    expect(stageImg(container).getAttribute('src')).toBe(secretary.imageSrc);
  });

  it('pause stops the clock and play restarts it', () => {
    vi.useFakeTimers();
    const { container } = render(<ProjectTour projects={three} locale="en" />);
    const toggle = screen.getByRole('button', { name: dict.en.tourPause });
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe(dict.en.tourPlay);
    tick(TOUR_MS * 2);
    expect(stageImg(container).getAttribute('src')).toBe(gonai.imageSrc);
    fireEvent.click(toggle);
    tick(TOUR_MS);
    expect(stageImg(container).getAttribute('src')).toBe(secretary.imageSrc);
  });

  it('never autoplays under reduced motion and offers a still-view label instead of play/pause', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    vi.useFakeTimers();
    const { container } = render(<ProjectTour projects={three} locale="en" />);
    tick(TOUR_MS * 2);
    expect(stageImg(container).getAttribute('src')).toBe(gonai.imageSrc);
    expect(screen.queryByRole('button', { name: dict.en.tourPause })).toBeNull();
    expect(screen.getByText(dict.en.tourStill)).toBeTruthy();
  });

  it('prev/next wrap around', () => {
    const { container } = render(<ProjectTour projects={three} locale="en" />);
    fireEvent.click(screen.getByRole('button', { name: dict.en.tourPrev }));
    expect(stageImg(container).getAttribute('src')).toBe(brief.imageSrc);
    fireEvent.click(screen.getByRole('button', { name: dict.en.tourNext }));
    expect(stageImg(container).getAttribute('src')).toBe(gonai.imageSrc);
  });

  it('moves with the arrow keys, Home and End on the tab list (roving tabindex)', () => {
    const { container } = render(<ProjectTour projects={three} locale="en" />);
    const list = screen.getByRole('tablist');
    const items = screen.getAllByRole('tab');
    expect(items.map((b) => b.tabIndex)).toEqual([0, -1, -1]);
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(stageImg(container).getAttribute('src')).toBe(secretary.imageSrc);
    expect(items.map((b) => b.tabIndex)).toEqual([-1, 0, -1]);
    fireEvent.keyDown(list, { key: 'ArrowUp' });
    expect(stageImg(container).getAttribute('src')).toBe(gonai.imageSrc);
    fireEvent.keyDown(list, { key: 'End' });
    expect(stageImg(container).getAttribute('src')).toBe(brief.imageSrc);
    fireEvent.keyDown(list, { key: 'Home' });
    expect(stageImg(container).getAttribute('src')).toBe(gonai.imageSrc);
  });

  it('links the stage to the story, else the live site, else the code, else nothing', () => {
    const storied = render(<ProjectTour projects={[{ ...gonai, slug: 'gonai' }]} locale="en" />);
    const story = storied.container.querySelector('.tour-caption a') as HTMLAnchorElement;
    expect(story.getAttribute('href')).toBe('/en/work/gonai');
    expect(story.hasAttribute('target')).toBe(false);
    cleanup();
    const live = render(<ProjectTour projects={[gonai]} locale="en" />);
    const liveLink = live.container.querySelector('.tour-caption a') as HTMLAnchorElement;
    expect(liveLink.getAttribute('href')).toBe(gonai.liveUrl);
    expect(liveLink.getAttribute('target')).toBe('_blank');
    expect(liveLink.textContent).toContain(dict.en.liveSite);
    cleanup();
    const repo = render(<ProjectTour projects={[brief]} locale="en" />);
    expect(repo.container.querySelector('.tour-caption a')?.textContent).toContain(dict.en.viewCode);
    cleanup();
    const bare = render(<ProjectTour projects={[secretary]} locale="en" />);
    expect(bare.container.querySelector('.tour-caption a')).toBeNull();
  });

  it('captions with the outcome when there is one, else the description', () => {
    const { container } = render(<ProjectTour projects={[secretary, gonai]} locale="en" />);
    expect(container.querySelector('.tour-line')?.textContent).toBe('GoNai in one line');
    fireEvent.click(screen.getAllByRole('tab')[1]);
    expect(container.querySelector('.tour-line')?.textContent).toBe('Runs every morning');
  });

  it('renders nothing at all when no project has a screenshot', () => {
    const { container } = render(<ProjectTour projects={[talatify]} locale="en" />);
    expect(container.innerHTML).toBe('');
  });

  it('speaks Thai when locale is th', () => {
    const { container } = render(<ProjectTour projects={three} locale="th" />);
    expect(screen.getByRole('tablist').getAttribute('aria-label')).toBe(dict.th.tourListLabel);
    expect(screen.getByText(dict.th.tourLabel)).toBeTruthy();
    expect(container.querySelector('.tour-kicker')?.textContent).toBe(dict.th.workTypeBuild);
    expect(screen.getAllByRole('tab')[0].querySelector('em')?.textContent).toBe('ทำไมต้อง GoNai?');
    expect(screen.getByRole('button', { name: dict.th.tourNext })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run tests/project-tour.test.tsx`
Expected: FAIL — cannot resolve `@/components/ProjectTour`.

- [ ] **Step 3: Implement the component**

Create `src/components/ProjectTour.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import './project-tour.css';
import ProjectFrame from '@/components/ProjectFrame';
import { dict } from '@/lib/dictionary';
import type { Locale, Project } from '@/lib/models';
import { TOUR_MS, tourProjects, windowTitle } from '@/lib/project-tour';

// The hero tour (spec 2026-09-10 §4): a vertical tablist of the projects that
// have a real screenshot, and one stage that shows the active one inside a
// window frame. Returns a Fragment of TWO siblings on purpose — Hero's grid
// places `.tour-list-wrap` under the copy (area "list") and `.tour-stage` in
// the right column (area "stage"); state has to live in one component, so
// this one owns both halves.
export default function ProjectTour({ projects, locale }: { projects: Project[]; locale: Locale }) {
  const t = dict[locale];
  const items = tourProjects(projects);
  const count = items.length;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false); // the visitor pressed pause
  const [hovering, setHovering] = useState(false); // pointer or focus inside the stage
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [announce, setAnnounce] = useState('');
  const stageRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const uid = useId();

  // Reduced motion is read in an effect (not lazily in useState) so the server
  // and the first client render agree — otherwise the play/pause control
  // would mismatch on hydration for visitors with the preference on.
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onChange = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  const playing = count > 1 && !reduced && !paused && !hovering && inView && pageVisible;

  // One timeout per slide, re-armed whenever the slide or the playing state
  // changes. Autoplay never announces (spec §4) — only visitor actions do.
  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % count), TOUR_MS);
    return () => clearTimeout(id);
  }, [playing, index, count]);

  if (count === 0) return null;

  const safe = Math.min(index, count - 1);
  const current = items[safe];

  const select = (i: number, moveFocus = false) => {
    const next = (i + count) % count;
    setIndex(next);
    setAnnounce(`${items[next].name} · ${next + 1} / ${count}`);
    if (moveFocus) tabRefs.current[next]?.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLOListElement>) => {
    const targets: Record<string, number> = {
      ArrowDown: safe + 1,
      ArrowRight: safe + 1,
      ArrowUp: safe - 1,
      ArrowLeft: safe - 1,
      Home: 0,
      End: count - 1,
    };
    if (!(e.key in targets)) return;
    e.preventDefault();
    select(targets[e.key], true);
  };

  const storyHref = current.slug ? `/${locale}/work/${current.slug}` : null;
  const kicker = current.type === 'business' ? t.workTypeBusiness : t.workTypeBuild;
  const line = (current.outcome ?? current.description)[locale];
  const panelId = `${uid}-panel`;
  const tabId = (i: number) => `${uid}-tab-${i}`;

  return (
    <>
      <div className="tour-list-wrap" data-tour-playing={playing ? 'true' : 'false'}>
        <p className="tour-label">{t.tourLabel}</p>
        <ol className="tour-list" role="tablist" aria-label={t.tourListLabel} aria-orientation="vertical" onKeyDown={onKey}>
          {items.map((p, i) => {
            const active = i === safe;
            return (
              <li key={p.id} role="presentation">
                <button
                  type="button"
                  role="tab"
                  id={tabId(i)}
                  aria-selected={active}
                  aria-controls={panelId}
                  tabIndex={active ? 0 : -1}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  onClick={() => select(i)}
                >
                  <small>{String(i + 1).padStart(2, '0')}</small>
                  <span>{p.name}</span>
                  {active && p.question && <em>{p.question[locale]}</em>}
                  {active && <i className="tour-bar" aria-hidden="true" style={{ ['--tour-ms' as string]: `${TOUR_MS}ms` }} />}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div
        ref={stageRef}
        className="tour-stage"
        role="tabpanel"
        id={panelId}
        aria-labelledby={tabId(safe)}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onFocus={() => setHovering(true)}
        onBlur={() => setHovering(false)}
      >
        {/* key swap = the only image in the DOM is the active one; the class
            fades/rises it in (450 ms, house curve; zeroed under reduced
            motion by the global rule). */}
        <div key={current.id} className="tour-enter">
          <ProjectFrame project={current} title={windowTitle(current)} priority={safe === 0} />
        </div>
        <div className="tour-caption">
          <span className="tour-kicker">{kicker}</span>
          <span className="tour-line">{line}</span>
          {storyHref ? (
            <Link href={storyHref}>
              {t.readStory} <span aria-hidden="true">↗</span>
            </Link>
          ) : current.liveUrl ? (
            <a href={current.liveUrl} target="_blank" rel="noreferrer">
              {t.liveSite} <span aria-hidden="true">↗</span>
            </a>
          ) : current.repoUrl ? (
            <a href={current.repoUrl} target="_blank" rel="noreferrer">
              {t.viewCode} <span aria-hidden="true">↗</span>
            </a>
          ) : null}
        </div>
        <div className="tour-controls">
          <button type="button" aria-label={t.tourPrev} onClick={() => select(safe - 1)}>
            ‹
          </button>
          <span className="tour-count" aria-hidden="true">
            {safe + 1} / {count}
          </span>
          <button type="button" aria-label={t.tourNext} onClick={() => select(safe + 1)}>
            ›
          </button>
          {reduced ? (
            <span className="tour-still">{t.tourStill}</span>
          ) : (
            <button
              type="button"
              className="tour-toggle"
              aria-pressed={paused}
              aria-label={paused ? t.tourPlay : t.tourPause}
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? '▶' : 'Ⅱ'}
            </button>
          )}
        </div>
        <span className="sr-only" aria-live="polite">
          {announce}
        </span>
      </div>
    </>
  );
}
```

Create `src/components/project-tour.css`:

```css
/* ProjectTour (spec 2026-09-10 §4). Grid areas `list` and `stage` are assigned
   by .hero-layout in globals.css; this file styles the two halves. */
.tour-list-wrap { grid-area: list; }
.tour-label {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-peri);
  margin-bottom: 10px;
}
:lang(th) .tour-label { font-family: var(--font-thai); letter-spacing: 0; text-transform: none; font-size: 12px; }
.tour-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 1px solid var(--color-line);
}
.tour-list > li > button {
  position: relative;
  width: 100%;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  column-gap: 12px;
  align-items: baseline;
  padding: 11px 8px;
  background: none;
  border: 0;
  border-bottom: 1px solid var(--color-line);
  border-radius: 0;
  text-align: left;
  font: inherit;
  color: var(--color-soft);
  cursor: pointer;
}
.tour-list > li > button:hover { color: var(--color-ink); }
.tour-list small {
  font-family: var(--font-display);
  font-size: 11px;
  letter-spacing: 0.14em;
  color: var(--color-peri);
}
.tour-list span { font-weight: 600; color: var(--color-ink); }
.tour-list em {
  grid-column: 2;
  margin-top: 3px;
  font-style: normal;
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-soft);
}
.tour-list [aria-selected='true'] { color: var(--color-ink); }
.tour-bar {
  position: absolute;
  left: 0;
  bottom: -1px;
  height: 2px;
  width: 100%;
  background: var(--color-peri);
  transform-origin: left;
  transform: scaleX(0);
  animation: tour-fill var(--tour-ms, 7000ms) linear forwards;
}
[data-tour-playing='false'] .tour-bar { animation-play-state: paused; }
@keyframes tour-fill { to { transform: scaleX(1); } }

.tour-stage {
  grid-area: stage;
  align-self: center;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}
.tour-stage .pframe { box-shadow: 0 30px 80px -30px rgba(32, 51, 45, 0.35); }
.tour-enter { animation: tour-in 0.45s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes tour-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}
.tour-caption {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 14px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-soft);
}
.tour-kicker {
  font-family: var(--font-display);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-peri);
}
:lang(th) .tour-kicker { font-family: var(--font-thai); letter-spacing: 0; text-transform: none; font-size: 12px; }
.tour-line { flex: 1 1 24ch; min-width: 0; }
.tour-caption a { color: var(--color-peri); font-weight: 600; text-decoration: none; white-space: nowrap; }
.tour-caption a:hover { text-decoration: underline; text-underline-offset: 4px; }
.tour-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--color-soft);
}
.tour-controls button {
  min-width: 36px;
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid #b6c5bc;
  border-radius: 999px;
  background: var(--color-light);
  color: var(--color-ink);
  font: inherit;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}
.tour-controls button:hover { border-color: var(--color-peri); color: var(--color-peri); }
.tour-controls .tour-toggle { font-size: 12px; }
.tour-controls .tour-toggle[aria-pressed='true'] { border-color: var(--color-peri); color: var(--color-peri); }
.tour-count {
  min-width: 44px;
  text-align: center;
  font-family: var(--font-display);
  letter-spacing: 0.06em;
}
.tour-still { margin-left: 4px; }
```

- [ ] **Step 4: Run the tour tests**

Run: `npx vitest run tests/project-tour.test.tsx`
Expected: PASS (14 tests). If the fake-timer tests hang, confirm `vi.useFakeTimers()` is called BEFORE `render(...)` in those tests (it is, in the code above).

- [ ] **Step 5: Lint + types + the whole suite**

Run: `npx tsc --noEmit && npx eslint src/components/ProjectTour.tsx tests/project-tour.test.tsx && npx vitest run`
Expected: clean, all green.

- [ ] **Step 6: Commit**

```bash
git add src/components/ProjectTour.tsx src/components/project-tour.css tests/project-tour.test.tsx
git commit -m "feat(tour): ProjectTour — tablist + framed stage with autoplay, pause, keyboard, reduced-motion"
```

---

### Task 6: Hero hosts the tour; page passes projects

**Files:**
- Modify: `src/components/sections/Hero.tsx` (whole file, ~31 lines)
- Modify: `src/app/[locale]/page.tsx` (line `<Hero profile={profile} locale={locale} />`)
- Modify: `src/app/globals.css` (hero rules near lines 67–81 and the 767px block near lines 97–108)
- Test: `tests/hero.test.tsx`

**Interfaces:**
- Consumes: `ProjectTour` (Task 5).
- Produces: `Hero({ profile, locale, projects }: { profile: Profile; locale: Locale; projects: Project[] })`.

- [ ] **Step 1: Update the hero tests (they fail first)**

In `tests/hero.test.tsx`:

1. Add `import type { Project } from '@/lib/models';` next to the Profile import and, after the `profile` constant, add a screenshot project used by the new tests:

```tsx
const shipped: Project = {
  id: 'p-gonai',
  name: 'GoNai',
  description: { en: 'Trip planner', th: 'วางแผนทริป' },
  stack: ['Next.js'],
  liveUrl: 'https://gonai-three.vercel.app',
  repoUrl: null,
  imageSrc: '/api/img/page/1/Screenshot',
  featured: true,
  order: 3,
  type: 'build',
  outcome: null,
  question: { en: 'One day in Bangkok — what is the real budget?', th: 'ไปเที่ยวหนึ่งวัน งบจริงเท่าไหร่?' },
  slug: null,
};
```

2. Every existing `render(<Hero profile={...} locale="..." />)` call gets `projects={[]}` added (there are 15 of them). With no tour, the img-related assertions keep their meaning.

3. Replace the test `'gives the portrait explicit dimensions and real alt text when one exists'` body's size assertions: `'480'` → `'64'` and `'520'` → `'64'`.

4. Append inside the describe:

```tsx
  // --- 2026-09-10: project tour in the hero ------------------------------

  it('mounts the project tour beside the copy: tab list under the copy, stage as the second grid child', () => {
    const { container } = render(<Hero profile={profile} locale="en" projects={[shipped]} />);
    const layout = container.querySelector('.hero-layout') as HTMLElement;
    expect(layout.children[0].classList.contains('hero-copy')).toBe(true);
    expect(layout.children[1].classList.contains('tour-list-wrap')).toBe(true);
    expect(layout.children[2].classList.contains('tour-stage')).toBe(true);
    expect(screen.getByRole('tab', { name: /GoNai/ })).toBeTruthy();
  });

  it('renders no tour markup at all when no project has a screenshot', () => {
    const { container } = render(<Hero profile={profile} locale="en" projects={[{ ...shipped, imageSrc: null }]} />);
    expect(container.querySelector('.tour-stage')).toBeNull();
    expect(container.querySelector('.hero-layout')?.children).toHaveLength(1);
  });

  it('keeps the portrait as a small round avatar in the identity row, before the greeting', () => {
    const withPhoto: Profile = { ...profile, photoSrc: '/api/img/page/abc/Photo' };
    const { container } = render(<Hero profile={withPhoto} locale="en" projects={[]} />);
    const row = container.querySelector('.hero-identity') as HTMLElement;
    expect(row.querySelector('img.hero-portrait')).toBeTruthy();
    expect(row.textContent).toContain("Hi, I'm Suwichak");
  });
```

- [ ] **Step 2: Run to see the new tests fail**

Run: `npx vitest run tests/hero.test.tsx`
Expected: the 3 new tests FAIL (no `.tour-*`, no `.hero-identity`, and a TS error for the `projects` prop); the resized-portrait test also fails until Step 3.

- [ ] **Step 3: Rewrite Hero**

Replace the whole of `src/components/sections/Hero.tsx` with:

```tsx
import CopyEmail from '@/components/CopyEmail';
import ProjectTour from '@/components/ProjectTour';
import { dict } from '@/lib/dictionary';
import type { Locale, Profile, Project } from '@/lib/models';

// Light-redesign hero (2026-09-05) + project tour (spec 2026-09-10 §4).
// Layout is a CSS grid with named areas (globals.css .hero-layout):
//   "copy  stage"
//   "list  stage"
// Hero renders the copy; ProjectTour renders the `list` and `stage` siblings
// (a Fragment) so the two halves share one piece of playback state. The
// portrait is a 64px avatar in an identity row above the h1 — the big
// portrait aside of the 09-05 tree gave its column to the stage.
export default function Hero({ profile, locale, projects }: { profile: Profile; locale: Locale; projects: Project[] }) {
  const t = dict[locale];
  const now = profile.now[locale];
  const firstName = locale === 'th' && profile.nameNative ? profile.nameNative : profile.name.split(' ')[0];
  return (
    <section id="hero" className="hero-section">
      <div data-hero-stage className="hero-layout">
        <div className="hero-copy">
          <p className="hero-eyebrow">{locale === 'th' ? 'ธุรกิจ × เทคโนโลยี' : 'BUSINESS × TECHNOLOGY'}</p>
          <div className="hero-identity">
            {profile.photoSrc ? (
              <img src={profile.photoSrc} alt={profile.name} width={64} height={64} className="hero-portrait" />
            ) : (
              <span data-portrait-placeholder className="hero-portrait-placeholder">
                {t.photoPlaceholder}
              </span>
            )}
            <div>
              <p className="hero-greeting">
                {t.greeting} {firstName}
              </p>
              {now && (
                <p data-status-pill className="profile-now">
                  <span aria-hidden="true" className="bg-peri" />
                  {now}
                </p>
              )}
            </div>
          </div>
          <h1>{profile.headline[locale]}</h1>
          <p className="hero-byline">{profile.byline[locale]}</p>
          <div className="hero-actions">
            <a href="#work" className="btn">
              {locale === 'th' ? 'ดูผลงาน' : 'Explore my work'} <span aria-hidden="true">↓</span>
            </a>
            {profile.email && (
              <a href={`mailto:${profile.email}`} className="btn-secondary">
                {t.startConversation} <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>
          {profile.email && (
            <div className="hero-email">
              <CopyEmail email={profile.email} copiedLabel={t.copied} locale={locale} />
            </div>
          )}
        </div>
        <ProjectTour projects={projects} locale={locale} />
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Pass projects from the page**

In `src/app/[locale]/page.tsx`, change `<Hero profile={profile} locale={locale} />` to `<Hero profile={profile} locale={locale} projects={projects} />` (the `projects` constant already exists from `getFeaturedProjects()`). Also delete the stale comment block above it that mentions HeroMonument/wordmark (it describes code that no longer exists).

- [ ] **Step 5: Hero grid + identity row CSS**

In `src/app/globals.css`, replace the block from `.hero-section {` through `.profile-now > span { ... }` (lines ~67–81) with:

```css
.hero-section { padding: 128px max(24px, calc((100vw - 1120px) / 2)) 72px; }
.hero-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  grid-template-areas: "copy stage" "list stage";
  column-gap: 56px;
  row-gap: 28px;
  align-items: start;
}
.hero-copy { grid-area: copy; min-width: 0; }
/* Tour missing (no screenshots at all): one column, copy only. */
.hero-layout:has(> .hero-copy:only-child) { grid-template-columns: 1fr; grid-template-areas: "copy"; }
.hero-eyebrow { font-size: 11px; font-weight: 600; letter-spacing: .16em; color: #2f6955; margin-bottom: 24px; }
.hero-identity { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
.hero-portrait { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; object-position: center 30%; border: 1px solid #dce5df; flex-shrink: 0; }
.hero-portrait-placeholder { width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center; background: #edf2e9; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: #53625c; flex-shrink: 0; }
.hero-greeting { font-size: 17px; color: #53625c; }
.hero-copy h1 { font-size: clamp(38px, 4.5vw, 60px); font-weight: 600; line-height: 1.1; letter-spacing: -.045em; max-width: 16ch; text-wrap: balance; }
.hero-byline { color: #53625c; font-size: 16px; line-height: 1.8; max-width: 43ch; margin-top: 25px; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 32px; }
.hero-email { margin-top: 18px; font-size: 13px; color: #53625c; }
.profile-now { display: flex; align-items: baseline; gap: 8px; font-size: 12px; line-height: 1.7; color: #53625c; margin-top: 4px; }
.profile-now > span { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
```

Then in the `@media(max-width: 767px)` block, delete these six lines:

```css
  .hero-profile { display: flex; align-items: center; border-radius: 12px; }
  .hero-portrait { width: 100px; height: 125px; flex-shrink: 0; }
  .hero-portrait-placeholder { min-height: 100px; width: 100px; }
  .profile-caption { padding: 16px; }
  .profile-name { font-size: 13px; }
  .profile-now { font-size: 11px; }
```

and add, immediately BEFORE that 767px block, a new breakpoint for the tour stack:

```css
@media(max-width: 900px) {
  .hero-layout { grid-template-columns: 1fr; grid-template-areas: "copy" "stage" "list"; row-gap: 24px; }
}
```

- [ ] **Step 6: Run hero + smoke, then everything**

Run: `npx vitest run tests/hero.test.tsx tests/smoke.test.tsx`
Expected: PASS (smoke renders the real fixtures through Hero → ProjectTour with SSR; no hooks fire).
Run: `npm run check` (timeout 300 s)
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/components/sections/Hero.tsx "src/app/[locale]/page.tsx" src/app/globals.css tests/hero.test.tsx
git commit -m "feat(hero): project tour beside the copy — avatar identity row, grid areas, mobile stack"
```

---

### Task 7 (main session): capture screenshots

**Files:**
- Create/replace: `public/images/aje.jpg`, `public/images/gonai.jpg`, `public/images/klao-site.jpg`; optionally `public/images/aisecretary.jpg`, `public/images/tickerdesk.jpg`, `public/images/dailybrief.jpg`.

Target for each: 1600×900 JPEG, quality ~80, ≤ 300 KB. Capture at 1280×720 with device-pixel-ratio 2 (chrome-devtools `emulate` viewport `1280x720x2`), save PNG, then:

```bash
sips -Z 1600 in.png --out out.png && sips -s format jpeg -s formatOptions 80 out.png --out public/images/<name>.jpg && sips -g pixelWidth -g pixelHeight public/images/<name>.jpg
```

- [ ] **Step 1: Aje** — `cd "Personal/Aje/web" && npm run dev -- -p 3011` (foreground, long timeout, then kill after capture). Open `http://localhost:3011/app`, wait for the seeded example, capture the report-card screen.
- [ ] **Step 2: GoNai** — open `https://gonai-three.vercel.app`, pick the most product-like screen reachable without login (the planner with a plan visible if possible), capture.
- [ ] **Step 3: klao-site** — after Task 6, `npm run dev -- -p 3100` in the repo, open `http://localhost:3100/en`, capture the top of the page (hero with the tour showing Aje). Stop the dev server afterwards (never build with it running).
- [ ] **Step 4: AISecretary / TickerDesk / DailyBrief** — try in this order: (a) claude-in-chrome extension (Klao's logged-in Chrome) for the two Notion pages; (b) `screencapture -x` for the menu-bar app after `open -a AISecretary`; (c) computer-use with `request_access` only if Klao is present to approve. If none works, keep the existing files and list them as "still SVG/800×450" in the final report.
- [ ] **Step 5: Verify sizes** — every new file is 1600×900 and ≤ 300 KB (`ls -la public/images`).
- [ ] **Step 6: Commit the assets**

```bash
git add public/images
git commit -m "content(images): real screenshots — Aje, GoNai (2x), klao-site"
```

---

### Task 8: Fixture content — Aje + klao-site rows, new Build order, alt text

**Files:**
- Modify: `src/content/fixtures/projects.json`
- Modify: `src/lib/image-alt.ts` (`IMAGE_ALT` map)
- Test: `tests/content.test.ts`, `tests/image-alt.test.ts` (new)

**Interfaces:**
- Produces: fixture projects `fx-aje` (order 3) and `fx-klao-site` (order 6); existing Build orders become GoNai 4, AISecretary 5, DailyBrief 7, TickerDesk 8. Task 9 mirrors exactly these values into Notion.

- [ ] **Step 1: Write the failing tests**

Create `tests/image-alt.test.ts`:

```ts
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import projects from '@/content/fixtures/projects.json';
import { IMAGE_ALT, imageAlt } from '@/lib/image-alt';
import type { Project } from '@/lib/models';

describe('image alt map', () => {
  it('has a curated, name-free description for every fixture screenshot', () => {
    for (const p of projects as Project[]) {
      if (!p.imageSrc) continue;
      const alt = IMAGE_ALT[p.imageSrc];
      expect(alt, `${p.name} (${p.imageSrc}) has no curated alt`).toBeTruthy();
      expect(alt).not.toContain(p.name);
      expect(alt.length).toBeGreaterThan(30);
    }
  });

  it('points every fixture imageSrc at a file that exists in public/', () => {
    for (const p of projects as Project[]) {
      if (!p.imageSrc) continue;
      expect(existsSync(join('public', p.imageSrc)), `${p.imageSrc} is missing from public/`).toBe(true);
    }
  });

  it('still falls back to the generic sentence for Notion-served images', () => {
    expect(imageAlt('/api/img/page/abc/Screenshot')).toBe('Screenshot of the project interface.');
  });
});
```

Append to `tests/content.test.ts` inside its describe:

```ts
  it('carries Aje and klao-site as featured builds, with Aje leading the Build chapter', async () => {
    const featured = await getFeaturedProjects();
    const builds = featured.filter((p) => p.type === 'build').map((p) => p.name);
    expect(builds).toEqual(['Aje', 'GoNai', 'AISecretary', 'klao-site', 'DailyBrief', 'TickerDesk']);
    const aje = featured.find((p) => p.name === 'Aje')!;
    expect(aje.outcome?.en).toContain('Working prototype');
    expect(aje.liveUrl).toBeNull();
    const site = featured.find((p) => p.name === 'klao-site')!;
    expect(site.liveUrl).toBe('https://klao-site.vercel.app');
    expect(site.repoUrl).toBe('https://github.com/Klaosj/klao-site');
  });
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/image-alt.test.ts tests/content.test.ts`
Expected: FAIL — no Aje/klao-site rows; `aisecretary.svg`/`tickerdesk.svg` have no curated alt (and any file Task 7 produced has none either).

- [ ] **Step 3: Edit the fixture**

In `src/content/fixtures/projects.json`:

1. Change `"order"` on existing rows: GoNai `3` → `4`, AISecretary `4` → `5`, DailyBrief `5` → `7`, TickerDesk `6` → `8`.
2. If Task 7 produced `public/images/aisecretary.jpg` / `tickerdesk.jpg` / a new `dailybrief.jpg`, point those rows' `imageSrc` at the new file; otherwise leave them.
3. Insert these two objects after the Tripedia object (JSON array order does not matter; `order` does):

```json
  {
    "id": "fx-aje",
    "name": "Aje",
    "description": {
      "en": "Idea-grading workspace for startup ideas: write one paragraph, get it graded against proven frameworks, and leave with one small test to run next.",
      "th": "เวิร์กสเปซตัดเกรดไอเดียสตาร์ทอัพ: เขียนหนึ่งย่อหน้า ระบบให้เกรดตาม framework ที่พิสูจน์แล้ว แล้วได้การทดสอบเล็ก ๆ หนึ่งอย่างไปทำต่อ"
    },
    "stack": ["Next.js", "Claude API", "Ollama"],
    "liveUrl": null,
    "repoUrl": null,
    "imageSrc": "/images/aje.jpg",
    "featured": true,
    "order": 3,
    "type": "build",
    "outcome": {
      "en": "Working prototype · 8-dimension report card with letter grades · 16 hand-drawn framework diagrams · advisor runs on Claude or a local model",
      "th": "prototype ใช้งานได้จริง · report card 8 มิติพร้อมเกรด · framework diagram 16 ใบวาดเอง · advisor รันบน Claude หรือโมเดล local"
    },
    "question": {
      "en": "Is this idea worth a weekend, or a year?",
      "th": "ไอเดียนี้คุ้มกับหนึ่งสุดสัปดาห์ หรือทั้งปี?"
    },
    "slug": null
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
    "imageSrc": "/images/klao-site.jpg",
    "featured": true,
    "order": 6,
    "type": "build",
    "outcome": {
      "en": "Live since Aug 2026 · Notion as the only CMS · EN/TH · 370+ automated tests",
      "th": "ออนไลน์ตั้งแต่ ส.ค. 2026 · Notion เป็น CMS เดียว · EN/TH · เทสต์อัตโนมัติ 370+ ข้อ"
    },
    "question": {
      "en": "Can a personal site update itself from Notion, in two languages?",
      "th": "เว็บส่วนตัวอัปเดตตัวเองจาก Notion สองภาษาได้ไหม?"
    },
    "slug": null
  }
```

- [ ] **Step 4: Curate the alt text**

Open each image referenced by the fixture with the Read tool (it renders images) and write one sentence per file describing what the pixels show — never the project name, never the description text. Add to `IMAGE_ALT` in `src/lib/image-alt.ts` entries for `/images/aje.jpg`, `/images/klao-site.jpg`, `/images/aisecretary.svg` (or `.jpg`), `/images/tickerdesk.svg` (or `.jpg`), and refresh `/images/gonai.jpg` if the capture changed. Example shape (replace with what you actually see):

```ts
  '/images/aje.jpg':
    'A workspace screen with an idea written on the left and an eight-row report card on the right, each row carrying a letter grade and a short note.',
  '/images/klao-site.jpg':
    'A light web page: headline on the left, a numbered list of projects beneath it, and a framed app screenshot on the right.',
  '/images/aisecretary.svg':
    'An abstract cover: concentric rings on a pale field standing in for a menu-bar app until a real capture exists.',
  '/images/tickerdesk.svg':
    'An abstract cover: a grid of pale tiles with a single highlighted column, standing in for the options brief until a real capture exists.',
```

- [ ] **Step 5: Run the content and alt tests, then everything**

Run: `npx vitest run tests/image-alt.test.ts tests/content.test.ts tests/no-placeholders.test.tsx`
Expected: PASS.
Run: `npm run check` (timeout 300 s)
Expected: all green (smoke renders 8 fixture projects; work-deck contract tests unaffected).

- [ ] **Step 6: Commit**

```bash
git add src/content/fixtures/projects.json src/lib/image-alt.ts tests/image-alt.test.ts tests/content.test.ts
git commit -m "content(projects): add Aje + klao-site builds, Aje leads the chapter, curated alt text"
```

---

### Task 9 (main session): mirror the content into Notion

Notion Projects DB data source `collection://312848d7-9eb3-4267-adc7-09f43c36ada8` (parent page "klao-site CMS" `3baa127d90d781c8ac9dde561d7f608a`). Property names: `Name` (title), `DescriptionEN`, `DescriptionTH`, `Stack` (multi-select), `LiveURL`, `RepoURL` (url), `Screenshot` (files), `Featured`, `Published` (checkbox), `Order` (number), `Type` (select: Business/Build), `OutcomeEN`, `OutcomeTH`, `QuestionEN`, `QuestionTH`, `Slug`.

- [ ] **Step 1: Update `Order`** on the existing rows: GoNai `3baa127d90d781bdbc2fcfeaae7bbc37` → 4, AISecretary `3baa127d90d781e0889ac74a85362197` → 5, DailyBrief `3baa127d90d7815f81edcd3ce1d15f1e` → 7, TickerDesk `3baa127d90d781d0a593d519f0cdaad4` → 8.
- [ ] **Step 2: Create rows** Aje (Order 3) and klao-site (Order 6) with exactly the fixture text from Task 8; `Stack` options `Claude API`, `Ollama`, `Vercel`, `Notion API` must exist on the multi-select first (add them to the schema if missing; Notion forbids commas in option names). `Featured` + `Published` checked, `Type` = Build.
- [ ] **Step 3: Screenshots** — upload `public/images/aje.jpg` and `klao-site.jpg` to the new rows' `Screenshot`; replace GoNai's with the 2× capture; replace AISecretary/TickerDesk/DailyBrief only if Task 7 produced real captures. If the MCP cannot write a files property, leave the rows without a screenshot and tell Klao which files to drag in (they are in `public/images/`). Note: a row with no `Screenshot` is NOT on the tour until the file lands.
- [ ] **Step 4: Verify** — query the data source (rows mode) and diff against `projects.json` field by field; then `curl -sL https://klao-site.vercel.app/en | grep -o '<h3[^>]*>[^<]*'` after the ISR hour (or after the Task 11 deploy) shows 8 names in the new order.

---

### Task 10: README — where screenshots live and how to change them

**Files:**
- Modify: `README.md` (insert a new section after `## Connect your Notion content`, which ends before `## Checks` at line ~22)

- [ ] **Step 1: Add the section**

```markdown
## Screenshots (project images)

Each project's image comes from the `Screenshot` files property on its row in
the Notion **Projects** database. The site serves it through
`/api/img/page/<row-id>/Screenshot`, so replacing the file in Notion changes the
live site within the hour — no deploy.

- **Size:** 16:9, ideally 1600×900 JPEG at quality ~80 (≤ 300 KB). The frame
  crops from the bottom (`object-position: top`), so keep the header in shot.
- **Hero tour:** every featured project that has a screenshot appears in the
  home-page tour, in `Order`. A project without one shows a monogram cover on
  its card and stays out of the tour until a screenshot is uploaded.
- **Fallback copies:** `src/content/fixtures/projects.json` points at
  `public/images/*` for local dev and tests. When you change a screenshot in
  Notion, also drop the same file in `public/images/`, update the row's
  `imageSrc` if the filename changed, and give it a one-line description in
  `src/lib/image-alt.ts` (what the picture shows — never the project name).
  `tests/image-alt.test.ts` fails if either is missing.
```

- [ ] **Step 2: Sanity**

Run: `npx vitest run tests/no-placeholders.test.tsx`
Expected: PASS (README is not scanned, but keep the section free of the banned words anyway).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs(readme): where project screenshots live and how to change them"
```

---

### Task 11 (main session): verification, push, prod check

- [ ] **Step 1:** Ensure no dev server is running (`lsof -i :3100 -i :3000`), then `npm run check && npm run build` (timeout 600 s). Expected: green.
- [ ] **Step 2:** `npm run dev -- -p 3100`; in chrome-devtools emulate `1280x800x1`, open `/en` and `/th`: tour lists Aje → TickerDesk (6 tabs), first image loaded, autoplay advances after 7 s, hover pauses, tab click jumps, prev/next wrap, pause toggle, Thai labels; deck shows 8 cards, Talatify/Tripedia with `T`/`T` monograms; then emulate `400x800x2,mobile`: copy → stage → list, no horizontal scroll (`document.documentElement.scrollWidth <= 400`). Screenshot each state for the report.
- [ ] **Step 3:** Stop the dev server. `git status` clean, `git log --oneline -12` shows the task commits, then `git push origin main`.
- [ ] **Step 4:** Wait for the Vercel deployment (the Vercel MCP `list_deployments` for project `klao-site`, or poll `curl -sI https://klao-site.vercel.app/en`), then re-check `/en` on prod: tour present, images served from `/api/img/page/...` for rows that have Notion screenshots.
- [ ] **Step 5:** Report to Klao: what changed, which screenshots are real vs still placeholders, what Klao still has to do (Talatify/Tripedia files; any Notion uploads the MCP could not do), and update the project memory file.
