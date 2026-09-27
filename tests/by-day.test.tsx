// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ByDay from '@/components/sections/ByDay';
import profileFixture from '@/content/fixtures/profile.json';
import storyFixture from '@/content/fixtures/story.json';
import { dict } from '@/lib/dictionary';
import type { Profile, StoryChapter } from '@/lib/models';
import { stubMatchMedia } from './helpers/media';

afterEach(cleanup);

beforeEach(() => {
  stubMatchMedia();
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  // Amendment A10's remembered choice starts clean for every test -- a real
  // browser's storage otherwise leaks the previous test's click into this one.
  window.localStorage.clear();
});

const profile = profileFixture as Profile;
const chapters = storyFixture as StoryChapter[];
// Display-mode ThaiText (C-5) can glue a Thai/non-Thai boundary with a
// no-break space (U+00A0) instead of a plain one; normalise it back so these
// assertions read like plain copy. ​ (zero-width space) has no source
// here today, but is stripped too in case a future keep-run pattern adds one.
const norm = (s: string | null | undefined): string =>
  (s ?? '').replace(/ /g, ' ').replace(/​/g, '').trim();

describe('ByDay', () => {
  it('renders the prologue: eyebrow, headline, lead, the owner-side story with its bold clause, portrait', () => {
    const { container } = render(<ByDay profile={profile} chapters={chapters} locale="en" />);
    const section = container.querySelector('section#story') as HTMLElement;
    expect(section.getAttribute('aria-labelledby')).toBe('story-h');
    expect(norm(section.querySelector('.t-eyebrow')?.textContent)).toBe('By day');
    expect(norm(section.querySelector('h2#story-h')?.textContent)).toBe(dict.en.aboutHeading);
    expect(norm(section.querySelector('.t-lead')?.textContent)).toBe(dict.en.storyLead);
    expect(norm(section.querySelector('.bd-about strong')?.textContent)).toBe(
      'Now I do business development at Actmedia by day, and build my own tools at night.',
    );
    const img = section.querySelector('img.bd-portrait') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(profile.photoSrc);
    expect(img.getAttribute('width')).toBe('240');
    expect(img.getAttribute('height')).toBe('240');
    expect(img.getAttribute('alt')).toBe(dict.en.portraitAlt);
  });

  it('renders six numbered chapters in order, each with rule, icon, title and one bold clause', () => {
    const { container } = render(<ByDay profile={profile} chapters={chapters} locale="en" />);
    const items = [...container.querySelectorAll('ol.bd-chapters > li')];
    expect(items).toHaveLength(6);
    expect(items.map((li) => li.querySelector('.bd-num')?.textContent)).toEqual(['01', '02', '03', '04', '05', '06']);
    expect(norm(items[0].querySelector('h3')?.textContent)).toBe('Find the room.');
    expect(norm(items[0].querySelector('.bd-rule')?.textContent)).toBe('Scope it honestly.');
    expect(items[0].querySelector('.bd-rule svg')).not.toBeNull();
    expect(items[0].querySelector('.bd-sk svg')).not.toBeNull();
    for (const li of items) expect(li.querySelectorAll('.bd-body strong')).toHaveLength(1);
  });

  it('gives only the last chapter the five-phase strip and the three health words', () => {
    const { container } = render(<ByDay profile={profile} chapters={chapters} locale="en" />);
    const items = [...container.querySelectorAll('ol.bd-chapters > li')];
    const phases = items[5].querySelector('ol.bd-phases') as HTMLElement;
    expect(phases.getAttribute('aria-label')).toBe(dict.en.storyPhasesLabel);
    expect([...phases.querySelectorAll('li')].map((li) => norm(li.textContent))).toEqual([...dict.en.storyPhases]);
    expect([...items[5].querySelectorAll('.bd-legend li')].map((li) => norm(li.textContent))).toEqual([
      ...dict.en.storyHealth,
    ]);
    expect(items[5].querySelector('.bd-sk svg')).toBeNull();
    for (const li of items.slice(0, 5)) expect(li.querySelector('.bd-phases')).toBeNull();
  });

  it('closes with the Notion closing line and a link back to the tour', () => {
    const { container } = render(<ByDay profile={profile} chapters={chapters} locale="en" />);
    expect(norm(container.querySelector('.bd-closing')?.textContent)).toBe('Business developer who builds his own tools.');
    expect(container.querySelector('.bd-close a[href="#top"]')?.textContent).toBe(dict.en.backToTour);
  });

  it('renders Thai copy for locale th, with the | break marker removed', () => {
    const { container } = render(<ByDay profile={profile} chapters={chapters} locale="th" />);
    expect(norm(container.querySelector('.t-eyebrow')?.textContent)).toBe('ตอนกลางวัน');
    expect(norm(container.querySelector('ol.bd-chapters > li h3')?.textContent)).toBe('หาห้องที่ใช่');
    const closing = norm(container.querySelector('.bd-closing')?.textContent);
    expect(closing).toBe('นัก Business Development ที่สร้างเครื่องมือใช้เอง');
    expect(closing).not.toContain('|');
  });

  it('closes on the headline and drops the story paragraph for a pre-migration profile', () => {
    const bare: Profile = { ...profile, prologue: null, closingLine: null };
    const { container } = render(<ByDay profile={bare} chapters={chapters} locale="en" />);
    expect(container.querySelector('.bd-about')).toBeNull();
    expect(norm(container.querySelector('.bd-closing')?.textContent)).toBe(profile.headline.en);
  });

  it('omits the chapter list (never an empty <ol>) when there are no chapters, and the portrait when there is no photo', () => {
    const { container } = render(<ByDay profile={{ ...profile, photoSrc: null }} chapters={[]} locale="en" />);
    expect(container.querySelector('ol')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('h2#story-h')).not.toBeNull();
    expect(container.querySelector('.bd-closing')).not.toBeNull();
    // The Short/Full control has nothing to control without chapters.
    expect(container.querySelector('[role="radiogroup"]')).toBeNull();
  });

  it('renders a chapter with unknown Icon/Sketch names without them, and without throwing', () => {
    const odd: StoryChapter = { ...chapters[0], id: 'odd', icon: 'not-an-icon', sketch: 'nope' };
    const { container } = render(<ByDay profile={profile} chapters={[odd]} locale="en" />);
    const li = container.querySelector('ol.bd-chapters > li') as HTMLElement;
    expect(li.querySelector('.bd-rule svg')).toBeNull();
    expect(li.querySelector('.bd-sk svg')).toBeNull();
    expect(norm(li.querySelector('h3')?.textContent)).toBe('Find the room.');
  });

  it('renders HTML-looking Notion body text as text', () => {
    const odd: StoryChapter = { ...chapters[0], id: 'html', body: { en: '<img src=x onerror=alert(1)> **ok**', th: '' } };
    const { container } = render(<ByDay profile={profile} chapters={[odd]} locale="en" />);
    expect(container.querySelector('.bd-body img')).toBeNull();
    expect(container.querySelector('.bd-body')?.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('ships every chapter -- title and body -- in the server HTML with nothing hidden (no JS, Master Review Focus #4 / amendment A10)', () => {
    const html = renderToStaticMarkup(<ByDay profile={profile} chapters={chapters} locale="en" />);
    expect(html).toContain('id="story"');
    for (const c of chapters) {
      expect(html).toContain(c.title.en);
      // The plain-text lead-in before the bold clause -- proves the body
      // paragraph itself ships, not just the title (A10: "no-JS render
      // contains every body").
      expect(html).toContain(c.body.en.split('**')[0].trim());
    }
    expect(html).toContain('Post-launch audit');
    expect(html).not.toMatch(/opacity:\s*0/);
    // A10: without JavaScript the page must show Full -- nothing carries the
    // native `hidden` attribute that Short applies after hydration.
    expect(html).not.toContain('hidden=""');
  });

  it('keeps the spec §10 layout: two columns from 1068 px, 48 px between chapters on phone, no transitions', () => {
    const css = readFileSync(join(process.cwd(), 'src/components/by-day.css'), 'utf8');
    const wide = css.slice(css.indexOf('@media (min-width: 1068px)'));
    expect(wide).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    const phone = css.slice(css.indexOf('@media (max-width: 734px)'));
    expect(phone).toMatch(/\.bd-ch \{[^}]*margin-bottom: 48px/);
    expect(css).not.toMatch(/transition:/);
  });

  // --- Amendment A10: Short/Full segmented control -------------------------

  it('defaults to Short once mounted, hiding every chapter body, sketch and the last chapter\'s launch strip', () => {
    const { container } = render(<ByDay profile={profile} chapters={chapters} locale="en" />);
    const group = screen.getByRole('radiogroup', { name: dict.en.storyDetailLabel });
    expect(within(group).getByRole('radio', { name: dict.en.storyShort }).getAttribute('aria-checked')).toBe('true');
    expect(within(group).getByRole('radio', { name: dict.en.storyFull }).getAttribute('aria-checked')).toBe('false');
    const items = [...container.querySelectorAll('ol.bd-chapters > li')];
    for (const li of items) expect((li.querySelector('.bd-body') as HTMLElement).hidden).toBe(true);
    expect((items[0].querySelector('.bd-sk:not(.bd-sk-none)') as HTMLElement).hidden).toBe(true);
    expect((items[5].querySelector('.bd-phases') as HTMLElement).hidden).toBe(true);
    expect((items[5].querySelector('.bd-legend') as HTMLElement).hidden).toBe(true);
    // Number, rule label and title are never hidden by Short.
    expect((items[0].querySelector('.bd-num') as HTMLElement).hidden).toBe(false);
    expect((items[0].querySelector('.bd-rule') as HTMLElement).hidden).toBe(false);
    expect((items[0].querySelector('h3') as HTMLElement).hidden).toBe(false);
  });

  it('shows bodies and sketches again on Full, and hides them again back on Short', () => {
    const { container } = render(<ByDay profile={profile} chapters={chapters} locale="en" />);
    const body = () => container.querySelector('ol.bd-chapters > li .bd-body') as HTMLElement;
    expect(body().hidden).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: dict.en.storyFull }));
    expect(body().hidden).toBe(false);
    fireEvent.click(screen.getByRole('radio', { name: dict.en.storyShort }));
    expect(body().hidden).toBe(true);
  });

  it('remembers a Full choice across a remount, via localStorage', () => {
    const first = render(<ByDay profile={profile} chapters={chapters} locale="en" />);
    fireEvent.click(screen.getByRole('radio', { name: dict.en.storyFull }));
    first.unmount();
    const { container } = render(<ByDay profile={profile} chapters={chapters} locale="en" />);
    expect((container.querySelector('.bd-body') as HTMLElement).hidden).toBe(false);
  });

  it('is harmless when localStorage throws on every access (amendment A10)', () => {
    const realStorage = Object.getOwnPropertyDescriptor(window, 'localStorage')!;
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });
    try {
      const { container } = render(<ByDay profile={profile} chapters={chapters} locale="en" />);
      // Read failed -> falls back to the amendment's own default (Short).
      expect((container.querySelector('.bd-body') as HTMLElement).hidden).toBe(true);
      expect(() => fireEvent.click(screen.getByRole('radio', { name: dict.en.storyFull }))).not.toThrow();
      expect((container.querySelector('.bd-body') as HTMLElement).hidden).toBe(false);
    } finally {
      Object.defineProperty(window, 'localStorage', realStorage);
    }
  });
});
