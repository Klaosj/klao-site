# Connecting Notion (one-time, ~15 minutes)

The site runs on built-in sample content (the fixtures in
`src/content/fixtures/`) until you finish this guide — there is no rush,
and nothing breaks in the meantime. Deploy first, connect Notion whenever
you're ready.

**Before you start, know the one thing that makes this guide worth reading
carefully:** the bundled sample content is Klao's own real name, headline,
LinkedIn, email, and project list — not obviously fake placeholder text. If
a database isn't shared correctly, a property is misspelled, or a required
field is blank, the site does not show an error or a blank page — it
quietly keeps showing the sample content instead, and it will look
completely correct. See "What happens when something's wrong" near the end
of this guide for the failure modes and the one reliable way to check
you're actually connected.

## 1. Create the integration

1. Open https://www.notion.so/my-integrations → "New integration".
2. Name: `klao-site` · Workspace: yours · Capabilities: **Read content only**
   (the site never writes to Notion).
3. Copy the "Internal Integration Secret" → this is `NOTION_TOKEN`.

## 2. Create eight databases

Full-page databases, anywhere in your workspace — Projects, Posts, Career,
Skills, Questions, Profile, Story and FAQ. **Property names must match
exactly** — same spelling, same capitalization. Most typos are quiet but
limited: a misspelled *content* property (e.g. `DescriptionEN` typed as
`DiscriptionEN`) just leaves that one field empty — the row itself still
appears. `Published` is the one property that behaves very differently
when it's missing or misspelled, and it's tempting to assume `Slug` works
the same way — it doesn't. See "What happens when something's wrong" below
for exactly how each one fails; the property tables below mark which
fields are required, since leaving those blank has its own (also silent)
failure mode.

Each database also needs a **Published** checkbox property, except Profile
(details in its section below).

**Thai display text** (titles, questions, headlines): a `|` marks the one
place the line may break and is never shown — for example
`ไอเดียนี้คุ้มกับ|หนึ่งสุดสัปดาห์ หรือทั้งปี?`. Without one, the site still keeps
common long words, dates and number + unit pairs from splitting.

### Projects

| Property | Type | Required |
|---|---|---|
| Name | Title | **Yes** |
| DescriptionEN | Text | |
| DescriptionTH | Text | |
| Stack | Multi-select | |
| LiveURL | URL | |
| RepoURL | URL | |
| Screenshot | Files & media | |
| Featured | Checkbox | |
| Order | Number | |
| Type | Select (Business, Build) | |
| OutcomeEN | Text | |
| OutcomeTH | Text | |
| QuestionEN | Text | |
| QuestionTH | Text | |
| Slug | Text | |
| StatusKey | Select (live, proto, pitched, finalist) | |
| StatusEN | Text | |
| StatusTH | Text | |
| KickerEN | Text | |
| KickerTH | Text | |
| Media | Select (img, win, notion, rings, five) | |
| Wash | Select (aje, gonai, site, none) | |
| Tour | Checkbox | |
| TourOrder | Number | |
| LineageOf | Relation → Projects | |
| AltEN | Text | |
| AltTH | Text | |
| ScreenshotPhone | Files & media | |
| Published | Checkbox | (see above) |

`Featured` + `Published` decide which projects appear in the home page's
Projects index (`#work`); there is no cap. `Order` controls display order
everywhere (lower first). The thirteen properties added in September 2026
are explained under "White Edition fields" at the end of this section.

`Type` decides which column of the home page's Projects index the project
sits in (Business or Build), and which group it joins on /projects.
**A blank or unrecognised Type renders as Build** — existing rows keep
working untouched until you tag them.

`OutcomeEN`/`OutcomeTH` are the project's receipts, **one per line** — each
line becomes one bullet in the project's sheet (`#work/<key>`). Leave
`OutcomeTH` empty and the English lines are reused on /th. Only real,
checkable results — leave blank until you have the number. Never write a
placeholder here.

`QuestionEN` and `QuestionTH` are the bilingual case-study question (e.g.
"One day in Bangkok — what's the real budget?"). A project's
`Slug` determines whether its card becomes a case-study link (filled Slug =
link that opens the story page; no Slug = classic card display). `QuestionEN`
affects only the card's displayed text: if populated, the card shows the
question instead of the project name.

**`Slug` is the case-study switch.** Fill it *only* when the story is
written on the row's own page body. `Slug` appears in the URL
(`/en/work/<slug>`); keep it short, lowercase, hyphenated, and unique.
**Do not fill Slug before you write the body — the sitemap will advertise a
URL that 404s until the body exists or Slug is cleared. This self-heals
within the hour once you fix it, but it's the one trap worth knowing about.
Slug is the *last* thing you fill, not the first.** (If you find yourself
tempted to create the slug first as a placeholder, mark a note in the row
instead, or leave Slug blank until the story is actually written.)

