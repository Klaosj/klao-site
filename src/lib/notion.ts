import { Client } from '@notionhq/client';
import type { CareerEntry, Post, PostMeta, Profile, Project } from './models';
import {
  mapBlocks,
  mapCareerEntry,
  mapPostMeta,
  mapProfile,
  mapProject,
  splitBilingual,
  type NotionPage,
} from './notion-mappers';

const client = () => new Client({ auth: process.env.NOTION_TOKEN });

const dbId = (name: 'PROJECTS' | 'POSTS' | 'CAREER' | 'PROFILE'): string => {
  const id = process.env[`NOTION_DB_${name}`];
  if (!id) throw new Error(`Missing env NOTION_DB_${name}`);
  return id;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
async function queryAll(databaseId: string, publishedOnly: boolean, extraFilter?: any): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;
  do {
    const base = publishedOnly ? { property: 'Published', checkbox: { equals: true } } : undefined;
    const filter = base && extraFilter ? { and: [base, extraFilter] } : (extraFilter ?? base);
    const res: any = await client().databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      ...(filter ? { filter } : {}),
    });
    pages.push(...(res.results as NotionPage[]));
    cursor = res.next_cursor ?? undefined;
  } while (cursor);
  return pages;
}

async function listBlocks(pageId: string): Promise<unknown[]> {
  const blocks: unknown[] = [];
  let cursor: string | undefined;
  do {
    const res: any = await client().blocks.children.list({ block_id: pageId, start_cursor: cursor });
    blocks.push(...res.results);
    cursor = res.next_cursor ?? undefined;
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

export async function fetchCareer(): Promise<CareerEntry[]> {
  return (await queryAll(dbId('CAREER'), true)).map(mapCareerEntry).filter(nonNull);
}

export async function fetchProfile(): Promise<Profile | null> {
  const rows = await queryAll(dbId('PROFILE'), false); // Profile DB has no Published property
  return rows.map(mapProfile).filter(nonNull)[0] ?? null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function resolveImageUrl(ref: string[]): Promise<string | null> {
  try {
    if (ref[0] === 'block' && ref[1]) {
      const b: any = await client().blocks.retrieve({ block_id: ref[1] });
      return b?.image?.file?.url ?? b?.image?.external?.url ?? null;
    }
    if (ref[0] === 'page' && ref[1] && ref[2]) {
      const p: any = await client().pages.retrieve({ page_id: ref[1] });
      const f = p?.properties?.[decodeURIComponent(ref[2])]?.files?.[0];
      return f?.file?.url ?? f?.external?.url ?? null;
    }
    return null;
  } catch (e) {
    console.warn('[notion] image resolve failed', ref, e);
    return null;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
