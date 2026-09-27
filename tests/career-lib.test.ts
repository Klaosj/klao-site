import { describe, expect, it } from 'vitest';
import {
  CAREER_EVENT,
  TOOLBOX_STACK,
  careerDates,
  currentYm,
  findCareerIndex,
  formatYm,
  labelAlign,
  monthIndex,
  monthsBetween,
  pillYears,
  railLabelOffset,
  railModel,
  splitFigureValue,
  toolboxColumns,
} from '@/lib/career';
import { getSkills } from '@/lib/content';
import type { Skill } from '@/lib/models';

const EN = {
  months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  present: 'Present',
  unit: 'mo',
};
const TH = {
  months: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
  present: 'ปัจจุบัน',
  unit: 'เดือน',
};

describe('CAREER_EVENT', () => {
  it('is the C8 event name', () => {
    expect(CAREER_EVENT).toBe('klao:career');
  });
});

describe('month arithmetic', () => {
  it('indexes YYYY-MM and rejects anything else', () => {
    expect(monthIndex('2026-03') - monthIndex('2025-03')).toBe(12);
    expect(monthIndex('2026-3')).toBeNaN();
    expect(monthIndex('2026-13')).toBeNaN();
    expect(monthIndex('')).toBeNaN();
  });

  it('counts months inclusively and never below one', () => {
    expect(monthsBetween('2026-03', '2026-09')).toBe(7);
    expect(monthsBetween('2024-05', '2026-03')).toBe(23);
    expect(monthsBetween('2026-05', '2026-03')).toBe(1); // EndDate typed before StartDate
    expect(monthsBetween('bad', '2026-03')).toBe(1);
  });

  it('reads the current month in Bangkok time, not UTC', () => {
    // 30 Sep 20:00 UTC is already 1 Oct 03:00 in Bangkok.
    expect(currentYm(new Date('2026-09-30T20:00:00Z'))).toBe('2026-10');
    expect(currentYm(new Date('2026-09-30T10:00:00Z'))).toBe('2026-09');
  });
});

describe('date labels', () => {
  it('formats the panel date line in both languages', () => {
    const current = { start: '2026-03', end: null, period: 'MAR 2026 – Present' };
    expect(careerDates(current, '2026-09', EN)).toBe('Mar 2026 – Present · 7 mo');
    expect(careerDates(current, '2026-09', TH)).toBe('มี.ค. 2026 – ปัจจุบัน · 7 เดือน');
    expect(careerDates({ start: '2024-05', end: '2026-03', period: '' }, '2026-09', EN)).toBe(
      'May 2024 – Mar 2026 · 23 mo',
    );
  });

  it('falls back to the hand-typed period for a row without dates (pre-migration Notion)', () => {
    expect(careerDates({ start: null, end: null, period: 'MAR 2026 – Present' }, '2026-09', EN)).toBe(
      'MAR 2026 – Present',
    );
  });

  it('shows a malformed month as typed rather than crashing', () => {
    expect(formatYm('2026-3', EN.months)).toBe('2026-3');
  });

  it('labels pills with years only', () => {
    expect(pillYears({ start: '2026-03', end: null }, 'now')).toBe('2026 – now');
    expect(pillYears({ start: '2024-05', end: '2026-03' }, 'now')).toBe('2024 – 2026');
    expect(pillYears({ start: '2023-08', end: '2023-12' }, 'now')).toBe('2023');
    expect(pillYears({ start: null, end: null }, 'now')).toBeNull();
  });
});

