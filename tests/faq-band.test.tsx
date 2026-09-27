// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FaqBand from '@/components/sections/FaqBand';
import { dict } from '@/lib/dictionary';
import type { FaqItem } from '@/lib/models';

afterEach(cleanup);

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

const items: FaqItem[] = [
  {
    id: 'fx-faq-business',
    question: { en: 'Has he run a business?', th: 'เคยทำธุรกิจเองไหม?' },
    answer: { en: 'He founded A Bun Dance.', th: 'เคยก่อตั้งร้าน A Bun Dance' },
    links: [{ label: { en: 'Career · A Bun Dance', th: 'Career · A Bun Dance' }, target: 'career:abundance' }],
    order: 1,
  },
  {
    id: 'fx-faq-build',
    question: { en: 'Does he actually build the apps himself?', th: 'สร้างแอปเองจริงไหม?' },
    answer: { en: 'Yes, on nights and weekends.', th: 'จริงครับ ทำนอกเวลางาน' },
    links: [
      { label: { en: 'Projects', th: 'Projects' }, target: 'work' },
      { label: { en: 'Toolbox', th: 'Toolbox' }, target: 'toolbox' },
      { label: { en: 'GoNai', th: 'GoNai' }, target: 'https://gonai-three.vercel.app' },
    ],
    order: 2,
  },
];

const detailsOf = (root: ParentNode) => Array.from(root.querySelectorAll('details'));

