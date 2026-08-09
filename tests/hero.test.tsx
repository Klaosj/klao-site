// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
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

  // --- Change 1: identity stack -------------------------------------------

  // Scoped to the identity <ul> itself (via `within`), not `screen`: the
  // decorative pills div (aria-hidden, PILLS constant above) happens to
  // share the exact Thai string 'พัฒนาธุรกิจ' with identities.th[0], so an
  // unscoped `screen.getByText` on that string matches two elements and
  // throws -- a real collision this test hit while it was being written,
  // not a hypothetical one. Scoping to the list is also the more honest
  // assertion: it tests the identity block specifically, not "this text
  // exists somewhere on the page".
  it('renders all three EN identity lines in the identity list, and none of the TH ones', () => {
    const { container } = render(<Hero profile={profile} locale="en" />);
    const list = within(container.querySelector('ul') as HTMLElement);
    expect(list.getByText('Business development.')).toBeTruthy();
    expect(list.getByText('Barista.')).toBeTruthy();
    expect(list.getByText('Builds his own tools.')).toBeTruthy();
    expect(list.queryByText('พัฒนาธุรกิจ')).toBeNull();
    expect(list.queryByText('บาริสต้า')).toBeNull();
    expect(list.queryByText('สร้างเครื่องมือใช้เอง')).toBeNull();
  });

  it('renders all three TH identity lines in the identity list, and none of the EN ones', () => {
    const { container } = render(<Hero profile={profile} locale="th" />);
    const list = within(container.querySelector('ul') as HTMLElement);
    expect(list.getByText('พัฒนาธุรกิจ')).toBeTruthy();
    expect(list.getByText('บาริสต้า')).toBeTruthy();
    expect(list.getByText('สร้างเครื่องมือใช้เอง')).toBeTruthy();
    expect(list.queryByText('Business development.')).toBeNull();
    expect(list.queryByText('Barista.')).toBeNull();
    expect(list.queryByText('Builds his own tools.')).toBeNull();
  });

  it('renders the identity stack as a list, not a heading element', () => {
    // A <h2>/<h3> here would sit above the <h1> in the document's heading
    // outline. Assert the positive (a <ul> with 3 <li>s) AND the negative
    // (no h2/h3 anywhere in the hero) so a regression to a heading element
    // fails this test even if some other list is left in place.
    const { container } = render(<Hero profile={profile} locale="en" />);
    const list = container.querySelector('ul');
    expect(list).toBeTruthy();
    expect(list?.querySelectorAll('li').length).toBe(3);
    expect(container.querySelector('h2')).toBeNull();
    expect(container.querySelector('h3')).toBeNull();
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
    const copyButton = screen.getByRole('button', { name: 'Copy email address' });
    expect(copyButton).toBeTruthy();
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
