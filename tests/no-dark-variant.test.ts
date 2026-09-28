import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
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

// T18-c (CO-16): the old guard was one regex over the whole file, and it
// told a class from a TypeScript object key only by the space the key
// usually has after its colon -- `{ dark: t.themeDark }` passed, but the
// same key written `{dark:true}` failed the build, and a comment quoting a
// class failed it too. Tailwind classes only ever live in string text, so
// this reads the file with the TypeScript parser and checks string
// literals and template-literal text only. Inside that text a variant is
// `dark:` at the start of a class (after a space, the quote, or another
// variant's colon, as in `md:dark:hidden`) followed by the utility itself.
const VARIANT = /(?:^|[\s:])dark:\S/;

function darkVariants(source: string, file = 'x.tsx'): string[] {
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const root = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, false, kind);
  const hits: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      (ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node)) &&
      VARIANT.test(node.text)
    ) {
      hits.push(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return hits;
}

describe('the dark: variant detector (T18-c, CO-16)', () => {
  it('finds a dark: class in a className string, a class helper call and a template literal', () => {
    expect(darkVariants('const a = <div className="p-4 dark:bg-mist" />;')).toEqual(['p-4 dark:bg-mist']);
    expect(darkVariants("const b = cn('md:dark:hidden', x);")).toEqual(['md:dark:hidden']);
    // Review m5 (ME): a class string that starts with the variant.
    expect(darkVariants("const e = cn('dark:hidden', x);")).toEqual(['dark:hidden']);
    expect(darkVariants('const c = `px-2 dark:text-${tone}`;')).toEqual(['px-2 dark:text-']);
    expect(darkVariants('const d = `${base} dark:ring-1`;')).toEqual([' dark:ring-1']);
  });

  it('leaves object keys, parameters and comments alone, with or without a space', () => {
    const code = [
      'const labels = { dark: t.themeDark, light: t.themeLight };',
      'const flags = {dark:true, light:false};',
      'function paint(dark: boolean) { return dark; }',
      '// a comment may quote dark:bg-mist without shipping it',
      "const note = 'dark: the theme';",
    ].join('\n');
    expect(darkVariants(code, 'x.ts')).toEqual([]);
  });
});

describe('no Tailwind dark: variant anywhere in src/ (fix wave finding 13)', () => {
  it('never uses a dark:<utility> class', () => {
    const files = walk('src').filter((f) => /\.(ts|tsx)$/.test(f));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(darkVariants(readFileSync(file, 'utf8'), file), file).toEqual([]);
    }
  });
});