The page body is the story — write it directly on the Notion page's row,
below the properties. Block support and the bilingual `ไทย` H1 split work
the same way as Posts (see "Bilingual body" in the Posts section above for
edge cases and supported block types). The story template is: คำถาม (the
Question) → สิ่งที่ลอง (what you tried) → สิ่งที่ได้ (the real numbers: what
you got) → สิ่งที่เรียนรู้ (what you learned).

**A row with a blank Name is silently dropped** — it won't appear anywhere
on the site, with no visible error (the only trace is a server log you'll
never see).

#### White Edition fields (September 2026)

All thirteen may stay empty — the site falls back to a sensible default for
each (Media: `img` when the row has a Screenshot, otherwise `win`; Wash:
`none`; Tour: until any row is ticked, every row with a Screenshot plays,
by `Order` — after that only ticked rows, and a ticked row needs a
Screenshot or `Media` = `notion`; LineageOf: no pair, no Signature scene
and no lineage card; ScreenshotPhone: the phone hero tour centre-crops
`Screenshot` instead), so they can be added in any order.

| Property | What it does | Example |
|---|---|---|
| StatusKey | Shape of the status mark (monochrome: a shape and words, no colour) | `live` |
| StatusEN / StatusTH | The words beside the mark | `Live · since Aug 2026` / `เปิดใช้งานแล้ว · ตั้งแต่ ส.ค. 2026` |
| KickerEN / KickerTH | Small line above the project's question | `Build · Live` / `สร้างเอง · เปิดใช้งานแล้ว` |
| Media | What the index and the sheet show: `img` the screenshot, `win` the screenshot in a window frame, `notion` a drawn Notion row, `rings` the TAM/SAM/SOM drawing, `five` the five-apps-to-one drawing | `win` |
| Wash | The pale tint behind the project in the hero tour and the project's sheet | `gonai` |
| Tour | Puts the project in the hero tour | ticked on Aje, GoNai, klao-site |
| TourOrder | Tour order, lower first — fill it on every Tour row | `1` |
| LineageOf | The earlier idea this project grew from; the Signature scene and the "Same idea, four years apart" card read it | GoNai → Tripedia |
| AltEN / AltTH | What the picture shows, for screen readers — never just the project name, which is already on screen | `GoNai home screen: plan a full day out and know every baht before you leave.` |
| ScreenshotPhone | An optional phone-only capture (780×650, 6:5) for the project's hero-tour slide on narrow screens — read whenever `Screenshot` is (the `notion` vignette has no photo to crop, so it's never read there). Empty: the phone tour centre-crops `Screenshot` instead | a 780×650 JPEG of the same screen as `Screenshot` |

The page is designed around one lineage pair (GoNai → Tripedia).

### Posts

| Property | Type | Required |
|---|---|---|
| TitleEN | Title | **Yes** |
| TitleTH | Text | |
| Slug | Text | **Yes** |
| Date | Date | **Yes** |
| Tags | Multi-select | |
| Published | Checkbox | (see above) |

The page body IS the post — write it directly on the Notion page, below the
properties. Slug is what shows in the URL (`/en/writing/<slug>`); keep it
short, lowercase, hyphenated, and unique. **`Slug`, `Date`, and `TitleEN`
are all required — leaving any one of the three blank silently drops the
whole post from `/writing`.** `Date` is the one most likely to catch you
out: it doesn't feel mandatory the way a title does, but it's checked
exactly like one. If you turn on Notion's "Include time" toggle for `Date`,
only the date part is kept — the time is read and then discarded, so the
post still sorts and displays correctly by day; there's no way to schedule
same-day posts by time of day through this field.

