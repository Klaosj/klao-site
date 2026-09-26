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
 *  spaces between tokens are preserved as plain runs. No Intl.Segmenter: the
 *  reviewed prototype has none, and neither option uses one. */

export const THAI_RE = /[฀-๿]/;

/** The prototype's KEEP array, verbatim and in its order (longest first, so
 *  the alternation below prefers the longer compound). Used by the default
 *  mode only -- display mode keeps every Thai token regardless of this list. */
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
  'ดีล',
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
 *  and keep the spaces between tokens as their own plain runs. */
function displayRuns(text: string): Run[] {
  const runs: Run[] = [];
  for (const piece of text.split(/( +)/)) {
    if (piece === '') continue;
    if (/^ +$/.test(piece)) {
      pushRun(runs, piece, false);
    } else if (THAI_RE.test(piece)) {
      for (const part of piece.split('|')) pushRun(runs, part, true);
    } else {
      pushRun(runs, piece.replace(/\|/g, ''), false);
    }
  }
  return runs;
}

export function keepRuns(text: string, options?: { display?: boolean }): Run[] {
  if (!THAI_RE.test(text)) return [{ text, keep: false }];
  return options?.display ? displayRuns(text) : defaultRuns(text);
}
