/** Thai keep-runs (spec §5.2, master plan C3/R25).
 *
 *  Thai is written without spaces between words, so a browser may break a
 *  line inside a word -- at display sizes that orphans a syllable ("ใช้เอง"
 *  split as "ใช้ / เอง") or cuts a compound in half ("เครื่อง / มือ"). This
 *  splits a string into runs; a `keep` run is rendered as an unbreakable
 *  `.nw` span by <ThaiText>, everything else wraps normally.
 *
 *  Default mode -- keep runs, ported from the approved prototype
 *  (design/white-edition/prototype/index.html -- KEEP, DATERE, UNITRE, tx()):
 *   - words on the keep list (never split a compound);
 *   - Thai dates ("14 ส.ค. 2026", "ส.ค. 2026");
 *   - a number and its unit ("30 ข้อ", "37 ล้านบาท");
 *   - `|` in copy (usually typed in Notion) marks the one allowed break
 *     inside a Thai word group: the text on each side of it stays whole, and
 *     the `|` itself is removed.
 *  Nothing else changes: joining every run's text gives back the input with
 *  only the `|` characters removed. Text without Thai characters comes back
 *  untouched as a single run.
 *
 *  Display mode (`{ display: true }`, master R25 / preflight A1) -- an
 *  additive option that instead ports the prototype's disp(): every
 *  space-delimited Thai token is kept whole (ignoring the keep list, dates
 *  and units), `|` still marks the one allowed break inside a token, and
 *  spaces between tokens are preserved as plain runs -- except the one
 *  right after a Thai token and before a non-Thai one, which becomes a
 *  no-break space (fix wave finding 4), and `|` inside a non-Thai token is
 *  removed rather than shown. No Intl.Segmenter: the reviewed prototype has
 *  none, and neither option uses one. The prototype's disp() also gives
 *  `\n` a desktop-only `<br>`; no copy this site renders needs a forced
 *  line break, so that half of disp() has no port here (fix wave finding
 *  4 -- doc only, not a gap to close). */

import type { Locale } from './models';

export const THAI_RE = /[฀-๿]/;

/** The prototype's KEEP array, verbatim and in its order (longest first, so
 *  the alternation below prefers the longer compound), plus words the fix wave found the
 *  prototype's own list missed: "ตอนนี้" (P3 finding 7 -- it split as "ตอน / นี้" around 900px,
 *  Actmedia's Thai body; placed by length) and the three P2 finding-6 words appended at the end.
 *  None of the additions is a prefix of another entry, so their position does not change a match.
 *  Used by the default mode only -- display mode keeps every Thai token regardless of this list. */
export const THAI_KEEP: readonly string[] = [
  'เบอร์เกอร์คราฟต์',
  'พาร์ตเนอร์ชิป',
  'ซัพพลายเออร์',
  'นอกเวลางาน',
  'กำไรขั้นต้น',
  'สุดสัปดาห์',
  'เครื่องมือ',
  'งบประมาณ',
  'สตาร์ทอัพ',
  'โปรเจกต์',
  'บาริสต้า',
  'ค้าปลีก',
  'ไอเดีย',
  'ตอนนี้',
  'ดีล',
  // Fix wave finding 6 (M1, ruling): spec criterion 4 is 0 mid-word breaks; a keep-list entry
  // is the smallest fix for each.
  'เครือข่าย',
  'เท่าไหร่',
  'คนเดียว',
];

export interface Run {
  text: string;
  keep: boolean;
}

// Thai month abbreviations as written in dates ("ส.ค.").
const MONTH = '(?:ม\\.ค\\.|ก\\.พ\\.|มี\\.ค\\.|เม\\.ย\\.|พ\\.ค\\.|มิ\\.ย\\.|ก\\.ค\\.|ส\\.ค\\.|ก\\.ย\\.|ต\\.ค\\.|พ\\.ย\\.|ธ\\.ค\\.)';
const DATE = `(?:\\d{1,2} )?${MONTH} \\d{4}`;
const UNIT =
  '\\d[\\d.,]*(?:–\\d[\\d.,]*)? (?:ล้านบาท|พันบาท|พันคน|พัน|เดือน|ทีม|แบบ|ราย|คน|โปรเจกต์|ข้อ|บิล|ปี|มิติ|ใบ)';
