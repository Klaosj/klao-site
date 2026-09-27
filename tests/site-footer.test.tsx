// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import careerFixture from '@/content/fixtures/career.json';
import profileFixture from '@/content/fixtures/profile.json';
import projectsFixture from '@/content/fixtures/projects.json';
import { dict } from '@/lib/dictionary';
import type { CareerEntry, OpenQuestion, PostMeta, Profile, Project } from '@/lib/models';
import { projectKey, sheetHash } from '@/lib/sheet-url';
import { stubMatchMedia } from './helpers/media';

const projects = (projectsFixture as Project[]).filter((p) => p.featured).sort((a, b) => a.order - b.order);
const career = careerFixture as CareerEntry[];
let mockProfile: Profile = profileFixture as Profile;
let mockPosts: PostMeta[] = [];
let mockQuestions: OpenQuestion[] = [];

vi.mock('@/lib/content', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/content')>();
  return {
    ...actual,
    getProfile: async () => mockProfile,
    getFeaturedProjects: async () => projects,
    getCareer: async () => career,
    getPosts: async () => mockPosts,
    getQuestions: async () => mockQuestions,
  };
});
vi.mock('next/navigation', () => ({ usePathname: () => '/en/projects' }));
// P0 owns ThemeToggle and its tests; here it only has to be mounted.
vi.mock('@/components/ThemeToggle', async () => {
  const { createElement } = await import('react');
  return { default: () => createElement('div', { 'data-testid': 'theme-toggle' }) };
});

