// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CareerBand from '@/components/sections/CareerBand';
import careerFixture from '@/content/fixtures/career.json';
import skillsFixture from '@/content/fixtures/skills.json';
import { dict } from '@/lib/dictionary';
import type { CareerEntry, Skill } from '@/lib/models';

afterEach(cleanup);

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

const entries = careerFixture as CareerEntry[];
const skills = skillsFixture as Skill[];
const norm = (s: string | null | undefined): string =>
  (s ?? '').replace(/ /g, ' ').replace(/​/g, '').trim();

describe('CareerBand', () => {
  it('ships the headline, résumé line, the current role panel and the toolbox in server HTML (no JS)', () => {
    // Master Review Focus #4: everything is in the markup; nothing is hidden inline.
    const html = renderToStaticMarkup(
      <CareerBand entries={entries} skills={skills} locale="en" resumeUrl="/r.pdf" now="2026-09" />,
    );
    expect(html).toContain('id="career"');
    expect(html).toContain('aria-labelledby="career-h"');
    expect(html).toContain(dict.en.cvHeading);
    expect(html).toContain('href="/r.pdf"');
    expect(html).toContain(dict.en.resumeMeta);
    expect(html).toContain('Senior Business Development');
    expect(html).toContain('Found 3–4 new channel opportunities');
    expect(html).toContain('Mar 2026 – Present · 7 mo');
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html).toContain('id="toolbox"');
    expect(html).not.toMatch(/opacity:\s*0/);
  });

  it('lays the toolbox out as stack · methods · languages in one row', () => {
    const { container } = render(
      <CareerBand entries={entries} skills={skills} locale="en" resumeUrl="/r.pdf" now="2026-09" />,
    );
    const toolbox = container.querySelector('#toolbox') as HTMLElement;
    expect(norm(toolbox.querySelector('h3')?.textContent)).toBe(dict.en.toolboxHeading);
    const cells = [...toolbox.querySelectorAll('.car-tcell')];
    expect(cells.map((c) => c.querySelector('h4')?.textContent)).toEqual(['Works in', 'Focus', 'Languages']);
    expect(norm(cells[0].querySelector('p')?.textContent)).toBe(
      'Salesforce · Excel & Sheets modeling · Power BI · Python · SQL · Next.js · Supabase · Notion API · Vercel · Swift',
    );
    expect(norm(cells[1].querySelector('p')?.textContent)).toBe(
      'AI-assisted building (Claude) · Sales forecasting · Retail media & shopper media · PMO / project delivery',
    );
    expect(norm(cells[2].querySelector('p')?.textContent)).toBe('Thai · English (conversational)');
  });

  it('renders Thai headings, labels and the résumé link for locale th', () => {
    const { container } = render(
      <CareerBand entries={entries} skills={skills} locale="th" resumeUrl="/r.pdf" now="2026-09" />,
    );
    expect(norm(container.querySelector('#career-h')?.textContent)).toBe(dict.th.cvHeading);
    expect(container.querySelector('.car-res a')?.textContent).toBe(dict.th.resumeLink);
    expect([...container.querySelectorAll('#toolbox h4')].map((h) => h.textContent)).toEqual(['ใช้ทำงาน', 'ถนัด', 'ภาษา']);
  });

  it('omits the résumé block when there is no résumé URL', () => {
    const { container } = render(
      <CareerBand entries={entries} skills={skills} locale="en" resumeUrl={null} now="2026-09" />,
    );
    expect(container.querySelector('.car-res')).toBeNull();
  });

  it('keeps the headline and toolbox when Notion has no career rows yet', () => {
    const { container } = render(<CareerBand entries={[]} skills={skills} locale="en" resumeUrl="/r.pdf" now="2026-09" />);
    expect(container.querySelector('#career-h')).not.toBeNull();
    expect(container.querySelector('[role="tablist"]')).toBeNull();
    expect(container.querySelector('#toolbox')).not.toBeNull();
  });

  it('animates only transform and opacity (global constraint)', () => {
    const css = readFileSync(join(process.cwd(), 'src/components/career.css'), 'utf8');
    const transitions = [...css.matchAll(/transition:\s*([^;]+);/g)].map((m) => m[1]);
    expect(transitions.length).toBeGreaterThan(0);
    for (const value of transitions) {
      for (const part of value.split(',')) expect(['transform', 'opacity', 'none']).toContain(part.trim().split(/\s+/)[0]);
    }
  });
});
