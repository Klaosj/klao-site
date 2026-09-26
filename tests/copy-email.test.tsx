// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { StrictMode } from 'react';
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

  // --- Fix round 1 regressions -------------------------------------------

  it('does not stack timers on a double click inside the 2 s window: one pending timer, resetting 2 s after the LAST copy', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const { container } = render(<CopyEmail email="a@b.co" locale="en" />);

    await clickCopy();
    expect(vi.getTimerCount()).toBe(1);

    // A second copy 1 s into the first window, before its timer fires.
    // settle() must clearTimeout() the first one, leaving exactly one timer
    // -- not two racing to reset the label at different times.
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    await clickCopy();
    expect(vi.getTimerCount()).toBe(1);

    // t=1999ms since the SECOND click (t=2999ms since the first): if the
    // first click's timer had survived, it would have reset the label a
    // full second ago (at t=2000ms since the first click).
    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(live(container)).toBe(dict.en.copied);

    // The one remaining timer fires exactly 2 s after the LAST copy.
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(live(container)).toBe('');
  });

  it('unmounting while the clipboard promise is still pending throws nothing, warns nothing, and leaves no pending timer', async () => {
    vi.useFakeTimers();
    // A promise this test controls, so it can unmount BEFORE the clipboard
    // write settles -- copyText()'s await is still pending at that point.
    let resolveWrite: () => void = () => {};
    const writeText = vi.fn(() => new Promise<void>((resolve) => { resolveWrite = resolve; }));
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount } = render(<CopyEmail email="a@b.co" locale="en" />);
    fireEvent.click(screen.getByRole('button', { name: dict.en.copyEmailAction }));
    // No timer yet: copy() is still awaiting copyText(), which hasn't
    // resolved, so settle() has not run.
    expect(vi.getTimerCount()).toBe(0);

    unmount();

    // Resolving AFTER unmount is the regression: without the mounted guard,
    // copy() would resume, call settle('ok', 2000), and schedule a new
    // setTimeout that the unmount cleanup already ran and can never cancel
    // -- a real leak, not a theoretical one (this assertion fails without
    // the guard).
    await act(async () => {
      resolveWrite();
      await flushMicrotasks();
    });
    expect(vi.getTimerCount()).toBe(0);
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();

    warn.mockRestore();
    error.mockRestore();
  });

  // Fix round 2: the mounted ref from round 1 was only initialised by
  // useRef(true), never reset in the effect BODY -- so Next's App Router
  // default of React.StrictMode (whose dev-only double invoke runs
  // mount -> cleanup -> mount) left it stuck at `false` after the first
  // mount/cleanup pass, and every real click afterwards silently did
  // nothing. Wrapping in StrictMode here is what actually exercises that
  // double invoke; a plain render() never would.
  it('still confirms a copy (and resets) when rendered inside React.StrictMode', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const { container } = render(
      <StrictMode>
        <CopyEmail email="a@b.co" locale="en" />
      </StrictMode>,
    );
    await clickCopy();
    expect(live(container)).toBe(dict.en.copied);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(live(container)).toBe('');
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
            expect(selector, `stroke-dashoffset transition outside .copy-ok: ${selector}`).toContain('.copy-ok');
            sawException = true;
            continue;
          }
          expect(['transform', 'opacity'], `${selector} transitions ${prop}`).toContain(prop);
        }
      }
    }
    expect(sawException, 'expected exactly the .copy-ok path stroke-dashoffset exception').toBe(true);
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
    expect(block).toMatch(/\.copy-b,\s*\.copy-clip,\s*\.copy-ok path \{\s*transition: none;/);
  });
});
