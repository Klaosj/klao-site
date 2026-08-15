// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CvBand from '@/components/sections/CvBand';
import { dict } from '@/lib/dictionary';
import type { CareerEntry } from '@/lib/models';

// No RTL auto-cleanup is wired up in this project -- see tests/bands.test.tsx
// for the same note. Without this, screen.getByText(...) can match leftover
// nodes from a previous test in this file.
afterEach(cleanup);

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

// Field names from src/lib/models.ts: `company` is a plain string and the
// date range is a single `period` string. `role` and `wins` are the
// localized fields -- `role` became Localized in the 2026-08-09 QA pass,
// because English job titles were rendering on the Thai pages. There is no
// start/end pair.
const entries: CareerEntry[] = [
  {
    id: 'c1',
    role: { en: 'BD Lead', th: 'หัวหน้าฝ่ายพัฒนาธุรกิจ' },
    company: 'Acme',
    period: '2024 — present',
    wins: { en: ['Opened two channels'], th: ['เปิดช่องทางใหม่สองช่อง'] },
    order: 1,
  },
  {
    id: 'c2',
    role: { en: 'BD Associate', th: 'เจ้าหน้าที่พัฒนาธุรกิจ' },
    company: 'Globex',
    period: '2022 — 2024',
    wins: { en: ['Shipped the first pilot', 'Closed three logos'], th: ['ส่งไพลอตแรกสำเร็จ', 'ปิดดีลสามราย'] },
    order: 2,
  },
];

// Same company on both entries, distinct from `entries` above -- exists
// only to exercise the unique-company dedup in the stat grid.
const sameCompanyEntries: CareerEntry[] = [
  entries[0],
  { ...entries[1], id: 'c3', company: 'Acme' },
];

