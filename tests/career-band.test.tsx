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
import { stubMatchMedia } from './helpers/media';

afterEach(cleanup);

beforeEach(() => {
  stubMatchMedia();
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

const entries = careerFixture as CareerEntry[];
const skills = skillsFixture as Skill[];
const norm = (s: string | null | undefined): string =>
  (s ?? '').replace(/\u00A0/g, ' ').replace(/\u200B/g, '').trim();

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

  // Fix wave finding 5: a plain space before the dot lets a wrap start the
  // next line with "·". The space before each dot must be a no-break space
  // (U+00A0, the escape in source -- never a raw byte) so it stays glued to
  // the word before it; only the space after the dot may still break.
  it('joins toolbox items with a no-break space before the dot, not a plain one', () => {
    const { container } = render(
      <CareerBand entries={entries} skills={skills} locale="en" resumeUrl="/r.pdf" now="2026-09" />,
    );
    const stack = container.querySelector('#toolbox .car-tcell p') as HTMLElement;
    const items = [
      'Salesforce',
      'Excel & Sheets modeling',
      'Power BI',
      'Python',
      'SQL',
      'Next.js',
      'Supabase',
      'Notion API',
      'Vercel',
      'Swift',
    ];
    // String.fromCharCode(160) is U+00A0, spelled that way so this test
    // file never carries the invisible character as a raw byte, same as
    // the production code must spell it as the JS escape, not paste it in.
    expect(stack.textContent).toBe(items.join(`${String.fromCharCode(160)}· `));
  });

  it('renders Thai headings, labels and the résumé link for locale th', () => {
    const { container } = render(
      <CareerBand entries={entries} skills={skills} locale="th" resumeUrl="/r.pdf" now="2026-09" />,
    );
    expect(norm(container.querySelector('#career-h')?.textContent)).toBe(dict.th.cvHeading);
    expect(container.querySelector('.car-res a')?.textContent).toBe(dict.th.resumeLink);
    expect([...container.querySelectorAll('#toolbox h4')].map((h) => h.textContent)).toEqual(['ใช้ทำงาน', 'ถนัด', 'ภาษา']);
  });

  it('opens the résumé in a new tab without handing it the opener or a referrer (repo convention for target=_blank)', () => {
    const { container } = render(
      <CareerBand entries={entries} skills={skills} locale="en" resumeUrl="/r.pdf" now="2026-09" />,
    );
    const link = container.querySelector('.car-res a') as HTMLAnchorElement;
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
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

  // Carry-over from the wave-1 integration review: R25 ("every .t-h2 heading
  // passes `display`") was missed for this heading, so Chrome's Thai
  // word-breaking could split "เคยอยู่ที่ไหนมาบ้าง และได้อะไรกลับมา" mid-phrase
  // inside the 13em cap. Display mode keeps each space-delimited Thai token
  // whole in its own .kt span (src/lib/thai.ts's displayRuns) -- this pins
  // that both tokens survive intact, not just that the plain text matches.
  it('renders the Thai headline through ThaiText display mode, in whole-token .kt spans (R25 carry-over)', () => {
    const { container } = render(
      <CareerBand entries={entries} skills={skills} locale="th" resumeUrl="/r.pdf" now="2026-09" />,
    );
    const heading = container.querySelector('#career-h') as HTMLElement;
    const keepSpans = [...heading.querySelectorAll('span.kt')];
    expect(keepSpans.map((s) => s.textContent)).toEqual(['เคยอยู่ที่ไหนมาบ้าง', 'และได้อะไรกลับมา']);
  });

  it('animates only transform and opacity (global constraint)', () => {
    const css = readFileSync(join(process.cwd(), 'src/components/career.css'), 'utf8');
    const transitions = [...css.matchAll(/transition:\s*([^;]+);/g)].map((m) => m[1]);
    expect(transitions.length).toBeGreaterThan(0);
    for (const value of transitions) {
      for (const part of value.split(',')) expect(['transform', 'opacity', 'none']).toContain(part.trim().split(/\s+/)[0]);
    }
  });

  // Fix wave finding 4: the shared .t-stat class (globals.css) is 48/48 --
  // right for Signature's 30/500, too big for the Career panel figure,
  // which the prototype's own .lfig set at 40/44 desktop, 32/36 phone (R21).
  it('sizes the Career figure smaller than the shared .t-stat default (R21)', () => {
    const css = readFileSync(join(process.cwd(), 'src/components/career.css'), 'utf8');
    const outsidePhone = css.slice(0, css.indexOf('@media (max-width: 734px)'));
    expect(outsidePhone).toMatch(/\.car-fig\.t-stat\s*\{[^}]*font-size:\s*40px;\s*line-height:\s*44px/);
    const phone = css.slice(css.indexOf('@media (max-width: 734px)'));
    expect(phone).toMatch(/\.car-fig\.t-stat\s*\{[^}]*font-size:\s*32px;\s*line-height:\s*36px/);
  });

  // Re-review finding, Important A: the item-3 CSS gated the data-align
  // fixed positions behind html:not(.js), so once the pre-paint script set
  // `js` (before hydration even starts) the label fell back straight to
  // -50%, clipping the default-selected role's rail label in that frame.
  // All three rules -- base, [data-align=start], [data-align=end] -- must
  // read var(--lx) with their old fixed value as the *fallback*, un-gated,
  // so --lx wins once CareerDetent's effect sets it (any html.js state) and
  // the fixed positions still apply correctly before that (server HTML,
  // pre-hydration, and no-JS alike -- one fallback covers all three).
  it('lets --lx win over the fixed data-align fallback in every JS state (re-review Important A)', () => {
    const css = readFileSync(join(process.cwd(), 'src/components/career.css'), 'utf8');
    // Not gated behind html:not(.js) (or any other prefix) any more.
    expect(css).not.toMatch(/html:not\(\.js\)\s*\.car-rlab/);
    expect(css).toMatch(/^\s*\.car-rlab\s*\{[^}]*transform:\s*translateX\(var\(--lx,\s*-50%\)\)/m);
    expect(css).toMatch(
      /^\s*\.car-rlab\[data-align="start"\]\s*\{[^}]*transform:\s*translateX\(var\(--lx,\s*-8px\)\)/m,
    );
    expect(css).toMatch(
      /^\s*\.car-rlab\[data-align="end"\]\s*\{[^}]*transform:\s*translateX\(var\(--lx,\s*calc\(-100% \+ 8px\)\)\)/m,
    );
  });
});
