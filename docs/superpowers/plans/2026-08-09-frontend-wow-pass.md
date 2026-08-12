# Frontend "Wow" Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the merged redesign from "clean" into "wow": make the particle wordmark a visible centerpiece, remove hero redundancy, fix nav collision + missing mobile nav, complete the Work grid, deliver the promised About story, add a distinctive display typeface and put the periwinkle accent to work.

**Architecture:** Single-page home (`src/app/[locale]/page.tsx`) composed of section components under `src/components/sections/`, motion primitives under `src/components/motion/`, tokens in `src/app/globals.css` `@theme` mirrored by `src/lib/theme.ts`. All content from fixtures in `src/content/fixtures/` (Notion opt-in). This plan only touches the frontend layer; no Notion/content-layer changes.

**Tech Stack:** Next.js 15.5 (App Router) · Tailwind v4 (CSS-native `@theme`, no config file) · raw WebGL2 · Vitest + jsdom · TypeScript strict.

## Execution model (per Klao's instruction)

- **Orchestrator/reviewer: Opus 5** (main session). Reviews every task diff, runs browser QA, commits.
- **Implementers: Sonnet subagents** — every `Agent` call MUST pass `model: sonnet`.
- **Parallelism: up to 5 subagents at once.** Waves below are file-disjoint; never run two tasks from different waves simultaneously.
  - **Wave 1 (parallel ×5):** Task 1, Task 2, Task 3, Task 4, Task 5
  - **Wave 2 (single):** Task 6, then Task 7 (both touch Hero.tsx + globals.css — NOT parallel)
  - **Wave 3 (sequential):** Task 8, then Task 9 (orchestrator QA)
- Implementers do **not** commit. Each reports "done + files touched + test output"; the orchestrator reviews, then commits exactly the listed files (`git add <paths>`, never `git add -A`) so parallel work can't cross-contaminate.

## Global Constraints

- Repo path contains a space (`Klao Workspace`) — **always double-quote paths** in shell commands. (At execution time the folder was still `Klao's Workspace`; the apostrophe was dropped in the 2026-08-12 rename.)
- ~~`npm run build` **fails locally** because of that apostrophe (next-metadata-route-loader). Do NOT use build as a gate.~~ Historical: true while this plan ran; the 2026-08-12 folder rename fixed it and `npm run build` now passes locally. Gates at execution time were: `npm run check` (tsc + eslint + vitest) and real-browser verification on the dev server already running at `http://localhost:3000`.
- Run every command **foreground with a generous timeout** (≥ 300000 ms). Never background `npm install` or dev servers — backgrounded processes get killed at turn end.
- A harness hook blocks all writes to `eslint.config.mjs`. Do not touch it.
- `src/lib/dictionary.ts` rule: `th` must satisfy `typeof en` — every key added to `en` must be added to `th`.
- Spec acceptance criteria still bind (docs/superpowers/specs/2026-08-09-frontend-redesign-design.md §13): A2 nothing hidden with JS off · A3 reduced-motion removes all animation + cursor · A4 hero ≥60fps, render loop stops past hero · A5 no .glb/.gltf/textures in public/ · A6 first load ≤250KB excl. screenshots · A7 no `href="#"` · A8 no placeholder text · A10 Lighthouse a11y ≥95.
- Colors changed in `globals.css` `@theme` must be mirrored in `src/lib/theme.ts` and vice versa.
- jsdom is layout-blind: any visual/motion claim must be verified in the real browser by the orchestrator, not inferred from green tests.

## Content assumptions (Klao can veto)

1. **AISecretary/TickerDesk covers** are designed SVG covers (Task 3), not fake screenshots — replaceable later by real screenshots at the same paths.
2. **Legacy routes** `/[locale]/projects` and `/[locale]/career` get temporary redirects to home anchors (Task 8). `/writing` stays (it has real slug routing).
3. career.json "99.7 transactions" and "retuned tactics" look like source typos but are **not** changed in this plan — needs Klao's confirmation of the real number/word.

---

### Task 1: Hero de-duplication

The hero states "business development / builds tools" three times in one viewport: the identity `<ul>`, the giant `<h1>`, and the decoration pills. Remove the identity stack so the `<h1>` is the only statement; pills stay (decoration, `aria-hidden`).

**Files:**
- Modify: `src/components/sections/Hero.tsx`
- Test: `tests/hero.test.tsx`

**Interfaces:**
- Consumes: `dict[locale]` from `@/lib/dictionary` (unchanged), `Profile` from `@/lib/models` (unchanged).
- Produces: Hero renders **no** `<ul>` between greeting and `<h1>`. `t.identities` stays in the dictionary (same precedent as the unused `t.roleLine` — the dictionary is append-only shared copy).

- [ ] **Step 1: Update the test first**

In `tests/hero.test.tsx`, find every assertion that expects the identity stack (searches for `identities`, `'Barista.'`, `'Business development.'`, or a `list`/`listitem` role between greeting and heading). Replace them with an absence assertion:

```tsx
it('does not render the identity stack (the h1 is the only statement)', () => {
  render(<Hero profile={profile} locale="en" />);
  expect(screen.queryByText('Barista.')).toBeNull();
  expect(screen.queryByText('Business development.')).toBeNull();
});
```

