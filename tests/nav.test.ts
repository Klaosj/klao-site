import { describe, expect, it } from 'vitest';
import { dict } from '@/lib/dictionary';
import { NAV_LABEL_KEY, NAV_SECTIONS, sectionHref } from '@/lib/nav';

describe('NAV_SECTIONS (C7)', () => {
  it('lists the four section links in page order', () => {
    expect(NAV_SECTIONS).toEqual(['work', 'career', 'story', 'faq']);
  });

  it('labels them with the prototype words in both languages', () => {
    expect(NAV_SECTIONS.map((s) => dict.en[NAV_LABEL_KEY[s]])).toEqual(['Projects', 'Career', 'How I work', 'FAQ']);
    expect(NAV_SECTIONS.map((s) => dict.th[NAV_LABEL_KEY[s]])).toEqual(['โปรเจกต์', 'เส้นทางอาชีพ', 'วิธีทำงาน', 'FAQ']);
  });
});

describe('sectionHref', () => {
  it('stays a bare hash on the home page, with or without a trailing slash', () => {
    expect(sectionHref('#work', '/en', 'en')).toBe('#work');
    expect(sectionHref('#faq', '/th/', 'th')).toBe('#faq');
  });

  it('points back at the same-language home page from any other route', () => {
    expect(sectionHref('#work', '/en/projects', 'en')).toBe('/en#work');
    expect(sectionHref('#contact', '/th/writing/some-post', 'th')).toBe('/th#contact');
  });
});
