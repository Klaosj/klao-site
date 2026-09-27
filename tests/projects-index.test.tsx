// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectsIndex from '@/components/sections/ProjectsIndex';
import { dict } from '@/lib/dictionary';
import { projectKey } from '@/lib/sheet-url';
import { stubDialog } from './helpers/dialog';
import { installFakeIO } from './helpers/io';
import { GONAI, LINEUP, TRIPEDIA, makeProject } from './helpers/lineup';
import { stubMatchMedia } from './helpers/media';

// D-3: P1's shared stand-ins, not a third re-inlined IntersectionObserver/dialog stub --
// matchMedia included, via stubMatchMedia since the wave-2 merge.
beforeEach(() => {
  stubMatchMedia();
  installFakeIO();
  stubDialog(); // A07: the row click opens ProjectSheet's real <dialog>, which jsdom can't drive without this
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/en');
  // A07: never leaves a fake startViewTransition behind for the next test.
  delete (document as Partial<Document>).startViewTransition;
});

const keysIn = (group: Element) => Array.from(group.querySelectorAll<HTMLAnchorElement>('a.pi-row')).map((a) => a.dataset.sheet);
const rowOf = (c: HTMLElement, key: string) => c.querySelector(`a.pi-row[data-sheet="${key}"]`) as HTMLAnchorElement;
const thumbOf = (c: HTMLElement, key: string) => rowOf(c, key).querySelector('.pi-thumb') as HTMLElement;

