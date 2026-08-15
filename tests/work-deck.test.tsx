// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorkDeck from '@/components/sections/WorkDeck';
import { dict } from '@/lib/dictionary';
import type { Project } from '@/lib/models';

// Same manual-cleanup + stub setup as every other jsdom test in this repo.
// vitest.config.ts DOES declare setupFiles: ['./tests/setup.ts'], but that
// file only mocks next/font/google (which resolves to `{}` outside Next's
// own compiler) — it registers no RTL auto-cleanup and defines no browser
// globals. So every jsdom file still owns its own afterEach(cleanup) plus
// the matchMedia/IntersectionObserver stubs Reveal/TiltCard reach for.
afterEach(cleanup);

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

const build: Project = {
  id: 'p-build',
  name: 'GoNai',
  description: { en: 'Trip planner', th: 'วางแผนทริป' },
  stack: ['Next.js', 'Supabase'],
  liveUrl: 'https://gonai.example',
  repoUrl: null,
  imageSrc: '/api/img/page/1/Cover',
  featured: true,
  order: 2,
  type: 'build',
  outcome: null,
  question: { en: 'One day in Bangkok — what is the real budget?', th: 'ไปเที่ยวหนึ่งวัน งบจริงเท่าไหร่?' },
  slug: null,
};

const business: Project = {
  id: 'p-biz',
  name: 'SME Studio',
  description: { en: 'Order-bot studio for Thai SMEs', th: 'สตูดิโอบอทรับออเดอร์สำหรับ SME ไทย' },
  // Deliberately non-empty: the deck must HIDE stack on a business slide
  // even when Notion carries one.
  stack: ['LINE API'],
  liveUrl: null,
  repoUrl: null,
  imageSrc: null,
  featured: true,
  order: 1,
  type: 'business',
  outcome: { en: 'Validated with 3 paying pilots', th: 'ผ่านการทดสอบกับลูกค้าจ่ายจริง 3 ราย' },
  question: { en: 'Can a solo operator serve Thai SMEs?', th: 'คนเดียวดูแล SME ไทยได้ไหม?' },
  slug: null,
};

// The deck always ends with one internal "All projects →" footer link (to
// /<locale>/projects, added 2026-08-15). The slide-contract tests below
// care about the anchors a SLIDE renders, so they filter that ever-present
// footer link out rather than counting it.
const slideAnchors = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('a')).filter(
    (a) => !(a.getAttribute('href') ?? '').endsWith('/projects'),
  );

