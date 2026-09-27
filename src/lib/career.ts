import type { CareerEntry, Skill } from './models';

// C8 (master plan): FAQ deep links, the ⌘K palette and the footer ask the
// career band to open a role with
//   window.dispatchEvent(new CustomEvent(CAREER_EVENT, { detail: { key } }))
// Exported so dispatchers import the name instead of retyping the string.
export const CAREER_EVENT = 'klao:career';

const YM = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Months since year 0 for a 'YYYY-MM' string, so a difference is a month
 *  count. NaN for anything else; every caller treats NaN as "no date". */
export function monthIndex(ym: string): number {
  const m = YM.exec(ym);
  return m ? Number(m[1]) * 12 + Number(m[2]) - 1 : Number.NaN;
}

/** The current month in Bangkok (UTC+7, no DST) as 'YYYY-MM'. CareerBand
 *  computes it on the server and hands it to the client island, so a visitor
 *  whose clock sits in another month never sees hydrated durations disagree
 *  with the server HTML. ISR (about 1 h) keeps it current. */
export function currentYm(date: Date = new Date()): string {
  const bkk = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return `${bkk.getUTCFullYear()}-${String(bkk.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Inclusive month count ('2026-03'..'2026-09' = 7), never below 1: an
 *  EndDate typed before its StartDate shows "1 mo", not a negative span. */
export function monthsBetween(start: string, end: string): number {
  const n = monthIndex(end) - monthIndex(start) + 1;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** 'Mar 2026' / 'มี.ค. 2026'. A malformed value is shown as typed. */
export function formatYm(ym: string, months: readonly string[]): string {
  const i = monthIndex(ym);
  return Number.isFinite(i) ? `${months[i % 12]} ${Math.floor(i / 12)}` : ym;
}

export interface DateLabels {
  months: readonly string[];
  present: string;
  unit: string;
}

/** The panel's date line, e.g. 'Mar 2026 – Present · 7 mo'. A pre-migration
 *  row (no StartDate) shows its hand-typed `period` instead. */
export function careerDates(
  entry: Pick<CareerEntry, 'start' | 'end' | 'period'>,
  now: string,
  labels: DateLabels,
): string {
  if (!entry.start) return entry.period;
  const to = entry.end ? formatYm(entry.end, labels.months) : labels.present;
  return `${formatYm(entry.start, labels.months)} – ${to} · ${monthsBetween(entry.start, entry.end ?? now)} ${labels.unit}`;
}

/** The pill's quiet year label: '2024 – 2026', '2023' (same year),
 *  '2026 – now'. null without a start, so the pill shows the company only. */
export function pillYears(entry: Pick<CareerEntry, 'start' | 'end'>, nowWord: string): string | null {
  if (!entry.start) return null;
  const from = entry.start.slice(0, 4);
  if (!entry.end) return `${from} – ${nowWord}`;
  const to = entry.end.slice(0, 4);
  return to === from ? from : `${from} – ${to}`;
}

export interface RailSegment {
  index: number; // index into the entries passed in
  left: number; // percent of the rail
  width: number; // percent of the rail
}
export interface RailTick {
  year: number;
  left: number;
  first: boolean; // sits flush left instead of centred on its position
  alt: boolean; // every other year: hidden on phone (CSS)
}
export interface RailModel {
  segments: RailSegment[];
  ticks: RailTick[];
  centers: (number | null)[]; // per entry; null when the entry has no start
}

const pct = (n: number): number => Math.min(100, Math.max(0, n));

/** Geometry for the time rail, in percent of its width, from the earliest
 *  start to `now`. Each role ends where the next newer role starts, so a
 *  handover month is drawn once; this looks at dates, not array order, so a
 *  re-ordered Notion DB draws the same rail. Undated entries are skipped; no
 *  dated entry at all (pre-migration Notion) returns null and the band draws
 *  no rail. Everything is clamped into 0..100 so a future-dated typo can
 *  never push a segment past the rail's edge. */
export function railModel(entries: Pick<CareerEntry, 'start' | 'end'>[], now: string): RailModel | null {
  const starts = entries.map((e) => (e.start ? monthIndex(e.start) : Number.NaN));
  const dated = starts.filter((s) => Number.isFinite(s));
  if (dated.length === 0) return null;
  const origin = Math.min(...dated);
  const nowIdx = monthIndex(now);
  const last = Number.isFinite(nowIdx) ? nowIdx : Math.max(...dated);
  const total = Math.max(1, last - origin + 1);

  const segments: RailSegment[] = [];
  const centers: (number | null)[] = entries.map(() => null);
  entries.forEach((entry, index) => {
    const s = starts[index];
    if (!Number.isFinite(s)) return;
    let end = entry.end ? monthIndex(entry.end) - origin + 1 : total;
    if (!Number.isFinite(end)) end = total;
    const later = dated.filter((x) => x > s);
    if (later.length) end = Math.min(end, Math.min(...later) - origin);
    const left = pct(((s - origin) / total) * 100);
    const width = Math.max(0, pct((end / total) * 100) - left);
    segments.push({ index, left, width });
    centers[index] = left + width / 2;
  });

  const firstYear = Math.floor(origin / 12);
  const lastYear = Math.floor((origin + total - 1) / 12);
  const ticks: RailTick[] = [];
  for (let year = firstYear; year <= lastYear; year++) {
    const left = year === firstYear ? 0 : pct(((year * 12 - origin) / total) * 100);
    ticks.push({ year, left, first: year === firstYear, alt: (year - firstYear) % 2 === 1 });
  }
  return { segments, ticks, centers };
}

/** Where the marker label sits relative to its dot, so it never runs off the
 *  rail. Server/no-JS fallback only (fix wave finding 3): fixed 12/88%
 *  thresholds know nothing about the label's actual rendered width, so on a
 *  narrow rail they could still let a long label ("A Bun Dance · 20 mo")
 *  clip at 390/360px. CareerDetent uses this for the `data-align` attribute
 *  the CSS reads before JS runs (and if it never does); once hydrated,
 *  `railLabelOffset` below takes over with the real measured widths. */
export function labelAlign(center: number): 'start' | 'mid' | 'end' {
  return center < 12 ? 'start' : center > 88 ? 'end' : 'mid';
}

/** The rail label's clamped horizontal offset in pixels (fix wave finding
 *  3), ported verbatim from the approved prototype's measured clamp
 *  (design/white-edition/prototype/index.html ~l.1326-1333): centered on
 *  the marker by default (`-labelWidth / 2`); pulled right just enough to
 *  keep its left edge inside the rail, or left just enough to keep its
 *  right edge inside it, whichever the marker's position needs. `center`
 *  is railModel's percent-of-rail center; `railWidth`/`labelWidth` are real
 *  measured pixels (Element.clientWidth / offsetWidth) -- this only runs
 *  once those are known, so it needs no `|| 120` guess the way the
 *  prototype's inline script did. */
export function railLabelOffset(center: number, railWidth: number, labelWidth: number): number {
  const x = (center / 100) * railWidth;
  let lx = -labelWidth / 2;
  if (x + lx < 0) lx = -x;
  if (x + labelWidth / 2 > railWidth) lx = railWidth - x - labelWidth;
  return lx;
}

const compact = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** The entry a `career:<key>` link means, or -1. Exact key first; then the
 *  same letters without separators ('abundance' = 'a-bun-dance', the
 *  prototype's FAQ form); then a unique prefix of at least three letters
 *  ('a-bun-dance' finds a live Notion row still named "A Bun Dance (Craft
 *  Burger)"). Anything else -- unknown, empty, ambiguous -- is -1, so a stale
 *  link does nothing instead of opening the wrong role. */
export function findCareerIndex(entries: Pick<CareerEntry, 'key'>[], key: string): number {
  if (!key) return -1;
  const exact = entries.findIndex((e) => e.key === key);
  if (exact >= 0) return exact;
  const want = compact(key);
  if (!want) return -1;
  const same = entries.findIndex((e) => compact(e.key) === want);
  if (same >= 0) return same;
  if (want.length < 3) return -1;
  const prefixed = entries.flatMap((e, i) => (e.key && compact(e.key).startsWith(want) ? [i] : []));
  return prefixed.length === 1 ? prefixed[0] : -1;
}

export interface FigurePart {
  text: string;
  unit: boolean;
}

const UNIT = /^[A-Za-z฀-๿]+$/;

/** 'THB 1.1M' -> a small unit ('THB') and the numeral ('1.1M'), the way the
 *  prototype set the figure (.u at .45em). Letter-only words are units, so a
 *  Thai value like '1.1 ล้านบาท' works the same once Notion carries one. */
export function splitFigureValue(value: string): FigurePart[] {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((text) => ({ text, unit: UNIT.test(text) }));
}

export type ToolboxColumnId = 'stack' | 'methods' | 'languages';

export interface ToolboxColumn {
  id: ToolboxColumnId;
  label: string;
  items: string[];
}

// The owner's own cut of which concrete tools the toolbox names, in reading
// order: the prototype's "Works in" + "Builds with" cells (the old
// SkillsBand TOOLS_ALLOWLIST plus Next.js). A Skills row not listed here is
// not shown (owner, 2026-08-12: "too many chips reads as overclaiming"); a
// listed name with no Skills row is skipped, never invented.
export const TOOLBOX_STACK: readonly string[] = [
  'Salesforce',
  'Excel & Sheets modeling',
  'Power BI',
  'Python',
  'SQL',
  'Next.js',
  'Supabase',
  'Notion API',
  'Vercel',
  'Swift',
];

/** The toolbox's one row, in spec §10 order: stack · methods · languages.
 *  methods = Skills at tier 'top' (the prototype's "Focus"), in the order
 *  getSkills returns them. Columns with nothing in them are dropped. */
export function toolboxColumns(
  skills: Skill[],
  labels: Record<ToolboxColumnId, string>,
  languages: readonly string[],
): ToolboxColumn[] {
  const names = new Set(skills.map((s) => s.name));
  const columns: ToolboxColumn[] = [
    { id: 'stack', label: labels.stack, items: TOOLBOX_STACK.filter((n) => names.has(n)) },
    { id: 'methods', label: labels.methods, items: skills.filter((s) => s.tier === 'top').map((s) => s.name) },
    { id: 'languages', label: labels.languages, items: [...languages] },
  ];
  return columns.filter((c) => c.items.length > 0);
}
