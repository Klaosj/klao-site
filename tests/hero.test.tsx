// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Hero from '@/components/sections/Hero';
import type { Profile } from '@/lib/models';

// This project has no RTL auto-cleanup wired up (see tests/particle-field.test.tsx,
// which calls `cleanup()` by hand for the same reason): without it, every
// `render()` in this file keeps its output attached to `document.body`, so a
// later `screen.getByText(...)` call -- which queries the whole document, not
// just its own container -- matches leftover nodes from earlier tests too.
afterEach(cleanup);

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

const profile: Profile = {
  name: 'Suwichak Jarunopratamp',
  headline: { en: 'I close the deal and ship the thing.', th: 'ผมปิดดีลเอง แล้วสร้างของเอง' },
  byline: { en: 'BD who builds', th: 'BD ที่สร้างเอง' },
  now: { en: 'Building klao-site', th: 'กำลังสร้าง klao-site' },
  email: 'real@example.com',
  photoSrc: '',
  linkedin: '',
  github: '',
  resumeUrl: '',
  clients: [],
};

describe('Hero', () => {
  it('renders the headline from the profile, not a hardcoded string', () => {
    // Not screen.getByText: MaskedHeading (T3) splits the headline into one
    // <span> per word, so no single element's own text is "close the deal" --
    // RTL's default text matcher only looks at an element's direct text-node
    // children, not its descendants' text. tests/masked-heading.test.tsx hits
    // the same constraint and works around it the same way.
    const { container } = render(<Hero profile={profile} locale="en" />);
    expect(container.querySelector('h1')?.textContent).toMatch(/close the deal/);
  });

  it('hides the annotation pills from assistive tech', () => {
    const { container } = render(<Hero profile={profile} locale="en" />);
    expect(container.querySelector('[data-pills]')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows a labelled placeholder when no portrait is supplied', () => {
    const { container } = render(<Hero profile={profile} locale="en" />);
    expect(container.querySelector('[data-portrait-placeholder]')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
  });

  it('shows a labelled placeholder when the portrait is null, not just empty string', () => {
    // Real profile data (src/lib/notion-mappers.ts fileProxy) yields `null`
    // for a missing photo, never `''`. A truthy check like
    // `photoSrc !== undefined` would pass `null` through and try to render
    // an <img src="null">, so the falsy-check path needs its own coverage
    // beyond the empty-string case above.
    const noPhoto: Profile = { ...profile, photoSrc: null };
    const { container } = render(<Hero profile={noPhoto} locale="en" />);
    expect(container.querySelector('[data-portrait-placeholder]')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
  });

  it('gives the portrait explicit dimensions and real alt text when one exists', () => {
    const withPhoto: Profile = { ...profile, photoSrc: '/api/img/page/abc/Photo' };
    const { container } = render(<Hero profile={withPhoto} locale="en" />);
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('width')).toBe('118');
    expect(img.getAttribute('height')).toBe('118');
    expect(img.getAttribute('alt')).toBe('Suwichak Jarunopratamp');
  });

  it('never ships a dead link', () => {
    const { container } = render(<Hero profile={profile} locale="en" />);
    const anchors = container.querySelectorAll('a');
    // The default fixture has an email, so the CTA must actually be present
    // -- otherwise this loop runs zero times and the assertion below never
    // gets a chance to fail on a real href="#" regression.
    expect(anchors.length).toBeGreaterThan(0);
    for (const a of anchors) {
      expect(a.getAttribute('href')).not.toBe('#');
    }
  });

  it('omits the CTA entirely when no email is published', () => {
    const noMail: Profile = { ...profile, email: '' };
    const { container } = render(<Hero profile={noMail} locale="en" />);
    expect(container.querySelector('a')).toBeNull();
  });

  it("renders the byline copy from the profile's own data", () => {
    render(<Hero profile={profile} locale="en" />);
    expect(screen.getByText('BD who builds')).toBeTruthy();
  });

  it('switches every piece of sourced copy to Thai when locale is th, not just the headline', () => {
    render(<Hero profile={profile} locale="th" />);
    // Headline
    expect(screen.getByText(/ปิดดีลเอง/)).toBeTruthy();
    // Byline
    expect(screen.getByText('BD ที่สร้างเอง')).toBeTruthy();
    // Dictionary-sourced greeting (dict.th.greeting = 'สวัสดีครับ ผม')
    expect(screen.getByText(/สวัสดีครับ/)).toBeTruthy();
    // Confirms no English copy leaked through for a th render
    expect(screen.queryByText(/close the deal/)).toBeNull();
  });

  // --- Change 1: identity stack removed -------------------------------------

  // The identity stack (a <ul> of three declarative lines) has been removed
  // so the <h1> is the only statement of who the person is -- the pills and
  // byline already echo the same facts. This asserts the absence, not a
  // replacement structure: no <ul> should sit between the greeting and the
  // heading anymore.
  it('does not render the identity stack (the h1 is the only statement)', () => {
    render(<Hero profile={profile} locale="en" />);
    expect(screen.queryByText('Barista.')).toBeNull();
    expect(screen.queryByText('Business development.')).toBeNull();
  });

  // --- Change 2: availability status pill ---------------------------------

  it("renders the status pill with profile.now[locale], preceded by an aria-hidden dot", () => {
    const { container } = render(<Hero profile={profile} locale="en" />);
    expect(screen.getByText('Building klao-site')).toBeTruthy();
    const dot = container.querySelector('[aria-hidden="true"].bg-peri');
    expect(dot).toBeTruthy();
  });

  it('renders the Thai status pill text for locale th', () => {
    render(<Hero profile={profile} locale="th" />);
    expect(screen.getByText('กำลังสร้าง klao-site')).toBeTruthy();
  });

  it('renders nothing for the status pill when profile.now[locale] is empty', () => {
    // Asserts on the pill's own marker, not just the absence of specific
    // text: with an empty profile.now, the wrong text is trivially absent
    // whether or not the pill container itself still renders (e.g. an
    // empty pill shell) -- checking `data-status-pill` is what actually
    // proves the "render nothing" behaviour, not just "render nothing
    // that happens to say these words".
    const noNow: Profile = { ...profile, now: { en: '', th: '' } };
    const { container } = render(<Hero profile={noNow} locale="en" />);
    expect(container.querySelector('[data-status-pill]')).toBeNull();
    expect(screen.queryByText('Building klao-site')).toBeNull();
    expect(screen.queryByText('กำลังสร้าง klao-site')).toBeNull();
  });

  // --- Change 3: copy-email control ----------------------------------------

  it('renders a copy-email control wired to the real address, beside the mailto capsule', () => {
    const { container } = render(<Hero profile={profile} locale="en" />);
    // CopyEmail renders the plain-text email address as a real fallback,
    // always in the DOM regardless of clipboard support.
    expect(screen.getByText('real@example.com')).toBeTruthy();
    // Its accessible name comes from CopyEmail's own aria-label
    // (dict.en.copyEmailAction), not from its (mutating) text content.
    // Matched by substring, not exact string: the name must CONTAIN the
    // visible address to satisfy WCAG 2.5.3 Label in Name, and an exact-match
    // assertion is exactly what let that regress unnoticed once already.
    // CopyEmail's own spec owns the full contract.
    const copyButton = screen.getByRole('button', { name: /Copy email address/ });
    expect(copyButton.getAttribute('aria-label')).toContain('real@example.com');
    // The mailto capsule is still present and still the primary action.
    const mailLink = container.querySelector('a[href="mailto:real@example.com"]');
    expect(mailLink).toBeTruthy();
  });

  it('omits the copy-email control along with the CTA when no email is published', () => {
    const noMail: Profile = { ...profile, email: '' };
    render(<Hero profile={noMail} locale="en" />);
    expect(screen.queryByRole('button', { name: 'Copy email address' })).toBeNull();
  });
});
