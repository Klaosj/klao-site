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

// I-3 (fix wave finding 4, Important) + re-review round 1 (Important A). The
// prototype's canned matchers were bare substrings, so a common word inside
// an unrelated question gave a confident wrong answer -- "app" matched
// inside "approach", bare "media" matched "social media", "business" alone
// matched "business development" (the founder entry, not the job-title
// one), the "pay " hack matched inside "repay". Every English alternative
// is \b-anchored, the retail entry is checked before business/founder, and
// (round 1 fix-up) "retail(ers?)"/"media"/"developer(s)" are kept as real
// words instead of dropped outright, พัฒนาธุรกิจ (the site's own TH job
// title) is added to retail, and "social media"/โซเชียล declines explicitly
// (checked first) rather than falling through to a wrong topic.
//
// 47 independent questions (reviewer's re-review table, verbatim), run
// through the real askPreview() -- canned matchers AND the bestFaq()
// fallback -- against the real faq.json fixture. `outcome` identifies which
// canned entry (by name) or FAQ item produced the answer, so each row pins
// the exact result, not just "an answer of some kind".
//
// T18-b (CO-10, ruling PR5): the six rows the prototype also got wrong
// (Minor F: 13, 14, 24, 25, 26, 39) now land where PR5 put them, and the
// reviewer's 20 re-check questions (66793b1) follow the 47 -- one of them,
// "featured in the media", was a confident retail answer and now declines.
// Every other row keeps its earlier outcome: 0 regressions across all 67.
//
// Lane C review (I1-I3, m1-m5): the reviewer's 46 fresh questions are
// pinned here too, next to the rows each fix needed. The rule from here on:
// any change to an Ask matcher runs against this whole table, and no row
// that was right may change. Where the page has no sensible answer, the
// expected outcome is a decline.
describe('askPreview pinned question table (fix wave finding 4, re-review Important A, T18-b/b2, lane C review)', () => {
  // Each canned answer is named by how its English text starts, so adding a
  // decline entry or a second entry with the same answer (PR5's "code in /
  // โค้ด" check gives the build answer) never shifts a name.
  const ANSWER_NAME: [start: string, name: string][] = [
    ['Klao has been Senior Business Development', 'right-now'],
    ['Yes. He co-founded two.', 'startup'],
    ['Yes. At Actmedia he opens', 'retail'],
    ['Yes. He founded A Bun Dance', 'business'],
    ['Thai, and English at a conversational level', 'language'],
    ['Yes, on nights and weekends', 'build'],
  ];
  const nameOf = (en: string) => ANSWER_NAME.find(([start]) => en.startsWith(start))?.[1];

  it('names every canned answer', () => {
    for (const c of ASK_CANNED) if (!c.decline) expect(nameOf(c.answer.en), c.answer.en).toBeDefined();
  });

  function outcome(query: string, locale: 'en' | 'th'): string {
    const answer = askPreview(query, faq, locale);
    if (answer.kind === 'decline') return 'decline';
    const canned = ASK_CANNED.find((c) => !c.decline && answer.text === c.answer[answer.lang]);
    if (canned && !canned.decline) return nameOf(canned.answer.en)!;
    // Not a canned match: the bestFaq() fallback. Its first source is
    // always the FAQ item itself, id faqAnchorId()'d ('faq-xxx').
    return `faq:${(answer.sources[0]?.target ?? '').replace(/^faq-/, '')}`;
  }

  // Explicit tuple type: an inline `as const` array of heterogeneous string
  // literals doesn't unify into one tuple shape for it.each's callback.
  const ROWS: [query: string, locale: 'en' | 'th', expected: string, note: string][] = [
    ["What's his approach to enterprise deals?", 'en', 'decline', 'named: approach'],
    ['Is he active on social media?', 'en', 'decline', 'named: social media'],
    ['Does he do social media marketing?', 'en', 'decline', 'named: social media'],
    ['Tell me about his business development experience', 'en', 'retail', 'named: BD'],
    ['What does business development at Actmedia involve?', 'en', 'retail', 'named: BD'],
    ['How much does the job pay?', 'en', 'decline', 'named: pay'],
    ['Will he repay the investors?', 'en', 'decline', 'named: pay (repay)'],
    ['Which apps has he made?', 'en', 'build', 'plural: apps'],
    ['Does he work with retailers?', 'en', 'retail', 'plural: retailers (round-1 regression)'],
    ['Which retailers has he worked with?', 'en', 'retail', 'plural: retailers (round-1 regression)'],
    ['Is he paying for Claude?', 'en', 'decline', 'verb: paying'],
    ['Is he a developer?', 'en', 'build', 'noun: developer (round-1 regression)'],
    ['Has he built a chatbot?', 'en', 'build', 'verb: built (Minor F -> build, PR5)'],
    ['Has he founded anything?', 'en', 'startup', 'verb: founded (Minor F -> startup, PR5)'],
    ['Does he build apps himself?', 'en', 'build', ''],
    ['Does he write code?', 'en', 'build', ''],
    ["What's he working on right now?", 'en', 'right-now', ''],
    ['What is his salary?', 'en', 'decline', ''],
    ['Does he work in media?', 'en', 'retail', 'bare "media" (round-1 regression)'],
    ['Does he do in-store media?', 'en', 'retail', ''],
    ['Has he run his own business?', 'en', 'business', ''],
    ['Did he start a startup?', 'en', 'startup', ''],
    ['Does he speak English?', 'en', 'language', ''],
    ['Which languages does he code in?', 'en', 'build', 'code in: before language (Minor F, PR5)'],
    ["What's the business model of GoNai?", 'en', 'decline', 'business model: not published (Minor F, PR5)'],
    ['Can I call him today?', 'en', 'decline', 'bare "today" is not current work (Minor F, PR5)'],
    ['How do I reach him?', 'en', 'faq:fx-faq-contact', ''],
    ['What is Actmedia?', 'en', 'retail', ''],
    ['ตอนนี้ทำงานอะไรอยู่', 'th', 'right-now', ''],
    ['เงินเดือนเท่าไหร่', 'th', 'decline', ''],
    ['เคยทำสตาร์ทอัพไหม', 'th', 'startup', ''],
    ['เคยทำธุรกิจของตัวเองไหม', 'th', 'business', ''],
    ['พูดภาษาอังกฤษได้ไหม', 'th', 'language', ''],
    ['เขียนโค้ดเองหรือเปล่า', 'th', 'build', ''],
    ['เคยทำงานกับร้านค้าปลีกไหม', 'th', 'retail', 'ร้าน + ค้าปลีก'],
    ['งานพัฒนาธุรกิจที่ทำอยู่คืออะไร', 'th', 'retail', 'TH "business development" (named bug, TH)'],
    ['นักพัฒนาธุรกิจทำอะไรบ้าง', 'th', 'retail', "TH BD, site's own role word (named bug, TH)"],
    ['ทำสื่อโซเชียลเป็นไหม', 'th', 'decline', 'TH "social media" (named bug, TH)'],
    ['เขียนโค้ดภาษาอะไร', 'th', 'build', 'โค้ด: before language (Minor F, PR5)'],
    ['ติดต่อยังไง', 'th', 'faq:fx-faq-contact', ''],
    ['เคยทำ startup ไหม', 'th', 'startup', 'mixed'],
    ['ทำappอะไรบ้าง', 'th', 'build', 'mixed, no spaces'],
    ['ทำ business development ที่ไหน', 'th', 'retail', 'mixed BD'],
    ['ทำ retail media มานานยัง', 'th', 'retail', 'mixed'],
    ['ขอ salary expectation หน่อย', 'th', 'decline', 'mixed pay'],
    ['ทำงานกับ retailers เจ้าไหนบ้าง', 'th', 'retail', 'mixed plural (round-1 regression)'],
    ['ใช้ Claude เขียน code ไหม', 'th', 'build', 'mixed'],
    // The reviewer's 20 re-check questions (re-check 66793b1, row A).
    ['Does he use social media?', 'en', 'decline', 'social'],
    ['Which social media platforms is he on?', 'en', 'decline', 'social'],
    ['Is he a social person?', 'en', 'decline', 'social, no "media"'],
    ['Has he been featured in the media?', 'en', 'decline', 'press: not published (Minor F, PR5)'],
    ['Does he have media sales experience?', 'en', 'retail', 'media'],
    ['Is he a product developer?', 'en', 'build', 'developer'],
    ['Does he work with developers?', 'en', 'build', 'developers'],
    ['Did he develop GoNai alone?', 'en', 'build', 'develop'],
    ['Is he good at business development?', 'en', 'retail', 'BD'],
    ['Has he worked for a retailer?', 'en', 'retail', 'retailer'],
    ['Is he a founder?', 'en', 'startup', 'founder: startup since PR5 (business before; both acceptable)'],
    ['Has he pitched a startup?', 'en', 'startup', ''],
    ['What is his take on social media strategy?', 'en', 'decline', 'social'],
    ['ทำงานด้านพัฒนาธุรกิจมากี่ปี', 'th', 'retail', 'TH BD'],
    ['เคยทำโซเชียลมีเดียไหม', 'th', 'decline', 'TH social'],
    ['มีโซเชียลอะไรบ้าง', 'th', 'decline', 'TH socials'],
    ['เคยทำงานสื่อไหม', 'th', 'retail', 'TH media'],
    ['เคยพัฒนาแอปเองไหม', 'th', 'build', 'TH develop app'],
    ['ธุรกิจที่เคยทำมีอะไรบ้าง', 'th', 'business', 'TH business'],
    ['ทำ media มาก่อนไหม', 'th', 'retail', 'mixed media'],
    // T18-b2 (controller ruling): the Thai press questions decline like
    // "featured in the media" -- while สื่อ in the retail-media sense
    // (in-store media, running ads in a store) still gets the retail answer.
    ['เคยออกสื่อไหม', 'th', 'decline', 'TH press: ออกสื่อ (T18-b2)'],
    ['มีผลงานออกสื่อบ้างไหม', 'th', 'decline', 'TH press: ออกสื่อ (T18-b2)'],
    ['เคยให้สัมภาษณ์สื่อไหม', 'th', 'decline', 'TH press: ให้สัมภาษณ์ (T18-b2)'],
    ['เคยลงข่าวเรื่องงานสื่อไหม', 'th', 'decline', 'TH press: ลงข่าว (T18-b2)'],
    ['ทำสื่อในร้านค้าปลีกไหม', 'th', 'retail', 'TH in-store media stays retail (T18-b2)'],
    ['ช่วยออกสื่อโฆษณาในร้านได้ไหม', 'th', 'retail', 'ออกสื่อโฆษณา = running ads, not press (T18-b2)'],
    ['เคยทำ retail media ในร้านไหม', 'th', 'retail', 'mixed retail media stays retail (T18-b2)'],
    // Lane C review I1: PR5's founded/founder must not pull a question about
    // his burger shop, or about Actmedia the company, onto the startup answer.
    ['Is he the founder of a burger shop?', 'en', 'business', 'review #14, I1'],
    ['Who founded A Bun Dance?', 'en', 'faq:fx-faq-business', 'review #15, I1'],
    ['Has he founded a business?', 'en', 'business', 'review #16, I1'],
    ['Is he a co-founder?', 'en', 'startup', 'review #17'],
    ['When was Actmedia founded?', 'en', 'decline', 'review #18, I1: not published, no sensible answer'],
    ['เป็นfounderร้านเบอร์เกอร์ไหม', 'th', 'business', 'review #34, I1'],
    ['When was A Bun Dance founded?', 'en', 'faq:fx-faq-business', 'I1 guard: his own venture still answers'],
    ['When was his burger shop founded?', 'en', 'business', 'I1 guard: his own venture still answers'],
    ['Who founded Actmedia?', 'en', 'decline', 'I1: not published'],
    ['Is he a founder at Actmedia?', 'en', 'decline', 'I1: he is not; the retail answer would say "Yes."'],
    ['When was GoNai founded?', 'en', 'decline', 'I1: founding dates are not published'],
    ['What year was Aje founded?', 'en', 'decline', 'I1: founding dates are not published'],
    ['Who founded GoNai?', 'en', 'decline', 'I1: "who founded" is not the startup answer'],
    ['Was Actmedia founded by him?', 'en', 'decline', 'I1: he is not its founder'],
    ['Has he founded a restaurant?', 'en', 'business', 'I1 guard: restaurant'],
    // Lane C review I2: "built" is also a BD verb -- partnerships, pipelines,
    // teams are not the build answer.
    ['Has he built partnerships with suppliers?', 'en', 'decline', 'review #23, I2'],
    ['Has he built a sales pipeline?', 'en', 'decline', 'review #24, I2'],
    ['Has he built anything?', 'en', 'build', 'review #43'],
    ['What is he building at night?', 'en', 'build', 'I2: "building" alone still answers build'],
    ['Does he build things himself?', 'en', 'build', 'I2: "build" alone still answers build'],
    ['Is he building a sales team?', 'en', 'decline', 'review #44, I2 (the guard covers build/building too)'],
    ['Does he build apps for sales teams?', 'en', 'build', 'I2 guard: "apps" still answers build'],
    ['Has he built relationships with brands?', 'en', 'decline', 'I2 guard: relationships'],
    ['Has he built a network of suppliers?', 'en', 'decline', 'I2 guard: network'],
    ['Has he built new channels?', 'en', 'faq:fx-faq-day', 'I2 guard: channels -- opening new channels is his day job (FAQ)'],
    ['Has he built up sales before?', 'en', 'decline', 'I2 guard: sales'],
    ['Has he built a deal pipeline?', 'en', 'decline', 'I2 guard: pipeline'],
    ['Has he built a team before?', 'en', 'decline', 'I2 guard: team'],
  ];

  it('covers every pinned question', () => {
    expect(ROWS).toHaveLength(102);
  });

  it.each(ROWS)('%s (%s) -> %s [%s]', (query, locale, expected) => {
    expect(outcome(query, locale)).toBe(expected);
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
