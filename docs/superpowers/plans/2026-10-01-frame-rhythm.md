# Frame Rhythm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the clips' design spec (`design/clips/frame.md`), make the Career time rail draw itself once, and make the By day chapters settle once in order of importance (deal chapter first).

**Architecture:**
- Task 1 is documentation plus one file-shape test.
- Task 2 adds a one-shot, IntersectionObserver-triggered `data-draw` state to the existing `CareerDetent` client island, and wraps the rail's track and segments in one `.car-rline` element that scales from the left.
- Task 3 extracts Reveal's observer logic into a `useRevealIn` hook, adds a `RevealGroup` wrapper (class `rvg`) whose children settle with a `--o` stagger, and uses it for the By day chapter list. The ranks come from a small `story-emphasis` module.

**Tech Stack:** Next.js 15 / React 19 client components, plain CSS in `@layer components`, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-10-01-frame-rhythm-design.md` (and `docs/superpowers/specs/2026-09-25-white-edition-design.md` §5.5 for the site's motion rules).

## Global Constraints

- **Animated properties:** only `transform` and `opacity` animate, in CSS transitions and keyframes alike.
- **Scroll-linked scenes:** exactly one on the page (Signature). The new motion is one-shot, triggered when the element crosses the 85 % line (`IntersectionObserver` with `rootMargin: '0px 0px -15% 0px'`), never scroll-linked.
- **Reduced motion or no `IntersectionObserver`:** nothing moves and the final state shows at once.
- **No JavaScript:** the server HTML shows the final state and hides nothing.
- **Opacity floor:** text never starts below opacity `.55`. The decorative rail line may start at `transform: scaleX(0)`.
- **Already on screen:** if the rail is already past the 85 % line when the component mounts, nothing animates and nothing flashes.
- **Timing:** each sequence finishes within 1.5 s, and a stagger's total spread stays under 500 ms.
- **Tokens:** motion uses the tokens in `src/app/globals.css` (`--ease-drift`, `--ease-settle`, `--dur-enter` 420 ms, `--dur-sheet` 500 ms, `--dur-rise` 600 ms). The one exception is the rail line's 900 ms draw.
- **Dependencies:** no new runtime dependencies.
- **CSS layers:** all component CSS sits inside `@layer components` (enforced by `tests/component-css-layers.test.ts`).
- **Before every commit:** `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build` must be green.
- **Commit messages:** conventional messages, each ending with the trailer `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- **Page length:** the budgets are unchanged (desktop 8.7, phone 12). Only transform and opacity change, so layout cannot move.

## Review Focus

1. **A `#career` or `#story` deep link, or a reload with the section already on screen:** the rail must stay drawn with no flash to `scaleX(0)` (Task 2 test "already in view"). The chapters behave exactly like today's Reveal: the observer fires at once and they settle.
2. **Reduced motion, or a browser without `IntersectionObserver`:** the final state shows at once, with no `data-draw` attribute and no dimmed chapters left behind (tests in Tasks 2 and 3).
3. **Notion chapters with unexpected `order` values (0, 7, 99, duplicates):** every chapter still renders, and unknown orders rank last so the stagger stays under 500 ms (Task 3 `emphasisRank` test).
4. **Switching By day Short/Full after the chapters settled:** they stay at full opacity and do not animate again (Task 3 test).
5. **Picking another career pill after the rail drew:** the marker still slides, because its `transform` transition survives the new rules (Task 2 CSS test).

---

### Task 1: frame.md, the clips' design spec

**Files:**
- Create: `design/clips/frame.md` (content below, verbatim)
- Modify: `docs/superpowers/specs/2026-09-30-sheet-clips.md` (§6 "How to add a clip": add one bullet)
- Modify: `design/clips/cafenista/README.md`, `design/clips/aje/README.md`, `design/clips/gonai/README.md` (add one line each)
- Test: `tests/clip-frame-spec.test.ts` (new)

**Interfaces:**
- Consumes: nothing.
- Produces: `design/clips/frame.md`, the brand truth that later clip work reads.

- [ ] **Step 1: Write the failing test.** Create `tests/clip-frame-spec.test.ts`:

