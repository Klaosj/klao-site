// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  THEME_EVENT,
  THEME_PREPAINT_SCRIPT,
  THEME_STORAGE_KEY,
  TOKENS,
  isThemePref,
  readThemePref,
  writeThemePref,
  type RawToken,
} from '@/lib/theme';

const root = document.documentElement;

// Safari private mode and "block all site data" make the `localStorage`
// getter itself throw (SecurityError), not just setItem. Vitest's jsdom
// environment makes `window` the global object and exposes `localStorage` as
// a configurable getter on it, so redefining that getter reproduces the real
// failure for both `window.localStorage` and a bare `localStorage`.
const realStorage = Object.getOwnPropertyDescriptor(window, 'localStorage')!;
function blockStorage() {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    },
  });
}

beforeEach(() => {
  window.localStorage.clear();
  root.removeAttribute('data-theme');
  root.classList.remove('js');
});

afterEach(() => {
  Object.defineProperty(window, 'localStorage', realStorage);
  vi.restoreAllMocks();
});

describe('TOKENS', () => {
  it('carries the spec §5.1 light palette', () => {
    expect(TOKENS.light).toEqual({
      canvas: '#FFFFFF',
      mist: '#F5F6F8',
      card: '#FFFFFF',
      raised: '#FFFFFF',
      'ink-1': '#1A1C20',
      'ink-2': '#666970',
      'ink-3': '#83868C',
      kram: '#26314A',
      'kram-hover': '#3C475E',
      'on-kram': '#FFFFFF',
      link: '#506CAF',
      focus: '#506CAF',
      line: 'rgb(20 26 44 / .10)',
      ctl: 'rgb(236 237 241 / .72)',
      curtain: 'rgb(245 246 248 / .56)',
      'w-aje': '#F4F7FB',
      'w-gonai': '#F4F8F6',
      'w-site': '#F5F6F8',
      gonai: '#1C7A57',
    });
  });

  it('carries the spec §5.1 dark palette, token for token', () => {
    expect(Object.keys(TOKENS.dark).sort()).toEqual(Object.keys(TOKENS.light).sort());
    expect(TOKENS.dark.canvas).toBe('#0A0B0D');
    expect(TOKENS.dark.mist).toBe('#141518');
    expect(TOKENS.dark.card).toBe('#1C1E21');
    expect(TOKENS.dark['ink-1']).toBe('#F2F3F5');
    expect(TOKENS.dark['ink-2']).toBe('#A6A9B0');
    expect(TOKENS.dark['ink-3']).toBe('#777A80');
    expect(TOKENS.dark.kram).toBe('#E0E8F9');
    expect(TOKENS.dark.link).toBe('#91AAE1');
    expect(TOKENS.dark.line).toBe('rgb(255 255 255 / .10)');
    expect(TOKENS.dark.raised).toBe('#25262A');
    expect(TOKENS.dark.ctl).toBe('rgb(58 60 66 / .60)');
    expect(TOKENS.dark.curtain).toBe('rgb(0 0 0 / .56)');
  });

  it('keeps Kram the only accent: GoNai green exists as its own token, never as kram', () => {
    const greenIn = (p: Record<string, string>) =>
      Object.entries(p)
        .filter(([, v]) => v === p.gonai)
        .map(([k]) => k);
    expect(greenIn(TOKENS.light)).toEqual(['gonai']);
    expect(greenIn(TOKENS.dark)).toEqual(['gonai']);
  });
});

describe('isThemePref', () => {
  it('accepts exactly auto, light and dark', () => {
    expect(['auto', 'light', 'dark'].every(isThemePref)).toBe(true);
    expect(isThemePref('Dark')).toBe(false);
    expect(isThemePref('')).toBe(false);
    expect(isThemePref(null)).toBe(false);
  });
});

