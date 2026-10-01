// @vitest-environment jsdom
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import ProjectSheet, { SheetMedia } from '@/components/ProjectSheet';
import SheetClip from '@/components/SheetClip';
import projects from '@/content/fixtures/projects.json';
import { dict } from '@/lib/dictionary';
import type { Locale, Project } from '@/lib/models';
import { PHONE_QUERY, PROJECT_CLIPS, clipFor } from '@/lib/project-clips';
import { projectKey } from '@/lib/sheet-url';
import { stubDialog } from './helpers/dialog';
import { installFakeIO } from './helpers/io';
import { AJE, CAFENISTA, GONAI, LINEUP, makeProject } from './helpers/lineup';
import { liveMatchMedia, stubMatchMedia } from './helpers/media';

// Product clips in the project sheet (spec docs/superpowers/specs/2026-09-30-sheet-clips.md).
// jsdom has no media pipeline: play/pause/load are stubbed on the prototype, and the media
// events a browser would fire (playing, ended) are fired by hand.

let play: MockInstance<HTMLMediaElement['play']>;
let pause: MockInstance<HTMLMediaElement['pause']>;
let load: MockInstance<HTMLMediaElement['load']>;
let hidden = false;

const allowMotion = () => stubMatchMedia((q) => q.includes('no-preference'));
// Exact query strings: 'no-preference' contains the substring 'reduce' in neither direction, but
// 'reduce' is matched by equality anyway so the two queries never get mixed up.
const MOTION_QUERY = '(prefers-reduced-motion: no-preference)';
const phoneAndMotion = () => stubMatchMedia((q) => q === MOTION_QUERY || q === PHONE_QUERY);
const ENTER_MS = 500; // ProjectSheet's own ENTER_MS (the sheet's CSS entrance)
const EXIT_MS = 280; // ProjectSheet's own EXIT_MS (the sheet's CSS exit)

beforeEach(() => {
  stubMatchMedia(); // default: nothing matches, so motion is NOT allowed
  installFakeIO();
  stubDialog();
  play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
  pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
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
  window.history.replaceState(null, '', '/en');
});

// Opens a sheet the way a shared link does (the URL carries the hash on load).
function openAt(key: string, locale: Locale = 'en', list: Project[] = LINEUP) {
  window.history.replaceState(null, '', `/${locale}#work/${key}`);
  const { container, unmount } = render(<ProjectSheet projects={list} locale={locale} />);
  const dialog = container.querySelector('dialog.sheet') as HTMLDialogElement;
  expect(dialog.open).toBe(true);
  return { dialog, unmount };
}

const clip = PROJECT_CLIPS.cafenista;
const settled = () => Promise.resolve();

describe('SheetClip: the still comes first', () => {
  it('server render (= the first client render) is nothing at all, even with motion allowed', () => {
    allowMotion();
    expect(renderToStaticMarkup(<SheetClip clip={clip} locale="en" startAfter={settled} />)).toBe('');
  });

  it('under reduced motion: no video element, the screenshot stays', () => {
    const { dialog } = openAt('cafenista');
    expect(dialog.querySelector('video')).toBeNull();
    expect(dialog.querySelector('.sheet-win img')?.getAttribute('src')).toBe('/images/cafenista.jpg');
    expect(play).not.toHaveBeenCalled();
  });

  it('with Save-Data on: no video element either', () => {
    allowMotion();
    Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } });
    const { dialog } = openAt('cafenista');
    expect(dialog.querySelector('video')).toBeNull();
    expect(play).not.toHaveBeenCalled();
  });

  it('leaves a project without a clip exactly as it was', () => {
    // Every screenshot row in the lineup has a clip since 30 Sep (Aje, GoNai, Cafénista), so a
    // seventh, clip-less screenshot row stands in for "a project added later without one".
    const PLAIN = makeProject({ id: 'fx-plain', name: 'Plainview', order: 7, imageSrc: '/images/klao-site.jpg' });
    const list = [...LINEUP, PLAIN];
    expect(clipFor(PLAIN)).toBeNull();
    const plain = openAt('plainview', 'en', list).dialog.querySelector('.smedia')!.outerHTML;
    cleanup();
    allowMotion();
    const moving = openAt('plainview', 'en', list).dialog.querySelector('.smedia')!;
    expect(moving.outerHTML).toBe(plain);
    expect(moving.querySelector('video')).toBeNull();
  });
});

