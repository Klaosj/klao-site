import { describe, expect, it } from 'vitest';
import profileFixture from '@/content/fixtures/profile.json';
import storyFixture from '@/content/fixtures/story.json';
import { splitBold } from '@/lib/bold';
import { boldText, mapProfile, mapStoryChapter } from '@/lib/notion-mappers';

// The Notion editor turns a typed **…** into bold formatting as you type, and
// the API hands that back as a rich_text run with `annotations.bold: true`
// and no asterisks in plain_text. These runs mirror the API's shape (every
// annotation present, as Notion sends them), so the tests exercise what the
// live Profile and Story rows actually return.
type Run = { type: 'text'; plain_text: string; annotations: Record<string, unknown>; href: null };
const run = (s: string, annotations: Record<string, unknown> = {}): Run => ({
  type: 'text',
  plain_text: s,
  annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default', ...annotations },
  href: null,
});
const plain = (s: string) => run(s);
const bold = (s: string, extra: Record<string, unknown> = {}) => run(s, { bold: true, ...extra });
const rich = (...runs: Run[]) => ({ rich_text: runs });
const title = (...runs: Run[]) => ({ title: runs });

// What the Notion editor stores for copy written the site's way: each
// **…** pair becomes one bold run, the rest plain runs. Used only to turn
// the bundled fixtures into Notion-shaped rows for the round trip below.
const asNotion = (s: string) => rich(...splitBold(s).map((seg) => (seg.bold ? bold(seg.text) : plain(seg.text))));

describe('boldText', () => {
  it('wraps a bold run in the middle of the paragraph in **…**', () => {
    expect(boldText(rich(plain('I scope first, and '), bold('the NDA comes first'), plain(' every time.')))).toBe(
      'I scope first, and **the NDA comes first** every time.',
    );
  });

  it('wraps a bold run at the start and at the end', () => {
    expect(boldText(rich(bold('First.'), plain(' Then the middle. '), bold('Last.')))).toBe(
      '**First.** Then the middle. **Last.**',
    );
  });

  it('merges adjacent bold runs into one pair, never **…****…**', () => {
    // Notion splits one bold clause into several runs wherever another
    // annotation changes inside it (here an italic word).
    const out = boldText(rich(plain('I scope first, and '), bold('the NDA '), bold('comes', { italic: true }), bold(' first.')));
    expect(out).toBe('I scope first, and **the NDA comes first.**');
    expect(out).not.toContain('****');
  });

  it('keeps whitespace a bold run carries outside the markers', () => {
    // Selecting a word in Notion often takes its spaces along, so the
    // spaces arrive inside the bold run; "foo** bar **baz" would not match
    // the site's own **clause** convention.
    expect(boldText(rich(plain('foo'), bold(' bar '), plain('baz')))).toBe('foo **bar** baz');
    // A bold run that is only whitespace stays plain whitespace.
    expect(boldText(rich(plain('foo'), bold(' '), plain('bar')))).toBe('foo bar');
    // Trimmed like text(): trailing space inside a final bold run goes.
    expect(boldText(rich(plain('It held. '), bold('The budget held. ')))).toBe('It held. **The budget held.**');
    expect(boldText(rich(bold('  Lead.'), plain(' rest')))).toBe('**Lead.** rest');
  });

  it('passes literal ** in plain text through unchanged', () => {
    // Asterisks that reach the API as characters (pasted as code, or typed
    // where the editor did not convert them) keep today's behaviour: the
    // text arrives as-is and BoldText decides.
    expect(boldText(rich(plain('I scope first, and **the NDA comes first.**')))).toBe(
      'I scope first, and **the NDA comes first.**',
    );
    expect(boldText(rich(plain('Type '), run('**x**', { code: true }), plain(' as is.')))).toBe('Type **x** as is.');
  });

  it('reads like text() when nothing is bold', () => {
    expect(boldText(rich(plain('  Scope it '), plain('honestly.  ')))).toBe('Scope it honestly.');
    expect(boldText(title(plain('Find the room.')))).toBe('Find the room.');
    expect(boldText(rich())).toBe('');
    expect(boldText(undefined)).toBe('');
    // A run without `annotations` (the other tests' shorthand) is plain.
    expect(boldText({ rich_text: [{ plain_text: 'No annotations.' }] })).toBe('No annotations.');
  });

  it('wraps a Thai bold run with no space before it', () => {
    const out = boldText(rich(plain('ประเมินสิ่งที่ทำได้จริงก่อน และ'), bold('เซ็น NDA ก่อนแลกข้อมูลกันเสมอ')));
    expect(out).toBe('ประเมินสิ่งที่ทำได้จริงก่อน และ**เซ็น NDA ก่อนแลกข้อมูลกันเสมอ**');
    expect(splitBold(out)).toEqual([
      { text: 'ประเมินสิ่งที่ทำได้จริงก่อน และ', bold: false },
      { text: 'เซ็น NDA ก่อนแลกข้อมูลกันเสมอ', bold: true },
    ]);
  });
});

