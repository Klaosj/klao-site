// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dict } from '@/lib/dictionary';
import { THEME_PREPAINT_SCRIPT } from '@/lib/theme';

// No RTL auto-cleanup is wired up in this project (no setupFiles in
// vitest.config.ts) -- same pattern as tests/cv-band.test.tsx and friends.
// Without this, screen.getByText(...) can match leftover nodes from a
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
// files; see src/app/not-found.tsx's comment for the full story).
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

// --- src/app/not-found.tsx: the root boundary -----------------------------
// This is the file that actually fires for a genuinely unmatched path (see
// its own top-of-file comment) -- e.g. /en/nope, /th/nope, and a bare /nope
// once middleware's redirect resolves. It duplicates NotFoundContent's
// markup rather than importing it (a real Turbopack limitation hit while
// building this fix), and it has no `locale` prop to inject -- so, unlike
// NotFoundContent above, exercising both locale branches here means mocking
// usePathname() rather than passing a prop.
const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn<() => string | null>() }));
vi.mock('next/navigation', () => ({ usePathname }));

describe('RootNotFound (src/app/not-found.tsx)', () => {
  afterEach(() => {
    document.documentElement.lang = '';
  });

  it('renders Thai copy and Thai-prefixed links when the URL that 404d was /th/...', async () => {
    usePathname.mockReturnValue('/th/nope');
    const { default: RootNotFound } = await import('@/app/not-found');
    const { container } = render(<RootNotFound />);
    expect(screen.getByText(dict.th.notFoundTitle)).toBeTruthy();
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/th', '/th/projects', '/th/writing', '/th/career']);
  });

  it('renders English copy and English-prefixed links when the URL that 404d was /en/...', async () => {
    usePathname.mockReturnValue('/en/nope');
    const { default: RootNotFound } = await import('@/app/not-found');
    const { container } = render(<RootNotFound />);
    expect(screen.getByText(dict.en.notFoundTitle)).toBeTruthy();
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/en', '/en/projects', '/en/writing', '/en/career']);
  });

  it('falls back to English -- a defensible default -- when the path carries no recognizable locale at all', async () => {
    // Covers both the null case (no pathname available) and a genuinely
    // unrecognized first segment (e.g. a dotted static-file-shaped path
    // that bypassed middleware's locale redirect).
    usePathname.mockReturnValue(null);
    const { default: RootNotFound } = await import('@/app/not-found');
    render(<RootNotFound />);
    expect(screen.getByText(dict.en.notFoundTitle)).toBeTruthy();
  });

  it('corrects document.documentElement.lang client-side to match the resolved locale', async () => {
    // The mitigation for the one gap this fix could not close within its
    // file-ownership constraints: Next wraps this root boundary in its own
    // internal, un-lang'd shell (verified against the running dev server;
    // no src/app/layout.tsx exists in this project for this file to be
    // wrapped by instead, and adding one is out of scope here). This
    // effect is what actually corrects <html lang> for real, JS-enabled
    // visitors after hydration.
    usePathname.mockReturnValue('/th/nope');
    const { default: RootNotFound } = await import('@/app/not-found');
    render(<RootNotFound />);
    expect(document.documentElement.lang).toBe('th');
  });

  it('sets documentElement.lang to en for the English case, not left over from a previous test', async () => {
    usePathname.mockReturnValue('/en/nope');
    const { default: RootNotFound } = await import('@/app/not-found');
    render(<RootNotFound />);
    expect(document.documentElement.lang).toBe('en');
  });

  it('renders the Thai eyebrow in the Thai font stack, never font-mono', async () => {
    usePathname.mockReturnValue('/th/nope');
    const { default: RootNotFound } = await import('@/app/not-found');
    const { container } = render(<RootNotFound />);
    const eyebrow = container.querySelector('p') as HTMLElement;
    expect(eyebrow.className).not.toContain('font-mono');
    expect(eyebrow.className).toContain('font-thai');
  });

  it('carries a real <title> built from the dictionary', async () => {
    usePathname.mockReturnValue('/en/nope');
    const { default: RootNotFound } = await import('@/app/not-found');
    render(<RootNotFound />);
    const title = document.querySelector('title');
    expect(title?.textContent).toBe(`${dict.en.notFoundTitle} · Klao`);
  });

  it('inlines the theme pre-paint script (N9/CO-13): this boundary has no <head> of its own -- Next wraps it in a layout-less shell (see the top-of-file comment) -- so a saved dark/light choice would otherwise only take effect after hydration, a frame too late for "no flash of the wrong theme"', async () => {
    usePathname.mockReturnValue('/en/nope');
    const { default: RootNotFound } = await import('@/app/not-found');
    const { container } = render(<RootNotFound />);
    const script = container.querySelector('script');
    expect(script?.innerHTML).toBe(THEME_PREPAINT_SCRIPT);
  });

  it('renders the pre-paint script before the visible content, so it runs first', async () => {
    usePathname.mockReturnValue('/en/nope');
    const { default: RootNotFound } = await import('@/app/not-found');
    const { container } = render(<RootNotFound />);
    expect(container.firstElementChild?.tagName).toBe('SCRIPT');
  });
});