describe('CvBand', () => {
  it('renders real career rows -- company, role and the period string', () => {
    render(<CvBand entries={entries} locale="en" />);
    expect(screen.getByText('Acme')).toBeTruthy();
    expect(screen.getByText('BD Lead')).toBeTruthy();
    expect(screen.getByText('2024 — present')).toBeTruthy();
    expect(screen.getByText('2022 — 2024')).toBeTruthy();
  });

  it('renders one row per entry, not a fixed number', () => {
    // Scoped to the timeline's direct <li> children -- each career row also
    // nests its own <ul><li> of wins, so an unscoped `li` count would
    // conflate "one row" with "one row plus one win".
    const { container } = render(<CvBand entries={[entries[0]]} locale="en" />);
    expect(container.querySelectorAll('.border-t.border-on-dark-faint > li')).toHaveLength(1);
  });

  it('renders the job title in the active locale, with no English left on the Thai page', () => {
    // Inverted on 2026-08-09: this test previously asserted the OPPOSITE --
    // that the title rendered identically in both locales, because `role`
    // was a plain string. That was the defect, not the contract: English job
    // titles were showing on /th. Now that role is Localized, the old
    // assertion would have locked the bug in.
    const { container: en } = render(<CvBand entries={[entries[0]]} locale="en" />);
    expect(en.textContent).toContain('BD Lead');
    expect(en.textContent).not.toContain('หัวหน้าฝ่ายพัฒนาธุรกิจ');
    cleanup();
    const { container: th } = render(<CvBand entries={[entries[0]]} locale="th" />);
    expect(th.textContent).toContain('หัวหน้าฝ่ายพัฒนาธุรกิจ');
    expect(th.textContent).not.toContain('BD Lead');
  });

  it('renders the wins for the active locale only', () => {
    render(<CvBand entries={entries} locale="th" />);
    expect(screen.getByText('เปิดช่องทางใหม่สองช่อง')).toBeTruthy();
    expect(screen.getByText('ส่งไพลอตแรกสำเร็จ')).toBeTruthy();
    expect(screen.getByText('ปิดดีลสามราย')).toBeTruthy();
    expect(screen.queryByText('Opened two channels')).toBeNull();
    expect(screen.queryByText('Shipped the first pilot')).toBeNull();
    expect(screen.queryByText('Closed three logos')).toBeNull();
  });

  it('switches the wins back to English when locale is en, with no Thai left over', () => {
    render(<CvBand entries={entries} locale="en" />);
    expect(screen.getByText('Opened two channels')).toBeTruthy();
    expect(screen.queryByText('เปิดช่องทางใหม่สองช่อง')).toBeNull();
  });

  it('says the data is missing rather than inventing a company', () => {
    render(<CvBand entries={[]} locale="en" />);
    expect(screen.getByText(dict.en.careerUnpublished)).toBeTruthy();
    // No stat grid or timeline should render alongside the "unpublished"
    // message -- a 0/0/0 stat grid next to it would read as real content.
    expect(screen.queryAllByText(/\d+/)).toHaveLength(0);
  });

  it('localizes the empty-state message', () => {
    render(<CvBand entries={[]} locale="th" />);
    expect(screen.getByText(dict.th.careerUnpublished)).toBeTruthy();
    expect(screen.queryByText(dict.en.careerUnpublished)).toBeNull();
  });

  it('derives the stat grid from the real entries array, not fixed numbers', () => {
    const { container } = render(<CvBand entries={entries} locale="en" />);
    // 2 roles, 2 unique companies (Acme, Globex), 3 wins total in English
    // (1 + 2), 2 locales.
    const stats = Array.from(container.querySelectorAll('.grid-cols-2 > div')).map(
      (el) => el.firstElementChild?.textContent,
    );
    expect(stats).toEqual(['2', '2', '3', '2']);
  });

  it('recomputes the stat grid when a different entries array is passed in', () => {
    // Guards against the stat grid above being hardcoded rather than
    // actually derived from `entries` -- a single fixed entry should not
    // report 2 roles or 3 wins.
    const { container } = render(<CvBand entries={[entries[0]]} locale="en" />);
    const stats = Array.from(container.querySelectorAll('.grid-cols-2 > div')).map(
      (el) => el.firstElementChild?.textContent,
    );
    expect(stats).toEqual(['1', '1', '1', '2']);
  });

  it('renders the Thai eyebrow in the Thai font stack with normal tracking, never font-mono', () => {
    // Regression test, same class of bug as the other bands' own version of
    // this test: no monospace face carries Thai glyphs. Scoped to the
    // eyebrow specifically (not entry.period, a locale-invariant plain
    // string that never renders Thai text and is left on font-mono).
    const { container } = render(<CvBand entries={entries} locale="th" />);
    const eyebrow = container.querySelector('p') as HTMLElement;
    expect(eyebrow.className).not.toContain('font-mono');
    expect(eyebrow.className).not.toMatch(/tracking-\[/);
    expect(eyebrow.className).toContain('font-thai');
  });

  it('renders the section label one pixel larger in Thai than in Latin', () => {
    // QA finding 12: eyebrowFont() correctly drops caps-tracking + font-mono
    // for Thai, which also drops the only "this is a label" cue the Latin
    // version has -- and Thai marks (`ื่`-style clusters) sit outside the
    // x-height, so at the Latin 12px they collapse into a smudge. The bump
    // is the compensation, and it is the same class either way otherwise.
    const th = render(<CvBand entries={entries} locale="th" />).container.querySelector('p') as HTMLElement;
    expect(th.className).toContain('text-[13px]');
    cleanup();
    const en = render(<CvBand entries={entries} locale="en" />).container.querySelector('p') as HTMLElement;
    expect(en.className).toContain('text-[12px]');
  });

  it('renders the empty-state eyebrow in the Thai font stack too, never font-mono', () => {
    // The empty-state branch (entries.length === 0) renders its own,
    // separate copy of the eyebrow <p> -- covered independently since it's
    // a different code path from the main-branch eyebrow above.
    const { container } = render(<CvBand entries={[]} locale="th" />);
    const eyebrow = container.querySelector('p') as HTMLElement;
    expect(eyebrow.className).not.toContain('font-mono');
    expect(eyebrow.className).toContain('font-thai');
  });

  it('counts unique companies rather than one per entry when two entries share a company', () => {
    const { container } = render(<CvBand entries={sameCompanyEntries} locale="en" />);
    const stats = Array.from(container.querySelectorAll('.grid-cols-2 > div')).map(
      (el) => el.firstElementChild?.textContent,
    );
    // 2 roles, but only 1 unique company ("Acme" on both).
    expect(stats).toEqual(['2', '1', '3', '2']);
  });

  // --- Resume download ------------------------------------------------
  // The career route already surfaces profile.resumeUrl; the home page's CV
  // band did not, so the published PDF was reachable from only one of the
  // two places a visitor looks for it.

  it('links to the resume at the exact URL it is given', () => {
    const { container } = render(
      <CvBand entries={entries} locale="en" resumeUrl="/some-resume.pdf" />,
    );
    const link = container.querySelector('a[href="/some-resume.pdf"]') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    // Asserts the href is threaded from the prop rather than hardcoded: a
    // component that always emitted the real production filename would pass
    // a "renders a link" test but fail this one.
    expect(link.getAttribute('href')).toBe('/some-resume.pdf');
  });

  it('renders no resume link at all when there is no resume to link to', () => {
    const { container } = render(<CvBand entries={entries} locale="en" resumeUrl={null} />);
    expect(container.querySelector('a[href$=".pdf"]')).toBeNull();
    expect(screen.queryByText(new RegExp(dict.en.resume))).toBeNull();
  });

  it('defaults to no resume link when the prop is omitted entirely', () => {
    // Guards the default: an implementation defaulting to a truthy
    // placeholder path would render a link pointing at a 404.
    const { container } = render(<CvBand entries={entries} locale="en" />);
    expect(container.querySelector('a[href$=".pdf"]')).toBeNull();
  });

  it('labels the resume link in the active locale', () => {
    const { container } = render(<CvBand entries={entries} locale="th" resumeUrl="/r.pdf" />);
    const link = container.querySelector('a[href="/r.pdf"]') as HTMLAnchorElement;
    expect(link.textContent).toContain(dict.th.resume);
    expect(link.textContent).not.toContain(dict.en.resume);
  });

  it('offers the resume even when Notion has no career rows yet', () => {
    // The two are independent: an unpublished Notion Career DB says nothing
    // about whether a resume PDF exists to download.
    const { container } = render(<CvBand entries={[]} locale="en" resumeUrl="/r.pdf" />);
    expect(screen.getByText(dict.en.careerUnpublished)).toBeTruthy();
    expect(container.querySelector('a[href="/r.pdf"]')).toBeTruthy();
  });

  it('gives the resume capsule a real hover state, not just the pointer magnet', () => {
    // QA finding 6 (2026-08-15): this capsule shipped as the pill system's
    // undocumented fifth variant with NO hover -- its only feedback was
    // `.btn`'s magnetic pull, which PointerFx never attaches under reduced
    // motion or on touch, so the control's sole affordance was missing for
    // exactly the users least able to guess at it. jsdom can't evaluate
    // `:hover`, so asserting the utilities are present is the closest a unit
    // test gets; the point is that removing them again fails here.
    const { container } = render(<CvBand entries={entries} locale="en" resumeUrl="/r.pdf" />);
    const link = container.querySelector('a[href="/r.pdf"]') as HTMLAnchorElement;
    expect(link.className).toContain('hover:border-peri');
    expect(link.className).toContain('hover:text-peri');
    expect(link.className).toContain('transition-colors');
  });

  it('gives the resume capsule a boundary at the 3:1 floor and the house timing', () => {
    // Two separate QA fixes that live in the same className, so they're
    // pinned together: `border-on-dark-faint` (rgba(...,0.15) = 1.42:1 on
    // #17171a) is under WCAG 1.4.11's 3:1 for a control's own boundary, and
    // for an outline pill the border IS the control -- `border-on-dark-mid`
    // (0.34 alpha) clears it. And an explicit duration/easing keeps this off
    // Tailwind's default 150ms, which snapped while every hand-written
    // transition on the page eases on the 250-950ms house curve.
    const { container } = render(<CvBand entries={entries} locale="en" resumeUrl="/r.pdf" />);
    const link = container.querySelector('a[href="/r.pdf"]') as HTMLAnchorElement;
    expect(link.className).toContain('border-on-dark-mid');
    expect(link.className).not.toContain('border-on-dark-faint');
    expect(link.className).toContain('duration-300');
    expect(link.className).toContain('ease-[cubic-bezier(0.16,1,0.3,1)]');
  });

  it('never applies font-mono or wide tracking to the resume label, in either locale', () => {
    // Honest framing, after review: this label's className is a single
    // literal with no locale branch, so it is a forward regression guard
    // against someone adding font-mono/tracking here later -- NOT a test
    // that locale selection works. It renders localized text (เรซูเม่), and
    // no monospace face carries Thai glyphs, which is why the guard exists.
    // Both locales are checked precisely because the className is shared.
    for (const locale of ['en', 'th'] as const) {
      const { container } = render(
        <CvBand entries={entries} locale={locale} resumeUrl="/r.pdf" />,
      );
      const link = container.querySelector('a[href="/r.pdf"]') as HTMLAnchorElement;
      expect(link.className).not.toContain('font-mono');
      expect(link.className).not.toMatch(/tracking-\[/);
      cleanup();
    }
  });
});
