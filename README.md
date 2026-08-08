# klao-site

## Local development

`npm run build` runs `next build --turbopack`, not the webpack builder. This
is required on this checkout: Next's webpack builder generates code for
metadata-route files (`sitemap.ts`, `robots.ts`, `icon.svg`, etc.) by
splicing the file's absolute path into a single-quoted JS string without
escaping it, and that path contains an apostrophe (`Klao's Workspace`) —
which breaks the generated module's syntax and fails the build. Turbopack
doesn't go through that loader, so it isn't affected.

`npm run build:webpack` (plain `next build`) is kept as a fallback. It works
from a checkout at a path with no apostrophe; it will fail here for the
reason above.
