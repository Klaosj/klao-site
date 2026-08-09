import { describe, it, expect, vi } from 'vitest';
import type { Locale, Profile } from '@/lib/models';

// profile.resumeUrl is null in every fixture (src/content/fixtures/profile.json),
// so the resume-link branch in career/page.tsx has never executed anywhere --
// not in a build, not in a test, not on screen. Isolated in its own file
// (mirrors tests/content-isr.test.ts) so this module mock of '@/lib/content'
// never leaks into the real-fixture assertions in other test files, and the
// mocked module is dynamically imported so the mock is guaranteed to be in
// place before career/page.tsx's module graph resolves it.

const nonNullProfile: Profile = {
  name: 'Test Person',
  headline: { en: 'Headline EN', th: 'Headline TH' },
  byline: { en: 'Byline EN', th: 'Byline TH' },
  now: { en: 'Now EN', th: 'Now TH' },
  photoSrc: null,
  linkedin: 'https://linkedin.example/test',
  github: 'https://github.example/test',
  email: 'test@example.com',
  resumeUrl: 'https://files.example.com/klao-resume.pdf',
  clients: [],
};
const nullProfile: Profile = { ...nonNullProfile, resumeUrl: null };

// `getProfile` reads this fresh on every call, so switching it between tests
// doesn't need vi.resetModules()/vi.doMock() gymnastics -- just set it
// before calling CareerPage.
let currentProfile: Profile = nonNullProfile;

vi.mock('@/lib/content', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/content')>();
  return { ...actual, getProfile: async () => currentProfile };
});

type El = { type: unknown; props?: { children?: unknown; href?: unknown } };
function isEl(x: unknown): x is El {
  return typeof x === 'object' && x !== null && 'props' in x;
}
function findAll(node: unknown, pred: (el: El) => boolean, acc: El[] = []): El[] {
  if (node == null || typeof node === 'boolean') return acc;
  if (Array.isArray(node)) {
    for (const child of node) findAll(child, pred, acc);
    return acc;
  }
  if (isEl(node)) {
    if (pred(node)) acc.push(node);
    findAll(node.props?.children, pred, acc);
  }
  return acc;
}

describe('career page resume link', () => {
  it('renders an <a> with the exact resumeUrl href when profile.resumeUrl is non-null', async () => {
    currentProfile = nonNullProfile;
    const { default: CareerPage } = await import('@/app/[locale]/career/page');
    const jsx = await CareerPage({ params: Promise.resolve({ locale: 'en' as Locale }) });

    const links = findAll(jsx, (el) => el.type === 'a');
    const resumeLink = links.find((el) => el.props?.href === nonNullProfile.resumeUrl);

    // Assert the href, not just that "something" rendered -- a typo in the
    // markup (e.g. missing href, wrong prop name) fails this.
    expect(
      resumeLink,
      `expected an <a href="${nonNullProfile.resumeUrl}"> among: ${JSON.stringify(links.map((l) => l.props?.href))}`,
    ).toBeTruthy();
  });

  it('omits the resume link entirely when profile.resumeUrl is null (the actual fixture value)', async () => {
    // Task 10 review Minor #9: the fixture-mode smoke tests exercise
    // resumeUrl: null on every page render (it's the fixture default) but
    // never assert anything about it -- so dropping the `resumeUrl &&`
    // guard in career/page.tsx entirely (rendering an <a href={null}> or
    // similar) would pass the whole suite. This asserts the negative
    // directly: no resume-shaped link exists when resumeUrl is null.
    currentProfile = nullProfile;
    const { default: CareerPage } = await import('@/app/[locale]/career/page');
    const jsx = await CareerPage({ params: Promise.resolve({ locale: 'en' as Locale }) });

    const links = findAll(jsx, (el) => el.type === 'a');
    expect(links.some((el) => el.props?.href === nonNullProfile.resumeUrl)).toBe(false);
    // Stronger than "not that specific URL": no <a> anywhere has a falsy or
    // empty href, which is what `{null && <a href={resumeUrl}>}` degrading
    // to an always-rendered anchor would look like instead of being absent.
    expect(links.every((el) => typeof el.props?.href === 'string' && el.props.href.length > 0)).toBe(true);
  });
});
