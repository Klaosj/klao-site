// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ThaiText from '@/components/ThaiText';
import { THAI_KEEP, THAI_RE, glueTail, keepRuns, type Run } from '@/lib/thai';

afterEach(cleanup);

const joined = (runs: Run[]) => runs.map((r) => r.text).join('');
const kept = (runs: Run[]) => runs.filter((r) => r.keep).map((r) => r.text);

describe('THAI_RE / THAI_KEEP', () => {
  it('detects Thai characters only', () => {
    expect(THAI_RE.test('ไทย')).toBe(true);
    expect(THAI_RE.test('Thai 2026 – ok')).toBe(false);
  });

  it('carries the prototype keep list verbatim, plus the fix wave additions (P3 finding 7, P2 finding 6)', () => {
    expect(THAI_KEEP).toEqual([
      'เบอร์เกอร์คราฟต์', 'พาร์ตเนอร์ชิป', 'ซัพพลายเออร์', 'นอกเวลางาน', 'กำไรขั้นต้น', 'สุดสัปดาห์',
      'เครื่องมือ', 'งบประมาณ', 'สตาร์ทอัพ', 'โปรเจกต์', 'บาริสต้า', 'ค้าปลีก', 'ไอเดีย', 'ตอนนี้', 'ดีล',
      'เครือข่าย', 'เท่าไหร่', 'คนเดียว',
    ]);
  });
});

describe('keepRuns', () => {
  it('returns non-Thai text untouched as one plain run', () => {
    expect(keepRuns('Business developer who builds his own tools.')).toEqual([
      { text: 'Business developer who builds his own tools.', keep: false },
    ]);
  });

  // Review Focus #5 -- the four edge inputs.
  it('handles an empty string without throwing', () => {
    expect(keepRuns('')).toEqual([{ text: '', keep: false }]);
  });

  it('leaves Thai with no keep word as one plain run, nothing dropped', () => {
    const s = 'ร้านอาหารจะได้ของสดจากตลาด โดยไม่ต้องไปจ่ายตลาดเองตอนเช้า ได้ไหม?';
    expect(keepRuns(s)).toEqual([{ text: s, keep: false }]);
    // D4 (preflight): Review Focus #5 asks that this edge string also *render*
    // without throwing or dropping characters, not just survive keepRuns.
    expect(renderToStaticMarkup(<ThaiText text={s} />)).toBe(s);
  });

  it('turns `|` into the one allowed break: each side kept whole, the bar removed', () => {
    const runs = keepRuns('นัก Business Development ที่สร้างเครื่องมือ|ใช้เอง');
    expect(runs).toEqual([
      { text: 'นัก Business Development ', keep: false },
      { text: 'ที่สร้างเครื่องมือ', keep: true },
      { text: 'ใช้เอง', keep: true },
    ]);
    expect(joined(runs)).toBe('นัก Business Development ที่สร้างเครื่องมือใช้เอง');
  });

  it('keeps a `|` group whole even with trailing text after a space', () => {
    const runs = keepRuns('ไอเดียนี้คุ้มกับ|หนึ่งสุดสัปดาห์ หรือทั้งปี?');
    expect(kept(runs)).toEqual(['ไอเดียนี้คุ้มกับ', 'หนึ่งสุดสัปดาห์']);
    expect(joined(runs)).toBe('ไอเดียนี้คุ้มกับหนึ่งสุดสัปดาห์ หรือทั้งปี?');
  });

  it('mixes Thai with a URL and English brand names without losing a character', () => {
    const s = 'ดูได้ที่ https://gonai-three.vercel.app และวางระบบ Salesforce CRM ให้ทีมขาย';
    const runs = keepRuns(s);
    expect(joined(runs)).toBe(s);
    expect(kept(runs)).toEqual([]);
    // D4 (preflight): render this edge string too, not just keepRuns it.
    expect(renderToStaticMarkup(<ThaiText text={s} />)).toBe(s);
  });

  it('keeps words from the keep list, longest first', () => {
    expect(keepRuns('ผมสร้างเครื่องมือใช้เอง')).toEqual([
      { text: 'ผมสร้าง', keep: false },
      { text: 'เครื่องมือ', keep: true },
      { text: 'ใช้เอง', keep: false },
    ]);
    expect(kept(keepRuns('ได้รูปแบบพาร์ตเนอร์ชิปกับค้าปลีก'))).toEqual(['พาร์ตเนอร์ชิป', 'ค้าปลีก']);
    expect(kept(keepRuns('ทำดีลให้คุ้มทั้งสองฝั่ง'))).toEqual(['ดีล']);
  });

  // Fix wave finding 7: "ตอนนี้" split as "ตอน / นี้" around 900px (Actmedia
  // Thai win 1) -- it wasn't on the keep list. The string below is verbatim
  // from src/content/fixtures/career.json's Actmedia body.
  it('keeps "ตอนนี้" whole (fix wave finding 7)', () => {
    expect(kept(keepRuns('ตอนนี้อยู่ระหว่างเจรจา'))).toEqual(['ตอนนี้']);
  });

  // Fix wave finding 6 (M1): เครือข่าย, เท่าไหร่ and คนเดียว, added to THAI_KEEP above.
  it('keeps the fix wave additions whole (finding 6, M1)', () => {
    expect(kept(keepRuns('สร้างเครือข่ายร้านค้าทั่วประเทศ'))).toEqual(['เครือข่าย']);
    expect(kept(keepRuns('ใช้เงินเท่าไหร่ถึงจะพอ'))).toEqual(['เท่าไหร่']);
    expect(kept(keepRuns('ทำงานคนเดียวทั้งบริษัท'))).toEqual(['คนเดียว']);
  });

  it('keeps Thai dates together, with or without the day', () => {
    expect(kept(keepRuns('ออนไลน์ตั้งแต่ ส.ค. 2026 · Notion'))).toEqual(['ส.ค. 2026']);
    expect(kept(keepRuns('เริ่ม 14 ก.ย. 2026 เป็นต้นไป'))).toEqual(['14 ก.ย. 2026']);
  });

  it('keeps a number with its unit, including ranges', () => {
    expect(kept(keepRuns('ทุกการเปิดตัวเดินตาม checklist 30 ข้อ'))).toEqual(['30 ข้อ']);
    expect(kept(keepRuns('SOM 37 ล้านบาท'))).toEqual(['37 ล้านบาท']);
    expect(kept(keepRuns('ใช้เวลา 3–5 เดือน'))).toEqual(['3–5 เดือน']);
    // The unit is itself a keep word; the number+unit pair wins as one run.
    expect(kept(keepRuns('ดูแล 3 โปรเจกต์'))).toEqual(['3 โปรเจกต์']);
  });

  it('never drops or reorders characters: runs join back to the input minus `|`', () => {
    const samples = [
      'ผมเปิดช่องทางใหม่กับค้าปลีก Modern Trade ตั้งแต่ติดต่อครั้งแรกจนได้รูปแบบพาร์ตเนอร์ชิป',
      'ทำไมวางแผนทริปเดียว|ต้องใช้ตั้งห้าแอป?',
      'ออนไลน์ตั้งแต่ ส.ค. 2026 · Notion เป็น CMS เดียว · EN/TH · เทสต์อัตโนมัติ 400+ ข้อ',
      '|ขึ้นต้นด้วยขีด และจบด้วยขีด|',
      'สร้างตอนกลางคืน ด้วยกาแฟดีๆ',
    ];
    for (const s of samples) {
      const runs = keepRuns(s);
      expect(joined(runs), s).toBe(s.replace(/\|/g, ''));
      expect(runs.every((r) => r.text.length > 0), s).toBe(true);
    }
  });
});

