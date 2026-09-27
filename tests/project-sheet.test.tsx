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
import { stubMatchMedia } from './helpers/media';
import { makeProject } from './helpers/project';
import { LINEUP } from './helpers/lineup';
import { stubViewTransition } from './helpers/view-transition';

let showModal: MockInstance<HTMLDialogElement['showModal']>;
let close: MockInstance<HTMLDialogElement['close']>;

// Fix round 1 (Minor: "stub reuse" / "shared helper"): the motion-allowed matchMedia stub every
// View Transition test below needs (the default, set in beforeEach, always reports reduced
// motion) -- factored out once instead of pasted at each call site.
const allowMotion = () => stubMatchMedia((q) => q.includes('no-preference'));

beforeEach(() => {
  stubMatchMedia();
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

// Fix round 2 (Important #1): a project with both a live URL and a story slug, so "Open app"
// and "Read the story" are both present to click -- LINEUP's own GoNai has no story slug.
const STORIED = LINEUP.map((p) => (p.name === 'GoNai' ? { ...p, slug: 'gonai-story' } : p));
function StoriedPage() {
  return (
    <>
      <ul>
        {STORIED.map((p) => (
          <li key={p.id}>
            <a href={sheetHash(projectKey(p))} data-sheet={projectKey(p)}>
              {p.name}
            </a>
          </li>
        ))}
      </ul>
      <ProjectSheet projects={STORIED} locale="en" />
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

  it('a click on an inner control does not close the sheet, even one fired at clientX/clientY 0,0 (Important, fix round 2)', () => {
    // A keyboard Enter/Space on a focused inner control (not the close button) fires `click`
    // with clientX/clientY 0,0 -- exactly the coordinates round 1's rect check alone treats as
    // "outside the sheet", because round 1 REPLACED e.target === e.currentTarget with the rect
    // check instead of adding to it. "Open app" closing the sheet under a keyboard activation
    // was the reviewer's real-Chrome finding.
    const { container } = render(<StoriedPage />);
    fireEvent.click(row('GoNai'));
    const dialog = dialogOf(container);
    // A real sheet is never positioned at the viewport's origin -- pin a rect that doesn't
    // contain (0,0), or the rect check alone (jsdom's unmocked default is an all-zero rect)
    // would coincidentally call this "inside" regardless of whether the target guard exists.
    stubSheetRect(dialog, { left: 100, top: 50, right: 900, bottom: 700 });
    const openApp = dialog.querySelector('a.btn-fill') as HTMLAnchorElement;
    fireEvent.click(openApp, { clientX: 0, clientY: 0, detail: 0 });
    expect(dialog.open).toBe(true);
  });

  it('activating "Read the story" does not call clearSheetHash/replaceState, which would cancel its Next navigation', () => {
    // Next 15.5 turns a history.replaceState mid-navigation into ACTION_RESTORE and drops the
    // pending navigation -- clearSheetHash() must never run for a click on this link at all.
    const replace = vi.spyOn(window.history, 'replaceState');
    const { container } = render(<StoriedPage />);
    fireEvent.click(row('GoNai'));
    replace.mockClear(); // isolate this assertion to the click below, not whatever opening did
    const dialog = dialogOf(container);
    stubSheetRect(dialog, { left: 100, top: 50, right: 900, bottom: 700 }); // see the previous test's own comment
    const readStory = dialog.querySelector('a.sheet-story') as HTMLAnchorElement;
    // next/link has no router context in this isolated test, so jsdom would otherwise attempt
    // (and loudly no-op) a real navigation on click -- irrelevant to what this test checks
    // (whether our own dialog-level click handler, not Next's, ran). Same pattern as "leaves
    // modified clicks... to the browser" above, scoped to just this one click.
    const stopNavigation = (e: Event) => e.preventDefault();
    window.addEventListener('click', stopNavigation, { capture: true });
    try {
      fireEvent.click(readStory, { clientX: 0, clientY: 0, detail: 0 });
    } finally {
      window.removeEventListener('click', stopNavigation, { capture: true });
    }
    expect(replace).not.toHaveBeenCalled();
    expect(dialog.open).toBe(true);
    expect(window.location.hash).toBe('#work/gonai-story');
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
    const link = row('GoNai');
    const thumb = link.querySelector('img') as HTMLImageElement;
    fireEvent.click(link);
    const dialog = dialogOf(container);
    expect(dialog.open).toBe(true);
    // deferUpdate: the close's own update()/settle() hasn't run yet when the reopen below
    // lands. controlFinish too: its own (non-stale, legitimate) finally would otherwise clear
    // whatever gets named moments later in the same microtask flush, masking whether the
    // "applied" gate below ever named anything in the first place.
    const close = stubViewTransition({ deferUpdate: true, controlFinish: true });
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
    // Fix round 2 (Minor): the stale settle() returns false (nothing applied -- the sheet never
    // closed), so runShotTransition's callback never even looked for the "after" side to name.
    // GoNai's own row thumbnail -- the stale close's would-be "after" -- was never touched, even
    // before its own finally (still held open by controlFinish) gets a chance to clear anything.
    expect(thumb.style.viewTransitionName).toBe('');
    close.resolveFinished();
    await waitFor(() => expect(thumb.style.viewTransitionName).toBe(''));
  });

  it('closing during the open morph still gets its reverse morph, not clobbered by the superseded open settling a few microtasks later (Minor 2)', async () => {
    // Real Chrome: the reviewer found the row thumbnail's freshly-set name wiped out by the
    // *open* transition's own finished.finally, which fires shortly after -- for whichever
    // element it captured as ITS "after" (the sheet media) or "before" (the row thumbnail),
    // regardless of what a newer transition has since done with that same element.
    allowMotion();
    const open = stubViewTransition({ controlFinish: true }); // its own update() runs now; finished stays open
    const { container } = render(<PageWithThumbs />);
    const link = row('GoNai');
    const thumb = link.querySelector('img') as HTMLImageElement;
    fireEvent.click(link); // the open's update() runs synchronously; its `finished` is still pending
    const dialog = dialogOf(container);
    expect(dialog.open).toBe(true);
    const media = dialog.querySelector<HTMLElement>('[data-vt="shot"]')!;
    expect(media.style.viewTransitionName).toBe('shot'); // named as the open's "after", not yet cleared
    // Close now, before the open ever settles. Both deferUpdate (reproduces the real window
    // between naming `before` and the browser invoking the close's own update() -- round 1,
    // Important #1's own reasoning) and controlFinish (holds the close's *own* finally open too,
    // so it can't mask the bug by legitimately clearing the same name moments later): without
    // pinning both, the close's own settling arrives so quickly behind its own naming that it's
    // indistinguishable from the stale open's finally getting there first.
    const close = stubViewTransition({ deferUpdate: true, controlFinish: true });
    fireEvent.click(closeButton());
    // The close named `media` as ITS OWN "before" (synchronously, before its deferred update()
    // has even run) -- this is the exact instant real Chrome's race window sits in.
    expect(media.style.viewTransitionName).toBe('shot');
    // The open's `finished` settles now, "later" than the close naming `media` -- exactly the
    // ordering the reviewer described. Without the `latest` token, this stale finally would
    // clear `media` (its own "after") right out from under the close.
    open.resolveFinished();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0)); // flush the close's deferred update() and the open's now-resolved (stale) finally, in that queued order
    });
    expect(dialog.open).toBe(false); // the close's own (deferred) update() did run
    // Named by the close's own update() as ITS "after" -- survived the stale open's finally,
    // which ran right after but (with the fix) recognized it was no longer the latest transition
    // and skipped clearing anything.
    expect(thumb.style.viewTransitionName).toBe('shot');
    // The close's own (non-stale) finally still clears it normally, once it settles for real.
    close.resolveFinished();
    await waitFor(() => expect(thumb.style.viewTransitionName).toBe(''));
  });

  it('closing one row, then opening a different one before that close settles, never leaves two elements named "shot" at once (fix round 3)', () => {
    // The reviewer's exact keyboard scenario: open Aje, Esc (names the Aje row thumb as the
    // close's "after"), then -- within the close's ~460ms morph -- Tab to GoNai's row and Enter.
    // Round 2's latestTransition guard makes a superseded transition skip ALL of its own
    // cleanup once superseded, including a name (here, the Aje thumb's) that the newer
    // (GoNai) transition never touches -- left stuck forever, colliding with every later
    // transition's own naming ("Unexpected duplicate view-transition-name: shot" in real Chrome).
    allowMotion();
    stubViewTransition(); // Aje's open: plain, settles immediately
    const { container } = render(<PageWithThumbs />);
    const ajeLink = row('Aje');
    const ajeThumb = ajeLink.querySelector('img') as HTMLImageElement;
    fireEvent.click(ajeLink);
    const dialog = dialogOf(container);
    expect(dialog.open).toBe(true);
    // Esc's close: held open (controlFinish), so it's still pending -- unsettled -- when the
    // GoNai open below starts, the exact window the reviewer's 460ms morph sits in.
    stubViewTransition({ controlFinish: true });
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(ajeThumb.style.viewTransitionName).toBe('shot'); // named as the close's "after", not yet cleared
    const gonaiLink = row('GoNai');
    let shotNames = -1;
    stubViewTransition({
      onStart: () => {
        // data-vt="shot" is a static attribute marking every candidate, named or not; count how
        // many currently carry the *dynamic* style -- Chrome requires exactly one at a time.
        shotNames = [...document.querySelectorAll<HTMLElement>('[data-vt="shot"]')].filter((el) => el.style.viewTransitionName === 'shot').length;
      },
    });
    fireEvent.click(gonaiLink);
    expect(shotNames).toBe(1); // only GoNai's own thumb -- Aje's stray name was swept before this transition started
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

  it('follow-up round: on phone, the Notion vignette sizes to its content instead of clipping, and its note flows below instead of overlapping', () => {
    // Pins the fix so it can't silently regress: without these two rules the Notion sheet
    // (klao-site) clips its Stack/Status rows and draws .sheet-note on top of whatever row
    // landed at its old fixed `bottom` offset. Both lines are inside the existing 734px content
    // breakpoint (asserted below), scoped to [data-media="notion"] only -- screenshot media
    // ('img'/'win') keeps its fixed 1580x900-ratio box, on every width.
    const notionRule = '.smedia[data-media="notion"] { aspect-ratio: auto; overflow: visible; padding-bottom: 16px; }';
    const noteRule = '.smedia[data-media="notion"] .sheet-note { position: static; width: 100%; margin: 12px 0 0; }';
    expect(css).toContain(notionRule);
    expect(css).toContain(noteRule);
    // Both rules sit after the phone breakpoint that already carries `.sheet-notion-row b` (the
    // content block's own 734px query, not the outer dialog-shell one above it) and before that
    // query's closing brace, i.e. inside it, not floating in a bare (desktop-reaching) rule.
    const phoneContentBlock = css.slice(css.indexOf('.sheet-notion-row b { font-size: 14px; }'), css.lastIndexOf('}'));
    expect(phoneContentBlock).toContain(notionRule);
    expect(phoneContentBlock).toContain(noteRule);
  });
});
