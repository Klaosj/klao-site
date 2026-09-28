// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectSheet from '@/components/ProjectSheet';
import { dict } from '@/lib/dictionary';
import type { Locale, Project } from '@/lib/models';
import { stubDialog } from './helpers/dialog';
import { installFakeIO } from './helpers/io';
import { AJE, GONAI, KLAO_SITE, LINEUP, TALATIFY, TRIPEDIA, makeProject } from './helpers/lineup';
import { stubMatchMedia } from './helpers/media';
import { stubViewTransition } from './helpers/view-transition';

// Ruling C-11: every test file stubs matchMedia/IntersectionObserver in beforeEach, even one
// that (like this file, mostly) doesn't touch either directly -- it's the repo convention (see
// tests/hero.test.tsx). matchMedia is P1's shared stubMatchMedia (swapped in at the wave-2
// merge, once tests/helpers/media.ts existed); the observer is P1's shared FakeIO. Dialog is
// P1's stand-in, not a third re-inlined copy.
beforeEach(() => {
  stubMatchMedia();
  installFakeIO();
  stubDialog();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/en');
  // A07: never leaves a fake startViewTransition behind for the next test.
  delete (document as Partial<Document>).startViewTransition;
});

// Opens a sheet the way a shared link does: the URL carries the hash on load.
function openAt(key: string, locale: Locale = 'en', projects: Project[] = LINEUP) {
  window.history.replaceState(null, '', `/${locale}#work/${key}`);
  const { container } = render(<ProjectSheet projects={projects} locale={locale} />);
  const dialog = container.querySelector('dialog.sheet') as HTMLDialogElement;
  expect(dialog.open).toBe(true);
  return dialog;
}

const texts = (root: Element, selector: string) => Array.from(root.querySelectorAll(selector)).map((n) => n.textContent);

