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

  it('keeps font-mono and the Latin tracking for English', () => {
    // Counterpart assertion: the fix must not strip the intended treatment
    // from the locale it was designed for.
    render(<CopyEmail email="a@b.co" copiedLabel="Copied" locale="en" />);
    const label = screen.getByText('Copied');
    expect(label.className).toContain('font-mono');
    expect(label.className).toContain('tracking-[0.18em]');
  });
});
