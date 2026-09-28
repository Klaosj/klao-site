import type { IconName } from '@/components/icons';
import { pillYears } from './career';
import { dict, type UiStringKey } from './dictionary';
import { CONTACT_SUBJECT, faqAnchorId, mailto } from './link-target';
import type { CareerEntry, FaqItem, Locale, Profile, Project } from './models';
import { unbreak } from './project-view';
import { projectKey } from './sheet-url';
import type { ThemePref } from './theme';

// The ⌘K index (spec §6): sections, projects (→ sheet), Career entries
// (→ pill), FAQ questions, and actions (copy email, theme, language). Built
// on the server in layout.tsx, so the client receives plain, already
// localised rows and no Notion data shapes; the palette code itself loads
// only when someone opens it.

export type PaletteGroup = 'suggested' | 'go' | 'projects' | 'career' | 'faq' | 'links' | 'prefs';

// Display order of the groups, with or without a query (prototype).
export const PALETTE_GROUPS: readonly PaletteGroup[] = [
  'suggested',
  'go',
  'projects',
  'career',
  'faq',
  'links',
  'prefs',
];

export type PaletteAction =
  | { type: 'target'; target: string }
  | { type: 'href'; href: string; external: boolean }
  | { type: 'copy'; text: string }
  | { type: 'theme'; pref: ThemePref }
  | { type: 'locale'; locale: Locale };

export interface PaletteEntry {
  id: string;
  group: PaletteGroup;
  label: string; // active-locale name
  alt: string; // the other locale's name, so either language finds the row ('' = same)
  hint: string; // right-hand detail ('' = none)
  keywords: string; // extra search words, both languages
  icon: IconName;
  action: PaletteAction;
}

export interface PaletteInput {
  profile: Pick<Profile, 'email' | 'resumeUrl' | 'linkedin' | 'github'>;
  projects: Pick<Project, 'id' | 'name' | 'slug' | 'type' | 'kicker' | 'description'>[];
  career: Pick<CareerEntry, 'id' | 'key' | 'company' | 'role' | 'period' | 'start' | 'end'>[];
  faq: Pick<FaqItem, 'id' | 'question'>[];
}

// Section rows. Keywords are the prototype's aliases. Labels reuse SiteNav's
// existing keys rather than adding a second copy of the same text under a
// `pal*` name (preflight ruling C1): P0/P1 already have one 'Projects' /
// 'Career' / 'How I work' / 'Contact' pair per locale. palTop and palFaq are
// not duplicates -- no other key already carries their text -- so they stay.
const SECTIONS: readonly { id: string; label: UiStringKey; icon: IconName; keywords: string }[] = [
  { id: 'top', label: 'palTop', icon: 'arrow-up-right', keywords: 'home hero' },
  { id: 'work', label: 'navWork', icon: 'arrow-right', keywords: 'projects work โปรเจกต์ ผลงาน' },
  { id: 'career', label: 'navCareer', icon: 'arrow-right', keywords: 'career job cv งาน ประวัติ' },
  { id: 'story', label: 'navStory', icon: 'arrow-right', keywords: 'by day deal how work วิธีทำงาน ตอนกลางวัน' },
  { id: 'faq', label: 'palFaq', icon: 'arrow-right', keywords: 'faq questions คำถาม' },
  { id: 'contact', label: 'navContact', icon: 'envelope-duotone', keywords: 'contact email ติดต่อ' },
];

// M3 (fix wave finding 6): the prototype's one per-row alias (index.html:1774,
// commands()'s `add('car', …)`), restored -- generic industry words, never a
// client name or figure (Global Constraint: the repo is public). No other
// Career row carries one; Klao's current Career database only has this one.
const CAREER_ALIAS: Record<string, string> = { actmedia: 'retail media bd ค้าปลีก' };

const THEMES: readonly { pref: ThemePref; label: UiStringKey; icon: IconName }[] = [
  { pref: 'auto', label: 'themeAuto', icon: 'circle-half' },
  { pref: 'light', label: 'themeLight', icon: 'sun' },
  { pref: 'dark', label: 'themeDark', icon: 'moon' },
];

