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
}
