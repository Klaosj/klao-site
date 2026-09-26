// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TourBand from '@/components/sections/TourBand';
import { dict } from '@/lib/dictionary';
import type { Project } from '@/lib/models';
import { P1_DEFAULTS } from './helpers/project';

afterEach(cleanup);

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

const shipped: Project = {
  id: 'p-gonai',
  name: 'GoNai',
  description: { en: 'Trip planner', th: 'วางแผนทริป' },
  stack: ['Next.js'],
  liveUrl: 'https://gonai-three.vercel.app',
  repoUrl: null,
  imageSrc: '/api/img/page/1/Screenshot',
  featured: true,
  order: 3,
  type: 'build',
  outcome: null,
  question: { en: 'One day in Bangkok — what is the real budget?', th: 'ไปเที่ยวหนึ่งวัน งบจริงเท่าไหร่?' },
  slug: null,
  ...P1_DEFAULTS,
};

describe('TourBand', () => {
  it('wraps the tour in a deep band the nav can reach', () => {
    const { container } = render(<TourBand projects={[shipped]} locale="en" />);
    const section = container.querySelector('section') as HTMLElement;
    expect(section.id).toBe('tour');
    expect(section.className).toContain('bg-deep');
    const grid = section.querySelector('.tour-band') as HTMLElement;
    expect(grid.children[0].classList.contains('tour-list-wrap')).toBe(true);
    expect(grid.children[1].classList.contains('tour-stage')).toBe(true);
  });

  it('gives the band a real heading, not a floating label', () => {
    render(<TourBand projects={[shipped]} locale="en" />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toBe(dict.en.tourLabel);
    expect(heading.classList.contains('tour-label')).toBe(true);
  });

  it('does not exist at all when no project has a screenshot', () => {
    const { container } = render(<TourBand projects={[{ ...shipped, imageSrc: null }]} locale="en" />);
    expect(container.innerHTML).toBe('');
  });

  it('speaks Thai when locale is th', () => {
    render(<TourBand projects={[shipped]} locale="th" />);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(dict.th.tourLabel);
  });
});
