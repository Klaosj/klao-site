import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// White Edition P0 pointed the dark theme's colour names at the new tokens
// (dark→canvas, peri→kram, soft→ink-2, …) so pages nobody had rebuilt yet
// kept rendering. P5 moved every usage to the C1 names and deleted that
// repoint. In Tailwind v4 a utility exists only while its token does, so an
// old name typed from memory would ship unstyled with no error — this test
// fails first instead.
//
// `line` and `card` are NOT legacy: C1 kept both names (border-line, bg-card).
// `ink` counts only bare (`text-ink`), never `text-ink-1`.
const LEGACY = [
  'on-dark-soft', 'on-dark-faint', 'on-dark-mid', 'on-dark',
  'on-light-soft', 'on-light-faint', 'on-light',
  'peri-deep', 'peri', 'dark', 'deep', 'light', 'paper', 'ink', 'soft',
].join('|');
const PREFIX = 'bg|text|border(?:-[trblxyse])?|divide|ring(?:-offset)?|outline|fill|stroke|from|via|to|decoration|shadow|placeholder|caret|accent';
const UTILITY = new RegExp(`(?<![\\w-])(?:${PREFIX})-(?:${LEGACY})(?![\\w-])`, 'g');
const CSS_VAR = new RegExp(`--color-(?:${LEGACY})(?![\\w-])`, 'g');

// All of src/, globals.css included: the repoint is gone (P5 Task 7), so a
// legacy name anywhere is a bug.
const SCAN = ['src'];

function files(p: string): string[] {
  if (!statSync(p).isDirectory()) return [p];
  return readdirSync(p, { withFileTypes: true }).flatMap((e) => files(join(p, e.name)));
}

function hits(text: string): string[] {
  return [...text.matchAll(UTILITY), ...text.matchAll(CSS_VAR)].map((m) => m[0]);
}

describe('legacy colour tokens', () => {
  it('recognises every legacy form and none of the C1 names', () => {
    const legacy = ['text-soft', 'hover:text-ink', 'border-on-dark-faint', 'bg-dark/70', 'text-peri-deep', 'bg-paper', 'var(--color-deep)', 'section.bg-light', 'divide-on-light-faint'];
    const current = ['text-ink-1', 'text-ink-2', 'border-line', 'divide-line', 'bg-card', 'bg-canvas', 'bg-mist', 'text-kram', 'bg-kram-hover', 'text-on-kram', 'var(--color-ink-1)', 'var(--line)', '[data-theme="dark"]', 'dark:bg-mist', "pref === 'light'", 'nav-on-light'];
    for (const s of legacy) expect(hits(s), s).not.toEqual([]);
    for (const s of current) expect(hits(s), s).toEqual([]);
  });

  it('appears nowhere in the scanned source', () => {
    const found = SCAN.flatMap(files)
      .filter((f) => /\.(tsx?|css|mjs)$/.test(f))
      .flatMap((f) =>
        readFileSync(f, 'utf8')
          .split('\n')
          .flatMap((line, i) => hits(line).map((h) => `${f}:${i + 1} ${h}`)),
      );
    expect(found, found.join('\n')).toEqual([]);
  });
});
