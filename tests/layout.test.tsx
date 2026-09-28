import { readFileSync, statSync } from 'node:fs';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import RootLayout from '@/app/[locale]/layout';
import PaletteHost from '@/components/palette/PaletteHost';
import { getCareer, getFaq, getFeaturedProjects, getProfile } from '@/lib/content';
import { buildPaletteIndex } from '@/lib/palette-index';
import { THEME_PREPAINT_SCRIPT } from '@/lib/theme';

// RootLayout is an async server component; awaiting it returns the element
// tree without rendering SiteNav/SiteFooter (they stay unexpanded elements),
// which is all these tests need: the <html> props and what sits in <head>.
type Props = {
  children?: ReactNode;
  className?: string;
  lang?: string;
  suppressHydrationWarning?: boolean;
  dangerouslySetInnerHTML?: { __html: string };
  rel?: string;
  href?: string;
  as?: string;
  type?: string;
  crossOrigin?: string;
  // PaletteHost's props (T18-c, CO-25).
  entries?: unknown;
  faq?: unknown;
  email?: string;
  locale?: string;
};

function childrenOf(el: ReactElement<Props>): ReactElement<Props>[] {
  const kids: ReactNode[] = [];
  const add = (n: ReactNode) => {
    if (Array.isArray(n)) n.forEach(add);
    else kids.push(n);
  };
  add(el.props.children);
  return kids.filter((k): k is ReactElement<Props> => isValidElement(k));
}

async function renderLayout(locale: 'en' | 'th') {
  return (await RootLayout({
    children: null,
    params: Promise.resolve({ locale }),
  })) as ReactElement<Props>;
}

async function headOf(locale: 'en' | 'th') {
  const head = childrenOf(await renderLayout(locale)).find((c) => c.type === 'head');
  if (!head) throw new Error('RootLayout rendered no <head>');
  return childrenOf(head);
}

describe('RootLayout: theme pre-paint', () => {
  it('puts the pre-paint script first in <head>, verbatim', async () => {
    const [first] = await headOf('en');
    expect(first.type).toBe('script');
    expect(first.props.dangerouslySetInnerHTML?.__html).toBe(THEME_PREPAINT_SCRIPT);
  });

  it('suppresses the <html> hydration warning the pre-paint attributes would cause', async () => {
    const html = await renderLayout('th');
    expect(html.type).toBe('html');
    expect(html.props.lang).toBe('th');
    expect(html.props.suppressHydrationWarning).toBe(true);
  });
});

describe('RootLayout: fonts', () => {
  it('preloads the Thai face with the CORS mode fonts are fetched in', async () => {
    const link = (await headOf('th')).find((c) => c.type === 'link');
    expect(link?.props).toMatchObject({
      rel: 'preload',
      href: '/fonts/anuphan-thai.woff2',
      as: 'font',
      type: 'font/woff2',
      crossOrigin: 'anonymous',
    });
  });

  it('uses no next/font at all (no Space Grotesk, no Google download at build)', () => {
    const src = readFileSync('src/app/[locale]/layout.tsx', 'utf8');
    expect(src).not.toMatch(/from 'next\/font|Space_Grotesk/);
  });

  it('ships the vendored Thai subset as a real woff2 well under the asset budget, with its OFL licence', () => {
    const font = readFileSync('public/fonts/anuphan-thai.woff2');
    expect(font.subarray(0, 4).toString('latin1')).toBe('wOF2');
    expect(statSync('public/fonts/anuphan-thai.woff2').size).toBeLessThan(40 * 1024);
    expect(readFileSync('public/fonts/OFL.txt', 'utf8')).toContain('SIL Open Font License');
  });
});

// T18-c (CO-25, P4 T14 minor): the one place ⌘K gets its data is this mount.
// It is built on the server from the same cache()-wrapped getters the page
// uses (fixtures here: no NOTION_TOKEN in tests), so each prop is compared
// with what those getters give for the same locale -- a hard-coded locale,
// an empty FAQ, a blank email or an index built for the other language
// fails here instead of only in a browser.
describe('RootLayout: ⌘K palette host', () => {
  it.each(['en', 'th'] as const)('mounts PaletteHost with the %s index, the FAQ and the profile email', async (locale) => {
    const body = childrenOf(await renderLayout(locale)).find((c) => c.type === 'body');
    const host = body && childrenOf(body).find((c) => c.type === PaletteHost);
    if (!host) throw new Error('RootLayout rendered no PaletteHost in <body>');
    const [profile, projects, career, faq] = await Promise.all([getProfile(), getFeaturedProjects(), getCareer(), getFaq()]);
    expect(profile.email).not.toBe('');
    expect(faq.length).toBeGreaterThan(0);
    expect(host.props).toEqual({
      entries: buildPaletteIndex({ profile, projects, career, faq }, locale),
      faq,
      email: profile.email,
      locale,
    });
  });
});
