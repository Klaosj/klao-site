// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import profileFixture from '@/content/fixtures/profile.json';
import CloseBand, { pickOpenQuestion } from '@/components/sections/CloseBand';
import { dict } from '@/lib/dictionary';
import type { OpenQuestion, Profile } from '@/lib/models';
import { stubMatchMedia } from './helpers/media';

afterEach(cleanup);

beforeEach(() => {
  stubMatchMedia();
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

// Built from the fixture so fields added by other phases are always present.
const profile: Profile = {
  ...(profileFixture as Profile),
  email: 'real@example.com',
  resumeUrl: '/resume.pdf',
  basedIn: { en: 'Bangkok, TH', th: 'กรุงเทพฯ' },
  workingIn: { en: 'TH / EN', th: 'ไทย / อังกฤษ' },
};

const q = (id: string, date: string, status: OpenQuestion['status']): OpenQuestion => ({
  id,
  question: { en: `EN ${id}?`, th: `TH ${id}?` },
  status,
  linkSlug: null,
  date,
});

describe('pickOpenQuestion', () => {
  // getQuestions() hands over a newest-first list; pickOpenQuestion trusts
  // that order rather than re-sorting (ledger ruling, overrides the
  // wondering-first reading of an earlier draft): the newest OPEN question
  // wins regardless of which of the two open statuses it carries.
  it('prefers the newest open question when it is wondering', () => {
    const list = [q('w', '2026-09-20', 'wondering'), q('b', '2026-09-10', 'building'), q('w0', '2026-08-01', 'wondering')];
    expect(pickOpenQuestion(list)?.id).toBe('w');
  });
  it('prefers the newest open question even when a wondering row is older -- status never overrides date order', () => {
    const list = [q('b', '2026-09-20', 'building'), q('w', '2026-09-10', 'wondering'), q('w0', '2026-08-01', 'wondering')];
    expect(pickOpenQuestion(list)?.id).toBe('b');
  });
  it('falls back past an answered row to the newest building question', () => {
    expect(pickOpenQuestion([q('a', '2026-09-21', 'answered'), q('b', '2026-09-20', 'building')])?.id).toBe('b');
  });
  it('returns null when nothing is open', () => {
    expect(pickOpenQuestion([q('a', '2026-09-21', 'answered')])).toBeNull();
    expect(pickOpenQuestion([])).toBeNull();
  });
});

describe('CloseBand', () => {
  it('is #contact, named by its headline', () => {
    render(<CloseBand profile={profile} questions={[]} locale="en" />);
    expect(screen.getByRole('region', { name: dict.en.contactHeading }).id).toBe('contact');
  });

  it('starts a conversation by email with the prototype subject', () => {
    render(<CloseBand profile={profile} questions={[]} locale="en" />);
    expect(screen.getByRole('link', { name: dict.en.startConversation }).getAttribute('href')).toBe(
      'mailto:real@example.com?subject=Hello%20from%20klao-site',
    );
  });

  // C1: reuses P1's resumePdf key -- there is no separate closeResume key.
  it('opens the résumé in a new tab, and leaves it out when there is none', () => {
    render(<CloseBand profile={profile} questions={[]} locale="en" />);
    const resume = screen.getByRole('link', { name: dict.en.resumePdf });
    expect(resume.getAttribute('href')).toBe('/resume.pdf');
    expect(resume.getAttribute('target')).toBe('_blank');
    cleanup();
    render(<CloseBand profile={{ ...profile, resumeUrl: null }} questions={[]} locale="en" />);
    expect(screen.queryByRole('link', { name: dict.en.resumePdf })).toBeNull();
  });

  it('shows the address as text with a copy button', () => {
    render(<CloseBand profile={profile} questions={[]} locale="en" />);
    expect(screen.getByText('real@example.com')).toBeTruthy();
    expect(screen.getByRole('button', { name: dict.en.copyEmailAction })).toBeTruthy();
  });

  it('pairs Based in / Working in with their own values', () => {
    render(<CloseBand profile={profile} questions={[]} locale="en" />);
    const based = screen.getByText(dict.en.basedIn).closest('li');
    const working = screen.getByText(dict.en.workingIn).closest('li');
    expect(based?.textContent).toContain('Bangkok, TH');
    expect(based?.textContent).not.toContain('TH / EN');
    expect(working?.textContent).toContain('TH / EN');
  });

  it('uses the Thai city name on /th', () => {
    render(<CloseBand profile={profile} questions={[]} locale="th" />);
    expect(screen.getByText(dict.th.basedIn).closest('li')?.textContent).toContain('กรุงเทพฯ');
  });

  // T18-d (ruling PR1, master R29; Klao decision 3): Working in is
  // localized too, and the bundled profile says it in Thai on /th.
  it('says Working in in the page language, from the bundled profile too', () => {
    const fixture = profileFixture as Profile;
    render(<CloseBand profile={{ ...fixture, email: 'real@example.com' }} questions={[]} locale="th" />);
    expect(screen.getByText(dict.th.workingIn).closest('li')?.textContent).toContain('ไทย / อังกฤษ');
    cleanup();
    render(<CloseBand profile={{ ...fixture, email: 'real@example.com' }} questions={[]} locale="en" />);
    const working = screen.getByText(dict.en.workingIn).closest('li');
    expect(working?.textContent).toContain('TH / EN');
    expect(working?.textContent).not.toContain('ไทย');
  });

  it('leaves out a fact with no value, and the whole list when both are missing', () => {
    render(<CloseBand profile={{ ...profile, workingIn: null }} questions={[]} locale="en" />);
    expect(screen.queryByText(dict.en.workingIn)).toBeNull();
    expect(screen.getByText(dict.en.basedIn)).toBeTruthy();
    cleanup();
    const none = render(<CloseBand profile={{ ...profile, basedIn: null, workingIn: null }} questions={[]} locale="en" />);
    expect(none.container.querySelector('.close-facts')).toBeNull();
  });

  it('asks one open question with a reply-by-email link', () => {
    // Newest-first, as getQuestions() always hands over: 'b' (building,
    // 2026-09-20) is newer than 'w' (wondering, 2026-09-10), so 'b' is the
    // one CloseBand asks about (see the pickOpenQuestion suite above).
    const { container } = render(
      <CloseBand profile={profile} questions={[q('b', '2026-09-20', 'building'), q('w', '2026-09-10', 'wondering')]} locale="en" />,
    );
    expect(container.querySelector('.close-openq')?.textContent).toContain(`${dict.en.closeOpenQ} EN b?`);
    expect(screen.getByRole('link', { name: dict.en.closeTellMe }).getAttribute('href')).toBe(
      'mailto:real@example.com?subject=Open%20question',
    );
  });

  it('hides the open question when none is open', () => {
    const { container } = render(<CloseBand profile={profile} questions={[q('a', '2026-09-21', 'answered')]} locale="en" />);
    expect(container.querySelector('.close-openq')).toBeNull();
  });

  // T18-d (CO-03, P4 T9 minor): the open question's own `&& profile.email`
  // guard was redundant -- `open` is already null without an email -- so
  // it went, and this test is now what holds that rule.
  it('drops every mail affordance when the profile has no email', () => {
    const { container } = render(
      <CloseBand profile={{ ...profile, email: '' }} questions={[q('w', '2026-09-10', 'wondering')]} locale="en" />,
    );
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(screen.queryByRole('button', { name: dict.en.copyEmailAction })).toBeNull();
    expect(container.querySelector('.close-openq')).toBeNull();
  });

  it('server HTML already holds the CTA and the address (Review Focus #4)', () => {
    const html = renderToStaticMarkup(<CloseBand profile={profile} questions={[]} locale="en" />);
    expect(html).toContain('href="mailto:real@example.com?subject=Hello%20from%20klao-site"');
    expect(html).toContain('real@example.com');
    expect(html).not.toMatch(/href=["']#["']/);
    expect(html).not.toMatch(/opacity:\s*0/);
  });
});
