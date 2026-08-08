import type { CareerEntry, Post, PostMeta, Profile, Project } from './models';
import projectsFixture from '@/content/fixtures/projects.json';
import postsFixture from '@/content/fixtures/posts.json';
import careerFixture from '@/content/fixtures/career.json';
import profileFixture from '@/content/fixtures/profile.json';

function isNotionConfigured(): boolean {
  return Boolean(process.env.NOTION_TOKEN);
}

// Spec §5 error handling: if Notion is configured but unreachable and there is
// no cached build to serve, fall back to fixtures instead of crashing.
async function fromNotion<T>(
  fetcher: (notion: typeof import('./notion')) => Promise<T>,
  fallback: T,
): Promise<T> {
  if (!isNotionConfigured()) return fallback;
  try {
    return await fetcher(await import('./notion'));
  } catch (e) {
    console.warn('[content] Notion fetch failed, serving fixture fallback', e);
    return fallback;
  }
}

export async function getProjects(): Promise<Project[]> {
  const all = await fromNotion((n) => n.fetchProjects(), projectsFixture as Project[]);
  return [...all].sort((a, b) => a.order - b.order);
}

export async function getFeaturedProjects(): Promise<Project[]> {
  return (await getProjects()).filter((p) => p.featured).slice(0, 3);
}

export async function getPosts(): Promise<PostMeta[]> {
  const fixtureMetas = (postsFixture as Post[]).map(({ body: _body, ...meta }) => meta);
  const all = await fromNotion((n) => n.fetchPostMetas(), fixtureMetas);
  return [...all].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPost(slug: string): Promise<Post | null> {
  const fixture = (postsFixture as Post[]).find((p) => p.slug === slug) ?? null;
  return fromNotion((n) => n.fetchPostBySlug(slug), fixture);
}

export async function getCareer(): Promise<CareerEntry[]> {
  const all = await fromNotion((n) => n.fetchCareer(), careerFixture as CareerEntry[]);
  return [...all].sort((a, b) => a.order - b.order);
}

export async function getProfile(): Promise<Profile> {
  const profile = await fromNotion((n) => n.fetchProfile(), null);
  return profile ?? (profileFixture as Profile);
}