// Order matters where two could start at the same place: a date or a
// number+unit ("3 โปรเจกต์") wins over the bare keep word inside it.
// Trap (fix wave finding 13, doc only): this alternation has no word
// boundary of its own -- Thai has none to anchor on -- so a keep-list word
// that happens to be a substring of a longer, unrelated word still matches
// and keeps that whole word. Ported from the prototype's KEEPRE as-is;
// widening a match to a real boundary was never asked for.
const KEEP_SOURCE = [DATE, UNIT, ...THAI_KEEP].join('|');
// A run of non-space characters that contains at least one `|`.
const PIPE_GROUP = '\\S*\\|\\S*';

/** Adjacent plain runs merge (a broken-up gap is never meaningful); adjacent
 *  keep runs stay separate, because the gap between two of them is itself an
 *  allowed break (<ThaiText> renders a <wbr> there). Shared by both modes. */
function pushRun(runs: Run[], t: string, keep: boolean): void {
  if (!t) return;
  const last = runs[runs.length - 1];
  if (!keep && last && !last.keep) last.text += t;
  else runs.push({ text: t, keep });
}

function defaultRuns(text: string): Run[] {
  const runs: Run[] = [];
  const scan = (segment: string) => {
    const re = new RegExp(KEEP_SOURCE, 'g');
    let at = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(segment)) !== null) {
      pushRun(runs, segment.slice(at, m.index), false);
      pushRun(runs, m[0], true);
      at = m.index + m[0].length;
    }
    pushRun(runs, segment.slice(at), false);
  };

  const groups = new RegExp(PIPE_GROUP, 'g');
  let at = 0;
  let g: RegExpExecArray | null;
  while ((g = groups.exec(text)) !== null) {
    scan(text.slice(at, g.index));
    for (const piece of g[0].split('|')) {
      if (THAI_RE.test(piece)) pushRun(runs, piece, true);
      else scan(piece);
    }
    at = g.index + g[0].length;
  }
  scan(text.slice(at));
  return runs;
}

/** Display-mode runs (master R25, preflight A1) -- the prototype's disp():
 *  split on spaces, keep every Thai token whole (splitting further on `|`
 *  the same way the default mode does), leave non-Thai tokens as plain text,
 *  and keep the spaces between tokens as their own plain runs -- except the
 *  one space right after a Thai token and before a non-Thai one, which
 *  becomes a no-break space (fix wave finding 4, prototype disp()): Thai
 *  script has no spaces of its own, so a browser break right there would
 *  visually strand the last Thai syllable from the Latin/number token it
 *  belongs with. The reverse order (non-Thai, then Thai) keeps an ordinary
 *  breakable space, exactly as the prototype does -- only that one
 *  direction is amputating. */
function displayRuns(text: string): Run[] {
  const runs: Run[] = [];
  // Captured groups keep every space run as its own array entry, so a
  // token's Thai-ness can be read from its neighbours below.
  const tokens = text.split(/( +)/).filter((piece) => piece !== '');
  tokens.forEach((piece, i) => {
    if (/^ +$/.test(piece)) {
      const prev = tokens[i - 1];
      const next = tokens[i + 1];
      const glues = prev !== undefined && next !== undefined && THAI_RE.test(prev) && !THAI_RE.test(next);
      pushRun(runs, glues ? piece.replace(/ /g, '\u00A0') : piece, false);
      return;
    }
    // Fix round 1, finding 2: each `|`-split fragment is Thai-tested on its
    // own -- mirrors defaultRuns' per-fragment test above -- so a non-Thai
    // tail like "CRM" in "เครื่องมือ|CRM" is never marked keep just because
    // the token it came from contained Thai somewhere else. This also
    // covers fix wave finding 4's other half: a wholly non-Thai token's `|`
    // is likewise never rendered literally -- split() already consumes the
    // separator for either kind of fragment, and adjacent non-keep runs
    // then merge back together (pushRun, above).
    for (const part of piece.split('|')) pushRun(runs, part, THAI_RE.test(part));
  });
  return runs;
}

export function keepRuns(text: string, options?: { display?: boolean }): Run[] {
  if (!THAI_RE.test(text)) return [{ text, keep: false }];
  return options?.display ? displayRuns(text) : defaultRuns(text);
}