beforeEach(() => {
  stubMatchMedia();
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  mockProfile = profileFixture as Profile;
  mockPosts = [];
  mockQuestions = [];
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

async function renderFooter(locale: 'en' | 'th' = 'en') {
  const { default: SiteFooter } = await import('@/components/SiteFooter');
  return render(await SiteFooter({ locale }));
}

describe('SiteFooter', () => {
  it('has three link columns — Projects, Career, Elsewhere — and nothing else as a column (spec §10)', async () => {
    await renderFooter();
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    // C1: footProjects/footCareer are duplicate keys of navWork/navCareer
    // (dropped from the dictionary) -- footElsewhere has no such duplicate
    // and keeps its own key.
    expect(headings).toEqual([dict.en.navWork, dict.en.navCareer, dict.en.footElsewhere]);
  });

  it('links to the full projects listing, then every featured project to its sheet with a plain hash URL', async () => {
    await renderFooter();
    // C12 ledger ruling: the footer links the standalone /projects page
    // ("All projects") but not /writing (no posts yet) -- reusing the same
    // allProjects key WorkDeck's own "All projects" CTA uses.
    const all = screen.getByRole('link', { name: dict.en.allProjects });
    expect(all.getAttribute('href')).toBe('/en/projects');
    for (const p of projects) {
      expect(screen.getByRole('link', { name: p.name }).getAttribute('href')).toBe(`/en${sheetHash(projectKey(p))}`);
    }
  });

  it('links every employer to the Career band and opens that pill in place', async () => {
    document.body.insertAdjacentHTML('beforeend', '<section id="career"><h2>Career</h2></section>');
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const heard = vi.fn();
    window.addEventListener('klao:career', heard);
    await renderFooter();
    for (const c of career) {
      expect(screen.getByRole('link', { name: c.company }).getAttribute('href')).toBe('/en#career');
    }
    fireEvent.click(screen.getByRole('link', { name: career[0].company }));
    expect((heard.mock.calls[0][0] as CustomEvent).detail).toEqual({ key: career[0].key });
    window.removeEventListener('klao:career', heard);
  });

  it('skips a career row with no key (P2 S-7 / ledger ruling) instead of rendering a dead link', async () => {
    const keyless: CareerEntry = { ...career[0], id: 'fx-keyless', key: '', company: 'No Key Co' };
    const contentModule = await import('@/lib/content');
    vi.spyOn(contentModule, 'getCareer').mockResolvedValueOnce([...career, keyless]);
    await renderFooter();
    expect(screen.queryByText('No Key Co')).toBeNull();
  });

  // Fix wave finding 1 (Important, gate item 1): a project with a Thai-only
  // name and no Notion Slug gives projectKey('') -- sheetHash('') is the
  // unparseable '#work/'. Dropped from the column instead of shown as a dead
  // link, same S-7 treatment as the career row above.
  it('skips a project with no slug and a Thai-only name (S-7) instead of a dead #work/ link', async () => {
    const slugless: Project = { ...projects[0], id: 'fx-slugless', slug: null, name: 'ร้านขนมจีบ' };
    const contentModule = await import('@/lib/content');
    vi.spyOn(contentModule, 'getFeaturedProjects').mockResolvedValueOnce([...projects, slugless]);
    await renderFooter();
    expect(screen.queryByText('ร้านขนมจีบ')).toBeNull();
    // Every other featured project still links normally.
    for (const p of projects) {
      expect(screen.getByRole('link', { name: p.name }).getAttribute('href')).toBe(`/en${sheetHash(projectKey(p))}`);
    }
  });

  it('opens LinkedIn, GitHub and the résumé in a new tab, and drops what is missing', async () => {
    await renderFooter();
    for (const [name, href] of [
      ['LinkedIn', mockProfile.linkedin],
      ['GitHub', mockProfile.github],
      [dict.en.resumeShort, mockProfile.resumeUrl],
    ] as const) {
      const link = screen.getByRole('link', { name });
      expect(link.getAttribute('href')).toBe(href);
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toContain('noreferrer');
    }
    cleanup();
    mockProfile = { ...(profileFixture as Profile), resumeUrl: null };
    await renderFooter();
    expect(screen.queryByRole('link', { name: dict.en.resumeShort })).toBeNull();
  });

  it('mounts Appearance (ThemeToggle) and Language (LocaleToggle), keeping the current page', async () => {
    await renderFooter();
    expect(screen.getByText(dict.en.appearance)).toBeTruthy();
    expect(screen.getByTestId('theme-toggle')).toBeTruthy();
    // C2: LocaleToggle derives its own group label from the mocked
    // pathname's locale segment ('/en/projects' -> dict.en.navLanguage).
    const lang = screen.getByRole('group', { name: dict.en.navLanguage });
    expect(within(lang).getByRole('link', { name: 'EN' }).getAttribute('href')).toBe('/en/projects');
    expect(within(lang).getByRole('link', { name: 'EN' }).getAttribute('aria-current')).toBe('page');
    expect(within(lang).getByRole('link', { name: 'ไทย' }).getAttribute('href')).toBe('/th/projects');
  });

  it('carries the legal line: © year + name, then the human line', async () => {
    const { container } = await renderFooter();
    expect(container.textContent).toContain(`© ${new Date().getFullYear()} ${mockProfile.name}`);
    expect(container.textContent).toContain('Built at night, powered by good coffee.');
    cleanup();
    const th = await renderFooter('th');
    expect(th.container.textContent).toContain('สร้างตอนกลางคืน ด้วยกาแฟดีๆ');
  });

  it('adds the honest freshness date only when dated content exists', async () => {
    const empty = await renderFooter();
    expect(empty.container.textContent).not.toContain(dict.en.contentUpdated);
    cleanup();
    mockPosts = [{ id: 'p1', slug: 's', title: { en: 'T', th: 'T' }, date: '2026-07-01', tags: [] }];
    mockQuestions = [
      { id: 'q1', question: { en: 'Q?', th: 'Q?' }, status: 'wondering', linkSlug: null, date: '2026-08-10' },
    ];
    const dated = await renderFooter();
    expect(dated.container.textContent).toContain(`${dict.en.contentUpdated} Aug 10, 2026`);
    expect(dated.container.textContent).not.toContain('Jul 1, 2026');
  });

  it('never renders href="#"', async () => {
    const { container } = await renderFooter();
    for (const a of Array.from(container.querySelectorAll('a'))) expect(a.getAttribute('href')).not.toBe('#');
  });
});

// I-2 (fix wave finding 3): at 320px "การแสดงผล" (Appearance) wrapped and the
// row overflowed by 1px. The prototype (R21) stacks a pref's label above its
// control instead of beside it -- read as text (jsdom computes no layout).
describe('site-footer.css (I-2: stacked pref label under 734px)', () => {
  const CSS = readFileSync('src/components/site-footer.css', 'utf8');
  const mobile = CSS.slice(CSS.indexOf('@media (max-width: 734px)'));

  it('stacks each .foot-pref label above its control, and keeps the label on one line', () => {
    expect(mobile).toMatch(/\.foot-pref\s*\{[^}]*flex-direction:\s*column;[^}]*align-items:\s*start;/s);
    expect(mobile).toMatch(/\.foot-pref-label\s*\{[^}]*white-space:\s*nowrap;/s);
  });
});
