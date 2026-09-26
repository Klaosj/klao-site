import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Trap (fix wave finding 13): Tailwind's `dark:` variant only ever follows
// the OS's prefers-color-scheme -- it has no idea about this site's stored
// Light/Dark choice or the <html data-theme> attribute the toggle sets, so
// a `dark:bg-...` utility would silently stop following the site's actual
// theme (the Auto/Light/Dark control, Auto-on-a-light-Mac, etc). Every
// themed colour here instead goes through the --token custom properties in
// src/app/globals.css, which DO react to data-theme. This guards that no
// `dark:` utility class ever creeps back into a component.
function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

describe('no Tailwind dark: variant anywhere in src/ (fix wave finding 13)', () => {
  it('never uses a dark:<utility> class', () => {
    // Tailwind's variant has no space after the colon ("dark:bg-mist",
    // "dark:hidden"); a TypeScript object key or parameter name written
    // the normal way ("dark: boolean", "dark: t.themeDark") always does,
    // so this cannot mistake one for the other.
    const variant = /\bdark:[a-z0-9[]/;
    const files = walk('src').filter((f) => /\.(ts|tsx)$/.test(f));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const body = readFileSync(file, 'utf8');
      expect(variant.test(body), file).toBe(false);
    }
  });
});
