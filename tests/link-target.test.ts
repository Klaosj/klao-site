import { describe, expect, it } from 'vitest';
import { CONTACT_SUBJECT, faqAnchorId, isLinkTarget, mailto, parseTarget, targetHref } from '@/lib/link-target';

describe('parseTarget', () => {
  it('reads the four target kinds of contract C5', () => {
    expect(parseTarget('work')).toEqual({ kind: 'section', id: 'work' });
    expect(parseTarget('toolbox')).toEqual({ kind: 'section', id: 'toolbox' });
    expect(parseTarget('career:actmedia')).toEqual({ kind: 'career', key: 'actmedia' });
    expect(parseTarget('work/gonai')).toEqual({ kind: 'sheet', key: 'gonai' });
    expect(parseTarget('work/klao-site')).toEqual({ kind: 'sheet', key: 'klao-site' });
    expect(parseTarget('https://gonai-three.vercel.app')).toEqual({
      kind: 'external',
      url: 'https://gonai-three.vercel.app',
    });
  });

  it('trims the stray spaces a Notion line tends to carry', () => {
    expect(parseTarget('  contact ')).toEqual({ kind: 'section', id: 'contact' });
  });

  it('refuses everything outside the grammar, including script and plain-http URLs', () => {
    const bad = [
      '',
      ' ',
      'javascript:alert(1)',
      'data:text/html,hi',
      'http://insecure.test',
      'https://',
      'work/',
      'work/GoNai', // same rule as the sheet's own hash parser: lower-case keys only
      'career:',
      'career:Act Media',
      'Work',
      '#faq',
      '/en#faq',
      'faq section',
    ];
    for (const raw of bad) {
      expect(parseTarget(raw), raw).toBeNull();
      expect(isLinkTarget(raw), raw).toBe(false);
    }
  });
});

describe('targetHref', () => {
  it('gives every kind a real href, so links work with JavaScript off and from other routes', () => {
    expect(targetHref('work', 'en')).toBe('/en#work');
    expect(targetHref('career:abundance', 'th')).toBe('/th#career');
    expect(targetHref('work/gonai', 'en')).toBe('/en#work/gonai');
    expect(targetHref('https://github.com/Klaosj', 'th')).toBe('https://github.com/Klaosj');
    expect(targetHref('javascript:alert(1)', 'en')).toBeNull();
  });
});

describe('faqAnchorId', () => {
  it('turns fixture ids and Notion UUIDs into section-grammar ids', () => {
    expect(faqAnchorId('fx-faq-day')).toBe('faq-fx-faq-day');
    expect(faqAnchorId('3E4A127D-90D7-8059')).toBe('faq-3e4a127d-90d7-8059');
    expect(isLinkTarget(faqAnchorId('3e4a127d90d78059905aee7814302015'))).toBe(true);
  });
});

describe('mailto', () => {
  it('encodes the subject, Thai included', () => {
    expect(mailto('a@b.co', CONTACT_SUBJECT)).toBe('mailto:a@b.co?subject=Hello%20from%20klao-site');
    expect(mailto('a@b.co', 'คำถามที่ยังเปิดอยู่')).toBe(
      `mailto:a@b.co?subject=${encodeURIComponent('คำถามที่ยังเปิดอยู่')}`,
    );
  });
});
