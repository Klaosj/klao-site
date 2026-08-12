import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // Mocks next/font/google, which only produces its real implementation
    // inside Next's own compiler pipeline (see tests/setup.ts for the full
    // rationale) -- without this, any test that transitively imports
    // src/app/[locale]/layout.tsx crashes on import.
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
});
