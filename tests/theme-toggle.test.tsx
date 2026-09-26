// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ThemeToggle from '@/components/ThemeToggle';
import { dict } from '@/lib/dictionary';
import { THEME_STORAGE_KEY, writeThemePref } from '@/lib/theme';

const root = document.documentElement;
const realStorage = Object.getOwnPropertyDescriptor(window, 'localStorage')!;
// Same helper as tests/site-nav.test.tsx: waits for a real requestAnimationFrame
// tick rather than a fake timer, since that's what the component itself uses.
const flushRaf = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

beforeEach(() => {
  window.localStorage.clear();
  root.removeAttribute('data-theme');
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});

afterEach(() => {
  cleanup();
  Object.defineProperty(window, 'localStorage', realStorage);
  vi.unstubAllGlobals();
  delete (document as { startViewTransition?: unknown }).startViewTransition;
});

// Amendment A01: ThemeToggle is a role="radiogroup" of role="radio" buttons
// (aria-checked), not a role="group" of plain aria-pressed buttons -- only
// one option is ever "on", which is exactly what radio semantics mean.
const checked = () =>
  screen.getAllByRole('radio').filter((b) => b.getAttribute('aria-checked') === 'true').map((b) => b.textContent);

describe('ThemeToggle', () => {
  it('is a labelled radiogroup of three radios, in order, in the page language (A01)', () => {
    render(<ThemeToggle locale="th" />);
    expect(screen.getByRole('radiogroup', { name: dict.th.appearance })).toBeTruthy();
    expect(screen.getAllByRole('radio').map((b) => b.textContent)).toEqual([
      dict.th.themeAuto,
      dict.th.themeLight,
      dict.th.themeDark,
    ]);
    expect(screen.getAllByRole('radio').map((b) => b.getAttribute('aria-checked'))).toEqual([
      'true',
      'false',
      'false',
    ]);
  });

  // P0 residual (a): `.seg-label::after` reserves the bold width from
  // data-label, so a data-label that drifts from the visible word reserves
  // the wrong width and the thumb nudges again when that option is checked.
  it('gives every label a data-label equal to its visible text, in both locales (fix wave finding 6)', () => {
    for (const locale of ['en', 'th'] as const) {
      const { unmount } = render(<ThemeToggle locale={locale} />);
      for (const radio of screen.getAllByRole('radio')) {
        const label = radio.querySelector('.seg-label');
        expect(label, `${locale}: ${radio.textContent}`).not.toBeNull();
        expect(label!.getAttribute('data-label')).toBe(radio.textContent);
      }
      unmount();
    }
  });

  it('marks Auto when nothing is stored', () => {
    render(<ThemeToggle locale="en" />);
    expect(checked()).toEqual(['Auto']);
  });

  it('marks the stored choice after mount', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    render(<ThemeToggle locale="en" />);
    expect(checked()).toEqual(['Dark']);
  });

  it('applies and remembers a choice, and slides the thumb by moving --i (A01)', () => {
    render(<ThemeToggle locale="en" />);
    const seg = screen.getByRole('radiogroup') as HTMLElement;
    fireEvent.click(screen.getByRole('radio', { name: 'Light' }));
    expect(root.getAttribute('data-theme')).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(checked()).toEqual(['Light']);
    expect(seg.style.getPropertyValue('--i')).toBe('1');
    fireEvent.click(screen.getByRole('radio', { name: 'Auto' }));
    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(checked()).toEqual(['Auto']);
    expect(seg.style.getPropertyValue('--i')).toBe('0');
  });

  // Fix wave finding 7: a radiogroup's arrow-key support is not only
  // horizontal (ARIA APG) -- ArrowDown/ArrowUp move the checked option
  // exactly like ArrowRight/ArrowLeft -- and each move also carries focus
  // to the newly-checked radio (roving tabIndex: only the checked radio is
  // ever tabIndex 0).
  it('moves the selection with ArrowRight/ArrowLeft/ArrowDown/ArrowUp, applies it at once, and moves focus (A01)', () => {
    render(<ThemeToggle locale="en" />);
    const seg = screen.getByRole('radiogroup');
    fireEvent.keyDown(seg, { key: 'ArrowRight' });
    expect(checked()).toEqual(['Light']);
    expect(root.getAttribute('data-theme')).toBe('light');
    let radio = screen.getByRole('radio', { name: 'Light' });
    expect(document.activeElement).toBe(radio);
    expect(radio.tabIndex).toBe(0);
    expect(screen.getByRole('radio', { name: 'Auto' }).tabIndex).toBe(-1);

    fireEvent.keyDown(seg, { key: 'ArrowDown' });
    expect(checked()).toEqual(['Dark']);
    radio = screen.getByRole('radio', { name: 'Dark' });
    expect(document.activeElement).toBe(radio);
    expect(radio.tabIndex).toBe(0);

    fireEvent.keyDown(seg, { key: 'ArrowUp' });
    expect(checked()).toEqual(['Light']);
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Light' }));

    fireEvent.keyDown(seg, { key: 'ArrowLeft' });
    expect(checked()).toEqual(['Auto']);
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Auto' }));

    // A key that is not one of the four arrows does nothing.
    fireEvent.keyDown(seg, { key: 'Enter' });
    expect(checked()).toEqual(['Auto']);
  });

  it('keeps every toggle on the page in step (footer, phone menu, ⌘K)', () => {
    render(
      <>
        <ThemeToggle locale="en" />
        <ThemeToggle locale="en" icons={false} />
      </>,
    );
    fireEvent.click(screen.getAllByRole('radio', { name: 'Dark' })[0]);
    expect(checked()).toEqual(['Dark', 'Dark']);
    act(() => writeThemePref('light'));
    expect(checked()).toEqual(['Light', 'Light']);
  });

  // Per-button icons are gone (A01): one shared ThemeGlyph (sun <-> moon
  // eclipse) sits beside the segmented control instead.
  it('shows the appearance glyph unless told not to (A01 ThemeGlyph)', () => {
    const { container, unmount } = render(<ThemeToggle locale="en" />);
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    unmount();
    const bare = render(<ThemeToggle locale="en" icons={false} />);
    expect(bare.container.querySelectorAll('svg')).toHaveLength(0);
  });

  it('still switches the page for the session when storage is blocked (Review Focus #2)', () => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });
    render(<ThemeToggle locale="en" />);
    expect(checked()).toEqual(['Auto']);
    expect(() => fireEvent.click(screen.getByRole('radio', { name: 'Dark' }))).not.toThrow();
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(checked()).toEqual(['Dark']);
  });

  it('cross-fades through a view transition when the browser has one and motion is allowed (A01)', () => {
    const startViewTransition = vi.fn((update: () => void) => update());
    (document as { startViewTransition?: unknown }).startViewTransition = startViewTransition;
    render(<ThemeToggle locale="en" />);
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(startViewTransition).toHaveBeenCalledOnce();
    expect(root.getAttribute('data-theme')).toBe('dark');
  });

  it('switches without a view transition under reduced motion', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('reduce'),
      addEventListener() {},
      removeEventListener() {},
    }));
    const startViewTransition = vi.fn((update: () => void) => update());
    (document as { startViewTransition?: unknown }).startViewTransition = startViewTransition;
    render(<ThemeToggle locale="en" />);
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(startViewTransition).not.toHaveBeenCalled();
    expect(root.getAttribute('data-theme')).toBe('dark');
  });

  it('still applies the theme directly when the browser has no startViewTransition (A01)', () => {
    expect((document as { startViewTransition?: unknown }).startViewTransition).toBeUndefined();
    render(<ThemeToggle locale="en" />);
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(checked()).toEqual(['Dark']);
  });

  // Fix wave finding 8: the radiogroup wrapper is a <span>, matching the
  // (also inline) <span> it lives inside -- a <div> there is invalid HTML
  // (block content inside inline content) even though most browsers used
  // to render it without visible damage.
  it('renders the radiogroup itself as a <span>, not a <div> (A01, valid nesting)', () => {
    const { container } = render(<ThemeToggle locale="en" />);
    const group = screen.getByRole('radiogroup');
    expect(group.tagName).toBe('SPAN');
    expect(container.querySelector('div')).toBeNull();
  });

  // Fix wave finding 1: the mount-time sync (server's Auto guess -> the
  // visitor's real theme) must not itself animate; `data-ready` is what
  // globals.css keys that guard on, and it must show up shortly after
  // mount (one requestAnimationFrame), not stay off forever.
  it('marks `data-ready` on the segmented control and the glyph one frame after mount (fix wave finding 1)', async () => {
    const { container } = render(<ThemeToggle locale="en" />);
    const seg = screen.getByRole('radiogroup');
    const glyph = container.querySelector('svg')!;
    expect(seg.hasAttribute('data-ready')).toBe(false);
    expect(glyph.hasAttribute('data-ready')).toBe(false);
    // Unlike SiteNav's rAF-throttled sync() (a direct DOM mutation),
    // setReady is a React state update, so committing it needs an act().
    await act(() => flushRaf());
    expect(seg.getAttribute('data-ready')).toBe('true');
    expect(glyph.getAttribute('data-ready')).toBe('true');
  });

  // Deferred-T9: the glyph's is-dark class must follow the RESOLVED theme,
  // including a live prefers-color-scheme change while the page stays open
  // and the visitor is still on Auto (no stored light/dark choice).
  it('T9: ThemeGlyph is-dark follows the resolved theme, incl. a live OS-level flip under Auto', () => {
    let systemDark = true;
    let onChange: (() => void) | undefined;
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('dark') ? systemDark : false,
      addEventListener: (_event: string, cb: () => void) => {
        onChange = cb;
      },
      removeEventListener() {},
    }));
    const { container } = render(<ThemeToggle locale="en" />);
    const glyph = () => container.querySelector('svg')!;
    // Auto + a dark system starts the glyph in its moon state.
    expect(glyph().classList.contains('is-dark')).toBe(true);

    // The system flips to light while the page is still open, still Auto.
    systemDark = false;
    act(() => onChange?.());
    expect(glyph().classList.contains('is-dark')).toBe(false);

    // And back to dark.
    systemDark = true;
    act(() => onChange?.());
    expect(glyph().classList.contains('is-dark')).toBe(true);
  });
});
