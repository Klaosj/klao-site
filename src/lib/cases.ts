import { CASE_STUDIES } from '@/content/cases';
import type { Localized } from './models';

/**
 * Recruiter Edition case studies (2026-11-09). Client work lives in code, not
 * in the Notion CMS, on purpose: every line about an employer's project is
 * reviewed in a pull request and a preview before it can ship, and a case
 * stays `draft` until Klao clears its text.
 */
export type CaseStatus = 'draft' | 'cleared';

export interface CaseStep {
  title: Localized;
  body: Localized;
}

export interface CaseMeta {
  label: Localized;
  value: Localized;
}

export interface CaseStudy {
  slug: string;
  status: CaseStatus;
  /** Card picture: a drawn tracker ('rollout') or the demo screenshot ('uat'). */
  thumb: 'rollout' | 'uat';
  image?: { src: string; alt: Localized };
  /** A live demo. `previewUrl` is the login-protected copy linked while the case is a draft. */
  demo?: { url: string; previewUrl: string };
  kicker: Localized;
  title: Localized;
  summary: Localized;
  outcome: Localized;
  lede: Localized;
  meta: CaseMeta[];
  confidentiality: Localized;
  problem: Localized[];
  steps: CaseStep[];
  artifact: { kind: 'tracker' | 'demo'; heading: Localized; intro: Localized; caption: Localized };
  result: { headline: Localized; draftNote: string | null };
  skills: Localized;
}

export const CASE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Drafts render everywhere except the production deployment, so a preview can
 * show them to Klao while a merge to main can never publish an uncleared case.
 */
export function showDrafts(env: Record<string, string | undefined> = process.env): boolean {
  return env.VERCEL_ENV !== 'production';
}

export function visibleCases(env: Record<string, string | undefined> = process.env): CaseStudy[] {
  const drafts = showDrafts(env);
  return CASE_STUDIES.filter((c) => c.status === 'cleared' || drafts);
}

export function getCaseStudy(slug: string, env: Record<string, string | undefined> = process.env): CaseStudy | null {
  return visibleCases(env).find((c) => c.slug === slug) ?? null;
}

/** The demo link for this build: the public URL once cleared, the protected one while a draft. */
export function demoHref(c: CaseStudy): string | null {
  if (!c.demo) return null;
  return c.status === 'cleared' ? c.demo.url : c.demo.previewUrl;
}
