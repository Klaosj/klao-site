import { describe, expect, it } from 'vitest';
import { dict } from '@/lib/dictionary';

describe('dictionary', () => {
  it('has the same key set in both locales', () => {
    expect(Object.keys(dict.th).sort()).toEqual(Object.keys(dict.en).sort());
  });

  it('carries exactly six craft imperatives in both locales', () => {
    expect(dict.en.craft).toHaveLength(6);
    expect(dict.th.craft).toHaveLength(6);
  });

  it('has no empty strings in either locale', () => {
    for (const d of [dict.en, dict.th]) {
      for (const [k, v] of Object.entries(d)) {
        if (typeof v === 'string') expect(v.length, `${k} is empty`).toBeGreaterThan(0);
      }
    }
  });

  // Guards against a `th` entry that is a copy-paste of its `en`
  // counterpart -- a value that is non-empty (so the "no empty strings"
  // test above misses it) but was never actually translated. Every key
  // in this dictionary currently has genuinely distinct en/th wording
  // (including the shared "Business Development ·" prefix in roleLine,
  // which diverges after the separator), so this assertion has no known
  // false positives to carve out. If a future key legitimately needs the
  // same string in both locales (e.g. a brand name or a URL), add it to
  // `sharedKeys` below rather than weakening this check.
  it('has no untranslated (en === th) string values, aside from explicitly shared keys', () => {
    const sharedKeys = new Set<string>();
    for (const [k, enVal] of Object.entries(dict.en)) {
      if (sharedKeys.has(k)) continue;
      const thVal = (dict.th as Record<string, unknown>)[k];
      if (typeof enVal === 'string') {
        expect(thVal, `${k} is identical in en and th`).not.toBe(enVal);
      } else if (Array.isArray(enVal)) {
        const thArr = thVal as unknown[];
        enVal.forEach((item, i) => {
          expect(thArr[i], `${k}[${i}] is identical in en and th`).not.toBe(item);
        });
      }
    }
  });

  it('carries the work-deck chapter labels and subtitle in both locales', () => {
    expect(dict.en.workTypeBusiness).toBe('Business');
    expect(dict.en.workTypeBuild).toBe('Build');
    expect(dict.en.deckSubtitle).toBeTruthy();
    expect(dict.th.workTypeBusiness).toBeTruthy();
    expect(dict.th.workTypeBuild).toBeTruthy();
    expect(dict.th.deckSubtitle).toBeTruthy();
  });

  it('carries the project-tour labels in both locales', () => {
    expect(dict.en.tourLabel).toBe('Things I shipped, running');
    expect(dict.en.tourListLabel).toBe('Project tour');
    expect(dict.en.tourPrev).toBe('Previous project');
    expect(dict.en.tourNext).toBe('Next project');
    expect(dict.en.tourPause).toBe('Pause the tour');
    expect(dict.en.tourPlay).toBe('Play the tour');
    expect(dict.en.tourStill).toBe('Still view');
    for (const k of ['tourLabel', 'tourListLabel', 'tourPrev', 'tourNext', 'tourPause', 'tourPlay', 'tourStill'] as const) {
      expect(dict.th[k]).toBeTruthy();
    }
  });

  it('carries the P4 copy from the approved prototype', () => {
    expect(dict.en.faqTitle).toBe('What people usually ask.');
    expect(dict.th.faqTitle).toBe('คำถามที่เจอบ่อย');
    expect(dict.en.askBadge).toBe('Preview');
    expect(dict.th.askBadge).toBe('ตัวอย่าง');
    expect(dict.en.footerNote).toBe('Built at night, powered by good coffee.');
    expect(dict.th.footerNote).toBe('สร้างตอนกลางคืน ด้วยกาแฟดีๆ');
    expect(dict.th.contentUpdated).toBe('อัปเดตเนื้อหาล่าสุด');
  });

  it('keeps every template slot in both locales', () => {
    for (const l of ['en', 'th'] as const) {
      expect(dict[l].palNone, l).toContain('{q}');
      expect(dict[l].palAsk, l).toContain('{q}');
      expect(dict[l].palCount, l).toContain('{n}');
      expect(dict[l].askSourceN, l).toContain('{n}');
      expect(dict[l].askReady, l).toContain('{n}');
      expect(dict[l].askDeclined, l).toContain('{email}');
    }
  });

  it('never promises instant updates (the site refreshes through ISR, about an hour)', () => {
    expect(JSON.stringify(dict)).not.toMatch(/instant|immediately|ทันที/i);
  });
});
