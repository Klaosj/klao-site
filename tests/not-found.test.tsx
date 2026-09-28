// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GLOBAL_NOT_FOUND_PREPAINT_SCRIPT, GLOBAL_NOT_FOUND_STYLE } from '@/app/global-not-found';
import { dict } from '@/lib/dictionary';
import { THEME_PREPAINT_SCRIPT, THEME_STORAGE_KEY } from '@/lib/theme';

// No RTL auto-cleanup is wired up in this project (no setupFiles in
// vitest.config.ts) -- same pattern as tests/career-detent.test.tsx and
// friends. Without this, screen.getByText(...) can match leftover nodes from a
// previous test in this file.
afterEach(cleanup);

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

// --- [locale]/not-found.tsx: resolveLocale + NotFoundContent -------------
// Imported normally (this is a Vitest/esbuild module graph, not Next's own
// app-router/Turbopack build -- the two are different pipelines, and only
// the latter turned out to drop extra named exports off route-convention
// files; see NotFoundContent's comment in [locale]/not-found.tsx).
import NestedNotFound, { NotFoundContent, resolveLocale } from '@/app/[locale]/not-found';

describe('resolveLocale (src/app/[locale]/not-found.tsx)', () => {
  it('reads th off a /th/... pathname', () => {
    expect(resolveLocale('/th/nope')).toBe('th');
  });

  it('reads en off a /en/... pathname', () => {
    expect(resolveLocale('/en/nope')).toBe('en');
  });

  it('defaults to en when pathname is null (no router context, e.g. this jsdom test env)', () => {
    expect(resolveLocale(null)).toBe('en');
  });

  it('defaults to en for a segment that is not a recognized locale, rather than passing it through', () => {
    // A defensible default (QA C3's own instruction), not a passthrough of
    // whatever garbage the first path segment happens to contain.
    expect(resolveLocale('/xx/nope')).toBe('en');
  });
});

describe('NotFoundContent (src/app/[locale]/not-found.tsx)', () => {
  it('renders the English title and body from the dictionary, not hardcoded copy', () => {
    render(<NotFoundContent locale="en" />);
    expect(screen.getByText(dict.en.notFoundTitle)).toBeTruthy();
    expect(screen.getByText(dict.en.notFoundBody)).toBeTruthy();
  });

  it('renders the Thai title and body from the dictionary when locale is th', () => {
    render(<NotFoundContent locale="th" />);
    expect(screen.getByText(dict.th.notFoundTitle)).toBeTruthy();
    expect(screen.getByText(dict.th.notFoundBody)).toBeTruthy();
    expect(screen.queryByText(dict.en.notFoundTitle)).toBeNull();
  });

  it('sets a real <title> built from the dictionary, not the site default', () => {
    // React 19 hoists a rendered <title> out to the real document <head>
    // rather than leaving it inside RTL's render container, so this reads
    // from `document`, not `container`.
    render(<NotFoundContent locale="en" />);
    const title = document.querySelector('title');
    expect(title?.textContent).toBe(`${dict.en.notFoundTitle} · Klao`);
  });

  it('sets the Thai <title> when locale is th', () => {
    render(<NotFoundContent locale="th" />);
    const title = document.querySelector('title');
    expect(title?.textContent).toBe(`${dict.th.notFoundTitle} · Klao`);
  });

  it('points the primary CTA at the English home route and labels it from the dictionary', () => {
    const { container } = render(<NotFoundContent locale="en" />);
    const cta = container.querySelector('a.btn') as HTMLAnchorElement;
    expect(cta).toBeTruthy();
    expect(cta.getAttribute('href')).toBe('/en');
    expect(cta.textContent).toContain(dict.en.backHome);
  });

  it('points the primary CTA at the Thai home route when locale is th', () => {
    const { container } = render(<NotFoundContent locale="th" />);
    const cta = container.querySelector('a.btn') as HTMLAnchorElement;
    expect(cta.getAttribute('href')).toBe('/th');
    expect(cta.textContent).toContain(dict.th.backHome);
  });

  it('links to the three real English destination routes, locale-prefixed and dictionary-labeled', () => {
    const { container } = render(<NotFoundContent locale="en" />);
    const hrefs = Array.from(container.querySelectorAll('nav a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/en/projects', '/en/writing', '/en/career']);
    expect(screen.getByText(dict.en.projects)).toBeTruthy();
    expect(screen.getByText(dict.en.writing)).toBeTruthy();
    expect(screen.getByText(dict.en.career)).toBeTruthy();
  });

  it('links to the three real Thai destination routes when a visitor hit a Thai bad path', () => {
    const { container } = render(<NotFoundContent locale="th" />);
    const hrefs = Array.from(container.querySelectorAll('nav a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/th/projects', '/th/writing', '/th/career']);
    expect(screen.getByText(dict.th.projects)).toBeTruthy();
    expect(screen.getByText(dict.th.writing)).toBeTruthy();
    expect(screen.getByText(dict.th.career)).toBeTruthy();
  });

  it('never leaves a visitor with zero links out -- at least four real anchors total', () => {
    // QA C3's core complaint: "zero <a> elements ... a dead end with no
    // route back into the site." Home CTA + three more-links = four.
    const { container } = render(<NotFoundContent locale="en" />);
    expect(container.querySelectorAll('a').length).toBeGreaterThanOrEqual(4);
  });

  it('renders the Thai eyebrow in the Thai font stack, never font-mono (no monospace face carries Thai glyphs)', () => {
    const { container } = render(<NotFoundContent locale="th" />);
    const eyebrow = container.querySelector('p') as HTMLElement;
    expect(eyebrow.className).not.toContain('font-mono');
    expect(eyebrow.className).toContain('font-thai');
  });

  it('keeps the English eyebrow on font-mono, as a positive control for the test above', () => {
    const { container } = render(<NotFoundContent locale="en" />);
    const eyebrow = container.querySelector('p') as HTMLElement;
    expect(eyebrow.className).toContain('font-mono');
    expect(eyebrow.className).not.toContain('font-thai');
  });
});

