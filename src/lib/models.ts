export type Locale = 'en' | 'th';

// Single source of truth for "what are the supported locales" -- consumed by
// middleware.ts (locale-redirect matcher), layout.tsx and
// writing/[slug]/page.tsx (generateStaticParams), and sitemap.ts. Before
// this, each of those carried its own unlinked copy of ['en', 'th'] (plus a
// `locale === 'th' ? 'th' : 'en'` coercion idiom repeated in five
// generateMetadata functions and four page components) -- adding a third
// locale would have needed six separate edits, none flagged by the
// compiler if one was missed. Typed `readonly Locale[]`, not `readonly
// ['en', 'th']` or `string[]`: a literal tuple type doesn't stay in sync
// with the `Locale` union above, so sitemap.ts's own copy of this array was
// previously typed in a way that a third locale added to `Locale` wouldn't
// have been caught anywhere -- it would just silently be missing from the
// sitemap with a green build.
export const LOCALES: readonly Locale[] = ['en', 'th'];

export interface Localized {
  en: string;
  th: string;
}

export interface RichSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  href?: string;
}

export type ContentBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; spans: RichSpan[] }
  | { type: 'bullet'; spans: RichSpan[] }
  | { type: 'numbered'; spans: RichSpan[] }
  | { type: 'quote'; spans: RichSpan[] }
  | { type: 'code'; language: string; code: string }
  | { type: 'image'; src: string; caption: string };

// Which pitch-deck chapter a project belongs to (spec 2026-08-15 §2).
// 'build' is the mapper's default so a Projects database that has never
// heard of the Type select keeps rendering exactly as before — the same
// additive-property treatment as CareerEntry.RoleTH / Profile.Clients.
export type ProjectType = 'business' | 'build';

// White Edition P1 (spec 2026-09-25 §7, contract C5). Each Notion select gets
// the same "valid values + one declaration" array SKILL_TIERS and
// QUESTION_STATUSES use, so notion-mappers.ts validates against exactly the
// list the type names — an unknown option falls back to the field's default.
export type ProjectStatusKey = 'live' | 'proto' | 'pitched' | 'finalist';
export const PROJECT_STATUS_KEYS: readonly ProjectStatusKey[] = ['live', 'proto', 'pitched', 'finalist'];

// What a project shows: a screenshot ('img'), a screenshot in a browser window
// ('win'), the Notion-row vignette ('notion', klao-site), or a line drawing
// ('rings' = Talatify's TAM/SAM/SOM, 'five' = Tripedia's five apps -> one).
export type ProjectMedia = 'img' | 'win' | 'notion' | 'rings' | 'five';
export const PROJECT_MEDIA: readonly ProjectMedia[] = ['img', 'win', 'notion', 'rings', 'five'];

// The tint behind a project's picture (tour stage, P2 sheet) — the only place
// project colour appears on the page (spec §3, 24 Sep).
export type ProjectWash = 'aje' | 'gonai' | 'site' | 'none';
export const PROJECT_WASHES: readonly ProjectWash[] = ['aje', 'gonai', 'site', 'none'];

export interface Project {
  id: string;
  name: string;
  description: Localized;
  stack: string[];
  liveUrl: string | null;
  repoUrl: string | null;
  imageSrc: string | null;
  featured: boolean;
  order: number;
  // Pitch deck (spec 2026-08-15): chapter and the one-line receipt.
  // outcome is null when Notion's OutcomeEN is blank — the line simply
  // doesn't render, never a placeholder (owner's receipts rule).
  type: ProjectType;
  outcome: Localized | null;
  // Wave 1 (spec 2026-08-13): the originating question and the case-study
  // slug. Both null on a project that has no written story yet — a null
  // slug means "no story page", never a placeholder (spec §1 principle 5).
  question: Localized | null;
  slug: string | null;
  // White Edition P1 (C5). Every field below is additive: mapProject gives a
  // pre-migration Notion row (none of these properties yet) the default noted
  // here, so the live site keeps rendering while Klao adds the properties.
  statusKey: ProjectStatusKey | null; // StatusKey select; null = no status mark
  status: Localized | null; // StatusEN/TH, e.g. "Live · since Aug 2026"
  kicker: Localized | null; // KickerEN/TH, "<chapter> · <detail>", e.g. "Build · Working prototype"
  media: ProjectMedia; // Media select; default imageSrc ? 'img' : 'win'
  wash: ProjectWash; // Wash select; default 'none'
  tour: boolean; // Tour checkbox: plays in the hero tour
  tourOrder: number | null; // TourOrder; null sorts after every numbered project
  lineageOf: string | null; // LineageOf relation: Project.id of the earlier idea (GoNai -> Tripedia)
  alt: Localized | null; // AltEN/TH: what the picture shows; null falls back to image-alt.ts
  outcomes: { en: string[]; th: string[] }; // OutcomeEN/TH one per line (th falls back to en); `outcome` stays for the old pages
}

export interface PostMeta {
  id: string;
  slug: string;
  title: Localized;
  date: string; // YYYY-MM-DD
  tags: string[];
}

export interface Post extends PostMeta {
  body: { en: ContentBlock[]; th: ContentBlock[] };
}

// Wave 1 (spec 2026-08-13): the case-study body for a Project whose `slug`
// is non-null. Mirrors Post extends PostMeta exactly -- same bilingual body
// shape, same "fetch the meta row, then its blocks" split between
// fetchProjects/fetchProjectStory as Post already has between
// fetchPostMetas/fetchPostBySlug.
export interface ProjectStory extends Project {
  body: { en: ContentBlock[]; th: ContentBlock[] };
}

