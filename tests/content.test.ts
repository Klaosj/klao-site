import { describe, it, expect } from 'vitest';
import { getProjects, getFeaturedProjects, getPosts, getPost, getCareer, getProfile } from '@/lib/content';
import { formatDate } from '@/lib/format';

describe('content API (fixture mode)', () => {
  it('returns projects sorted by order', async () => {
    const projects = await getProjects();
    expect(projects.length).toBeGreaterThanOrEqual(3);
    expect(projects.map((p) => p.order)).toEqual([...projects.map((p) => p.order)].sort((a, b) => a - b));
  });

  it('returns every featured project, uncapped', async () => {
    const projects = await getProjects();
    const featured = await getFeaturedProjects();
    expect(featured.length).toBeGreaterThan(0);
    expect(featured.length).toBe(projects.filter((p) => p.featured).length);
    expect(featured.every((p) => p.featured)).toBe(true);
    // Regression guard for the TickerDesk bug: with all 4 fixtures featured,
    // a 4th-and-beyond project must not be silently dropped by a cap.
    expect(featured.map((p) => p.name)).toContain('TickerDesk');
  });

  it('returns posts newest first', async () => {
    const posts = await getPosts();
    // posts.json fixture is currently `[]` (placeholder bodies were pulled --
    // see .superpowers/qa/fix-content-data.md) until real posts land in
    // Notion, so this only asserts the ordering invariant, not a minimum
    // count.
    const dates = posts.map((p) => p.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('finds a post by slug with a bilingual body, when any post exists', async () => {
    const posts = await getPosts();
    // See note above: the fixture currently ships zero posts, so this is a
    // no-op until real posts land. Kept (rather than deleted) so it
    // re-activates automatically the moment posts.json is non-empty again.
    if (posts.length === 0) return;
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