describe('NotFound default export (src/app/[locale]/not-found.tsx)', () => {
  it('renders the English fallback when there is no router context to read a pathname from (this test env)', () => {
    // usePathname() returns null with no App Router context -- same
    // behavior this codebase's own LocaleToggle.tsx already depends on
    // (verified via tests/site-nav.test.tsx, which renders SiteNav ->
    // LocaleToggle with no next/navigation mock at all).
    render(<NestedNotFound />);
    expect(screen.getByText(dict.en.notFoundTitle)).toBeTruthy();
  });
});

// --- src/app/global-not-found.tsx: the root 404 --------------------------
// Next routes every path that matches no page here, because
// `experimental.globalNotFound` is on in next.config.ts
// (tests/next-config.test.ts pins the flag, and that the old root
// src/app/not-found.tsx stays deleted).
//
// P1 (review, 28 Sep): this page is static, so it can't read the visited
// URL server-side -- it renders BOTH locale copies unconditionally and
// identically on server and client (no hydration content mismatch is even
// possible), and CSS keyed off <html lang> shows only one. `<html lang>`
// itself starts as the server's static "en" and is corrected by the
// pre-paint script, which is the only part of this page that still needs
// the real, client-side URL -- see resolveLocale's own comment for why it
// has no caller left despite being kept exported.
//
// renderToStaticMarkup, not RTL's render(): a component whose root element
// is <html> genuinely cannot nest inside RTL's own container <div> (real
// HTML nesting rules, not a component bug) -- React silently drops the
// <html>/<head>/<body> wrapper and warns "In HTML, <html> cannot be a child
// of <div>", so container.querySelector('html') always misses. Rendering to
// a markup string sidesteps the DOM-nesting question entirely, the same way
// tests/smoke.test.tsx checks full-page server components.
// The first element of `type` in a React element tree, walking props.children
// only (it does not call function components). For hydration-only props that
// renderToStaticMarkup drops from its string output.
function findElement(node: ReactNode, type: string): ReactElement<Record<string, unknown>> | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, type);
      if (found) return found;
    }
    return undefined;
  }
  if (!isValidElement<{ children?: ReactNode }>(node)) return undefined;
  if (node.type === type) return node as ReactElement<Record<string, unknown>>;
  return findElement(node.props.children, type);
}