// 'https://www.linkedin.com/in/x/' → 'linkedin.com/in/x' for the row hint.
const shortUrl = (url: string): string => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

export function buildPaletteIndex(input: PaletteInput, locale: Locale): PaletteEntry[] {
  const t = dict[locale];
  const other: Locale = locale === 'en' ? 'th' : 'en';
  const o = dict[other];
  const { email, resumeUrl, linkedin, github } = input.profile;
  const entries: PaletteEntry[] = [];

  if (email) {
    entries.push({
      id: 'suggested:mail',
      group: 'suggested',
      label: t.startConversation,
      alt: o.startConversation,
      hint: email,
      keywords: 'email mail contact hire อีเมล ติดต่อ',
      icon: 'envelope-duotone',
      action: { type: 'href', href: mailto(email, CONTACT_SUBJECT), external: false },
    });
    entries.push({
      id: 'suggested:copy',
      group: 'suggested',
      label: t.copyEmail,
      alt: o.copyEmail,
      hint: email,
      keywords: 'email copy คัดลอก',
      icon: 'copy',
      action: { type: 'copy', text: email },
    });
  }
  if (resumeUrl) {
    entries.push({
      id: 'suggested:resume',
      group: 'suggested',
      label: t.palOpenResume,
      alt: o.palOpenResume,
      hint: 'PDF',
      keywords: 'resume cv pdf เรซูเม่ ประวัติ',
      icon: 'file-pdf-duotone',
      action: { type: 'href', href: resumeUrl, external: true },
    });
  }

  for (const s of SECTIONS) {
    entries.push({
      id: `go:${s.id}`,
      group: 'go',
      label: t[s.label],
      alt: o[s.label],
      hint: `#${s.id}`,
      keywords: s.keywords,
      icon: s.icon,
      action: { type: 'target', target: s.id },
    });
  }

  for (const p of input.projects) {
    const key = projectKey(p);
    entries.push({
      // S-7: a Thai-only-named project with no Notion Slug gives
      // projectKey('') -- unlike the footer (SiteFooter.tsx drops the row),
      // a ⌘K row stays findable, so the id falls back to the project's own
      // (always-unique) id instead of colliding on 'project:' with any other
      // slugless project, and the action below falls back to the 'work'
      // section instead of the unparseable 'work/' sheet target.
      id: `project:${key || p.id}`,
      group: 'projects',
      // p.name is the project's title, not Localized body copy, so it never
      // carries the '|' break mark and skips unbreak() (fix round 1, minor).
      label: p.name,
      alt: '',
      // kicker/description are Notion copy and may carry the '|' break mark;
      // unbreak() drops it here exactly as it does on the projects index
      // (preflight C13) -- this row is body-size text, not a heading, so
      // there is no keep-run to preserve.
      hint: unbreak(p.kicker?.[locale] ?? ''),
      // The descriptions make "trip" or "เที่ยว" find GoNai without a
      // hand-kept alias list per project.
      keywords: unbreak(`${p.description.en} ${p.description.th}`),
      icon: p.type === 'business' ? 'chart-line-up-duotone' : 'code-duotone',
      action: { type: 'target', target: key ? `work/${key}` : 'work' },
    });
  }

  for (const c of input.career) {
    // A Thai-only company name has no ASCII for slugKey to keep, so `key` is
    // '' (P2 S-7). `career:` with an empty key is a target parseTarget's
    // CAREER_RE never matches -- a dead row -- so it is dropped instead of
    // listed (preflight C16).
    if (!c.key) continue;
    entries.push({
      id: `career:${c.key}`,
      group: 'career',
      // c.company (a proper noun) and c.period (a date range) are plain
      // strings, not Localized body copy, so neither carries the '|' break
      // mark and both skip unbreak() (fix round 1, minor).
      label: c.company,
      alt: '',
      // M4 (fix wave finding 7): the raw `period` string is hand-typed
      // English ("MAR 2026 – Present"), so it leaked into the Thai palette
      // untranslated. pillYears() gives the same quiet '2024 – 2026' /
      // '2026 – <nowWord>' short form the Career pill itself shows,
      // localised through t.careerNow -- falling back to `period` only for
      // a pre-migration row with no StartDate (pillYears returns null).
      hint: pillYears(c, t.careerNow) ?? c.period,
      keywords: unbreak(`${c.role.en} ${c.role.th}`) + (CAREER_ALIAS[c.key] ? ` ${CAREER_ALIAS[c.key]}` : ''),
      icon: 'arrow-right',
      action: { type: 'target', target: `career:${c.key}` },
    });
  }

  for (const f of input.faq) {
    entries.push({
      id: `faq:${f.id}`,
      group: 'faq',
      label: unbreak(f.question[locale]),
      alt: unbreak(f.question[other]),
      hint: '',
      keywords: '',
      icon: 'chat-circle-dots-duotone',
      action: { type: 'target', target: faqAnchorId(f.id) },
    });
  }

  if (linkedin) {
    entries.push({
      id: 'link:linkedin',
      group: 'links',
      label: 'LinkedIn',
      alt: '',
      hint: shortUrl(linkedin),
      keywords: 'linkedin',
      icon: 'linkedin-logo',
      action: { type: 'href', href: linkedin, external: true },
    });
  }
  if (github) {
    entries.push({
      id: 'link:github',
      group: 'links',
      label: 'GitHub',
      alt: '',
      hint: shortUrl(github),
      keywords: 'github code source โค้ด',
      icon: 'github-logo',
      action: { type: 'href', href: github, external: true },
    });
  }

  entries.push({
    id: 'pref:lang',
    group: 'prefs',
    label: t.palLang,
    alt: '',
    hint: '',
    keywords: 'language ภาษา thai english ไทย อังกฤษ',
    icon: 'translate-duotone',
    action: { type: 'locale', locale: other },
  });
  for (const th of THEMES) {
    entries.push({
      id: `pref:theme-${th.pref}`,
      group: 'prefs',
      label: `${t.appearance}: ${t[th.label]}`,
      alt: `${o.appearance}: ${o[th.label]}`,
      hint: '',
      keywords: `theme appearance ${th.pref} ธีม`,
      icon: th.icon,
      action: { type: 'theme', pref: th.pref },
    });
  }

  return entries;
}

