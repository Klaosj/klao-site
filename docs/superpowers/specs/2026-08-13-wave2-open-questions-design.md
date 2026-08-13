# Wave 2 — Open questions (the living band) design (2026-08-13)

Wave 2 of the Questions meta-project. The parent spec
(`2026-08-13-questions-meta-project-design.md` §3) fixed the data contract
on approval day; this short spec makes the presentation decisions it
deliberately deferred until wave 1 was live. Wave 1 shipped to production
earlier today (`6e19f5f`, question-forward cards verified live on
klao-site.vercel.app), so the question cards' final look is now a known
quantity this band is designed against.

## §1 What ships

1. A **Questions database** in Notion (created under the klao-site CMS
   parent, sibling of the existing five).
2. An **open-questions band** on the home page — the engine made visible:
   the questions currently being wondered about or built.
3. A **"born from a question" line** on a case-study page whose slug an
   `answered` question points at (the §3 nice-to-have, in scope).
4. An **honest freshness line** in the site footer, derived from real
   content dates only.

## §2 Notion schema (fixed by parent spec §3, restated verbatim)

| Property | Type | Notes |
|---|---|---|
| Question | Title | English text of the question |
| QuestionTH | Text | Thai (EN fallback) |
| Status | Select | `wondering` / `building` / `answered` |
| LinkSlug | Text | when answered: the `/work/` slug it became |
| Date | Date | when the question was born |
| Published | Checkbox | standard visibility switch |

New env var: `NOTION_DB_QUESTIONS`. The owner adds it in Vercel; until he
does, the band simply does not render (see §4 — this is a configuration
state, not an error).

## §3 Data layer

- `models.ts` gains:

  ```ts
  export type QuestionStatus = 'wondering' | 'building' | 'answered';
  export const QUESTION_STATUSES: readonly QuestionStatus[] = ['wondering', 'building', 'answered'];
  export interface OpenQuestion {
    id: string;
    question: Localized;
    status: QuestionStatus;
    linkSlug: string | null;   // meaningful only when status === 'answered'
    date: string;              // YYYY-MM-DD — Date property, else created_time
  }
  ```

  `QUESTION_STATUSES` is the same single-source-of-truth idiom as
  `SKILL_TIERS`/`LOCALES` — the mapper validates against it.

- `mapQuestion` (notion-mappers.ts): row is skipped only when the Question
  title is empty (the `skip()` idiom). `QuestionTH` falls back to EN via
  `localized()`. An unrecognised or missing `Status` defaults to
  `'wondering'` — the Category→`'biz'` precedent, not the Tier-drops-row
  precedent, because a safe default exists: a question the owner just
  logged IS a wondering one. `LinkSlug` empty → null. `Date` empty → the
  page's `created_time` sliced to `YYYY-MM-DD` — a real timestamp (when
  the row was logged), never an invented one; `NotionPage` gains an
  optional `created_time?: string` to carry it.

- `fetchQuestions()` (notion.ts): `queryAll(dbId('QUESTIONS'), true)` —
  published only, mapped, non-null filtered. `dbId`'s name union gains
  `'QUESTIONS'`.

- `getQuestions()` (content.ts), wrapped in `cache()` (the footer and the
  home band both call it in the same render — same dedupe rationale as
  `getProjectsCached`). Sorted date desc. **One deliberate divergence from
  the other fetchers:** in Notion mode with `NOTION_DB_QUESTIONS` unset,
  it returns `[]` *before* reaching `fromNotion` — missing env here means
  "feature not configured yet" (the owner adds Vercel env vars separately
  from code deploys), and rethrowing on every ISR revalidate would couple
  the whole home page's freshness to a console action. A *failing* fetch
  with the env var present keeps `fromNotion`'s exact semantics (build
  phase → fallback, runtime → rethrow preserves the last good build).

- Fixture: `src/content/fixtures/questions.json` = `[]`. Principle 5
  extended exactly as wave 1 extended it to stories: fixture mode has no
  open questions because inventing the owner's inner monologue is fake
  content. The band hides in fixture mode; tests exercise the band with
  their own synthetic props (jsdom tests always have).

## §4 The band — "คำถามที่ยังไม่มีคำตอบ"

