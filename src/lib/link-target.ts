import { MAIL_SUBJECT } from './format';
import type { Locale } from './models';
import { sheetHash } from './sheet-url';

// One grammar for every in-page link the CMS can express (contract C5,
// FaqLink.target). FAQ answers, the Ask Preview's sources, the footer and
// the ⌘K index all speak it, so Klao learns one syntax in Notion and the
// four surfaces cannot drift apart:
//   'work' · 'toolbox' · 'contact' · …   an element id on the home page
//   'career:<key>'                        a Career pill (C8 `klao:career`)
//   'work/<projectKey>'                   a project sheet (C6 `#work/<key>`)
//   'https://…'                           an outside page
export type LinkTarget =
  | { kind: 'section'; id: string }
  | { kind: 'career'; key: string }
  | { kind: 'sheet'; key: string }
  | { kind: 'external'; url: string };

const CAREER_RE = /^career:([a-z0-9-]+)$/;
// Same key alphabet as parseSheetHash (C6): lower-case only, so
// 'work/GoNai' is refused here exactly as '#work/GoNai' is refused by the
// sheet — a link can never produce a hash the sheet would ignore.
const SHEET_RE = /^work\/([a-z0-9-]+)$/;
const SECTION_RE = /^[a-z][a-z0-9-]*$/;
const HTTPS_RE = /^https:\/\/\S+$/;

export function parseTarget(raw: string): LinkTarget | null {
  const s = raw.trim();
  const career = CAREER_RE.exec(s);
  if (career) return { kind: 'career', key: career[1] };
  const sheet = SHEET_RE.exec(s);
  if (sheet) return { kind: 'sheet', key: sheet[1] };
  if (SECTION_RE.test(s)) return { kind: 'section', id: s };
  // https only. Links is free text in Notion; a `javascript:` or `data:`
  // URL that reached an href would run script on the live site.
  if (HTTPS_RE.test(s)) {
    try {
      return new URL(s).protocol === 'https:' ? { kind: 'external', url: s } : null;
    } catch {
      return null;
    }
  }
  return null;
}

export const isLinkTarget = (raw: string): boolean => parseTarget(raw) !== null;

// A real href for every kind, so each link still goes somewhere with
// JavaScript off (Review Focus #4) and from routes other than the home page
// (the footer renders on every route).
export function targetHref(raw: string, locale: Locale): string | null {
  const t = parseTarget(raw);
  if (!t) return null;
  switch (t.kind) {
    case 'external':
      return t.url;
    case 'sheet':
      return `/${locale}${sheetHash(t.key)}`;
    case 'career':
      return `/${locale}#career`;
    case 'section':
      return `/${locale}#${t.id}`;
  }
}

// Element id of one FAQ <details>. Notion page ids are UUIDs (hex + dashes),
// fixture ids are kebab-case; the `faq-` prefix keeps the result a valid
// section target (it must start with a letter), so ⌘K can jump to it.
export function faqAnchorId(id: string): string {
  return `faq-${id.toLowerCase().replace(/[^a-z0-9-]/g, '')}`;
}

// Same subject as P1's MAIL_SUBJECT (src/lib/format.ts): one mail subject
// for every "Start a conversation" link, so P4's FAQ/footer/palette mailtos
// land next to P1's hero/thumb-bar ones in Klao's inbox under one thread
// name. Re-exported here (not re-declared) per preflight ruling C3 — P4's
// CloseBand, palette and Ask sources import CONTACT_SUBJECT from this
// module, but the string has one source of truth in format.ts.
export const CONTACT_SUBJECT = MAIL_SUBJECT;

// A generic mailto, distinct from P1's mailtoHref (which is fixed to
// MAIL_SUBJECT): CloseBand's "open question" CTA needs a per-question
// subject (t.closeOpenQSubject), so the subject stays a parameter here.
export const mailto = (email: string, subject: string): string =>
  `mailto:${email}?subject=${encodeURIComponent(subject)}`;