// Case- and accent-insensitive form used for matching ('Résumé' → 'resume').
// Thai has no canonical decompositions, so Thai text keeps its length and
// highlight() offsets stay valid.
export const fold = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC').toLowerCase();

const THAI = /[฀-๿]/;

// True when one edit (insert, delete, substitute, or swap two neighbours)
// turns a into b — the prototype's lev1.
export function oneEdit(a: string, b: string): boolean {
  if (a.length === b.length) {
    const diff: number[] = [];
    for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) diff.push(k);
    if (diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]]) {
      return true;
    }
  }
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

// Prototype score(): 3 = a name or word starts with the query, 2 = a name
// contains it, 1 = a curated keyword/alias word starts with the query, 0.5 =
// one typo away (Latin, 4+ letters only — Thai has no spaces to anchor a
// typo on). M3 (fix wave finding 6) adds 0.75, below every curated-word hit:
// a project's `keywords` is its full bilingual description (not a short
// alias like Career's), so a bare substring match anywhere in that blob is
// real but weaker signal than a word actually starting with the query.
function score(entry: PaletteEntry, q: string): number {
  const names = [fold(entry.label), fold(entry.alt)].filter(Boolean);
  const words = names.join(' ').split(/\s+/).filter(Boolean);
  const kw = fold(entry.keywords);
  const kwWords = kw.split(/\s+/).filter(Boolean);
  if (names.some((n) => n.startsWith(q)) || words.some((w) => w.startsWith(q))) return 3;
  if (names.some((n) => n.includes(q))) return 2;
  if (kwWords.some((w) => w.startsWith(q))) return 1;
  if (kw.includes(q)) return 0.75;
  if (
    q.length >= 4 &&
    !THAI.test(q) &&
    words
      .concat(kwWords)
      .some((w) => oneEdit(w.slice(0, q.length), q) || oneEdit(w.slice(0, q.length + 1), q) || oneEdit(w, q))
  ) {
    return 0.5;
  }
  return 0;
}

