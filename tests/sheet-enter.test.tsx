// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectSheet, { SheetMedia } from '@/components/ProjectSheet';
import { useEnterOnce } from '@/lib/enter-once';
import type { Locale, Project } from '@/lib/models';
import { projectKey, sheetHash } from '@/lib/sheet-url';
import { stubDialog } from './helpers/dialog';
import { installFakeIO } from './helpers/io';
import { AJE, CAFENISTA, GONAI, KLAO_SITE, LINEUP, TALATIFY, TRIPEDIA } from './helpers/lineup';
import { stubMatchMedia } from './helpers/media';

// "Every sheet moves once" (docs/superpowers/specs/2026-09-30-sheet-clips.md): the three
// sheets without a product clip fill their drawn picture in once, when the sheet has opened.
//   klao-site ('notion'): the Notion row's fields, top to bottom.
//   Talatify ('rings'):   TAM -> SAM -> SOM, outer to inner.
//   Tripedia ('five'):    five grey tiles, the arrow, then GoNai.
// The phase lives on `.smedia` as data-enter; project-sheet.css does the moving.

const ENTER_MS = 500; // ProjectSheet's own ENTER_MS (the sheet's CSS entrance)
const allowMotion = () => stubMatchMedia((q) => q.includes('no-preference'));
// ': reduce', not 'reduce': "prefers-reduced-motion: no-preference" contains "reduce" too.
const reduceMotion = () => stubMatchMedia((q) => q.includes(': reduce'));

const DRAWN: [string, Project, string, string][] = [
  // [media, project, the staged parts' selector, how many]
  ['notion', KLAO_SITE, '.sheet-notion-row', '4'],
  ['rings', TALATIFY, '.sk-step', '3'],
  ['five', TRIPEDIA, '.sk-step', '7'],
];

beforeEach(() => {
  stubMatchMedia(); // default: nothing matches, so motion is NOT allowed
  installFakeIO();
  stubDialog();
  window.history.replaceState(null, '', '/en');
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete (document as Partial<Document>).startViewTransition;
  window.history.replaceState(null, '', '/en');
});

// Opens a sheet the way a shared link does (the URL carries the hash on load).
function openAt(key: string, locale: Locale = 'en') {
  window.history.replaceState(null, '', `/${locale}#work/${key}`);
  const { container } = render(<ProjectSheet projects={LINEUP} locale={locale} />);
  const dialog = container.querySelector('dialog.sheet') as HTMLDialogElement;
  expect(dialog.open).toBe(true);
  return dialog;
}

const media = (dialog: Element) => dialog.querySelector<HTMLElement>('.smedia')!;

describe('server render and no JavaScript: the final picture', () => {
  it.each(DRAWN)('%s: no data-enter, every part present, nothing dimmed in the markup', (_media, project, parts, count) => {
    for (const locale of ['en', 'th'] as const) {
      const html = renderToStaticMarkup(<SheetMedia project={project} locale={locale} />);
      expect(html).not.toContain('data-enter');
      expect(html).not.toMatch(/opacity|translateY|scale\(/);
      const box = document.createElement('div');
      box.innerHTML = html;
      expect(box.querySelectorAll(parts)).toHaveLength(Number(count));
    }
  });

  it('the hook itself starts at rest on the server, even with motion allowed', () => {
    allowMotion();
    function Probe() {
      const phase = useEnterOnce(() => Promise.resolve());
      return <i data-phase={phase} />;
    }
    expect(renderToStaticMarkup(<Probe />)).toBe('<i data-phase="rest"></i>');
  });
});

describe('reduced motion: the final picture straight away, and it stays', () => {
  it.each(DRAWN)('%s', async (_media, project) => {
    reduceMotion();
    vi.useFakeTimers();
    const dialog = openAt(projectKey(project));
    expect(media(dialog).hasAttribute('data-enter')).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ENTER_MS + 1000);
    });
    expect(media(dialog).hasAttribute('data-enter')).toBe(false);
  });

  it('no matchMedia at all counts as "not allowed" too', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(media(openAt('talatify')).hasAttribute('data-enter')).toBe(false);
  });
});

