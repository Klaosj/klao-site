import type { CareerEntry, Localized, Profile, Project } from './models';

export type NotionPage = { id: string; properties: Record<string, unknown> };

/* eslint-disable @typescript-eslint/no-explicit-any */
const text = (prop: any): string =>
  ((prop?.title ?? prop?.rich_text ?? []) as any[])
    .map((t) => t?.plain_text ?? '')
    .join('')
    .trim();
const num = (prop: any): number => (typeof prop?.number === 'number' ? prop.number : 0);
const check = (prop: any): boolean => prop?.checkbox === true;
const urlOf = (prop: any): string | null => prop?.url ?? null;
const emailOf = (prop: any): string => prop?.email ?? '';
const multi = (prop: any): string[] =>
  ((prop?.multi_select ?? []) as any[]).map((o) => o?.name ?? '').filter(Boolean);
const hasFiles = (prop: any): boolean => Array.isArray(prop?.files) && prop.files.length > 0;
/* eslint-enable @typescript-eslint/no-explicit-any */

const localized = (en: string, th: string): Localized => ({ en, th: th || en });
const lines = (s: string): string[] => s.split('\n').map((l) => l.trim()).filter(Boolean);

const fileProxy = (page: NotionPage, propName: string): string | null =>
  hasFiles(page.properties[propName]) ? `/api/img/page/${page.id}/${propName}` : null;

function skip(db: string, page: NotionPage, reason: string): null {
  console.warn(`[notion] skipping ${db} row ${page.id}: ${reason}`);
  return null;
}

export function mapProject(page: NotionPage): Project | null {
  const name = text(page.properties.Name);
  if (!name) return skip('Projects', page, 'missing Name');
  return {
    id: page.id,
    name,
    description: localized(text(page.properties.DescriptionEN), text(page.properties.DescriptionTH)),
    stack: multi(page.properties.Stack),
    liveUrl: urlOf(page.properties.LiveURL),
    repoUrl: urlOf(page.properties.RepoURL),
    imageSrc: fileProxy(page, 'Screenshot'),
    featured: check(page.properties.Featured),
    order: num(page.properties.Order),
  };
}

export function mapCareerEntry(page: NotionPage): CareerEntry | null {
  const role = text(page.properties.Role);
  if (!role) return skip('Career', page, 'missing Role');
  const winsEn = lines(text(page.properties.WinsEN));
  const winsTh = lines(text(page.properties.WinsTH));
  return {
    id: page.id,
    role,
    company: text(page.properties.Company),
    period: text(page.properties.Period),
    wins: { en: winsEn, th: winsTh.length ? winsTh : [...winsEn] },
    order: num(page.properties.Order),
  };
}

export function mapProfile(page: NotionPage): Profile | null {
  const name = text(page.properties.Name);
  if (!name) return skip('Profile', page, 'missing Name');
  return {
    name,
    headline: localized(text(page.properties.HeadlineEN), text(page.properties.HeadlineTH)),
    byline: localized(text(page.properties.BylineEN), text(page.properties.BylineTH)),
    now: localized(text(page.properties.NowEN), text(page.properties.NowTH)),
    photoSrc: fileProxy(page, 'Photo'),
    linkedin: urlOf(page.properties.LinkedIn) ?? '',
    github: urlOf(page.properties.GitHub) ?? '',
    email: emailOf(page.properties.Email),
    resumeUrl: urlOf(page.properties.ResumeURL),
  };
}
