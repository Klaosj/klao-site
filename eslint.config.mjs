import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  // .superpowers/ is git-ignored scratch: SDD notes and the parallel-lane git
  // worktrees, each a full checkout with its own .next/ build output.
  // .claude/ holds Claude Code's own worktrees (same problem); out/ is a
  // static export's build output. Flat config never reads .gitignore.
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', '.superpowers/**', '.claude/**', 'out/**'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  { rules: { '@next/next/no-img-element': 'off' } },
];
