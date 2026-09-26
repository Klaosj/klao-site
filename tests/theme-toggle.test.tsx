// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ThemeToggle from '@/components/ThemeToggle';
import { dict } from '@/lib/dictionary';
import { THEME_STORAGE_KEY, writeThemePref } from '@/lib/theme';

const root = document.documentElement;
const realStorage = Object.getOwnPropertyDescriptor(window, 'localStorage')!;

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

  it('moves the selection with ArrowRight/ArrowLeft and applies it at once (A01)', () => {
    render(<ThemeToggle locale="en" />);
    const seg = screen.getByRole('radiogroup');
    fireEvent.keyDown(seg, { key: 'ArrowRight' });
    expect(checked()).toEqual(['Light']);
    expect(root.getAttribute('data-theme')).toBe('light');
    fireEvent.keyDown(seg, { key: 'ArrowRight' });
    expect(checked()).toEqual(['Dark']);
    fireEvent.keyDown(seg, { key: 'ArrowLeft' });
    expect(checked()).toEqual(['Light']);
    // Arrow keys that are not Left/Right do nothing.
    fireEvent.keyDown(seg, { key: 'ArrowDown' });
    expect(checked()).toEqual(['Light']);
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
});
