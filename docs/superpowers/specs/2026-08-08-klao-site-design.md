# klao-site — Personal Brand Hub: Design Spec

**Date:** 2026-08-08
**Owner:** Klao (Suwichak Jarunopratamp)
**Status:** Draft for review

## 1. Purpose

A long-lived personal brand hub — the home base for who Klao is: BD × Data
Analytics professional who ships his own tools. Not a conversion page; an
identity page. Developed and previewed locally on macOS first, then deployed
to Vercel.

**North-star requirement (Klao's words):** updating the site must be easy —
all content is configured in one place (Notion), never in code.

## 2. Confirmed decisions

| Decision | Choice |
|---|---|
| Audience | Personal brand hub (identity-first, not recruiter/client-optimized) |
| Sections | Career story · Builder projects · Writing feed (Ventures excluded) |
| CMS | Notion (4 databases; the only place content is edited) |
| Language | Bilingual EN/TH, route-based (`/en/...`, `/th/...`), EN fallback |
| Visual direction | Clean Editorial — light, typography-first, whitespace |
| Stack | Next.js (App Router) + TypeScript + Tailwind CSS, fresh build |
| Hosting | Vercel free tier; local dev on Mac via `npm run dev` |
| Project root | `Code/klao-site` (this repo) |

## 3. Site structure

Four pages, each existing under `/en` and `/th`:

- **`/` Home** — hero (headline from Profile DB — fixture default:
  "Business developer who builds his own tools" — photo, byline,
  LinkedIn/GitHub/email links, resume PDF download), 3 featured
  projects, 3 latest posts, one-line "Now" strip. All hero text comes
  from the Profile DB, never hardcoded.
- **`/projects`** — grid of all published projects. Card = screenshot,
  name, one-liner, stack tags, links out (live app / GitHub). No detail
  pages in v1.
- **`/writing`** and **`/writing/[slug]`** — post list; post pages render
  Notion page content (headings, paragraphs, lists, images, code, quotes).
- **`/career`** — timeline of roles with quantified wins (commercial
  outcome first, data skills as the edge — per the resume evidence base),
  resume PDF download.

Shared chrome: top nav (KLAO wordmark · Projects · Writing · Career ·
EN/ไทย toggle), minimal footer with socials.

## 4. Content architecture (the "easy config" layer)

### 4.1 Notion databases (Klao edits these; nothing else)

**Projects DB** — `Name` (title) · `DescriptionEN` / `DescriptionTH`
(rich text) · `Stack` (multi-select) · `LiveURL` / `RepoURL` (url) ·
`Screenshot` (files) · `Featured` (checkbox) · `Order` (number) ·
`Published` (checkbox)

**Posts DB** — `TitleEN` / `TitleTH` (title/rich text) · `Slug` (rich
text; one slug shared by both locales — `/en/writing/x` and
`/th/writing/x`) · `Date` (date) · `Tags` (multi-select) · `Published`
(checkbox) · page body = the post itself. Bilingual body rule: a
heading-1 block whose text is exactly `ไทย` splits the page — blocks
above it render as the EN body, blocks below as the TH body; if the
heading is absent, the whole body renders for both locales.

**Career DB** — `Role` (title) · `Company` (rich text) · `Period` (rich
text, e.g. "2023 – present") · `WinsEN` / `WinsTH` (rich text, bullet
lines) · `Order` (number) · `Published` (checkbox)

**Profile DB** (single row) — `Name` · `HeadlineEN` / `HeadlineTH` ·
`BylineEN` / `BylineTH` · `NowEN` / `NowTH` · `Photo` (files) ·
`LinkedIn` / `GitHub` / `Email` (url/email) · `ResumeURL` (url)

Rules: `Published` unchecked → row invisible everywhere (safe drafting).
Empty TH field → EN value shown. Malformed row → skipped with console
warning, never a crash.

### 4.2 Config surface

`.env.local` only: `NOTION_TOKEN`, `NOTION_DB_PROJECTS`,
`NOTION_DB_POSTS`, `NOTION_DB_CAREER`, `NOTION_DB_PROFILE`.
One-time setup; content updates never touch it.

### 4.3 Fixtures

`src/content/fixtures/{projects,posts,career,profile}.json` mirror the
mapped models exactly. With no `NOTION_TOKEN` set, the site runs entirely
on fixtures — the site works on the Mac before Notion is connected, and
fixtures double as mapper test data.

## 5. Technical architecture

- **Content module** `src/lib/notion.ts`: fetches the 4 DBs via
  `@notionhq/client`, maps rows → typed models (`Project`, `Post`,
  `CareerEntry`, `Profile`). Pages consume models only, never raw Notion.
- **Refresh**: ISR `revalidate = 3600` on all pages — Notion edits go
  live within the hour, no deploy. Dev mode fetches fresh per reload.
- **Images**: Notion file URLs expire (~1h). All Notion-hosted images are
  served through a route handler (`/api/img/[blockId]`) that re-resolves
  a fresh URL on demand. Broken/missing image → neutral placeholder.
- **i18n**: `[locale]` route segment (`en` | `th`); middleware redirects
  `/` → `/en`. UI chrome labels from one dictionary file
  (`src/lib/dictionary.ts`); content languages from Notion columns.
- **Error handling**: Notion API failure at revalidate → last good build
  keeps serving (ISR default) with error logged. Total failure with no
  cache (first deploy) → fixtures render as fallback.
- **SEO/meta**: per-page titles/descriptions in both locales, OpenGraph
  tags, `hreflang` pairs, sitemap.xml, favicon.

## 6. Testing

- **Vitest** unit tests for every Notion→model mapper (schema-drift is
  the main silent-failure risk). Fixtures are the test inputs.
- **Smoke test**: all 4 pages render under `/en` and `/th` with fixtures.
- **Gate**: `npm run check` = typecheck + lint + tests; Vercel build must
  pass before a feature is "done".

## 7. Explicitly out of scope (v1)

Contact form · dark mode · comments · analytics · project detail pages ·
RSS · Ventures/brands section · CMS admin UI. All addable later without
rework.

## 8. Execution model (Klao's directive, 2026-08-08)

- **Fable (this session)** — architect: owns this spec and the
  implementation plan.
- **Opus 5 — manager/QA**: reviews each feature against its acceptance
  criteria below, requests fixes, and finalizes ("QA and finalize each
  feature").
- **Sonnet — workers**: implement each feature (`model: sonnet` pinned on
  every worker subagent, per Klao's standing preference).

Flow per feature: Sonnet implements → `npm run check` passes → Opus 5 QA
against acceptance criteria → fixes (Sonnet) → Opus 5 finalizes → next
feature.

## 9. Feature breakdown & acceptance criteria

| # | Feature | Acceptance criteria (QA checklist for Opus 5) |
|---|---|---|
| F1 | Scaffold + layout + fixtures | `npm run dev` serves all 4 pages from fixtures with shared nav/footer, Clean Editorial base styles, no Notion needed |
| F2 | Notion content layer | Mappers for 4 DBs with unit tests; `Published` filter; TH→EN fallback; malformed-row skip logged |
| F3 | i18n routing | `/en`+`/th` for every page; toggle preserves current page; `/` redirects; chrome labels translated |
| F4 | Home page | Hero, 3 featured projects (`Featured` ✓, by `Order`), 3 latest posts, Now strip — all from models |
| F5 | Projects page | Grid of published projects by `Order`; cards link out; screenshots via image proxy |
| F6 | Writing pages | List by `Date` desc; post pages render Notion blocks (headings, lists, images, code, quotes); slugs stable |
| F7 | Career page | Timeline by `Order`; wins render as bullets; resume download link |
| F8 | Polish + SEO | Meta/OG/hreflang/sitemap/favicon; responsive at 375px/768px/1280px; smoke tests pass |
| F9 | Vercel deploy | Production deploy from GitHub repo; env vars set; ISR verified (Notion edit visible ≤1h); custom-domain ready |

## 10. Success criteria (project level)

1. Klao edits a Notion row → localhost shows it on reload; production
   shows it within 1 hour. No code touched.
2. Site runs on a fresh clone with zero setup (fixtures) — one command.
3. All 4 pages correct in both EN and TH, responsive on mobile.
4. Deployed on Vercel free tier, ready for a custom domain.