- **Placement:** between `WorkGrid` and `ClientsBand` in
  `[locale]/page.tsx`. Narrative: answered questions (the work grid, whose
  cards now lead with their question) flow into the questions still open —
  the loop shown mid-spin. Band-token rhythm stays legal: Work(dark) →
  **Questions(deep)** → Clients(light) → Skills(dark) → Cv(deep) →
  Contact(dark) — no two adjacent bands share a token (the page.tsx
  comment's own rule).
- **Component:** `src/components/sections/QuestionsBand.tsx`, server
  component, `<section id="questions" className="relative z-[2] bg-deep
  px-6 py-[11vh]">` — CraftBand's deep-band shell.
- **Composition** (existing patterns only, per parent-spec principle 4):
  eyebrow `h2` (the WorkGrid eyebrow-as-heading idiom, `openQuestions`) →
  `MaskedHeading`-free question list — the questions themselves are the
  display copy. `Reveal` per item, `text-[clamp(20px,3vw,36px)]
  font-semibold leading-[1.3] tracking-[-0.02em] text-on-dark`,
  `max-w-[28ch]` so a long question wraps as a readable column.
  (Questions are full sentences; ClientsBand's 40px works for two-word
  brand names, not for these.)
- **Content rule:** latest **3** by date desc, statuses `wondering` and
  `building` only — `answered` questions leave the band (parent spec §3).
  The 3-cap is presentation locked by the parent spec ("latest ~3"), so it
  lives in the band component, not the content layer.
- **Building marker:** a `building` question carries a small mono chip
  after its text — `eyebrowFont` styling, `text-[10px] uppercase
  tracking-[0.18em] text-peri-deep`, label from the dictionary
  (`statusBuilding`: en `building` / th `กำลังสร้าง`). `wondering` carries
  nothing — the quiet default state needs no badge.
- **Empty band hides itself** (ClientsBand rule, `return null`): no
  published open questions → the section does not exist. Also covers the
  not-yet-configured env state via §3's `[]`.
- **No nav change.** The band is discovered by scroll; adding a fifth nav
  anchor is scope the parent spec never granted.

## §5 Born from a question (case page)

`work/[slug]/page.tsx` additionally calls `getQuestions()` and looks for
`status === 'answered' && linkSlug === slug`. When found, one quiet line
renders between the h1 and the story body: `{t.askedOn}
{formatDate(q.date, locale)}` — en `Asked` / th `ตั้งคำถามไว้เมื่อ` — in
the page's existing muted style (`text-xs text-soft`). No match → no line
(honest-tier; nothing fabricated to fill the slot). `getQuestions()` is
cache()-wrapped, so the extra call costs one Questions query per story
render in Notion mode, nothing in fixture mode.

## §6 Footer freshness line

`SiteFooter` (already an async server component fetching its own data)
additionally calls `getPosts()` and `getQuestions()` and takes the max
date across both lists. When one exists: `{t.contentUpdated}
{formatDate(maxDate, locale)}` — en `Content last updated` / th
`เนื้อหาอัปเดตล่าสุด` — rendered above `footerNote` in the same
`text-[11px] text-on-dark-soft` voice. When neither list has a date
(fixture mode today: posts fixture is `[]`), the line is omitted — an
honest absence, never a fake date. Case-study dates are **not** an input:
projects deliberately carry no date property (sitemap.ts's own "faking
one violates the rule" comment), and a question's Date is its birth, not
the story's ship date — so the line reads from the only two honest date
sources the CMS has. SiteFooter renders via layout on every route, so
this adds one Posts + one Questions list query per ISR render in Notion
mode — hourly, cache()-deduped within a render, acceptable.

## §7 Dictionary additions (en + th, `th: typeof en` enforces the pair)

| Key | en | th |
|---|---|---|
| `openQuestions` | `Open questions` | `คำถามที่ยังเปิดอยู่` |
| `openQuestionsHeading` | `Questions I have not answered yet.` | `คำถามที่ยังไม่มีคำตอบ` |
| `statusBuilding` | `building` | `กำลังสร้าง` |
| `askedOn` | `Asked` | `ตั้งคำถามไว้เมื่อ` |
| `contentUpdated` | `Content last updated` | `เนื้อหาอัปเดตล่าสุด` |

(`openQuestions` is the eyebrow; `openQuestionsHeading` is available as
the h2 text if review judges the eyebrow alone too quiet — decide in the
browser, not in this file.)

## §8 Testing

- Mapper: full row maps; QuestionTH falls back to EN; missing Status →
  `wondering`; unrecognised Status → `wondering`; missing Date →
  `created_time` date; missing Question title → skipped.
- Content: fixture mode → `[]`; Notion mode with `NOTION_DB_QUESTIONS`
  unset → `[]` without touching the client; sort order date desc.
- Band: 4 open questions → newest 3 render; `answered` never renders;
  `building` chip renders only on building items; empty → `null` (no
  section element); locale fallback th→en.
- Case page: answered question matching slug → line with formatted date;
  no match → no line.
- Footer: max of post/question dates renders; no dates → line absent;
  existing no-arg `SiteFooter()` tests keep passing (mock additions only).
- Browser verification (orchestrator, both locales, desktop + 390px):
  band typography and rhythm between Work and Clients, building chip,
  footer line, no horizontal overflow. jsdom is layout-blind — the
  browser pass is a first-class gate.

## §9 Owner's part

- Add `NOTION_DB_QUESTIONS` to Vercel env (same console action as the
  still-pending `NOTION_DB_SKILLS`) and redeploy once.
- Log questions in Notion as they occur — no cadence pressure; an empty
  band hides itself.
- (Unchanged from wave 1, still open: write the GoNai + AISecretary
  stories, then fill their Slug.)

## Out of scope

Everything the parent spec's out-of-scope list names, plus: a nav anchor
for the band, per-question pages, question archives, dates displayed on
band items, and any wondering-state badge.
