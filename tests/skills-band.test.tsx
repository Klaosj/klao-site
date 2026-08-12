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

// One skill per tier (plus a second `basic` row, to exercise the ' · ' join)
// -- not a copy of the real fixture (src/content/fixtures/skills.json), same
// "same contract, different values" reasoning tests/clients-band.test.tsx
// documents for its own fixture-shaped constant. Already in the tier order
// getSkills() (src/lib/content.ts) guarantees, since SkillsBand itself
// trusts that ordering rather than re-sorting.
const skills: Skill[] = [
  { id: 's-top-1', name: 'Test Top Skill', tier: 'top', category: 'tech', order: 1 },
  { id: 's-daily-1', name: 'Test Daily Skill', tier: 'daily', category: 'biz', order: 1 },
  { id: 's-working-1', name: 'Test Working Skill', tier: 'working', category: 'data', order: 1 },
  { id: 's-basic-1', name: 'Test Basic Skill', tier: 'basic', category: 'fin', order: 1 },
  { id: 's-basic-2', name: 'Test Basic Skill Two', tier: 'basic', category: 'fin', order: 2 },
  { id: 's-learning-1', name: 'Test Learning Skill', tier: 'learning', category: 'data', order: 1 },
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

  it('renders every top-tier skill as a large statement-list item', () => {
    const { container } = render(<SkillsBand skills={skills} locale="en" />);
    const items = Array.from(container.querySelectorAll('li'));
    const topItem = items.find((li) => li.textContent?.includes('Test Top Skill'));
    expect(topItem).toBeTruthy();
    expect(topItem?.className).toContain('text-[clamp(20px,3.4vw,40px)]');
    // The peri marker is decoration, not part of the accessible name.
    expect(topItem?.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  it('renders daily-tier skills as pill chips under the tierDaily label', () => {
    const { container } = render(<SkillsBand skills={skills} locale="en" />);
    expect(screen.getByText(dict.en.tierDaily)).toBeTruthy();
    const items = Array.from(container.querySelectorAll('li'));
    const chip = items.find((li) => li.textContent?.includes('Test Daily Skill'));
    expect(chip).toBeTruthy();
    expect(chip?.className).toContain('rounded-full');
    expect(chip?.className).toContain('border');
  });

  it('renders working-tier skills as smaller, dimmer chips under the tierWorking label', () => {
    const { container } = render(<SkillsBand skills={skills} locale="en" />);
    expect(screen.getByText(dict.en.tierWorking)).toBeTruthy();
    const items = Array.from(container.querySelectorAll('li'));
    const chip = items.find((li) => li.textContent?.includes('Test Working Skill'));
    expect(chip).toBeTruthy();
    expect(chip?.className).toContain('rounded-full');
  });

  it('renders basic-tier skills as one quiet joined text run, not chips', () => {
    const { container } = render(<SkillsBand skills={skills} locale="en" />);
    // No <li> anywhere carries a basic-tier name -- basic is prose, not a list.
    const items = Array.from(container.querySelectorAll('li'));
    expect(items.some((li) => li.textContent?.includes('Test Basic Skill'))).toBe(false);
    // Located directly rather than via screen.getByText: the label prefix
    // (its own <span>) and the full paragraph both start with
    // dict.en.tierBasic, which makes a getByText(RegExp) query genuinely
    // ambiguous (two matching nodes) rather than a real assertion.
    const basicP = Array.from(container.querySelectorAll('p')).find((p) => p.textContent?.includes('Test Basic Skill'));
    expect(basicP).toBeTruthy();
    expect(basicP?.textContent).toBe(`${dict.en.tierBasic}: Test Basic Skill · Test Basic Skill Two`);
  });

  it('renders a pulsing marker on the currently-learning chip', () => {
    const { container } = render(<SkillsBand skills={skills} locale="en" />);
    expect(screen.getByText(dict.en.tierLearning)).toBeTruthy();
    const pulse = container.querySelector('.skill-pulse');
    expect(pulse).toBeTruthy();
    expect(pulse?.getAttribute('aria-hidden')).toBe('true');
    // The pulse marker sits inside the same chip as its skill name.
    expect(pulse?.closest('li')?.textContent).toContain('Test Learning Skill');
  });

  it('switches the eyebrow, heading, and every tier label to Thai when locale is th', () => {
    const { container } = render(<SkillsBand skills={skills} locale="th" />);
    expect(screen.getByText(dict.th.toolbox)).toBeTruthy();
    expect(container.querySelector('h2')?.textContent).toBe(dict.th.toolboxHeading);
    expect(screen.getByText(dict.th.tierDaily)).toBeTruthy();
    expect(screen.getByText(dict.th.tierWorking)).toBeTruthy();
    expect(screen.getByText(dict.th.tierLearning)).toBeTruthy();
    // Located directly rather than via getByText -- see the English test's
    // own comment on why a RegExp query against the tierBasic label is
    // ambiguous here (the label <span> and its parent <p> both match it).
    const basicP = Array.from(container.querySelectorAll('p')).find((p) => p.textContent?.startsWith(dict.th.tierBasic));
    expect(basicP).toBeTruthy();
    // No English label leaked through.
    expect(screen.queryByText(dict.en.toolbox)).toBeNull();
    expect(screen.queryByText(dict.en.toolboxHeading)).toBeNull();
  });

  it('renders a real <h2> whose text comes from the dictionary, not hardcoded copy', () => {
    const { container } = render(<SkillsBand skills={skills} locale="en" />);
    expect(container.querySelector('h2')?.textContent).toBe(dict.en.toolboxHeading);
  });
});
