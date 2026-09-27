// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import CareerDetent from '@/components/CareerDetent';
import { CAREER_EVENT } from '@/lib/career';
import type { CareerEntry } from '@/lib/models';
import { installFakeIO } from './helpers/io';
import { stubMatchMedia } from './helpers/media';

// No RTL auto-cleanup in this project (see tests/hero.test.tsx).
afterEach(cleanup);

beforeEach(() => {
  stubMatchMedia();
  installFakeIO();
});

// ThaiText keep-runs may use no-break spaces; compare on plain text.
const norm = (s: string | null | undefined): string =>
  (s ?? '').replace(/\u00A0/g, ' ').replace(/\u200B/g, '').trim();

const entries: CareerEntry[] = [
  {
    id: 'e1',
    key: 'actmedia',
    role: { en: 'Senior Business Development', th: 'นักพัฒนาธุรกิจอาวุโส' },
    company: 'Actmedia',
    period: 'MAR 2026 – Present',
    start: '2026-03',
    end: null,
    figure: null,
    wins: { en: ['Opened new retail channels'], th: ['เปิดช่องทางค้าปลีกใหม่'] },
    order: 1,
  },
  {
    id: 'e2',
    key: 'casetify',
    role: { en: 'Brand Representative', th: 'ตัวแทนแบรนด์' },
    company: 'Casetify',
    period: 'MAY 2024 – MAR 2026',
    start: '2024-05',
    end: '2026-03',
    figure: {
      value: 'THB 1.1M',
      label: { en: 'My personal monthly sales target', th: 'เป้ายอดขายส่วนตัวต่อเดือน' },
      note: { en: 'Target met', th: 'ทำถึงเป้า' },
    },
    wins: { en: ['Ran the store on shift'], th: ['รันร้านในกะ'] },
    order: 2,
  },
  {
    id: 'e3',
    key: 'a-bun-dance',
    role: { en: 'Founder', th: 'ผู้ก่อตั้ง' },
    company: 'A Bun Dance',
    period: 'MAY 2021 – DEC 2022',
    start: '2021-05',
    end: '2022-12',
    figure: null,
    wins: { en: [], th: [] },
    order: 3,
  },
];

const tabs = () => screen.getAllByRole('tab');
const panel = () => screen.getByRole('tabpanel');
const selectedIndex = () => tabs().findIndex((t) => t.getAttribute('aria-selected') === 'true');

