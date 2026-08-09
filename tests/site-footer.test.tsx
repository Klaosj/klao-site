import { describe, expect, it, vi } from 'vitest';
import type { Profile } from '@/lib/models';

// Mirrors tests/career-resume.test.tsx's pattern: getProfile is mocked so
// this file doesn't depend on the real fixture's name string, and the
// module is dynamically imported after the mock is registered so
// SiteFooter's module graph always resolves the mocked version.
const testProfile: Profile = {
  name: 'Test Person',
  headline: { en: 'Headline EN', th: 'Headline TH' },
  byline: { en: 'Byline EN', th: 'Byline TH' },
  now: { en: 'Now EN', th: 'Now TH' },
  photoSrc: null,
  linkedin: 'https://linkedin.example/test',
  github: 'https://github.example/test',
  email: 'test@example.com',
  resumeUrl: null,
  clients: [],
};

vi.mock('@/lib/content', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/content')>();
  return { ...actual, getProfile: async () => testProfile };
});

type El = { type: unknown; props?: { children?: unknown; className?: unknown } };
function isEl(x: unknown): x is El {
  return typeof x === 'object' && x !== null && 'props' in x;
}
function collectText(node: unknown, acc: string[] = []): string[] {
  if (node == null || typeof node === 'boolean') return acc;
  if (typeof node === 'string' || typeof node === 'number') {
    acc.push(String(node));
    return acc;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectText(child, acc);
    return acc;
  }
  if (isEl(node)) collectText(node.props?.children, acc);
  return acc;
}

describe('SiteFooter', () => {
  it("renders the copyright line with the real profile name, not invented copy", async () => {
    const { default: SiteFooter } = await import('@/components/SiteFooter');
    const jsx = await SiteFooter();
    const text = collectText(jsx).join(' ');
    expect(text).toContain('Test Person');
    expect(text).toContain(String(new Date().getFullYear()));
  });

  it('carries the dark treatment (bg-deep, a top hairline) and nothing else', async () => {
    const { default: SiteFooter } = await import('@/components/SiteFooter');
    const jsx = (await SiteFooter()) as El;
    expect(jsx.props?.className).toContain('bg-deep');
    expect(jsx.props?.className).toContain('border-t');
  });

  it('defaults to the English (font-mono) treatment when no locale is passed, so existing callers are unaffected', async () => {
    const { default: SiteFooter } = await import('@/components/SiteFooter');
    const jsx = (await SiteFooter()) as El;
    const p = jsx.props?.children as El;
    expect(p.props?.className).toContain('font-mono');
    expect(p.props?.className).not.toContain('font-thai');
  });

  it('switches the copyright line to the Thai font stack with normal tracking when locale is th', async () => {
    // Regression test: no monospace face carries Thai glyphs (whole-branch
    // review finding). profile.name is a plain, locale-invariant string
    // (always Latin today, per src/lib/models.ts), so this doesn't change
    // what text renders -- only that the treatment now follows the same
    // locale convention as every other eyebrow-style label in the
    // redesign, via the same `eyebrowFont` helper.
    const { default: SiteFooter } = await import('@/components/SiteFooter');
    const jsx = (await SiteFooter({ locale: 'th' })) as El;
    const p = jsx.props?.children as El;
    expect(p.props?.className).not.toContain('font-mono');
    expect(p.props?.className).not.toMatch(/tracking-\[/);
    expect(p.props?.className).toContain('font-thai');
  });

  it('renders no links at all -- nothing to leak a dead href', async () => {
    const { default: SiteFooter } = await import('@/components/SiteFooter');
    const jsx = await SiteFooter();
    const links: El[] = [];
    const find = (node: unknown) => {
      if (node == null || typeof node === 'boolean') return;
      if (Array.isArray(node)) return node.forEach(find);
      if (isEl(node)) {
        if (node.type === 'a') links.push(node);
        find(node.props?.children);
      }
    };
    find(jsx);
    expect(links).toHaveLength(0);
  });
});
