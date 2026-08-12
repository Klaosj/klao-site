// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorkGrid from '@/components/sections/WorkGrid';
import { dict } from '@/lib/dictionary';
import type { Project } from '@/lib/models';
// Same fixture-import pattern as src/lib/content.ts's getProjectsCached: the
// real fixture (all four current projects) is what the two tests below need
// -- unlike the rest of this file's single-project `projects` mock, "every
// project" and "adjacent caption" only mean something against the actual
// fixture set (two of which start with imageSrc: null).
import projectsFixture from '@/content/fixtures/projects.json';

// No RTL auto-cleanup is wired up in this project (no setupFiles in
// vitest.config.ts). Without this, render() output from an earlier test
// stays attached to document.body and screen.getByText(...) -- which
// queries the whole document -- can match leftover nodes from a previous
// test in this file, throwing getMultipleElementsFoundError.
afterEach(cleanup);

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

// Field names taken from src/lib/models.ts -- `name` is a plain string,
// `description` is Localized, the image is `imageSrc`, nullable URLs are
// `string | null`, and there is no year field.
const projects: Project[] = [
  {
    id: 'p1',
    name: 'GoNai',
    description: { en: 'Trip planner', th: 'วางแผนทริป' },
    stack: ['Next.js', 'Supabase'],
    liveUrl: 'https://gonai.example',
    repoUrl: null,
    imageSrc: '/api/img/page/1/Cover',
    featured: true,
    order: 1,
  },
];

