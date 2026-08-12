# "Questions" — meta-project design (2026-08-13)

Approved by Klao in brainstorming, 2026-08-13. Supersedes nothing; builds on
the live site (main @ `488e018`, klao-site.vercel.app, Notion CMS with five
databases).

## §1 North star and principles

klao-site is an **identity home** — not a recruiter funnel, not a client
funnel. "สมบูรณ์แบบ" was defined by the owner as: the site shows his real
creative loop, feels alive, and is crafted.

The load-bearing insight (owner's own words): **he works by asking
questions; questions become ideas; ideas become mini-projects.** Every
shipped app already followed that loop — GoNai ("one day in Bangkok, what's
the real budget?"), DailyBrief ("why does reading the morning news take so
long?"), AISecretary ("how much AI am I actually using?"), TickerDesk
("which option do I open before the bell?"). The site currently shows only
the answers (the apps) and hides the engine. This meta-project makes the
loop the spine of the site.

Non-negotiable principles, inherited from the project's history:

1. Content is edited in Notion only. No exceptions, no code edits to
   change words.
2. Every claim carries a receipt. Case studies must contain real numbers.
3. Ship one wave at a time to production. No long-lived branches (the
   wow-pass grew to 32 unmerged commits; never again).
4. The site's existing design language only. New patterns require a reason
   the old ones cannot serve.
5. The honest-tier rule extends to content: a project with no written
   story simply has no story page — no placeholder, no fake.

## §2 Wave 1 — Answered questions (case studies)

### Notion schema (Projects DB, additive — existing rows keep working)

| New property | Type | Meaning |
|---|---|---|
| QuestionEN | Text | The originating question, English |
| QuestionTH | Text | Thai (falls back to EN, `localized()` rule) |
| Slug | Text | URL segment; short, lowercase, hyphenated, unique |

The **case-study body is the Notion page body of the existing Projects
row** — same block pipeline as Posts (`mapBlocks`), same bilingual split on
an H1 that is exactly `ไทย` (`splitBilingual`). Supported blocks, nesting
limits, and silent-skip behavior are identical to Posts and already
documented in NOTION_SETUP.md.

Content template (editorial convention, enforced by habit not code):
**คำถาม → สิ่งที่ลอง → สิ่งที่ได้ (ตัวเลขจริง) → สิ่งที่เรียนรู้**.

### Data layer

- `Project` model gains `question: Localized | null`, `slug: string | null`,
  and story presence is determined at fetch time (a project with a
  non-empty Slug AND a non-empty body is "storied").
- `fetchProjectStory(slug)` mirrors `fetchPostBySlug`: filtered query on
  Slug + Published, then block fetch + bilingual split. Wrapped in
  `fromNotion` with `null` fixture fallback (fixtures carry no stories —
  fixture mode has no case pages, matching principle 5).
- `getProjects()` keeps returning list metadata (now incl. question/slug);
  cache() semantics unchanged.

### Route: `/[locale]/work/[slug]`

- Mirrors `writing/[slug]` structurally: `dynamicParams = true` (stories
  published between deploys must resolve without redeploy), known-slug
  pre-check via the projects list, `assertLocale`, 404 via the existing
  styled boundary.
- Page composition: back link → **the question as the page's h1** (display
  scale; the app name is the eyebrow above it) → story body via `PostBody`
  → receipts footer: stack chips + Live site / View code links (moved here
  from the home card) → next/prev case navigation is OUT of scope (YAGNI).
- Metadata: per-page title = question (template `%s · Klao`), description
  derived from first paragraph via the existing `derivePostDescription`
  helper generalized to accept a body (rename or wrap — implementation
  detail for the plan), canonical, OG `type: 'article'`, site-wide OG
  image pair with per-case alt. Sitemap gains `/work/<slug>` entries with
  the same reciprocal hreflang treatment as posts.
- The existing `/:locale/projects → /:locale#work` redirect stays; `/work`
  without a slug is NOT a page (no index route; the home grid is the index).

### Home card changes (WorkGrid)

- Card shows the question as the lead line when present (display voice —
  a card that asks a question invites a click), name + description move to
  the caption row.
- A storied project's whole card links INTERNALLY to `/work/[slug]`
  (next/link, no target=_blank). External live/repo links leave the home
  page entirely — they live on the case page's receipts footer.
- A project without a story keeps today's exact behavior (external
  primary link or plain div, secondary View-code link when both URLs
  exist).

