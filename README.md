# klao-site

Klao's personal brand hub — bilingual (English / Thai), Next.js App Router.
All content (Projects, Writing, Career, Profile) lives in Notion; the site
ships with sample fixture content built in, so it runs out of the box before
Notion is ever connected.

## Run locally

    npm install
    npm run dev

Open http://localhost:3000 (it redirects to `/en`). Works immediately on the
bundled sample content — no environment variables required.

## Connect your Notion content

See [`docs/NOTION_SETUP.md`](docs/NOTION_SETUP.md) — one-time setup, about 15
minutes. Until you do this, the site shows sample content instead of yours;
nothing is broken in the meantime.

## Checks

    npm run check   # tsc --noEmit && eslint . && vitest run

Run this before every commit. It should report 0 errors. (There is exactly
one known, pre-existing warning from `eslint.config.mjs`
(`import/no-anonymous-default-export`) — harness-generated config, left
as-is; it is not a regression.)

## Local development

`npm run build` runs `next build --turbopack`, and `npm run dev` runs
`next dev --turbopack` -- neither uses the webpack builder. This is required
on this checkout: Next's webpack builder generates code for metadata-route
files (`sitemap.ts`, `robots.ts`, `icon.svg`, etc.) by splicing the file's
absolute path into a single-quoted JS string without escaping it, and that
path contains an apostrophe (`Klao's Workspace`) — which breaks the
generated module's syntax and fails the build (and would break `next dev`
the same way, since 15.5.23 defaults dev to webpack too). Turbopack doesn't
go through that loader, so it isn't affected.

`npm run build:webpack` (plain `next build`) is kept as a fallback. It works
from a checkout at a path with no apostrophe; it will fail here for the
reason above. There's no `dev:webpack` equivalent since there's no reason to
run dev without Turbopack anywhere this fails. On Vercel's build checkout
(no apostrophe in the path), `build:webpack` works fine and is available as
a fallback if Turbopack ever misbehaves there — see
[`docs/DEPLOY.md`](docs/DEPLOY.md).

## Deploy

See [`docs/DEPLOY.md`](docs/DEPLOY.md) for the exact steps: GitHub repo,
Vercel import, required environment variables (in particular
`NEXT_PUBLIC_SITE_URL`, which must be set before the first build), and
post-deploy verification. Content updates need no redeploy — the site
re-reads Notion hourly via ISR.