describe('SheetClip: motion allowed', () => {
  beforeEach(allowMotion);

  it('adds a muted inline video over the screenshot: webm first, then mp4, and no loop/controls/autoplay', () => {
    const { dialog } = openAt('cafenista');
    const win = dialog.querySelector('.sheet-win')!;
    const video = win.querySelector('video')!;
    expect(video).toBeTruthy();
    // Inside the same window, right after the <picture> whose <img> stays the poster and the still.
    expect(video.previousElementSibling?.tagName).toBe('PICTURE');
    expect(video.previousElementSibling?.querySelector('img')).toBeTruthy();
    expect(win.querySelector('img')?.getAttribute('alt')).toBe(CAFENISTA.alt!.en);
    expect(video.className).toBe('sheet-clip');
    expect(video.muted).toBe(true);
    expect(video.hasAttribute('playsinline')).toBe(true);
    expect(video.getAttribute('preload')).toBe('none');
    expect(video.hasAttribute('disablepictureinpicture')).toBe(true);
    for (const attr of ['loop', 'controls', 'autoplay']) expect(video.hasAttribute(attr), attr).toBe(false);
    const sources = Array.from(video.querySelectorAll('source')).map((s) => [s.getAttribute('src'), s.getAttribute('type')]);
    expect(sources).toEqual([
      ['/clips/cafenista.webm', 'video/webm'],
      ['/clips/cafenista.mp4', 'video/mp4'],
    ]);
    expect(video.getAttribute('aria-label')).toBe(clip.label.en);
    // Invisible until it is actually playing (the CSS keys opacity off this attribute).
    expect(video.hasAttribute('data-playing')).toBe(false);
  });

  it("GoNai ('win'): the clip sits in the window below the address bar, right after the <img>", () => {
    const { dialog } = openAt('gonai');
    const win = dialog.querySelector('[data-media="win"] .sheet-win')!;
    expect(Array.from(win.children).map((el) => el.tagName)).toEqual(['DIV', 'PICTURE', 'VIDEO']);
    expect(win.firstElementChild?.className).toBe('sheet-bar');
    expect(win.querySelector('video')?.className).toBe('sheet-clip');
    expect(Array.from(win.querySelectorAll('video source')).map((el) => el.getAttribute('src'))).toEqual(['/clips/gonai.webm', '/clips/gonai.mp4']);
  });

  it('labels the video in Thai on /th', () => {
    const { dialog } = openAt('cafenista', 'th');
    expect(dialog.querySelector('video')?.getAttribute('aria-label')).toBe(clip.label.th);
  });

  it("starts only once the sheet's open animation has finished, then shows itself on `playing`", async () => {
    vi.useFakeTimers();
    const { dialog } = openAt('cafenista');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ENTER_MS - 1);
    });
    expect(play).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(play).toHaveBeenCalledTimes(1);
    const video = dialog.querySelector('video')!;
    fireEvent.playing(video);
    expect(video.hasAttribute('data-playing')).toBe(true);
  });

  it('shows Replay when it ends; Replay rewinds to 0 and plays again', async () => {
    vi.useFakeTimers();
    const { dialog } = openAt('cafenista');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ENTER_MS);
    });
    const video = dialog.querySelector('video')!;
    fireEvent.playing(video);
    expect(screen.queryByRole('button', { name: dict.en.sheetClipReplay })).toBeNull();
    video.currentTime = 5;
    fireEvent.ended(video);
    const replay = screen.getByRole('button', { name: dict.en.sheetClipReplay });
    expect(replay.tagName).toBe('BUTTON');
    expect(replay.getAttribute('type')).toBe('button');
    expect(replay.className).toContain('btn');
    // Holds the last frame: still visible, not reset.
    expect(video.hasAttribute('data-playing')).toBe(true);
    play.mockClear();
    fireEvent.click(replay);
    expect(video.currentTime).toBe(0);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('says Replay in Thai on /th', async () => {
    const { dialog } = openAt('cafenista', 'th');
    fireEvent.ended(dialog.querySelector('video')!);
    expect(screen.getByRole('button', { name: dict.th.sheetClipReplay })).toBeTruthy();
  });

  it('pauses in a hidden tab and resumes when the tab is visible again', async () => {
    vi.useFakeTimers();
    openAt('cafenista');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ENTER_MS);
    });
    expect(play).toHaveBeenCalledTimes(1);
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(pause).toHaveBeenCalledTimes(1);
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(play).toHaveBeenCalledTimes(2);
  });

  it('does not resume a clip that has already ended', async () => {
    vi.useFakeTimers();
    const { dialog } = openAt('cafenista');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ENTER_MS);
    });
    fireEvent.ended(dialog.querySelector('video')!);
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('pauses and releases the video when the sheet closes', async () => {
    vi.useFakeTimers();
    const { dialog } = openAt('cafenista');
    expect(dialog.querySelector('video')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: dict.en.sheetClose }));
    // With motion allowed the sheet plays its 280 ms exit (EXIT_MS) before it unmounts its body.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(EXIT_MS);
    });
    expect(dialog.open).toBe(false);
    expect(dialog.querySelector('video')).toBeNull();
    expect(pause).toHaveBeenCalled();
    expect(load).toHaveBeenCalled();
  });

  it('pauses on unmount, and never plays after it', async () => {
    vi.useFakeTimers();
    const { unmount } = openAt('cafenista');
    unmount();
    expect(pause).toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ENTER_MS);
    });
    expect(play).not.toHaveBeenCalled();
  });
});

