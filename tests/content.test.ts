import { describe, it, expect } from 'vitest';
import { getProjects, getFeaturedProjects, getPosts, getPost, getCareer, getProfile } from '@/lib/content';
import { formatDate } from '@/lib/format';

describe('content API (fixture mode)', () => {
  it('returns projects sorted by order', async () => {
    const projects = await getProjects();
    expect(projects.length).toBeGreaterThanOrEqual(3);
    expect(projects.map((p) => p.order)).toEqual([...projects.map((p) => p.order)].sort((a, b) => a - b));
  });

  it('returns at most 3 featured projects', async () => {
    const featured = await getFeaturedProjects();
    expect(featured.length).toBeGreaterThan(0);
    expect(featured.length).toBeLessThanOrEqual(3);
    expect(featured.every((p) => p.featured)).toBe(true);
  });

  it('returns posts newest first', async () => {
    const posts = await getPosts();
    expect(posts.length).toBeGreaterThanOrEqual(2);
    const dates = posts.map((p) => p.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('finds a post by slug with a bilingual body', async () => {
    const posts = await getPosts();
    const post = await getPost(posts[0].slug);
    expect(post).not.toBeNull();
    expect(post!.body.en.length).toBeGreaterThan(0);
    expect(post!.body.th.length).toBeGreaterThan(0);
  });

  it('returns null for an unknown slug', async () => {
    expect(await getPost('no-such-post')).toBeNull();
  });

  it('returns career entries sorted by order and a profile', async () => {
    const career = await getCareer();
    expect(career.length).toBeGreaterThanOrEqual(2);
    expect(career.map((c) => c.order)).toEqual([...career.map((c) => c.order)].sort((a, b) => a - b));
    const profile = await getProfile();
    expect(profile.name).toContain('Klao');
    expect(profile.headline.th.length).toBeGreaterThan(0);
  });
});

describe('formatDate', () => {
  it('formats per locale', () => {
    const en = formatDate('2026-07-14', 'en');
    const th = formatDate('2026-07-14', 'th');
    expect(en).toContain('2026');
    expect(th).not.toBe(en);
  });
});