```ts
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const FRAME = 'design/clips/frame.md';

describe('design/clips/frame.md (spec 2026-10-01 §2.1)', () => {
  it('exists with the White Edition stage, accent and the four motion eases', () => {
    expect(existsSync(FRAME)).toBe(true);
    const md = readFileSync(FRAME, 'utf8');
    expect(md.startsWith('---\n')).toBe(true);
    expect(md).toContain('stage: "#F5F6F8"');
    expect(md).toContain('accent: "#26314A"');
    expect(md).toContain('cubic-bezier(.32,.72,0,1)');
    expect(md).toContain('cubic-bezier(.28,.11,.32,1)');
    expect(md).toContain('cubic-bezier(.4,0,1,1)');
    expect(md).toContain('cubic-bezier(.34,1.56,.64,1)');
  });

  it('is referenced by every clip source folder', () => {
    const dirs = readdirSync('design/clips', { withFileTypes: true }).filter((d) => d.isDirectory());
    expect(dirs.length).toBeGreaterThanOrEqual(3);
    for (const d of dirs) {
      const readme = readFileSync(join('design/clips', d.name, 'README.md'), 'utf8');
      expect(readme, d.name).toContain('../frame.md');
    }
  });
});
```

- [ ] **Step 2: Run it to see it fail.** Run `npx vitest run tests/clip-frame-spec.test.ts`. Expected: FAIL (`design/clips/frame.md` does not exist).

- [ ] **Step 3: Create `design/clips/frame.md`.** Copy the file `.superpowers/sdd/2026-10-01-hyperframes-motion/frame-draft.md` from the MAIN checkout. The path is absolute: `/Users/suvichakjarunopratamp/Desktop/Klao Workspace/Personal/klao-site/.superpowers/sdd/2026-10-01-hyperframes-motion/frame-draft.md`. Then make exactly two edits in the copy:
  - The `version:` line becomes `version: 0.1 (2026-10-01)`.
  - The `display:` typography line becomes `display: "ui-serif (New York) 600 — film titles and end cards only (Klao 4A, 2026-10-01)"`.

  Keep every other line verbatim: frontmatter colours, typography, spacing, radius, shadow, motion and formats, plus the Overview, The frame, Composition rules, Motion and Do / Don't sections.

- [ ] **Step 4: Point the docs at it.**
  - In `docs/superpowers/specs/2026-09-30-sheet-clips.md` §6 "How to add a clip", add this as the first bullet: ``- Follow `design/clips/frame.md` (the clips' design spec: stage, frames, eases, beats, do/don't).``
  - In each `design/clips/<key>/README.md`, add this line after the first paragraph: `Brand truth: [../frame.md](../frame.md) — every clip follows it.`

- [ ] **Step 5: Run the test to see it pass.** Run `npx vitest run tests/clip-frame-spec.test.ts`. Expected: PASS (2 tests).

- [ ] **Step 6: Run the full check, then commit.** Run `npm test && npx tsc --noEmit && npm run lint && npm run build`, then:
```bash
git add design/clips/frame.md design/clips/*/README.md docs/superpowers/specs/2026-09-30-sheet-clips.md tests/clip-frame-spec.test.ts
git commit -m "docs(clips): frame.md, the one design spec every clip follows"
```

---

### Task 2: the Career time rail draws itself once

**Files:**
- Modify: `src/components/CareerDetent.tsx` (the rail markup around lines 140–170, plus a new effect)
- Modify: `src/components/career.css` (new rules inside the existing `@layer components` block)
- Modify: `docs/superpowers/specs/2026-09-25-white-edition-design.md` (§5.5: one dated line)
- Test: `tests/career-detent.test.tsx` (new `describe`) and `tests/career-draw-css.test.ts` (new)

**Interfaces:**
- Consumes: `motionAllowed()` from `src/lib/motion.ts`. It is true only when `(prefers-reduced-motion: no-preference)` matches.
- Produces:
  - The attribute `data-draw` on `.car-rail`. `"ready"` is the start pose, set after mount; `"go"` means animating, then final. No attribute means the final state.
  - The new wrapper `<span class="car-rline">` around `.car-rtrack` and every `.car-rseg`.

**Behaviour:**
- **Server and first client render:** no `data-draw`, so the rail is drawn.
- **After mount:** set `data-draw="ready"` only if all three hold:
  - `motionAllowed()` is true;
  - `IntersectionObserver` exists;
  - the rail is NOT already on screen, where on screen means `rect.top < innerHeight * 0.85 && rect.bottom > 0`.

  Then observe the rail with `rootMargin: '0px 0px -15% 0px'`. On the first intersecting entry, set `data-draw="go"` and disconnect. In every other case, never set `data-draw`.
