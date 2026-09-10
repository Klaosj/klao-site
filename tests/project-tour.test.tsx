// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectTour from '@/components/ProjectTour';
import { dict } from '@/lib/dictionary';
import { imageAlt } from '@/lib/image-alt';
import type { Project } from '@/lib/models';
import { TOUR_MS } from '@/lib/project-tour';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

const make = (id: string, name: string, order: number, extra: Partial<Project> = {}): Project => ({
  id,
  name,
  description: { en: `${name} in one line`, th: `${name} หนึ่งบรรทัด` },
  stack: [],
  liveUrl: null,
  repoUrl: null,
  imageSrc: `/api/img/page/${id}/Screenshot`,
  featured: true,
  order,
  type: 'build',
  outcome: null,
  question: { en: `Why ${name}?`, th: `ทำไมต้อง ${name}?` },
  slug: null,
  ...extra,
});

const gonai = make('g', 'GoNai', 3, { liveUrl: 'https://gonai-three.vercel.app' });
const secretary = make('a', 'AISecretary', 4, { outcome: { en: 'Runs every morning', th: 'รันทุกเช้า' } });
const brief = make('d', 'DailyBrief', 5, { repoUrl: 'https://github.com/Klaosj/dailybrief' });
const talatify = make('t', 'Talatify', 1, { imageSrc: null, type: 'business' });
const three = [brief, talatify, secretary, gonai];

const stageImg = (c: HTMLElement) => c.querySelector('.tour-stage img') as HTMLImageElement;
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

