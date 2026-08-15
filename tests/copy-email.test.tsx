// @vitest-environment jsdom
import { act } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CopyEmail from '@/components/CopyEmail';

// Vitest (unlike jest-environment-jsdom) doesn't set this automatically, and
// Testing Library's own act-wrapper resets it after every render()/
// fireEvent() call -- so a raw `act` imported from 'react' (needed below to
// flush the click handler's microtask and to drive fake timers) warns
// "environment not configured" unless this is set explicitly once up front.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

// No RTL auto-cleanup is wired up in this project (no setupFiles in
// vitest.config.ts) -- without this, render() output from an earlier test
// stays attached to document.body and screen.getByText(...) can match
// leftover nodes from a previous test in this file.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('CopyEmail', () => {
  it('writes the address to the clipboard and reveals the copied label', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    render(<CopyEmail email="a@b.co" copiedLabel="Copied" locale="en" />);
    // The "Copied" text node is always in the DOM (an aria-live region needs
    // something to announce), so asserting it merely exists would pass even
    // if the click handler were a no-op -- the signal is the opacity class
    // that shows/hides it, checked below before and after the click.
    const label = screen.getByText('Copied');
    expect(label.className).toContain('opacity-0');
    expect(label.className).not.toContain('opacity-100');

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
      // The mocked writeText resolves on the microtask queue; flush it
      // before asserting the post-click state.
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith('a@b.co');
    expect(label.className).toContain('opacity-100');
  });

  it('clears the copied state again after the timeout elapses', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    render(<CopyEmail email="a@b.co" copiedLabel="Copied" locale="en" />);
    const label = screen.getByText('Copied');

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
      await Promise.resolve();
    });
    expect(label.className).toContain('opacity-100');

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(label.className).toContain('opacity-0');
    expect(label.className).not.toContain('opacity-100');
  });

  it('still shows the address as readable, selectable text when the clipboard API is absent', () => {
    vi.stubGlobal('navigator', {});
    render(<CopyEmail email="a@b.co" copiedLabel="Copied" locale="en" />);
    expect(screen.getByText('a@b.co')).toBeTruthy();
  });

  it('does not fall back to document.execCommand when navigator.clipboard is entirely absent', async () => {
    vi.stubGlobal('navigator', {});
    const execCommand = vi.fn().mockReturnValue(true);
    // jsdom does not implement execCommand; assign a spy directly so an
    // accidental reintroduction of the old fallback would have something
    // real to call, and this test can prove it was never reached.
    document.execCommand = execCommand;

    render(<CopyEmail email="a@b.co" copiedLabel="Copied" locale="en" />);
    const label = screen.getByText('Copied');
    expect(label.className).toContain('opacity-0');

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
      await Promise.resolve();
    });

    // The execCommand branch was dropped entirely (Task 10/11 review: it
    // was near-theatre -- deprecated, and the old code showed "Copied" even
    // when the call may have silently failed). Nothing should call it.
    expect(execCommand).not.toHaveBeenCalled();
  });

  it('shows no false "copied" confirmation when navigator.clipboard is entirely absent', async () => {
    // Distinct from the execCommand assertion above: this is the actual
    // user-facing correctness bug the old fallback caused -- a visitor
    // believing an address is on their clipboard when the browser never
    // wrote anything there. A regression here would still pass the
    // execCommand test above (execCommand not being called doesn't by
    // itself prove the "copied" label stays hidden).
    vi.stubGlobal('navigator', {});

    render(<CopyEmail email="a@b.co" copiedLabel="Copied" locale="en" />);
    const label = screen.getByText('Copied');

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
      await Promise.resolve();
    });

    expect(label.className).toContain('opacity-0');
    expect(label.className).not.toContain('opacity-100');
  });

  it('shows no false "copied" confirmation when navigator.clipboard.writeText rejects (e.g. permission denied)', async () => {
    // Same failure mode as the test above, but for the case where the
    // Clipboard API exists and is called, yet the write itself fails --
    // the exact scenario the removed execCommand branch used to paper over
    // with a fake success state.
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    render(<CopyEmail email="a@b.co" copiedLabel="Copied" locale="en" />);
    const label = screen.getByText('Copied');

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith('a@b.co');
    expect(label.className).toContain('opacity-0');
    expect(label.className).not.toContain('opacity-100');
  });

  // --- Thai label typography ------------------------------------------
  // Last surviving instance of the FINAL-5 bug class fixed at 11 other call
  // sites: no monospace face carries Thai glyphs, so `font-mono` forces
  // per-glyph fallback, and the 0.18em tracking then pulls every combining
  // vowel and tone mark away from its base letter.

  it('renders the Thai copied label in the Thai stack, never font-mono', () => {
    render(<CopyEmail email="a@b.co" copiedLabel="คัดลอกแล้ว" locale="th" />);
    const label = screen.getByText('คัดลอกแล้ว');
    expect(label.className).not.toContain('font-mono');
    expect(label.className).toContain('font-thai');
  });

  it('drops the wide Latin tracking for Thai, which detaches tone marks', () => {
    render(<CopyEmail email="a@b.co" copiedLabel="คัดลอกแล้ว" locale="th" />);
    const label = screen.getByText('คัดลอกแล้ว');
    expect(label.className).not.toMatch(/tracking-\[/);
    expect(label.className).toContain('tracking-normal');
  });

  it('puts the copied indicator on the shared sub-label size, bumped for Thai', () => {
    // QA finding 11 + 12: same second label tier as SkillsBand's "Core
    // tools" and ContactBand's channel labels. Peri (not the tier's usual
    // on-dark-soft) is intentional here -- this one is a state confirmation
    // caught at the edge of vision, not a field name.
    render(<CopyEmail email="a@b.co" copiedLabel="Copied" locale="en" />);
    expect(screen.getByText('Copied').className).toContain('text-[10.5px]');
    cleanup();
    render(<CopyEmail email="a@b.co" copiedLabel="คัดลอกแล้ว" locale="th" />);
    expect(screen.getByText('คัดลอกแล้ว').className).toContain('text-[11.5px]');
  });

  it('keeps font-mono and the Latin tracking for English', () => {
    // Counterpart assertion: the fix must not strip the intended treatment
    // from the locale it was designed for.
    render(<CopyEmail email="a@b.co" copiedLabel="Copied" locale="en" />);
    const label = screen.getByText('Copied');
    expect(label.className).toContain('font-mono');
    expect(label.className).toContain('tracking-[0.18em]');
  });

  // --- QA C2: live-region text mutation + stable accessible name --------
  // The visible "Copied" span above is purely decorative (aria-hidden) as
  // of the C2 fix, so it is no longer the thing a screen reader announces
  // from. These tests target the separate sr-only live region and the
  // button's aria-label directly, via container.querySelector rather than
  // screen.getByText('Copied') -- once a copy succeeds there are two nodes
  // with that text (the visible label and the live region), so getByText
  // would be ambiguous.

  it('mutates the live region text on a successful copy, and clears it again after the timeout', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    const { container } = render(<CopyEmail email="a@b.co" copiedLabel="Copied" locale="en" />);
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
    // Empty before any click: a live region must actually change text to
    // announce -- if it already held "Copied" at rest, nothing would fire.
    expect(liveRegion?.textContent).toBe('');

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
      await Promise.resolve();
    });
    expect(liveRegion?.textContent).toBe('Copied');

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    // Clearing it back out (not just leaving "Copied" in place) means the
    // *next* successful copy is a change again, not a no-op repeat.
    expect(liveRegion?.textContent).toBe('');
  });

  it('names the button with its visible text plus the action, and never the copied label', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    render(<CopyEmail email="a@b.co" copiedLabel="Copied" locale="en" />);
    const nameOf = () => screen.getByRole('button').getAttribute('aria-label') ?? '';

    // Two separate requirements, and an earlier fix satisfied one by breaking
    // the other:
    //
    // 1. WCAG 2.5.3 Label in Name -- the accessible name must CONTAIN the
    //    visible label. The visible text here is the address itself, so a
    //    speech-input user says "click a@b.co". A bare "Copy email address"
    //    name passed the old exact-string assertion but left that user unable
    //    to target the button at all; Lighthouse flagged it as
    //    label-content-name-mismatch.
    // 2. The original defect -- the always-present "Copied" text must never
    //    be concatenated into the name, before OR after a click.
    //
    // Asserting containment rather than one exact string is deliberate: the
    // exact-string version is what allowed requirement 1 to regress silently.
    expect(nameOf()).toContain('a@b.co');
    expect(nameOf()).toContain('Copy email address');
    expect(nameOf()).not.toContain('Copied');

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
      await Promise.resolve();
    });

    expect(nameOf()).toContain('a@b.co');
    expect(nameOf()).not.toContain('Copied');
  });

  it('announces nothing in the live region when the clipboard API is entirely absent', async () => {
    vi.stubGlobal('navigator', {});
    const { container } = render(<CopyEmail email="a@b.co" copiedLabel="Copied" locale="en" />);
    const liveRegion = container.querySelector('[aria-live="polite"]');

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
      await Promise.resolve();
    });

    expect(liveRegion?.textContent).toBe('');
  });

  it('announces nothing in the live region when navigator.clipboard.writeText rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const { container } = render(<CopyEmail email="a@b.co" copiedLabel="Copied" locale="en" />);
    const liveRegion = container.querySelector('[aria-live="polite"]');

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
      await Promise.resolve();
    });

    expect(liveRegion?.textContent).toBe('');
  });
});