// A brace-depth scanner for one @media block, so the A07 CSS test below doesn't depend on how
// the rest of the file happens to be formatted (mirrors tests/p2-css.test.ts's own `block()`).
function mediaBlock(css: string, query: string): string {
  const start = css.indexOf(query);
  if (start < 0) throw new Error(`missing ${query}`);
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced ${query}`);
}

describe('ProjectsIndex', () => {
  it('heads the section with the prototype headline and lead, labelled for assistive tech', () => {
    const { container } = render(<ProjectsIndex projects={LINEUP} locale="en" />);
    const section = container.querySelector('section#work')!;
    expect(section.getAttribute('aria-labelledby')).toBe('work-h');
    expect(container.querySelector('#work-h')?.textContent).toBe(dict.en.deckHeading);
    expect(screen.getByText(dict.en.deckSubtitle)).toBeTruthy();
  });

  // D-5: the original title claimed an ordering the test couldn't detect -- LINEUP is already in
  // Order, so this can't catch a sorting fault. Renamed per the ruling; the assertions are the
  // same (they still prove grouping and Business-then-Build, just not "sorts" on their own).
  it('lists Business first, then Build, in the order given (content.ts sorts by Order)', () => {
    const { container } = render(<ProjectsIndex projects={LINEUP} locale="en" />);
    const groups = container.querySelectorAll('.pi-cols > section');
    expect(groups).toHaveLength(2);
    expect(groups[0].querySelector('h3')?.textContent).toBe(dict.en.workTypeBusiness);
    expect(groups[1].querySelector('h3')?.textContent).toBe(dict.en.workTypeBuild);
    expect(keysIn(groups[0])).toEqual(['talatify', 'tripedia']);
    expect(keysIn(groups[1])).toEqual(['aje', 'gonai', 'klao-site']);
  });

  it('makes every row a real link to #work/<key>, which works without JavaScript', () => {
    const { container } = render(<ProjectsIndex projects={LINEUP} locale="en" />);
    for (const p of LINEUP) {
      expect(rowOf(container, projectKey(p)).getAttribute('href')).toBe(`#work/${projectKey(p)}`);
    }
  });

  it('shows the name, the status mark + word, and the question without its | break mark', () => {
    const { container } = render(<ProjectsIndex projects={LINEUP} locale="th" />);
    const trip = rowOf(container, 'tripedia');
    expect(trip.querySelector('.pi-name')?.textContent).toContain('Tripedia');
    expect(trip.querySelector('.st-chip')?.textContent).toBe(TRIPEDIA.status!.th);
    expect(trip.querySelector('.st-mk')?.getAttribute('data-mark')).toBe('ring');
    expect(trip.querySelector('.pi-q')?.textContent).toBe(TRIPEDIA.question!.th.replace(/\|/g, ''));
  });

  it('thumbnails: the screenshot for builds, a line drawing for business plays, the Notion vignette for this site', () => {
    const { container } = render(<ProjectsIndex projects={LINEUP} locale="en" />);
    const thumb = (key: string) => thumbOf(container, key);
    const img = thumb('gonai').querySelector('img')!;
    expect(img.getAttribute('src')).toBe(GONAI.imageSrc);
    expect(img.getAttribute('alt')).toBe(''); // the name sits right beside it
    expect(img.getAttribute('width')).toBe('88');
    expect(img.getAttribute('height')).toBe('50');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(thumb('talatify').querySelector('svg')).toBeTruthy();
    expect(thumb('tripedia').querySelector('svg')).toBeTruthy();
    expect(thumb('klao-site').querySelector('svg')).toBeTruthy();
    expect(thumb('klao-site').querySelector('img')).toBeNull();
    for (const key of ['talatify', 'gonai', 'klao-site']) expect(thumb(key).getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps a pre-migration row whole: no status, no question, no screenshot', () => {
    const bare = makeProject({ id: 'fx-bare', name: 'Bare', order: 9, imageSrc: null, media: 'win' });
    const { container } = render(<ProjectsIndex projects={[bare]} locale="en" />);
    const row = rowOf(container, 'bare');
    expect(row.querySelector('.pi-name')?.textContent).toBe('Bare');
    expect(row.querySelector('.st-chip')).toBeNull();
    expect(row.querySelector('.pi-q')).toBeNull();
    expect(row.querySelector('.pi-thumb img')).toBeNull();
    // No business rows: the lead stops promising a chapter that is not there.
    expect(screen.getByText(dict.en.deckSubtitleBuildOnly)).toBeTruthy();
  });

  it('carries the By day door at the foot of the first column', () => {
    const { container } = render(<ProjectsIndex projects={LINEUP} locale="en" />);
    const door = container.querySelector('a.pi-door')!;
    expect(door.getAttribute('href')).toBe('#story');
    expect(door.textContent).toBe(dict.en.workDoor);
    expect(door.closest('section')?.querySelector('h3')?.textContent).toBe(dict.en.workTypeBusiness);
  });

  it('renders nothing for an empty project list', () => {
    expect(renderToStaticMarkup(<ProjectsIndex projects={[]} locale="en" />)).toBe('');
  });

  it('renders Thai group labels and door on /th', () => {
    const { container } = render(<ProjectsIndex projects={LINEUP} locale="th" />);
    const labels = Array.from(container.querySelectorAll('.pi-label')).map((h) => h.textContent);
    expect(labels).toEqual([dict.th.workTypeBusiness, dict.th.workTypeBuild]);
    expect(container.querySelector('a.pi-door')?.textContent).toBe(dict.th.workDoor);
    expect(container.textContent).not.toContain(dict.en.workDoor);
  });

  it('server HTML carries every row, the door and a closed sheet, with nothing hidden inline (Review Focus #4)', () => {
    const html = renderToStaticMarkup(<ProjectsIndex projects={LINEUP} locale="en" />);
    for (const p of LINEUP) {
      expect(html).toContain(`href="#work/${projectKey(p)}"`);
      expect(html).toContain(`>${p.name}`);
    }
    expect(html).toContain('href="#story"');
    expect(html).toContain('<dialog class="sheet" aria-labelledby="sheet-name"></dialog>');
    expect(html).not.toMatch(/style="[^"]*opacity:\s*0/);
  });

  it('opens the sheet in place when a row is clicked', () => {
    const { container } = render(<ProjectsIndex projects={LINEUP} locale="en" />);
    fireEvent.click(rowOf(container, 'aje'));
    expect(window.location.hash).toBe('#work/aje');
    const dialog = container.querySelector('dialog.sheet') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('h2')?.textContent).toBe('Aje');
  });
});