describe('ProjectTour', () => {
  it('lists only projects with a screenshot, in order, and opens on the first', () => {
    const { container } = render(<ProjectTour projects={three} locale="en" />);
    const items = screen.getAllByRole('tab');
    expect(items.map((b) => b.querySelector('span')?.textContent)).toEqual(['GoNai', 'AISecretary', 'DailyBrief']);
    expect(items[0].getAttribute('aria-selected')).toBe('true');
    expect(items[1].getAttribute('aria-selected')).toBe('false');
    expect(stageImg(container).getAttribute('src')).toBe(gonai.imageSrc);
    expect(stageImg(container).getAttribute('alt')).toBe(imageAlt(gonai.imageSrc as string, gonai.name));
    // Only the active tab shows its question and progress bar.
    expect(items[0].querySelector('em')?.textContent).toBe('Why GoNai?');
    expect(items[1].querySelector('em')).toBeNull();
    expect(items[0].querySelector('.tour-bar')).toBeTruthy();
    expect(items[1].querySelector('.tour-bar')).toBeNull();
  });

  it('loads every slide lazily -- the band sits below a 130vh hero, off-screen on load', () => {
    // No `priority` prop reaches ProjectFrame from here any more: that was an
    // LCP argument from when the tour lived inside the hero, and it now only
    // competes with the real LCP image for a slide that is guaranteed
    // off-screen on first paint.
    const { container } = render(<ProjectTour projects={three} locale="en" />);
    expect(stageImg(container).getAttribute('loading')).toBe('lazy');
    fireEvent.click(screen.getAllByRole('tab')[1]);
    expect(stageImg(container).getAttribute('loading')).toBe('lazy');
  });

  it('titles the window with the live host, else the project name', () => {
    const { container } = render(<ProjectTour projects={three} locale="en" />);
    expect(container.querySelector('.pframe-title')?.textContent).toBe('gonai-three.vercel.app');
    fireEvent.click(screen.getAllByRole('tab')[1]);
    expect(container.querySelector('.pframe-title')?.textContent).toBe('AISecretary');
  });

  it('jumps to a clicked tab, wires tabpanel to it, and announces the move', () => {
    const { container } = render(<ProjectTour projects={three} locale="en" />);
    const second = screen.getAllByRole('tab')[1];
    fireEvent.click(second);
    expect(second.getAttribute('aria-selected')).toBe('true');
    expect(stageImg(container).getAttribute('src')).toBe(secretary.imageSrc);
    const panel = screen.getByRole('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe(second.id);
    expect(second.getAttribute('aria-controls')).toBe(panel.id);
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe('AISecretary · 2 / 3');
  });

  it('advances on its own every TOUR_MS and wraps, without announcing', () => {
    vi.useFakeTimers();
    const { container } = render(<ProjectTour projects={three} locale="en" />);
    tick(TOUR_MS);
    expect(stageImg(container).getAttribute('src')).toBe(secretary.imageSrc);
    tick(TOUR_MS);
    expect(stageImg(container).getAttribute('src')).toBe(brief.imageSrc);
    tick(TOUR_MS);
    expect(stageImg(container).getAttribute('src')).toBe(gonai.imageSrc);
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe('');
  });

  it('holds still while the pointer is over the stage, and resumes after', () => {
    vi.useFakeTimers();
    const { container } = render(<ProjectTour projects={three} locale="en" />);
    const stage = screen.getByRole('tabpanel');
    fireEvent.mouseEnter(stage);
    tick(TOUR_MS * 2);
    expect(stageImg(container).getAttribute('src')).toBe(gonai.imageSrc);
    fireEvent.mouseLeave(stage);
    tick(TOUR_MS);
    expect(stageImg(container).getAttribute('src')).toBe(secretary.imageSrc);
  });

  it('also holds still while the pointer is over the tab list', () => {
    vi.useFakeTimers();
    const { container } = render(<ProjectTour projects={three} locale="en" />);
    const list = container.querySelector('.tour-list-wrap') as HTMLElement;
    fireEvent.mouseEnter(list);
    tick(TOUR_MS * 2);
    expect(stageImg(container).getAttribute('src')).toBe(gonai.imageSrc);
    fireEvent.mouseLeave(list);
    tick(TOUR_MS);
    expect(stageImg(container).getAttribute('src')).toBe(secretary.imageSrc);
  });

  it('pause stops the clock and play restarts it', () => {
    vi.useFakeTimers();
    const { container } = render(<ProjectTour projects={three} locale="en" />);
    const toggle = screen.getByRole('button', { name: dict.en.tourPause });
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe(dict.en.tourPlay);
    tick(TOUR_MS * 2);
    expect(stageImg(container).getAttribute('src')).toBe(gonai.imageSrc);
    fireEvent.click(toggle);
    tick(TOUR_MS);
    expect(stageImg(container).getAttribute('src')).toBe(secretary.imageSrc);
  });

  it('never autoplays under reduced motion and offers a still-view label instead of play/pause', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    vi.useFakeTimers();
    const { container } = render(<ProjectTour projects={three} locale="en" />);
    tick(TOUR_MS * 2);
    expect(stageImg(container).getAttribute('src')).toBe(gonai.imageSrc);
    expect(screen.queryByRole('button', { name: dict.en.tourPause })).toBeNull();
    expect(screen.getByText(dict.en.tourStill)).toBeTruthy();
  });

  it('prev/next wrap around', () => {
    const { container } = render(<ProjectTour projects={three} locale="en" />);
    fireEvent.click(screen.getByRole('button', { name: dict.en.tourPrev }));
    expect(stageImg(container).getAttribute('src')).toBe(brief.imageSrc);
    fireEvent.click(screen.getByRole('button', { name: dict.en.tourNext }));
    expect(stageImg(container).getAttribute('src')).toBe(gonai.imageSrc);
  });

  it('moves with the arrow keys, Home and End on the tab list (roving tabindex)', () => {
    const { container } = render(<ProjectTour projects={three} locale="en" />);
    const list = screen.getByRole('tablist');
    const items = screen.getAllByRole('tab');
    expect(items.map((b) => b.tabIndex)).toEqual([0, -1, -1]);
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(stageImg(container).getAttribute('src')).toBe(secretary.imageSrc);
    expect(items.map((b) => b.tabIndex)).toEqual([-1, 0, -1]);
    fireEvent.keyDown(list, { key: 'ArrowUp' });
    expect(stageImg(container).getAttribute('src')).toBe(gonai.imageSrc);
    fireEvent.keyDown(list, { key: 'End' });
    expect(stageImg(container).getAttribute('src')).toBe(brief.imageSrc);
    fireEvent.keyDown(list, { key: 'Home' });
    expect(stageImg(container).getAttribute('src')).toBe(gonai.imageSrc);
  });

  it('links the stage to the story, else the live site, else the code, else nothing', () => {
    const storied = render(<ProjectTour projects={[{ ...gonai, slug: 'gonai' }]} locale="en" />);
    const story = storied.container.querySelector('.tour-caption a') as HTMLAnchorElement;
    expect(story.getAttribute('href')).toBe('/en/work/gonai');
    expect(story.hasAttribute('target')).toBe(false);
    cleanup();
    const live = render(<ProjectTour projects={[gonai]} locale="en" />);
    const liveLink = live.container.querySelector('.tour-caption a') as HTMLAnchorElement;
    expect(liveLink.getAttribute('href')).toBe(gonai.liveUrl);
    expect(liveLink.getAttribute('target')).toBe('_blank');
    expect(liveLink.textContent).toContain(dict.en.liveSite);
    cleanup();
    const repo = render(<ProjectTour projects={[brief]} locale="en" />);
    expect(repo.container.querySelector('.tour-caption a')?.textContent).toContain(dict.en.viewCode);
    cleanup();
    const bare = render(<ProjectTour projects={[secretary]} locale="en" />);
    expect(bare.container.querySelector('.tour-caption a')).toBeNull();
  });

  it('captions with the outcome when there is one, else the description', () => {
    const { container } = render(<ProjectTour projects={[secretary, gonai]} locale="en" />);
    expect(container.querySelector('.tour-line')?.textContent).toBe('GoNai in one line');
    fireEvent.click(screen.getAllByRole('tab')[1]);
    expect(container.querySelector('.tour-line')?.textContent).toBe('Runs every morning');
  });

  it('renders nothing at all when no project has a screenshot', () => {
    const { container } = render(<ProjectTour projects={[talatify]} locale="en" />);
    expect(container.innerHTML).toBe('');
  });

  it('speaks Thai when locale is th', () => {
    const { container } = render(<ProjectTour projects={three} locale="th" />);
    expect(screen.getByRole('tablist').getAttribute('aria-label')).toBe(dict.th.tourListLabel);
    expect(screen.getByText(dict.th.tourLabel)).toBeTruthy();
    expect(container.querySelector('.tour-kicker')?.textContent).toBe(dict.th.workTypeBuild);
    expect(screen.getAllByRole('tab')[0].querySelector('em')?.textContent).toBe('ทำไมต้อง GoNai?');
    expect(screen.getByRole('button', { name: dict.th.tourNext })).toBeTruthy();
  });
});
