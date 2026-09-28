import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Isolated in its own file so this module mock never leaks into the
// fixture-mode assertions in tests/content.test.ts (same isolation note as
// tests/content-questions.test.ts).
const fetchSkills = vi.fn();
vi.mock('@/lib/notion', () => ({ fetchSkills: () => fetchSkills() }));

describe('getSkills (Notion mode)', () => {
  beforeEach(() => {
    vi.stubEnv('NOTION_TOKEN', 'x');
    vi.stubEnv('NEXT_PHASE', '');
    fetchSkills.mockReset();
    // What notion.ts's dbId() does when NOTION_DB_SKILLS is missing.
    fetchSkills.mockRejectedValue(new Error('Missing env NOTION_DB_SKILLS'));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('serves the bundled toolbox, without touching Notion, when NOTION_DB_SKILLS is unset', async () => {
    // Production ran with NOTION_TOKEN but no NOTION_DB_SKILLS. Rethrowing
    // here would fail every ISR revalidate of the home page (the toolbox is
    // on it), so Notion edits would never reach the live site.
    vi.stubEnv('NOTION_DB_SKILLS', '');
    const { getSkills } = await import('@/lib/content');
    const skills = await getSkills();
    expect(skills.length).toBeGreaterThan(0);
    expect(fetchSkills).not.toHaveBeenCalled();
  });

  it('reads Notion when NOTION_DB_SKILLS is set', async () => {
    vi.stubEnv('NOTION_DB_SKILLS', 'db-skills');
    fetchSkills.mockResolvedValue([
      { id: 's1', name: 'Notion API', tier: 'daily', category: 'build', order: 2 },
      { id: 's2', name: 'Claude', tier: 'top', category: 'build', order: 1 },
    ]);
    const { getSkills } = await import('@/lib/content');
    const skills = await getSkills();
    expect(fetchSkills).toHaveBeenCalledTimes(1);
    expect(skills.map((s) => s.id)).toEqual(['s2', 's1']);
  });
});