// Master R25 / preflight A1: an additive `display` option ports the
// prototype's disp() -- every space-delimited Thai token is kept whole,
// ignoring the keep list/dates/units the default mode uses. No Intl.Segmenter.
describe('keepRuns display option (master R25)', () => {
  it('keeps every space-delimited Thai token whole, ignoring the keep list', () => {
    const runs = keepRuns('ผมสร้าง เครื่องมือ ใช้เอง', { display: true });
    expect(runs).toEqual([
      { text: 'ผมสร้าง', keep: true },
      { text: ' ', keep: false },
      { text: 'เครื่องมือ', keep: true },
      { text: ' ', keep: false },
      { text: 'ใช้เอง', keep: true },
    ]);
    expect(joined(runs)).toBe('ผมสร้าง เครื่องมือ ใช้เอง');
  });

  it('still splits at `|`, same as the default mode', () => {
    const runs = keepRuns('ที่สร้างเครื่องมือ|ใช้เอง', { display: true });
    expect(runs).toEqual([
      { text: 'ที่สร้างเครื่องมือ', keep: true },
      { text: 'ใช้เอง', keep: true },
    ]);
    expect(joined(runs)).toBe('ที่สร้างเครื่องมือใช้เอง');
  });

  it('leaves a non-Thai token between Thai tokens as plain text', () => {
    // The space either side of "CRM" is itself a plain run, so it merges
    // with "CRM" the same way adjacent plain runs always merge (D1's rule).
    // Fix wave finding 4: the leading space (Thai token, then "CRM") is a
    // no-break space -- Thai has none of its own, so a break right there
    // would strand "เปิดดีล" from the token it belongs with. The trailing
    // space ("CRM", then a Thai token) stays an ordinary breakable space,
    // exactly as the prototype's disp() only glues in that one direction.
    const runs = keepRuns('เปิดดีล CRM ให้ทีม', { display: true });
    expect(runs).toEqual([
      { text: 'เปิดดีล', keep: true },
      { text: '\u00A0CRM ', keep: false },
      { text: 'ให้ทีม', keep: true },
    ]);
    expect(joined(runs)).toBe('เปิดดีล\u00A0CRM ให้ทีม');
  });

  // Fix wave finding 4 (prototype disp() l.938): the glue only runs one
  // direction -- a non-Thai token followed by a Thai one keeps its
  // ordinary, breakable space.
  it('keeps an ordinary space where a non-Thai token is followed by a Thai one', () => {
    const runs = keepRuns('CRM เครื่องมือ', { display: true });
    expect(runs).toEqual([
      { text: 'CRM ', keep: false },
      { text: 'เครื่องมือ', keep: true },
    ]);
    expect(joined(runs)).toBe('CRM เครื่องมือ');
  });

  // Fix wave finding 4: `|` inside a token with no Thai in it at all must
  // also be stripped, not shown literally -- same as it already is for a
  // Thai token's own `|`-split fragments, above.
  it('strips `|` from a wholly non-Thai token instead of rendering it literally', () => {
    const runs = keepRuns('CRM|Tool ทำงานได้ดี', { display: true });
    expect(runs).toEqual([
      { text: 'CRMTool ', keep: false },
      { text: 'ทำงานได้ดี', keep: true },
    ]);
    expect(joined(runs)).toBe('CRMTool ทำงานได้ดี');
  });

  it('leaves non-Thai text untouched, same as the default mode', () => {
    expect(keepRuns('Business developer who builds his own tools.', { display: true })).toEqual([
      { text: 'Business developer who builds his own tools.', keep: false },
    ]);
  });

  it('handles an empty string without throwing', () => {
    expect(keepRuns('', { display: true })).toEqual([{ text: '', keep: false }]);
  });

  it('does not change default behaviour when the option is omitted or false', () => {
    const s = 'ผมสร้างเครื่องมือใช้เอง';
    expect(keepRuns(s, { display: false })).toEqual(keepRuns(s));
    expect(keepRuns(s)).not.toEqual(keepRuns(s, { display: true }));
  });

  // Fix round 1, finding 2: displayRuns Thai-tested the whole token, then
  // marked every `|`-split fragment keep -- so a non-Thai tail riding along
  // on a Thai token's pipe (e.g. a keep list word|brand-name pair) was
  // wrongly kept. Each fragment must be Thai-tested on its own.
  it('Thai-tests each `|`-split fragment on its own, so a non-Thai tail is not marked keep', () => {
    const runs = keepRuns('เครื่องมือ|CRM', { display: true });
    expect(runs).toEqual([
      { text: 'เครื่องมือ', keep: true },
      { text: 'CRM', keep: false },
    ]);
    expect(joined(runs)).toBe('เครื่องมือCRM');
    // And the reverse order, so the fix isn't order-dependent.
    expect(keepRuns('CRM|เครื่องมือ', { display: true })).toEqual([
      { text: 'CRM', keep: false },
      { text: 'เครื่องมือ', keep: true },
    ]);
  });
});

