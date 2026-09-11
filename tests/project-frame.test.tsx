// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import ProjectFrame from '@/components/ProjectFrame';
import { IMAGE_ALT, imageAlt } from '@/lib/image-alt';
import type { Project } from '@/lib/models';

afterEach(cleanup);

const base: Project = {
  id: 'p1',
  name: 'GoNai',
  description: { en: 'Trip planner', th: 'วางแผนทริป' },
  stack: ['Next.js'],
  liveUrl: 'https://gonai-three.vercel.app',
  repoUrl: null,
  imageSrc: '/api/img/page/1/Screenshot',
  featured: true,
  order: 1,
  type: 'build',
  outcome: null,
  question: null,
  slug: null,
};

describe('ProjectFrame', () => {
  it('renders the screenshot under the shared img contract', () => {
    const { container } = render(<ProjectFrame project={base} />);
    const img = container.querySelector('.pframe-screen img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(base.imageSrc);
    expect(img.getAttribute('width')).toBe('800');
    expect(img.getAttribute('height')).toBe('450');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
    expect(img.getAttribute('alt')).toBe(imageAlt(base.imageSrc as string, base.name));
    expect(img.getAttribute('alt')).not.toContain('GoNai');
  });

  it('loads eagerly when priority is set', () => {
    const { container } = render(<ProjectFrame project={base} priority />);
    expect(container.querySelector('img')?.getAttribute('loading')).toBe('eager');
  });

  it('uses the curated alt for a known fixture asset', () => {
    const { container } = render(<ProjectFrame project={{ ...base, imageSrc: '/images/gonai.jpg' }} />);
    expect(container.querySelector('img')?.getAttribute('alt')).toBe(IMAGE_ALT['/images/gonai.jpg']);
  });

  it('renders nothing at all when the project has no screenshot', () => {
    const { container } = render(<ProjectFrame project={{ ...base, name: 'Talatify', imageSrc: null }} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows the window title only when one is given, and hides the chrome from assistive tech', () => {
    const untitled = render(<ProjectFrame project={base} />);
    expect(untitled.container.querySelector('.pframe-title')).toBeNull();
    expect(untitled.container.querySelector('.pframe-chrome')?.getAttribute('aria-hidden')).toBe('true');
    cleanup();
    const titled = render(<ProjectFrame project={base} title="gonai-three.vercel.app" />);
    expect(titled.container.querySelector('.pframe-title')?.textContent).toBe('gonai-three.vercel.app');
  });

  it('marks the root so callers and tests can find it, and accepts a className', () => {
    const { container } = render(<ProjectFrame project={base} className="extra" />);
    const root = container.querySelector('[data-project-frame]') as HTMLElement;
    expect(root.classList.contains('pframe')).toBe(true);
    expect(root.classList.contains('extra')).toBe(true);
  });
});
