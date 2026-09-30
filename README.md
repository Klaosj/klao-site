# klao-site

Klao's personal brand hub — bilingual (English / Thai), Next.js App Router.
All content (Projects, Writing, Career, Profile, By day, FAQ) lives in Notion; the site
ships with sample fixture content built in, so it runs out of the box before
Notion is ever connected.

## Run locally

    npm install
    npm run dev

Open http://localhost:3000 (it redirects to `/en`). It runs on the bundled
sample content — no environment variables required.

## Connect your Notion content

See [`docs/NOTION_SETUP.md`](docs/NOTION_SETUP.md) — one-time setup, about 15
minutes. Until you do this, the site shows sample content instead of yours;
nothing is broken in the meantime.

## Screenshots (project images)

Each project's image comes from the `Screenshot` files property on its row in the Notion
**Projects** database. The site serves it through `/api/img/page/<row-id>/Screenshot`, so
replacing the file in Notion changes the live site within the hour — no deploy.

- **Size:** capture 2560 px wide at about 16:9 without the scrollbar (the site's own files are
  1580×900) and export a JPEG of ≤ 250 KB (the budget for every image on the site). Every
  frame crops with `object-fit: cover`, centred, so a taller capture loses the app's header.
- **Home-page tour:** projects with the `Tour` checkbox ticked play in the hero tour, in
  `TourOrder` order. Until any row is ticked, every project with a screenshot plays, by
  `Order`. A project without a screenshot can still sit in the Projects index — give it a
  `Media` drawing (`notion`, `rings`, `five`); see `docs/NOTION_SETUP.md`.
- **Fallback copies:** `src/content/fixtures/projects.json` points at `public/images/*` for
  local dev and every test run. When you change a screenshot in Notion, drop the same file in
  `public/images/`, update that row's `imageSrc` if the filename changed, and describe what
  the picture shows in `src/lib/image-alt.ts` — never the project name, which is already
  visible text beside the image. `tests/image-alt.test.ts` fails if either half is missing.
- **Product clips** (a ≤ 5 s clip over the screenshot in a sheet) are bundled in `public/clips/`, not Notion: see [`docs/superpowers/specs/2026-09-30-sheet-clips.md`](docs/superpowers/specs/2026-09-30-sheet-clips.md).

## Checks

    npm run check   # tsc --noEmit && eslint . && vitest run

Run this before every commit. It should report 0 errors. (There is exactly
one known, pre-existing warning from `eslint.config.mjs`
(`import/no-anonymous-default-export`) — harness-generated config, left
as-is; it is not a regression.)

### Browser QA (the White Edition matrix)

    npm run qa:self                  # checks the checks on planted faults, no server needed: "self-test ok (22 checks)"
    npm run build && npm run start   # then, in a second terminal:
    npm run qa                       # 16 combinations + 4 narrow checks against http://localhost:3000
    npm run qa "https://<preview>/?_vercel_share=<token>"   # or any other base URL
    npm run qa -- --only=pages       # one part only: matrix, probes or pages

`npm run qa` loads the home page at 1440×900 and 390×844, in EN and TH,
light and dark, motion on and reduced (16 combinations), plus two narrower
widths — 360×780 and 320×568, EN/TH, light, motion on (4 more lines) — that
check everything except page length (the spec sets that budget at 1440/390
only). It also runs 7 probes (Auto theme in light and dark, blocked
storage, bad `#work/` links, an EN→TH switch that keeps the section and the
theme, no JavaScript, a ⌘K that sends nothing) and the standalone pages
(`/projects`, `/writing`, the `/career` redirect, and the 404 in English and
Thai), each in light and dark at 1440 and 390. It fails on console errors,
sideways scroll, text under 14 px on phones, tap targets under 24 px,
content left hidden, low contrast, layout shift over 0.05, the wrong theme
or a flash of it, Thai lines that start with a vowel or tone mark, and
pages longer than 8.6 screens (desktop) or 12 (phone), measured with By day
on Short. A Thai or reduced-motion line over that length doesn't fail: it
is marked `[R15: …]` and counted on the last line, to be reported rather
than fixed by cutting space. It prints one line per combination, exits 1
when anything fails, and writes screenshots and `summary.txt` to
`/tmp/klao-qa/` (or `$QA_OUT`).

Playwright is not a dependency of this repo. The scripts use
`$PLAYWRIGHT_PATH` (a `…/node_modules/playwright/index.mjs`), else a
resolvable `playwright`, else the copy `npx playwright --version` leaves in
`~/.npm/_npx/`, and drive your installed Chrome (`QA_CHANNEL=bundled` uses
Playwright's own Chromium). Vercel previews sit behind Vercel's login — pass
a share link as the base URL.

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
