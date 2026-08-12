import { cache } from 'react';
import type { CareerEntry, Post, PostMeta, Profile, Project, Skill, SkillTier } from './models';
import { SKILL_TIERS } from './models';
import projectsFixture from '@/content/fixtures/projects.json';
import postsFixture from '@/content/fixtures/posts.json';
import careerFixture from '@/content/fixtures/career.json';
import profileFixture from '@/content/fixtures/profile.json';
import skillsFixture from '@/content/fixtures/skills.json';

function isNotionConfigured(): boolean {
  return Boolean(process.env.NOTION_TOKEN);
}

function isProductionBuildPhase(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

// Spec §5 error handling has two distinct rules, and they resolve opposite ways here:
// (a) Notion fails during ISR revalidate (a cached build already exists) → the last
//     good build must keep serving. Next only does that when the revalidating render
//     throws, so we rethrow here and let ISR's error path take over.
// (b) Notion fails with no cache to fall back on (the production build phase, before
//     any page has ever rendered successfully) → there is nothing for ISR to serve, so
//     we return fixtures instead of failing the build outright.
// Logging happens before the branch so both paths are logged, per spec §5.
async function fromNotion<T>(
  fetcher: (notion: typeof import('./notion')) => Promise<T>,
  fallback: T,
): Promise<T> {
  if (!isNotionConfigured()) return fallback;
  try {
    return await fetcher(await import('./notion'));
  } catch (e) {
    console.warn('[content] Notion fetch failed', e);
    if (isProductionBuildPhase()) return fallback;
    throw e;
  }
}

// cache() dedupes getFeaturedProjects' call to the same underlying fetch within
// a single request/render — in Notion mode that's the difference between one
// Projects round trip per homepage render and two.
const getProjectsCached = cache(async (): Promise<Project[]> => {
  const all = await fromNotion((n) => n.fetchProjects(), projectsFixture as Project[]);
  return [...all].sort((a, b) => a.order - b.order);
});

export async function getProjects(): Promise<Project[]> {
  return getProjectsCached();
}

// The home grid shows every project marked Featured in Notion, ordered by
// Order — no cap here. Capping is a content decision, done by un-featuring a
// project in Notion, not a code decision (owner call, 2026-08-12).
export async function getFeaturedProjects(): Promise<Project[]> {
  return (await getProjectsCached()).filter((p) => p.featured);
}

// [locale]/writing/[slug]/page.tsx calls getPosts() (the pre-check for a
// bogus slug) and getPost(slug) once each from generateMetadata and again
// from PostPage itself -- without cache(), that's 2x the list query, 2x the
// filtered query, and 2x the block-content fetch per post request in live-
// Notion mode. Wrapped exactly like getProjectsCached/getProfileCached
// below; fromNotion's fallback/rethrow semantics are untouched by this --
// cache() only dedupes calls within a single request/render, it doesn't
// change what fromNotion does when Notion fails.
const getPostsCached = cache(async (): Promise<PostMeta[]> => {
  const fixtureMetas = (postsFixture as Post[]).map(({ id, slug, title, date, tags }) => ({
    id,
    slug,
    title,
    date,
    tags,
  }));
  const all = await fromNotion((n) => n.fetchPostMetas(), fixtureMetas);
  return [...all].sort((a, b) => b.date.localeCompare(a.date));
});

export async function getPosts(): Promise<PostMeta[]> {
  return getPostsCached();
}

const getPostCached = cache(async (slug: string): Promise<Post | null> => {
  const fixture = (postsFixture as Post[]).find((p) => p.slug === slug) ?? null;
  return fromNotion((n) => n.fetchPostBySlug(slug), fixture);
});

export async function getPost(slug: string): Promise<Post | null> {
  return getPostCached(slug);
}

export async function getCareer(): Promise<CareerEntry[]> {
  const all = await fromNotion((n) => n.fetchCareer(), careerFixture as CareerEntry[]);
  return [...all].sort((a, b) => a.order - b.order);
}

const getProfileCached = cache(async (): Promise<Profile> => {
  const profile = await fromNotion((n) => n.fetchProfile(), null);
  return profile ?? (profileFixture as Profile);
});

export async function getProfile(): Promise<Profile> {
  return getProfileCached();
}

// SKILL_TIERS' own declaration order (models.ts: top -> daily -> working ->
// basic -> learning) IS the render order -- this just turns that array into
// an O(1) lookup for the comparator below, rather than re-declaring the
// same five-tier order a second time in this file where it could drift out
// of sync with notion-mappers.ts's validation of the same array.
export const TIER_ORDER: Record<SkillTier, number> = Object.fromEntries(
  SKILL_TIERS.map((tier, i) => [tier, i]),
) as Record<SkillTier, number>;

// Not wrapped in cache(): unlike getFeaturedProjects (which calls
// getProjectsCached twice per home render, once directly and once filtered)
// nothing in this codebase yet calls getSkills more than once per render --
// same shape as getCareer just above, which has never needed the dedupe
// either.
export async function getSkills(): Promise<Skill[]> {
  const all = await fromNotion((n) => n.fetchSkills(), skillsFixture as Skill[]);
  return [...all].sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.order - b.order);
}