// --- src/app/global-not-found.tsx: not wired up yet ----------------------
// Only loads once `experimental.globalNotFound` is set in next.config.ts
// (out of this lane's ownership -- see the P5 lane-A report's Merge notes).
// Tested here anyway so the component itself is covered and doesn't bit-rot
// before that flag lands: unlike not-found.tsx, this file supplies its own
// <html>/<body>, so `lang` is correct on the very first render -- no
// post-hydration useEffect correction needed (verified against a real
// cold `next dev` with the flag on locally, then reverted -- see the report).
//
// renderToStaticMarkup, not RTL's render(): a component whose root element
// is <html> genuinely cannot nest inside RTL's own container <div> (real
// HTML nesting rules, not a component bug) -- React silently drops the
// <html>/<head>/<body> wrapper and warns "In HTML, <html> cannot be a child
// of <div>", so container.querySelector('html') always misses. Rendering to
// a markup string sidesteps the DOM-nesting question entirely, the same way
// tests/smoke.test.tsx checks full-page server components.
describe('GlobalNotFound (src/app/global-not-found.tsx)', () => {
  it('sets <html lang> directly from the URL, with no correction effect needed', async () => {
    usePathname.mockReturnValue('/th/nope');
    const { default: GlobalNotFound } = await import('@/app/global-not-found');
    const html = renderToStaticMarkup(<GlobalNotFound />);
    expect(html).toMatch(/^<html lang="th">/);
  });

  it('sets <html lang="en"> for the English case', async () => {
    usePathname.mockReturnValue('/en/nope');
    const { default: GlobalNotFound } = await import('@/app/global-not-found');
    const html = renderToStaticMarkup(<GlobalNotFound />);
    expect(html).toMatch(/^<html lang="en">/);
  });

  it('sets suppressHydrationWarning on <html> (review I1): THEME_PREPAINT_SCRIPT legitimately changes its attributes before hydration, and without this every root 404 logged a React hydration error once the flag was on', async () => {
    usePathname.mockReturnValue('/en/nope');
    const { default: GlobalNotFound } = await import('@/app/global-not-found');
    // Calling the component directly (not via JSX/render) inspects the real
    // React element's props -- renderToStaticMarkup strips this attribute
    // from its string output entirely (it's a hydration-only hint, invisible
    // to any HTML serialization), so only this technique can pin it.
    const element = GlobalNotFound();
    expect(element.type).toBe('html');
    expect(element.props.suppressHydrationWarning).toBe(true);
  });

  it('inlines the same theme pre-paint script inside a real <head>', async () => {
    usePathname.mockReturnValue('/en/nope');
    const { default: GlobalNotFound } = await import('@/app/global-not-found');
    const html = renderToStaticMarkup(<GlobalNotFound />);
    const head = /<head>([\s\S]*?)<\/head>/.exec(html)?.[1] ?? '';
    expect(head).toContain(`<script>${THEME_PREPAINT_SCRIPT}</script>`);
  });

  it('renders the Thai title and body copy for a /th/... path that matched nothing', async () => {
    usePathname.mockReturnValue('/th/nope');
    const { default: GlobalNotFound } = await import('@/app/global-not-found');
    const html = renderToStaticMarkup(<GlobalNotFound />);
    expect(html).toContain(`<title>${dict.th.notFoundTitle} · Klao</title>`);
    expect(html).toContain(dict.th.notFoundBody);
  });

  it('links to the three real English destination routes, locale-prefixed', async () => {
    usePathname.mockReturnValue('/en/nope');
    const { default: GlobalNotFound } = await import('@/app/global-not-found');
    const html = renderToStaticMarkup(<GlobalNotFound />);
    const hrefs = [...html.matchAll(/<nav[^>]*>[\s\S]*?<\/nav>/g)]
      .flatMap((m) => [...m[0].matchAll(/href="([^"]+)"/g)])
      .map((m) => m[1]);
    expect(hrefs).toEqual(['/en/projects', '/en/writing', '/en/career']);
  });

  it('falls back to English when the path carries no recognizable locale', async () => {
    usePathname.mockReturnValue(null);
    const { default: GlobalNotFound } = await import('@/app/global-not-found');
    const html = renderToStaticMarkup(<GlobalNotFound />);
    expect(html).toMatch(/^<html lang="en">/);
  });
});
