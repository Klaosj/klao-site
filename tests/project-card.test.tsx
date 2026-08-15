// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import ProjectCard from '@/components/ProjectCard';
import type { Project } from '@/lib/models';

afterEach(cleanup);

const base: Project = {
  id: 'p1',
  name: 'GoNai',
  description: { en: 'Trip planner', th: 'วางแผนทริป' },
  stack: ['Next.js', 'Supabase'],
  liveUrl: null,
  repoUrl: null,
  imageSrc: null,
  featured: true,
  order: 1,
  type: 'build',
  outcome: null,
  question: null,
  slug: null,
};

describe('ProjectCard', () => {
  it('renders the stack line for a build project', () => {
    render(<ProjectCard project={base} locale="en" />);
    expect(screen.getByText('Next.js · Supabase')).toBeTruthy();
  });

  it('renders no stack line for a business project, even when stack is set', () => {
    render(<ProjectCard project={{ ...base, type: 'business' }} locale="en" />);
    expect(screen.queryByText('Next.js · Supabase')).toBeNull();
  });

  it('renders no empty stack paragraph for a build project with an empty stack', () => {
    const { container } = render(<ProjectCard project={{ ...base, stack: [] }} locale="en" />);
    // The description <p> remains; the stack <p> must not render as an
    // empty element.
    const paragraphs = Array.from(container.querySelectorAll('p'));
    expect(paragraphs.some((p) => p.textContent === '')).toBe(false);
  });
});
