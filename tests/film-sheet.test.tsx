// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import FilmSheet from '@/components/FilmSheet';
import ProjectSheet from '@/components/ProjectSheet';
import { dict } from '@/lib/dictionary';
import { FILM_BEATS, FILM_LABEL, filmCuts } from '@/lib/film';
import type { Locale } from '@/lib/models';
import { PHONE_QUERY } from '@/lib/project-clips';
import { projectKey, sheetHash } from '@/lib/sheet-url';
import { stubDialog } from './helpers/dialog';
import { installFakeIO } from './helpers/io';
import { LINEUP } from './helpers/lineup';
import { liveMatchMedia } from './helpers/media';

// The film sheet (spec 2026-10-01-film-og §4.2). jsdom has no media pipeline and no
// <dialog> methods: play/pause are stubbed on the prototype and stubDialog stands in for
// showModal/close. matchMedia is live and exact: a query matches only when a test lists it.

const MOTION = '(prefers-reduced-motion: no-preference)';
const REDUCE = '(prefers-reduced-motion: reduce)';

let play: MockInstance<HTMLMediaElement['play']>;
let pause: MockInstance<HTMLMediaElement['pause']>;
let hidden = false;

beforeEach(() => {
  liveMatchMedia(); // nothing matches: motion is not allowed unless a test says so
  installFakeIO();
  stubDialog();
  play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
  pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  hidden = false;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  window.history.replaceState(null, '', '/en');
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete (document as { hidden?: boolean }).hidden;
  delete (navigator as { connection?: unknown }).connection;
  document.documentElement.classList.remove('sheet-open');
  window.history.replaceState(null, '', '/en');
});

// The tour pill's Film link stands in for HeroTourStage, so the sheet is tested on its own.
function Page({ locale = 'en' }: { locale?: Locale }) {
  return (
    <>
      <a data-film="" href={filmCuts(locale).wide.mp4} aria-label={dict[locale].filmButtonLabel}>
        {dict[locale].filmButton}
      </a>
      <FilmSheet locale={locale} />
    </>
  );
}

const filmLink = () => document.querySelector('a[data-film]') as HTMLAnchorElement;
const filmDialog = () => document.querySelector('dialog.film-sheet') as HTMLDialogElement;
const video = () => filmDialog().querySelector('video');
const sources = () => Array.from(filmDialog().querySelectorAll('video source')).map((s) => s.getAttribute('src'));
const closeButton = () => screen.getByRole('button', { name: dict.en.sheetClose });
const plain = (s: string | null | undefined) => (s ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ');

describe('FilmSheet: opening', () => {
  it('a click on a[data-film] prevents navigation, pushes #film, opens the dialog and plays once', () => {
    liveMatchMedia({ [MOTION]: true });
    render(<Page />);
    const notPrevented = fireEvent.click(filmLink());
    expect(notPrevented).toBe(false);
    expect(window.location.hash).toBe('#film');
    expect(filmDialog().open).toBe(true);
    expect(play).toHaveBeenCalledTimes(1);
    expect(play.mock.contexts[0]).toBe(video());
  });

  it('under prefers-reduced-motion: reduce, opens on poster and controls only (no play)', () => {
    liveMatchMedia({ [REDUCE]: true });
    render(<Page />);
    fireEvent.click(filmLink());
    expect(filmDialog().open).toBe(true);
    expect(video()).not.toBeNull();
    expect(play).not.toHaveBeenCalled();
  });

  it('with Save-Data on, opens without playing', () => {
    liveMatchMedia({ [MOTION]: true });
    Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } });
    render(<Page />);
    fireEvent.click(filmLink());
    expect(filmDialog().open).toBe(true);
    expect(play).not.toHaveBeenCalled();
  });

  it('a page loaded with #film opens on mount and never plays', () => {
    liveMatchMedia({ [MOTION]: true });
    window.history.replaceState(null, '', '/en#film');
    render(<Page />);
    expect(filmDialog().open).toBe(true);
    expect(video()).not.toBeNull();
    expect(play).not.toHaveBeenCalled();
  });

  it('a hashchange to #film (Forward, a typed URL) opens it without playing', () => {
    liveMatchMedia({ [MOTION]: true });
    render(<Page />);
    act(() => {
      window.history.replaceState(null, '', '/en#film');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(filmDialog().open).toBe(true);
    expect(play).not.toHaveBeenCalled();
  });

  it('ignores a modified or non-primary click: the browser keeps the plain link', () => {
    render(<Page />);
    for (const init of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
      expect(fireEvent.click(filmLink(), init)).toBe(true);
      expect(filmDialog().open).toBe(false);
      expect(window.location.hash).toBe('');
    }
  });

  it('swallows a refused play() and keeps the controls', async () => {
    liveMatchMedia({ [MOTION]: true });
    play.mockImplementation(() => Promise.reject(new DOMException('denied', 'NotAllowedError')));
    render(<Page />);
    fireEvent.click(filmLink());
    await act(async () => {
      await Promise.resolve();
    });
    expect(play).toHaveBeenCalledTimes(1);
    expect(video()!.hasAttribute('controls')).toBe(true);
  });
});

