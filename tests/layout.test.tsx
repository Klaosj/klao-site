import { readFileSync, statSync } from 'node:fs';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import RootLayout from '@/app/[locale]/layout';
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