describe('railModel', () => {
  const entries = [
    { start: '2026-03', end: null },
    { start: '2024-05', end: '2026-03' },
    { start: '2023-08', end: '2023-12' },
    { start: '2023-04', end: '2023-08' },
    { start: '2021-05', end: '2022-12' },
  ];

  it('lays segments out proportionally from the first start to now (65 months)', () => {
    const r = railModel(entries, '2026-09')!;
    expect(r.segments).toHaveLength(5);
    expect(r.segments[0].left).toBeCloseTo((58 / 65) * 100, 5);
    expect(r.segments[0].width).toBeCloseTo((7 / 65) * 100, 5);
    // Casetify stops where Actmedia starts: the handover month is drawn once.
    expect(r.segments[1].left + r.segments[1].width).toBeCloseTo(r.segments[0].left, 5);
    expect(r.segments[4].left).toBe(0);
    expect(r.centers[0]).toBeCloseTo(((58 + 3.5) / 65) * 100, 5);
  });

  it('does not depend on the order the entries arrive in', () => {
    const shuffled = [entries[3], entries[0], entries[4], entries[1], entries[2]];
    const a = railModel(entries, '2026-09')!;
    const b = railModel(shuffled, '2026-09')!;
    expect(b.centers[1]).toBeCloseTo(a.centers[0]!, 5); // Actmedia
    expect(b.centers[0]).toBeCloseTo(a.centers[3]!, 5); // VELA
  });

  it('ticks every year: the first flush left, alternate years flagged for phone', () => {
    const r = railModel(entries, '2026-09')!;
    expect(r.ticks.map((t) => t.year)).toEqual([2021, 2022, 2023, 2024, 2025, 2026]);
    expect(r.ticks[0]).toMatchObject({ left: 0, first: true, alt: false });
    expect(r.ticks.filter((t) => !t.alt).map((t) => t.year)).toEqual([2021, 2023, 2025]);
    expect(r.ticks[1].left).toBeCloseTo((8 / 65) * 100, 5);
  });

  it('returns null when no entry has a start date (pre-migration Notion)', () => {
    expect(railModel([{ start: null, end: null }], '2026-09')).toBeNull();
    expect(railModel([], '2026-09')).toBeNull();
  });

  it('skips undated entries and keeps a future start inside the rail', () => {
    const r = railModel(
      [
        { start: null, end: null },
        { start: '2025-01', end: null },
        { start: '2027-01', end: null },
      ],
      '2026-01',
    )!;
    expect(r.centers[0]).toBeNull();
    expect(r.segments.map((s) => s.index)).toEqual([1, 2]);
    for (const s of r.segments) {
      expect(s.left).toBeGreaterThanOrEqual(0);
      expect(s.left + s.width).toBeLessThanOrEqual(100);
    }
  });

  it('aligns the marker label so it never runs off either end', () => {
    expect(labelAlign(5)).toBe('start');
    expect(labelAlign(50)).toBe('mid');
    expect(labelAlign(94.6)).toBe('end');
  });
});

// Fix wave finding 3: labelAlign's fixed 12/88% thresholds still clipped
// "A Bun Dance · 20 mo" on a narrow rail -- they know nothing about the
// label's actual measured width. railLabelOffset replaces them for the
// live (post-hydration) render with the prototype's own measured clamp
// (index.html ~l.1326-1333): centered by default, pulled in just enough to
// keep both edges inside the rail once the real widths are known.
describe('railLabelOffset', () => {
  it('centers the label on the marker when there is room on both sides', () => {
    // x = 50% of 280 = 140; a 100px label centered there (90..190) clears
    // both edges of a 280px rail, so the offset is untouched at -lw/2.
    expect(railLabelOffset(50, 280, 100)).toBe(-50);
  });

  it('pulls the label right so its left edge never passes the rail start', () => {
    // x = 5% of 280 = 14; centering a 100px label there would start at
    // -36 (off the left edge), so it clamps to lx = -x instead.
    expect(railLabelOffset(5, 280, 100)).toBe(-14);
  });

  it('pulls the label left so its right edge never passes the rail end', () => {
    // x = 94.6% of 358 ≈ 338.7; centering a 140px label there would end at
    // ≈408.7 (off the right edge of a 358px rail), so it clamps to
    // lx = railWidth - x - labelWidth.
    const x = (94.6 / 100) * 358;
    expect(railLabelOffset(94.6, 358, 140)).toBeCloseTo(358 - x - 140, 10);
  });

  it('matches labelAlign at the exact thresholds it used to gate on', () => {
    // A narrow-enough label at the old 12/88% boundary sees no clamping
    // either way -- same output as the centered case, proving this isn't a
    // regression for the common width, only for labels the old fixed
    // thresholds under- or over-clamped.
    expect(railLabelOffset(12, 1000, 40)).toBe(-20);
    expect(railLabelOffset(88, 1000, 40)).toBe(-20);
  });
});