/** Re-review round 1, Minor E (second pass): where AskCard's withMarkers()
 *  should cut a text segment so its tail -- glued to the [n] marker right
 *  after it in a `white-space: nowrap` span -- can never wrap onto its own
 *  line, without ever swallowing a whole Thai clause (which would overflow
 *  at 320px on its own). U+2060 WORD JOINER doesn't stop Chrome breaking
 *  before an inline-block <sup>; an explicit nowrap wrapper does, but only
 *  the short trailing bit needs to be inside it.
 *
 *  Two cases, exactly as verified live (headless Chrome, 320-440px sweep,
 *  0 orphaned markers / 0 overflow either way):
 *   1. The segment ends in a protected keep run (defaultRuns()'s last Run
 *      has `keep: true` -- a THAI_KEEP compound, a unit like "37 ล้านบาท",
 *      or a date) -- the whole run glues, since it's already short by
 *      construction and splitting it would defeat keepRuns' own point.
 *   2. Otherwise, only the LAST word-like unit of the trailing plain run
 *      (Intl.Segmenter, dictionary-based so it also finds Thai word
 *      boundaries with no spaces to go on) plus any punctuation after it.
 *
 *  T18-a (CO-11, P4 re-check E2/E3): a segment that isn't blank always gets
 *  a non-empty tail -- an empty one left the marker alone in its span, free
 *  to orphan again. Trailing whitespace is set aside first and handed back
 *  on the tail ("37 ล้านบาท " used to glue nothing), and a trailing run with
 *  no word in it (just punctuation) reaches back to the keep run before it
 *  ("ค้าปลีก." glues whole), or to the whole segment when there is no word
 *  anywhere ("..."). `head` and `tail` are always two slices of the input
 *  at one index, so `head + tail === segment`.
 *
 *  Where Intl.Segmenter is missing it falls back to spaces: a Latin word or
 *  number back to the space before it, and for Thai (no spaces inside a
 *  clause) just the last syllable -- leading vowel, consonant, and whatever
 *  follows it. Intl.Segmenter ships in every browser and Node version this
 *  app targets, so this is a defensive floor, not a path expected to run. */
export function glueTail(segment: string, locale: Locale): { head: string; tail: string } {
  const body = segment.trimEnd();
  if (!body) return { head: segment, tail: '' };
  const at = tailStart(body, locale);
  return { head: segment.slice(0, at), tail: segment.slice(at) };
}

// Index within `body` (no trailing whitespace) where the glued tail starts.
// Walks keepRuns() from the end: a keep run glues whole; a plain run glues
// from its last word, or -- if it holds no word -- hands over to the run
// before it (adjacent plain runs are always merged, so that is a keep run).
// Run lengths line up with `body` because the only character keepRuns ever
// drops is `|`, which AskCard's answers have already lost to unbreak().
function tailStart(body: string, locale: Locale): number {
  const runs = keepRuns(body);
  let end = body.length;
  for (let i = runs.length - 1; i >= 0; i--) {
    const start = Math.max(0, end - runs[i].text.length);
    if (runs[i].keep) return start;
    const word = lastWordStart(body.slice(start, end), locale);
    if (word !== null) return start + word;
    end = start;
  }
  return 0; // no word anywhere ("..."): the whole segment, short by nature
}

// Index within `plain` where its last word-like unit starts, or null when it
// holds none (only spaces, punctuation or symbols).
function lastWordStart(plain: string, locale: Locale): number | null {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    const segs = [...new Intl.Segmenter(locale, { granularity: 'word' }).segment(plain)];
    for (let k = segs.length - 1; k >= 0; k--) {
      if (segs[k].isWordLike) return segs[k].index;
    }
    return null;
  }
  // The last letter or digit (Thai vowel signs and tone marks are \p{M},
  // so they ride along after it as "what follows").
  const last = /[\p{L}\p{N}](?=[^\p{L}\p{N}]*$)/u.exec(plain);
  if (!last) return null;
  if (THAI_RE.test(last[0])) {
    // Thai: back to its syllable's consonant, and the leading vowel
    // (เ แ โ ใ ไ) written before it, if any.
    return /[เ-ไ]?[ก-ฮ][^ก-ฮ\s]*$/.exec(plain)?.index ?? last.index;
  }
  // A Latin word or a number: back to the space (or Thai text) before it.
  // Stepping over every non-space code unit keeps an emoji's surrogate pair
  // together.
  let i = last.index;
  while (i > 0 && !/[\s฀-๿]/.test(plain[i - 1])) i--;
  return i;
}