describe('SheetClip: the square cut on phones', () => {
  const sources = (dialog: HTMLElement) => Array.from(dialog.querySelectorAll('video source')).map((el) => el.getAttribute('src'));

  it('plays the square files when the phone query matches', () => {
    phoneAndMotion();
    expect(PHONE_QUERY).toBe('(max-width: 734px)');
    expect(sources(openAt('cafenista').dialog)).toEqual(['/clips/cafenista-1x1.webm', '/clips/cafenista-1x1.mp4']);
    cleanup();
    expect(sources(openAt('gonai').dialog)).toEqual(['/clips/gonai-1x1.webm', '/clips/gonai-1x1.mp4']);
  });

  it('plays the 16:9 files when the phone query does not match', () => {
    allowMotion();
    expect(sources(openAt('cafenista').dialog)).toEqual(['/clips/cafenista.webm', '/clips/cafenista.mp4']);
  });

  it('labels the video with the square label on a phone, the clip label otherwise', () => {
    const labelled = { ...clip, square: { ...clip.square!, label: { en: 'Square story', th: 'เรื่องสี่เหลี่ยม' } } };
    const label = (c: typeof clip, locale: 'en' | 'th') => {
      const { container } = render(<SheetClip clip={c} locale={locale} startAfter={settled} />);
      const l = container.querySelector('video')?.getAttribute('aria-label');
      cleanup();
      return l;
    };
    phoneAndMotion();
    expect(label(labelled, 'en')).toBe('Square story');
    expect(label(labelled, 'th')).toBe('เรื่องสี่เหลี่ยม');
    const plain = { ...clip, square: { ...clip.square!, label: undefined } };
    expect(label(plain, 'en')).toBe(clip.label.en);
    allowMotion();
    expect(label(labelled, 'en')).toBe(clip.label.en);
  });

  it('plays the 16:9 files on a phone when the clip has no square cut', () => {
    phoneAndMotion();
    const flat = { ...clip, square: undefined };
    const { container } = render(<SheetClip clip={flat} locale="en" startAfter={settled} />);
    expect(Array.from(container.querySelectorAll('source')).map((el) => el.getAttribute('src'))).toEqual(['/clips/cafenista.webm', '/clips/cafenista.mp4']);
  });
});