- **CSS for `ready`:**
  - `.car-rline` sits at `scaleX(0)`.
  - `.car-ryears span` and `.car-rmark` dim to `.55`.
- **CSS for `go`:**
  - `.car-rline` transitions back to none over 900 ms with `--ease-drift`.
  - The years brighten with `--dur-enter` and `--ease-settle`, delayed `calc(500ms + var(--k, 0) * 70ms)`.
  - The marker brightens with the same ease, delayed 900 ms, and keeps its existing `transform var(--dur-ui) var(--ease-settle)` transition so the selection slide still works.

- [ ] **Step 1: Write the failing component tests.** Add a `describe('rail draws once (spec 2026-10-01 §2.2)', …)` block to `tests/career-detent.test.tsx`.
  - Reuse that file's existing render helper, props fixture and stubbing patterns. It already overrides `getBoundingClientRect` to give `.car-rail` a width; keep that working.
  - Adapt the names below (`PROPS`, the render call) to the file's real ones.
  - In `afterEach`, restore spies and globals (`vi.restoreAllMocks(); vi.unstubAllGlobals();`) if the file does not already.

```tsx
import { act } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';

function stubMotion(allowed: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: allowed ? q.includes('no-preference') : q.includes('reduce'),
    addEventListener() {}, removeEventListener() {},
  }));
}
let fire: (hit: boolean) => void = () => {};
let disconnected = false;
let rootMargin: string | undefined;
function stubIO() {
  disconnected = false;
  vi.stubGlobal('IntersectionObserver', class {
    constructor(private cb: IntersectionObserverCallback, opts?: IntersectionObserverInit) {
      rootMargin = opts?.rootMargin;
      fire = (hit) => this.cb([{ isIntersecting: hit } as IntersectionObserverEntry], this as never);
    }
    observe() {} unobserve() {} disconnect() { disconnected = true; }
  });
}
function railTop(top: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const isRail = this.classList.contains('car-rail');
    return { top: isRail ? top : 0, bottom: isRail ? top + 64 : 0, left: 0, right: 358, width: isRail ? 358 : 0, height: 64, x: 0, y: 0, toJSON() {} } as DOMRect;
  });
}

describe('rail draws once (spec 2026-10-01 §2.2)', () => {
  it('ships the drawn rail in the server HTML (no data-draw)', () => {
    const html = renderToStaticMarkup(<CareerDetent {...PROPS} />);
    expect(html).toContain('class="car-rail"');
    expect(html).not.toContain('data-draw');
    expect(html).toContain('class="car-rline"');
  });

  it('sets ready below the fold, then go when it crosses the 85 % line, then stops watching', () => {
    stubMotion(true); stubIO(); railTop(5000);
    const { container } = render(<CareerDetent {...PROPS} />);
    const rail = container.querySelector('.car-rail') as HTMLElement;
    expect(rail.dataset.draw).toBe('ready');
    expect(rootMargin).toBe('0px 0px -15% 0px');
    act(() => fire(false));
    expect(rail.dataset.draw).toBe('ready');
    act(() => fire(true));
    expect(rail.dataset.draw).toBe('go');
    expect(disconnected).toBe(true);
  });

  it('leaves the rail drawn when it is already on screen at mount (deep link / reload)', () => {
    stubMotion(true); stubIO(); railTop(120);
    const { container } = render(<CareerDetent {...PROPS} />);
    expect((container.querySelector('.car-rail') as HTMLElement).dataset.draw).toBeUndefined();
  });

  it('never dims anything under reduced motion', () => {
    stubMotion(false); stubIO(); railTop(5000);
    const { container } = render(<CareerDetent {...PROPS} />);
    expect((container.querySelector('.car-rail') as HTMLElement).dataset.draw).toBeUndefined();
  });

  it('never dims anything without IntersectionObserver', () => {
    stubMotion(true); vi.stubGlobal('IntersectionObserver', undefined); railTop(5000);
    const { container } = render(<CareerDetent {...PROPS} />);
    expect((container.querySelector('.car-rail') as HTMLElement).dataset.draw).toBeUndefined();
  });

  it('wraps the track and every segment in .car-rline, and numbers the year labels with --k', () => {
    const { container } = render(<CareerDetent {...PROPS} />);
    const line = container.querySelector('.car-rail > .car-rline') as HTMLElement;
    expect(line.querySelector('.car-rtrack')).not.toBeNull();
    expect(line.querySelectorAll('.car-rseg').length).toBe(container.querySelectorAll('.car-rseg').length);
    const years = [...container.querySelectorAll('.car-ryears span')] as HTMLElement[];
    years.forEach((s, i) => expect(s.style.getPropertyValue('--k')).toBe(String(i)));
  });
});
```

