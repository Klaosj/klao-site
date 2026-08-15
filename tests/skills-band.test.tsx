// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SkillsBand from '@/components/sections/SkillsBand';
import { dict } from '@/lib/dictionary';
import type { Skill } from '@/lib/models';

// No RTL auto-cleanup is wired up in this project -- see
// tests/clients-band.test.tsx for the same note. Without this,
// screen.getByText(...) can match leftover nodes from a previous test.
afterEach(cleanup);

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

// Redesigned contract (owner decision, 2026-08-12): the band renders only
// `top` + the curated "Core tools" row + `learning`. `daily`/`working`/
// `basic` skills below exist in this fixture purely to prove they DON'T
// render -- not a copy of the real fixture (src/content/fixtures/skills.json),
// same "same contract, different values" reasoning tests/clients-band.test.tsx
// documents for its own fixture-shaped constant.
//
// Deliberate shape choices:
// - 'AI-assisted building (Claude)' is a real SKILL_ICONS key (top tier) --
//   proves the icon-registry hit path. 'Test Uncommon Top Skill' is not in
//   the registry -- proves the `◆` fallback path.
// - Salesforce/Supabase/Python are on TOOLS_ALLOWLIST but sit at `daily`/
//   `working` tier in this fixture (matching the real Notion data) and are
//   listed here OUT of allowlist order (Salesforce, Supabase, Python) --
//   proves the tools row re-sorts to allowlist order, not prop/tier order.
// - 'SQL' (allowlisted) is deliberately absent from this fixture entirely --
//   proves an allowlisted-but-unpublished tool is silently skipped, not
//   rendered as a broken/empty badge.
// - 'Test Daily Skill' / 'Test Working Skill' / 'Test Basic Skill' are each
//   NOT on TOOLS_ALLOWLIST -- proves their tiers render nothing at all.
const skills: Skill[] = [
  { id: 's-top-1', name: 'AI-assisted building (Claude)', tier: 'top', category: 'tech', order: 1 },
  { id: 's-top-2', name: 'Test Uncommon Top Skill', tier: 'top', category: 'tech', order: 2 },
  { id: 's-daily-1', name: 'Test Daily Skill', tier: 'daily', category: 'biz', order: 1 },
  { id: 's-daily-salesforce', name: 'Salesforce', tier: 'daily', category: 'biz', order: 2 },
  { id: 's-daily-supabase', name: 'Supabase', tier: 'daily', category: 'tech', order: 3 },
  { id: 's-working-1', name: 'Test Working Skill', tier: 'working', category: 'data', order: 1 },
  { id: 's-working-python', name: 'Python', tier: 'working', category: 'data', order: 2 },
  { id: 's-basic-1', name: 'Test Basic Skill', tier: 'basic', category: 'fin', order: 1 },
  { id: 's-learning-1', name: 'Test Learning Skill', tier: 'learning', category: 'data', order: 1 },
  { id: 's-learning-2', name: 'Test Learning Skill Two', tier: 'learning', category: 'data', order: 2 },
];