// Matching rows, best first inside each group, groups in PALETTE_GROUPS order.
export function searchPalette(entries: PaletteEntry[], query: string): PaletteEntry[] {
  const q = fold(query.trim());
  if (!q) return entries;
  const scored = entries
    .map((entry, index) => ({ entry, index, s: score(entry, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.index - b.index);
  return PALETTE_GROUPS.flatMap((g) => scored.filter((x) => x.entry.group === g).map((x) => x.entry));
}

// M3 (fix wave finding 6): the index of the best-scoring row in `rows` (a
// searchPalette() result, in fixed group order -- 'faq' can list before
// 'prefs' even though a 'prefs' row scores higher for a given query). Enter
// on the palette's default selection used to just run rows[0], whatever that
// group order happened to put first; CommandPalette now starts (and resets,
// on every keystroke) the selection here instead, so Enter always runs the
// row that actually matched best. 0 for an empty query (no scoring to do --
// the first Suggested row, same as before) and 0 when nothing scores above 0
// (rows is then either empty or just the "Ask Klao" row appended after).
export function bestScoreIndex(rows: readonly PaletteEntry[], query: string): number {
  const q = fold(query.trim());
  if (!q || rows.length === 0) return 0;
  let bestIndex = 0;
  let bestScore = 0;
  rows.forEach((entry, i) => {
    const s = score(entry, q);
    if (s > bestScore) {
      bestScore = s;
      bestIndex = i;
    }
  });
  return bestIndex;
}

// Thai vowel signs and tone marks that only ever attach to the character
// before them (Unicode's Extend/SpacingMark grapheme categories for Thai) --
// the fallback matchBounds() below uses this fixed set when Intl.Segmenter
// isn't available.
const THAI_MARK = /[ัิ-ฺ็-๎]/;

// Widens [start, end) to the nearest grapheme-cluster boundaries. score()
// and fold() work in UTF-16 code units, which cut a Thai cluster mid-glyph
// -- 'อ่' (a base consonant plus a tone mark) is two code units but one
// glyph a reader never sees split, so a naive slice can return a fragment
// that starts with a bare combining mark (fix round 1: T13's <mark> then
// renders a broken glyph). Intl.Segmenter is built in (no new dependency)
// and used when present; the regex fallback below only needs to know which
// Thai code points are combining marks, since English text has none and is
// unaffected either way (every Latin/accented character is its own cluster).
function matchBounds(text: string, start: number, end: number): [number, number] {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    const bounds = [0];
    for (const { segment } of new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)) {
      bounds.push(bounds[bounds.length - 1] + segment.length);
    }
    let s = 0;
    for (const b of bounds) {
      if (b <= start) s = b;
      else break;
    }
    let e = bounds[bounds.length - 1];
    for (const b of bounds) {
      if (b >= end) {
        e = b;
        break;
      }
    }
    return [s, e];
  }
  let s = start;
  while (s > 0 && THAI_MARK.test(text[s])) s--;
  let e = end;
  while (e < text.length && THAI_MARK.test(text[e])) e++;
  return [s, e];
}

// [before, match, after] around the first case/accent-insensitive match.
export function highlight(text: string, query: string): [string, string, string] | null {
  const q = fold(query.trim());
  if (!q) return null;
  const i0 = fold(text).indexOf(q);
  if (i0 < 0) return null;
  const [i, e] = matchBounds(text, i0, i0 + q.length);
  return [text.slice(0, i), text.slice(i, e), text.slice(e)];
}
