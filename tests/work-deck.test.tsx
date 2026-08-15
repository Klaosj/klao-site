// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorkDeck from '@/components/sections/WorkDeck';
import { dict } from '@/lib/dictionary';
import { IMAGE_ALT, imageAlt } from '@/lib/image-alt';
import type { Project } from '@/lib/models';

// Same manual-cleanup + stub setup as every other jsdom test in this repo.
// vitest.config.ts DOES declare setupFiles: ['./tests/setup.ts'], but that
// file only mocks next/font/google (which resolves to `{}` outside Next's
// own compiler) — it registers no RTL auto-cleanup and defines no browser
// globals. So every jsdom file still owns its own afterEach(cleanup) plus
// the matchMedia/IntersectionObserver stubs Reveal/TiltCard/MaskedHeading
// reach for.
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

const secondBuild: Project = { ...build, id: 'p-build2', name: 'AISecretary', order: 4 };

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
  it('keeps the #work anchor and opens with a display-scale h2, the eyebrow demoted to a <p>', () => {
    const { container } = render(<WorkDeck projects={[build]} locale="en" />);
    expect(container.querySelector('section#work')).toBeTruthy();
    // QA finding 1: the band's h2 used to BE the 12px SectionLabel. It is
    // now the deck's own statement, at the same clamp every other band
    // uses. (MaskedHeading splits the text into per-word spans, so this
    // compares textContent, not a single text node.)
    const headings = container.querySelectorAll('h2');
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe(dict.en.deckHeading);
    // The eyebrow still renders — smoke.test.tsx pins this exact string on
    // the home page — but as a plain paragraph label.
    const eyebrow = screen.getByText(dict.en.selectedProjects);
    expect(eyebrow.tagName).toBe('P');
  });

  it('renders the build-only subtitle when no business project is present, and the full one when it is', () => {
    // Finding 7: "Business first." above zero business slides was a promise
    // the data did not keep (and fixture mode is exactly that case).
    render(<WorkDeck projects={[build]} locale="en" />);
    expect(screen.getByText(dict.en.deckSubtitleBuildOnly)).toBeTruthy();
    expect(screen.queryByText(dict.en.deckSubtitle)).toBeNull();
    cleanup();
    render(<WorkDeck projects={[business, build]} locale="en" />);
    expect(screen.getByText(dict.en.deckSubtitle)).toBeTruthy();
    expect(screen.queryByText(dict.en.deckSubtitleBuildOnly)).toBeNull();
  });

  it('always links to the full projects listing from the deck footer', () => {
    const { container } = render(<WorkDeck projects={[build]} locale="en" />);
    // Finding 18: the arrow is now a decorative aria-hidden span, so the
    // link's own text node is just the label (its accessible name) while
    // textContent still carries the glyph.
    const footer = screen.getByText(dict.en.allProjects) as HTMLAnchorElement;
    expect(footer.tagName).toBe('A');
    expect(footer.getAttribute('href')).toBe('/en/projects');
    // Internal route — no new-tab treatment.
    expect(footer.hasAttribute('target')).toBe(false);
    expect(footer.textContent).toContain('→');
    expect(footer.querySelector('span[aria-hidden="true"]')?.textContent).toBe('→');
    expect(slideAnchors(container)).toHaveLength(1); // the slide's own live link, not a second footer
  });

  it('renders business slides before build slides regardless of input order, with per-chapter kicker numbering', () => {
    const secondBiz: Project = { ...business, id: 'p-biz2', name: 'Little Duck', order: 3 };
    render(<WorkDeck projects={[build, business, secondBiz]} locale="en" />);
    // Finding 24: the kicker is the number alone now — the chapter word is
    // spelled out once, as a marker above the chapter's first slide.
    const kickers = screen.getAllByText(/^[BT]·\d{2}$/);
    expect(kickers.map((k) => k.textContent)).toEqual(['B·01', 'B·02', 'T·01']);
    expect(screen.getAllByText(dict.en.workTypeBuild)).toHaveLength(1);
  });

  it('spells the chapter word exactly once for a multi-slide chapter', () => {
    render(<WorkDeck projects={[build, secondBuild]} locale="en" />);
    expect(screen.getAllByText(dict.en.workTypeBuild)).toHaveLength(1);
    expect(screen.getAllByText(/^T·\d{2}$/).map((k) => k.textContent)).toEqual(['T·01', 'T·02']);
  });

  it('renders no Business chapter at all when every project is a build (fixture mode)', () => {
    render(<WorkDeck projects={[build]} locale="en" />);
    // Query the kicker shape, not the bare word "Business" — the deck
    // heading legitimately contains that word on every render (and
    // MaskedHeading makes each word its own element).
    expect(screen.queryByText(/^B·\d{2}$/)).toBeNull();
    expect(screen.getByText('T·01')).toBeTruthy();
    expect(screen.getAllByText(dict.en.workTypeBuild)).toHaveLength(1);
  });

  it('renders no Build chapter at all when every project is a business (the mirror case)', () => {
    render(<WorkDeck projects={[business]} locale="en" />);
    expect(screen.queryByText(/^T·\d{2}$/)).toBeNull();
    expect(screen.getByText('B·01')).toBeTruthy();
    // An absent chapter contributes no marker either — not an empty header.
    expect(screen.queryByText(dict.en.workTypeBuild)).toBeNull();
  });

  it('opens the band with no rule and rules only BETWEEN slides of a chapter', () => {
    // Finding 2: the subtitle and the first slide's border-t measured 0px
    // apart, so the rule read as an underline on the subtitle. A chapter's
    // first slide now carries no rule — the chapter marker opens it.
    const { container } = render(<WorkDeck projects={[business, build, secondBuild]} locale="en" />);
    const grids = Array.from(container.querySelectorAll('div.grid'));
    expect(grids).toHaveLength(3);
    expect(grids[0].className).not.toContain('border-t'); // B·01 — opens the deck
    expect(grids[1].className).not.toContain('border-t'); // T·01 — opens its chapter
    expect(grids[2].className).toContain('border-t'); // T·02 — a real divider
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

  it('gives a storied slide a standing read-the-story affordance, and gives an unstoried one none', () => {
    // Finding 8a: the whole 492px block was a link with no hover response
    // and no visible cue at all. The cue must be visible WITHOUT hover —
    // a touch user never hovers — so hover only brightens it.
    const storied: Project = { ...build, slug: 'gonai' };
    const { container } = render(<WorkDeck projects={[storied]} locale="en" />);
    const link = slideAnchors(container)[0] as HTMLElement;
    expect(link.className).toContain('group');
    const cue = within(link).getByText(dict.en.readStory);
    expect(cue.className).not.toContain('opacity-0');
    expect(cue.className).toContain('group-hover:');
    expect(cue.querySelector('span[aria-hidden="true"]')?.textContent).toBe('→');
    // The name itself answers to the same hover.
    expect(within(link).getByText('GoNai').className).toContain('group-hover:text-peri');
    cleanup();
    render(<WorkDeck projects={[build]} locale="en" />);
    expect(screen.queryByText(dict.en.readStory)).toBeNull();
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
    // Findings 6 + 14: the secondary pill is the shared `sm` step (12px, not
    // an 11px outlier), sits on the ≥3:1 border token, and eases on the
    // house curve instead of Tailwind's 150ms default.
    expect(secondary.className).toContain('text-[12px]');
    expect(secondary.className).toContain('border-on-dark-mid');
    expect(secondary.className).toContain('duration-300');
    expect(secondary.className).toContain('ease-[cubic-bezier(0.16,1,0.3,1)]');
  });

  it('renders a plain non-link slide when unstoried with neither URL', () => {
    const bare: Project = { ...build, liveUrl: null, repoUrl: null };
    const { container } = render(<WorkDeck projects={[bare]} locale="en" />);
    expect(slideAnchors(container)).toHaveLength(0);
    expect(screen.getByText('GoNai')).toBeTruthy();
  });

  it('keeps the exact cover img contract: 800x450, lazy, async, and alt that never repeats the visible text', () => {
    const { container } = render(<WorkDeck projects={[build]} locale="en" />);
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('width')).toBe('800');
    expect(img.getAttribute('height')).toBe('450');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
    // Finding 4: the old `${name} — ${description}` template made a screen
    // reader announce both facts twice, since both are visible text right
    // beside the image. The alt now comes from the shared map.
    const alt = img.getAttribute('alt') ?? '';
    expect(alt).toBe(imageAlt(build.imageSrc as string));
    expect(alt).not.toContain(build.name);
    expect(alt).not.toContain(build.description.en);
  });

  it('uses the curated screenshot description when the asset has one', () => {
    const shot: Project = { ...build, imageSrc: '/images/gonai.jpg' };
    const { container } = render(<WorkDeck projects={[shot]} locale="en" />);
    expect(container.querySelector('img')?.getAttribute('alt')).toBe(IMAGE_ALT['/images/gonai.jpg']);
  });

  it('renders an imageless slide as text with no img element', () => {
    const { container } = render(<WorkDeck projects={[business]} locale="en" />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('SME Studio')).toBeTruthy();
  });

  it('gives every slide the same reveal delay — deck slides never share a viewport', () => {
    // Finding 21: delayIndex={i} across the flat slide list produced
    // 0 / 75 / 150 / 225ms on elements ~492px apart, i.e. a dead beat
    // before the last slide rather than a stagger.
    const { container } = render(<WorkDeck projects={[business, build, secondBuild]} locale="en" />);
    const staggered = Array.from(container.querySelectorAll<HTMLElement>('[style]')).filter(
      (el) => el.style.getPropertyValue('--i') !== '',
    );
    expect(staggered.length).toBeGreaterThanOrEqual(3);
    for (const el of staggered) expect(el.style.getPropertyValue('--i').trim()).toBe('0');
  });

  it('sizes the deck micro-labels a step up on Thai (EN baseline for comparison)', () => {
    // Finding 12: Thai marks live outside the x-height, so 10px collapses
    // into a smudge. Same helper family switch as before, plus a size bump.
    const en = render(<WorkDeck projects={[build]} locale="en" />);
    expect(screen.getByText('T·01').className).toContain('text-[10px]');
    expect(screen.getByText(dict.en.workTypeBuild).className).toContain('text-[11px]');
    en.unmount();
    render(<WorkDeck projects={[build]} locale="th" />);
    expect(screen.getByText('T·01').className).toContain('text-[11px]');
    expect(screen.getByText(dict.th.workTypeBuild).className).toContain('text-[12px]');
  });

  it('renders only the active locale and keeps the Thai eyebrow/chapter marker/stack out of font-mono', () => {
    render(<WorkDeck projects={[build]} locale="th" />);
    expect(screen.getByText(dict.th.selectedProjects)).toBeTruthy();
    expect(screen.queryByText(dict.en.selectedProjects)).toBeNull();
    expect(screen.getByText(build.description.th)).toBeTruthy();
    expect(screen.queryByText(build.description.en)).toBeNull();
    const eyebrow = screen.getByText(dict.th.selectedProjects);
    expect(eyebrow.className).not.toContain('font-mono');
    expect(eyebrow.className).toContain('font-thai');
    // The kicker is Latin-only now, so the chapter marker is the deck's
    // Thai micro-label — it is the one that must never hit font-mono.
    const marker = screen.getByText(dict.th.workTypeBuild);
    expect(marker.className).not.toContain('font-mono');
    expect(marker.className).toContain('font-thai');
    const stackLine = screen.getByText('Next.js · Supabase');
    expect(stackLine.className).not.toContain('font-mono');
    expect(stackLine.className).toContain('font-thai');
  });
});
