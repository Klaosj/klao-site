// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorkGrid from '@/components/sections/WorkGrid';
import { dict } from '@/lib/dictionary';
import type { Project } from '@/lib/models';

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
});