describe('GlobalNotFound (src/app/global-not-found.tsx)', () => {
  it('sets <html lang="en"> as the static default', async () => {
    const { default: GlobalNotFound } = await import('@/app/global-not-found');
    const html = renderToStaticMarkup(<GlobalNotFound />);
    expect(html).toMatch(/^<html lang="en">/);
  });

  it('sets suppressHydrationWarning on <html> (review I1): the pre-paint script legitimately changes its attributes before hydration, and without this every root 404 logs a React hydration error', async () => {
    const { default: GlobalNotFound } = await import('@/app/global-not-found');
    // Calling the component directly (not via JSX/render) inspects the real
    // React element's props -- renderToStaticMarkup strips this attribute
    // from its string output entirely (it's a hydration-only hint, invisible
    // to any HTML serialization), so only this technique can pin it.
    const element = GlobalNotFound();
    expect(element.type).toBe('html');
    expect(element.props.suppressHydrationWarning).toBe(true);
  });

  it('renders BOTH locale copies unconditionally (P1) -- English and Thai title/body text are both present, each under its own data-gnf-locale wrapper', async () => {
    const { default: GlobalNotFound } = await import('@/app/global-not-found');
    const html = renderToStaticMarkup(<GlobalNotFound />);
    expect(html).toContain('data-gnf-locale="en"');
    expect(html).toContain('data-gnf-locale="th"');
    expect(html).toContain(dict.en.notFoundTitle);
    expect(html).toContain(dict.en.notFoundBody);
    expect(html).toContain(dict.th.notFoundTitle);
    expect(html).toContain(dict.th.notFoundBody);
  });

  it('gives each locale copy its own locale-prefixed nav links, three per copy', async () => {
    const { default: GlobalNotFound } = await import('@/app/global-not-found');
    const html = renderToStaticMarkup(<GlobalNotFound />);
    const hrefs = [...html.matchAll(/<nav[^>]*>[\s\S]*?<\/nav>/g)]
      .flatMap((m) => [...m[0].matchAll(/href="([^"]+)"/g)])
      .map((m) => m[1]);
    expect(hrefs).toEqual(['/en/projects', '/en/writing', '/en/career', '/th/projects', '/th/writing', '/th/career']);
  });

  it('renders exactly one <title>, the static English default (the pre-paint script swaps in the Thai one, below)', async () => {
    const { default: GlobalNotFound } = await import('@/app/global-not-found');
    const html = renderToStaticMarkup(<GlobalNotFound />);
    expect(html.match(/<title[\s>]/g)).toHaveLength(1);
    expect(html).toContain(`>${dict.en.notFoundTitle} · Klao</title>`);
  });

  it('keeps the pre-paint Thai title past hydration (review n1): itemProp opts the <title> out of React hoisting, suppressHydrationWarning keeps the browser text', async () => {
    const { default: GlobalNotFound } = await import('@/app/global-not-found');
    // A hoisted <title> is re-written from its props when React hydrates,
    // which put the English title back on /th/ paths (seen in dev, 28 Sep).
    // Both props are hydration-only hints, so pin them on the element.
    const title = findElement(GlobalNotFound(), 'title');
    expect(title?.props.itemProp).toBe('name');
    expect(title?.props.suppressHydrationWarning).toBe(true);
  });

  it('inlines the CSS selection rule (P1): hides both copies by default and shows only the one matching <html lang>, via display:none/contents -- never visibility (which would still expose the hidden copy to assistive tech)', async () => {
    const { default: GlobalNotFound } = await import('@/app/global-not-found');
    const html = renderToStaticMarkup(<GlobalNotFound />);
    const head = /<head>([\s\S]*?)<\/head>/.exec(html)?.[1] ?? '';
    expect(head).toContain(`<style>${GLOBAL_NOT_FOUND_STYLE}</style>`);
    expect(GLOBAL_NOT_FOUND_STYLE).toContain('[data-gnf-locale]{display:none}');
    expect(GLOBAL_NOT_FOUND_STYLE).toContain('html[lang="en"] [data-gnf-locale="en"]');
    expect(GLOBAL_NOT_FOUND_STYLE).toContain('html[lang="th"] [data-gnf-locale="th"]');
    expect(GLOBAL_NOT_FOUND_STYLE).not.toContain('visibility');
  });

  it('shows the copy matching <html lang> and hides the other (review n2): the rule applied, not just its selectors present', () => {
    // jsdom cascades <style> rules into getComputedStyle, so this catches
    // a rule that names the right selectors but shows nothing (for
    // example `display:none` on the matching copy: a blank Thai 404).
    const style = document.createElement('style');
    style.textContent = GLOBAL_NOT_FOUND_STYLE;
    document.head.appendChild(style);
    const host = document.createElement('div');
    host.innerHTML = '<div data-gnf-locale="en"></div><div data-gnf-locale="th"></div>';
    document.body.appendChild(host);
    const display = (l: string) =>
      getComputedStyle(host.querySelector(`[data-gnf-locale="${l}"]`) as HTMLElement).display;
    try {
      document.documentElement.lang = 'th';
      expect([display('en'), display('th')]).toEqual(['none', 'contents']);
      document.documentElement.lang = 'en';
      expect([display('en'), display('th')]).toEqual(['contents', 'none']);
    } finally {
      style.remove();
      host.remove();
      document.documentElement.removeAttribute('lang');
    }
  });

  it('inlines the pre-paint script inside a real <head>', async () => {
    const { default: GlobalNotFound } = await import('@/app/global-not-found');
    const html = renderToStaticMarkup(<GlobalNotFound />);
    const head = /<head>([\s\S]*?)<\/head>/.exec(html)?.[1] ?? '';
    expect(head).toContain(`<script>${GLOBAL_NOT_FOUND_PREPAINT_SCRIPT}</script>`);
  });
});

describe('GLOBAL_NOT_FOUND_PREPAINT_SCRIPT (src/app/global-not-found.tsx)', () => {
  // Same document.documentElement the pre-paint script runs against; reset
  // between tests since it carries `lang`/`class`/`data-theme` state.
  const root = document.documentElement;
  const run = () => new Function(GLOBAL_NOT_FOUND_PREPAINT_SCRIPT)();

  afterEach(() => {
    root.removeAttribute('lang');
    root.removeAttribute('data-theme');
    root.classList.remove('js');
    window.localStorage.clear();
    history.replaceState(null, '', '/');
    document.querySelectorAll('title').forEach((t) => t.remove());
  });

  it('starts with THEME_PREPAINT_SCRIPT verbatim (review n3): composed, not re-typed, so a change to the theme logic reaches this page too', () => {
    expect(GLOBAL_NOT_FOUND_PREPAINT_SCRIPT.startsWith(THEME_PREPAINT_SCRIPT)).toBe(true);
  });

  it('sets lang="th" from a /th/... pathname, before paint (P1)', () => {
    history.replaceState(null, '', '/th/nope');
    run();
    expect(root.lang).toBe('th');
  });

  it('sets lang="en" from a /en/... pathname', () => {
    history.replaceState(null, '', '/en/nope');
    run();
    expect(root.lang).toBe('en');
  });

  it('sets the Thai tab title from the dictionary on a /th/... path (review n1)', () => {
    history.replaceState(null, '', '/th/nope');
    run();
    expect(document.title).toBe(`${dict.th.notFoundTitle} · Klao`);
  });

  it('leaves the tab title alone on an /en/... path, where the static English <title> is already right', () => {
    document.title = 'static title';
    history.replaceState(null, '', '/en/nope');
    run();
    expect(document.title).toBe('static title');
  });

  it('defaults to lang="en" for a path with no recognizable locale segment', () => {
    history.replaceState(null, '', '/qa-missing-page');
    run();
    expect(root.lang).toBe('en');
  });

  it('still marks <html> with `js` and applies a saved theme, same as THEME_PREPAINT_SCRIPT', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    history.replaceState(null, '', '/th/nope');
    run();
    expect(root.classList.contains('js')).toBe(true);
    expect(root.getAttribute('data-theme')).toBe('dark');
  });

  it('does not throw when storage is blocked, and still sets lang', () => {
    const realDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')!;
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });
    history.replaceState(null, '', '/th/nope');
    expect(run).not.toThrow();
    expect(root.lang).toBe('th');
    Object.defineProperty(window, 'localStorage', realDescriptor);
  });
});

describe('resolveLocale (src/app/global-not-found.tsx)', () => {
  // Kept exported per PR9 even though GlobalNotFound no longer calls it
  // (P1 replaced per-request locale selection with rendering both copies
  // unconditionally) -- these are its own unit tests, the reason PR9 keeps
  // a pure helper around at all.
  it('reads th off a /th/... pathname', async () => {
    const { resolveLocale } = await import('@/app/global-not-found');
    expect(resolveLocale('/th/nope')).toBe('th');
  });

  it('reads en off a /en/... pathname', async () => {
    const { resolveLocale } = await import('@/app/global-not-found');
    expect(resolveLocale('/en/nope')).toBe('en');
  });

  it('defaults to en for null or an unrecognized locale segment', async () => {
    const { resolveLocale } = await import('@/app/global-not-found');
    expect(resolveLocale(null)).toBe('en');
    expect(resolveLocale('/xx/nope')).toBe('en');
  });
});
