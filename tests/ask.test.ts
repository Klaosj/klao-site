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