- [ ] **Step 2: Write the failing CSS test.** Create `tests/career-draw-css.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/components/career.css', 'utf8');

describe('career.css rail draw (spec 2026-10-01 §2.2)', () => {
  it('scales the line from its left edge', () => {
    expect(css).toMatch(/\.car-rline\s*\{[^}]*transform-origin:\s*left center/);
  });
  it('puts every draw rule under prefers-reduced-motion: no-preference', () => {
    const at = css.indexOf('[data-draw=');
    const guard = css.lastIndexOf('@media (prefers-reduced-motion: no-preference)', at);
    expect(at).toBeGreaterThan(-1);
    expect(guard).toBeGreaterThan(-1);
  });
  it('starts the line at scaleX(0) and text no lower than .55', () => {
    expect(css).toMatch(/\[data-draw="ready"\]\s*\.car-rline\s*\{[^}]*transform:\s*scaleX\(0\)/);
    expect(css).toMatch(/\[data-draw="ready"\]\s*\.car-ryears span\s*\{[^}]*opacity:\s*\.55/);
    expect(css).toMatch(/\[data-draw="ready"\]\s*\.car-rmark\s*\{[^}]*opacity:\s*\.55/);
  });
  it('only transitions transform and opacity, and keeps the marker slide', () => {
    for (const m of css.matchAll(/\[data-draw="go"\][^{]*\{([^}]*)\}/g)) {
      const t = /transition:\s*([^;]+);/.exec(m[1])?.[1] ?? '';
      for (const part of t.split(',')) expect(part.trim()).toMatch(/^(transform|opacity)\b/);
    }
    expect(css).toMatch(/\[data-draw="go"\]\s*\.car-rmark\s*\{[^}]*transition:[^;]*transform var\(--dur-ui\) var\(--ease-settle\)/);
  });
});
```

- [ ] **Step 3: Run both to see them fail.** Run `npx vitest run tests/career-detent.test.tsx tests/career-draw-css.test.ts`. Expected: FAIL (no `.car-rline`, no `data-draw`, no CSS rules).

- [ ] **Step 4: Implement it in `src/components/CareerDetent.tsx`.**
  - Add `import { motionAllowed } from '@/lib/motion';`.
  - Add the state `const [draw, setDraw] = useState<'ready' | 'go' | null>(null);`.
  - Add this effect after the existing effects:

```tsx
  // Spec 2026-10-01 §2.2: the rail draws itself once when it crosses the 85 % line. Only after
  // mount (the server HTML is the drawn rail), only when motion is allowed and an observer
  // exists, and never when the rail is already on screen (a #career link or a reload), so
  // nothing flashes back to an empty line.
  const hasRail = Boolean(rail);
  useEffect(() => {
    const el = railEl.current;
    if (!el || !motionAllowed() || typeof IntersectionObserver === 'undefined') return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.85 && r.bottom > 0) return;
    setDraw('ready');
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setDraw('go');
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -15% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasRail]);
```

  - In the rail JSX:
    - Add `data-draw={draw ?? undefined}` to `<div className="car-rail" …>`.
    - Wrap `<span className="car-rtrack" />` and the `rail.segments.map(…)` in `<span className="car-rline">…</span>`.
    - Give each `.car-ryears` span `style={{ left: …, ['--k' as string]: String(i) }}`, using the tick index from `rail.ticks.map((tick, i) => …)`. The final `data-now` span gets `--k` = `rail.ticks.length`.

- [ ] **Step 5: Implement it in `src/components/career.css`.** Add these rules inside the existing `@layer components { … }`, after the `.car-ryears` rules:

```css
  /* Spec 2026-10-01 §2.2: the rail draws itself once (CareerDetent sets data-draw after mount;
     no attribute = the finished rail, which is what no-JS and reduced motion get). */
  .car-rline { position: absolute; inset: 0; transform-origin: left center; }
  @media (prefers-reduced-motion: no-preference) {
    .car-rail[data-draw="ready"] .car-rline { transform: scaleX(0); }
    .car-rail[data-draw="ready"] .car-ryears span { opacity: .55; }
    .car-rail[data-draw="ready"] .car-rmark { opacity: .55; }
    .car-rail[data-draw="go"] .car-rline { transition: transform 900ms var(--ease-drift); }
    .car-rail[data-draw="go"] .car-ryears span { transition: opacity var(--dur-enter) var(--ease-settle); transition-delay: calc(500ms + var(--k, 0) * 70ms); }
    .car-rail[data-draw="go"] .car-rmark { transition: transform var(--dur-ui) var(--ease-settle), opacity var(--dur-enter) var(--ease-settle) 900ms; }
  }
```

  The existing `.car-ryears span` transforms (`translateX(-50%)` etc.) stay untouched; the new rules change only `opacity` on the spans. The file's existing reduced-motion block needs no change, because the new rules already sit behind `no-preference`.

- [ ] **Step 6: Record it in the White Edition spec.** Append this line to §5.5 of `docs/superpowers/specs/2026-09-25-white-edition-design.md`: `2026-10-01 (Klao 2A, spec 2026-10-01-frame-rhythm): the Career rail draws itself once at the 85 % line (line scaleX from the left 900 ms, years and marker brighten from .55). One-shot, not scroll-linked.`

- [ ] **Step 7: Run the tests to see them pass.** Run `npx vitest run tests/career-detent.test.tsx tests/career-draw-css.test.ts tests/career-band.test.tsx tests/component-css-layers.test.ts`. Expected: PASS.

- [ ] **Step 8: Run the full check, then commit.** Run `npm test && npx tsc --noEmit && npm run lint && npm run build`, then:
```bash
git add src/components/CareerDetent.tsx src/components/career.css tests/career-detent.test.tsx tests/career-draw-css.test.ts docs/superpowers/specs/2026-09-25-white-edition-design.md
git commit -m "feat(career): the time rail draws itself once at the 85 % line"
```

---

### Task 3: By day chapters settle in order of importance

**Files:**
- Create: `src/lib/story-emphasis.ts`
- Create: `src/components/motion/useRevealIn.ts`
- Create: `src/components/motion/RevealGroup.tsx`
- Modify: `src/components/motion/Reveal.tsx` (use the hook; behaviour stays identical)
- Modify: `src/components/StoryDetail.tsx` (the `<ol className="bd-chapters">` block, lines ~163–202)
- Modify: `src/app/globals.css` (next to the `.rv` block, around lines 720–738)
- Modify: `docs/superpowers/specs/2026-09-25-white-edition-design.md` (§5.5: one dated line)
- Test: `tests/story-emphasis.test.ts` (new), plus new cases in `tests/reveal.test.tsx`, `tests/by-day.test.tsx` and `tests/globals-css.test.ts`

**Interfaces:**
- Consumes: `StoryChapter.order: number` (`src/lib/models.ts`).
- Produces:
  - `EMPHASIS_ORDER: readonly number[]` and `emphasisRank(order: number): number`, from `src/lib/story-emphasis.ts`.
  - `useRevealIn(ref: RefObject<HTMLElement | null>): void`, from `src/components/motion/useRevealIn.ts`.
  - Default export `RevealGroup({ children, as?, className? })`, from `src/components/motion/RevealGroup.tsx`. It renders the class `rvg` and adds `in` exactly like Reveal.

- [ ] **Step 1: Write the failing tests.**

Create `tests/story-emphasis.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { EMPHASIS_ORDER, emphasisRank } from '@/lib/story-emphasis';

describe('emphasisRank (spec 2026-10-01 §2.3, Klao 3A: deal chapter first)', () => {
  it('ranks orders 2, 4, 1, 3, 5, 6 as 0..5', () => {
    expect(EMPHASIS_ORDER).toEqual([2, 4, 1, 3, 5, 6]);
    expect([1, 2, 3, 4, 5, 6].map(emphasisRank)).toEqual([2, 0, 3, 1, 4, 5]);
  });
  it('puts unknown orders last, so the stagger never passes 6 steps (< 500 ms at 75 ms)', () => {
    for (const o of [0, 7, 99, -1, Number.NaN]) expect(emphasisRank(o)).toBe(6);
    expect(Math.max(...[0, 1, 2, 3, 4, 5, 6, 7, 99].map(emphasisRank)) * 75).toBeLessThan(500);
  });
});
```

