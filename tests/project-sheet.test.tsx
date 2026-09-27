// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import ProjectSheet from '@/components/ProjectSheet';
import { dict } from '@/lib/dictionary';
import { projectKey, sheetHash } from '@/lib/sheet-url';
import { stubDialog } from './helpers/dialog';
import { installFakeIO } from './helpers/io';
import { makeProject } from './helpers/project';
import { LINEUP } from './helpers/lineup';
import { stubViewTransition } from './helpers/view-transition';

let showModal: MockInstance<HTMLDialogElement['showModal']>;
let close: MockInstance<HTMLDialogElement['close']>;

// Fix round 1 (Minor: "stub reuse" / "shared helper"): the motion-allowed matchMedia stub every
// View Transition test below needs (the default, set in beforeEach, always reports reduced
// motion) -- factored out once instead of pasted at each call site.
const allowMotion = () => vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('no-preference'), addEventListener() {}, removeEventListener() {} }));

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  installFakeIO(); // D-3: P1's shared FakeIO, not a third re-inlined IntersectionObserver stub
  // D-3: jsdom's <dialog> has no showModal()/close() -- P1's stand-ins (not a third
  // re-inlined copy), wrapped in spies so tests can also assert call counts.
  stubDialog();
  showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
  close = vi.spyOn(HTMLDialogElement.prototype, 'close');
  window.history.replaceState(null, '', '/en');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.classList.remove('sheet-open');
  // A07: never leaves a fake startViewTransition behind for the next test.
  delete (document as Partial<Document>).startViewTransition;
});

// Rows stand in for the index (Task 11) so the sheet is tested on its own.
function Page() {
  return (
    <>
      <ul>
        {LINEUP.map((p) => (
          <li key={p.id}>
            <a href={sheetHash(projectKey(p))} data-sheet={projectKey(p)}>
              {p.name}
            </a>
          </li>
        ))}
      </ul>
      <ProjectSheet projects={LINEUP} locale="en" />
    </>
  );
}

// A07: a row that also carries the shared-element thumbnail Task 11 will render for real --
// `[data-vt="shot"]` inside the `a[data-sheet]` link is the contract ProjectSheet reads to find
// the element to name (see the report's Interfaces note for T10/T11).
function PageWithThumbs() {
  return (
    <>
      <ul>
        {LINEUP.map((p) => (
          <li key={p.id}>
            <a href={sheetHash(projectKey(p))} data-sheet={projectKey(p)}>
              <img data-vt="shot" src="/thumb.jpg" alt="" />
              {p.name}
            </a>
          </li>
        ))}
      </ul>
      <ProjectSheet projects={LINEUP} locale="en" />
    </>
  );
}

const dialogOf = (c: HTMLElement) => c.querySelector('dialog.sheet') as HTMLDialogElement;
const row = (name: string) => screen.getByText(name, { selector: 'a' });
const closeButton = () => screen.getByRole('button', { name: dict.en.sheetClose });

// Fix round 1 (Important #4): jsdom never lays anything out, so getBoundingClientRect() is
// zero for every element unless a test says otherwise. Gives the dialog a plausible on-screen
// box so a click's clientX/clientY can be genuinely inside or outside it, the way the fixed
// backdrop check reads them.
function stubSheetRect(dialog: HTMLDialogElement, rect: { left: number; top: number; right: number; bottom: number }) {
  dialog.getBoundingClientRect = () => ({ ...rect, width: rect.right - rect.left, height: rect.bottom - rect.top, x: rect.left, y: rect.top, toJSON() {} }) as DOMRect;
}