// S-7 (carried from P2 T1): a Thai-only name with no story slug gives projectKey('') -- "#work/"
// isn't even parseable. The row must still render (name, question, everything else), just with no
// working sheet link: rendering `#work/` would be a link to nothing, worse than no link at all.
describe('ProjectsIndex: a Thai-only project with no slug (S-7)', () => {
  it('renders the row whole but without a #work/ link', () => {
    const thaiOnly = makeProject({
      id: 'fx-thai-only',
      name: 'ไทยล้วน',
      slug: null,
      order: 1,
      question: { en: 'q', th: 'คำถาม' },
    });
    expect(projectKey(thaiOnly)).toBe('');
    const { container } = render(<ProjectsIndex projects={[thaiOnly]} locale="th" />);
    // A link to "#work/" would go nowhere parseable (sheet-url's SHEET_RE rejects it) -- no link
    // at all, rather than a dead one, and every other bit of the row still renders.
    expect(container.querySelector('a.pi-row')).toBeNull();
    expect(container.textContent).toContain('ไทยล้วน');
    const row = container.querySelector('.pi-row')!;
    expect(row.tagName).not.toBe('A');
    expect(() => fireEvent.click(row)).not.toThrow();
    expect(window.location.hash).toBe('');
    expect(container.querySelector('dialog.sheet')?.hasAttribute('open')).toBe(false);
  });
});

describe('ProjectsIndex: shared-element View Transition + hover lift (polish A07)', () => {
  it('gives every row thumbnail the data-vt="shot" contract ProjectSheet reads to find it', () => {
    const { container } = render(<ProjectsIndex projects={LINEUP} locale="en" />);
    for (const p of LINEUP) {
      expect(thumbOf(container, projectKey(p)).getAttribute('data-vt')).toBe('shot');
    }
  });

  it('opens and closes the sheet from a row when document.startViewTransition is undefined, returning focus to the row', () => {
    expect(document.startViewTransition).toBeUndefined(); // jsdom has none -- the real fallback case
    const { container } = render(<ProjectsIndex projects={LINEUP} locale="en" />);
    const link = rowOf(container, 'gonai');
    fireEvent.click(link);
    const dialog = container.querySelector('dialog.sheet') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: dict.en.sheetClose }));
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(link);
  });

  it('the thumbnail hover lift lives inside @media (hover: hover) and only transform/opacity animate -- the shadow value itself never does', () => {
    const css = readFileSync('src/components/projects-index.css', 'utf8');
    const hoverBlock = mediaBlock(css, '@media (hover: hover)');
    expect(hoverBlock).toContain('.pi-row:hover .pi-thumb { transform: translateY(-3px); }');
    expect(hoverBlock).toContain('.pi-row:hover .pi-thumb::before { opacity: 1; }');
    // The lift's shadow is a fixed value; only its opacity transitions (never box-shadow itself).
    expect(css).toMatch(/\.pi-thumb::before\s*\{[^}]*box-shadow:\s*var\(--e2\);[^}]*\}/);
    expect(css).not.toMatch(/transition:\s*box-shadow/);
  });

  // Wave-2 merge reconciliation (f), from the T11 review: a keyless row (S-7) renders as a plain
  // <div class="pi-row">, so the hover tint, lift and shadow belong to link rows only -- a div
  // that tints under the pointer reads as clickable and isn't.
  it('keeps the hover tint, lift and shadow on link rows (a.pi-row) only', () => {
    const css = readFileSync('src/components/projects-index.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const hoverBlock = mediaBlock(css, '@media (hover: hover)');
    expect(hoverBlock).toContain('a.pi-row:hover { background: var(--mist); }');
    expect(hoverBlock).toContain('a.pi-row:hover .pi-thumb { transform: translateY(-3px); }');
    expect(hoverBlock).toContain('a.pi-row:hover .pi-thumb::before { opacity: 1; }');
    expect(css).not.toMatch(/(^|[^a])\.pi-row:hover/m);
  });
});