describe('CareerDetent', () => {
  it('selects the current role first and renders its panel (the server HTML state)', () => {
    render(<CareerDetent entries={entries} locale="en" now="2026-09" />);
    expect(tabs()).toHaveLength(3);
    expect(selectedIndex()).toBe(0);
    expect(tabs().map((t) => t.tabIndex)).toEqual([0, -1, -1]);
    expect(panel().id).toBe('career-panel');
    expect(panel().getAttribute('aria-labelledby')).toBe('career-tab-0');
    expect(panel().getAttribute('data-swap')).toBe('false');
    expect(norm(panel().querySelector('h3')?.textContent)).toBe('Actmedia');
    expect(norm(panel().querySelector('.car-role')?.textContent)).toBe('Senior Business Development');
    expect(norm(panel().querySelector('.car-dates')?.textContent)).toBe('Mar 2026 – Present · 7 mo');
    expect(norm(panel().querySelector('.car-wins')?.textContent)).toBe('Opened new retail channels');
    expect(norm(tabs()[0].querySelector('span')?.textContent)).toBe('2026 – now');
  });

  it('selects on click, slides the detent and shows the figure with its note and label', () => {
    const { container } = render(<CareerDetent entries={entries} locale="en" now="2026-09" />);
    fireEvent.click(tabs()[1]);
    expect(selectedIndex()).toBe(1);
    expect(panel().getAttribute('data-swap')).toBe('true');
    expect((container.querySelector('.car-detent') as HTMLElement).style.getPropertyValue('--dy')).toBe('64px');
    expect(panel().querySelector('.car-fig .u')?.textContent).toBe('THB');
    expect(norm(panel().querySelector('.car-fig')?.textContent)).toBe('THB 1.1M');
    expect(norm(panel().querySelector('.car-note')?.textContent)).toBe('Target met');
    expect(norm(panel().querySelector('.car-cap')?.textContent)).toBe('My personal monthly sales target');
  });

  it('moves selection and focus with arrow keys, wrapping, plus Home and End', () => {
    render(<CareerDetent entries={entries} locale="en" now="2026-09" />);
    tabs()[0].focus();
    fireEvent.keyDown(tabs()[0], { key: 'ArrowDown' });
    expect(selectedIndex()).toBe(1);
    expect(document.activeElement).toBe(tabs()[1]);
    expect(tabs().map((t) => t.tabIndex)).toEqual([-1, 0, -1]);
    fireEvent.keyDown(tabs()[1], { key: 'End' });
    expect(selectedIndex()).toBe(2);
    fireEvent.keyDown(tabs()[2], { key: 'ArrowRight' });
    expect(selectedIndex()).toBe(0);
    fireEvent.keyDown(tabs()[0], { key: 'ArrowUp' });
    expect(selectedIndex()).toBe(2);
    fireEvent.keyDown(tabs()[2], { key: 'Home' });
    expect(selectedIndex()).toBe(0);
    expect(document.activeElement).toBe(tabs()[0]);
    fireEvent.keyDown(tabs()[0], { key: 'Tab' });
    expect(selectedIndex()).toBe(0);
  });

  // Ruling C-4 (preflight): CareerDetent only SELECTS the pill on
  // `klao:career` -- P4's `followTarget` owns scrolling and focus, so this
  // no longer asserts scrollIntoView or document.activeElement.
  it('opens a role on klao:career (exact or prototype-style key)', () => {
    render(
      <section id="career">
        <CareerDetent entries={entries} locale="en" now="2026-09" />
      </section>,
    );
    act(() => {
      window.dispatchEvent(new CustomEvent(CAREER_EVENT, { detail: { key: 'abundance' } }));
    });
    expect(selectedIndex()).toBe(2);
    act(() => {
      window.dispatchEvent(new CustomEvent(CAREER_EVENT, { detail: { key: 'casetify' } }));
    });
    expect(selectedIndex()).toBe(1);
  });

  it('ignores unknown keys, a missing detail and a non-string key', () => {
    render(<CareerDetent entries={entries} locale="en" now="2026-09" />);
    act(() => {
      window.dispatchEvent(new CustomEvent(CAREER_EVENT, { detail: { key: 'nope' } }));
      window.dispatchEvent(new CustomEvent(CAREER_EVENT));
      window.dispatchEvent(new CustomEvent(CAREER_EVENT, { detail: { key: 42 } }));
    });
    expect(selectedIndex()).toBe(0);
  });

  it('draws the rail from the dates, with the marker on the selected role', () => {
    const { container } = render(<CareerDetent entries={entries} locale="en" now="2026-09" />);
    const rail = container.querySelector('.car-rail') as HTMLElement;
    expect(rail.getAttribute('aria-hidden')).toBe('true');
    expect(rail.querySelectorAll('.car-rseg')).toHaveLength(3);
    expect(rail.querySelectorAll('.car-rseg[data-on="true"]')).toHaveLength(1);
    expect(rail.querySelector('.car-rlab')?.textContent).toBe('Actmedia · 7 mo');
    const mx = (rail.querySelector('.car-rmark') as HTMLElement).style.getPropertyValue('--mx');
    expect(parseFloat(mx)).toBeCloseTo(94.6, 1);
    fireEvent.click(tabs()[1]);
    expect(container.querySelector('.car-rlab')?.textContent).toBe('Casetify · 23 mo');
    expect(container.querySelector('.car-ryears [data-now="true"]')?.textContent).toBe('Now');
  });

  it('takes "now" from its prop, never the client clock', () => {
    render(<CareerDetent entries={entries} locale="en" now="2026-12" />);
    expect(norm(panel().querySelector('.car-dates')?.textContent)).toBe('Mar 2026 – Present · 10 mo');
  });

  it('renders pre-migration entries (no dates) with their period text and no rail', () => {
    const undated = entries.map((e) => ({ ...e, start: null, end: null }));
    const { container } = render(<CareerDetent entries={undated} locale="en" now="2026-09" />);
    expect(container.querySelector('.car-rail')).toBeNull();
    expect(norm(panel().querySelector('.car-dates')?.textContent)).toBe('MAR 2026 – Present');
    expect(tabs()[0].querySelector('span')).toBeNull();
  });

  it('offers the deal link on the current role only, and an Earlier button that walks back', () => {
    render(<CareerDetent entries={entries} locale="en" now="2026-09" />);
    expect(panel().querySelector('a[href="#story"]')?.textContent).toBe('How a deal runs ↓');
    fireEvent.click(screen.getByRole('button', { name: 'Earlier: Casetify ›' }));
    expect(selectedIndex()).toBe(1);
    expect(document.activeElement).toBe(tabs()[1]);
    expect(panel().querySelector('a[href="#story"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Earlier: A Bun Dance ›' }));
    expect(screen.queryByRole('button', { name: /^Earlier:/ })).toBeNull();
  });

  it('uses Thai month names and units for locale th', () => {
    render(<CareerDetent entries={entries} locale="th" now="2026-09" />);
    expect(norm(panel().querySelector('.car-dates')?.textContent)).toBe('มี.ค. 2026 – ปัจจุบัน · 7 เดือน');
    expect(norm(tabs()[0].querySelector('span')?.textContent)).toBe('2026 – ปัจจุบัน');
    expect(norm(panel().querySelector('.car-role')?.textContent)).toBe('นักพัฒนาธุรกิจอาวุโส');
  });

  it('renders nothing for an empty career list', () => {
    const { container } = render(<CareerDetent entries={[]} locale="en" now="2026-09" />);
    expect(container.innerHTML).toBe('');
  });
});
