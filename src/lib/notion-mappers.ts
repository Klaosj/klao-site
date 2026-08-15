import type { CareerEntry, ContentBlock, Localized, PostMeta, Profile, Project, RichSpan, Skill, SkillTier } from './models';
import { SKILL_TIERS } from './models';

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
// Skills' Tier/Category are single-value Select properties, not the
// multi-select `Stack`/`Clients` shape `multi()` above reads -- Notion's API
// nests a Select's value one level deeper (`{ select: { name } }`) than a
// title/rich_text property, hence a dedicated reader rather than reusing
// `text()`.
const selectOf = (prop: any): string | null => prop?.select?.name ?? null;
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
    type: selectOf(page.properties.Type) === 'Business' ? 'business' : 'build',
    outcome: text(page.properties.OutcomeEN)
      ? localized(text(page.properties.OutcomeEN), text(page.properties.OutcomeTH))
      : null,
    question: text(page.properties.QuestionEN)
      ? localized(text(page.properties.QuestionEN), text(page.properties.QuestionTH))
      : null,
    slug: text(page.properties.Slug) || null,
  };
}

export function mapCareerEntry(page: NotionPage): CareerEntry | null {
  const role = text(page.properties.Role);
  // Still gated on the English `Role` alone, so a Career database that has
  // never heard of `RoleTH` maps exactly as it did before. `localized` falls
  // back th -> en, which makes the Thai title purely additive.
  if (!role) return skip('Career', page, 'missing Role');
  const winsEn = lines(text(page.properties.WinsEN));
  const winsTh = lines(text(page.properties.WinsTH));
  return {
    id: page.id,
    role: localized(role, text(page.properties.RoleTH)),
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
    // Optional multi-select, same additive treatment as RoleTH above: a
    // Profile database without a `Clients` property maps to [], and the
    // band that renders it simply does not appear.
    clients: multi(page.properties.Clients),
    // Optional rich text, same `text()` helper and null-default treatment
    // as the other optional text fields above: a Profile database without a
    // `NameNative` property maps to null, and the /th particle wordmark
    // falls back to the Latin word (see src/app/[locale]/page.tsx).
    nameNative: text(page.properties.NameNative) || null,
  };
}

// Reads Tier via `selectOf` above and validates it against SKILL_TIERS
// (models.ts) -- the same array notion-mappers.ts's caller-facing sort
// order in content.ts is built from, so "what's a valid Tier" and "what
// order do tiers render in" can never quietly drift apart.
function tierOf(page: NotionPage): SkillTier | null {
  const name = selectOf(page.properties.Tier);
  return name && (SKILL_TIERS as readonly string[]).includes(name) ? (name as SkillTier) : null;
}