describe('THEME_PREPAINT_SCRIPT', () => {
  const run = () => new Function(THEME_PREPAINT_SCRIPT)();

  it('marks <html> with `js` so CSS may start gating reveals', () => {
    run();
    expect(root.classList.contains('js')).toBe(true);
  });

  it('applies a stored light or dark choice before paint', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    run();
    expect(root.getAttribute('data-theme')).toBe('dark');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    run();
    expect(root.getAttribute('data-theme')).toBe('light');
  });

  it('leaves Auto (and anything invalid) to prefers-color-scheme: no attribute', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'auto');
    run();
    expect(root.hasAttribute('data-theme')).toBe(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
    run();
    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  it('still adds `js` and does not throw when storage is blocked', () => {
    blockStorage();
    expect(run).not.toThrow();
    expect(root.classList.contains('js')).toBe(true);
    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  it('reads the same storage key the helpers write', () => {
    expect(THEME_PREPAINT_SCRIPT).toContain(JSON.stringify(THEME_STORAGE_KEY));
    expect(THEME_STORAGE_KEY).toBe('klao-theme');
  });
});

describe('readThemePref', () => {
  it('returns the stored choice', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    expect(readThemePref()).toBe('light');
  });

  it('returns auto when nothing, or nothing valid, is stored', () => {
    expect(readThemePref()).toBe('auto');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'DARK');
    expect(readThemePref()).toBe('auto');
  });

  it('falls back to auto without throwing when storage is blocked (Review Focus #2)', () => {
    blockStorage();
    expect(() => readThemePref()).not.toThrow();
    expect(readThemePref()).toBe('auto');
  });
});

describe('writeThemePref', () => {
  it('sets data-theme for light/dark, removes it for auto, and remembers each', () => {
    writeThemePref('dark');
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    writeThemePref('auto');
    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('auto');
  });

  it('announces the change so every mounted toggle can follow', () => {
    const heard: unknown[] = [];
    const listener = (e: Event) => heard.push((e as CustomEvent).detail);
    window.addEventListener(THEME_EVENT, listener);
    writeThemePref('light');
    window.removeEventListener(THEME_EVENT, listener);
    expect(heard).toEqual([{ pref: 'light' }]);
  });

  it('still switches the page for this session when storage is blocked (Review Focus #2)', () => {
    blockStorage();
    expect(() => writeThemePref('dark')).not.toThrow();
    expect(root.getAttribute('data-theme')).toBe('dark');
    // A toggle mounted later in the same page view reads the session's choice.
    expect(readThemePref()).toBe('dark');
  });

  it('survives a storage that is readable but refuses writes (quota)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    expect(() => writeThemePref('light')).not.toThrow();
    expect(root.getAttribute('data-theme')).toBe('light');
  });

  it('treats an invalid value from untyped callers as auto', () => {
    root.setAttribute('data-theme', 'dark');
    writeThemePref('sepia' as never);
    expect(root.hasAttribute('data-theme')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TOKENS <-> globals.css parity. CSS cannot import TypeScript, so the colour
// values live twice; these tests are what keeps the two copies equal. The
// three blocks are found by the marker comments globals.css carries above
// them (`/* tokens:light */`, `/* tokens:dark:system */`,
// `/* tokens:dark:attr */`).
// ---------------------------------------------------------------------------
const CSS = readFileSync('src/app/globals.css', 'utf8');
const norm = (v: string) => v.replace(/\s+/g, ' ').trim().toLowerCase();

function tokenBlock(marker: string): Record<string, string> {
  const at = CSS.indexOf(`/* ${marker} */`);
  if (at < 0) throw new Error(`globals.css lost its /* ${marker} */ marker`);
  const rest = CSS.slice(at);
  const open = rest.indexOf('{', rest.indexOf(':root'));
  const body = rest.slice(open + 1, rest.indexOf('}', open));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], norm(m[2])]),
  );
}

describe('globals.css mirrors TOKENS', () => {
  const light = tokenBlock('tokens:light');
  const darkSystem = tokenBlock('tokens:dark:system');
  const darkAttr = tokenBlock('tokens:dark:attr');
  const names = Object.keys(TOKENS.light) as RawToken[];

  it.each(names)('light --%s matches TOKENS.light', (name) => {
    expect(light[name]).toBe(norm(TOKENS.light[name]));
  });

  it.each(names)('system-dark --%s matches TOKENS.dark', (name) => {
    expect(darkSystem[name]).toBe(norm(TOKENS.dark[name]));
  });

  it.each(names)('toggle-dark --%s matches TOKENS.dark', (name) => {
    expect(darkAttr[name]).toBe(norm(TOKENS.dark[name]));
  });

  it('keeps the two dark blocks identical, so Auto-on-a-dark-Mac and the Dark toggle look the same', () => {
    expect(darkAttr).toEqual(darkSystem);
  });

  it('defines the same variables in light and dark, so no token silently keeps its light value in dark', () => {
    expect(Object.keys(darkAttr).sort()).toEqual(Object.keys(light).sort());
  });
});
