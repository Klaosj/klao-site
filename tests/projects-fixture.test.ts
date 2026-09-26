import { statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import projects from '@/content/fixtures/projects.json';
import type { Project } from '@/lib/models';
import { PROJECT_MEDIA, PROJECT_STATUS_KEYS, PROJECT_WASHES } from '@/lib/models';
import { mapProject } from '@/lib/notion-mappers';

const fixtures = projects as Project[];
const byName = (name: string) => fixtures.find((p) => p.name === name)!;

describe('projects fixture (the 24-Sep lineup)', () => {
  it('is the approved lineup, in page order', () => {
    const ordered = [...fixtures].sort((a, b) => a.order - b.order).map((p) => p.name);
    expect(ordered).toEqual(['Talatify', 'Tripedia', 'Aje', 'GoNai', 'klao-site']);
  });

  it('carries exactly the fields the Notion mapper produces — the two-layer rule', () => {
    const minimalRow = { id: 'row', properties: { Name: { title: [{ plain_text: 'X' }] } } };
    const keys = Object.keys(mapProject(minimalRow)!).sort();
    for (const p of fixtures) expect(Object.keys(p).sort(), p.name).toEqual(keys);
  });

  it('uses only valid select values', () => {
    for (const p of fixtures) {
      if (p.statusKey !== null) expect(PROJECT_STATUS_KEYS).toContain(p.statusKey);
      expect(PROJECT_MEDIA).toContain(p.media);
      expect(PROJECT_WASHES).toContain(p.wash);
    }
  });

  it('fills status, kicker, alt and question in both languages on every project', () => {
    for (const p of fixtures) {
      for (const field of [p.status, p.kicker, p.alt, p.question]) {
        expect(field?.en, p.name).toBeTruthy();
        expect(field?.th, p.name).toBeTruthy();
      }
    }
  });

  it('tours the three builds, Aje → GoNai → klao-site', () => {
    const toured = fixtures.filter((p) => p.tour).sort((a, b) => (a.tourOrder ?? 99) - (b.tourOrder ?? 99));
    expect(toured.map((p) => p.name)).toEqual(['Aje', 'GoNai', 'klao-site']);
  });

  it('links GoNai back to Tripedia — same idea, four years apart — and nothing else', () => {
    expect(byName('GoNai').lineageOf).toBe(byName('Tripedia').id);
    expect(fixtures.filter((p) => p.lineageOf !== null)).toHaveLength(1);
  });

  it('gives klao-site the Notion-row vignette instead of the old dark screenshot', () => {
    expect(byName('klao-site').media).toBe('notion');
    expect(byName('klao-site').imageSrc).toBeNull();
  });

  it('points every screenshot at a real file in public/, at most 250 KB', () => {
    for (const p of fixtures.filter((x) => x.imageSrc)) {
      const size = statSync(join('public', p.imageSrc!)).size;
      expect(size, `${p.imageSrc} is ${size} bytes`).toBeLessThanOrEqual(250 * 1024);
    }
  });

  it('keeps the single-line outcome in step with the outcomes list', () => {
    for (const p of fixtures) {
      if (p.outcomes.en.length === 0) expect(p.outcome).toBeNull();
      else expect(p.outcome).toEqual({ en: p.outcomes.en.join(' · '), th: p.outcomes.th.join(' · ') });
    }
  });

  it('keeps "|" break marks out of project copy — /projects still prints it without ThaiText', () => {
    expect(JSON.stringify(fixtures)).not.toContain('|');
  });
});