Add to `tests/reveal.test.tsx`. That file already stubs `matchMedia` with `matches: false` and a triggerable IntersectionObserver; reuse its `observed`, `trigger` and `options`.

```tsx
import RevealGroup from '@/components/motion/RevealGroup';

describe('RevealGroup', () => {
  it('ships `rvg` in the server HTML with no inline opacity or transform', () => {
    const html = renderToStaticMarkup(<RevealGroup as="ol"><li>a</li></RevealGroup>);
    expect(html).toContain('class="rvg"');
    expect(html).not.toMatch(/opacity|transform|visibility|display:\s*none/);
  });
  it('adds `in` once the group crosses the 85 % line', () => {
    const { container } = render(<RevealGroup as="ol" className="bd-chapters"><li>a</li></RevealGroup>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toBe('rvg bd-chapters');
    expect(options?.rootMargin).toBe('0px 0px -15% 0px');
    trigger([el]);
    expect(el.classList.contains('in')).toBe(true);
  });
  it('adds `in` at once under reduced motion', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), addEventListener() {}, removeEventListener() {} }));
    const { container } = render(<RevealGroup><li>a</li></RevealGroup>);
    expect((container.firstElementChild as HTMLElement).classList.contains('in')).toBe(true);
  });
  it('adds `in` at once without IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { container } = render(<RevealGroup><li>a</li></RevealGroup>);
    expect((container.firstElementChild as HTMLElement).classList.contains('in')).toBe(true);
  });
});
```

Add to `tests/by-day.test.tsx`, using that file's existing render helper, chapters fixture (orders 1..6) and IntersectionObserver stub. Replace the comment lines with that file's own render and Full-click code.

```tsx
it('renders the chapter list as one RevealGroup, each chapter carrying its emphasis rank (spec 2026-10-01 §2.3)', () => {
  // render ByDay exactly as the other cases in this file do
  const ol = container.querySelector('ol.bd-chapters') as HTMLElement;
  expect(ol.classList.contains('rvg')).toBe(true);
  const items = [...ol.querySelectorAll(':scope > li')] as HTMLElement[];
  expect(items.every((li) => !li.classList.contains('rv'))).toBe(true);
  expect(items.map((li) => li.style.getPropertyValue('--o'))).toEqual(['2', '0', '3', '1', '4', '5']);
});

it('keeps settled chapters settled when Short/Full is switched (no re-animation)', () => {
  // render ByDay as above
  const ol = container.querySelector('ol.bd-chapters') as HTMLElement;
  ol.classList.add('in');
  // click the Full option using this file's existing pattern, then Short again
  expect(ol.classList.contains('in')).toBe(true);
});
```

Add to `tests/globals-css.test.ts`, next to the existing `.rv` test (around lines 243–252). Use the same variable the file uses for the CSS text; below it is called `css`.

```ts
it('dims .rvg children only under html.js + no-preference, never below .55, and settles with transform/opacity', () => {
  const block = css.slice(css.indexOf('html.js .rv {'), css.indexOf('html.js .rv {') + 1400);
  expect(block).toMatch(/html\.js \.rvg > \* \{[^}]*opacity: \.55;[^}]*transform: scale\(\.97\)/);
  expect(block).toMatch(/html\.js \.rvg > \* \{[^}]*transition-delay: calc\(var\(--o, 0\) \* 75ms\)/);
  expect(block).toMatch(/html\.js \.rvg\.in > \* \{[^}]*opacity: 1;[^}]*transform: none/);
  const guard = css.lastIndexOf('@media (prefers-reduced-motion: no-preference)', css.indexOf('html.js .rvg > *'));
  expect(guard).toBeGreaterThan(-1);
});
```

- [ ] **Step 2: Run them to see them fail.** Run `npx vitest run tests/story-emphasis.test.ts tests/reveal.test.tsx tests/by-day.test.tsx tests/globals-css.test.ts`. Expected: FAIL (the modules are missing, and there is no `rvg` and no `--o`).

- [ ] **Step 3: Create `src/lib/story-emphasis.ts`.**

```ts
// Spec 2026-10-01 §2.3 (Klao 3A): the By day chapters settle in order of importance, not in
// DOM order — the deal chapter (order 2) first, then 4, 1, 3, 5, 6. Values are
// StoryChapter.order. Anything else (a chapter added in Notion later) ranks last, so the
// stagger never runs past 6 steps.
export const EMPHASIS_ORDER: readonly number[] = [2, 4, 1, 3, 5, 6];

export function emphasisRank(order: number): number {
  const i = EMPHASIS_ORDER.indexOf(order);
  return i >= 0 ? i : EMPHASIS_ORDER.length;
}
```

