import { vi } from 'vitest';

// next/font/google only produces its real font-loading implementation
// inside Next's own SWC/webpack/Turbopack compiler pipeline. Run under
// Vitest's plain Node environment the real package resolves to `{}`
// (verified via `node -e "require('next/font/google')"`), so any test that
// imports a module calling Space_Grotesk()/Anuphan() at module scope
// (src/app/[locale]/layout.tsx, Task 5) crashes with "X is not a function"
// the instant it's imported -- even transitively, e.g. tests/smoke.test.tsx
// only imports `generateMetadata` but that still executes the whole module.
//
// This stands in for the compiler transform: it returns the same shape
// layout.tsx destructures (`.variable`), echoing back whatever `variable`
// option was passed so `--font-sg`/`--font-anuphan` resolve to distinct,
// recognizable strings per family instead of colliding on one hardcoded
// name. No test currently asserts on the mocked className/style, so those
// are filled with clearly-fake values rather than anything meant to be
// checked.
function mockGoogleFont(name: string) {
  return (opts: { variable?: string } = {}) => ({
    variable: opts.variable ?? `--font-mock-${name}`,
    className: `mock-google-font-${name}`,
    style: { fontFamily: `mock-${name}` },
  });
}

vi.mock('next/font/google', () => ({
  Space_Grotesk: mockGoogleFont('space-grotesk'),
  Anuphan: mockGoogleFont('anuphan'),
}));