describe('WorkGrid', () => {
  it('links each card to its live URL, never to "#"', () => {
    const { container } = render(<WorkGrid projects={projects} locale="en" />);
    expect((container.querySelector('a') as HTMLAnchorElement).getAttribute('href')).toBe(
      'https://gonai.example',
    );
  });

  it('gives every cover explicit dimensions, lazy loading, async decoding and real alt text', () => {
    const { container } = render(<WorkGrid projects={projects} locale="en" />);
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('width')).toBeTruthy();
    expect(img.getAttribute('height')).toBeTruthy();
    expect(img.getAttribute('alt')).toContain('GoNai');
    expect(img.getAttribute('loading')).toBe('lazy');
    // Pinned to the exact spec'd alt format (name + em dash + localized
    // description), not just "contains the name" -- a mutation that drops
    // the description half (e.g. alt={project.name}) would still pass the
    // `toContain('GoNai')` check above but is caught here.
    expect(img.getAttribute('alt')).toBe('GoNai — Trip planner');
    // decoding="async" is a distinct requirement from loading="lazy" in the
    // brief -- assert it separately so a mutation dropping just this
    // attribute (while leaving loading="lazy" intact) is caught.
    expect(img.getAttribute('decoding')).toBe('async');
  });

  it('renders a project with no image as text rather than a broken frame', () => {
    const noCover: Project[] = [{ ...projects[0], imageSrc: null }];
    const { container } = render(<WorkGrid projects={noCover} locale="en" />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('GoNai')).toBeTruthy();
  });

  it('renders a non-link card when a project has neither live nor repo URL', () => {
    const noLink: Project[] = [{ ...projects[0], liveUrl: null, repoUrl: null }];
    const { container } = render(<WorkGrid projects={noLink} locale="en" />);
    expect(container.querySelector('a')).toBeNull();
    expect(screen.getByText('GoNai')).toBeTruthy();
  });

  it('falls back to the repo URL when there is no live URL', () => {
    const repoOnly: Project[] = [{ ...projects[0], liveUrl: null, repoUrl: 'https://github.com/x/y' }];
    const { container } = render(<WorkGrid projects={repoOnly} locale="en" />);
    expect((container.querySelector('a') as HTMLAnchorElement).getAttribute('href')).toBe(
      'https://github.com/x/y',
    );
  });

  it('prefers the live URL over the repo URL when both are present', () => {
    // Distinct from the two tests above: those each leave only one of the
    // two URLs set, so a mutant that swaps the `??` precedence
    // (repoUrl ?? liveUrl) would still pass both. This is the same class of
    // bug flagged in ProjectCard.tsx's own history comment -- a project
    // with both URLs silently dropping one of them.
    const both: Project[] = [{ ...projects[0], liveUrl: 'https://live.example', repoUrl: 'https://repo.example' }];
    const { container } = render(<WorkGrid projects={both} locale="en" />);
    expect((container.querySelector('a') as HTMLAnchorElement).getAttribute('href')).toBe(
      'https://live.example',
    );
  });

  it('adds a secondary "View code" link to the repo URL when both URLs are present, without nesting it in the card anchor', () => {
    // The primary card anchor above only ever carries one href
    // (liveUrl ?? repoUrl) -- nesting a second <a> inside it would be
    // invalid HTML, so when both URLs exist the repo link must render as a
    // sibling of the primary anchor instead of disappearing (the bug
    // documented in ProjectCard.tsx's own history comment).
    const both: Project[] = [{ ...projects[0], liveUrl: 'https://live.example', repoUrl: 'https://repo.example' }];
    const { container } = render(<WorkGrid projects={both} locale="en" />);
    const anchors = container.querySelectorAll('a');
    expect(anchors).toHaveLength(2);

    const primary = anchors[0];
    expect(primary.getAttribute('href')).toBe('https://live.example');

    const secondary = screen.getByText(dict.en.viewCode) as HTMLAnchorElement;
    expect(secondary.tagName).toBe('A');
    expect(secondary.getAttribute('href')).toBe('https://repo.example');
    expect(secondary.getAttribute('target')).toBe('_blank');
    expect(secondary.getAttribute('rel')).toBe('noreferrer');
    // Not a descendant of the primary anchor -- a nested <a> is invalid
    // HTML and browsers silently un-nest it, which would make this
    // assertion (and querySelector('a') element identity) unreliable.
    expect(primary.contains(secondary)).toBe(false);
  });

  it('renders no secondary "View code" link when only the repo URL is set', () => {
    // Companion to "falls back to the repo URL when there is no live URL"
    // above: that test only checks the primary anchor's href. This guards
    // the secondary row specifically -- a mutant that renders it whenever
    // repoUrl is set (instead of only when BOTH URLs are set) would still
    // pass every other test in this file.
    const repoOnly: Project[] = [{ ...projects[0], liveUrl: null, repoUrl: 'https://github.com/x/y' }];
    const { container } = render(<WorkGrid projects={repoOnly} locale="en" />);
    expect(container.querySelectorAll('a')).toHaveLength(1);
    expect(screen.queryByText(dict.en.viewCode)).toBeNull();
  });

  it('makes the first card span all 12 columns and later cards span half', () => {
    const two: Project[] = [
      projects[0],
      {
        id: 'p2',
        name: 'Second',
        description: { en: 'Another thing', th: 'อีกอย่างหนึ่ง' },
        stack: ['Go'],
        liveUrl: 'https://second.example',
        repoUrl: null,
        imageSrc: null,
        featured: false,
        order: 2,
      },
    ];
    const { container } = render(<WorkGrid projects={two} locale="en" />);
    // The grid item is the element carrying the col-span classes -- that's
    // the direct child of the grid container, one level above the card's
    // own <a>/<div> wrapper.
    const gridItems = container.querySelectorAll('.grid > *');
    expect(gridItems).toHaveLength(2);
    expect(gridItems[0].className).toContain('col-span-12');
    expect(gridItems[0].className).not.toContain('md:col-span-6');
    expect(gridItems[1].className).toContain('md:col-span-6');
  });

  it('opens external project links in a new tab without leaking a referrer', () => {
    // Every project href here is external (a live deployment or a GitHub
    // repo, never an in-site route) -- see ProjectCard.tsx, which already
    // sets this same pair on its own liveUrl/repoUrl links. Without it,
    // clicking a card navigates the visitor away from the portfolio.
    const { container } = render(<WorkGrid projects={projects} locale="en" />);
    const a = container.querySelector('a') as HTMLAnchorElement;
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noreferrer');
  });

  it('renders only the active locale -- the section label and project description switch, and the other language is absent', () => {
    render(<WorkGrid projects={projects} locale="th" />);
    expect(screen.getByText(dict.th.selectedWork)).toBeTruthy();
    expect(screen.queryByText(dict.en.selectedWork)).toBeNull();
    expect(screen.getByText(projects[0].description.th, { exact: false })).toBeTruthy();
    expect(screen.queryByText(projects[0].description.en, { exact: false })).toBeNull();
    // Name is locale-invariant (plain string on Project, not Localized) so
    // it must still be present either way.
    expect(screen.getByText('GoNai')).toBeTruthy();
  });

  it('gives every cover its real intrinsic aspect ratio, not an invented one', () => {
    // Regression test: width={1440} height={900} (16:10) was an invented
    // aspect ratio -- the real fixture asset (public/images/
    // placeholder.svg) is 800x450 (16:9). With Tailwind preflight's
    // `img{height:auto}`, the browser reserves a pre-load box from this
    // ratio, so the wrong ratio reserved a box ~11% taller than the image
    // that actually loads into it -- the exact layout shift these explicit
    // dimensions exist to prevent.
    const { container } = render(<WorkGrid projects={projects} locale="en" />);
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('width')).toBe('800');
    expect(img.getAttribute('height')).toBe('450');
  });

  it('renders the Thai eyebrow and stack line in the Thai font stack, never font-mono', () => {
    // Regression test, same class of bug as SiteNav/AboutBand/CraftBand's
    // own version of this test: no monospace face carries Thai glyphs. This
    // used to check a single combined "meta" line (description + stack in
    // one <p>, eyebrowFont-styled); T3 split that into separate name/
    // description/stack paragraphs and only the stack line keeps the
    // mono-eyebrow treatment now, so it's the one still at risk of the
    // font-mono override this test guards against. The description
    // paragraph carries no font-mono class at all, so it already inherits
    // --font-thai for free from globals.css's `:lang(th)` rule -- asserting
    // font-thai on it would test nothing.
    render(<WorkGrid projects={projects} locale="th" />);
    const eyebrow = screen.getByText(dict.th.selectedWork);
    expect(eyebrow.className).not.toContain('font-mono');
    expect(eyebrow.className).toContain('font-thai');

    const stackLine = screen.getByText(projects[0].stack.join(' · '));
    expect(stackLine.className).not.toContain('font-mono');
    expect(stackLine.className).toContain('font-thai');
  });

  it('renders a cover image for every project', () => {
    const projects = projectsFixture as Project[];
    render(<WorkGrid projects={projects} locale="en" />);
    const imgs = screen.getAllByRole('img');
    expect(imgs).toHaveLength(projects.length);
  });

  it('keeps name and description adjacent in the caption', () => {
    const projects = projectsFixture as Project[];
    render(<WorkGrid projects={projects} locale="en" />);
    const name = screen.getByText('GoNai');
    const caption = name.parentElement!;
    // This file has no jest-dom matchers wired up (no toBeInTheDocument
    // anywhere else in the repo's tests) -- getByText itself already throws
    // if no match is found, so toBeTruthy() here matches the existing file's
    // style (see e.g. the "renders a non-link card" test above) rather than
    // reaching for an unavailable matcher.
    expect(within(caption).getByText(/trip planner/i)).toBeTruthy();
  });
});
