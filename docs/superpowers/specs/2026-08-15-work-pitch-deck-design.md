# Work Pitch Deck — Two Project Types (Design)

**Date:** 2026-08-15
**Status:** Approved (variant C chosen from 3 mockups, owner decision in chat)

## 1. Why

The owner's positioning is business-logic-first, not tech-first. The current
Work section is software-shaped: one flat grid, every project carries
`stack`/`liveUrl`/`repoUrl`, and business work has no home. The owner wants
his OWN projects split into two types — **Business** and **Build** — with
every own project presented big, "like a pitch deck", and the written story
(`/work/[slug]`) as the portfolio itself.

Decisions made during brainstorming (owner-confirmed):

- The two types are both the owner's own projects: `business` (business-logic
  plays: SME Studio, Little Duck, options framework, …) and `build` (shipped
  software: GoNai, AISecretary, DailyBrief, TickerDesk, …).
- **ActMedia work (TWD × Thai Watsadu, Salesforce, Tops) is NOT part of this
  section.** It is already represented by ClientsBand + CvBand (career wins).
  No new ActMedia band. No code change on those bands.
- Of three presented mockups (A two-bands / B chapters / C pitch-deck), the
  owner chose **C — Pitch Deck**: one project = one full-width slide,
  Business slides first, question-led, alternating image side.

## 2. Content model

### Notion (Projects DB — additive only, existing DBs keep mapping)

| New property | Type | Meaning |
|---|---|---|
| `Type` | Select: `Business` / `Build` | Which deck chapter the project belongs to. **Blank/unknown → Build** (back-compat: every existing row keeps rendering unchanged until tagged). |
| `OutcomeEN` | Text | One-line receipt: the real, checkable result. Optional. |
| `OutcomeTH` | Text | Thai outcome; falls back to EN like every other TH field. |

Receipts rule (owner principle "ใบเสร็จทุก claim"): `Outcome*` holds only
real numbers/results. Blank means the line simply doesn't render — never a
placeholder.

### TypeScript (`src/lib/models.ts`)

```ts
export type ProjectType = 'business' | 'build';
// on Project:
type: ProjectType;          // default 'build' in the mapper
outcome: Localized | null;  // null when OutcomeEN is blank
```

`ProjectStory extends Project` picks both up automatically.

Fixtures (`src/content/fixtures/projects.json`): the four real build
projects gain `"type": "build"`, `"outcome": null`. **No fabricated business
fixture** — fixture mode simply renders no Business chapter (empty-group
rule below).

## 3. Homepage rendering — `WorkDeck` (replaces `WorkGrid`)

Section contract preserved: `id="work"` (SiteNav anchor + story-page back
link), `<h2>` eyebrow `t.selectedWork` (WCAG 1.3.1 + smoke test), `bg-dark`,
Reveal entrance per slide.

New deck head: eyebrow + one bilingual subtitle line (`t.deckSubtitle`).

Groups: `business` first, then `build`; within a group, `Order` sorting is
already done by `getProjects()`. **A group with zero projects renders
nothing — no header, no kicker** (fixture mode: Build only).

Each slide (one project, full content width, `md:grid-cols-2`,
image side alternates by global slide index; text column always first in
source order so mobile stacks text → image):

1. Kicker: `B·01 — Business` / `T·01 — Build` (per-group 2-digit counter;
   `B`/`T` prefixes are locale-invariant design marks; the label word comes
   from the dictionary).
2. Question (when present): italic peri lead line. When absent, the slide
   simply starts at the name — the name renders exactly once.
3. Name: `font-display`, ~40px on desktop.
4. Description (localized).
5. Outcome (when present): left-bordered receipt line, both types.
6. Stack (build only, non-empty only): the established `stack.join(' · ')`
   mono line — the site's existing idiom (WorkGrid/story/ProjectCard),
   chosen over the mockup's chip styling for consistency. **A business slide
   never renders stack, even if set in Notion.**
7. Image (when present): `TiltCard`-wrapped, 800×450, lazy, async,
   alt `` `${name} — ${description[locale]}` `` — all unchanged from WorkGrid.

Three-way link contract — unchanged verbatim from WorkGrid/wave 1:
storied (slug) → whole slide is ONE internal `Link` to `/[locale]/work/[slug]`,
no external anchors on the slide; unstoried with URL → external anchor
preferring live over repo, `target="_blank" rel="noreferrer"`, plus the
secondary "View code" sibling when BOTH URLs exist; neither → plain `<div>`.

## 4. Other surfaces

- `/[locale]/projects`: grouped into Business / Build sub-sections reusing
  the same dictionary labels (empty group skipped); page
  description/OG copy updated to cover both types (currently claims
  "software projects" only). `ProjectCard` gates its stack line on
  `type === 'build' && stack.length > 0`.
- `/work/[slug]` receipts footer: stack `<span>` gated on
  `stack.length > 0` (business stories otherwise render an empty flex item
  and a stray gap). Everything else unchanged.
- Slug-last rule (404-trap ruling) unchanged and applies to business
  stories identically.

## 5. Dictionary (both locales, th ≠ en — the test allowlist is empty)

| Key | en | th |
|---|---|---|
| `workTypeBusiness` | `Business` | `ธุรกิจ` |
| `workTypeBuild` | `Build` | `งานสร้างเอง` |
| `deckSubtitle` | `Business first. Every project opens with the question it answers.` | `ธุรกิจมาก่อน — ทุกโปรเจกต์เริ่มจากคำถามที่มันตอบ` |

## 6. Error handling / degradation

- Unknown or blank `Type` select → `'build'` (never a dropped row).
- Blank `OutcomeEN` → `outcome: null` → line not rendered.
- Empty group → chapter not rendered (no empty headers).
- Fixture/ISR fallback semantics in `content.ts` untouched.

## 7. Testing

- Mapper: Type mapping + default, Outcome mapping + null, existing rows
  unaffected.
- `tests/work-deck.test.tsx` replaces `tests/work-grid.test.tsx`, porting
  every contract test (three-way links, img attributes, locale isolation,
  Thai font, question lead/fallback) and adding: group order, kicker
  numbering, empty-group suppression, business-hides-stack,
  outcome-when-present.
- `ProjectCard` stack gating gets its own component test.
- Gate: `npm run check` (tsc + eslint + vitest) and `npm run build`.

## 8. Out of scope

ClientsBand/CvBand (ActMedia representation), story-page layout, Wave 3
craft items, any new Notion database. Content entry (tagging rows, writing
business rows/stories) is the owner's, in Notion — checklist at the end of
the implementation plan.
