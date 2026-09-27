import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import careerFixture from '@/content/fixtures/career.json';
import faqFixture from '@/content/fixtures/faq.json';
import projectsFixture from '@/content/fixtures/projects.json';
import { ASK_CANNED, askPreview } from '@/lib/ask';
import { parseTarget } from '@/lib/link-target';
import type { CareerEntry, FaqItem, Project } from '@/lib/models';
import { projectKey } from '@/lib/sheet-url';

const faq = faqFixture as FaqItem[];
const fetchSpy = vi.fn();

beforeEach(() => {
  fetchSpy.mockReset();
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  // Global constraint: the Ask Preview never touches the network.
  expect(fetchSpy).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

describe('askPreview', () => {
  it('declines pay and rate questions instead of guessing', () => {
    expect(askPreview('What is his salary?', faq, 'en')).toEqual({
      kind: 'decline',
      query: 'What is his salary?',
      lang: 'en',
    });
    expect(askPreview('เงินเดือนเท่าไหร่', faq, 'en')).toMatchObject({ kind: 'decline', lang: 'th' });
  });

  it('answers from the canned set with numbered sources', () => {
    const a = askPreview('Has he done a startup?', faq, 'en');
    expect(a.kind).toBe('answer');
    if (a.kind !== 'answer') return;
    expect(a.lang).toBe('en');
    expect(a.text).toContain('[1]');
    expect(a.text).toContain('[2]');
    expect(a.sources.map((s) => s.target)).toEqual(['work/tripedia', 'work/talatify']);
    expect(a.sources[0]).toEqual({
      label: 'Projects · Tripedia',
      quote: 'Final 30 of 500 teams',
      target: 'work/tripedia',
    });
  });

  it('answers in the language the question was asked in, whatever the page language', () => {
    const a = askPreview('เคยทำสตาร์ทอัพไหม', faq, 'en');
    expect(a).toMatchObject({ kind: 'answer', lang: 'th' });
    if (a.kind === 'answer') expect(a.sources[0].quote).toBe('เข้ารอบ 30 ทีมสุดท้ายจาก 500 ทีม');
  });

  it('takes the first canned entry that matches (prototype order)', () => {
    const a = askPreview('what is he working on right now', faq, 'en');
    expect(a.kind === 'answer' && a.sources.map((s) => s.target)).toEqual([
      'career:actmedia',
      'work/gonai',
      'work/aje',
    ]);
  });

  it('falls back to Klao’s FAQ when no canned entry matches', () => {
    const a = askPreview('How do I reach him?', faq, 'en');
    expect(a.kind).toBe('answer');
    if (a.kind !== 'answer') return;
    const item = faq.find((f) => f.id === 'fx-faq-contact')!;
    expect(a.text).toBe(`${item.answer.en}[1]`);
    expect(a.sources[0]).toEqual({ label: 'FAQ', quote: 'How do I reach him?', target: 'faq-fx-faq-contact' });
    expect(a.sources[1]).toEqual({ label: 'Contact', quote: '', target: 'contact' });
  });

  it('matches a Thai FAQ question too', () => {
    const a = askPreview('ติดต่อยังไง', faq, 'en');
    expect(a).toMatchObject({ kind: 'answer', lang: 'th' });
    if (a.kind === 'answer') expect(a.sources[0].label).toBe('คำถามที่เจอบ่อย');
  });

  it('declines what the page does not say, and empty input', () => {
    expect(askPreview('favourite colour', faq, 'en').kind).toBe('decline');
    expect(askPreview('', faq, 'en').kind).toBe('decline');
    expect(askPreview('   ', faq, 'th')).toMatchObject({ kind: 'decline', lang: 'th' });
  });

  it('uses the page language when the query has no letters', () => {
    expect(askPreview('12345', faq, 'th')).toMatchObject({ kind: 'decline', lang: 'th' });
  });
});

// I-3 (fix wave finding 4, Important): the prototype's canned matchers were
// bare substrings, so a common English word inside an unrelated question
// gave a confident wrong answer -- "app" matched inside "approach", bare
// "media" matched "social media", "business" alone matched "business
// development" (the founder/burger-shop entry, not the job-title one), and
// the "pay " trailing-space hack still matched inside "repay". Every English
// alternative is now \b-anchored and the retail entry is checked before the
// business/founder one. This walks ASK_CANNED the same first-match-wins way
// askPreview() does, without the bestFaq() fallback, so each row pins
// exactly which entry (by name) a query lands on, or 'none'.
describe('ASK_CANNED word-boundary matching (fix wave finding 4)', () => {
  const ENTRY_NAME = ['decline-pay', 'right-now', 'startup', 'retail', 'business', 'language', 'build'] as const;
  const matchedEntry = (q: string): string => {
    const i = ASK_CANNED.findIndex((c) => c.match.test(q));
    return i < 0 ? 'none' : ENTRY_NAME[i];
  };

  it.each([
    ['What is his approach to enterprise deals?', 'none'],
    ['Does he build apps himself?', 'build'],
    ['What is his take on social media strategy?', 'none'],
    ['Is he active on social media?', 'none'],
    ['Tell me about his business development experience', 'retail'],
    ['Has he run his own business?', 'business'],
    ['Will he repay the investors?', 'none'],
    ['How much does the role pay?', 'decline-pay'],
    ['What is his salary?', 'decline-pay'],
    ['Does he do retail media?', 'retail'],
    ['เคยทำงานค้าปลีกไหม', 'retail'],
    ['Has he pitched a startup?', 'startup'],
    ['Which languages does he speak?', 'language'],
    ['Does he code himself?', 'build'],
    ['Is he a founder?', 'business'],
  ])('%s -> %s', (query, expected) => {
    expect(matchedEntry(query)).toBe(expected);
  });
});

describe('Ask Preview stays offline and truthful', () => {
  it('has no network or model API in its source', () => {
    expect(readFileSync('src/lib/ask.ts', 'utf8')).not.toMatch(
      /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|import\(/,
    );
  });

  it('points every canned source at something the fixtures actually have', () => {
    // Same rule as faq.json: if a career key fails here, use P3's key.
    const careerKeys = new Set((careerFixture as CareerEntry[]).map((c) => c.key));
    const projectKeys = new Set((projectsFixture as Project[]).map((p) => projectKey(p)));
    for (const c of ASK_CANNED) {
      if (c.decline) continue;
      for (const s of c.sources) {
        const t = parseTarget(s.target);
        expect(t, s.target).not.toBeNull();
        if (t?.kind === 'career') expect(careerKeys.has(t.key), s.target).toBe(true);
        if (t?.kind === 'sheet') expect(projectKeys.has(t.key), s.target).toBe(true);
      }
    }
  });
});