### Testing (jsdom + the layout-blindness rule)

- Mapper tests: question/slug mapping, storied detection, blank-slug row
  keeps working as a non-storied project (NOT dropped — slug is optional,
  unlike Posts).
- Route tests: metadata derivation, unknown-slug 404, EN fallback for
  empty TH body.
- WorkGrid tests: storied card renders internal link + question; unstoried
  card byte-identical to current assertions.
- Browser verification (orchestrator, both locales, desktop + 390px):
  question typography on card and page, story body rendering with images
  through the proxy, receipts footer links, no horizontal overflow.

### Owner's part (gates the wave's ship)

Write ≥2 stories in Notion (suggested first pair: GoNai, AISecretary — the
two with the strongest numbers), fill QuestionEN/TH + Slug on those rows.

## §3 Wave 2 — Open questions (the living band)

### Notion DB (new): Questions

| Property | Type | Notes |
|---|---|---|
| Question | Title | English text of the question |
| QuestionTH | Text | Thai (EN fallback) |
| Status | Select | `wondering` / `building` / `answered` |
| LinkSlug | Text | when answered: the `/work/` slug it became |
| Date | Date | when the question was born |
| Published | Checkbox | standard visibility switch |

### Band: "คำถามที่ยังไม่มีคำตอบ"

- Home band showing the latest ~3 questions with status `wondering` or
  `building` (building gets a distinct marker). `answered` questions leave
  the band; their `LinkSlug` is available for a "born from a question"
  line on the case page (nice-to-have inside wave 2, not wave 1).
- Exact placement in the band rhythm and full visual design are decided in
  wave 2's own spec, AFTER wave 1 is live — the question cards' final look
  should inform the band. This is a deliberate deferral, not a TBD: the
  data contract above is fixed now; only presentation waits.
- Footer gains an honest freshness line derived from real data (latest of:
  newest post date, newest question date, newest case study). Wording
  bilingual via dictionary.

### Owner's part

Log questions in Notion as they actually occur. No cadence pressure — an
empty band hides itself (ClientsBand rule).

## §4 Wave 3 — Craft pass

Checklist executed with per-item real-browser verification; items may be
re-scoped after waves 1–2 are visible:

1. View transitions (or equivalent soft cross-fade) between home ↔ case
   pages; reduced-motion = instant.
2. Monument tuning: full-draw brightness and hold, judged live by the owner.
3. Work-grid art direction round in the question-forward context, including
   the lone-4th-card row decision.
4. Focus-visible audit across the new flows (card → case → back).
5. Lighthouse on production: a11y and Best Practices stay 100; Performance
   and SEO recorded as the new baseline.

## §5 Process, sequencing, definition of done

- Each wave: spec (waves 2–3 get their own short specs) → plan
  (superpowers:writing-plans) → Sonnet implementers (foreground commands,
  explicit long timeouts, never touch eslint.config.mjs) → Opus review +
  real-browser QA → gates (`npm run check`, both builders, live smoke) →
  ship to main → owner eyeballs production → next wave.
- Wave 1 starts immediately after this spec is approved; its plan is the
  next artifact. Waves 2–3 wait for the preceding wave to be live.
- Done means: live on klao-site.vercel.app, gates green, owner-approved on
  the real site, NOTION_SETUP.md updated for any schema change, and no
  uncommitted scaffolding left in the tree.

## Out of scope (cut against the identity-home north star)

Contact form, analytics, newsletter, RSS, custom domain, comments,
next/prev case navigation, per-case OG image generation. Any of these can
be a future project if the owner asks; none blocks "สมบูรณ์แบบ" as defined
here.
