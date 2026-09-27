// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Signature from '@/components/sections/Signature';
import { dict } from '@/lib/dictionary';
import { GONAI, LINEUP, TRIPEDIA } from './helpers/lineup';
import { stubMatchMedia } from './helpers/media';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  stubMatchMedia();
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

describe('Signature', () => {
  it('renders nothing without an idea → app pair (pre-migration Notion rows have no LineageOf)', () => {
    const rows = LINEUP.map((p) => ({ ...p, lineageOf: null }));
    expect(renderToStaticMarkup(<Signature projects={rows} locale="en" />)).toBe('');
  });

  it('renders nothing when LineageOf points at a row that is not published', () => {
    expect(renderToStaticMarkup(<Signature projects={LINEUP.filter((p) => p.name !== 'Tripedia')} locale="en" />)).toBe('');
  });

  it('builds the card from the earlier project and the ending from the later one', () => {
    const { container } = render(<Signature projects={LINEUP} locale="en" />);
    expect(container.querySelector('.t-eyebrow')?.textContent).toBe('2022 → 2026');
    // Ruling D-4 (preflight): there is no sigTitle key -- Signature reuses P1's tourEndTitle.
    expect(container.querySelector('#sig-h')?.textContent).toBe(dict.en.tourEndTitle);
    expect(container.querySelector('.sig-card-kick')?.textContent).toBe(dict.en.sigCardKicker);
    expect(container.querySelector('.sig-card-q')?.textContent).toBe(TRIPEDIA.question!.en);
    expect(container.querySelector('.sig-stat')?.textContent).toBe('30 / 500');
    expect(container.querySelector('.sig-cap-b .sig-cap-t1')?.textContent).toBe('GoNai · Live');
    expect(container.querySelector('.sig-cap-b .sig-cap-t2')?.textContent).toBe(GONAI.description.en);
    expect(container.querySelector('a.sig-open')?.getAttribute('href')).toBe(GONAI.liveUrl);
    expect(container.querySelector('.sig-frame img')?.getAttribute('src')).toBe(GONAI.imageSrc);
    expect(container.querySelector('.sig-frame img')?.getAttribute('alt')).toBe(GONAI.alt!.en);
  });

  it('claims "Live" only for a later project that is live (receipts rule)', () => {
    const rows = LINEUP.map((p) => (p.name === 'GoNai' ? { ...p, statusKey: 'proto' as const } : p));
    const { container } = render(<Signature projects={rows} locale="en" />);
    expect(container.querySelector('.sig-cap-b .sig-cap-t1')?.textContent).toBe('GoNai');
  });

  it('switches every string to Thai on /th and drops the | break mark from the card question', () => {
    const { container } = render(<Signature projects={LINEUP} locale="th" />);
    expect(container.querySelector('#sig-h')?.textContent).toBe(dict.th.tourEndTitle);
    expect(container.querySelector('.sig-card-q')?.textContent).toBe(TRIPEDIA.question!.th.replace(/\|/g, ''));
    expect(container.querySelector('.sig-cap-b .sig-cap-t1')?.textContent).toBe(`GoNai · ${dict.th.sigLive}`);
    expect(container.querySelector('a.sig-open')?.textContent).toContain(dict.th.workOpenApp);
    expect(container.textContent).not.toContain(dict.en.sigCaption);
  });

  it('server HTML shows the whole story with nothing hidden inline (Review Focus #4)', () => {
    const html = renderToStaticMarkup(<Signature projects={LINEUP} locale="en" />);
    expect(html).toContain(dict.en.sigCaption);
    expect(html).toContain('GoNai · Live');
    expect(html).not.toMatch(/style="[^"]*opacity:\s*0/);
    expect(html).not.toMatch(/class="sig pin"/);
  });
});
