/** Theme source of truth for the White Edition (spec §5.1, master plan C1/C2).
 *
 *  `TOKENS` holds the colour values; `src/app/globals.css` repeats them as raw
 *  CSS variables for `:root` (light), `[data-theme="dark"]` and the system-dark
 *  media block, because CSS cannot import TypeScript. tests/theme.test.ts reads
 *  globals.css and fails when the two drift -- change a colour in both places
 *  or the suite goes red.
 *
 *  The rest of this file is the runtime side of the Auto/Light/Dark choice:
 *  the inline pre-paint script (so the first frame is already the right theme)
 *  and the read/write helpers the toggles use. Every storage access sits in a
 *  try/catch: Safari private mode and "block site data" make `localStorage`
 *  throw on access, and a theme preference is never worth a crashed page. */

export type ThemePref = 'auto' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'klao-theme';

/** Fired on `window` after every writeThemePref, so each mounted toggle
 *  (footer, phone menu, ⌘K) shows the same pressed state. */
export const THEME_EVENT = 'klao:theme';

export type RawToken =
  | 'canvas'
  | 'mist'
  | 'card'
  | 'raised'
  | 'ink-1'
  | 'ink-2'
  | 'ink-3'
  | 'kram'
  | 'kram-hover'
  | 'on-kram'
  | 'link'
  | 'focus'
  | 'line'
  | 'ctl'
  | 'curtain'
  | 'w-aje'
  | 'w-gonai'
  | 'w-site'
  | 'gonai';

export const TOKENS: { light: Record<RawToken, string>; dark: Record<RawToken, string> } = {
  light: {
    canvas: '#FFFFFF',
    mist: '#F5F6F8',
    card: '#FFFFFF',
    // Sheets, menus, ⌘K: one step above card in dark mode.
    raised: '#FFFFFF',
    'ink-1': '#1A1C20',
    'ink-2': '#666970',
    // Large text only: 3.6:1 on canvas passes for 18.66px bold / 24px, not body.
    'ink-3': '#83868C',
    kram: '#26314A',
    'kram-hover': '#3C475E',
    'on-kram': '#FFFFFF',
    link: '#506CAF',
    focus: '#506CAF',
    line: 'rgb(20 26 44 / .10)',
    // Small glass controls (.ctl, .seg); same value as the --glass-ctl variable.
    ctl: 'rgb(236 237 241 / .72)',
    // Backdrop behind open dialogs.
    curtain: 'rgb(245 246 248 / .56)',
    'w-aje': '#F4F7FB',
    'w-gonai': '#F4F8F6',
    'w-site': '#F5F6F8',
    gonai: '#1C7A57',
  },
  dark: {
    canvas: '#0A0B0D',
    mist: '#141518',
    card: '#1C1E21',
    raised: '#25262A',
    'ink-1': '#F2F3F5',
    'ink-2': '#A6A9B0',
    'ink-3': '#777A80',
    kram: '#E0E8F9',
    'kram-hover': '#ECF1FB',
    'on-kram': '#171F30',
    link: '#91AAE1',
    focus: '#91AAE1',
    line: 'rgb(255 255 255 / .10)',
    ctl: 'rgb(58 60 66 / .60)',
    curtain: 'rgb(0 0 0 / .56)',
    'w-aje': '#0E131A',
    'w-gonai': '#0E1414',
    'w-site': '#141518',
    gonai: '#79C3A1',
  },
};

export function isThemePref(value: unknown): value is ThemePref {
  return value === 'auto' || value === 'light' || value === 'dark';
}

/** Inlined into <head> by src/app/[locale]/layout.tsx and run before first
 *  paint. It does two things and nothing else:
 *   1. adds `js` to <html> -- CSS gates every reveal on `html.js`, so a page
 *      whose scripts never run (or run late) keeps all content visible;
 *   2. sets `data-theme` when the visitor chose Light or Dark. Auto means no
 *      attribute, and globals.css follows `prefers-color-scheme`.
 *  Plain ES5 on purpose: it runs before any bundle, in every browser. */
export const THEME_PREPAINT_SCRIPT = `(function(){var d=document.documentElement;d.classList.add('js');try{var t=window.localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==='light'||t==='dark')d.setAttribute('data-theme',t);}catch(e){}})();`;

/** The visitor's saved choice. 'auto' when nothing valid is stored.
 *  When storage itself is blocked, the choice made earlier in this page view
 *  still lives on <html data-theme> (writeThemePref sets it either way), so a
 *  toggle mounted later -- the phone menu, ⌘K -- shows the truth instead of
 *  snapping back to Auto. On first load with blocked storage there is no
 *  attribute, so this is 'auto'. */
export function readThemePref(): ThemePref {
  if (typeof window === 'undefined') return 'auto';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePref(stored) ? stored : 'auto';
  } catch {
    const attr = document.documentElement.getAttribute('data-theme');
    return attr === 'light' || attr === 'dark' ? attr : 'auto';
  }
}

/** Applies a choice now and remembers it when storage allows. The <html>
 *  attribute is set first and unconditionally, so the page switches theme
 *  even when the save fails -- the choice then lasts for this page view. */
export function writeThemePref(pref: ThemePref): void {
  const next: ThemePref = isThemePref(pref) ? pref : 'auto';
  const root = document.documentElement;
  if (next === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', next);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Blocked or full storage: nothing to do, the attribute above already applied.
  }
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { pref: next } }));
}
