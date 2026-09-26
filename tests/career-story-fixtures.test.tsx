import { describe, expect, it } from 'vitest';
import careerFixture from '@/content/fixtures/career.json';
import profileFixture from '@/content/fixtures/profile.json';
import { getCareer, getProfile } from '@/lib/content';
import { slugKey } from '@/lib/format';
import type { CareerEntry } from '@/lib/models';

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
