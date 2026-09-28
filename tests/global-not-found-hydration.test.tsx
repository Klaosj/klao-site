// @vitest-environment jsdom
import { act } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import GlobalNotFound, { GLOBAL_NOT_FOUND_PREPAINT_SCRIPT } from '@/app/global-not-found';
import { dict } from '@/lib/dictionary';
import { THEME_STORAGE_KEY } from '@/lib/theme';

// A real server-render -> pre-paint -> hydrate round trip for the root 404
// (flag-day review m3). tests/not-found.test.tsx pins the <title>'s
// itemProp and suppressHydrationWarning props; this pins what they do. A
// React or Next upgrade could change how either escape hatch hydrates while
// both props stay in place. Mutation-checked:
// - without itemProp, hydration re-writes the title to English;
// - without suppressHydrationWarning on <title>, the text mismatch is a
//   recoverable error (#418). React's client re-render then wipes lang,
//   theme and the Thai copy (P1 again).
// Own file: it replaces the whole document and mocks next/link for every
// test in it.

// Raw `act` from react needs this in Vitest (same as tests/copy-email.test.tsx).
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

// next/link outside Next's app router needs router context this test doesn't
// have; a plain <a> renders the same on server and client, which is all
// hydration needs here.
vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return { default: (props: Record<string, unknown>) => createElement('a', { ...props, prefetch: undefined }) };
});

let root: Root | undefined;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  window.localStorage.clear();
  history.replaceState(null, '', '/');
});

describe('GlobalNotFound hydration (src/app/global-not-found.tsx)', () => {
  it('keeps the Thai title, lang and saved dark theme through hydration, with no recoverable error', async () => {
    // The server HTML, as Next prerenders it once for every 404 path.
    const html = renderToString(<GlobalNotFound />);
    document.documentElement.setAttribute('lang', 'en');
    document.documentElement.innerHTML = /<html[^>]*>([\s\S]*)<\/html>/.exec(html)![1];

    // A Thai visitor with a saved dark theme; innerHTML never runs scripts,
    // so the pre-paint runs here, as the browser would run it before paint.
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    history.replaceState(null, '', '/th/nope');
    new Function(GLOBAL_NOT_FOUND_PREPAINT_SCRIPT)();

    const errors: unknown[] = [];
    await act(async () => {
      root = hydrateRoot(document, <GlobalNotFound />, { onRecoverableError: (e) => errors.push(e) });
    });

    expect(errors).toEqual([]);
    expect(document.title).toBe(`${dict.th.notFoundTitle} · Klao`);
    expect(document.documentElement.lang).toBe('th');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('js')).toBe(true);
  });
});