describe('SkillsBand', () => {
  it('renders nothing at all for an empty skills array', () => {
    // A Notion Skills database that isn't populated yet (or every row
    // dropped by mapSkill) maps to `[]`. Same reasoning as ClientsBand: a
    // heading with nothing under it would look like a broken section, not
    // an honestly-absent one -- the whole band must not exist.
    const { container } = render(<SkillsBand skills={[]} locale="en" />);
    expect(container.firstChild).toBeNull();
    expect(container.querySelector('h2')).toBeNull();
    expect(container.querySelector('li')).toBeNull();
  });

  it('renders every top-tier skill as a large statement-list item, icon-registry hit or ◆ fallback', () => {
    const { container } = render(<SkillsBand skills={skills} locale="en" />);
    const items = Array.from(container.querySelectorAll('li'));

    const knownItem = items.find((li) => li.textContent?.includes('AI-assisted building (Claude)'));
    expect(knownItem).toBeTruthy();
    expect(knownItem?.className).toContain('text-[clamp(20px,3.4vw,40px)]');
    // A SKILL_ICONS hit renders a real <svg aria-hidden="...">, not the ◆
    // text fallback.
    expect(knownItem?.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
    expect(knownItem?.textContent).not.toContain('◆');

    const unknownItem = items.find((li) => li.textContent?.includes('Test Uncommon Top Skill'));
    expect(unknownItem).toBeTruthy();
    // A registry MISS keeps the original ◆ marker, no <svg> at all.
    expect(unknownItem?.querySelector('svg')).toBeNull();
    expect(unknownItem?.textContent).toContain('◆');
  });

  it('renders the Core tools row in allowlist order, skipping an unpublished allowlisted tool', () => {
    const { container } = render(<SkillsBand skills={skills} locale="en" />);
    expect(screen.getByText(dict.en.toolsLabel)).toBeTruthy();

    const items = Array.from(container.querySelectorAll('li'));
    const toolNames = ['Salesforce', 'Excel & Sheets modeling', 'Power BI', 'Python', 'SQL', 'Supabase', 'Notion API', 'Vercel', 'Swift'];
    const toolItems = items.filter((li) => toolNames.some((name) => li.textContent?.includes(name)));

    // Fixture only publishes Salesforce, Supabase and Python -- in that
    // prop order -- yet TOOLS_ALLOWLIST orders them Salesforce, Python,
    // Supabase. The rendered order must follow the allowlist, not the
    // fixture's tier-grouped prop order.
    expect(toolItems.map((li) => li.textContent)).toEqual([
      expect.stringContaining('Salesforce'),
      expect.stringContaining('Python'),
      expect.stringContaining('Supabase'),
    ]);

    // 'SQL' is on the allowlist but absent from this fixture's skills --
    // it must not appear anywhere, not even as an empty/broken badge.
    expect(screen.queryByText('SQL')).toBeNull();

    // Every rendered tool badge carries an icon.
    for (const li of toolItems) {
      expect(li.querySelector('svg')).toBeTruthy();
    }
  });

  it('never renders the retired daily/working/basic tier labels or their non-allowlisted skill names', () => {
    render(<SkillsBand skills={skills} locale="en" />);
    expect(screen.queryByText(dict.en.tierDaily)).toBeNull();
    expect(screen.queryByText(dict.en.tierWorking)).toBeNull();
    expect(screen.queryByText(dict.en.tierBasic)).toBeNull();
    // These three are each tier daily/working/basic AND not on
    // TOOLS_ALLOWLIST, so they must not surface via the tools row either.
    expect(screen.queryByText('Test Daily Skill')).toBeNull();
    expect(screen.queryByText('Test Working Skill')).toBeNull();
    expect(screen.queryByText('Test Basic Skill')).toBeNull();
  });

  it('renders the learning tier as one quiet joined-text line, not chips, with no pulse dot', () => {
    const { container } = render(<SkillsBand skills={skills} locale="en" />);
    // No <li> anywhere carries a learning-tier name -- learning is prose now.
    const items = Array.from(container.querySelectorAll('li'));
    expect(items.some((li) => li.textContent?.includes('Test Learning Skill'))).toBe(false);

    const learningP = Array.from(container.querySelectorAll('p')).find((p) => p.textContent?.includes('Test Learning Skill'));
    expect(learningP).toBeTruthy();
    expect(learningP?.textContent).toBe(`${dict.en.tierLearning}: Test Learning Skill · Test Learning Skill Two`);
    expect(learningP?.querySelector('svg[aria-hidden="true"]')).toBeTruthy();

    // The old pulse-dot marker (skills-band.css) is retired along with the
    // chip rendering it used to sit inside.
    expect(container.querySelector('.skill-pulse')).toBeNull();
  });

  it('switches the eyebrow, heading, tools label and learning label to Thai when locale is th', () => {
    const { container } = render(<SkillsBand skills={skills} locale="th" />);
    expect(screen.getByText(dict.th.toolbox)).toBeTruthy();
    expect(container.querySelector('h2')?.textContent).toBe(dict.th.toolboxHeading);
    expect(screen.getByText(dict.th.toolsLabel)).toBeTruthy();

    const learningP = Array.from(container.querySelectorAll('p')).find((p) => p.textContent?.startsWith(dict.th.tierLearning));
    expect(learningP).toBeTruthy();

    // No English label leaked through.
    expect(screen.queryByText(dict.en.toolbox)).toBeNull();
    expect(screen.queryByText(dict.en.toolboxHeading)).toBeNull();
    expect(screen.queryByText(dict.en.toolsLabel)).toBeNull();
  });

  it('puts the Core tools label on the shared sub-label size, bumped for Thai', () => {
    // QA finding 11 + 12: "Core tools" is the reference site for the site's
    // second, deliberately quieter label tier (no peri rule, on-dark-soft) --
    // ContactBand's channel labels and CopyEmail's "Copied" must match this
    // size, and Thai runs +1px because its marks sit outside the x-height.
    for (const [locale, size] of [['en', 'text-[10.5px]'], ['th', 'text-[11.5px]']] as const) {
      render(<SkillsBand skills={skills} locale={locale} />);
      expect(screen.getByText(dict[locale].toolsLabel).className).toContain(size);
      cleanup();
    }
  });

  it('renders a real <h2> whose text comes from the dictionary, not hardcoded copy', () => {
    const { container } = render(<SkillsBand skills={skills} locale="en" />);
    expect(container.querySelector('h2')?.textContent).toBe(dict.en.toolboxHeading);
  });
});
