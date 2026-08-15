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

  it('leads with the question when present', () => {
    const questioned: Project = {
      ...base,
      question: { en: 'One day in Bangkok — what is the real budget?', th: 'ไปเที่ยวหนึ่งวัน งบจริงเท่าไหร่?' },
    };
    render(<ProjectCard project={questioned} locale="en" />);
    expect(screen.getByText('One day in Bangkok — what is the real budget?')).toBeTruthy();
  });

  it('renders one internal Read-the-story link for a storied row, and no external links even when URLs are set', () => {
    const storied: Project = {
      ...base,
      slug: 'gonai',
      liveUrl: 'https://live.example',
      repoUrl: 'https://repo.example',
    };
    const { container } = render(<ProjectCard project={storied} locale="en" />);
    const anchors = container.querySelectorAll('a');
    expect(anchors).toHaveLength(1);
    expect(anchors[0].getAttribute('href')).toBe('/en/work/gonai');
    // Internal route — no new-tab treatment; live/repo belong to the story
    // page's receipts footer, same division of labor as WorkDeck.
    expect(anchors[0].hasAttribute('target')).toBe(false);
  });

  it('renders separate live and repo links for an unstoried row with both URLs', () => {
    const both: Project = { ...base, liveUrl: 'https://live.example', repoUrl: 'https://repo.example' };
    const { container } = render(<ProjectCard project={both} locale="en" />);
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['https://live.example', 'https://repo.example']);
  });

  it('renders no empty stack paragraph for a build project with an empty stack', () => {
    const { container } = render(<ProjectCard project={{ ...base, stack: [] }} locale="en" />);
    // The description <p> remains; the stack <p> must not render as an
    // empty element.
    const paragraphs = Array.from(container.querySelectorAll('p'));
    expect(paragraphs.some((p) => p.textContent === '')).toBe(false);
  });
});
