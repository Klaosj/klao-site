import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  // .superpowers/ is git-ignored scratch: SDD notes and the parallel-lane git
  // worktrees, each a full checkout with its own .next/ build output.
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', '.superpowers/**'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  { rules: { '@next/next/no-img-element': 'off' } },
];
