// @vitest-environment jsdom
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import ProjectSheet from '@/components/ProjectSheet';
import SheetClip from '@/components/SheetClip';
import projects from '@/content/fixtures/projects.json';
import { dict } from '@/lib/dictionary';
import type { Locale, Project } from '@/lib/models';
import { PROJECT_CLIPS, clipFor } from '@/lib/project-clips';
import { projectKey } from '@/lib/sheet-url';
import { stubDialog } from './helpers/dialog';
import { installFakeIO } from './helpers/io';
import { CAFENISTA, LINEUP, makeProject } from './helpers/lineup';
import { stubMatchMedia } from './helpers/media';

// Product clips in the project sheet (spec docs/superpowers/specs/2026-09-30-sheet-clips.md).
// jsdom has no media pipeline: play/pause/load are stubbed on the prototype, and the media
// events a browser would fire (playing, ended) are fired by hand.

let play: MockInstance<HTMLMediaElement['play']>;
let pause: MockInstance<HTMLMediaElement['pause']>;
let load: MockInstance<HTMLMediaElement['load']>;
let hidden = false;

const allowMotion = () => stubMatchMedia((q) => q.includes('no-preference'));
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
    // Inside the same window, right after the <img> that stays the poster and the still.
    expect(video.previousElementSibling?.tagName).toBe('IMG');
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
    expect(Array.from(win.children).map((el) => el.tagName)).toEqual(['DIV', 'IMG', 'VIDEO']);
    expect(win.firstElementChild?.className).toBe('sheet-bar');
    expect(win.querySelector('video')?.className).toBe('sheet-clip');
    expect(Array.from(win.querySelectorAll('source')).map((el) => el.getAttribute('src'))).toEqual(['/clips/gonai.webm', '/clips/gonai.mp4']);
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
});