**Bilingual body:** the site looks through the page's blocks for a **Heading
1** block whose text is *exactly* `ไทย` (nothing else on that line, no
different heading level — an H2 or H3 saying `ไทย` doesn't count).
Everything above that heading becomes the English body; everything below it
becomes the Thai body. A few edge cases worth knowing:

- If you never add that heading, there's no error — the whole page body is
  used as both the English and the Thai body, so skipping it just means the
  Thai version shows the English text.
- If the `ไทย` heading is the very *first* block on the page, the English
  body ends up empty (everything on the page is "below" the heading).
- If you add a `ไทย` Heading 1 **more than once**, only the *first* one
  splits the page — every later one is just a normal, visible "ไทย" heading
  rendered inside the Thai body, not a second split point.

Supported block types inside the body: headings (H1/H2/H3), paragraphs,
bulleted and numbered lists, quotes, code blocks, and images. Anything else
(tables, embeds, toggles, etc.) is silently skipped — it won't crash the
page, it just won't appear. The same applies to **nested content**: only a
block's top-level children are fetched, so indented sub-bullets and
anything placed inside a toggle or a column are dropped too — keep
important content at the top level of the page, not nested inside another
block.

### Career

| Property | Type | Required |
|---|---|---|
| Role | Title | **Yes** |
| RoleTH | Text | |
| Company | Text | |
| Period | Text | |
| WinsEN | Text | |
| WinsTH | Text | |
| StartDate | Date | |
| EndDate | Date | |
| FigureValue | Text | |
| FigureLabelEN | Text | |
| FigureLabelTH | Text | |
| FigureNoteEN | Text | |
| FigureNoteTH | Text | |
| Order | Number | |
| Published | Checkbox | (see above) |

`RoleTH` is the Thai job title; leave it empty and the English `Role` is
reused on /th automatically, same as WinsTH below.

Put one win per line inside WinsEN / WinsTH (each line becomes one bullet).
If you leave WinsTH empty, the English wins are reused as the Thai wins
automatically — you don't have to duplicate them just to avoid a blank
section. **A row with a blank Role is silently dropped**, same as Name on
Projects above.

`StartDate` and `EndDate` place the job on the Career band's time rail; only
the month is shown. Leave `EndDate` empty for the job you're in now — it
reads "Now".

`FigureValue`, `FigureLabelEN/TH` and `FigureNoteEN/TH` add one big number
to the job's panel. Example (the Casetify row): `THB 1.1M` · `My personal
monthly sales target` / `เป้ายอดขายส่วนตัวต่อเดือน` · `Target met` /
`ทำถึงเป้า`. Leave `FigureValue` empty and the panel shows no figure. Same
receipt rule as Outcome: only a real, checkable number.

Each job's deep-link key is its `Company` turned into a slug by `slugKey()`
in `src/lib/format.ts` (`Actmedia` → `actmedia`); FAQ links use it as
`career:actmedia`. **Renaming a Company changes its key** — update any FAQ
`Links` line that pointed at the old one.

### Skills

| Property | Type | Required |
|---|---|---|
| Name | Title | **Yes** |
| Tier | Select (top, daily, working, basic, learning) | **Yes** |
| Category | Select (tech, biz, data, fin, human) | |
| Order | Number | |
| Published | Checkbox | (see above) |

The toolbox at the end of the Career band (`#toolbox`) has three columns.
**Methods** are the Skills rows whose `Tier` is `top`. **Stack** is a short
curated list kept in code (`TOOLBOX_STACK` in `src/lib/career.ts`), and
**Languages** comes from the site's own text — neither is read from this
database. `Category` is not used for the grouping. **Rows with a blank Name
or a blank/unrecognised Tier are silently dropped**, same mechanism as Name
on Projects and Role on Career above — `Tier` must be spelled exactly one of
the five values, or the row disappears with no visible error.

### Questions

| Property | Type | Required |
|---|---|---|
| Question | Title | **Yes** |
| QuestionTH | Text | |
| Status | Select (wondering, building, answered) | |
| LinkSlug | Text | |
| Date | Date | |
| Published | Checkbox | (see above) |

The closing Contact block shows one open question — the newest row whose
`Status` is `wondering` or `building`, sorted by `Date` descending — and
only when Profile's `Email` is filled. `Status` accepts exactly those two
values plus `answered`; a typo, an unrecognised value, or a blank cell
reads as `wondering` instead — the safe-default treatment (same idea as
Skills' `Category` above), not the drop-the-row treatment `Question`
itself gets. An `answered` row is never shown as an open question; instead
its `LinkSlug` powers the case page's "Asked …" line — fill `LinkSlug` with
the `/work/` slug once the question becomes a shipped case study, the same
value you'd put in a Project's own `Slug`. There's no reward for pre-loading
questions before you've actually asked them, and no cap to game — leave a
row `wondering` or `building` for exactly as long as it really is one.

`QuestionTH` is optional; leave it empty and the English `Question` is
reused on /th, same fallback as `RoleTH`/`WinsTH` on Career above.

`Date` is when the question was actually asked. Leave it empty and the
row's own Notion created-time is used instead — a real timestamp, never an
invented one — so an undated row still sorts correctly by when it was
actually logged. This also feeds the footer's freshness line near the
bottom of every page: that line now reads the newer of the newest `Post`
date and the newest `Question` date, so logging or dating a question can
move it forward even on a day nothing else on the site changed.

With no `wondering`/`building` row (including while `NOTION_DB_QUESTIONS`
isn't set yet, see below) or no Profile `Email`, the open question simply
doesn't render, same as Clients on Profile below: nothing breaks, it just
isn't there.
**A row with a blank `Question` is silently dropped**, same mechanism as
Name on Projects and Role on Career above.

### Profile

| Property | Type | Required |
|---|---|---|
| Name | Title | **Yes** |
| NameNative | Text | |
| HeadlineEN | Text | |
| HeadlineTH | Text | |
| BylineEN | Text | |
| BylineTH | Text | |
| NowEN | Text | |
| NowTH | Text | |
| Photo | Files & media | |
| LinkedIn | URL | |
| GitHub | URL | |
| Email | Email | |
| ResumeURL | URL | |
| Clients | Multi-select | |
| PrologueEN | Text | |
| PrologueTH | Text | |
| ClosingLineEN | Text | |
| ClosingLineTH | Text | |
| BasedInEN | Text | |
| BasedInTH | Text | |
| WorkingInEN | Text | |
| WorkingInTH | Text | |

`NameNative` (the Thai display name) is no longer shown: the hero stopped
drawing a name wordmark in September 2026. It can stay filled. `Clients`
feeds a "Companies & brands" band that is kept in the code but not on the
page, so filling it changes nothing today. (Notion multi-select options
can't contain commas, so e.g. "MMB Technology Co., Ltd" has to be entered
without its comma.)

`PrologueEN/TH` is the owner-side story at the start of "By day"
(`#story`); make its one key clause bold in Notion (⌘B or type `**…**`;
both work). `ClosingLineEN/TH` is the line that closes it ("Business
developer who builds his own tools."). `BasedInEN/TH` and `WorkingInEN/TH`
fill the Based in / Working in facts in the closing Contact block
(`Bangkok, TH` · `TH / EN`). Leave `WorkingInTH` empty and the English line
is reused on /th, same fallback as `BasedInTH`. Any of them may stay empty
while you migrate; the page still renders. **If a bare `WorkingIn`
property already exists** (its name before this September 2026 change),
simply rename it to `WorkingInEN` — the mapper still reads the old name as
the English value either way, so nothing breaks if you don't, but renaming
keeps one property instead of two.

Create exactly **one row**. Unlike every other database, **Profile has
no Published property** — do not add one, and don't expect a Published
toggle to hide it. The site simply reads whatever the single row contains,
always. (If you want to double-check this against the code: `fetchProfile`
in `src/lib/notion.ts` queries the Profile database without the Published
filter every other fetcher uses, with a comment noting exactly this.)

**Name is required here too, and it's the most deceptive failure mode in
this guide:** if Name is blank, the site doesn't just drop the row — it
falls back to the *entire bundled sample profile* (Klao's real name,
headline, byline, etc., compiled into the code). That looks completely
correct on the live site, so you'd have no way to notice that none of your
Profile edits are actually taking effect.

### Story

The six "By day" chapters (`#story`), one row each. New in September 2026.

| Property | Type | Required |
|---|---|---|
| TitleEN | Title | **Yes** |
| TitleTH | Text | |
| BodyEN | Text | |
| BodyTH | Text | |
| RuleEN | Text | |
| RuleTH | Text | |
| Icon | Select (target-duotone, chart-line-up-duotone, translate-duotone, rocket-launch-duotone, key-duotone, wrench-duotone) | |
| Sketch | Select (room, cases, formats, rollout, handover) | |
| Order | Number | |
| Published | Checkbox | (see above) |

`BodyEN/TH` is one short paragraph; make the one clause bold in Notion
(⌘B or type `**…**`; both work). Bold in any other property shows as
plain text. `RuleEN/TH` is the short rule beside the icon
(`Scope it honestly.` / `ประเมินตามจริง`). `Icon` and `Sketch` pick the
chapter's icon and line drawing — spell the option exactly as listed. The
last chapter has no `Sketch` — leave it blank; the site shows the five
launch phases in that place.
`Order` runs 1–6.

Until `NOTION_DB_STORY` is set, the page shows the bundled chapters
(`src/content/fixtures/story.json`). Once it is set, the site shows only
the published rows — an empty database empties the section. Fill and
publish the six chapters first, then set the ID (§6 steps 5–8).

### FAQ

"What people usually ask." (`#faq`), one row per question. New in September
2026.

| Property | Type | Required |
|---|---|---|
| QuestionEN | Title | **Yes** |
| QuestionTH | Text | |
| AnswerEN | Text | **Yes** |
| AnswerTH | Text | |
| Links | Text | |
| Order | Number | |
| Published | Checkbox | (see above) |

**A row with a blank `QuestionEN` or `AnswerEN` is silently dropped**, same
mechanism as Name on Projects above.

`Links` holds the answer's deep links, **one per line**, as
`LabelEN|LabelTH|target` — keep both `|` even when the two labels match:

```
Career · Actmedia|Career · Actmedia|career:actmedia
Projects|โปรเจกต์|work
```

| target | Opens |
|---|---|
| `work` | the Projects index |
| `work/<key>` | that project's sheet — `<key>` is the project's `Slug`, or its Name as a slug when Slug is empty (`work/gonai`) |
| `career:<key>` | that job in the Career band (`career:actmedia`; see Career above) |
| `toolbox` | the toolbox at the end of the Career band |
| `contact` | the closing Contact block |
| `https://…` | an outside page |

If you add "What work is he open to?", leave it unpublished until its answer
is written. Until `NOTION_DB_FAQ` is set, the page shows the bundled answers
(`src/content/fixtures/faq.json`). Once it is set, the site shows only the
published rows — an empty database empties the section. Fill and publish
the questions first, then set the ID (§6 steps 6–8).

## 3. Share each database with the integration

On each of the eight databases: `•••` menu (top right) → **Connections** →
add `klao-site`. Do this for all eight — a database you forget to share
returns a "not found" error from Notion, which the site catches and quietly
falls back to that database's bundled sample content (see below), not to an
empty page. It will look like nothing changed since before you started this
guide, not like something is broken.

## 4. Copy the database IDs

Open each database as a full page (not the inline view — click through to
its own page). The URL looks like:

```
https://notion.so/yourname/25c1e83aa1b280d6b3f4c9e2a1234567?v=...
```

The 32-character hex string right before `?v=` (or before the end of the
URL if there's no `?v=`) is the database ID.

## 5. Fill in your environment variables

Copy `.env.example` to `.env.local`. It has ten lines — the nine Notion
values below, plus `NEXT_PUBLIC_SITE_URL` (leave that one blank for local
dev; the site defaults to `http://localhost:3000` automatically. It matters
only for production — see `docs/DEPLOY.md`):

```
NOTION_TOKEN=secret_...
NOTION_DB_PROJECTS=...
NOTION_DB_POSTS=...
NOTION_DB_CAREER=...
NOTION_DB_PROFILE=...
NOTION_DB_SKILLS=...
NOTION_DB_QUESTIONS=...
NOTION_DB_STORY=...
NOTION_DB_FAQ=...
```

Set the token and the five core database IDs (Projects, Posts, Career,
Skills, Profile) together, not just some of them. The site treats "Notion
configured" as "the token is present" — so if the token is set but one of
those IDs is missing, the code doesn't fail loudly: the missing ID check
throws *before* any request reaches Notion, and (during a build) that throw
is caught the same way as every other Notion failure in this guide — silent
fallback to sample content, not a visible connection error.

**Three exceptions:** `NOTION_DB_QUESTIONS`, `NOTION_DB_STORY` and
`NOTION_DB_FAQ` don't go through that missing-ID throw at all.

- With the token set and `NOTION_DB_QUESTIONS` left blank,
  `getQuestionsCached` (`src/lib/content.ts`) returns an empty list before
  attempting any fetch — no throw, no fixture fallback. The only visible
  effect is that the open question in the closing Contact block doesn't
  render.
- With `NOTION_DB_STORY` or `NOTION_DB_FAQ` left blank, `getStory()` /
  `getFaq()` return the bundled chapters and answers
  (`src/content/fixtures/story.json`, `faq.json`). Once the ID is set, the
  site shows only the published rows from that database — an empty or
  fully-unpublished one empties the section. Fill and publish the rows
  before setting the ID (§6 steps 5–8).

This is deliberate — the owner adds Vercel env vars in a separate step from
code deploys, so these three may sit unset without degrading anything else.

Restart `npm run dev`. Your Notion content replaces the sample content.

For the live site, the same nine variables go into Vercel — see
`docs/DEPLOY.md`, which also covers a Vercel-specific step (a redeploy)
that this local setup doesn't need.

## 6. White Edition migration (one-time, September 2026)

The White Edition home page reads a few new properties and two new
databases. **The mappers tolerate every new field being empty, so add
properties in any order** — the live site keeps rendering at every step,
and the code that is live before the White Edition merge ignores
properties it doesn't know. Don't rename or delete an existing property:
that code still reads them — the one deliberate exception is renaming a
bare `WorkingIn` to `WorkingInEN` in step 4, which both names still work
for.

Work top to bottom; tick as you go. Finish steps 1–9 before the White
Edition merge — once a Notion Profile row exists, `Prologue`, `ClosingLine`,
`BasedIn` and `WorkingIn` have no fixture fallback: until step 4 is done, By
day has no prologue and its closing line falls back to the headline, and
Contact has no Based in / Working in facts.

1. **Projects — add the thirteen properties** from the Projects table
   (StatusKey, StatusEN, StatusTH, KickerEN, KickerTH, Media, Wash, Tour,
   TourOrder, LineageOf, AltEN, AltTH, ScreenshotPhone). Create the select
   options exactly as written (lowercase). `LineageOf` is a relation to the
   Projects database itself.
2. **Projects — fill the five lineup rows.** Values from the approved
   prototype; the Thai text, kickers and alt text are in
   `src/content/fixtures/projects.json`:

   | Row | StatusKey | StatusEN | Media | Wash | Tour | TourOrder | LineageOf |
   |---|---|---|---|---|---|---|---|
   | Talatify | pitched | Pitched · TEP 2025 | rings | none | — | — | — |
   | Tripedia | finalist | Final 30 of 500 · 2022 | five | none | — | — | — |
   | Aje | proto | Working prototype | img | aje | ✓ | 1 | — |
   | GoNai | live | Live · since Aug 2026 | win | gonai | ✓ | 2 | Tripedia |
   | klao-site | live | Live · since Aug 2026 | notion | site | ✓ | 3 | — |

   **Replace the Aje and GoNai rows' `Screenshot` files** — the ones in
   Notion today are the pre-White-Edition captures (1600×900, with the
   browser scrollbar visible) — with the current `public/images/aje.jpg`
   and `gonai.jpg` (1580×900, no scrollbar, within the 250 KB budget). This
   rewrites a property `main`'s production code already reads
   (`notion-mappers.ts`), so the live site's pictures change too, within
   the hour — harmless, same 16:9 frame, better capture. klao-site's
   dark-theme shot stops appearing on its own once this row's `Media` is
   set to `notion` (the table above, this step). **Also upload the phone
   captures** into `ScreenshotPhone` on the same two rows —
   `public/images/aje-phone.jpg` and `gonai-phone.jpg` (780×650). Without
   them the phone hero tour centre-crops the desktop `Screenshot` instead,
   which still works, just less tightly framed on a phone.
3. **Career — add the seven properties** (StartDate, EndDate, FigureValue,
   FigureLabelEN/TH, FigureNoteEN/TH). Fill StartDate/EndDate on every row
   (`src/content/fixtures/career.json` has them) and the one figure with a
   receipt: Casetify — `THB 1.1M`, "My personal monthly sales target",
   "Target met".
4. **Profile — add the eight properties** (PrologueEN/TH, ClosingLineEN/TH,
   BasedInEN/TH, WorkingInEN/TH — rename an existing bare `WorkingIn` to
   `WorkingInEN` instead of adding a new one, see above) and fill them from
   `src/content/fixtures/profile.json`.
5. **Create the Story database** (section 2), add the six chapters from
   `src/content/fixtures/story.json` with Order 1–6, tick Published.
6. **Create the FAQ database** (section 2), add the questions from
   `src/content/fixtures/faq.json`, tick Published.
7. **Share Story and FAQ with the integration** (`•••` → Connections → add
   `klao-site`, as in section 3). Without this the site keeps showing the
   bundled copy and looks correct — the quiet failure described below.
8. **Set the two IDs** (only after steps 5–7 — filling and sharing the rows
   first means the preview never shows an empty section), `NOTION_DB_STORY`
   and `NOTION_DB_FAQ`, in `.env.local` and on Vercel for Production and
   Preview (and Development), then redeploy the White Edition **preview** (Vercel → the
   `feat/white-edition` deployment → Redeploy) — `docs/DEPLOY.md` step 5: a
   saved variable doesn't reach a deployment that already exists. Production
   runs the old code until the merge and ignores these two IDs, so there is
   nothing to redeploy there yet.
9. **Prove it's live:** add a throwaway FAQ row `TEST — delete me`, tick
   Published, check `#faq` on the redeployed **preview** (the bundled copy
   can't contain it), then delete the row. After the White Edition merge,
   content edits reach production within about an hour, through ISR.
10. **Just before the White Edition merge:** untick Published on the
    AISecretary and DailyBrief rows (they're no longer part of the site),
    and rewrite `OutcomeEN`/`OutcomeTH` as one receipt per line. Doing
    either earlier shows on the *current* production site — today's code
    still renders both `Published` rows and the old single-line
    `OutcomeEN`/`OutcomeTH` — so this step is timed to land right before
    the merge, not earlier.

## Why images don't break

Notion's own file URLs (for `Screenshot` and `Photo`) are temporary — they
expire after about an hour. The site never stores those URLs directly;
instead it stores a stable link of its own (`/api/img/page/...` or
`/api/img/block/...`) that, on every request, asks Notion for a fresh URL and
redirects to it. So images keep working indefinitely, even though the
underlying Notion URL behind them is constantly rotating.

## What happens when something's wrong

Every failure mode described above traces back to one of two mechanisms.
They produce genuinely different symptoms, so it's worth knowing both
instead of expecting one uniform "site shows sample content" behavior.

### Mechanism A — the Notion query itself fails

An unshared database, or a typo/omission in a property used *inside a
query filter* (that's `Published` — every one of Projects/Posts/Career/
Skills/Questions/Story/FAQ filters on it — and, only for a single post's own page,
`Slug`). Notion rejects the request outright, the site's error handling
catches it, and what happens next depends on **when** it happens:

- **During a build** (`next build`, including every Vercel deployment
  build) — caught and silently replaced with the bundled sample content
  for whatever couldn't be fetched. A warning goes to a server log you'll
  never see; nothing on the page hints anything is wrong.
- **At runtime, after a successful build** — e.g. something breaks in
  Notion sometime *after* the site has already been live and working —
  there is no fixture fallback at this point. Next.js's ISR keeps serving
  the last successfully-rendered version of the page, indefinitely,
  silently retrying on later requests until a fetch eventually succeeds
  again. **This is a different symptom from the one above: frozen stale
  content, not sample content** — and it's the one you're more likely to
  actually hit, since it happens after a working launch rather than during
  initial setup.

### Mechanism B — the query succeeds, but a required field is unreadable

A blank `Name` / `Role` / `Tier` / `Slug` / `Date` / `TitleEN` / `Question`
(see the "Required" columns above), or — this is the case to know about —
a `Slug` property that's been renamed or misspelled. `Slug` is *never* part
of the query that builds the `/writing` list (`fetchPostMetas` in `src/lib/notion.ts`
filters only on `Published`); it's read per-row, inside the mapper. So a
broken `Slug` property doesn't fail that listing query at all — every
row's Slug just reads back empty, every row gets dropped as "missing
Slug," and `/writing` comes back genuinely, successfully **empty: no
fixtures, no fallback, no error.** (Opening one specific post directly,
`fetchPostBySlug`, *does* filter on `Slug`, so that one request behaves
like Mechanism A instead.)

For Projects/Posts/Career/Skills/Questions/Story/FAQ, a row dropped this way just
makes the returned list one item shorter — nothing substitutes for it, the
content simply isn't there. **Profile is the one exception**, and it's the
most deceptive case in this guide: because Profile is a single row, not a
list, `mapProfile` returning null (blank Name) cascades into `content.ts`'s
`profile ?? profileFixture`, which unconditionally substitutes the bundled
sample profile — at build time **and** at runtime alike, since this path
never throws and so never goes through the try/catch that Mechanism A's
build-vs-runtime split depends on. A blank Profile Name is therefore the
one failure in this guide that behaves identically for the whole life of
the site: no freeze to eventually notice, no empty page to notice — just
permanently, quietly wrong.

### How to actually verify a connection is live

Don't trust the page looking right. Add a throwaway row — a Project named
`TEST — delete me` works well — tick **both Published and Featured**, and
check the home page's Projects index (`#work`; it shows every Featured +
Published project, uncapped, and `/en/projects` lists every Published one).
Fixture content cannot pass this test —
`TEST — delete me` isn't in the bundled sample data — so seeing it appear
is the one check that proves you're actually reading from Notion, not from
fixtures and not from a frozen stale page. Delete the row once you've
confirmed it.

## Everyday workflow

*(Once you've confirmed you're actually connected — see above.)*

- Add or edit rows/pages in Notion as normal.
- Tick **Published** when a Project, Post, Career entry, Skill, Story
  chapter or FAQ is ready to show. Untick it to hide it again — on the next
  reload in local dev, within about an hour in production (see below).
  Profile has no Published toggle; it's always live.
- **Local (`npm run dev`):** just reload the page — every request re-reads
  Notion live.
- **Production:** the site uses Next.js ISR with a 1-hour cache
  (`revalidate = 3600`). An edit in Notion shows up on the live site within
  about an hour, automatically. You do not need to redeploy for ordinary
  content changes — only for code changes, or (per `docs/DEPLOY.md`) the
  one-time step of adding the Notion environment variables to Vercel in the
  first place.

## Where each piece of the home page comes from

Checked against the code in September 2026. "Bundled fallback" is what the
page shows while a database is missing or unreachable (`src/content/fixtures/`)
— a missing property on an existing row has no fixture fallback of its own
(see each section above). Rows marked "code" change only with a commit, not
in Notion.

| On the page | Edited in | Bundled fallback |
|---|---|---|
| Hero headline and subline | Profile · Name (the "Hi, I'm ‹first name›" greeting), HeadlineEN/TH, NowEN/TH, Email and ResumeURL (drive the two hero buttons) — **not** BylineEN/TH, which the home page never reads (`HeroTour.tsx`) | `profile.json` |
| Portrait | Profile · Photo — the small portrait beside the hero greeting, the klao-site tour frame's small photo, and the By day photo all read the same field | `profile.json` |
| Tour frames and their captions | Projects · Name, Slug (the caption's `#work/<key>` link), Order (the sort until any row is ticked), Tour, TourOrder, Media, Screenshot, **ScreenshotPhone** (phone-only, falls back to a centre-crop of Screenshot), Wash, KickerEN/TH (falls back to StatusEN/TH), QuestionEN/TH (falls back to DescriptionEN/TH), LiveURL (shown as the window's host when Media is `win`), AltEN/TH. The klao-site frame's picture is the one exception — it draws Profile · HeadlineEN/TH and Photo instead of a screenshot — but its caption, link and wash still come from the klao-site Projects row like any other frame | `projects.json` |
| Signature scene (2022 → 2026) | Projects · the Tripedia row (QuestionEN/TH only) and the GoNai row (Name, StatusKey, DescriptionEN/TH, LiveURL, Screenshot, AltEN/TH), joined by GoNai's `LineageOf`. **The "30 / 500" figure is code** (`SIG_STAT` in `src/lib/signature.ts`), not either row's Outcome — OutcomeEN/TH is not read by this scene at all | `projects.json` |
| Projects index rows | Projects · Name, Type, QuestionEN/TH, StatusKey, StatusEN/TH, Media, Screenshot, Order | `projects.json` |
| Project sheet | Projects · Name, Type, KickerEN/TH, QuestionEN/TH, DescriptionEN/TH, StatusKey, StatusEN/TH, OutcomeEN/TH, Stack, LiveURL, RepoURL, Media, Screenshot, Wash, AltEN/TH, LineageOf (and the linked row's Name, QuestionEN/TH), Slug | `projects.json` |
| Career rail, pills and panel | Career · Role, RoleTH, Company, StartDate, EndDate, Period (shown instead of the dates while StartDate is empty), WinsEN/TH, FigureValue, FigureLabelEN/TH, FigureNoteEN/TH | `career.json` |
| Toolbox — Methods | Skills · Name, Tier (`top` rows) | `skills.json` |
| Toolbox — Stack and Languages | code: `TOOLBOX_STACK` in `src/lib/career.ts`, `src/lib/dictionary.ts` | — |
| Résumé meta line ("2 pages · updated …") | code: `resumeMeta` in `src/lib/dictionary.ts` | — |
| By day prologue and closing line | Profile · PrologueEN/TH, ClosingLineEN/TH (empty falls back to HeadlineEN/TH, so the section still ends on a sentence) | `profile.json` |
| By day chapters | Story (every field) | `story.json` |
| FAQ questions, answers, links | FAQ (every field) | `faq.json` |
| Contact: email, Based in, Working in, Résumé | Profile · Email, BasedInEN/TH, **WorkingInEN/TH** (renamed from the bare `WorkingIn`, master R29), ResumeURL | `profile.json` |
| Contact: the open question | Questions · newest `wondering`/`building` row — shown only when Profile `Email` is also filled | `questions.json` (only while Notion isn't connected at all — with the token set and `NOTION_DB_QUESTIONS` unset, this is an empty list, not the fixture) |
| Section headlines, eyebrows, nav, buttons, footer legal line | code: `src/lib/dictionary.ts` | — |
| ⌘K Ask Preview answers | code: `src/lib/ask.ts` (`ASK_CANNED`, with the FAQ as a second source) | — |

**Corrections from the row list this table started from** (traced against
the merged code, `feat/white-edition` at `1c0dac0`):

- The hero's second line is `Profile.now` (NowEN/TH), not Byline — the
  prototype's Byline text ("Bangkok · BD × Data Analytics …") is not on the
  White Edition home page at all. `BylineEN/TH` still exists on the Profile
  database and in the fixture, and nothing in `src/` reads it — it is
  effectively dead content, kept only because deleting a Profile property
  isn't reversible from this repo. No action needed; noted here so it
  isn't mistaken for something Klao should keep editing.
- The Signature scene's "30 / 500" is a fixed brand fact in code
  (`signature.ts`), never Tripedia's Outcome — `SignatureScene.tsx` renders
  `{statValue} / {statTotal}`, not an arrow; an arrow would read as growth
  from 30 to 500, which overstates the fact (30 finalist teams out of 500).
  Editing Tripedia's `OutcomeEN`/`OutcomeTH` changes its sheet, not the
  Signature scene.
- Tour frames and the Project sheet both read several more properties than
  the first draft of this table listed (Media, Screenshot, Wash, Status,
  and — new since lane C merged — ScreenshotPhone); listed in full above.
- Career's `Period` is still read as the pre-migration fallback wherever
  `StartDate` is empty, everywhere the dates would otherwise show (the
  Career panel's date line; a pill with no start shows the company alone;
  and the ⌘K palette hint) — worth keeping filled on rows without dates
  yet, not just a legacy field to ignore. `/career` itself redirects to
  `/#career` (`next.config.ts`), so there is no separate page reading it.

**Code-owned copy that spec §7 says belongs in Notion** (By day, Career
figures, FAQ answers, statuses and alt text already moved there in this
migration — these two did not):

- **⌘K Ask Preview's canned answers** (`ASK_CANNED` in `src/lib/ask.ts`) —
  the quoted sources and their answer text for the built-in question set,
  separate from the FAQ-matching fallback. Recommended default: **keep in
  code for this release** — the matching logic and the copy are tightly
  coupled (each entry's `match` regex, decline rules and source quotes
  would need a schema of their own), and Notion-driving this is a bigger
  change than this migration's scope.
- **Footer legal line** (`footerNote` in `src/lib/dictionary.ts`, "Built at
  night, powered by good coffee."). Recommended default: **keep in code
  for this release** — it changes rarely and sits beside the auto-computed
  copyright year and freshness date, which stay code either way.
