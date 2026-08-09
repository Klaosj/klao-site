// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ClientsBand from '@/components/sections/ClientsBand';
import { dict } from '@/lib/dictionary';

// No RTL auto-cleanup is wired up in this project -- see tests/bands.test.tsx
// for the same note. Without this, screen.getByText(...) can match leftover
// nodes from a previous test in this file.
afterEach(cleanup);

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

// Mirrors profile.json's own `clients` shape and ordering -- most
// recognisable first. Not the exact same values (so a hardcoded-copy of the
// real fixture would not accidentally pass), but the same "array of plain
// proper-noun strings" contract as Profile.clients in src/lib/models.ts.
const clients = ['Acme Retail', 'Globex Media', 'Initech Labs'];

describe('ClientsBand', () => {
  it('renders every supplied name, in the order given', () => {
    const { container } = render(<ClientsBand clients={clients} locale="en" />);
    const items = Array.from(container.querySelectorAll('li')).map((li) => li.textContent);
    expect(items).toEqual(clients);
  });

  it('renders nothing at all for an empty clients array', () => {
    // A Notion profile without the property maps to `[]`. Rendering a
    // heading/eyebrow with no names under it would look like a broken
    // section, not an honestly-absent one -- the whole band must not exist.
    const { container } = render(<ClientsBand clients={[]} locale="en" />);
    expect(container.firstChild).toBeNull();
    expect(container.querySelector('h2')).toBeNull();
    expect(container.querySelector('p')).toBeNull();
    expect(container.querySelector('li')).toBeNull();
  });

  it('renders the same names in both locales, since they are proper nouns', () => {
    const { container: en } = render(<ClientsBand clients={clients} locale="en" />);
    for (const name of clients) expect(screen.getByText(name)).toBeTruthy();
    // Captured before cleanup() empties `en`'s container -- cleanup unmounts
    // in place rather than merely detaching the node, so querying it after
    // the fact would silently observe an empty tree either way.
    const enNames = Array.from(en.querySelectorAll('li')).map((li) => li.textContent);
    cleanup();
    const { container: th } = render(<ClientsBand clients={clients} locale="th" />);
    for (const name of clients) expect(screen.getByText(name)).toBeTruthy();
    // Not just "present somewhere" -- the exact same list, unchanged by
    // locale, is what "proper nouns render identically" means.
    const thNames = Array.from(th.querySelectorAll('li')).map((li) => li.textContent);
    expect(thNames).toEqual(enNames);
  });

  it('renders a real <h2> whose text comes from the dictionary, not hardcoded copy', () => {
    const { container } = render(<ClientsBand clients={clients} locale="en" />);
    const heading = container.querySelector('h2');
    expect(heading).toBeTruthy();
    expect(heading?.textContent).toBe(dict.en.clientsHeading);
  });

  it('switches the heading and eyebrow to Thai when locale is th', () => {
    const { container } = render(<ClientsBand clients={clients} locale="th" />);
    expect(container.querySelector('h2')?.textContent).toBe(dict.th.clientsHeading);
    expect(container.querySelector('p')?.textContent).toBe(dict.th.clients);
    // No English eyebrow or heading leaked through.
    expect(screen.queryByText(dict.en.clientsHeading)).toBeNull();
    expect(screen.queryByText(dict.en.clients)).toBeNull();
  });

  it('gives the eyebrow and the heading distinct text, not the same string twice', () => {
    const { container } = render(<ClientsBand clients={clients} locale="en" />);
    const eyebrow = container.querySelector('p')?.textContent;
    const heading = container.querySelector('h2')?.textContent;
    expect(eyebrow).toBe(dict.en.clients);
    expect(heading).toBeTruthy();
    expect(heading).not.toBe(eyebrow);
  });

  it('renders the Thai eyebrow in the Thai font stack with normal tracking, never font-mono', () => {
    // Regression test, same class of bug as the other bands' own version of
    // this test: no monospace face carries Thai glyphs.
    const { container } = render(<ClientsBand clients={clients} locale="th" />);
    const eyebrow = container.querySelector('p') as HTMLElement;
    expect(eyebrow.className).not.toContain('font-mono');
    expect(eyebrow.className).not.toMatch(/tracking-\[/);
    expect(eyebrow.className).toContain('font-thai');
  });

  it('never renders the client names through font-mono, in either locale', () => {
    // Names are proper nouns and must render identically in both locales --
    // unlike the eyebrow, they carry no locale-conditional font at all, so
    // this is a flat guard against font-mono ever landing on the <li>s.
    for (const locale of ['en', 'th'] as const) {
      const { container } = render(<ClientsBand clients={clients} locale={locale} />);
      for (const li of Array.from(container.querySelectorAll('li'))) {
        expect((li as HTMLElement).className).not.toContain('font-mono');
      }
      cleanup();
    }
  });

  it('marks the names up as a list', () => {
    const { container } = render(<ClientsBand clients={clients} locale="en" />);
    expect(container.querySelectorAll('li')).toHaveLength(clients.length);
  });
});
