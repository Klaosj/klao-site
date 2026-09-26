import { slugKey } from './format';
import type { Project } from './models';

// Project sheets live at `#work/<key>` (spec §4 row "#work/<slug>", contract C6). A hash, not a
// route: opening a sheet is a history entry (so Back closes it) while the home page stays one
// static ISR document with no server round trip.

// The key is the project's story slug when it has one, else its name through slugKey
// ("GoNai" -> "gonai"), so every project gets a sheet link, storied or not.
export function projectKey(p: Pick<Project, 'slug' | 'name'>): string {
  return p.slug ?? slugKey(p.name);
}

export function sheetHash(key: string): string {
  return `#work/${key}`;
}

// Strict on purpose (Review Focus #3): lowercase slug characters only, nothing after them.
// "#work/" (empty), "#work/GoNai" (keys are never uppercase) and "#work/a/b" parse to null, so a
// hand-typed or stale link opens nothing instead of guessing. A well-formed key that matches no
// project ("#work/unknown") parses fine; ProjectSheet is what finds no project for it.
const SHEET_RE = /^#work\/([a-z0-9-]+)$/;

export function parseSheetHash(hash: string): string | null {
  const m = SHEET_RE.exec(hash);
  return m ? m[1] : null;
}