describe('WorkDeck', () => {
  it('keeps the #work anchor and the selectedProjects eyebrow heading', () => {
    const { container } = render(<WorkDeck projects={[build]} locale="en" />);
    expect(container.querySelector('section#work')).toBeTruthy();
    const h2 = container.querySelector('h2');
    expect(h2?.textContent).toBe(dict.en.selectedProjects);
  });

  it('always links to the full projects listing from the deck footer', () => {
    render(<WorkDeck projects={[build]} locale="en" />);
    const footer = screen.getByText(`${dict.en.allProjects} →`) as HTMLAnchorElement;
    expect(footer.tagName).toBe('A');
    expect(footer.getAttribute('href')).toBe('/en/projects');
    // Internal route — no new-tab treatment.
    expect(footer.hasAttribute('target')).toBe(false);
  });

  it('renders business slides before build slides regardless of input order, with per-chapter kicker numbering', () => {
    const secondBiz: Project = { ...business, id: 'p-biz2', name: 'Little Duck', order: 3 };
    render(<WorkDeck projects={[build, business, secondBiz]} locale="en" />);
    const kickers = screen.getAllByText(/^[BT]·\d{2} — /);
    expect(kickers.map((k) => k.textContent)).toEqual([
      `B·01 — ${dict.en.workTypeBusiness}`,
      `B·02 — ${dict.en.workTypeBusiness}`,
      `T·01 — ${dict.en.workTypeBuild}`,
    ]);
  });

  it('renders no Business chapter at all when every project is a build (fixture mode)', () => {
    render(<WorkDeck projects={[build]} locale="en" />);
    // Query the kicker shape, not the bare word "Business" — the deck
    // subtitle legitimately contains that word on every render.
    expect(screen.queryByText(/^B·\d{2} — /)).toBeNull();
    expect(screen.getByText(`T·01 — ${dict.en.workTypeBuild}`)).toBeTruthy();
  });

  it('renders no Build chapter at all when every project is a business (the mirror case)', () => {
    render(<WorkDeck projects={[business]} locale="en" />);
    expect(screen.queryByText(/^T·\d{2} — /)).toBeNull();
    expect(screen.getByText(`B·01 — ${dict.en.workTypeBusiness}`)).toBeTruthy();
  });

  it('never renders stack on a business slide, even when set', () => {
    render(<WorkDeck projects={[business]} locale="en" />);
    expect(screen.queryByText('LINE API')).toBeNull();
  });

  it('renders the stack join line on a build slide', () => {
    render(<WorkDeck projects={[build]} locale="en" />);
    expect(screen.getByText('Next.js · Supabase')).toBeTruthy();
  });

  it('renders no empty stack paragraph for a build slide with an empty stack', () => {
    // Mirrors tests/project-card.test.tsx's own empty-stack guard: the
    // length check on the stack line is what stops an empty <p> from
    // painting a stray mt-4 gap under the description.
    const { container } = render(<WorkDeck projects={[{ ...build, stack: [] }]} locale="en" />);
    const paragraphs = Array.from(container.querySelectorAll('p'));
    expect(paragraphs.some((p) => p.textContent === '')).toBe(false);
  });

  it('renders the outcome receipt line on a build slide too — the line is type-agnostic', () => {
    const buildWithOutcome: Project = {
      ...build,
      outcome: { en: 'Cut trip planning from 3 hours to 12 minutes', th: 'ลดเวลาวางแผนทริปจาก 3 ชั่วโมงเหลือ 12 นาที' },
    };
    render(<WorkDeck projects={[buildWithOutcome]} locale="en" />);
    expect(screen.getByText('Cut trip planning from 3 hours to 12 minutes')).toBeTruthy();
  });

  it('renders the outcome receipt line when present and omits it when null', () => {
    render(<WorkDeck projects={[business, build]} locale="en" />);
    expect(screen.getByText('Validated with 3 paying pilots')).toBeTruthy();
    // build has outcome: null — exactly one receipt line in the whole deck.
    expect(screen.getAllByText(/Validated/)).toHaveLength(1);
  });

  it('leads with the question when present and starts at the name (rendered once) when absent', () => {
    const noQuestion: Project = { ...build, question: null };
    render(<WorkDeck projects={[noQuestion]} locale="en" />);
    expect(screen.getAllByText('GoNai')).toHaveLength(1);
    expect(screen.queryByText(/real budget/)).toBeNull();
  });

  it('links a storied slide to its internal case-study page as ONE link, no external anchors', () => {
    const storied: Project = { ...build, slug: 'gonai' };
    const { container } = render(<WorkDeck projects={[storied]} locale="en" />);
    const anchors = slideAnchors(container);
    expect(anchors).toHaveLength(1);
    expect(anchors[0].getAttribute('href')).toBe('/en/work/gonai');
    expect(anchors[0].hasAttribute('target')).toBe(false);
    expect(within(anchors[0] as HTMLElement).getByText('One day in Bangkok — what is the real budget?')).toBeTruthy();
  });

  it('prefers live over repo on an unstoried slide and recovers the repo as a sibling View code link when both are set', () => {
    const both: Project = { ...build, liveUrl: 'https://live.example', repoUrl: 'https://repo.example' };
    const { container } = render(<WorkDeck projects={[both]} locale="en" />);
    const anchors = slideAnchors(container);
    expect(anchors).toHaveLength(2);
    expect(anchors[0].getAttribute('href')).toBe('https://live.example');
    expect(anchors[0].getAttribute('target')).toBe('_blank');
    expect(anchors[0].getAttribute('rel')).toBe('noreferrer');
    const secondary = screen.getByText(dict.en.viewCode) as HTMLAnchorElement;
    expect(secondary.getAttribute('href')).toBe('https://repo.example');
    expect((anchors[0] as HTMLElement).contains(secondary)).toBe(false);
  });

  it('renders a plain non-link slide when unstoried with neither URL', () => {
    const bare: Project = { ...build, liveUrl: null, repoUrl: null };
    const { container } = render(<WorkDeck projects={[bare]} locale="en" />);
    expect(slideAnchors(container)).toHaveLength(0);
    expect(screen.getByText('GoNai')).toBeTruthy();
  });

  it('keeps the exact cover img contract: 800x450, lazy, async, name-dash-description alt', () => {
    const { container } = render(<WorkDeck projects={[build]} locale="en" />);
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('width')).toBe('800');
    expect(img.getAttribute('height')).toBe('450');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
    expect(img.getAttribute('alt')).toBe('GoNai — Trip planner');
  });

  it('renders an imageless slide as text with no img element', () => {
    const { container } = render(<WorkDeck projects={[business]} locale="en" />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('SME Studio')).toBeTruthy();
  });

  it('renders only the active locale and keeps Thai eyebrow/kicker/stack out of font-mono', () => {
    render(<WorkDeck projects={[build]} locale="th" />);
    expect(screen.getByText(dict.th.selectedProjects)).toBeTruthy();
    expect(screen.queryByText(dict.en.selectedProjects)).toBeNull();
    expect(screen.getByText(build.description.th)).toBeTruthy();
    expect(screen.queryByText(build.description.en)).toBeNull();
    const eyebrow = screen.getByText(dict.th.selectedProjects);
    expect(eyebrow.className).not.toContain('font-mono');
    expect(eyebrow.className).toContain('font-thai');
    const kicker = screen.getByText(`T·01 — ${dict.th.workTypeBuild}`);
    expect(kicker.className).not.toContain('font-mono');
    expect(kicker.className).toContain('font-thai');
    const stackLine = screen.getByText('Next.js · Supabase');
    expect(stackLine.className).not.toContain('font-mono');
    expect(stackLine.className).toContain('font-thai');
  });
});
