import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // Node 25+ ships its own global localStorage (Web Storage API), which is
    // undefined without --localstorage-file and shadows jsdom's window.localStorage,
    // so every storage test failed under Node 26. Workers run without it.
    poolOptions: { forks: { execArgv: ['--no-experimental-webstorage'] } },
  },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
});
