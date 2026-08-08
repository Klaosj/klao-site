export type Locale = 'en' | 'th';

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
  role: string;
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
}
