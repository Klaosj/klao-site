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

    render(<CopyEmail email="a@b.co" copiedLabel="Copied" />);
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

    render(<CopyEmail email="a@b.co" copiedLabel="Copied" />);
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
    render(<CopyEmail email="a@b.co" copiedLabel="Copied" />);
    expect(screen.getByText('a@b.co')).toBeTruthy();
  });

  it('falls back to document.execCommand and still shows the copied state when clipboard.writeText is unavailable', async () => {
    vi.stubGlobal('navigator', {});
    const execCommand = vi.fn().mockReturnValue(true);
    // jsdom does not implement execCommand; assign a spy directly so the
    // fallback branch has something real to call and this test can assert
    // it was reached.
    document.execCommand = execCommand;

    render(<CopyEmail email="a@b.co" copiedLabel="Copied" />);
    const label = screen.getByText('Copied');
    expect(label.className).toContain('opacity-0');

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
      await Promise.resolve();
    });

    expect(execCommand).toHaveBeenCalledWith('copy');
    // The fallback still needs to land the user in the same "it worked"
    // state as the real clipboard path -- otherwise the button silently
    // does nothing from the visitor's point of view.
    expect(label.className).toContain('opacity-100');
  });
});
