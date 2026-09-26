// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import ProjectSheet from '@/components/ProjectSheet';
import { dict } from '@/lib/dictionary';
import { projectKey, sheetHash } from '@/lib/sheet-url';
import { stubDialog } from './helpers/dialog';
import { makeProject } from './helpers/project';
import { LINEUP } from './helpers/lineup';
import { stubViewTransition } from './helpers/view-transition';

let showModal: MockInstance<HTMLDialogElement['showModal']>;
let close: MockInstance<HTMLDialogElement['close']>;

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
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

  it('a click on the backdrop (the dialog itself) closes it', () => {
    const { container } = render(<Page />);
    fireEvent.click(row('Tripedia'));
    fireEvent.click(dialogOf(container));
    expect(dialogOf(container).open).toBe(false);
    expect(window.location.hash).toBe('');
  });

  it('with motion allowed, waits for the exit animation before closing', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('no-preference'), addEventListener() {}, removeEventListener() {} }));
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

  it('runs a View Transition on open and clears the row thumbnail’s name once it settles', async () => {
    // Like the plain exit-animation test above: the default beforeEach matchMedia stub always
    // reports reduced motion, so the transition path needs the same explicit opt-in.
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('no-preference'), addEventListener() {}, removeEventListener() {} }));
    const start = stubViewTransition();
    const { container } = render(<PageWithThumbs />);
    const link = row('GoNai');
    const thumb = link.querySelector('img') as HTMLImageElement;
    fireEvent.click(link);
    expect(start).toHaveBeenCalledTimes(1);
    expect(dialogOf(container).open).toBe(true); // the update ran inside the (stubbed) transition
    await waitFor(() => expect(thumb.style.viewTransitionName).toBe(''));
  });

  it('closing reverses into the sheet’s own [data-vt="shot"] media, now that T10 renders one', async () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('no-preference'), addEventListener() {}, removeEventListener() {} }));
    const start = stubViewTransition();
    const { container } = render(<PageWithThumbs />);
    const link = row('GoNai');
    const thumb = link.querySelector('img') as HTMLImageElement;
    fireEvent.click(link);
    await waitFor(() => expect(thumb.style.viewTransitionName).toBe(''));
    const dialog = dialogOf(container);
    // T10's SheetMedia carries its own [data-vt="shot"] (see tests/project-sheet-content.test.tsx
    // for the full content contract) -- hide() now finds it at shotIn(dialog) as the "old" side,
    // so a second call to start reverses the same morph, with no CSS fallback animation.
    const media = dialog.querySelector<HTMLElement>('[data-vt="shot"]')!;
    fireEvent.click(closeButton());
    expect(start).toHaveBeenCalledTimes(2);
    expect(dialog.classList.contains('closing')).toBe(false);
    expect(dialog.open).toBe(false);
    expect(media.style.viewTransitionName).toBe(''); // cleared as soon as the transition's callback ran
    await waitFor(() => expect(thumb.style.viewTransitionName).toBe('')); // cleared once it settles
    expect(document.activeElement).toBe(link);
  });

  it('a row with no thumbnail opens with no transition attempt at all', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('no-preference'), addEventListener() {}, removeEventListener() {} }));
    const start = stubViewTransition();
    render(<Page />); // Page's rows carry no [data-vt="shot"]
    fireEvent.click(row('GoNai'));
    expect(start).not.toHaveBeenCalled();
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
});