- [ ] **Step 4: Create `src/components/motion/useRevealIn.ts`.** Move Reveal's effect here verbatim:

```ts
'use client';

import { useEffect, type RefObject } from 'react';

/** Adds `in` to the element once it crosses the 85 % line (master plan C9), or straight away
 *  when there is nothing to animate (reduced motion, no IntersectionObserver). Shared by Reveal
 *  (`.rv`, a fade-rise) and RevealGroup (`.rvg`, children settle in `--o` order). */
export function useRevealIn(ref: RefObject<HTMLElement | null>): void {
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
  }, [ref]);
}
```

  Then, in `src/components/motion/Reveal.tsx`, replace its `useEffect` block with `useRevealIn(ref);`. Keep the doc comment, props, classes and the `--i` style unchanged, and remove the now-unused `useEffect` import.

- [ ] **Step 5: Create `src/components/motion/RevealGroup.tsx`.**

```tsx
'use client';

import { useRef, type ElementType, type ReactNode } from 'react';
import { useRevealIn } from '@/components/motion/useRevealIn';

type Props = { children: ReactNode; as?: ElementType; className?: string };

/** One trigger for a list whose children settle in their own `--o` order (spec 2026-10-01
 *  §2.3). The server HTML carries `rvg` and hides nothing; globals.css dims the children only
 *  under html.js + no-preference, and only to .55. */
export default function RevealGroup({ children, as: Tag = 'div', className = '' }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  useRevealIn(ref);
  return (
    <Tag ref={ref} className={['rvg', className].filter(Boolean).join(' ')}>
      {children}
    </Tag>
  );
}
```

- [ ] **Step 6: Add the CSS to `src/app/globals.css`.** Put it inside the same `@layer components { @media (prefers-reduced-motion: no-preference) { … } }` block as `html.js .rv`, right after `html.js .rv.in { … }`:

```css
    /* Spec 2026-10-01 §2.3: a RevealGroup's children settle (not rise) in their --o order. */
    html.js .rvg > * {
      opacity: .55;
      transform: scale(.97);
      transition:
        opacity var(--dur-rise) var(--ease-settle),
        transform var(--dur-sheet) var(--ease-settle);
      transition-delay: calc(var(--o, 0) * 75ms);
    }
    html.js .rvg.in > * { opacity: 1; transform: none; }
```

- [ ] **Step 7: Use it in `src/components/StoryDetail.tsx`.**
  - Replace `<ol className="bd-chapters">` … `</ol>` with `<RevealGroup as="ol" className="bd-chapters">` … `</RevealGroup>`.
  - Replace each chapter's `<Reveal key={chapter.id} as="li" className="bd-ch">` … `</Reveal>` with `<li key={chapter.id} className="bd-ch" style={{ ['--o' as string]: String(emphasisRank(chapter.order)) }}>` … `</li>`.
  - Import `RevealGroup` and `emphasisRank`, and drop the `Reveal` import if nothing else in the file uses it.

- [ ] **Step 8: Record it in the White Edition spec.** Append this line to §5.5: `2026-10-01 (Klao 2A/3A, spec 2026-10-01-frame-rhythm): the By day chapters settle once as a group (opacity .55 → 1, scale .97 → 1), in order of importance (orders 2, 4, 1, 3, 5, 6; 75 ms steps, < 500 ms total).`

- [ ] **Step 9: Run the tests to see them pass.** Run `npx vitest run tests/story-emphasis.test.ts tests/reveal.test.tsx tests/by-day.test.tsx tests/globals-css.test.ts tests/component-css-layers.test.ts`. Expected: PASS.

- [ ] **Step 10: Run the full check, then commit.** Run `npm test && npx tsc --noEmit && npm run lint && npm run build`, then:
```bash
git add src/lib/story-emphasis.ts src/components/motion/useRevealIn.ts src/components/motion/RevealGroup.tsx src/components/motion/Reveal.tsx src/components/StoryDetail.tsx src/app/globals.css tests/story-emphasis.test.ts tests/reveal.test.tsx tests/by-day.test.tsx tests/globals-css.test.ts docs/superpowers/specs/2026-09-25-white-edition-design.md
git commit -m "feat(by-day): chapters settle once, deal chapter first"
```
