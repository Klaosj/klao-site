import { Client } from '@notionhq/client';
import type { CareerEntry, Post, PostMeta, Profile, Project, ProjectStory, Skill } from './models';
import {
  mapBlocks,
  mapCareerEntry,
  mapPostMeta,
  mapProfile,
  mapProject,
  mapSkill,
  splitBilingual,
  type NotionPage,
} from './notion-mappers';

// Constructed lazily (not at module load) so the auth token is always read at
// request time, and memoized so a single warm invocation doesn't pay `new
// Client()` once per pagination iteration / per image resolve.
let cachedClient: Client | undefined;
const client = (): Client => (cachedClient ??= new Client({ auth: process.env.NOTION_TOKEN }));

const dbId = (name: 'PROJECTS' | 'POSTS' | 'CAREER' | 'PROFILE' | 'SKILLS'): string => {
  const id = process.env[`NOTION_DB_${name}`];
  if (!id) throw new Error(`Missing env NOTION_DB_${name}`);
  return id;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
async function queryAll(databaseId: string, publishedOnly: boolean, extraFilter?: any): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  // Loop-invariant: compute once, not once per page.
  const base = publishedOnly ? { property: 'Published', checkbox: { equals: true } } : undefined;
  const filter = base && extraFilter ? { and: [base, extraFilter] } : (extraFilter ?? base);
  let cursor: string | undefined;
  do {
    const res: any = await client().databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      ...(filter ? { filter } : {}),
    });
    pages.push(...(res.results as NotionPage[]));
    const nextCursor: string | undefined = res.next_cursor ?? undefined;
    // Notion guarantees next_cursor: null once has_more is false, so this
    // shouldn't trigger in practice. It's cheap insurance against a hung
    // render (a site-down failure mode) if that contract is ever violated.
    if (nextCursor && nextCursor === cursor) {
      console.warn('[notion] pagination cursor did not advance; stopping', databaseId);
      break;
    }
    cursor = nextCursor;
  } while (cursor);
  return pages;
}

async function listBlocks(pageId: string): Promise<unknown[]> {
  const blocks: unknown[] = [];
  let cursor: string | undefined;
  do {
    const res: any = await client().blocks.children.list({ block_id: pageId, start_cursor: cursor });
    blocks.push(...res.results);
    const nextCursor: string | undefined = res.next_cursor ?? undefined;
    if (nextCursor && nextCursor === cursor) {
      console.warn('[notion] block pagination cursor did not advance; stopping', pageId);
      break;
    }
    cursor = nextCursor;
  } while (cursor);
  return blocks;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const nonNull = <T>(x: T | null): x is T => x !== null;

export async function fetchProjects(): Promise<Project[]> {
  return (await queryAll(dbId('PROJECTS'), true)).map(mapProject).filter(nonNull);
}

export async function fetchPostMetas(): Promise<PostMeta[]> {
  return (await queryAll(dbId('POSTS'), true)).map(mapPostMeta).filter(nonNull);
}

export async function fetchPostBySlug(slug: string): Promise<Post | null> {
  const pages = await queryAll(dbId('POSTS'), true, {
    property: 'Slug',
    rich_text: { equals: slug },
  });
  const meta = pages.map(mapPostMeta).filter(nonNull)[0];
  if (!meta) return null;
  const body = splitBilingual(mapBlocks(await listBlocks(meta.id)));
  return { ...meta, body };
}

export async function fetchProjectStory(slug: string): Promise<ProjectStory | null> {
  const pages = await queryAll(dbId('PROJECTS'), true, {
    property: 'Slug',
    rich_text: { equals: slug },
  });
  const meta = pages.map(mapProject).filter(nonNull)[0];
  if (!meta) return null;
  const body = splitBilingual(mapBlocks(await listBlocks(meta.id)));
  return { ...meta, body };
}

export async function fetchCareer(): Promise<CareerEntry[]> {
  return (await queryAll(dbId('CAREER'), true)).map(mapCareerEntry).filter(nonNull);
}

export async function fetchProfile(): Promise<Profile | null> {
  const rows = await queryAll(dbId('PROFILE'), false); // Profile DB has no Published property
  return rows.map(mapProfile).filter(nonNull)[0] ?? null;
}

export async function fetchSkills(): Promise<Skill[]> {
  return (await queryAll(dbId('SKILLS'), true)).map(mapSkill).filter(nonNull);
}

// Notion page/block ids are UUIDs: 32 hex chars, with or without dashes.
// Rejecting anything else before it reaches Notion means a flood of bogus
// /api/img/... requests costs zero API quota instead of one call each —
// Notion's per-integration rate limit (~3 req/s) is shared with real ISR
// revalidation traffic site-wide, so an unbounded id is an availability risk.
const validId = (id: string): boolean => /^[0-9a-f]{32}$|^[0-9a-f-]{36}$/i.test(id);

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function resolveImageUrl(ref: string[]): Promise<string | null> {
  try {
    if (ref[0] === 'block' && ref[1] && validId(ref[1])) {
      const b: any = await client().blocks.retrieve({ block_id: ref[1] });
      return b?.image?.file?.url ?? b?.image?.external?.url ?? null;
    }
    if (ref[0] === 'page' && ref[1] && ref[2] && validId(ref[1])) {
      const p: any = await client().pages.retrieve({ page_id: ref[1] });
      // Next.js already percent-decodes dynamic route segments before they
      // reach params, so decoding again here would double-decode and throw
      // URIError for any prop name containing a literal '%' — which the
      // catch below would swallow into a silent 404 / broken image.
      const f = p?.properties?.[ref[2]]?.files?.[0];
      return f?.file?.url ?? f?.external?.url ?? null;
    }
    return null;
  } catch (e) {
    console.warn('[notion] image resolve failed', ref, e);
    return null;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