describe('motion allowed: the start state, then the final state once the sheet has opened', () => {
  beforeEach(allowMotion);

  it.each(DRAWN)('%s: "from" on open, still "from" at 499 ms, "go" at 500 ms', async (_media, project) => {
    vi.useFakeTimers();
    const dialog = openAt(projectKey(project));
    // Set in a layout effect, so it is already there on the first paint (no flash of the end).
    expect(media(dialog).getAttribute('data-enter')).toBe('from');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ENTER_MS - 1);
    });
    expect(media(dialog).getAttribute('data-enter')).toBe('from');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(media(dialog).getAttribute('data-enter')).toBe('go');
  });

  it('numbers the Notion rows for the stagger, top to bottom', () => {
    const rows = Array.from(openAt('klao-site').querySelectorAll<HTMLElement>('.sheet-notion-row'));
    expect(rows.map((r) => r.style.getPropertyValue('--i'))).toEqual(['0', '1', '2', '3']);
    expect(rows.map((r) => r.querySelector('b')?.textContent)).toEqual(['Name', 'Type', 'Stack', 'Status']);
  });

  it('plays for the new project when one open sheet moves straight to another', async () => {
    vi.useFakeTimers();
    const dialog = openAt('talatify');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ENTER_MS);
    });
    expect(media(dialog).getAttribute('data-enter')).toBe('go');
    await act(async () => {
      window.location.hash = '#work/tripedia';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(media(dialog).getAttribute('data-media')).toBe('five');
    expect(media(dialog).getAttribute('data-enter')).toBe('from');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ENTER_MS);
    });
    expect(media(dialog).getAttribute('data-enter')).toBe('go');
  });

  it.each([
    ['aje', 'img', AJE],
    ['gonai', 'win', GONAI],
    ['cafenista', 'img', CAFENISTA],
  ] as const)('a screenshot (%s, %s) never gets data-enter: its motion is the clip', async (key, kind, project) => {
    vi.useFakeTimers();
    expect(projectKey(project)).toBe(key);
    const dialog = openAt(key);
    expect(media(dialog).getAttribute('data-media')).toBe(kind);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ENTER_MS);
    });
    expect(media(dialog).hasAttribute('data-enter')).toBe(false);
  });

  it('opening from a row with a View Transition: the "after" snapshot already shows the start state', () => {
    // The morph snapshots the sheet right after its update callback returns; the start state
    // must be in the DOM by then, or the picture would jump from full to dimmed after the morph.
    let atSnapshot: string | null | undefined;
    document.startViewTransition = ((update: () => void) => {
      update();
      atSnapshot = document.querySelector('dialog .smedia')?.getAttribute('data-enter');
      return { ready: Promise.resolve(), finished: Promise.resolve(), updateCallbackDone: Promise.resolve(), skipTransition() {} };
    }) as unknown as Document['startViewTransition'];
    const { container } = render(
      <>
        <a href={sheetHash('klao-site')} data-sheet="klao-site">
          <img data-vt="shot" src="/thumb.jpg" alt="" />
          klao-site
        </a>
        <ProjectSheet projects={LINEUP} locale="en" />
      </>,
    );
    fireEvent.click(container.querySelector('a[data-sheet]')!);
    expect(atSnapshot).toBe('from');
  });
});

describe('project-sheet.css: every sheet moves once', () => {
  const css = readFileSync('src/components/project-sheet.css', 'utf8');
  // The one no-preference block that holds the fill-in (the clip's is a different block).
  const start = css.indexOf('.smedia[data-enter="from"]');
  const open = css.lastIndexOf('@media (prefers-reduced-motion: no-preference) {', start);
  const block = css.slice(open, css.indexOf('\n  }\n', start));
  // The rules inside the block, after its own `@media … {` prelude.
  const rules = [...block.slice(block.indexOf('{') + 1).matchAll(/([^{}]+)\{([^}]*)\}/g)].map((m) => [m[1].trim(), m[2]] as const);

  it('keeps the start state and the transition inside prefers-reduced-motion: no-preference', () => {
    expect(open).toBeGreaterThan(0);
    expect(rules.length).toBe(4);
    for (const [selector] of rules) expect(selector).toMatch(/^\.smedia\[data-enter="(from|go)"\] /);
    // Nowhere else does a rule key off data-enter (comments aside): no JS = no attribute = no rule.
    expect(css.replace(block, '').replace(/\/\*[\s\S]*?\*\//g, '')).not.toContain('data-enter');
  });

  it('dims to .55 at the most (dimmed, never hidden) and moves only a few px or 4 %', () => {
    const from = rules.filter(([s]) => s.includes('"from"')).map(([, body]) => body);
    const opacities = from.flatMap((b) => [...b.matchAll(/opacity:\s*([\d.]+)/g)].map((m) => Number(m[1])));
    expect(opacities).toEqual([0.55]);
    const transforms = from.flatMap((b) => [...b.matchAll(/transform:\s*([^;]+);/g)].map((m) => m[1]));
    expect(transforms).toEqual(['translateY(6px)', 'scale(.96)', 'translateX(-6px)']);
  });

  it('transitions only opacity and transform, on the drift curve, staggered by --i', () => {
    const go = rules.find(([s]) => s.includes('"go"'))![1];
    expect(go).toContain('transition: opacity var(--enter-dur) var(--ease-drift), transform var(--enter-dur) var(--ease-drift);');
    expect(go).toContain('transition-delay: calc(var(--i, 0) * var(--enter-step));');
  });

  it.each([
    ['notion', 4],
    ['rings', 3],
    ['five', 7],
  ] as const)('%s finishes within 900 ms (last delay + duration)', (kind, parts) => {
    const m = css.match(new RegExp(`\\.smedia\\[data-media="${kind}"\\] \\{ --enter-step: (\\d+)ms; --enter-dur: (\\d+)ms; \\}`));
    expect(m, kind).toBeTruthy();
    const [step, dur] = [Number(m![1]), Number(m![2])];
    expect((parts - 1) * step + dur).toBeLessThanOrEqual(900);
    // Notion's fields step about 60 ms apart, as asked.
    if (kind === 'notion') expect(step).toBe(60);
  });

  it('scales an SVG part about its own centre', () => {
    expect(css).toContain('.smedia .sk-step { transform-box: fill-box; transform-origin: center; }');
  });
});