// White Edition P3 (C5): the one big number a role's panel may carry (spec
// §6: big numerals only for 30 / 500 and the Career panel figures). `value`
// is shown as typed ("THB 1.1M", "~35%") -- Notion has a single
// FigureValue, so it is the same string in both locales. `label` says what
// the number is; `note` is the short verdict next to it ("Target met"),
// null when FigureNoteEN is empty.
export interface CareerFigure {
  value: string;
  label: Localized;
  note: Localized | null;
}

export interface CareerEntry {
  id: string;
  // Localized as of the 2026-08-09 QA pass. It was a plain string, so English
  // job titles rendered untranslated on /th and /th/career -- the last place
  // English still leaked into the Thai UI. The Notion side stays backward
  // compatible: `RoleTH` is a NEW OPTIONAL property and `Role` remains the
  // English source, so an existing Career database keeps mapping cleanly and
  // simply falls back th -> en, exactly like `wins` already does.
  role: Localized;
  company: string;
  period: string;
  wins: { en: string[]; th: string[] };
  order: number;
  // White Edition P3 (C5, spec §7 Career). `key` is slugKey(company): the
  // stable handle FAQ deep links (`career:<key>`) and the ⌘K palette use to
  // open this role's pill. start/end are 'YYYY-MM' from Notion's StartDate /
  // EndDate date properties, null when the property is absent -- a Career
  // database from before the migration still maps, and the band falls back
  // to `period` and draws no rail. A dated role with end null is "now".
  key: string;
  start: string | null;
  end: string | null;
  figure: CareerFigure | null;
}

export interface Profile {
  name: string;
  headline: Localized;
  byline: Localized;
  now: Localized;
  photoSrc: string | null;
  linkedin: string;
  github: string;
  email: string;
  resumeUrl: string | null;
  // Companies and brands the owner has actually worked with, most
  // recognisable first. Seeded from his own career.json -- employers plus the
  // accounts he names in his own ActMedia wins -- never invented. Locale
  // invariant: these are proper nouns and render identically in both
  // languages, the same reasoning `company` above already relies on.
  clients: string[];
  // Native-script display name (Thai, for this owner). Drives the /th
  // particle wordmark in src/app/[locale]/page.tsx -- rasterised via
  // ParticleField's canvas renderer, not plain DOM text. null falls back to
  // the Latin wordmark (profile.name's first word) on both locales.
  nameNative: string | null;
  // White Edition P3 (C5): By day's owner-side story (one **bold** clause,
  // rendered by BoldText) and the section's closing line (Thai may carry a
  // '|' break marker, C3). Both null on a Profile row from before the
  // migration: ByDay then drops the paragraph and closes on the headline.
  prologue: Localized | null;
  closingLine: Localized | null;
}

// "How real is it" -- a Skill's visual prominence on SkillsBand (the
// Toolbox band) is driven entirely by which of these five buckets it sits
// in, from "reach for daily, ship with it" down to "still learning, not yet
// dependable." Ordered biggest/brightest -> smallest/quietest on purpose:
// this literal declaration order is the single source of truth SKILL_TIERS
// (below) captures as an array, the same way LOCALES above is the single
// source of truth for locale order.
export type SkillTier = 'top' | 'daily' | 'working' | 'basic' | 'learning';

// Single source of truth for two things that must never drift apart: (1)
// "what counts as a valid Tier" -- notion-mappers.ts's mapSkill skips any
// row whose Tier isn't one of these five, same as LOCALES' own reasoning
// above; and (2) "what order do tiers render in" -- content.ts's getSkills
// sorts on this array's index (top first, learning last) before falling
// back to each Skill's own `order`. One typed array, not a hand-copied
// enum-and-sort-order pair in two separate files.
export const SKILL_TIERS: readonly SkillTier[] = ['top', 'daily', 'working', 'basic', 'learning'];

export interface Skill {
  id: string;
  // Locale-invariant: skill names are proper nouns (Claude, Salesforce,
  // Python, Supabase) or industry-standard terms (B2B sales, Pipeline
  // management, TAM-SAM-SOM analysis) that read identically in Thai and
  // English -- same reasoning Profile.clients above already relies on, one
  // step earlier in this file.
  name: string;
  tier: SkillTier;
  // Free-form Notion Select value (tech/biz/data/fin/human, per
  // docs/NOTION_SETUP.md) -- not a union here, since SkillsBand only uses
  // this to pick a muted dot color and quietly falls back to one default
  // color for any value it doesn't recognise, rather than needing the type
  // system to enumerate every category a future Skills row might carry.
  category: string;
  order: number;
}

// Wave 2 (spec 2026-08-13): the owner's question loop, open side. Status
// drives band membership (answered questions leave the band) and the
// building marker; same "valid values + one declaration" idiom as
// SKILL_TIERS/LOCALES above -- notion-mappers.ts validates against this
// array.
export type QuestionStatus = 'wondering' | 'building' | 'answered';
export const QUESTION_STATUSES: readonly QuestionStatus[] = ['wondering', 'building', 'answered'];

export interface OpenQuestion {
  id: string;
  question: Localized;
  // 'answered' questions never render on the band; their linkSlug feeds the
  // case page's "born from a question" line instead.
  status: QuestionStatus;
  linkSlug: string | null;
  // YYYY-MM-DD. The Notion Date property when set, else the row's own
  // created_time -- a real timestamp (when the question was logged), never
  // an invented one.
  date: string;
}

// White Edition P3 (C5, spec §7 Story DB): one By day chapter. `body`
// carries one **bold** clause (BoldText renders it). `icon` / `sketch` are
// the Notion select values as typed ('' when unset); src/lib/story.ts decides
// which of them the page can actually draw, so a typo in Notion drops the
// icon, never the chapter.
export interface StoryChapter {
  id: string;
  title: Localized;
  body: Localized;
  rule: Localized;
  icon: string;
  sketch: string;
  order: number;
}
