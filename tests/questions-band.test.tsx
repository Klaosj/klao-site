// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import QuestionsBand from '@/components/sections/QuestionsBand';
import { dict } from '@/lib/dictionary';
import type { OpenQuestion } from '@/lib/models';

afterEach(cleanup);

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

const q = (id: string, date: string, status: OpenQuestion['status'] = 'wondering'): OpenQuestion => ({
  id,
  question: { en: `EN ${id}?`, th: `TH ${id}?` },
  status,
  linkSlug: null,
  date,
});

// getQuestions() hands the band a date-desc list; these are pre-sorted the
// same way to honor that contract.
const four = [q('a', '2026-08-10', 'building'), q('b', '2026-08-08'), q('c', '2026-08-05'), q('d', '2026-08-01')];

describe('QuestionsBand', () => {
  it('renders the newest 3 open questions only', () => {
    const { container } = render(<QuestionsBand questions={four} locale="en" />);
    const items = Array.from(container.querySelectorAll('li')).map((li) => li.textContent);
    expect(items).toHaveLength(3);
    expect(items[0]).toContain('EN a?');
    expect(items[2]).toContain('EN c?');
  });

  it('never renders an answered question', () => {
    const withAnswered = [q('done', '2026-08-12', 'answered'), ...four];
    const { container } = render(<QuestionsBand questions={withAnswered} locale="en" />);
    expect(container.textContent).not.toContain('EN done?');
    expect(container.querySelectorAll('li')).toHaveLength(3);
  });

  it('marks building questions and only those', () => {
    const { container } = render(<QuestionsBand questions={four} locale="en" />);
    const items = Array.from(container.querySelectorAll('li'));
    expect(items[0].textContent).toContain(dict.en.statusBuilding);
    expect(items[1].textContent).not.toContain(dict.en.statusBuilding);
  });

  it('renders nothing at all when no open questions exist', () => {
    // ClientsBand rule: an empty band must not exist -- covers both "owner
    // has answered everything" and "NOTION_DB_QUESTIONS not configured yet"
    // (content.ts returns [] for that state).
    const answeredOnly = [q('done', '2026-08-12', 'answered')];
    expect(render(<QuestionsBand questions={[]} locale="en" />).container.firstChild).toBeNull();
    expect(render(<QuestionsBand questions={answeredOnly} locale="en" />).container.firstChild).toBeNull();
  });

  it('renders Thai text on /th', () => {
    const { container } = render(<QuestionsBand questions={four} locale="th" />);
    expect(container.textContent).toContain('TH a?');
    expect(container.textContent).toContain(dict.th.statusBuilding);
  });
});
