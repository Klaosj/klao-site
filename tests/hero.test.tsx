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
};

describe('Hero', () => {
  it('renders the headline from the profile, not a hardcoded string', () => {
    // Not screen.getByText: MaskedHeading (T3) splits the headline into one
    // <span> per word, so no single element's own text is "close the deal" --
    // RTL's default text matcher only looks at an element's direct text-node
    // children, not its descendants' text. tests/masked-heading.test.tsx hits
    // the same constraint and works around it the same way.
    const { container } = render(<Hero profile={profile} locale="en" wordmark="SUWICHAK" />);
    expect(container.querySelector('h1')?.textContent).toMatch(/close the deal/);
  });

  it('hides the annotation pills from assistive tech', () => {
    const { container } = render(<Hero profile={profile} locale="en" wordmark="SUWICHAK" />);
    expect(container.querySelector('[data-pills]')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows a labelled placeholder when no portrait is supplied', () => {
    const { container } = render(<Hero profile={profile} locale="en" wordmark="SUWICHAK" />);
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
    const { container } = render(<Hero profile={noPhoto} locale="en" wordmark="SUWICHAK" />);
    expect(container.querySelector('[data-portrait-placeholder]')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
  });

  it('gives the portrait explicit dimensions and real alt text when one exists', () => {
    const withPhoto: Profile = { ...profile, photoSrc: '/api/img/page/abc/Photo' };
    const { container } = render(<Hero profile={withPhoto} locale="en" wordmark="S" />);
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('width')).toBe('118');
    expect(img.getAttribute('height')).toBe('118');
    expect(img.getAttribute('alt')).toBe('Suwichak Jarunopratamp');
  });

  it('never ships a dead link', () => {
    const { container } = render(<Hero profile={profile} locale="en" wordmark="S" />);
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
    const { container } = render(<Hero profile={noMail} locale="en" wordmark="S" />);
    expect(container.querySelector('a')).toBeNull();
  });

  it("renders the byline copy from the profile's own data", () => {
    render(<Hero profile={profile} locale="en" wordmark="S" />);
    expect(screen.getByText('BD who builds')).toBeTruthy();
  });

  it('switches every piece of sourced copy to Thai when locale is th, not just the headline', () => {
    render(<Hero profile={profile} locale="th" wordmark="S" />);
    // Headline
    expect(screen.getByText(/ปิดดีลเอง/)).toBeTruthy();
    // Byline
    expect(screen.getByText('BD ที่สร้างเอง')).toBeTruthy();
    // Dictionary-sourced greeting (dict.th.greeting = 'สวัสดีครับ ผม')
    expect(screen.getByText(/สวัสดีครับ/)).toBeTruthy();
    // Confirms no English copy leaked through for a th render
    expect(screen.queryByText(/close the deal/)).toBeNull();
  });
});
