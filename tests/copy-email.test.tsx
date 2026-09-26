// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CopyEmail from '@/components/CopyEmail';
import { copyShortcutHint, copyText } from '@/lib/clipboard';
import { dict } from '@/lib/dictionary';

// Raw `act` from react needs this in Vitest (see the old version of this file).
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  window.getSelection()?.removeAllRanges();
});

// copy() awaits copyText(), which awaits writeText(): a few microtask hops
// before the state update. Draining a handful works with fake timers too.
const flushMicrotasks = async () => {
  for (let i = 0; i < 6; i++) await Promise.resolve();
};
const clickCopy = (name: string = dict.en.copyEmailAction) =>
  act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
    await flushMicrotasks();
  });
const live = (container: HTMLElement) => container.querySelector('[aria-live="polite"]')?.textContent ?? '';

describe('copyText', () => {
  it('resolves true only when the clipboard write succeeds', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    await expect(copyText('a@b.co')).resolves.toBe(true);
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    await expect(copyText('a@b.co')).resolves.toBe(false);
    vi.stubGlobal('navigator', {});
    await expect(copyText('a@b.co')).resolves.toBe(false);
  });

  it('says ⌘C on Apple hardware and Ctrl+C everywhere else', () => {
    vi.stubGlobal('navigator', { platform: 'MacIntel' });
    expect(copyShortcutHint('Press ⌘C to copy')).toBe('Press ⌘C to copy');
    vi.stubGlobal('navigator', { platform: 'Win32' });
    expect(copyShortcutHint('Press ⌘C to copy')).toBe('Press Ctrl+C to copy');
  });
});

describe('CopyEmail', () => {
  it('always shows the address as plain, selectable text', () => {
    vi.stubGlobal('navigator', {});
    render(<CopyEmail email="a@b.co" locale="en" />);
    expect(screen.getByText('a@b.co')).toBeTruthy();
  });

  it('names the icon button by its action in both languages', () => {
    render(<CopyEmail email="a@b.co" locale="en" />);
    expect(screen.getByRole('button', { name: dict.en.copyEmailAction })).toBeTruthy();
    cleanup();
    render(<CopyEmail email="a@b.co" locale="th" />);
    expect(screen.getByRole('button', { name: dict.th.copyEmailAction })).toBeTruthy();
  });

  it('copies, confirms visibly and to screen readers, then clears after 2 s', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const { container } = render(<CopyEmail email="a@b.co" locale="en" />);
    expect(live(container)).toBe('');
    await clickCopy();
    expect(writeText).toHaveBeenCalledWith('a@b.co');
    expect(live(container)).toBe(dict.en.copied);
    expect(container.querySelector('.copy-l')?.textContent).toBe(dict.en.copied);
    expect(container.querySelector('.copy-b')?.getAttribute('data-state')).toBe('ok');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(live(container)).toBe('');
  });

  it('never claims success without a clipboard: selects the address and says how to copy', async () => {
    vi.stubGlobal('navigator', {});
    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand;
    const { container } = render(<CopyEmail email="a@b.co" locale="en" />);
    await clickCopy();
    expect(live(container)).toBe('Press Ctrl+C to copy');
    expect(container.textContent).not.toContain(dict.en.copied);
    expect(window.getSelection()?.rangeCount).toBe(1);
    expect(window.getSelection()?.getRangeAt(0).toString()).toBe('a@b.co');
    // The deprecated execCommand fallback stays gone (it faked success).
    expect(execCommand).not.toHaveBeenCalled();
  });

  it('treats a rejected write (permission denied) the same honest way', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    const { container } = render(<CopyEmail email="a@b.co" locale="th" />);
    await clickCopy(dict.th.copyEmailAction);
    expect(live(container)).toBe('กด Ctrl+C เพื่อคัดลอก');
    expect(container.textContent).not.toContain(dict.th.copied);
  });
});

// Polish amendment A03: the copy button's icon does not swap outright -- a
// clipboard glyph fades/scales out while a check glyph draws itself via
// `stroke-dashoffset`. That is a named exception to the master Global
// Constraint ("only transform and opacity animate"), scoped to exactly this
// 18 px inline-stroke icon -- this test reads the stylesheet as text (jsdom
// computes no CSS) and fails if any OTHER rule tries to animate anything
// besides transform/opacity, or if the exception leaks onto a wider selector.
describe('copy-email.css (A03 stroke-dashoffset exception)', () => {
  const CSS = readFileSync('src/components/copy-email.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  it('animates only transform/opacity, except the check path\'s stroke-dashoffset', () => {
    let sawException = false;
    for (const rule of CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = rule[1].trim();
      for (const decl of rule[2].matchAll(/transition\s*:\s*([^;]+);/g)) {
        for (const part of decl[1].split(',')) {
          const prop = part.trim().split(/\s+/)[0];
          if (prop === 'none') continue;
          if (prop === 'stroke-dashoffset') {
            // The exception is real (this test would pass vacuously if the
            // rule were ever deleted) and stays scoped to the check icon.
            expect(selector, `stroke-dashoffset transition outside .ok: ${selector}`).toContain('.ok');
            sawException = true;
            continue;
          }
          expect(['transform', 'opacity'], `${selector} transitions ${prop}`).toContain(prop);
        }
      }
    }
    expect(sawException, 'expected exactly the .ok path stroke-dashoffset exception').toBe(true);
  });

  it('turns off every transition, including the draw-on, under prefers-reduced-motion: reduce', () => {
    // Depth-counted, not a lazy regex across the outer/inner braces (same
    // idiom as globals-css.test.ts's blockFrom): the media query nests one
    // rule inside it, and a naive `[\s\S]*?\}` stops at the wrong `}`.
    const blockFrom = (css: string, from: number): string => {
      const open = css.indexOf('{', from);
      let depth = 0;
      for (let i = open; i < css.length; i++) {
        if (css[i] === '{') depth++;
        if (css[i] === '}' && --depth === 0) return css.slice(from, i + 1);
      }
      throw new Error('unbalanced braces in copy-email.css');
    };
    const at = CSS.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(at, 'reduced-motion block').toBeGreaterThan(-1);
    const block = blockFrom(CSS, at);
    // All three transitioning selectors -- including the draw-on check --
    // must be grouped into this one neutralising rule.
    expect(block).toMatch(/\.copy-b,\s*\.clip,\s*\.ok path \{\s*transition: none;/);
  });
});