// T18-a (CO-11; P4 re-check f172c73, E2 + E3): glueTail() picks the short
// bit of text that rides inside AskCard's `.ask-glue { white-space: nowrap }`
// span with the [n] marker after it. Two ways it could go wrong, neither
// visible in jsdom (no layout): an EMPTY tail leaves the marker alone in the
// span, so it can orphan onto its own line again; a tail that is the WHOLE
// segment puts a Thai clause inside a nowrap span, which overflows at 320px.
// Each row: [segment, locale, tail with Intl.Segmenter, tail without it].
// head + tail must always give back the segment, character for character.
const GLUE_CASES: [segment: string, locale: 'en' | 'th', tail: string, fallbackTail: string][] = [
  // Only the last word -- never the clause (kills the "whole segment" mutation).
  ['โปรเจกต์ใหญ่สุดคือติดตั้งจอในร้านทั่วประเทศ', 'th', 'ประเทศ', 'ศ'],
  ['และ Aje เป็น prototype ที่ใช้งานได้', 'th', 'ได้', 'ได้'],
  ['a working prototype.', 'en', 'prototype.', 'prototype.'],
  // A segment ending in a keep run glues the whole run, never half of it.
  ['ประเมิน SOM ไว้ 37 ล้านบาท', 'th', '37 ล้านบาท', '37 ล้านบาท'],
  // E2: trailing whitespace goes back onto the tail instead of emptying it.
  ['37 ล้านบาท ', 'th', '37 ล้านบาท ', '37 ล้านบาท '],
  ['ค้าปลีก ', 'th', 'ค้าปลีก ', 'ค้าปลีก '],
  ['ทั่วประเทศ ', 'th', 'ประเทศ ', 'ศ '],
  ['live ', 'en', 'live ', 'live '],
  // E2: punctuation after the last word or keep run reaches back to it...
  ['ติดตั้งจอในร้านค้าปลีก.', 'th', 'ค้าปลีก.', 'ค้าปลีก.'],
  ['word …', 'en', 'word …', 'word …'],
  // ...and a segment with no word at all glues whole (it is short by nature).
  ['...', 'en', '...', '...'],
  // Nit: an emoji is one code point pair -- never split into lone surrogates.
  ['ok 🙂', 'en', 'ok 🙂', 'ok 🙂'],
];