export function mapSkill(page: NotionPage): Skill | null {
  const name = text(page.properties.Name);
  if (!name) return skip('Skills', page, 'missing Name');
  const tier = tierOf(page);
  // Missing Tier and an unrecognised Tier value are the same failure here:
  // SkillsBand's whole layout (which visual tier a skill lands in) is
  // driven by this one field, so there is no safe default to fall back to
  // the way Category falls back to 'biz' below -- an unreadable Tier drops
  // the row, same as a blank Name.
  if (!tier) return skip('Skills', page, 'missing or unrecognised Tier');
  return {
    id: page.id,
    name,
    tier,
    // Optional Select; a Skills database without a Category property (or an
    // empty one) maps to 'biz' rather than failing the row -- same additive
    // treatment as CareerEntry.RoleTH/Profile.Clients elsewhere in this
    // file, just with a non-empty default instead of ''/[]/null, since
    // SkillsBand always needs *some* category to pick a dot color.
    category: selectOf(page.properties.Category) || 'biz',
    order: num(page.properties.Order),
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const spans = (rich: any[]): RichSpan[] =>
  (rich ?? [])
    .filter((r) => (r?.plain_text ?? '') !== '')
    .map((r) => ({
      text: r.plain_text as string,
      ...(r?.annotations?.bold ? { bold: true } : {}),
      ...(r?.annotations?.italic ? { italic: true } : {}),
      ...(r?.annotations?.code ? { code: true } : {}),
      ...(r?.href ? { href: r.href as string } : {}),
    }));

export function mapPostMeta(page: NotionPage): PostMeta | null {
  const props: any = page.properties;
  const slug = text(props.Slug);
  const dateRaw = props.Date?.date?.start;
  // With Notion's "Include time" toggle on, `date.start` is a full
  // timestamp (e.g. "2026-07-27T10:00:00.000+07:00"), not a bare date.
  // PostMeta.date's contract (models.ts) is `// YYYY-MM-DD` -- format.ts
  // builds `new Date(iso + 'T00:00:00Z')` from it, so a timestamp already
  // containing a 'T' produces an invalid, doubled-up string that fails to
  // parse and falls back to rendering the raw ISO timestamp verbatim on
  // /writing, the home page's latest-writing list, and the post header.
  // Slicing to the first 10 characters restores the date-only contract
  // regardless of whether the time toggle is on.
  const date = typeof dateRaw === 'string' ? dateRaw.slice(0, 10) : '';
  const titleEn = text(props.TitleEN);
  if (!slug) return skip('Posts', page, 'missing Slug');
  if (!date) return skip('Posts', page, 'missing Date');
  if (!titleEn) return skip('Posts', page, 'missing TitleEN');
  return {
    id: page.id,
    slug,
    title: localized(titleEn, text(props.TitleTH)),
    date,
    tags: multi(props.Tags),
  };
}

export function mapBlocks(rawBlocks: unknown[]): ContentBlock[] {
  const out: ContentBlock[] = [];
  // Blocks with no extractable content (empty heading text, empty span list)
  // are dropped, same as unsupported types and malformed entries. Code and
  // image blocks always render with their defaults (language 'text', empty
  // code/caption) since an empty fence or a captionless image is still
  // meaningful content, and image src comes from the block id, not payload.
  for (const raw of (rawBlocks ?? []) as any[]) {
    switch (raw?.type) {
      case 'heading_1': {
        const t = text({ rich_text: raw.heading_1?.rich_text });
        if (t) out.push({ type: 'heading', level: 1, text: t });
        break;
      }
      case 'heading_2': {
        const t = text({ rich_text: raw.heading_2?.rich_text });
        if (t) out.push({ type: 'heading', level: 2, text: t });
        break;
      }
      case 'heading_3': {
        const t = text({ rich_text: raw.heading_3?.rich_text });
        if (t) out.push({ type: 'heading', level: 3, text: t });
        break;
      }
      case 'paragraph': {
        const s = spans(raw.paragraph?.rich_text);
        if (s.length) out.push({ type: 'paragraph', spans: s });
        break;
      }
      case 'bulleted_list_item': {
        const s = spans(raw.bulleted_list_item?.rich_text);
        if (s.length) out.push({ type: 'bullet', spans: s });
        break;
      }
      case 'numbered_list_item': {
        const s = spans(raw.numbered_list_item?.rich_text);
        if (s.length) out.push({ type: 'numbered', spans: s });
        break;
      }
      case 'quote': {
        const s = spans(raw.quote?.rich_text);
        if (s.length) out.push({ type: 'quote', spans: s });
        break;
      }
      case 'code':
        out.push({
          type: 'code',
          language: raw.code?.language ?? 'text',
          code: text({ rich_text: raw.code?.rich_text }),
        });
        break;
      case 'image':
        out.push({
          type: 'image',
          src: `/api/img/block/${raw.id}`,
          caption: text({ rich_text: raw.image?.caption ?? [] }),
        });
        break;
      default:
        break; // unsupported block types are dropped
    }
  }
  return out;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function splitBilingual(blocks: ContentBlock[]): { en: ContentBlock[]; th: ContentBlock[] } {
  const i = blocks.findIndex((b) => b.type === 'heading' && b.level === 1 && b.text.trim() === 'ไทย');
  if (i === -1) return { en: blocks, th: blocks };
  return { en: blocks.slice(0, i), th: blocks.slice(i + 1) };
}