describe('ProjectSheet: opening (Review Focus #3)', () => {
  it('a row click pushes #work/<key>, opens the dialog and focuses its heading', () => {
    const push = vi.spyOn(window.history, 'pushState');
    const { container } = render(<Page />);
    fireEvent.click(row('GoNai'));
    const dialog = dialogOf(container);
    expect(push).toHaveBeenCalledWith(null, '', '#work/gonai');
    expect(window.location.hash).toBe('#work/gonai');
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(dialog.open).toBe(true);
    const heading = dialog.querySelector('h2') as HTMLElement;
    expect(heading.textContent).toBe('GoNai');
    expect(document.activeElement).toBe(heading);
  });

  it('leaves modified clicks (new tab, new window) to the browser', () => {
    const push = vi.spyOn(window.history, 'pushState');
    // Stands in for the browser opening a new tab: stops jsdom following the fragment here.
    const stopNavigation = (e: Event) => e.preventDefault();
    window.addEventListener('click', stopNavigation);
    try {
      const { container } = render(<Page />);
      fireEvent.click(row('GoNai'), { metaKey: true });
      expect(push).not.toHaveBeenCalled();
      expect(dialogOf(container).open).toBe(false);
    } finally {
      window.removeEventListener('click', stopNavigation);
    }
  });

  it('opens on load when the URL already carries a known #work/<key>', () => {
    window.history.replaceState(null, '', '/en#work/tripedia');
    const push = vi.spyOn(window.history, 'pushState');
    const { container } = render(<Page />);
    expect(dialogOf(container).open).toBe(true);
    expect(dialogOf(container).querySelector('h2')?.textContent).toBe('Tripedia');
    expect(push).not.toHaveBeenCalled();
  });

  it.each(['#work/', '#work/unknown', '#work/GoNai', '#work/gonai/extra', '#work'])('opens nothing and throws nothing for %s on load', (hash) => {
    window.history.replaceState(null, '', `/en${hash}`);
    let container: HTMLElement | null = null;
    expect(() => {
      container = render(<Page />).container;
    }).not.toThrow();
    expect(showModal).not.toHaveBeenCalled();
    expect(dialogOf(container!).open).toBe(false);
  });

  it.each(['#work/', '#work/unknown', '#work/GoNai'])('ignores a later hashchange to %s', (hash) => {
    const { container } = render(<Page />);
    act(() => {
      window.history.replaceState(null, '', `/en${hash}`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(showModal).not.toHaveBeenCalled();
    expect(dialogOf(container).open).toBe(false);
  });

  it('another island can open a sheet by assigning location.hash', async () => {
    const { container } = render(<Page />);
    act(() => {
      window.location.hash = '#work/klao-site';
    });
    await waitFor(() => expect(dialogOf(container).open).toBe(true));
    expect(dialogOf(container).querySelector('h2')?.textContent).toBe('klao-site');
  });

  it('a hash change to another known project swaps the open sheet', () => {
    const { container } = render(<Page />);
    fireEvent.click(row('Aje'));
    act(() => {
      window.history.pushState(null, '', '/en#work/gonai');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(dialogOf(container).open).toBe(true);
    expect(dialogOf(container).querySelector('h2')?.textContent).toBe('GoNai');
  });

  it('ignores a click on a row whose project has no story slug and a Thai-only name (S-7: empty projectKey)', () => {
    // slugKey('') strips every non-ASCII character, so a Thai-only name with no Slug maps to
    // the empty string -- `#work/` for it -- which parseSheetHash already refuses to parse and
    // which dataset.sheet="" reads back as falsy, so this must open nothing, not crash.
    const thaiOnly = makeProject({ id: 'fx-thai-only', name: 'ไทยล้วน', slug: null });
    expect(projectKey(thaiOnly)).toBe('');
    function ThaiPage() {
      return (
        <>
          <a href={sheetHash(projectKey(thaiOnly))} data-sheet={projectKey(thaiOnly)}>
            {thaiOnly.name}
          </a>
          <ProjectSheet projects={[thaiOnly, ...LINEUP]} locale="en" />
        </>
      );
    }
    const { container } = render(<ThaiPage />);
    expect(() => fireEvent.click(row('ไทยล้วน'))).not.toThrow();
    expect(showModal).not.toHaveBeenCalled();
    expect(dialogOf(container).open).toBe(false);
  });
});

describe('ProjectSheet: closing (Review Focus #3)', () => {
  it('Back after opening closes the sheet and returns focus to the row', async () => {
    const { container } = render(<Page />);
    const link = row('GoNai');
    fireEvent.click(link);
    expect(dialogOf(container).open).toBe(true);
    act(() => {
      window.history.back();
    });
    await waitFor(() => expect(dialogOf(container).open).toBe(false));
    expect(window.location.hash).toBe('');
    expect(document.activeElement).toBe(link);
  });

  it('Esc closes the sheet and clears the hash without adding a history entry', () => {
    const replace = vi.spyOn(window.history, 'replaceState');
    const push = vi.spyOn(window.history, 'pushState');
    const { container } = render(<Page />);
    fireEvent.click(row('Aje'));
    const dialog = dialogOf(container);
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(dialog.open).toBe(false);
    expect(window.location.hash).toBe('');
    expect(replace).toHaveBeenCalledWith(null, '', '/en');
    expect(push).toHaveBeenCalledTimes(1); // only the open
    expect(document.activeElement).toBe(row('Aje'));
  });

  it('the close button closes it the same way', () => {
    const { container } = render(<Page />);
    fireEvent.click(row('Talatify'));
    fireEvent.click(closeButton());
    expect(close).toHaveBeenCalledTimes(1); // D-3: the same spy stubDialog() installs, not a second stub
    expect(dialogOf(container).open).toBe(false);
    expect(window.location.hash).toBe('');
    expect(document.activeElement).toBe(row('Talatify'));
  });

  it('a click genuinely outside the sheet’s own rendered box (the backdrop) closes it', () => {
    const { container } = render(<Page />);
    fireEvent.click(row('Tripedia'));
    const dialog = dialogOf(container);
    stubSheetRect(dialog, { left: 0, top: 0, right: 600, bottom: 600 });
    fireEvent.click(dialog, { clientX: 700, clientY: 700 }); // outside the box
    expect(dialogOf(container).open).toBe(false);
    expect(window.location.hash).toBe('');
  });

  it('a click that lands on the dialog element but inside its own rendered box does not close it (Important #4)', () => {
    // The reviewer found this at 390px: a short sheet on a narrow phone leaves blank space below
    // its content, still visually inside the card. e.target === e.currentTarget alone can't
    // tell that apart from a genuine backdrop click, since both report the dialog as the target
    // (there's no more specific element under the pointer either way).
    const { container } = render(<Page />);
    fireEvent.click(row('Tripedia'));
    const dialog = dialogOf(container);
    stubSheetRect(dialog, { left: 0, top: 0, right: 390, bottom: 800 });
    fireEvent.click(dialog, { clientX: 195, clientY: 700 }); // inside the box, on blank space
    expect(dialog.open).toBe(true);
    fireEvent.click(dialog, { clientX: 195, clientY: 900 }); // below the box -- the real backdrop
    expect(dialog.open).toBe(false);
  });

  it('with motion allowed, waits for the exit animation before closing', () => {
    allowMotion();
    vi.useFakeTimers();
    try {
      const { container } = render(<Page />);
      fireEvent.click(row('Aje'));
      const dialog = dialogOf(container);
      fireEvent.click(closeButton());
      expect(dialog.classList.contains('closing')).toBe(true);
      expect(dialog.open).toBe(true);
      act(() => {
        vi.advanceTimersByTime(280);
      });
      expect(dialog.open).toBe(false);
      expect(dialog.classList.contains('closing')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('ProjectSheet: shared-element View Transition (polish A07)', () => {
  it('opens and closes exactly as before when document.startViewTransition is undefined', () => {
    expect(document.startViewTransition).toBeUndefined(); // jsdom has none -- the real fallback case
    const { container } = render(<PageWithThumbs />);
    const link = row('GoNai');
    const thumb = link.querySelector('img') as HTMLImageElement;
    fireEvent.click(link);
    expect(dialogOf(container).open).toBe(true);
    expect(thumb.style.viewTransitionName).toBe(''); // never touched: nothing to run a transition with
    fireEvent.click(closeButton());
    expect(dialogOf(container).open).toBe(false);
    expect(thumb.style.viewTransitionName).toBe('');
    expect(document.activeElement).toBe(link);
  });

  it('runs a View Transition on open: names the row thumbnail before starting, and names (then clears, only once settled) the sheet media', async () => {
    // Fix round 1 (Important #2): the reviewer deleted `viewTransitionName = 'shot'` and the
    // `finished.finally` clear and still got 28/28, because the old version of this test only
    // ever checked the row thumbnail -- which self-clears synchronously inside runShotTransition
    // regardless of whether either of those lines exist, so it can't witness their removal. This
    // version checks the state a mutation would actually change: the name at the instant
    // startViewTransition is called (onStart, before update() runs), and the sheet media's name
    // (the "after" side, set inside update() and only cleared once `finished` settles -- held
    // open here via controlFinish so "only once settled" is provable, not incidental).
    allowMotion();
    const { container } = render(<PageWithThumbs />);
    const link = row('GoNai');
    const thumb = link.querySelector('img') as HTMLImageElement;
    let nameAtStart: string | null = null;
    const start = stubViewTransition({ onStart: () => (nameAtStart = thumb.style.viewTransitionName), controlFinish: true });
    fireEvent.click(link);
    expect(start).toHaveBeenCalledTimes(1);
    expect(nameAtStart).toBe('shot'); // named before startViewTransition was even called
    const dialog = dialogOf(container);
    expect(dialog.open).toBe(true); // the update ran inside the (stubbed) transition
    const media = dialog.querySelector<HTMLElement>('[data-vt="shot"]')!; // T10's sheet media
    expect(media.style.viewTransitionName).toBe('shot'); // named as the "after" side, post-mutation
    expect(thumb.style.viewTransitionName).toBe(''); // the "before" side clears synchronously either way
    start.resolveFinished();
    await waitFor(() => expect(media.style.viewTransitionName).toBe('')); // ...but the "after" side only once finished settles
  });

  it('closing: names the sheet media before starting, names (then clears, only once settled) the row thumbnail', async () => {
    allowMotion();
    const { container } = render(<PageWithThumbs />);
    const link = row('GoNai');
    const thumb = link.querySelector('img') as HTMLImageElement;
    stubViewTransition(); // the open: plain auto-settling stub, not what this test is about
    fireEvent.click(link);
    await waitFor(() => expect(thumb.style.viewTransitionName).toBe(''));
    const dialog = dialogOf(container);
    // T10's SheetMedia carries its own [data-vt="shot"] (see tests/project-sheet-content.test.tsx
    // for the full content contract) -- hide() now finds it at shotIn(dialog) as the "old" side,
    // so a second call to start reverses the same morph, with no CSS fallback animation.
    const media = dialog.querySelector<HTMLElement>('[data-vt="shot"]')!;
    let nameAtStart: string | null = null;
    const close = stubViewTransition({ onStart: () => (nameAtStart = media.style.viewTransitionName), controlFinish: true });
    fireEvent.click(closeButton());
    expect(close).toHaveBeenCalledTimes(1);
    expect(nameAtStart).toBe('shot'); // named before startViewTransition was even called
    expect(dialog.classList.contains('closing')).toBe(false); // the transition is the exit animation, not the CSS fallback
    expect(dialog.open).toBe(false);
    expect(media.style.viewTransitionName).toBe(''); // the "before" side clears synchronously either way
    expect(thumb.style.viewTransitionName).toBe('shot'); // named as the "after" side, post-mutation
    close.resolveFinished();
    await waitFor(() => expect(thumb.style.viewTransitionName).toBe('')); // ...but only once finished settles
    expect(document.activeElement).toBe(link);
  });

  it('a row with no thumbnail opens with no transition attempt at all', () => {
    allowMotion();
    const start = stubViewTransition();
    render(<Page />); // Page's rows carry no [data-vt="shot"]
    fireEvent.click(row('GoNai'));
    expect(start).not.toHaveBeenCalled();
  });

  it('under reduced motion (the default), a row click never attempts a View Transition', () => {
    // Fix round 1 (Important #2): removing the motionAllowed() gate also gave 28/28, because no
    // test exercised a thumbnailed row under the *default* (reduced-motion) matchMedia stub --
    // every other test in this block opts into allowMotion() first. beforeEach's default is
    // reduced motion, unmodified here on purpose.
    const start = stubViewTransition();
    const { container } = render(<PageWithThumbs />);
    fireEvent.click(row('GoNai'));
    expect(start).not.toHaveBeenCalled();
    expect(dialogOf(container).open).toBe(true); // still opens, just with no transition
  });

  it('two sync() calls landing together (Back fires popstate then hashchange) start exactly one View Transition for the close (Important #1)', async () => {
    // A real startViewTransition doesn't hand control back to hide()'s own close/settle until
    // it has captured a snapshot -- at least one microtask away, long enough for the second of
    // the two events Back fires to land while the first's DOM update hasn't run yet, so
    // `dialogRef.current.open` is still true when the second sync() checks it. deferUpdate
    // reproduces that window; the default (synchronous) stub can't -- see its own comment.
    allowMotion();
    stubViewTransition(); // the open: plain, settles immediately, not what this test is about
    const { container } = render(<PageWithThumbs />);
    const link = row('GoNai');
    fireEvent.click(link);
    expect(dialogOf(container).open).toBe(true);
    const closeStart = stubViewTransition({ deferUpdate: true });
    act(() => {
      // The hash Back leaves behind, plus the two events a real Back fires for it (jsdom fires
      // both for a real history.back() too, just asynchronously -- dispatching them directly
      // here pins the exact race instead of depending on that timing).
      window.history.replaceState(null, '', '/en');
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    // Before the fix, the second call found `dialogRef.current.open` still true (the first
    // close's deferred update hadn't landed) and started its own startViewTransition, aborting
    // the first with "AbortError: Transition was skipped".
    expect(closeStart).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(dialogOf(container).open).toBe(false)); // once the deferred update lands
    expect(document.activeElement).toBe(link);
  });

  it('a skipped transition (rejected ready/finished, as a real aborted one is) never surfaces as an unhandled rejection', async () => {
    allowMotion();
    stubViewTransition({ reject: true });
    const { container } = render(<PageWithThumbs />);
    fireEvent.click(row('GoNai'));
    expect(dialogOf(container).open).toBe(true); // update() still ran -- only the animation is "skipped"
    await new Promise((r) => setTimeout(r, 0)); // give the rejection (and runShotTransition's own .catch()) a tick to settle
  });

  it('reopening (via hash) while a close is still pending leaves it open, not undone by the stale close (Minor 1)', async () => {
    allowMotion();
    stubViewTransition(); // the open
    const { container } = render(<PageWithThumbs />);
    fireEvent.click(row('GoNai'));
    const dialog = dialogOf(container);
    expect(dialog.open).toBe(true);
    stubViewTransition({ deferUpdate: true }); // the close: its update()/settle() hasn't run yet
    fireEvent.click(closeButton()); // starts closing GoNai
    act(() => {
      window.location.hash = '#work/aje'; // a reopen that lands before that deferred update runs
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    // The reopen has no origin element (a hash-driven open never does -- see show()), so it ran
    // its own change() synchronously, unaffected by whatever the still-pending close eventually
    // does: `openKey` never actually became null in between.
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('h2')?.textContent).toBe('Aje');
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0)); // let the stale close's deferred update() run too
    });
    // Without the generation check, that update's settle() would have called finish() and
    // closed the (now Aje) sheet the moment it finally ran.
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('h2')?.textContent).toBe('Aje');
  });
});

describe('ProjectSheet: page and accessibility', () => {
  it('locks page scroll while open and releases it on close', () => {
    render(<Page />);
    fireEvent.click(row('GoNai'));
    expect(document.documentElement.classList.contains('sheet-open')).toBe(true);
    fireEvent.click(closeButton());
    expect(document.documentElement.classList.contains('sheet-open')).toBe(false);
  });

  it('names the dialog by its heading and labels the close button', () => {
    const { container } = render(<Page />);
    fireEvent.click(row('GoNai'));
    const dialog = dialogOf(container);
    expect(dialog.getAttribute('aria-labelledby')).toBe('sheet-name');
    const heading = dialog.querySelector('#sheet-name') as HTMLElement;
    expect(heading.tagName).toBe('H2');
    expect(heading.getAttribute('tabindex')).toBe('-1');
    expect(closeButton()).toBeTruthy();
  });

  it('ships a closed, empty dialog in server HTML', () => {
    const html = renderToStaticMarkup(<ProjectSheet projects={LINEUP} locale="en" />);
    expect(html).toBe('<dialog class="sheet" aria-labelledby="sheet-name"></dialog>');
  });
});

describe('ProjectSheet: CSS rulings C-5 and C-9', () => {
  const css = readFileSync('src/components/project-sheet.css', 'utf8');

  it('C-5: the sheet is --raised/--e4 over a --curtain backdrop (prototype), not --card/--e3/--mist', () => {
    expect(css).toMatch(/\.sheet\s*\{[^}]*background:\s*var\(--raised\)/);
    expect(css).toMatch(/\.sheet\s*\{[^}]*box-shadow:\s*var\(--e4\)/);
    expect(css).toContain('.sheet::backdrop { background: var(--curtain); }');
  });

  it('C-9: the Thai heading is one size step smaller, at specificity (0,3,0)', () => {
    expect(css).toContain('.sheet .sheet-name:lang(th) { font-size: 36px; line-height: 47px; }');
    expect(css).toContain('.sheet .sheet-name:lang(th) { font-size: 28px; line-height: 38px; }');
  });

  it('fix round 1 (Minor: transition timing): the shot group’s morph is timed exactly as lab §07, ungated by reduced motion (motionAllowed() already gates it in JS)', () => {
    expect(css).toContain('::view-transition-group(shot) { animation-duration: 460ms; animation-timing-function: cubic-bezier(.32, .72, 0, 1); }');
    const reducedMotionBlock = css.match(/@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(reducedMotionBlock).not.toContain('view-transition-group'); // the lab doesn't gate it either -- see its own §07
  });
});