// Final review (B): the cut was read once at mount, so turning a phone mid-clip kept the wrong
// cut, and landscape -> portrait cut Thai text mid-word. A 'change' listener on the phone query
// now re-picks the files: the same <video> loads the other cut, hides until it plays (the
// <picture> already shows that cut's poster), and plays from the top only if it was playing.
describe('SheetClip: a rotation across the phone breakpoint switches cuts', () => {
  const sources = (root: ParentNode) => Array.from(root.querySelectorAll('video source')).map((el) => el.getAttribute('src'));
  const WIDE = ['/clips/cafenista.webm', '/clips/cafenista.mp4'];
  const SQUARE = ['/clips/cafenista-1x1.webm', '/clips/cafenista-1x1.mp4'];

  // The sheet open on cafenista, past its entrance, its clip playing.
  async function playing(phone: boolean) {
    vi.useFakeTimers();
    const media = liveMatchMedia({ [MOTION_QUERY]: true, [PHONE_QUERY]: phone });
    const { dialog } = openAt('cafenista');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ENTER_MS);
    });
    const video = dialog.querySelector('video')!;
    fireEvent.playing(video);
    expect(play).toHaveBeenCalledTimes(1);
    return { media, dialog, video };
  }

  it('landscape -> portrait mid-play: the same video loads the square files, hides, and plays them from the top', async () => {
    const { media, dialog, video } = await playing(false);
    expect(sources(dialog)).toEqual(WIDE);
    load.mockClear();
    act(() => media.set(PHONE_QUERY, true));
    expect(dialog.querySelector('video')).toBe(video);
    expect(sources(dialog)).toEqual(SQUARE);
    expect(load).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledTimes(2);
    // load() first, so play() starts the new sources, not the old ones.
    expect(load.mock.invocationCallOrder[0]).toBeLessThan(play.mock.invocationCallOrder[1]);
    // Hidden until the new cut actually plays: the poster under it is already the new cut's.
    expect(video.hasAttribute('data-playing')).toBe(false);
    fireEvent.playing(video);
    expect(video.hasAttribute('data-playing')).toBe(true);
  });

  it('portrait -> landscape mid-play: back to the 16:9 files, playing', async () => {
    const { media, dialog, video } = await playing(true);
    expect(sources(dialog)).toEqual(SQUARE);
    act(() => media.set(PHONE_QUERY, false));
    expect(sources(dialog)).toEqual(WIDE);
    expect(load).toHaveBeenCalled();
    expect(play).toHaveBeenCalledTimes(2);
    expect(video.hasAttribute('data-playing')).toBe(false);
  });

  it('after the clip ended: switches the files without playing them, and Replay stays to play the new cut', async () => {
    const { media, dialog, video } = await playing(false);
    fireEvent.ended(video);
    load.mockClear();
    play.mockClear();
    act(() => media.set(PHONE_QUERY, true));
    expect(sources(dialog)).toEqual(SQUARE);
    expect(load).toHaveBeenCalledTimes(1);
    expect(play).not.toHaveBeenCalled();
    expect(video.hasAttribute('data-playing')).toBe(false); // the new cut's poster (frame 0) shows
    fireEvent.click(screen.getByRole('button', { name: dict.en.sheetClipReplay }));
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('before the sheet has settled: switches the files, and the first play is the new cut', async () => {
    vi.useFakeTimers();
    const media = liveMatchMedia({ [MOTION_QUERY]: true, [PHONE_QUERY]: false });
    const { dialog } = openAt('cafenista');
    act(() => media.set(PHONE_QUERY, true));
    expect(sources(dialog)).toEqual(SQUARE);
    expect(play).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ENTER_MS);
    });
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('a clip with no square cut: nothing listens, and a flip changes nothing', async () => {
    const media = liveMatchMedia({ [MOTION_QUERY]: true, [PHONE_QUERY]: false });
    const flat = { ...clip, square: undefined };
    const { container } = render(<SheetClip clip={flat} locale="en" startAfter={settled} />);
    await act(async () => {});
    expect(play).toHaveBeenCalledTimes(1);
    expect(media.listeners(PHONE_QUERY)).toBe(0);
    load.mockClear();
    act(() => media.set(PHONE_QUERY, true));
    expect(sources(container)).toEqual(WIDE);
    expect(load).not.toHaveBeenCalled();
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('listens only while mounted', () => {
    const media = liveMatchMedia({ [MOTION_QUERY]: true, [PHONE_QUERY]: false });
    const { unmount } = render(<SheetClip clip={clip} locale="en" startAfter={settled} />);
    expect(media.listeners(PHONE_QUERY)).toBe(1);
    unmount();
    expect(media.listeners(PHONE_QUERY)).toBe(0);
  });
});

describe('SheetMedia: the square poster', () => {
  const media = (p: Project) => {
    const host = document.createElement('div');
    host.innerHTML = renderToStaticMarkup(<SheetMedia project={p} locale="en" />);
    return host;
  };

  it('wraps the screenshot in a <picture> with a phone-only square source, and marks .smedia', () => {
    const host = media(CAFENISTA);
    const smedia = host.querySelector('.smedia')!;
    expect(smedia.hasAttribute('data-square')).toBe(true);
    const source = host.querySelector('picture > source')!;
    expect(source.getAttribute('media')).toBe('(max-width: 734px)');
    expect(source.getAttribute('srcset')).toBe('/images/cafenista-1x1.jpg');
    expect(source.getAttribute('width')).toBe('1080');
    expect(source.getAttribute('height')).toBe('1080');
    const img = host.querySelector('picture > img')!;
    expect(img.getAttribute('width')).toBe('1580');
    expect(img.getAttribute('height')).toBe('900');
    expect(img.getAttribute('src')).toBe('/images/cafenista.jpg');
  });

  it('a clip-less screenshot has no <picture> and no data-square', () => {
    const host = media(makeProject({ id: 'fx-plain', name: 'Plainview', order: 7, imageSrc: '/images/klao-site.jpg' }));
    expect(host.querySelector('picture')).toBeNull();
    expect(host.querySelector('[data-square]')).toBeNull();
  });

  it('a clip without a square cut has no <picture> and no data-square', () => {
    const plain = makeProject({ id: 'fx-flat', name: 'Flat', order: 7, imageSrc: '/images/klao-site.jpg' });
    const flat = { ...clip, square: undefined };
    (PROJECT_CLIPS as Record<string, unknown>).flat = flat;
    try {
      const host = media(plain);
      expect(host.querySelector('video, .sheet-clip')).toBeNull(); // SSR renders no video
      expect(host.querySelector('picture')).toBeNull();
      expect(host.querySelector('[data-square]')).toBeNull();
    } finally {
      delete (PROJECT_CLIPS as Record<string, unknown>).flat;
    }
  });
});

// Final review (C): on a phone the <img> shows the square poster, so it needs the square
// poster's alt. The server HTML keeps the 16:9 alt (hydration-safe); after mount the phone
// query swaps it, with or without motion, and a rotation swaps it back.
describe('SheetMedia: the phone poster has its own alt', () => {
  const img = (root: ParentNode) => root.querySelector('.sheet-win img')!;

  it('the server HTML keeps the 16:9 alt, even on a phone', () => {
    liveMatchMedia({ [PHONE_QUERY]: true });
    const host = document.createElement('div');
    host.innerHTML = renderToStaticMarkup(<SheetMedia project={CAFENISTA} locale="en" />);
    expect(img(host).getAttribute('alt')).toBe(CAFENISTA.alt!.en);
  });

  it('after mount on a phone the <img> takes the square alt (no motion needed), and follows a rotation both ways', () => {
    const media = liveMatchMedia({ [PHONE_QUERY]: true });
    const { container, unmount } = render(<SheetMedia project={CAFENISTA} locale="en" />);
    const square = PROJECT_CLIPS.cafenista.square!.alt!;
    expect(img(container).getAttribute('alt')).toBe(square.en);
    act(() => media.set(PHONE_QUERY, false));
    expect(img(container).getAttribute('alt')).toBe(CAFENISTA.alt!.en);
    act(() => media.set(PHONE_QUERY, true));
    expect(img(container).getAttribute('alt')).toBe(square.en);
    unmount();
    expect(media.listeners(PHONE_QUERY)).toBe(0);
  });

  it.each([AJE, GONAI, CAFENISTA])('$name on a phone: the square alt in each language', (project) => {
    liveMatchMedia({ [PHONE_QUERY]: true });
    const square = clipFor(project)!.square!.alt!;
    for (const locale of ['en', 'th'] as const) {
      const { container } = render(<SheetMedia project={project} locale={locale} />);
      expect(img(container).getAttribute('alt'), locale).toBe(square[locale]);
      cleanup();
    }
  });

  it('a desktop viewport keeps the 16:9 alt', () => {
    liveMatchMedia({ [PHONE_QUERY]: false });
    const { container } = render(<SheetMedia project={CAFENISTA} locale="en" />);
    expect(img(container).getAttribute('alt')).toBe(CAFENISTA.alt!.en);
  });

  it('a square cut without its own alt keeps the 16:9 alt on a phone, and does not listen', () => {
    const media = liveMatchMedia({ [PHONE_QUERY]: true });
    const plain = makeProject({ id: 'fx-noalt', name: 'Noalt', order: 7, imageSrc: '/images/klao-site.jpg', alt: { en: 'Wide alt', th: 'ภาพกว้าง' } });
    (PROJECT_CLIPS as Record<string, unknown>).noalt = { ...clip, square: { ...clip.square!, alt: undefined } };
    try {
      const { container } = render(<SheetMedia project={plain} locale="en" />);
      expect(img(container).getAttribute('alt')).toBe('Wide alt');
      expect(media.listeners(PHONE_QUERY)).toBe(0);
    } finally {
      delete (PROJECT_CLIPS as Record<string, unknown>).noalt;
    }
  });
});

describe('the clip registry (src/lib/project-clips.ts)', () => {
  const entries = Object.entries(PROJECT_CLIPS);
  const keys = new Set((projects as Project[]).map((p) => projectKey(p)));

  it('keys every clip to a real project', () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const [key] of entries) expect(keys, key).toContain(key);
  });

  it('gives every screenshot row in the bundled lineup a clip (Aje, GoNai, Cafénista)', () => {
    expect(Object.keys(PROJECT_CLIPS).sort()).toEqual(['aje', 'cafenista', 'gonai']);
    const shots = (projects as Project[]).filter((p) => p.media === 'img' || p.media === 'win');
    expect(shots.map((p) => projectKey(p)).sort()).toEqual(['aje', 'cafenista', 'gonai']);
    for (const p of shots) expect(clipFor(p), p.name).not.toBeNull();
  });

  it.each(entries)('%s: both files exist in public/, each at most 700 KB', (_key, c) => {
    for (const src of [c.webm, c.mp4]) {
      const size = statSync(join('public', src)).size;
      expect(size, `${src} is ${size} bytes`).toBeLessThanOrEqual(700 * 1024);
    }
    expect(c.webm).toMatch(/^\/clips\/.+\.webm$/);
    expect(c.mp4).toMatch(/^\/clips\/.+\.mp4$/);
  });

  // `square` is optional (a clip may have no phone cut), so only the entries that have one are
  // checked here; today all three do.
  const squares = entries.flatMap(([key, c]) => (c.square ? [[key, c.square] as const] : []));

  it('all three of today\'s clips have a square cut', () => {
    expect(squares.map(([key]) => key).sort()).toEqual(['aje', 'cafenista', 'gonai']);
  });

  it.each(squares)('%s: the square cut and its poster exist in public/ (clips at most 700 KB, poster at most 250 KB)', (key, sq) => {
    expect(sq, key).toMatchObject({ webm: `/clips/${key}-1x1.webm`, mp4: `/clips/${key}-1x1.mp4`, poster: `/images/${key}-1x1.jpg` });
    for (const src of [sq.webm, sq.mp4]) {
      const size = statSync(join('public', src)).size;
      expect(size, `${src} is ${size} bytes`).toBeLessThanOrEqual(700 * 1024);
    }
    const poster = statSync(join('public', sq.poster)).size;
    expect(poster, `poster is ${poster} bytes`).toBeLessThanOrEqual(250 * 1024);
  });

  it.each(squares)('%s: the square cut has its own label and poster alt, in both languages', (key, sq) => {
    for (const text of [sq.label?.en, sq.label?.th, sq.alt?.en, sq.alt?.th]) expect(text, key).toBeTruthy();
  });

  // The site sets ’ and “ ” (dictionary.ts); a straight ' or " reads as a typo to a screen reader user
  // who sees the page too, and breaks the house style.
  it.each(entries)('%s: labels and alts use curly quotes, never straight ones', (key, c) => {
    const texts = [c.label, c.square?.label, c.square?.alt].flatMap((l) => (l ? [l.en, l.th] : []));
    for (const text of texts) expect(text, key).not.toMatch(/['"]/);
  });

  it('GoNai\'s square label names the plan, not the device', () => {
    const sq = PROJECT_CLIPS.gonai.square!.label!;
    expect(sq.en).toContain('a GoNai plan:');
    expect(sq.en).not.toContain('on a phone');
    expect(sq.th).toContain('แผน GoNai ');
    expect(sq.th).not.toContain('บนมือถือ');
  });

  it.each(entries)('%s: at most 5 s, labelled in both languages, no "|" marks', (_key, c) => {
    expect(c.durationMs).toBeGreaterThan(0);
    expect(c.durationMs).toBeLessThanOrEqual(5000);
    expect(c.label.en.length).toBeGreaterThan(20);
    expect(c.label.th.length).toBeGreaterThan(20);
    expect(c.label.en + c.label.th).not.toContain('|');
  });

  it('finds a clip by the sheet key, or by the name when a Slug was added later', () => {
    expect(clipFor(CAFENISTA)).toBe(clip);
    expect(clipFor({ ...CAFENISTA, slug: 'cafenista-story' })).toBe(clip);
    expect(clipFor(makeProject({ id: 'x', name: 'constructor' }))).toBeNull();
  });
});

describe('project-sheet.css: the clip', () => {
  const css = readFileSync('src/components/project-sheet.css', 'utf8');

  it('dims the video in dark mode exactly like the screenshot', () => {
    expect(css).toMatch(/\.sheet-clip \{[^}]*filter: var\(--shot-dim\);/);
  });

  // Seen in Chrome at 1440 and 390: GoNai's 'win' window runs past .smedia's bottom edge (its
  // address bar pushes it down), so a Replay pinned 12px above the window's own bottom was cut
  // off by .smedia's clip. It now sits 12px above whichever edge is higher.
  it("keeps Replay 12px above the visible edge, even where .smedia clips the window's bottom", () => {
    expect(css).toContain('.smedia:is([data-media="img"], [data-media="win"]) { container-type: inline-size; }');
    expect(css).toMatch(/\.sheet-win \.sheet-replay \{[^}]*bottom: calc\(12px \+ max\(0px, 100% - 50\.25cqw\)\);/);
    // 50.25cqw = .smedia's 16:9 height (56.25cqw) less the window's 6% margin-top.
    expect(css).toMatch(/\.smedia \{[^}]*aspect-ratio: 16 \/ 9;/);
    expect(css).toMatch(/\.sheet-win \{[^}]*margin-top: 6%;/);
  });

  it('keeps the video invisible until playing, and fades only opacity, only with motion allowed', () => {
    expect(css).toMatch(/\.sheet-clip \{[^}]*opacity: 0;/);
    expect(css).toContain('.sheet-clip[data-playing] { opacity: 1; }');
    expect(css).toMatch(/@media \(prefers-reduced-motion: no-preference\) \{\s*\.sheet-clip \{ transition: opacity 320ms var\(--ease-glide\); \}/);
    expect(css).toMatch(/@keyframes sheet-clip-in \{\s*from \{ opacity: 0; \}\s*\}/);
  });

  it('on a phone the square cut is one 1 / 1 box for the clip (and the poster)', () => {
    const phone = css.slice(css.indexOf('/* Square cut'));
    expect(phone).toMatch(/@media \(max-width: 734px\) \{[\s\S]*\.smedia\[data-square\] \.sheet-clip \{[^}]*aspect-ratio: 1 \/ 1;/);
  });

  // The phone block itself (from its @media line to its closing brace), so a rule that drifts
  // out of it fails here.
  const phoneBlock = () => {
    const from = css.indexOf('@media (max-width: 734px)', css.indexOf('/* Square cut'));
    return css.slice(from, css.indexOf('\n  }', from));
  };

  it('on a phone the square poster reserves its 1 / 1 box before it loads (no layout jump)', () => {
    expect(phoneBlock()).toMatch(/\.smedia\[data-square\] \.sheet-win img \{[^}]*aspect-ratio: 1 \/ 1;/);
  });

  it('on a phone Replay sits a plain 12px from the square picture\'s corner', () => {
    expect(phoneBlock()).toMatch(/\.smedia\[data-square\] \.sheet-win \.sheet-replay \{[^}]*bottom: 12px;/);
  });
});