describe('glueTail (T18-a, CO-11)', () => {
  it.each(GLUE_CASES)('%s (%s) -> tail %j', (segment, locale, tail) => {
    const cut = glueTail(segment, locale);
    expect(cut.tail).toBe(tail);
    expect(cut.head + cut.tail).toBe(segment);
  });

  it('gives a blank segment nothing to glue, and loses nothing', () => {
    expect(glueTail('', 'en')).toEqual({ head: '', tail: '' });
    expect(glueTail('   ', 'th')).toEqual({ head: '   ', tail: '' });
  });

  // The defensive floor for a runtime with no Intl.Segmenter: a Latin word is
  // still found by its spaces, but Thai has none, so only its last syllable
  // (leading vowel + consonant + marks) glues -- short, never a clause.
  describe('without Intl.Segmenter', () => {
    const saved = Intl.Segmenter;
    beforeEach(() => {
      (Intl as { Segmenter?: unknown }).Segmenter = undefined;
    });
    afterEach(() => {
      (Intl as { Segmenter?: unknown }).Segmenter = saved;
    });

    it.each(GLUE_CASES)('%s (%s) -> tail %j', (segment, locale, _tail, fallbackTail) => {
      const cut = glueTail(segment, locale);
      expect(cut.tail).toBe(fallbackTail);
      expect(cut.head + cut.tail).toBe(segment);
    });
  });
});

describe('<ThaiText>', () => {
  it('wraps keep runs in .nw spans and leaves the rest as text', () => {
    const { container } = render(<ThaiText text="ผมสร้างเครื่องมือใช้เอง" />);
    const spans = container.querySelectorAll('span.nw');
    expect(Array.from(spans).map((s) => s.textContent)).toEqual(['เครื่องมือ']);
    expect(container.textContent).toBe('ผมสร้างเครื่องมือใช้เอง');
  });

  it('puts a <wbr> between two adjacent keep runs -- the allowed break', () => {
    const html = renderToStaticMarkup(<ThaiText text="ที่สร้างเครื่องมือ|ใช้เอง" />);
    expect(html).toBe('<span class="nw">ที่สร้างเครื่องมือ</span><wbr/><span class="nw">ใช้เอง</span>');
  });

  it('renders English exactly as given, with no spans', () => {
    const html = renderToStaticMarkup(<ThaiText text="Have something that should exist?" />);
    expect(html).toBe('Have something that should exist?');
  });

  it('renders nothing for an empty string, without throwing', () => {
    expect(() => render(<ThaiText text="" />)).not.toThrow();
    expect(renderToStaticMarkup(<ThaiText text="" />)).toBe('');
  });

  it('display: wraps every space-delimited Thai token in .kt (wrappable), not .nw', () => {
    const html = renderToStaticMarkup(<ThaiText text="ผมสร้าง เครื่องมือ" display />);
    expect(html).toBe('<span class="kt">ผมสร้าง</span> <span class="kt">เครื่องมือ</span>');
  });

  it('display: still puts a <wbr> between two `|`-split keep runs, using .kt', () => {
    const html = renderToStaticMarkup(<ThaiText text="ที่สร้างเครื่องมือ|ใช้เอง" display />);
    expect(html).toBe('<span class="kt">ที่สร้างเครื่องมือ</span><wbr/><span class="kt">ใช้เอง</span>');
  });

  // Fix wave finding 4: rendered, not just keepRuns() -- the space between a
  // Thai token and a following non-Thai one comes out as an actual U+00A0,
  // not the literal two characters "&nbsp;" (that's only how the ORIGINAL
  // prototype's disp() spelled it, building raw HTML strings by hand).
  it('display: joins a Thai token and a following non-Thai token with a no-break space', () => {
    const html = renderToStaticMarkup(<ThaiText text="เปิดดีล CRM" display />);
    expect(html).toBe('<span class="kt">เปิดดีล</span>\u00A0CRM');
  });
});
