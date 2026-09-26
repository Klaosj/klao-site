import { describe, expect, it } from 'vitest';
import { TOUR_MS, tourProjects, windowTitle } from '@/lib/project-tour';
import type { Project } from '@/lib/models';

const make = (id: string, order: number, extra: Partial<Project> = {}): Project => ({
  id,
  name: id,
  description: { en: `${id} desc`, th: `${id} ไทย` },
  stack: [],
  liveUrl: null,
  repoUrl: null,
  imageSrc: `/api/img/page/${id}/Screenshot`,
  featured: true,
  order,
  type: 'build',
  outcome: null,
  question: null,
  slug: null,
  ...extra,
});

describe('tourProjects', () => {
  it('keeps only projects that have a screenshot, sorted by order, without mutating the input', () => {
    const input = [make('c', 3), make('nope', 0, { imageSrc: null }), make('a', 1), make('blank', 2, { imageSrc: '' })];
    const snapshot = [...input];
    expect(tourProjects(input).map((p) => p.id)).toEqual(['a', 'c']);
    expect(input).toEqual(snapshot);
  });

  it('returns an empty list when nothing has a screenshot', () => {
    expect(tourProjects([make('x', 1, { imageSrc: null })])).toEqual([]);
  });
});

describe('windowTitle', () => {
  it('uses the live URL host when there is one', () => {
    expect(windowTitle(make('g', 1, { name: 'GoNai', liveUrl: 'https://gonai-three.vercel.app/en?x=1' }))).toBe('gonai-three.vercel.app');
  });

  it('falls back to the project name without a live URL, or with an unparseable one', () => {
    expect(windowTitle(make('a', 1, { name: 'Aje' }))).toBe('Aje');
    expect(windowTitle(make('b', 1, { name: 'Broken', liveUrl: 'not a url' }))).toBe('Broken');
  });
});

describe('TOUR_MS', () => {
  it('is seven seconds', () => {
    expect(TOUR_MS).toBe(7000);
  });
});
