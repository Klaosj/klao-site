import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import projects from '@/content/fixtures/projects.json';
import type { Project } from '@/lib/models';
import { PROJECT_MEDIA, PROJECT_STATUS_KEYS, PROJECT_WASHES } from '@/lib/models';
import { mapProject } from '@/lib/notion-mappers';

const fixtures = projects as Project[];

// Width and height from a JPEG's frame header (SOF0-SOF3), or null.
function jpegSize(buf: Buffer): { width: number; height: number } | null {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length && buf[i] === 0xff) {
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xc3) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}
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

  // T18-f (CO-06, Q1 = A): every tour project that claims a phone frame has
  // the file, a JPEG no bigger than 250 KB, drawn for the 6:5 phone stage
  // at 2x (780 x 650). klao-site's frame is the HTML vignette, so it has none.
  it('gives the screenshot tour frames a real 6:5 phone image in public/, at most 250 KB', () => {
    const toured = fixtures.filter((p) => p.tour && p.media !== 'notion');
    expect(toured.map((p) => p.name)).toEqual(['Aje', 'GoNai']);
    for (const p of toured) {
      expect(p.screenshotPhone, p.name).toBe(`/images/${p.name.toLowerCase()}-phone.jpg`);
      const file = readFileSync(join('public', p.screenshotPhone!));
      expect(file.length, `${p.screenshotPhone} is ${file.length} bytes`).toBeLessThanOrEqual(250 * 1024);
      expect(jpegSize(file), p.screenshotPhone!).toEqual({ width: 780, height: 650 });
    }
    expect(byName('klao-site').screenshotPhone).toBeNull();
  });

  // Review M1: with a <picture>, one alt covers both the desktop frame and
  // the 6:5 phone frame, so it may only name what both show -- never the
  // desktop-only parts (Aje's uncertainty and next-test cards, GoNai's
  // budget prompt, which the phone crops away).
  it('describes only what both tour frames show in the alt of a project with a phone capture', () => {
    const desktopOnly = /uncertainty|next test|budget prompt|ความไม่แน่นอน|การทดสอบถัดไป|ช่องพิมพ์งบประมาณ/i;
    const withPhone = fixtures.filter((p) => p.screenshotPhone);
    expect(withPhone.map((p) => p.name)).toEqual(['Aje', 'GoNai']);
    for (const p of withPhone) {
      expect(p.alt!.en, p.name).not.toMatch(desktopOnly);
      expect(p.alt!.th, p.name).not.toMatch(desktopOnly);
    }
    expect(byName('Aje').alt).toEqual({
      en: 'Aje’s Review screen for a sample idea, BikeFix Home: its readiness level and a one-line summary of the idea.',
      th: 'หน้า Review ของ Aje สำหรับไอเดียตัวอย่าง BikeFix Home: ระดับความพร้อม และสรุปไอเดียในหนึ่งบรรทัด',
    });
    expect(byName('GoNai').alt).toEqual({
      en: 'GoNai home screen: the headline Plan a full day out, know every baht before you leave.',
      th: 'หน้าแรกของ GoNai: หัวข้อ วางแผนเที่ยวทั้งวัน รู้ทุกบาทก่อนออกจากบ้าน',
    });
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