describe('ProjectSheet content', () => {
  it('GoNai: kicker, name, question, what it is, status, stack, green Open app, and its address bar', () => {
    const dialog = openAt('gonai');
    expect(dialog.querySelector('.sheet-kick')?.textContent).toBe(GONAI.kicker!.en);
    expect(dialog.querySelector('h2#sheet-name')?.textContent).toBe('GoNai');
    expect(dialog.querySelector('.sheet-q')?.textContent).toBe(GONAI.question!.en);
    // No outcomes on GoNai, so that heading is absent rather than empty.
    expect(texts(dialog, '.sbody h3')).toEqual([dict.en.sheetWhat, dict.en.sheetStatus, dict.en.sheetStack]);
    expect(dialog.querySelector('.sheet-desc')?.textContent).toBe(GONAI.description.en);
    expect(dialog.querySelector('.st-chip')?.textContent).toBe(GONAI.status!.en);
    expect(texts(dialog, '.sheet-chips span')).toEqual(GONAI.stack);
    const open = within(dialog).getByRole('link', { name: dict.en.workOpenApp });
    expect(open.getAttribute('href')).toBe(GONAI.liveUrl);
    expect(open.getAttribute('target')).toBe('_blank');
    expect(open.getAttribute('rel')).toContain('noreferrer');
    expect(open.className).toContain('sheet-gonai');
    const media = dialog.querySelector<HTMLElement>('[data-media="win"]')!;
    expect(media.querySelector('.sheet-bar span')?.textContent).toBe('gonai-three.vercel.app');
    expect(media.querySelector('img')?.getAttribute('alt')).toBe(GONAI.alt!.en);
    expect(media.style.getPropertyValue('--wash')).toBe('var(--w-gonai)');
    // A07: the "before" side of the open->close shared-element transition (T10's own contract).
    expect(media.getAttribute('data-vt')).toBe('shot');
  });

  it('Tripedia: the five→one drawing with its alt text, outcomes, no links, and the lineage card', () => {
    const dialog = openAt('tripedia');
    const art = dialog.querySelector('[data-media="five"] [role="img"]');
    expect(art?.getAttribute('aria-label')).toBe(TRIPEDIA.alt!.en);
    expect(art?.querySelector('svg')).toBeTruthy();
    expect(texts(dialog, '.sheet-list li')).toEqual(TRIPEDIA.outcomes.en);
    expect(dialog.querySelector('.sheet-links')).toBeNull();
    expect(dialog.querySelector('.lin h3')?.textContent).toBe(dict.en.lineageTitle);
    const table = dialog.querySelector('.lin table')!;
    expect(texts(table, 'thead th')).toEqual([dict.en.lineageRowHead, '2022 · Tripedia', '2026 · GoNai']);
    expect(table.querySelector('thead th')?.getAttribute('scope')).toBe('col');
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    expect(rows.map((r) => r.querySelector('th')?.textContent)).toEqual([
      dict.en.lineageQuestion,
      dict.en.lineageExisted[0],
      dict.en.lineageTeam[0],
      dict.en.lineageResult[0],
    ]);
    expect(rows[0].querySelector('th')?.getAttribute('scope')).toBe('row');
    expect(texts(rows[0], 'td')).toEqual([TRIPEDIA.question!.en, GONAI.question!.en]);
    expect(texts(rows[2], 'td')).toEqual([dict.en.lineageTeam[1], dict.en.lineageTeam[2]]);
  });

  it('GoNai carries the same lineage card from the other end', () => {
    const dialog = openAt('gonai');
    expect(texts(dialog, '.lin thead th').slice(1)).toEqual(['2022 · Tripedia', '2026 · GoNai']);
  });

  it('Talatify: the rings drawing, outcomes, no lineage and no links', () => {
    const dialog = openAt('talatify');
    expect(dialog.querySelector('[data-media="rings"] [role="img"]')?.getAttribute('aria-label')).toBe(TALATIFY.alt!.en);
    expect(texts(dialog, '.sheet-list li')).toEqual(TALATIFY.outcomes.en);
    expect(dialog.querySelector('.lin')).toBeNull();
    expect(dialog.querySelector('.sheet-links')).toBeNull();
  });

  it('klao-site: the Notion row vignette with its within-the-hour note, and both links', () => {
    const dialog = openAt('klao-site');
    const win = dialog.querySelector('[data-media="notion"] [role="img"]');
    expect(win?.getAttribute('aria-label')).toBe(KLAO_SITE.alt!.en);
    expect(texts(dialog, '.sheet-notion-row b')).toEqual(['Name', 'Type', 'Stack', 'Status']);
    expect(texts(dialog, '.sheet-notion-row span')).toEqual(['klao-site', 'Build', 'Next.js · Notion API · Vercel', KLAO_SITE.status!.en]);
    expect(dialog.querySelector('.sheet-note')?.textContent).toBe(dict.en.sheetNotionNote);
    const code = within(dialog).getByRole('link', { name: dict.en.viewCode });
    expect(code.getAttribute('href')).toBe(KLAO_SITE.repoUrl);
    expect(code.className).toContain('btn-out');
    expect(within(dialog).getByRole('link', { name: dict.en.workOpenApp }).className).not.toContain('sheet-gonai');
  });

  it('Aje: a plain screenshot window without an address bar, on its own wash', () => {
    const dialog = openAt('aje');
    const media = dialog.querySelector<HTMLElement>('[data-media="img"]')!;
    expect(media.querySelector('.sheet-bar')).toBeNull();
    const img = media.querySelector('img')!;
    expect(img.getAttribute('src')).toBe(AJE.imageSrc);
    expect(img.getAttribute('alt')).toBe(AJE.alt!.en);
    // S-5: the real file (public/images/aje.jpg) is 1580x900, not the brief's nominal 1600x900 --
    // checked directly (`sips -g pixelWidth -g pixelHeight`), so the CLS reservation is exact.
    expect(img.getAttribute('width')).toBe('1580');
    expect(img.getAttribute('height')).toBe('900');
    expect(media.style.getPropertyValue('--wash')).toBe('var(--w-aje)');
  });

  it('links the long-form story when the project has a slug', () => {
    const storied = LINEUP.map((p) => (p.name === 'Aje' ? { ...p, slug: 'aje-story' } : p));
    const dialog = openAt('aje-story', 'en', storied);
    expect(within(dialog).getByRole('link', { name: dict.en.readStory }).getAttribute('href')).toBe('/en/work/aje-story');
  });

  it('renders Thai copy on /th, with the | break mark consumed', () => {
    const dialog = openAt('tripedia', 'th');
    expect(dialog.querySelector('.sheet-q')?.textContent).toBe(TRIPEDIA.question!.th.replace(/\|/g, ''));
    expect(texts(dialog, '.sbody h3')).toContain(dict.th.sheetWhat);
    expect(dialog.querySelector('.lin h3')?.textContent).toBe(dict.th.lineageTitle);
    expect(texts(dialog, '.lin tbody tr:first-child td')[0]).toBe(TRIPEDIA.question!.th.replace(/\|/g, ''));
    expect(dialog.textContent).not.toContain(dict.en.sheetWhat);
  });

  // Wave-2 merge reconciliation (e): the four .sbody h3 headings go through ThaiText like the
  // lineage card's h3, so a keep-list word stays whole and a `|` break mark is consumed. Today's
  // Thai labels happen to hold neither, so the copy is swapped for one that does (and restored).
  it('renders the .sbody h3 headings through ThaiText keep-runs on /th', () => {
    const saved = { ...dict.th };
    const labels = ['sheetWhat', 'sheetStatus', 'sheetOutcomes', 'sheetStack'] as const;
    try {
      for (const k of labels) dict.th[k] = `${saved[k]}|เครื่องมือ`;
      const dialog = openAt('tripedia', 'th');
      const heads = Array.from(dialog.querySelectorAll('.sbody h3'));
      // Tripedia has a status and outcomes but no stack, so three of the four render.
      expect(heads.map((h) => h.textContent)).toEqual([
        `${saved.sheetWhat}เครื่องมือ`,
        `${saved.sheetStatus}เครื่องมือ`,
        `${saved.sheetOutcomes}เครื่องมือ`,
      ]);
      // `|` keeps the text on each side whole: two keep-runs per heading, a <wbr> between them.
      heads.forEach((h, i) => {
        expect(texts(h, '.nw')).toEqual([saved[labels[i]], 'เครื่องมือ']);
        expect(h.querySelector('wbr')).not.toBeNull();
      });
    } finally {
      Object.assign(dict.th, saved);
    }
  });

  // Fix wave finding 5 (I2): description, outcomes and lineage cells now route through ThaiText,
  // like the .sbody h3 headings above -- each assertion below leans on fixture Thai copy that
  // already carries a THAI_KEEP/date/unit match, rather than monkey-patching the dictionary.
  it('routes the description through ThaiText keep-runs on /th (GoNai: "งบประมาณ")', () => {
    const dialog = openAt('gonai', 'th');
    expect(texts(dialog, '.sheet-desc .nw')).toContain('งบประมาณ');
  });

  it('routes each outcome through ThaiText keep-runs on /th (Talatify: "37 ล้านบาท")', () => {
    const dialog = openAt('talatify', 'th');
    expect(texts(dialog, '.sheet-list li .nw')).toContain('37 ล้านบาท');
  });

  it('routes the lineage cells through ThaiText keep-runs on /th (Result row: "ส.ค. 2026")', () => {
    const dialog = openAt('gonai', 'th');
    expect(texts(dialog, '.lin td .nw')).toContain('ส.ค. 2026');
  });

  // Re-review N4: the assertion above only exercised the later (b) column. dict.th.lineageResult
  // has both dictionary and fixture-free -- "รอบ 30 ทีมสุดท้ายจาก 500" (the earlier/Tripedia
  // value) already carries "30 ทีม" (digit + the "ทีม" unit word), so the earlier <td> gets its
  // own real keep-run match without needing to inject fixture copy.
  it('routes the earlier lineage column through ThaiText too, not just the later one (re-review N4)', () => {
    const dialog = openAt('gonai', 'th');
    const resultRow = Array.from(dialog.querySelectorAll('.lin tbody tr')).find((tr) => tr.querySelector('th')?.textContent === dict.th.lineageResult[0])!;
    expect(resultRow).toBeTruthy();
    // The row's <th> is its own first child, so the two <td>s are indexed directly rather than
    // via :first-child/:last-child (which would match neither -- the <th> holds that place).
    const [earlierCell, laterCell] = Array.from(resultRow.querySelectorAll('td'));
    expect(texts(earlierCell, '.nw')).toContain('30 ทีม'); // earlier (Tripedia)
    expect(texts(laterCell, '.nw')).toContain('ส.ค. 2026'); // later (GoNai)
  });

  it('a pre-migration row (no kicker, status, outcomes or screenshot) still opens whole', () => {
    const bare = makeProject({ id: 'fx-bare', name: 'Bare', imageSrc: null, media: 'win', description: { en: 'Only the old fields.', th: 'มีแค่ฟิลด์เดิม' } });
    const dialog = openAt('bare', 'en', [bare]);
    expect(dialog.querySelector('.smedia')).toBeNull();
    expect(dialog.querySelector('.sheet-kick')).toBeNull();
    expect(dialog.querySelector('.st-chip')).toBeNull();
    expect(dialog.querySelector('.sheet-list')).toBeNull();
    expect(dialog.querySelector('h2')?.textContent).toBe('Bare');
    expect(dialog.querySelector('.sheet-desc')?.textContent).toBe('Only the old fields.');
  });

  it('the close transition (A07) has T10’s own media to reverse into the row thumbnail', async () => {
    // Complements the fallback-only case already covered in tests/project-sheet.test.tsx: with a
    // media block that carries [data-vt="shot"], the reverse transition fires (2 starts, not 1)
    // and clears both sides' names once it settles -- the carry-over this task closes out.
    stubMatchMedia((q) => q.includes('no-preference'));
    const start = stubViewTransition();
    function PageWithThumbs() {
      return (
        <>
          <a href="#work/gonai" data-sheet="gonai">
            <img data-vt="shot" src="/thumb.jpg" alt="" />
            GoNai
          </a>
          <ProjectSheet projects={LINEUP} locale="en" />
        </>
      );
    }
    const { container } = render(<PageWithThumbs />);
    const link = within(container).getByText('GoNai', { selector: 'a' });
    const thumb = link.querySelector('img') as HTMLImageElement;
    fireEvent.click(link);
    const dialog = container.querySelector('dialog.sheet') as HTMLDialogElement;
    const media = dialog.querySelector<HTMLElement>('[data-vt="shot"]');
    expect(media).toBeTruthy(); // T10's own sheet media, not the row thumbnail
    await waitFor(() => expect(thumb.style.viewTransitionName).toBe(''));
    fireEvent.click(within(dialog).getByRole('button', { name: dict.en.sheetClose }));
    expect(start).toHaveBeenCalledTimes(2); // the open, then the close -- no CSS fallback needed
    expect(dialog.classList.contains('closing')).toBe(false);
    expect(dialog.open).toBe(false);
    expect(media!.style.viewTransitionName).toBe('');
    await waitFor(() => expect(thumb.style.viewTransitionName).toBe(''));
    expect(document.activeElement).toBe(link);
  });
});
