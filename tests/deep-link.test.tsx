// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DeepLink from '@/components/DeepLink';
import PaletteButton from '@/components/PaletteButton';
import { CAREER_EVENT, PALETTE_EVENT, followTarget, goToTarget, openPalette } from '@/lib/deep-link';

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  // jsdom has no layout (window.scrollTo is "not implemented"); the spy
  // records the jump instead.
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  history.replaceState(null, '', '/');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const listen = (name: string) => {
  const heard = vi.fn();
  window.addEventListener(name, heard);
  return heard;
};

describe('openPalette', () => {
  it('dispatches the C8 event, with the query when there is one', () => {
    const heard = listen(PALETTE_EVENT);
    openPalette();
    openPalette('gonai');
    expect((heard.mock.calls[0][0] as CustomEvent).detail).toEqual({});
    expect((heard.mock.calls[1][0] as CustomEvent).detail).toEqual({ query: 'gonai' });
    window.removeEventListener(PALETTE_EVENT, heard);
  });
});

describe('followTarget', () => {
  it('career:<key> tells CareerDetent which pill, then brings the band into view with focus on its heading', () => {
    document.body.innerHTML = '<section id="career"><h2>Career</h2></section>';
    const heard = listen(CAREER_EVENT);
    expect(followTarget('career:actmedia')).toBe(true);
    expect((heard.mock.calls[0][0] as CustomEvent).detail).toEqual({ key: 'actmedia' });
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    const h2 = document.querySelector('h2')!;
    expect(document.activeElement).toBe(h2);
    expect(h2.getAttribute('tabindex')).toBe('-1');
    window.removeEventListener(CAREER_EVENT, heard);
  });

  it('work/<key> sets the sheet hash (P2 opens the sheet on hashchange)', () => {
    document.body.innerHTML = '<section id="work"></section>';
    expect(followTarget('work/gonai')).toBe(true);
    expect(window.location.hash).toBe('#work/gonai');
  });

  it('opens a FAQ <details> it is pointed at and focuses its summary', () => {
    document.body.innerHTML = '<details id="faq-fx-faq-day"><summary>Q</summary><p>A</p></details>';
    expect(followTarget('faq-fx-faq-day')).toBe(true);
    const details = document.querySelector('details')!;
    expect(details.open).toBe(true);
    expect(document.activeElement).toBe(details.querySelector('summary'));
  });

  it('declines (returns false) when the target is not on this page, is external, or is malformed', () => {
    expect(followTarget('career:actmedia')).toBe(false);
    expect(followTarget('work/gonai')).toBe(false);
    expect(followTarget('story')).toBe(false);
    expect(followTarget('https://github.com/Klaosj')).toBe(false);
    expect(followTarget('javascript:alert(1)')).toBe(false);
    expect(window.location.hash).toBe('');
  });
});

describe('DeepLink', () => {
  it('renders a real href and handles the click in place when the target is on the page', () => {
    document.body.innerHTML = '<section id="career"><h2>Career</h2></section>';
    render(<DeepLink target="career:abundance" locale="en">Career · A Bun Dance</DeepLink>);
    const link = screen.getByRole('link', { name: 'Career · A Bun Dance' });
    expect(link.getAttribute('href')).toBe('/en#career');
    // fireEvent returns false when the handler called preventDefault().
    expect(fireEvent.click(link)).toBe(false);
  });

  it('leaves modified clicks (new tab) to the browser', () => {
    document.body.innerHTML = '<section id="career"><h2>Career</h2></section>';
    const heard = listen(CAREER_EVENT);
    render(<DeepLink target="career:abundance" locale="en">Career</DeepLink>);
    expect(fireEvent.click(screen.getByRole('link'), { metaKey: true })).toBe(true);
    expect(heard).not.toHaveBeenCalled();
    window.removeEventListener(CAREER_EVENT, heard);
  });

  it('opens external targets in a new tab without an opener', () => {
    render(<DeepLink target="https://gonai-three.vercel.app" locale="th">GoNai</DeepLink>);
    const link = screen.getByRole('link', { name: 'GoNai' });
    expect(link.getAttribute('href')).toBe('https://gonai-three.vercel.app');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('renders a malformed target as plain text, never as a dead link', () => {
    render(<DeepLink target="javascript:alert(1)" locale="en">Nope</DeepLink>);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Nope')).toBeTruthy();
  });
});

describe('goToTarget', () => {
  // ⌘K rows and Ask sources have no <a> of their own, so an outside URL goes
  // through window.open -- with the same "no opener, no referrer" as
  // DeepLink's rel (wave-2 merge reconciliation d).
  it('opens an external target in a new tab with noopener and noreferrer', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    goToTarget('https://gonai-three.vercel.app', 'en');
    expect(open).toHaveBeenCalledWith('https://gonai-three.vercel.app', '_blank', 'noopener,noreferrer');
  });
});

describe('PaletteButton', () => {
  it('opens ⌘K through the C8 event', () => {
    const heard = listen(PALETTE_EVENT);
    render(<PaletteButton>Search</PaletteButton>);
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(heard).toHaveBeenCalledTimes(1);
    window.removeEventListener(PALETTE_EVENT, heard);
  });
});