describe('FaqBand', () => {
  it('renders #faq, named by its headline, with every question and answer in the DOM', () => {
    render(<FaqBand items={items} locale="en" />);
    const section = screen.getByRole('region', { name: dict.en.faqTitle });
    expect(section.id).toBe('faq');
    for (const item of items) {
      expect(within(section).getByText(item.question.en)).toBeTruthy();
      // Answers sit inside closed <details>: still in the DOM, reachable
      // without JavaScript.
      expect(within(section).getByText(item.answer.en)).toBeTruthy();
    }
  });

  it('uses native <details> with stable ids, closed by default', () => {
    const { container } = render(<FaqBand items={items} locale="en" />);
    expect(detailsOf(container).map((d) => d.id)).toEqual(['faq-fx-faq-business', 'faq-fx-faq-build']);
    expect(detailsOf(container).some((d) => d.open)).toBe(false);
    expect(container.querySelectorAll('summary.t-faq')).toHaveLength(2);
  });

  it('opens on a summary click with no JavaScript event handler of ours involved (native disclosure)', () => {
    // FaqExpandAll and DeepLink both attach listeners elsewhere on the
    // page, but no code here puts a click handler on <summary> itself --
    // opening on click is the browser's own default <details> behaviour, so
    // it survives with JavaScript off too (Review Focus #4).
    const { container } = render(<FaqBand items={items} locale="en" />);
    const [first] = detailsOf(container);
    expect(first.open).toBe(false);
    fireEvent.click(first.querySelector('summary')!);
    expect(first.open).toBe(true);
    fireEvent.click(first.querySelector('summary')!);
    expect(first.open).toBe(false);
  });

  it('renders every source as a real link that works without JavaScript', () => {
    render(<FaqBand items={items} locale="en" />);
    const career = screen.getByRole('link', { name: 'Career · A Bun Dance', hidden: true });
    expect(career.getAttribute('href')).toBe('/en#career');
    expect(screen.getByRole('link', { name: 'Toolbox', hidden: true }).getAttribute('href')).toBe('/en#toolbox');
    const out = screen.getByRole('link', { name: 'GoNai', hidden: true });
    expect(out.getAttribute('target')).toBe('_blank');
    expect(out.getAttribute('rel')).toContain('noopener');
  });

  it('separates the label from its links with "Source: " / "ที่มา: " (controller ruling: no trailing space in the dictionary string itself)', () => {
    // dict.faqSource carries no trailing space ('Source:' / 'ที่มา:') --
    // FaqBand adds the space in JSX ({t.faqSource}{' '}) so the string in
    // the dictionary stays copy-only and the layout choice lives here.
    const { container: en } = render(<FaqBand items={items} locale="en" />);
    expect(en.querySelector('.faq-src')?.textContent).toContain('Source: ');
    cleanup();
    const { container: th } = render(<FaqBand items={items} locale="th" />);
    expect(th.querySelector('.faq-src')?.textContent).toContain('ที่มา: ');
  });

  it('Expand all opens every question, then Collapse all closes them', () => {
    const { container } = render(<FaqBand items={items} locale="en" />);
    const button = screen.getByRole('button', { name: dict.en.faqExpand });
    fireEvent.click(button);
    expect(detailsOf(container).every((d) => d.open)).toBe(true);
    expect(button.textContent).toBe(dict.en.faqCollapse);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(button);
    expect(detailsOf(container).some((d) => d.open)).toBe(false);
    expect(button.textContent).toBe(dict.en.faqExpand);
  });

  it('keeps the button honest when questions are opened one by one', () => {
    const { container } = render(<FaqBand items={items} locale="en" />);
    const button = screen.getByRole('button', { name: dict.en.faqExpand });
    for (const d of detailsOf(container)) {
      act(() => {
        d.open = true;
        d.dispatchEvent(new Event('toggle'));
      });
    }
    expect(button.textContent).toBe(dict.en.faqCollapse);
  });

  it('offers ⌘K when an answer is missing', () => {
    const heard = vi.fn();
    window.addEventListener('klao:palette', heard);
    render(<FaqBand items={items} locale="en" />);
    fireEvent.click(screen.getByRole('button', { name: dict.en.faqMore }));
    expect(heard).toHaveBeenCalledTimes(1);
    window.removeEventListener('klao:palette', heard);
  });

  it('renders nothing at all when no question is published', () => {
    const { container } = render(<FaqBand items={[]} locale="en" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders only Thai on /th', () => {
    render(<FaqBand items={items} locale="th" />);
    expect(screen.getByRole('region', { name: dict.th.faqTitle })).toBeTruthy();
    expect(screen.getByText('เคยทำธุรกิจเองไหม?')).toBeTruthy();
    expect(screen.getByRole('button', { name: dict.th.faqExpand })).toBeTruthy();
    expect(screen.queryByText('Has he run a business?')).toBeNull();
    expect(screen.getByRole('link', { name: 'Career · A Bun Dance', hidden: true }).getAttribute('href')).toBe('/th#career');
  });

  it('renders the Thai heading and every Thai question through ThaiText\'s display mode (fix round 1, R25: .kt keep-run spans, not .nw)', () => {
    // R25 (master plan): every .t-hero/.t-h2/.t-title/.t-panel/.t-faq
    // heading passes `display` -- ThaiText's default mode (.nw, a fixed
    // keep-list) is for body copy, not headings/questions.
    const { container } = render(<FaqBand items={items} locale="th" />);
    const heading = container.querySelector('#faq-h');
    expect(heading?.querySelector('.kt')).toBeTruthy();
    expect(heading?.querySelector('.nw')).toBeNull();
    const summaries = Array.from(container.querySelectorAll('summary.t-faq'));
    expect(summaries).toHaveLength(items.length);
    for (const summary of summaries) {
      expect(summary.querySelector('.kt'), summary.textContent ?? '').toBeTruthy();
      expect(summary.querySelector('.nw')).toBeNull();
    }
  });

  it('server HTML carries every answer and hides nothing inline (Review Focus #4)', () => {
    const html = renderToStaticMarkup(<FaqBand items={items} locale="en" />);
    for (const item of items) expect(html).toContain(item.answer.en);
    expect(html).toContain('<details');
    expect(html).not.toMatch(/opacity:\s*0/);
  });
});

// Polish amendment A05: the disclosure's open/close height animates instead
// of snapping, via the CSS-only `interpolate-size`/`::details-content`
// pattern -- no JS height measuring, ever (A05 ruling). This is a named
// exception to the master Global Constraint ("only transform and opacity
// animate"), same idiom as copy-email.css's A03 stroke-dashoffset exception
// (tests/copy-email.test.tsx): read the stylesheet as text (jsdom computes
// no CSS, and no browser here implements ::details-content to observe
// anyway) and pin the rules by name.
describe('faq.css (A05: smooth height)', () => {
  const CSS = readFileSync('src/components/sections/faq.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  it('opts every <details> into keyword interpolation, globally (no per-element scoping needed)', () => {
    expect(CSS).toMatch(/html\s*\{\s*interpolate-size:\s*allow-keywords;?\s*\}/);
  });

  it('scopes the block-size/content-visibility transition to #faq, closed state first', () => {
    expect(CSS).toMatch(
      /#faq details::details-content\s*\{\s*block-size:\s*0;\s*overflow:\s*clip;\s*transition:\s*block-size 360ms var\(--ease-glide\), content-visibility 360ms allow-discrete;?\s*\}/,
    );
  });

  it('opens to the content\'s natural height -- never a measured pixel value', () => {
    expect(CSS).toMatch(/#faq details\[open\]::details-content\s*\{\s*block-size:\s*auto;?\s*\}/);
    // The contract this rule exists for: no JS in this file ever reads or
    // sets a height, so unsupported browsers fall back to the instant
    // native open/close with nothing left to break.
    expect(CSS).not.toMatch(/getBoundingClientRect|offsetHeight|scrollHeight/);
  });

  it('animates only transform/opacity, except the named block-size/content-visibility exception, scoped to #faq', () => {
    let sawException = false;
    for (const rule of CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = rule[1].trim();
      for (const decl of rule[2].matchAll(/transition\s*:\s*([^;]+);/g)) {
        for (const part of decl[1].split(',')) {
          const prop = part.trim().split(/\s+/)[0];
          if (prop === 'none') continue;
          if (prop === 'block-size' || prop === 'content-visibility') {
            expect(selector, `${prop} transition outside #faq details::details-content: ${selector}`).toBe(
              '#faq details::details-content',
            );
            sawException = true;
            continue;
          }
          expect(['transform', 'opacity'], `${selector} transitions ${prop}`).toContain(prop);
        }
      }
    }
    expect(sawException, 'expected the #faq details::details-content exception to exist').toBe(true);
  });

  it('turns off the height transition, same as the chevron, under prefers-reduced-motion: reduce', () => {
    const blockFrom = (css: string, from: number): string => {
      const open = css.indexOf('{', from);
      let depth = 0;
      for (let i = open; i < css.length; i++) {
        if (css[i] === '{') depth++;
        if (css[i] === '}' && --depth === 0) return css.slice(from, i + 1);
      }
      throw new Error('unbalanced braces in faq.css');
    };
    const at = CSS.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(at, 'reduced-motion block').toBeGreaterThan(-1);
    const block = blockFrom(CSS, at);
    expect(block).toContain('#faq details::details-content');
    expect(block).toMatch(/#faq details::details-content[^{]*\{\s*transition:\s*none;/);
  });
});