Keep all other hero tests (portrait, status pill, greeting, headline, CTA, CopyEmail) untouched.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "/Users/suvichakjarunopratamp/Desktop/Klao Workspace/Personal/klao-site" && npx vitest run tests/hero.test.tsx`
Expected: the new absence test FAILS (identity list still renders); any old identity-presence tests you removed no longer run.

- [ ] **Step 3: Remove the identity stack from Hero.tsx**

Delete the whole block at `src/components/sections/Hero.tsx:85-108` — the long `/* Identity stack (Change 1) ... */` comment AND the `<ul className="mt-2 flex flex-col items-center gap-0.5 ...">...</ul>` it introduces. Then:

1. Change the `<MaskedHeading ... className="mt-8 ...">` to `mt-6` (the gap the list used to fill).
2. Update the comment at the top of the file (lines 8–12): the pills' facts are now echoed by the **byline and headline**, not by an identity list. Replace the first comment sentence with:

```tsx
// The pills echo facts already present in the headline and byline, so
// they are pure decoration -- `aria-hidden` on their container, never
// something a screen reader visits.
```

- [ ] **Step 4: Run the hero tests to verify they pass**

Run: `npx vitest run tests/hero.test.tsx`
Expected: PASS, including the new absence test.

- [ ] **Step 5: Full check**

Run: `npm run check` (foreground, timeout ≥ 300000)
Expected: tsc, eslint, vitest all green. If `no-placeholders.test.tsx` or `smoke.test.tsx` referenced the identity lines, update those references the same way as Step 1.

- [ ] **Step 6: Report done** (orchestrator commits: `git add src/components/sections/Hero.tsx tests/hero.test.tsx && git commit -m "feat(hero): single statement — remove identity stack duplication"`)

---

### Task 2: Nav chrome — scroll direction hide/show, solid background, mobile menu

Fixes two audit findings: (1) the fixed transparent header collides with content scrolling beneath it; (2) below `md` there is **no** section navigation at all (links hidden, no hamburger).

**Files:**
- Modify: `src/components/SiteNav.tsx`
- Create: `src/components/site-nav.css`
- Test: `tests/site-nav.test.tsx`

**Interfaces:**
- Consumes: existing `nav-on-light` mechanism (scroll listener + `LIGHT_BAND_SELECTOR`) — keep it, extend the same listener.
- Produces: `<header>` additionally carries class `nav-chrome` always, `nav-hidden` when scrolling down past 120px, `nav-solid` when `scrollY > 40`. A `md:hidden` menu button with `aria-expanded` + `aria-controls="mobile-menu"` toggling an overlay `<nav id="mobile-menu">`. No `globals.css` edits (that file belongs to Task 5 this wave) — all new CSS goes in `site-nav.css`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/site-nav.test.tsx` (match the file's existing render helpers/imports):

```tsx
describe('mobile menu', () => {
  it('renders a menu button that toggles the overlay', () => {
    render(<SiteNav locale="en" profile={profile} />);
    const btn = screen.getByRole('button', { name: /main|เมนูหลัก/i });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    const menu = document.getElementById('mobile-menu');
    expect(menu).not.toBeNull();
    // The four section anchors exist inside the overlay
    expect(within(menu!).getAllByRole('link')).toHaveLength(4);
    // Clicking a link closes the menu
    fireEvent.click(within(menu!).getAllByRole('link')[0]);
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });
});

it('marks the header with nav-chrome for scroll styling', () => {
  render(<SiteNav locale="en" profile={profile} />);
  expect(document.querySelector('header')!.classList.contains('nav-chrome')).toBe(true);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/site-nav.test.tsx`
Expected: FAIL — no button, no `nav-chrome` class.

- [ ] **Step 3: Create `src/components/site-nav.css`**

```css
/* SiteNav scroll chrome. Lives in its own file (not globals.css) so this
   task stays file-disjoint from the token work happening in parallel.
   No backdrop-filter anywhere: the header overlaps the live WebGL canvas
   in the hero, and a blurred backdrop would be recomputed on every canvas
   frame (same reasoning as .pill / #cursor in globals.css). A near-opaque
   flat fill reads fine and costs nothing. */
header.nav-chrome {
  transition:
    transform 0.5s cubic-bezier(0.16, 1, 0.3, 1),
    background-color 0.35s ease;
}
header.nav-chrome.nav-hidden { transform: translateY(-100%); }
header.nav-chrome.nav-solid { background-color: rgba(23, 23, 26, 0.94); }
/* Over a light band the solid fill must be light, or the inverted
   dark-on-light link colors land on a dark background. */
header.nav-chrome.nav-solid.nav-on-light { background-color: rgba(255, 255, 255, 0.96); }

/* Burger inherits currentColor; give it the same inversion the links get. */
header.nav-chrome .nav-burger { color: var(--color-on-dark); }
header.nav-on-light .nav-burger { color: var(--color-on-light); }

@media (prefers-reduced-motion: reduce) {
  header.nav-chrome { transition: none; }
  /* Never hide the nav from a reduced-motion user mid-scroll: a header that
     teleports away with no transition is worse than one that stays. */
  header.nav-chrome.nav-hidden { transform: none; }
}
```

- [ ] **Step 4: Extend SiteNav.tsx**

1. `import './site-nav.css';` after the other imports; add `useState` to the react import.
2. Add `nav-chrome` to the `<header>` className (keep everything already there).
3. Extend the existing `useEffect` scroll listener (the one that computes `nav-on-light`) — same listener, do not add a second scroll subscription. Replace the `sync` function body with:

```tsx
const lastY = { v: window.scrollY };
const sync = () => {
  const headerRect = header.getBoundingClientRect();
  const bands = document.querySelectorAll(LIGHT_BAND_SELECTOR);
  const overLight = Array.from(bands).some((band) => {
    const r = band.getBoundingClientRect();
    return r.top <= headerRect.bottom && r.bottom >= headerRect.top;
  });
  header.classList.toggle('nav-on-light', overLight);

  const y = window.scrollY;
  header.classList.toggle('nav-solid', y > 40);
  // Only hide when actually travelling down, past the header's own reach,
  // and by more than a 2px jitter threshold.
  if (Math.abs(y - lastY.v) > 2) {
    header.classList.toggle('nav-hidden', y > lastY.v && y > 120);
    lastY.v = y;
  }
};
```

(`lastY` is declared inside the effect, before `sync`.)

4. Mobile menu — inside the component:

```tsx
const [menuOpen, setMenuOpen] = useState(false);
```

Button goes inside the right-hand `<div className="flex items-center gap-3.5 text-[11px]">`, immediately before `<LocaleToggle />`, visible only below `md`:

```tsx
<button
  type="button"
  className="nav-burger -m-1 inline-flex h-10 w-10 flex-col items-center justify-center gap-[5px] md:hidden"
  aria-expanded={menuOpen}
  aria-controls="mobile-menu"
  aria-label={t.navMain}
  onClick={() => setMenuOpen((v) => !v)}
>
  <span aria-hidden="true" className={`h-[1.5px] w-5 bg-current transition-transform duration-300 ${menuOpen ? 'translate-y-[6.5px] rotate-45' : ''}`} />
  <span aria-hidden="true" className={`h-[1.5px] w-5 bg-current transition-opacity duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
  <span aria-hidden="true" className={`h-[1.5px] w-5 bg-current transition-transform duration-300 ${menuOpen ? '-translate-y-[6.5px] -rotate-45' : ''}`} />
</button>
```

Overlay, rendered as the header's last child (conditional on `menuOpen`):

```tsx
{menuOpen && (
  <nav
    id="mobile-menu"
    aria-label={t.navMain}
    className="fixed inset-x-0 bottom-0 top-[82px] z-[59] flex flex-col gap-2 bg-dark/[.97] px-8 pt-10 md:hidden"
  >
    {anchors.map((a) => (
      <Link
        key={a.hash}
        href={anchorHref(a.hash)}
        onClick={() => setMenuOpen(false)}
        className="py-3 text-[28px] font-bold tracking-[-0.02em] text-on-dark"
      >
        {a.label}
      </Link>
    ))}
  </nav>
)}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/site-nav.test.tsx`
Expected: PASS (new + existing — the existing nav-on-light and route-aware anchor tests must still be green).

- [ ] **Step 6: Full check**

Run: `npm run check`
Expected: green.

- [ ] **Step 7: Report done** (orchestrator verifies in browser: scroll down → nav slides away; scroll up → returns with solid bg; over About band solid bg is white; 390px viewport → burger opens/closes; then commits `git add src/components/SiteNav.tsx src/components/site-nav.css tests/site-nav.test.tsx && git commit -m "feat(nav): scroll-aware chrome + mobile menu"`)

---

### Task 3: Work grid — covers for every project, unified captions

AISecretary and TickerDesk have `imageSrc: null`, rendering as bare text rows with huge gaps; GoNai's caption splits name (far left) from description (far right). Every project gets a cover; captions become one coherent cluster.

**Files:**
- Create: `public/images/aisecretary.svg`, `public/images/tickerdesk.svg`
- Modify: `src/content/fixtures/projects.json`, `src/components/sections/WorkGrid.tsx`
- Test: `tests/work-grid.test.tsx`

**Interfaces:**
- Consumes: `Project` model (`imageSrc: string | null`) — unchanged.
- Produces: all four fixture projects have non-null `imageSrc`. WorkGrid caption block: one `<div>` containing name `<p>`, description `<p>`, stack `<p>` in that DOM order.

- [ ] **Step 1: Write the failing tests**

In `tests/work-grid.test.tsx` add (reusing the file's existing fixture import pattern):

```tsx
it('renders a cover image for every project', () => {
  render(<WorkGrid projects={projects} locale="en" />);
  const imgs = screen.getAllByRole('img');
  expect(imgs).toHaveLength(projects.length);
});

it('keeps name and description adjacent in the caption', () => {
  render(<WorkGrid projects={projects} locale="en" />);
  const name = screen.getByText('GoNai');
  const caption = name.parentElement!;
  expect(within(caption).getByText(/trip planner/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/work-grid.test.tsx`
Expected: FAIL — only 2 images, and description not inside the name's parent.

- [ ] **Step 3: Create the two designed covers**

Deliberate designed covers in the site's own palette (dark `#101013` / charcoal `#17171a` / periwinkle `#a8aecb`), matching the 800×450 box the grid reserves. Not fake screenshots.

`public/images/aisecretary.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450" role="img" aria-label="AISecretary designed cover">
  <rect width="800" height="450" fill="#101013"/>
  <rect width="800" height="36" fill="#17171a"/>
  <circle cx="656" cy="18" r="6" fill="#a8aecb"/>
  <text x="672" y="23" font-family="-apple-system,'Helvetica Neue',Arial,sans-serif" font-size="13" fill="#ffffff" opacity="0.85">78%</text>
  <text x="726" y="23" font-family="-apple-system,'Helvetica Neue',Arial,sans-serif" font-size="13" fill="#ffffff" opacity="0.5">9:41</text>
  <rect x="470" y="52" width="288" height="330" rx="14" fill="#17171a" stroke="rgba(255,255,255,0.13)"/>
  <text x="494" y="92" font-family="-apple-system,'Helvetica Neue',Arial,sans-serif" font-size="16" font-weight="700" fill="#ffffff">Today</text>
  <g font-family="-apple-system,'Helvetica Neue',Arial,sans-serif" font-size="12" fill="rgba(255,255,255,0.6)">
    <text x="494" y="126">Claude</text>
    <rect x="494" y="136" width="230" height="6" rx="3" fill="rgba(255,255,255,0.13)"/>
    <rect x="494" y="136" width="178" height="6" rx="3" fill="#a8aecb"/>
    <text x="494" y="176">Codex</text>
    <rect x="494" y="186" width="230" height="6" rx="3" fill="rgba(255,255,255,0.13)"/>
    <rect x="494" y="186" width="96" height="6" rx="3" fill="#7d86ad"/>
    <text x="494" y="226">Gemini</text>
    <rect x="494" y="236" width="230" height="6" rx="3" fill="rgba(255,255,255,0.13)"/>
    <rect x="494" y="236" width="58" height="6" rx="3" fill="#7d86ad"/>
  </g>
  <rect x="494" y="278" width="240" height="1" fill="rgba(255,255,255,0.13)"/>
  <text x="494" y="308" font-family="-apple-system,'Helvetica Neue',Arial,sans-serif" font-size="12" fill="rgba(255,255,255,0.6)">Morning digest · 8:00</text>
  <circle cx="500" cy="336" r="3" fill="#a8aecb"/>
  <text x="512" y="340" font-family="-apple-system,'Helvetica Neue',Arial,sans-serif" font-size="12" fill="rgba(255,255,255,0.85)">Quota resets in 3h 12m</text>
  <text x="48" y="226" font-family="-apple-system,'Helvetica Neue',Arial,sans-serif" font-size="46" font-weight="700" fill="#ffffff" letter-spacing="-1">AISecretary</text>
  <text x="48" y="258" font-family="-apple-system,'Helvetica Neue',Arial,sans-serif" font-size="15" fill="rgba(255,255,255,0.6)">AI usage · quotas · morning digest</text>
  <text x="48" y="292" font-family="ui-monospace,Menlo,monospace" font-size="11" fill="#a8aecb" letter-spacing="2">MACOS MENU BAR</text>
</svg>
```

`public/images/tickerdesk.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450" role="img" aria-label="TickerDesk designed cover">
  <rect width="800" height="450" fill="#101013"/>
  <text x="48" y="96" font-family="-apple-system,'Helvetica Neue',Arial,sans-serif" font-size="46" font-weight="700" fill="#ffffff" letter-spacing="-1">TickerDesk</text>
  <text x="48" y="128" font-family="-apple-system,'Helvetica Neue',Arial,sans-serif" font-size="15" fill="rgba(255,255,255,0.6)">US options decision-support briefs</text>
  <text x="48" y="162" font-family="ui-monospace,Menlo,monospace" font-size="11" fill="#a8aecb" letter-spacing="2">SECTOR SCREEN · DAILY</text>
  <g font-family="ui-monospace,Menlo,monospace" font-size="14">
    <rect x="48" y="196" width="704" height="54" rx="10" fill="#17171a" stroke="rgba(255,255,255,0.13)"/>
    <text x="72" y="229" fill="#ffffff">NVDA</text>
    <text x="180" y="229" fill="rgba(255,255,255,0.6)">Semis</text>
    <rect x="560" y="212" width="64" height="24" rx="12" fill="#a8aecb"/>
    <text x="574" y="229" fill="#101013" font-weight="700">CALL</text>
    <text x="648" y="229" fill="rgba(255,255,255,0.85)">★★★★</text>
    <rect x="48" y="262" width="704" height="54" rx="10" fill="#17171a" stroke="rgba(255,255,255,0.13)"/>
    <text x="72" y="295" fill="#ffffff">XLE</text>
    <text x="180" y="295" fill="rgba(255,255,255,0.6)">Energy</text>
    <rect x="560" y="278" width="64" height="24" rx="12" fill="rgba(255,255,255,0.13)"/>
    <text x="578" y="295" fill="#ffffff">PUT</text>
    <text x="648" y="295" fill="rgba(255,255,255,0.85)">★★★</text>
    <rect x="48" y="328" width="704" height="54" rx="10" fill="#17171a" stroke="rgba(255,255,255,0.13)"/>
    <text x="72" y="361" fill="#ffffff">MSFT</text>
    <text x="180" y="361" fill="rgba(255,255,255,0.6)">Software</text>
    <rect x="560" y="344" width="64" height="24" rx="12" fill="#a8aecb"/>
    <text x="574" y="361" fill="#101013" font-weight="700">CALL</text>
    <text x="648" y="361" fill="rgba(255,255,255,0.85)">★★★★★</text>
  </g>
</svg>
```

- [ ] **Step 4: Point fixtures at the covers**

In `src/content/fixtures/projects.json`: set `"imageSrc": "/images/aisecretary.svg"` on `fx-aisecretary` and `"imageSrc": "/images/tickerdesk.svg"` on `fx-tickerdesk`. No other fields change.

- [ ] **Step 5: Unify the caption cluster in WorkGrid.tsx**

Replace the caption block (`src/components/sections/WorkGrid.tsx:62-68` — the `{/* Not conditional on imageSrc ... */}` comment and the `<div className="mt-4 flex items-baseline justify-between gap-4">...</div>`) with:

```tsx
{/* One caption cluster: name + description read together on the left,
    stack sits right (wraps under on narrow screens). Previously the
    name was far-left and the description+stack far-right, so at
    desktop widths the pair lost any visual association. Still not
    conditional on imageSrc — a project with no cover keeps its text. */}
<div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
  <p className="text-lg font-semibold text-on-dark">{project.name}</p>
  <p className="text-[13px] leading-[1.6] text-on-dark-soft">{project.description[locale]}</p>
  <p className={`ml-auto whitespace-nowrap text-[11px] text-on-dark-soft ${eyebrowFont(locale, '')}`}>
    {project.stack.join(' · ')}
  </p>
</div>
```

Also delete the now-unused `const meta = ...` declaration (`WorkGrid.tsx:31`). The `<img alt>` interpolates `project.description[locale]` directly — keep as-is.

- [ ] **Step 6: Run tests**

Run: `npx vitest run tests/work-grid.test.tsx`
Expected: PASS. Then `npm run check` — if `no-placeholders.test.tsx` scans fixture JSON, confirm it still passes (the new paths are real files, not placeholders).

- [ ] **Step 7: Report done** (orchestrator verifies covers render at `http://localhost:3000/en#work`, then commits `git add public/images/aisecretary.svg public/images/tickerdesk.svg src/content/fixtures/projects.json src/components/sections/WorkGrid.tsx tests/work-grid.test.tsx && git commit -m "feat(work): covers for all projects + unified captions"`)

**Note for Klao:** the live site reads projects from Notion when `.env.local` is set — upload the same two covers to the Notion Projects DB (or accept fixtures-only until then).

---

### Task 4: About story + Craft scroll-spotlight

About promises "a short story about how I ended up on both sides of the table" and delivers two metadata lines; the right half of the band is empty. Craft's six principles are static (first white, rest gray). Deliver the story; make the principles light up as you scroll.

**Files:**
- Modify: `src/lib/dictionary.ts`, `src/components/sections/AboutBand.tsx`, `src/components/sections/CraftBand.tsx`
- Create: `src/components/motion/SpotlightList.tsx`, `src/components/motion/spotlight.css`
- Test: `tests/bands.test.tsx` (About), Create: `tests/spotlight-list.test.tsx`

**Interfaces:**
- Consumes: `Reveal` (`@/components/motion/Reveal`, props: `children/as/delayIndex/className`), `MaskedHeading`, `dict`, `eyebrowFont` from `@/lib/typography`.
- Produces: `dict.en.aboutStory: readonly string[]` (3 items) + `dict.th.aboutStory` (3 items). `SpotlightList` component: `{ lines: readonly string[]; className?: string; itemClassName?: string }`, renders `<ul>` of `<li class="spot">`, first `<li>` also has `spot-on` server-side; on scroll the line nearest 45% viewport height carries `spot-on`.

- [ ] **Step 1: Write the failing tests**

`tests/spotlight-list.test.tsx` (new file — copy the top-of-file imports/setup style from `tests/reveal.test.tsx`, which already mocks `matchMedia`):

```tsx
import { render, screen } from '@testing-library/react';
import SpotlightList from '@/components/motion/SpotlightList';

const LINES = ['Alpha.', 'Beta.', 'Gamma.'] as const;

it('renders every line as a list item', () => {
  render(<SpotlightList lines={LINES} />);
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
});

it('emphasizes the first line before any scroll', () => {
  render(<SpotlightList lines={LINES} />);
  const items = screen.getAllByRole('listitem');
  expect(items[0].classList.contains('spot-on')).toBe(true);
  expect(items[1].classList.contains('spot-on')).toBe(false);
});
```

In `tests/bands.test.tsx`, add to the AboutBand block:

```tsx
it('renders the three story beats', () => {
  render(<AboutBand profile={profile} locale="en" />);
  expect(screen.getByText(/A Bun Dance/)).toBeInTheDocument();
  expect(screen.getByText(/VELA/)).toBeInTheDocument();
  expect(screen.getByText(/ActMedia/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/spotlight-list.test.tsx tests/bands.test.tsx`
Expected: FAIL — module not found / story text absent.

- [ ] **Step 3: Add the story copy to the dictionary**

In `src/lib/dictionary.ts`, add to `en` (after `identities`):

```ts
// About band's story beats. Every sentence is traceable to career.json:
// A Bun Dance (business owner), VELA Central World (senior barista),
// ActMedia (senior BD) + the projects in projects.json. Fixed copy, same
// category as `craft`, hence dictionary not profile.
aboutStory: [
  'Started on the owner side of the table — ran A Bun Dance, a craft-burger shop, where menu R&D, pricing and gross margin were all mine to get right.',
  'Learned service the honest way, behind the bar at VELA — one quality standard per cup, kept under pressure.',
  'Now I sell for ActMedia by day and build my own tools at night. When I scope software for a business, I have already sat on both sides of the table.',
] as readonly string[],
```

And to `th` (after `identities` — required, `th: typeof en`):

```ts
aboutStory: [
  'เริ่มจากฝั่งเจ้าของโต๊ะ — ทำร้าน A Bun Dance เบอร์เกอร์คราฟต์ ที่ทั้งคิดเมนู ตั้งราคา และคุมกำไรขั้นต้นเองทั้งหมด',
  'เรียนรู้งานบริการแบบตรงไปตรงมาหลังบาร์ที่ VELA — มาตรฐานเดียวกันทุกแก้ว แม้หน้าร้านจะแน่นแค่ไหน',
  'ตอนนี้ขายงานให้ ActMedia ตอนกลางวัน และสร้างเครื่องมือของตัวเองตอนกลางคืน เวลาคุยเรื่องระบบกับธุรกิจ ผมเลยนั่งมาแล้วทั้งสองฝั่งของโต๊ะ',
] as readonly string[],
```

- [ ] **Step 4: Render the story in AboutBand.tsx**

Replace the right-hand column (`src/components/sections/AboutBand.tsx:34-44`, the `<div data-prose ...>...</div>`) with:

```tsx
<div data-prose className="max-w-[68ch]">
  <ol className="flex list-none flex-col gap-7">
    {t.aboutStory.map((beat, i) => (
      <Reveal as="li" key={beat} delayIndex={i + 1} className="flex gap-5">
        <span aria-hidden="true" className={`mt-[2px] text-[11px] font-semibold text-peri-deep ${eyebrowFont(locale, 'tracking-[0.18em]')}`}>
          {String(i + 1).padStart(2, '0')}
        </span>
        <span className="text-[14.5px] leading-[1.95] text-on-light-soft">{beat}</span>
      </Reveal>
    ))}
  </ol>
  {profile.now[locale] && (
    <Reveal as="div" delayIndex={4} className="mt-9 border-t border-on-light-faint pt-6 text-[14.5px] leading-[1.95] text-on-light-soft">
      <p>
        <span className="font-semibold text-on-light">{t.now}: </span>
        {profile.now[locale]}
      </p>
    </Reveal>
  )}
</div>
```

(The `profile.byline` paragraph moves out — the byline already appears verbatim in the hero; repeating it here was another duplication. If `tests/bands.test.tsx` asserted the byline inside AboutBand, update that assertion to the story beats instead.)

- [ ] **Step 5: Create SpotlightList**

`src/components/motion/spotlight.css`:

```css
/* CraftBand principle spotlight. Server markup emphasizes the first line
   (spot-on), so the band reads correctly with JS off (spec A2). */
.spot {
  color: var(--color-on-dark-soft);
  opacity: 0.35;
  transition: opacity 0.5s ease, color 0.5s ease;
}
.spot.spot-on {
  color: var(--color-on-dark);
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  .spot { opacity: 1 !important; transition: none; }
}
```

`src/components/motion/SpotlightList.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import './spotlight.css';

type Props = {
  lines: readonly string[];
  className?: string;
  itemClassName?: string;
};

/** Scroll-driven spotlight: the line whose vertical center is nearest a
 *  focal band 45% down the viewport carries `spot-on`. SSR ships the first
 *  line already emphasized, so nothing depends on JS to be readable (A2).
 *  Under prefers-reduced-motion no listener attaches and the CSS forces
 *  every line fully opaque (A3). */
export default function SpotlightList({ lines, className, itemClassName }: Props) {
  const ref = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const ul = ref.current;
    if (!ul) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const items = Array.from(ul.children) as HTMLElement[];
    let raf = 0;
    const update = () => {
      raf = 0;
      const focus = window.innerHeight * 0.45;
      let best = 0;
      let bestD = Infinity;
      items.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - focus);
        if (d < bestD) { bestD = d; best = i; }
      });
      items.forEach((el, i) => el.classList.toggle('spot-on', i === best));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <ul ref={ref} className={className}>
      {lines.map((line, i) => (
        <li key={line} className={`spot ${i === 0 ? 'spot-on' : ''} ${itemClassName ?? ''}`.trim()}>
          {line}
        </li>
      ))}
    </ul>
  );
}
```

Note: in jsdom, `getBoundingClientRect()` returns zeros for every item, so `update()` marks item 0 as best — consistent with the SSR default, so the Step 1 tests pass either way.

- [ ] **Step 6: Use it in CraftBand.tsx**

Replace the `<ul className="mt-14 flex list-none flex-col gap-[2px]">...</ul>` block (`CraftBand.tsx:19-32`) with:

```tsx
<Reveal className="mt-14">
  <SpotlightList
    lines={t.craft}
    className="flex list-none flex-col gap-[2px]"
    itemClassName="text-[clamp(24px,4.2vw,52px)] font-bold leading-[1.14] tracking-[-0.03em]"
  />
</Reveal>
```

Add `import SpotlightList from '@/components/motion/SpotlightList';`. Keep the `Reveal` import (still used for the wrapper); `MaskedHeading` untouched.

- [ ] **Step 7: Run tests, then full check**

Run: `npx vitest run tests/spotlight-list.test.tsx tests/bands.test.tsx tests/dictionary.test.ts`
Expected: PASS (dictionary tests guard against empty/untranslated strings — the new TH strings satisfy them).
Then: `npm run check` — green.

- [ ] **Step 8: Report done** (orchestrator verifies in browser: craft lines light up one at a time while scrolling; About story renders in both locales; commits `git add src/lib/dictionary.ts src/components/sections/AboutBand.tsx src/components/sections/CraftBand.tsx src/components/motion/SpotlightList.tsx src/components/motion/spotlight.css tests/spotlight-list.test.tsx tests/bands.test.tsx && git commit -m "feat(about,craft): deliver the story + scroll spotlight"`)

---

### Task 5: Display typography + accent groundwork

Everything currently renders in the system font (the `--font-display` token exists but nothing applies it to headings, and on macOS the stack resolves to the system face anyway). Ship a real display pair — **Space Grotesk** (Latin) + **Anuphan** (Thai) — self-hosted via `next/font`, and seed the periwinkle accent (`::selection`).

**Files:**
- Modify: `src/app/[locale]/layout.tsx`, `src/app/globals.css`, `src/lib/theme.ts` (comment only)
- Test: `tests/theme.test.ts` / `tests/smoke.test.tsx` — update only if they assert the literal old font-token strings

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: CSS variables `--font-sg` and `--font-anuphan` set on `<html>`; `--font-display` and `--font-thai` tokens chain through them; `h1/h2/h3` use `var(--font-display)`. Task 6 consumes the same family names in its rasterise stacks (`"Space Grotesk"`, `"Anuphan"`).

- [ ] **Step 1: Wire next/font in the root layout**

In `src/app/[locale]/layout.tsx`, add at module scope (after imports):

```tsx
import { Anuphan, Space_Grotesk } from 'next/font/google';

// Display pair. Self-hosted by next/font at build time (no runtime request
// to Google), subset per script, swap display. Two weights each keeps the
// added first-load weight well inside the A6 250KB budget (~4 woff2 files,
// ~25-45KB apiece).
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-sg',
  display: 'swap',
});
const anuphan = Anuphan({
  subsets: ['thai', 'latin'],
  weight: ['500', '700'],
  variable: '--font-anuphan',
  display: 'swap',
});
```

Find the `<html` element rendered by the RootLayout component in this file and append both variables to its className, preserving every existing attribute. If it has no className today:

```tsx
<html lang={...existing...} className={`${spaceGrotesk.variable} ${anuphan.variable}`}>
```

- [ ] **Step 2: Chain the tokens and apply to headings in globals.css**

In the `@theme` block (`src/app/globals.css:16-17`), replace the two font lines:

```css
  --font-display: var(--font-sg), "Avenir Next", Futura, "Helvetica Neue", -apple-system, sans-serif;
  --font-thai: var(--font-anuphan), -apple-system, "Sukhumvit Set", "IBM Plex Sans Thai", "Noto Sans Thai", sans-serif;
```

In `@layer base` (after the `body` rule), add:

```css
  /* Display face for headings only; body copy stays on the system stack.
     :lang(th) outranks this on specificity (0,1,1 vs 0,0,1), so Thai
     headings keep --font-thai (Anuphan) automatically. */
  h1, h2, h3 {
    font-family: var(--font-display);
  }
```

Outside all layers (next to the existing `:lang(th) h1..h3` block), add the selection accent:

```css
/* The one place the accent colour is unmissable. */
::selection { background: var(--color-peri); color: var(--color-deep); }
```

- [ ] **Step 3: Sync the mirror comment in theme.ts**

`src/lib/theme.ts` mirrors colors only; add one line to its top comment noting the font tokens now chain through `next/font` variables set in `src/app/[locale]/layout.tsx` (keeps the "single source of truth" claim accurate). No color values change.

- [ ] **Step 4: Full check**

Run: `npm run check`
Expected: green. If any test asserts the literal old `--font-display` value, update the expectation to the new chain.

- [ ] **Step 5: Report done** (orchestrator verifies in browser: computed h1 font = Space Grotesk on /en, Anuphan on /th; selection is periwinkle; font transfer size within A6; commits `git add "src/app/[locale]/layout.tsx" src/app/globals.css src/lib/theme.ts tests && git commit -m "feat(type): Space Grotesk + Anuphan display pair, selection accent"`)

---

### Task 6: Particle wordmark choreography — make the centerpiece visible

*(Wave 2 — starts only after every Wave 1 task is committed.)*

Today the morph completes at 62% of one viewport of scroll, behind the CTA/byline, at point size 3.4 in low-alpha periwinkle — invisible in practice. Give it a stage: the hero pins for one extra viewport, the DOM copy fades out while the particles assemble the name **alone**, brighter and larger, then the canvas fades and the pin releases.

**Files:**
- Modify: `src/components/sections/Hero.tsx`, `src/components/motion/ParticleField.tsx`, `src/lib/theme.ts`, `src/app/globals.css`
- Test: `tests/particle-field.test.tsx`, `tests/hero.test.tsx`, `tests/theme.test.ts`

**Interfaces:**
- Consumes: Task 1's simplified Hero; Task 5's font families (`"Space Grotesk"` / `"Anuphan"`).
- Produces: Hero DOM: `<section id="hero" class="... h-[180vh]">` wrapping `<div data-hero-stage class="sticky top-0 flex h-screen ...">`. ParticleField exports timeline constants `MORPH_END = 0.45`, `STAGE_FADE = [0.22, 0.45]`, `CANVAS_FADE = [0.85, 1]`. `PARTICLE_COLORS.glow` added to theme. New shader uniforms `uColGlow` (vec3) and `uGlow` (float).

- [ ] **Step 1: Write the failing tests**

In `tests/theme.test.ts` add:

```ts
it('defines a glow colour for the resolved wordmark', () => {
  expect(PARTICLE_COLORS.glow).toHaveLength(3);
  // Brighter than pointA on every channel — the whole point of the glow.
  PARTICLE_COLORS.glow.forEach((c, i) => {
    expect(c).toBeGreaterThanOrEqual(PARTICLE_COLORS.pointA[i]);
  });
});
```

In `tests/hero.test.tsx` add:

```tsx
it('pins the hero: tall section wrapping a sticky full-viewport stage', () => {
  render(<Hero profile={profile} locale="en" />);
  const section = document.getElementById('hero')!;
  expect(section.className).toMatch(/h-\[180vh\]/);
  const stage = section.querySelector('[data-hero-stage]')!;
  expect(stage.className).toMatch(/sticky/);
});
```

Run: `npx vitest run tests/theme.test.ts tests/hero.test.tsx` — expected: FAIL.

- [ ] **Step 2: Add the glow colour to theme.ts**

In `src/lib/theme.ts`, extend `PARTICLE_COLORS`:

```ts
export const PARTICLE_COLORS = {
  pointA: rgbFloat(HEX.peri),
  pointB: rgbFloat(HEX.periDeep),
  line: rgbFloat('#3d4054'),
  // Near-white periwinkle the points shift toward as the wordmark resolves;
  // the scattered cloud stays the muted pair above.
  glow: rgbFloat('#dfe3f4'),
} as const;
```

- [ ] **Step 3: Pin the hero in Hero.tsx**

Change the section wrapper (currently `className="relative z-[2] flex min-h-screen flex-col items-center justify-center px-6 pt-32 pb-24 text-center"`) to a tall section + sticky stage:

```tsx
<section id="hero" className="relative z-[2] h-[180vh]">
  <div
    data-hero-stage
    className="sticky top-0 flex h-screen flex-col items-center justify-center px-6 pt-32 pb-24 text-center"
  >
    {/* ...ALL existing hero children move inside unchanged... */}
  </div>
</section>
```

In `src/app/globals.css`, inside the `prefers-reduced-motion` block, release the pin (a reduced-motion visitor should not scroll an extra empty viewport):

```css
  #hero { height: auto !important; min-height: 100vh; }
  #hero [data-hero-stage] {
    position: static !important;
    height: auto !important;
    min-height: 100vh;
    opacity: 1 !important;
    visibility: visible !important;
  }
```

- [ ] **Step 4: Rechoreograph ParticleField.tsx**

All edits inside `src/components/motion/ParticleField.tsx`:

1. Export the timeline (module scope, near the stacks):

```ts
/** Choreography timeline, as fractions of the hero pin's scroll travel.
 *  Exported so tests can pin the ordering invariants. */
export const MORPH_END = 0.45;
export const STAGE_FADE: readonly [number, number] = [0.22, 0.45];
export const CANVAS_FADE: readonly [number, number] = [0.85, 1];
```

2. Update the font stacks (lines 14–16) to lead with the Task 5 faces — mirrors `--font-display`/`--font-thai`:

```ts
const LATIN_STACK = '"Space Grotesk", "Avenir Next", Futura, "Helvetica Neue", -apple-system, sans-serif';
const THAI_STACK = '"Anuphan", -apple-system, "Sukhumvit Set", "IBM Plex Sans Thai", "Noto Sans Thai", sans-serif';
```

3. Re-rasterise once webfonts are ready (next/font loads async; the first rasterise may hit the fallback face). After the three `makeAttrib(...)` calls and the EBO setup, add:

```ts
// makeAttrib pushes buffers in call order: [scatter, target, seeds, ebo].
const targetBuf = buffers[1];
let disposed = false;
document.fonts.ready.then(() => {
  if (disposed) return;
  const fresh = samplePoints(rasterise(word), lattice.count, 9.2);
  gl.bindBuffer(gl.ARRAY_BUFFER, targetBuf);
  gl.bufferData(gl.ARRAY_BUFFER, fresh, gl.STATIC_DRAW);
  if (reducedMotion) draw(performance.now() / 1000);
});
```

and add `disposed = true;` as the first line of the cleanup function.

4. New glow uniform. In `FS`, change the uniform declaration line and the output:

```glsl
uniform vec3 uColA, uColB, uColGlow; uniform float uFade, uGlow;
...
  float a = pow(1.-r, 1.6);
  vec3 col = mix(mix(uColA, uColB, vSeed), uColGlow, uGlow);
  frag = vec4(col * a * uFade, a * vAlpha * uFade);
```

In `draw()`, alongside the other PT uniform uploads:

```ts
gl.uniform3fv(PT.uniforms.uColGlow, PARTICLE_COLORS.glow);
gl.uniform1f(PT.uniforms.uGlow, 0.6 * morph);
```

and replace the existing size upload with growth-on-morph:

```ts
gl.uniform1f(PT.uniforms.uSize, (3.4 + 2.0 * morph) * dpr);
```

5. Retime `onScroll` — the hero is now 180vh and the DOM stage fades while the name assembles. Replace the whole `onScroll` function:

```ts
const onScroll = () => {
  const hero = document.querySelector(heroSelector) as HTMLElement | null;
  if (!hero) return;
  // Progress through the pin: 0 at rest, 1 when the section's extra
  // height has fully scrolled past.
  const travel = Math.max(hero.offsetHeight - window.innerHeight, 1);
  const p = Math.min(Math.max(window.scrollY - hero.offsetTop, 0) / travel, 1);
  morph = Math.min(p / MORPH_END, 1);
  const [f0, f1] = CANVAS_FADE;
  fade = (1 - Math.min(Math.max((p - f0) / (f1 - f0), 0), 1)) * 0.85;
  canvas.style.opacity = String(fade);

  // Fade the DOM copy out of the particles' way while the name assembles.
  // Guarded on reducedMotion: under A3 the pin is released by CSS and the
  // copy must never dim.
  if (!reducedMotion) {
    const stage = hero.querySelector('[data-hero-stage]') as HTMLElement | null;
    if (stage) {
      const [s0, s1] = STAGE_FADE;
      const sOut = Math.min(Math.max((p - s0) / (s1 - s0), 0), 1);
      stage.style.opacity = String(1 - sOut);
      // visibility (not display) so layout never jumps; also removes the
      // ghost CTA from the tab order while invisible.
      stage.style.visibility = sOut >= 1 ? 'hidden' : 'visible';
    }
  }

  if (fade <= 0.001) {
    running = false;
  } else if (!running && !reducedMotion) {
    running = true;
    rafId = requestAnimationFrame(frame);
  }
};
```

6. Reduced-motion static frame shows the **resolved** name, not the scattered cloud. Replace the `if (reducedMotion) { draw(...) }` branch at the bottom of the effect:

```ts
if (reducedMotion) {
  // One static frame of the resolved wordmark, quiet behind the hero.
  morph = 1;
  fade = 0.4;
  canvas.style.opacity = String(fade);
  draw(performance.now() / 1000);
} else {
  rafId = requestAnimationFrame(frame);
}
```

- [ ] **Step 5: Extend the particle tests**

`tests/particle-field.test.tsx` — keep every existing test; add:

```tsx
import { MORPH_END, STAGE_FADE, CANVAS_FADE } from '@/components/motion/ParticleField';

it('locks the choreography timeline ordering', () => {
  expect(MORPH_END).toBeLessThanOrEqual(STAGE_FADE[1]); // name resolved by the time the stage is fully gone
  expect(STAGE_FADE[0]).toBeGreaterThan(0);             // copy fully visible at rest
  expect(CANVAS_FADE[0]).toBeGreaterThan(MORPH_END);    // name holds alone before fading
});
```

- [ ] **Step 6: Run tests + full check**

Run: `npx vitest run tests/particle-field.test.tsx tests/hero.test.tsx tests/theme.test.ts` then `npm run check`
Expected: all green.

- [ ] **Step 7: Report done** — orchestrator browser QA (this task is exactly what jsdom cannot see): scroll the hero slowly — copy fades fully by ~45% of the pin, the name assembles bright and legible, holds alone through ~85%, fades by 100%; TH wordmark renders Anuphan glyphs; rAF stops past the hero (Performance panel); reduced-motion → no pin, static resolved wordmark at 0.4 opacity, copy never dims. Commits `git add src/components/sections/Hero.tsx src/components/motion/ParticleField.tsx src/lib/theme.ts src/app/globals.css tests/particle-field.test.tsx tests/hero.test.tsx tests/theme.test.ts && git commit -m "feat(hero): pinned particle wordmark choreography"`

---

### Task 7: Accent application — halo spin, underline draw, contact glow

*(Wave 2, strictly **after** Task 6 — both edit Hero.tsx and globals.css.)*

Spec §4 lists two implemented-nowhere details: the 24s rotating dashed portrait halo and link underline-draw. Plus: the periwinkle accent barely exists outside the particles. Apply all three quietly.

**Files:**
- Modify: `src/app/globals.css`, `src/components/sections/Hero.tsx` (one className), `src/components/sections/ContactBand.tsx`, `src/components/SiteNav.tsx` (one className)
- Test: existing suites stay green (visual-only task — jsdom cannot observe any of it; orchestrator browser QA is the gate)

**Interfaces:**
- Consumes: Task 6's final Hero markup (the halo `<span>` at the top of the portrait `Reveal`); Task 2's `.nav-link` classes.
- Produces: `.halo` class (Hero portrait), `.u-draw` underline utility (nav links + contact email link), contact CTA hover glow.

- [ ] **Step 1: Halo spin**

Hero.tsx portrait halo span currently: `className="pointer-events-none absolute -inset-2 rounded-full border border-dashed border-peri/50"`. Prepend `halo`:

```tsx
<span className="halo pointer-events-none absolute -inset-2 rounded-full border border-dashed border-peri/50" />
```

In `globals.css` `@layer components`:

```css
  /* Portrait halo: the spec's 24s dashed rotation (§4). Slow enough to be
     subliminal; reduced-motion kills it below. */
  .halo { animation: halo-spin 24s linear infinite; }
  @keyframes halo-spin { to { transform: rotate(360deg); } }
```

And in the `prefers-reduced-motion` block:

```css
  .halo { animation: none !important; }
```

- [ ] **Step 2: Underline draw**

`globals.css` `@layer components`:

```css
  /* Underline that draws in from the left on hover/focus (spec §4 named a
     measured SVG stroke; a scaled pseudo-element is visually identical for
     straight underlines at a fraction of the code). */
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
```

reduced-motion block: `.u-draw::after { transition: none !important; }`

Apply the class: in `SiteNav.tsx` add `u-draw` to the `nav-link` className string (desktop anchors only, not the mobile overlay). In `ContactBand.tsx`, locate the email `<a>` in the footer meta row (it renders `profile.email` with a permanent underline treatment) and add `u-draw` to its className; if it carries a permanent `underline`/border-bottom class, replace that class with `u-draw`.

- [ ] **Step 3: Contact CTA glow**

In `ContactBand.tsx`, the "Start a conversation" `<a className="btn ...">` gains a periwinkle hover ring via Tailwind utilities only (no new CSS) — append to its className:

```
transition-shadow hover:shadow-[0_0_0_3px_rgba(168,174,203,0.35),0_18px_60px_-12px_rgba(168,174,203,0.45)]
```

- [ ] **Step 4: Full check + report**

Run: `npm run check` — green. Report done. (Orchestrator browser QA: halo rotates; nav/contact underlines draw on hover and on keyboard focus; CTA glows; reduced-motion disables all three. Commits `git add src/app/globals.css src/components/sections/Hero.tsx src/components/sections/ContactBand.tsx src/components/SiteNav.tsx && git commit -m "feat(accent): halo spin, underline draw, contact glow"`)

---

### Task 8: Legacy route redirects

*(Wave 3 — small, sequential.)*

`/[locale]/projects` and `/[locale]/career` are pre-redesign, unlinked from the nav, and visually stale. Redirect them to the home anchors. `/writing` and `/writing/[slug]` stay (real content routes; the "no posts yet" message is intentional).

**Files:**
- Modify: `next.config.ts`, `src/app/sitemap.ts`
- Test: `tests/sitemap-posts.test.ts` (and any other test that enumerates `/projects`/`/career` — grep `tests/` for `'/projects'` first)

**Interfaces:**
- Consumes: nothing.
- Produces: 307 redirects `/:locale/projects → /:locale#work`, `/:locale/career → /:locale#cv`; sitemap `staticPaths` becomes `['', '/writing']`.

- [ ] **Step 1: Update the sitemap test first**

Grep: `grep -rn "'/projects'" tests/` — update every expectation that lists it. Then add to `tests/sitemap-posts.test.ts`:

```ts
it('omits redirected legacy routes', async () => {
  const entries = await sitemap();
  const urls = entries.map((e) => e.url);
  expect(urls.some((u) => u.endsWith('/projects'))).toBe(false);
  expect(urls.some((u) => u.endsWith('/career'))).toBe(false);
});
```

Run: `npx vitest run tests/sitemap-posts.test.ts` — expected FAIL.

- [ ] **Step 2: Add redirects in next.config.ts**

Replace the file body:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    // Pre-redesign routes. The home page absorbed them as sections; temporary
    // (307) so the URLs can come back as real pages if the sections outgrow
    // the single-page layout.
    return [
      { source: '/:locale(en|th)/projects', destination: '/:locale#work', permanent: false },
      { source: '/:locale(en|th)/career', destination: '/:locale#cv', permanent: false },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 3: Drop them from the sitemap**

`src/app/sitemap.ts:6`:

```ts
// '/projects' and '/career' redirect to home anchors (next.config.ts) —
// a sitemap must not list URLs that answer 3xx.
const staticPaths = ['', '/writing'];
```

- [ ] **Step 4: Verify**

Run: `npx vitest run tests/sitemap-posts.test.ts` then `npm run check` — green.
Redirects require a config reload — the orchestrator restarts the dev server, then:
`curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "http://localhost:3000/en/projects"` → expect `307 …/en#work`; same for `/th/career` → `…/th#cv`.

- [ ] **Step 5: Report done** (orchestrator commits `git add next.config.ts src/app/sitemap.ts tests && git commit -m "feat(routes): redirect legacy projects/career to home anchors"`)

**Left in place deliberately:** `src/app/[locale]/projects/page.tsx`, `career/page.tsx`, their tests, `ProjectCard`, and the legacy `@theme` token names — unreachable behind the redirect but harmless. Deleting them is a separate decision for Klao.

---

### Task 9: Orchestrator QA gate (no subagent)

The orchestrator (Opus) runs this after all commits land.

- [ ] `npm run check` from a clean tree — all green.
- [ ] Browser sweep at 1440×900 and 390×844, `/en` and `/th`: hero pin choreography (copy fades → name assembles alone → holds → releases), nav hide/show + solid bg + light-band inversion, mobile burger, work covers ×4, About story, craft spotlight, halo/underline/glow accents.
- [ ] `prefers-reduced-motion`: no pin, static resolved wordmark, zero animation, no cursor (A3).
- [ ] Performance: DevTools trace over the hero — ≥60fps target (A4); confirm rAF stops past the hero.
- [ ] Fonts: computed h1 family = Space Grotesk (/en) / Anuphan (/th); total font transfer within A6 (≤250KB first load excl. screenshots).
- [ ] Lighthouse accessibility on `/en` ≥95 (A10).
- [ ] `curl` redirect checks (Task 8 Step 4).
- [ ] Update the SDD ledger + memory file `project_klao_site.md` with the outcome.

---

## Self-review notes

- **Coverage vs audit:** particle visibility (T6) · hero duplication (T1) · nav collision + mobile nav (T2) · work covers/captions (T3) · About story + craft motion (T4) · typography + accent (T5, T7) · spec §4 leftovers halo/underline (T7) · legacy routes (T8). Deferred by explicit assumption: career.json number typos (needs Klao), legacy-page deletion (needs Klao), Notion-side cover upload (Klao).
- **Type consistency:** `SpotlightList` props (`lines/className/itemClassName`) match T4 Step 6 usage; `PARTICLE_COLORS.glow` (T6 Step 2) matches the uniform upload (T6 Step 4) and theme test (T6 Step 1); `MORPH_END/STAGE_FADE/CANVAS_FADE` exports match the T6 Step 5 import; `nav-chrome/nav-hidden/nav-solid/nav-burger` classes match between SiteNav JS and site-nav.css; `.spot`/`spot-on` match between SpotlightList and spotlight.css.
- **Parallel-safety:** Wave 1 file sets are pairwise disjoint — T1 {Hero.tsx, hero.test} · T2 {SiteNav.tsx, site-nav.css, site-nav.test} · T3 {WorkGrid.tsx, projects.json, 2 SVGs, work-grid.test} · T4 {dictionary.ts, AboutBand, CraftBand, SpotlightList*, spotlight.css, bands.test, spotlight-list.test} · T5 {[locale]/layout.tsx, globals.css, theme.ts}. T6 and T7 share Hero.tsx + globals.css → strictly sequential in Wave 2.
