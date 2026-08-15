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

## 2. Create five databases

Full-page databases, anywhere in your workspace. **Property names must match
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
| Type | Select: `Business` / `Build` | |
| OutcomeEN | Text | |
| OutcomeTH | Text | |
| QuestionEN | Text | |
| QuestionTH | Text | |
| Slug | Text | |
| Published | Checkbox | (see above) |

`Featured` controls which 3 projects show on the home page. `Order` controls
display order everywhere (lower first).

`Type` decides which pitch-deck chapter the project appears in on the home
page (and which group on /projects): `Business` rows lead, `Build` rows
follow. **A blank or unrecognised Type renders as Build** — existing rows
keep working untouched until you tag them.

`OutcomeEN`/`OutcomeTH` are the one-line receipt shown on the project's
slide ("Validated with 3 paying pilots"). Only real, checkable results —
leave blank until you have the number, and the line simply won't render.
Never write a placeholder here.

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
| Order | Number | |
| Published | Checkbox | (see above) |

`RoleTH` is the Thai job title; leave it empty and the English `Role` is
reused on /th automatically, same as WinsTH below.

Put one win per line inside WinsEN / WinsTH (each line becomes one bullet).
If you leave WinsTH empty, the English wins are reused as the Thai wins
automatically — you don't have to duplicate them just to avoid a blank
section. **A row with a blank Role is silently dropped**, same as Name on
Projects above.

### Skills

| Property | Type | Required |
|---|---|---|
| Name | Title | **Yes** |
| Tier | Select (top, daily, working, basic, learning) | **Yes** |
| Category | Select (tech, biz, data, fin, human) | |
| Order | Number | |
| Published | Checkbox | (see above) |

`Tier` still controls the full honesty scale a Skill row is fetched and
sorted by, but as of the 2026-08-12 Toolbox redesign the site itself only
**renders** three things from it: the `top` tier (statement-scale, one per
line), a curated row of iconed "Core tools" badges (a fixed allowlist of
tool names, drawn from skills of any tier — see `TOOLS_ALLOWLIST` in
`SkillsBand.tsx`), and the `learning` tier as one quiet joined-text line.
`daily`/`working`/`basic` rows are still fetched and still count toward the
"same Tier spelling" validation below, but nothing on the site renders them
— that fuller inventory lives in the Notion database itself (for anyone who
opens it) and on the owner's GitHub profile, and the render-layer cut can be
reversed at any time without touching this schema or the fetcher. **Rows
with a blank Name or a blank/unrecognised Tier are silently dropped**, same
mechanism as Name on Projects and Role on Career above — `Tier` must be
spelled exactly one of the five values, or the row disappears with no
visible error.

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

`NameNative` is the native-script display name (Thai) that drives the /th
hero wordmark — empty falls back to the Latin name. `Clients` fills the
"Companies & brands" band; leave it empty and that band simply doesn't
render. (Notion multi-select options can't contain commas, so e.g. "MMB
Technology Co., Ltd" has to be entered without its comma.)

Create exactly **one row**. Unlike the other three databases, **Profile has
no Published property** — do not add one, and don't expect a Published
toggle to hide it. The site simply reads whatever the single row contains,
always. (If you want to double-check this against the code: `fetchProfile`
in `src/lib/notion.ts` queries the Profile database without the Published
filter the other four fetchers use, with a comment noting exactly this.)

**Name is required here too, and it's the most deceptive failure mode in
this guide:** if Name is blank, the site doesn't just drop the row — it
falls back to the *entire bundled sample profile* (Klao's real name,
headline, byline, etc., compiled into the code). That looks completely
correct on the live site, so you'd have no way to notice that none of your
Profile edits are actually taking effect.

## 3. Share each database with the integration

On each of the five databases: `•••` menu (top right) → **Connections** →
add `klao-site`. Do this for all five — a database you forget to share
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

Copy `.env.example` to `.env.local`. It has seven lines — the six Notion
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
```

Set all six Notion values together, not just some of them. The site
treats "Notion configured" as "the token is present" — so if the token is
set but a database ID is missing, the code doesn't fail loudly: the missing
ID check throws *before* any request reaches Notion, and (during a build)
that throw is caught the same way as every other Notion failure in this
guide — silent fallback to sample content, not a visible connection error.

Restart `npm run dev`. Your Notion content replaces the sample content.

For the live site, the same six variables go into Vercel — see
`docs/DEPLOY.md`, which also covers a Vercel-specific step (a redeploy)
that this local setup doesn't need.

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
Skills filters on it — and, only for a single post's own page, `Slug`). Notion
rejects the request outright, the site's error handling catches it, and
what happens next depends on **when** it happens:

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

A blank `Name` / `Role` / `Tier` / `Slug` / `Date` / `TitleEN` (see the
"Required" columns above), or — this is the case to know about — a `Slug` property
that's been renamed or misspelled. `Slug` is *never* part of the query
that builds the `/writing` list (`fetchPostMetas` in `src/lib/notion.ts`
filters only on `Published`); it's read per-row, inside the mapper. So a
broken `Slug` property doesn't fail that listing query at all — every
row's Slug just reads back empty, every row gets dropped as "missing
Slug," and `/writing` comes back genuinely, successfully **empty: no
fixtures, no fallback, no error.** (Opening one specific post directly,
`fetchPostBySlug`, *does* filter on `Slug`, so that one request behaves
like Mechanism A instead.)

For Projects/Posts/Career/Skills, a row dropped this way just makes the
returned list one item shorter — nothing substitutes for it, the content simply
isn't there. **Profile is the one exception**, and it's the most
deceptive case in this guide: because Profile is a single row, not a list,
`mapProfile` returning null (blank Name) cascades into `content.ts`'s
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
check the home page's Work grid. (The grid shows every Featured+Published
project, uncapped; `/en/projects` is no longer a page of its own — it
redirects to the home grid.) Fixture content cannot pass this test —
`TEST — delete me` isn't in the bundled sample data — so seeing it appear
is the one check that proves you're actually reading from Notion, not from
fixtures and not from a frozen stale page. Delete the row once you've
confirmed it.

## Everyday workflow

*(Once you've confirmed you're actually connected — see above.)*

- Add or edit rows/pages in Notion as normal.
- Tick **Published** when a Project, Post, Career entry, or Skill is ready
  to show. Untick it to hide it again — instantly for local dev, within the
  hour for production (see below). Profile has no Published toggle; it's
  always live.
- **Local (`npm run dev`):** just reload the page — every request re-reads
  Notion live.
- **Production:** the site uses Next.js ISR with a 1-hour cache
  (`revalidate = 3600`). An edit in Notion shows up on the live site within
  about an hour, automatically. You do not need to redeploy for ordinary
  content changes — only for code changes, or (per `docs/DEPLOY.md`) the
  one-time step of adding the Notion environment variables to Vercel in the
  first place.
