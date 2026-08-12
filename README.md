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
`next dev --turbopack`. `npm run build:webpack` (plain `next build`) is the
fallback builder; both pass locally. Vercel can use either — see
[`docs/DEPLOY.md`](docs/DEPLOY.md) if Turbopack ever misbehaves there.

(Historical note: until 2026-08-12 this checkout lived under a folder named
`Klao's Workspace`, and Next's webpack builder splices the absolute path
into a single-quoted JS string when generating metadata-route modules
(`sitemap.ts`, `robots.ts`, `icon.svg`) — the apostrophe broke the
generated syntax and failed every local webpack build. Turbopack doesn't
use that loader, which is why it became the default here. The folder
rename fixed webpack locally, and there was never a reason to add a
`dev:webpack` script.)

## Deploy

See [`docs/DEPLOY.md`](docs/DEPLOY.md) for the exact steps: GitHub repo,
Vercel import, required environment variables (in particular
`NEXT_PUBLIC_SITE_URL`, which must be set before the first build), and
post-deploy verification. Content updates need no redeploy — the site
re-reads Notion hourly via ISR.
