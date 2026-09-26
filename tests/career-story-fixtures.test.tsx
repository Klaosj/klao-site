import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import careerFixture from '@/content/fixtures/career.json';
import profileFixture from '@/content/fixtures/profile.json';
import storyFixture from '@/content/fixtures/story.json';
import { Sketch } from '@/components/sketches';
import { getCareer, getProfile, getStory } from '@/lib/content';
import { slugKey } from '@/lib/format';
import { isStoryIcon, isStorySketch } from '@/lib/story';
import type { CareerEntry, StoryChapter } from '@/lib/models';

// Two-layer rule (master Global Constraints): the fixtures are what the site
// renders without Notion, so they must carry every field the mapper
// produces. A JSON import is only *cast* to CareerEntry[], so tsc cannot see
// a missing key here -- these tests can.
describe('career fixture (P3 fields, prototype copy)', () => {
  const FIELDS = ['company', 'end', 'figure', 'id', 'key', 'order', 'period', 'role', 'start', 'wins'];

  it('carries every CareerEntry field on every row', () => {
    for (const row of careerFixture as Record<string, unknown>[]) {
      expect(Object.keys(row).sort()).toEqual(FIELDS);
    }
  });

  it('derives each key from the company exactly as the Notion mapper does', () => {
    for (const entry of careerFixture as CareerEntry[]) expect(entry.key).toBe(slugKey(entry.company));
  });

  it('lists the five prototype roles newest first, with valid YYYY-MM dates', async () => {
    const career = await getCareer();
    expect(career.map((e) => e.company)).toEqual([
      'Actmedia',
      'Casetify',
      'MMB Technology',
      'VELA Central World',
      'A Bun Dance',
    ]);
    for (const e of career) {
      expect(e.start).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
      if (e.end !== null) expect(e.end).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
    }
    expect(career[0].end).toBeNull();
  });

  it('labels THB 1.1M as his personal monthly target, noted "Target met" (spec decision, 24 Sep)', async () => {
    const casetify = (await getCareer()).find((e) => e.key === 'casetify');
    expect(casetify?.figure?.value).toBe('THB 1.1M');
    expect(casetify?.figure?.label.en.startsWith('My personal monthly sales target')).toBe(true);
    expect(casetify?.figure?.note).toEqual({ en: 'Target met', th: 'ทำถึงเป้า' });
    // The old fixture called it the store's target; that framing is retired.
    expect(JSON.stringify(careerFixture)).not.toMatch(/store(’|')s THB 1\.1M/);
  });

  it('spells Actmedia the approved way', () => {
    expect(JSON.stringify(careerFixture)).not.toContain('ActMedia');
  });
});

describe('profile fixture (P3 fields)', () => {
  it('carries the prologue with one bold clause per language and the prototype closing line', async () => {
    const p = await getProfile();
    expect(p.prologue?.en).toContain(
      '**Now I do business development at Actmedia by day, and build my own tools at night.**',
    );
    expect(p.prologue?.th.match(/\*\*/g)).toHaveLength(2);
    expect(p.closingLine).toEqual({
      en: 'Business developer who builds his own tools.',
      th: 'นัก Business Development ที่สร้างเครื่องมือ|ใช้เอง',
    });
  });

  it('spells Actmedia the approved way everywhere in the profile', () => {
    expect(JSON.stringify(profileFixture)).not.toContain('ActMedia');
  });
});

describe('story fixture (prototype CH + RULES)', () => {
  const chapters = storyFixture as StoryChapter[];

  it('has six chapters ordered 1..6, each body with exactly one bold clause per language', () => {
    expect(chapters.map((c) => c.order)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(chapters[0].title).toEqual({ en: 'Find the room.', th: 'หาห้องที่ใช่' });
    expect(chapters[5].rule.en).toBe('Leave it maintainable.');
    for (const c of chapters) {
      expect(c.body.en.match(/\*\*/g)).toHaveLength(2);
      expect(c.body.th.match(/\*\*/g)).toHaveLength(2);
    }
  });

  it('uses only icon and sketch names the page can draw; chapter 6 has no sketch (phase strip instead)', () => {
    for (const c of chapters) {
      expect(isStoryIcon(c.icon)).toBe(true);
      if (c.sketch) expect(isStorySketch(c.sketch)).toBe(true);
    }
    expect(chapters[5].sketch).toBe('');
    expect(isStoryIcon('not-an-icon')).toBe(false);
    expect(isStorySketch('nope')).toBe(false);
  });

  it('every named sketch renders an <svg> through the P0 Sketch component', () => {
    for (const c of chapters) {
      if (!isStorySketch(c.sketch)) continue;
      expect(renderToStaticMarkup(<Sketch name={c.sketch} />)).toContain('<svg');
    }
  });
});

describe('getStory (fixture mode)', () => {
  it('returns the six fixture chapters sorted by order', async () => {
    const story = await getStory();
    expect(story.map((c) => c.order)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(story[0].title.en).toBe('Find the room.');
  });
});
