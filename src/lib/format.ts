import type { Locale } from './models';

export function formatDate(iso: string, locale: Locale): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    console.warn(`[format] invalid date: "${iso}"`);
    return iso;
  }
  return date.toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * A URL- and id-safe key for a display name (White Edition contracts C5/C6):
 * a project's sheet hash (`#work/<key>`, used when Notion has no Slug) and a
 * career entry's deep link (`career:<key>`). No equivalent existed before P1
 * (checked: no slugify/toSlug helper anywhere in src/).
 *
 * NFKD plus dropping the combining marks keeps the base letter of an accented
 * name ("Café" -> "cafe"). Every other run of characters outside [a-z0-9]
 * becomes one hyphen, trimmed at both ends. Thai (or any non-Latin) text has no
 * slug-safe characters and yields '' — callers treat '' as "no key", which is
 * why a Notion Slug wins over this whenever one is set (C6).
 */
export function slugKey(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** The subject every "Start a conversation" link pre-fills (prototype MAILTO),
 *  so mail that came from the site is recognisable in the inbox. */
export const MAIL_SUBJECT = 'Hello from klao-site';

/** One mailto for every "Start a conversation": hero, phone menu, thumb bar,
 *  and (P4) the close section. */
export function mailtoHref(email: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(MAIL_SUBJECT)}`;
}

// Fills `{name}` slots in a dictionary template ('{n} results',
// 'Ask Klao: “{q}”'). Word order differs between Thai and English, so the
// dictionary owns the whole sentence and code only supplies the values. An
// unknown slot stays as written: a typo shows on screen instead of vanishing.
// Own keys only: `name in vars` would also match Object.prototype names, so a
// '{toString}' slot would print a native function instead of staying as written.
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (slot, name: string) => (Object.hasOwn(vars, name) ? String(vars[name]) : slot));
}

// A count sentence (T12 m1: the palette said "1 results"). English has a
// singular for exactly one; Thai says both the same way. The dictionary owns
// both forms per locale -- Thai's are simply identical -- so code only picks
// one by the count and never builds a plural itself.
export function fillCount(n: number, other: string, one: string): string {
  return fill(n === 1 ? one : other, { n });
}