describe('BoldText fields read Notion bold (mapProfile, mapStoryChapter)', () => {
  it('maps a bold clause in PrologueEN/TH and BodyEN/TH to the **…** string BoldText splits', () => {
    const profile = mapProfile({
      id: 'pr1',
      properties: {
        Name: title(plain('Klao')),
        PrologueEN: rich(plain('I started on the owner side. '), bold('Now I build my own tools.'), plain(' Both sides.')),
        PrologueTH: rich(plain('ผมเริ่มจากฝั่งเจ้าของโต๊ะ '), bold('ตอนนี้สร้างเครื่องมือเอง'), plain(' ทั้งสองฝั่ง')),
      },
    })!;
    expect(profile.prologue).toEqual({
      en: 'I started on the owner side. **Now I build my own tools.** Both sides.',
      th: 'ผมเริ่มจากฝั่งเจ้าของโต๊ะ **ตอนนี้สร้างเครื่องมือเอง** ทั้งสองฝั่ง',
    });
    expect(splitBold(profile.prologue!.en).filter((s) => s.bold)).toEqual([{ text: 'Now I build my own tools.', bold: true }]);

    const chapter = mapStoryChapter({
      id: 'st1',
      properties: {
        TitleEN: title(plain('Find the room.')),
        BodyEN: rich(plain('I scope first, and '), bold('the NDA comes before any data changes hands.')),
        BodyTH: rich(plain('ประเมินสิ่งที่ทำได้จริงก่อน และ'), bold('เซ็น NDA ก่อนแลกข้อมูลกันเสมอ')),
      },
    })!;
    expect(chapter.body).toEqual({
      en: 'I scope first, and **the NDA comes before any data changes hands.**',
      th: 'ประเมินสิ่งที่ทำได้จริงก่อน และ**เซ็น NDA ก่อนแลกข้อมูลกันเสมอ**',
    });
  });

  it('round-trips the bundled copy: Notion-bold rows map back to the exact fixture strings', () => {
    const profile = mapProfile({
      id: 'pr1',
      properties: {
        Name: title(plain('Klao')),
        PrologueEN: asNotion(profileFixture.prologue.en),
        PrologueTH: asNotion(profileFixture.prologue.th),
      },
    })!;
    expect(profile.prologue).toEqual(profileFixture.prologue);
    for (const c of storyFixture) {
      const chapter = mapStoryChapter({
        id: c.id,
        properties: { TitleEN: title(plain(c.title.en)), BodyEN: asNotion(c.body.en), BodyTH: asNotion(c.body.th) },
      })!;
      expect(chapter.body).toEqual(c.body);
    }
  });

  it('leaves every field BoldText does not render as plain text, bold or not', () => {
    // Those fields render through ThaiText, where ** would show literally.
    const b = (s: string) => rich(bold(s));
    const chapter = mapStoryChapter({
      id: 'st1',
      properties: { TitleEN: title(bold('Find the room.')), TitleTH: b('หาห้องที่ใช่'), RuleEN: b('Scope it honestly.'), RuleTH: b('ประเมินตามจริง') },
    })!;
    expect(chapter.title).toEqual({ en: 'Find the room.', th: 'หาห้องที่ใช่' });
    expect(chapter.rule).toEqual({ en: 'Scope it honestly.', th: 'ประเมินตามจริง' });
    const profile = mapProfile({
      id: 'pr1',
      properties: {
        Name: title(bold('Klao')),
        HeadlineEN: b('Business developer.'),
        ClosingLineEN: b('Builds his own tools.'),
        BasedInEN: b('Bangkok, TH'),
      },
    })!;
    expect(profile.name).toBe('Klao');
    expect(profile.headline.en).toBe('Business developer.');
    expect(profile.closingLine?.en).toBe('Builds his own tools.');
    expect(profile.basedIn?.en).toBe('Bangkok, TH');
  });
});
