import { describe, expect, it } from 'vitest';
import { MAIL_SUBJECT, mailtoHref, slugKey } from '@/lib/format';

describe('slugKey', () => {
  it('lower-cases a project or company name into a URL-safe key', () => {
    expect(slugKey('GoNai')).toBe('gonai');
    expect(slugKey('klao-site')).toBe('klao-site');
    expect(slugKey('Actmedia')).toBe('actmedia');
  });

  it('turns every other run of characters into one hyphen and trims hyphens at both ends', () => {
    expect(slugKey('MMB Technology Co., Ltd.')).toBe('mmb-technology-co-ltd');
    expect(slugKey('A Bun Dance (Craft Burger)')).toBe('a-bun-dance-craft-burger');
    expect(slugKey('  VELA Central World  ')).toBe('vela-central-world');
  });

  it('keeps the base letter of an accented name instead of dropping it', () => {
    expect(slugKey('Résumé Café')).toBe('resume-cafe');
  });

  it('only ever returns the [a-z0-9-] shape that parseSheetHash (C6) accepts', () => {
    for (const s of ['Talatify', 'Tripedia', 'Aje', 'GoNai', 'klao-site', 'Casetify', '100% Real!!']) {
      expect(slugKey(s)).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it('keeps the Latin part of a mixed Thai + English name', () => {
    expect(slugKey('GoNai ไปไหน')).toBe('gonai');
  });

  it("returns '' when nothing slug-safe is left (Thai-only, empty, punctuation) and never throws", () => {
    expect(slugKey('ตลาดสด')).toBe('');
    expect(slugKey('')).toBe('');
    expect(slugKey('---')).toBe('');
  });
});

describe('mailtoHref', () => {
  it('opens a draft with the site subject line, URL-encoded', () => {
    expect(MAIL_SUBJECT).toBe('Hello from klao-site');
    expect(mailtoHref('klao@example.com')).toBe('mailto:klao@example.com?subject=Hello%20from%20klao-site');
  });
});
