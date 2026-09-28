// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PaletteHost from '@/components/palette/PaletteHost';
import type { FaqItem } from '@/lib/models';
import { buildPaletteIndex } from '@/lib/palette-index';
import { stubMatchMedia } from './helpers/media';

const loads = vi.hoisted(() => ({ count: 0 }));

// next/dynamic's real loader is wired by Next's compiler; React.lazy is the
// same contract (load on first render, suspend until loaded) and runs in jsdom.
/* eslint-disable @typescript-eslint/no-explicit-any */
vi.mock('next/dynamic', async () => {
  const React = await import('react');
  return {
    default: (loader: () => Promise<{ default: React.ComponentType<any> }>) => {
      const Lazy = React.lazy(loader);
      return function Dynamic(props: any) {
        return React.createElement(React.Suspense, { fallback: null }, React.createElement(Lazy, props));
      };
    },
  };
});
/* eslint-enable @typescript-eslint/no-explicit-any */

// Counts when the palette module is first evaluated — i.e. when its chunk
// would be fetched in the browser.
vi.mock('@/components/palette/CommandPalette', async (importOriginal) => {
  loads.count += 1;
  return importOriginal();
});

const faq: FaqItem[] = [];
const entries = buildPaletteIndex(
  { profile: { email: 'real@example.com', resumeUrl: '/resume.pdf', linkedin: '', github: '' }, projects: [], career: [], faq },
  'en',
);

beforeEach(() => {
  stubMatchMedia();
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

const mount = () => render(<PaletteHost entries={entries} faq={faq} email="real@example.com" locale="en" />);
const press = (init: KeyboardEventInit) =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
  });

describe('PaletteHost', () => {
  it('renders nothing, and loads no palette code, until someone asks for it', () => {
    mount();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(loads.count).toBe(0);
  });

  it('opens on ⌘K, closes on Ctrl-K, and opens again when the key arrives as a capital K', async () => {
    mount();
    press({ key: 'k', metaKey: true });
    expect(await screen.findByRole('combobox')).toBeTruthy();
    expect(loads.count).toBe(1);
    press({ key: 'k', ctrlKey: true });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    press({ key: 'K', ctrlKey: true });
    expect(await screen.findByRole('combobox')).toBeTruthy();
  });

  // M7 (fix wave finding 10): on a Thai keyboard layout, the physical K key
  // produces a Thai letter, not 'k' -- e.key alone missed it. e.code names
  // the physical key regardless of layout, so Cmd+K still opens the palette.
  it('opens on ⌘K under a Thai keyboard layout, where e.key is a Thai letter, not "k" (M7)', async () => {
    mount();
    press({ key: 'ๆ', code: 'KeyK', metaKey: true });
    expect(await screen.findByRole('combobox')).toBeTruthy();
  });

  it('opens from the klao:palette event with its query (nav button, FAQ line)', async () => {
    mount();
    act(() => {
      window.dispatchEvent(new CustomEvent('klao:palette', { detail: { query: 'resume' } }));
    });
    const box = (await screen.findByRole('combobox')) as HTMLInputElement;
    expect(box.value).toBe('resume');
  });

  it('opens on "/" unless the visitor is typing in a field', async () => {
    const field = document.createElement('input');
    document.body.appendChild(field);
    mount();
    field.focus();
    act(() => {
      fireEvent.keyDown(field, { key: '/' });
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    press({ key: '/' });
    expect(await screen.findByRole('combobox')).toBeTruthy();
  });

  // M7 (fix wave finding 10): same layout problem as ⌘K above -- the "/" key
  // produces a Thai letter on a Thai layout. e.code's 'Slash' still opens it.
  it('opens on "/" under a Thai keyboard layout, where e.key is a Thai letter, not "/" (M7)', async () => {
    mount();
    press({ key: 'ฟ', code: 'Slash' });
    expect(await screen.findByRole('combobox')).toBeTruthy();
  });

  it('hands focus back to whatever opened it', async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    mount();
    trigger.focus();
    press({ key: 'k', metaKey: true });
    const box = await screen.findByRole('combobox');
    fireEvent.keyDown(box, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