describe('FilmSheet: closing', () => {
  it('a hashchange to "" closes the dialog and pauses', () => {
    render(<Page />);
    fireEvent.click(filmLink());
    expect(filmDialog().open).toBe(true);
    const v = video();
    act(() => {
      window.history.replaceState(null, '', '/en');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(filmDialog().open).toBe(false);
    expect(pause).toHaveBeenCalled();
    expect(pause.mock.contexts).toContain(v);
  });

  it('the close button closes, pauses, clears the hash with replaceState and focuses the opener', () => {
    render(<Page />);
    filmLink().focus();
    fireEvent.click(filmLink());
    const v = video();
    const replace = vi.spyOn(window.history, 'replaceState');
    fireEvent.click(closeButton());
    expect(filmDialog().open).toBe(false);
    expect(pause.mock.contexts).toContain(v);
    expect(replace).toHaveBeenCalledWith(null, '', '/en');
    expect(window.location.hash).toBe('');
    expect(document.activeElement).toBe(filmLink());
  });

  it('Esc (the dialog’s cancel) closes it the same way', () => {
    render(<Page />);
    fireEvent.click(filmLink());
    fireEvent(filmDialog(), new Event('cancel', { cancelable: true }));
    expect(filmDialog().open).toBe(false);
    expect(window.location.hash).toBe('');
    expect(document.activeElement).toBe(filmLink());
  });

  it('a backdrop click closes it; a click inside the sheet does not', () => {
    render(<Page />);
    fireEvent.click(filmLink());
    const d = filmDialog();
    d.getBoundingClientRect = () => ({ left: 200, top: 40, right: 1240, bottom: 860, width: 1040, height: 820, x: 200, y: 40, toJSON() {} }) as DOMRect;
    fireEvent.click(d, { clientX: 600, clientY: 300 });
    expect(d.open).toBe(true);
    fireEvent.click(d, { clientX: 20, clientY: 20 });
    expect(d.open).toBe(false);
  });

  it('Back (popstate) closes it', () => {
    render(<Page />);
    fireEvent.click(filmLink());
    act(() => {
      window.history.replaceState(null, '', '/en');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(filmDialog().open).toBe(false);
  });

  it('waits for the exit animation when motion is allowed, and the video is gone after', () => {
    vi.useFakeTimers();
    liveMatchMedia({ [MOTION]: true });
    render(<Page />);
    fireEvent.click(filmLink());
    fireEvent.click(closeButton());
    expect(filmDialog().classList.contains('closing')).toBe(true);
    expect(pause).toHaveBeenCalled(); // the sound stops at once, not after the animation
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(filmDialog().open).toBe(false);
    expect(video()).toBeNull();
  });

  it('pauses when the tab is hidden', () => {
    liveMatchMedia({ [MOTION]: true });
    render(<Page />);
    fireEvent.click(filmLink());
    pause.mockClear();
    hidden = true;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(pause).toHaveBeenCalledTimes(1);
    expect(filmDialog().open).toBe(true);
  });
});

describe('FilmSheet: content', () => {
  it('on a wide screen: the 16:9 cut, webm then mp4, its poster, controls, no loop, the one-sentence label', () => {
    render(<Page />);
    fireEvent.click(filmLink());
    const v = video()!;
    expect(sources()).toEqual(['/film/film-en.webm', '/film/film-en.mp4']);
    expect(Array.from(v.querySelectorAll('source')).map((s) => s.getAttribute('type'))).toEqual(['video/webm', 'video/mp4']);
    expect(v.getAttribute('poster')).toBe('/images/film-en.jpg');
    expect(v.hasAttribute('controls')).toBe(true);
    expect(v.hasAttribute('playsinline')).toBe(true);
    expect(v.getAttribute('preload')).toBe('none');
    expect(v.hasAttribute('loop')).toBe(false);
    expect(v.getAttribute('aria-label')).toBe(FILM_LABEL.en);
  });

  it('with (max-width: 734px) matching at open: the -1x1 files and the -1x1 poster; a rotation does not swap them', () => {
    const mm = liveMatchMedia({ [PHONE_QUERY]: true });
    render(<Page locale="th" />);
    fireEvent.click(filmLink());
    expect(sources()).toEqual(['/film/film-th-1x1.webm', '/film/film-th-1x1.mp4']);
    expect(video()!.getAttribute('poster')).toBe('/images/film-th-1x1.jpg');
    act(() => mm.set(PHONE_QUERY, false));
    expect(sources()).toEqual(['/film/film-th-1x1.webm', '/film/film-th-1x1.mp4']);
  });

  it('heads the sheet with its title, then the meta line, and labels the dialog by the heading', () => {
    render(<Page />);
    fireEvent.click(filmLink());
    const h2 = filmDialog().querySelector('h2')!;
    expect(h2.textContent).toBe(dict.en.filmTitle);
    expect(filmDialog().getAttribute('aria-labelledby')).toBe(h2.id);
    expect(document.activeElement).toBe(h2);
    expect(filmDialog().textContent).toContain(dict.en.filmMeta);
    // The header row (title + close) sits above the video, so no control covers the film.
    const head = h2.parentElement!;
    expect(head.contains(closeButton())).toBe(true);
    expect(head.compareDocumentPosition(video()!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it.each(['en', 'th'] as const)('%s: the <details> text version lists every beat line, in order', (locale) => {
    render(<Page locale={locale} />);
    fireEvent.click(filmLink());
    const details = filmDialog().querySelector('details')!;
    expect(details).not.toBeNull();
    expect(plain(details.querySelector('summary')!.textContent)).toBe(dict[locale].filmTextVersion);
    const items = Array.from(details.querySelectorAll('li'));
    expect(items).toHaveLength(FILM_BEATS.length);
    FILM_BEATS.forEach((beat, i) => {
      const text = plain(items[i].textContent);
      let from = 0;
      for (const line of beat.lines[locale]) {
        const at = text.indexOf(line, from);
        expect(at, `"${line}" missing from beat ${i}`).toBeGreaterThanOrEqual(0);
        from = at + line.length;
      }
    });
  });

  it('before the first open: no <video>, no film file and no poster anywhere in the page', () => {
    render(<Page />);
    expect(document.querySelector('video')).toBeNull();
    const html = document.documentElement.outerHTML;
    for (const src of ['/images/film-en.jpg', '/images/film-en-1x1.jpg', '/film/film-en.webm', '/film/film-en-1x1.webm', '/film/film-en-1x1.mp4']) {
      expect(html).not.toContain(src);
    }
  });

  it('server HTML is the empty dialog only', () => {
    const html = renderToStaticMarkup(<FilmSheet locale="en" />);
    expect(html).toMatch(/^<dialog [^>]*class="sheet film-sheet"[^>]*><\/dialog>$/);
    expect(html).not.toContain('video');
    expect(html).not.toContain('/images/film');
  });
});

// Ruling 5 (isolation): ProjectSheet closes itself on any hash that is not #work/...; the film
// must never leave a project sheet half-open, and #work/<key> must still work after it.
describe('FilmSheet next to ProjectSheet', () => {
  function Both() {
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
        <Page />
        <ProjectSheet projects={LINEUP} locale="en" />
      </>
    );
  }
  const projectDialog = () => document.querySelector('dialog.sheet:not(.film-sheet)') as HTMLDialogElement;
  const row = (name: string) => screen.getByText(name, { selector: 'a[data-sheet]' });

  it('opening the film leaves the project sheet closed; #work/<key> still opens after the film closed', () => {
    render(<Both />);
    fireEvent.click(filmLink());
    expect(filmDialog().open).toBe(true);
    expect(projectDialog().open).toBe(false);
    expect(document.querySelectorAll('dialog[open]')).toHaveLength(1);
    fireEvent.click(closeButton());
    expect(filmDialog().open).toBe(false);
    fireEvent.click(row('GoNai'));
    expect(window.location.hash).toBe('#work/gonai');
    expect(projectDialog().open).toBe(true);
    expect(filmDialog().open).toBe(false);
    expect(document.querySelectorAll('dialog[open]')).toHaveLength(1);
  });

  it('a hash moving from #film to #work/<key> closes the film and opens the project', () => {
    render(<Both />);
    fireEvent.click(filmLink());
    act(() => {
      window.history.replaceState(null, '', '/en#work/gonai');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(filmDialog().open).toBe(false);
    expect(projectDialog().open).toBe(true);
    expect(window.location.hash).toBe('#work/gonai');
    expect(document.documentElement.classList.contains('sheet-open')).toBe(true);
  });

  it('a project sheet open from a deep link stays open while the film sheet mounts', () => {
    window.history.replaceState(null, '', '/en#work/gonai');
    render(<Both />);
    expect(projectDialog().open).toBe(true);
    expect(filmDialog().open).toBe(false);
  });
});