describe('findCareerIndex', () => {
  const keys = [{ key: 'actmedia' }, { key: 'casetify' }, { key: 'a-bun-dance-craft-burger' }, { key: '' }];

  it('matches an exact key', () => {
    expect(findCareerIndex(keys, 'casetify')).toBe(1);
  });

  it('matches prototype-style and live-Notion variants of the same company', () => {
    expect(findCareerIndex([{ key: 'a-bun-dance' }], 'abundance')).toBe(0); // prototype FAQ link
    expect(findCareerIndex(keys, 'a-bun-dance')).toBe(2); // unique prefix of a longer Notion name
    expect(findCareerIndex(keys, 'CASETIFY')).toBe(1);
  });

  it('matches nothing for unknown, empty, too-short or ambiguous keys', () => {
    expect(findCareerIndex(keys, 'nope')).toBe(-1);
    expect(findCareerIndex(keys, '')).toBe(-1);
    expect(findCareerIndex(keys, '--')).toBe(-1);
    expect(findCareerIndex(keys, 'a')).toBe(-1);
    expect(findCareerIndex([{ key: 'abc-one' }, { key: 'abc-two' }], 'abc')).toBe(-1);
  });
});

describe('splitFigureValue', () => {
  it('marks letter-only words as units and keeps numerals whole', () => {
    expect(splitFigureValue('THB 1.1M')).toEqual([
      { text: 'THB', unit: true },
      { text: '1.1M', unit: false },
    ]);
    expect(splitFigureValue('~35%')).toEqual([{ text: '~35%', unit: false }]);
    expect(splitFigureValue('1.1 ล้านบาท')).toEqual([
      { text: '1.1', unit: false },
      { text: 'ล้านบาท', unit: true },
    ]);
    expect(splitFigureValue('   ')).toEqual([]);
  });
});

describe('toolboxColumns', () => {
  const labels = { stack: 'Works in', methods: 'Focus', languages: 'Languages' };
  const skill = (name: string, tier: Skill['tier']): Skill => ({ id: name, name, tier, category: 'biz', order: 1 });

  it('builds stack · methods · languages, stack in the curated order', () => {
    const cols = toolboxColumns(
      [skill('AI-assisted building (Claude)', 'top'), skill('Python', 'working'), skill('Salesforce', 'daily'), skill('Pandas', 'working')],
      labels,
      ['Thai', 'English (conversational)'],
    );
    expect(cols.map((c) => c.id)).toEqual(['stack', 'methods', 'languages']);
    expect(cols[0]).toEqual({ id: 'stack', label: 'Works in', items: ['Salesforce', 'Python'] });
    expect(cols[1].items).toEqual(['AI-assisted building (Claude)']);
    expect(cols[2]).toEqual({ id: 'languages', label: 'Languages', items: ['Thai', 'English (conversational)'] });
  });

  it('drops empty columns instead of rendering a bare heading', () => {
    expect(toolboxColumns([], labels, ['Thai']).map((c) => c.id)).toEqual(['languages']);
  });

  it('reproduces the prototype toolbox from the real skills fixture', async () => {
    const cols = toolboxColumns(await getSkills(), labels, []);
    expect(cols[0].items).toEqual([...TOOLBOX_STACK]);
    expect(cols[1].items).toEqual([
      'AI-assisted building (Claude)',
      'Sales forecasting',
      'Retail media & shopper media',
      'PMO / project delivery',
    ]);
  });
});
