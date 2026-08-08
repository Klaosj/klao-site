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

## 2. Create four databases

Full-page databases, anywhere in your workspace. **Property names must match
exactly** — same spelling, same capitalization.

Most typos are quiet but limited: the code reads properties by name, so a
misspelled *content* property (e.g. `DescriptionEN` typed as
`DiscriptionEN`) just leaves that one field empty on the site — the row
itself still appears, nothing else breaks. Two properties are the
exception: **`Published`** and **`Slug`** are also used in Notion's query
filters, not just read as content, so a typo or a missing one of *those
two* makes the *entire database's query fail* — which silently falls back
to sample content instead of leaving one field blank (see "What happens
when something's wrong" below).

Each database also needs a **Published** checkbox property, except Profile
(details in its section below). If you skip it or misspell it on
Projects/Posts/Career, that whole database's query fails the same way as a
`Slug` typo — silent fallback to sample content, not just that database's
rows going missing.

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
| Published | Checkbox | (see above) |

`Featured` controls which 3 projects show on the home page. `Order` controls
display order everywhere (lower first). **A row with a blank Name is
silently dropped** — it won't appear anywhere on the site, with no visible
error (the only trace is a server log you'll never see).

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
exactly like one.

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
| Company | Text | |
| Period | Text | |
| WinsEN | Text | |
| WinsTH | Text | |
| Order | Number | |
| Published | Checkbox | (see above) |

Put one win per line inside WinsEN / WinsTH (each line becomes one bullet).
If you leave WinsTH empty, the English wins are reused as the Thai wins
automatically — you don't have to duplicate them just to avoid a blank
section. **A row with a blank Role is silently dropped**, same as Name on
Projects above.

### Profile

| Property | Type | Required |
|---|---|---|
| Name | Title | **Yes** |
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

Create exactly **one row**. Unlike the other three databases, **Profile has
no Published property** — do not add one, and don't expect a Published
toggle to hide it. The site simply reads whatever the single row contains,
always. (If you want to double-check this against the code: `fetchProfile`
in `src/lib/notion.ts` queries the Profile database without the Published
filter the other three fetchers use, with a comment noting exactly this.)

**Name is required here too, and it's the most deceptive failure mode in
this guide:** if Name is blank, the site doesn't just drop the row — it
falls back to the *entire bundled sample profile* (Klao's real name,
headline, byline, etc., compiled into the code). That looks completely
correct on the live site, so you'd have no way to notice that none of your
Profile edits are actually taking effect.

## 3. Share each database with the integration

On each of the four databases: `•••` menu (top right) → **Connections** →
add `klao-site`. Do this for all four — a database you forget to share
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

Copy `.env.example` to `.env.local`. It has six lines — the five Notion
values below, plus `NEXT_PUBLIC_SITE_URL` (leave that one blank for local
dev; the site defaults to `http://localhost:3000` automatically. It matters
only for production — see `docs/DEPLOY.md`):

```
NOTION_TOKEN=secret_...
NOTION_DB_PROJECTS=...
NOTION_DB_POSTS=...
NOTION_DB_CAREER=...
NOTION_DB_PROFILE=...
```

Set all five Notion values together, not just some of them. The site
treats "Notion configured" as "the token is present" — so if the token is
set but a database ID is missing, the code doesn't fail loudly: the missing
ID check throws *before* any request reaches Notion, and (during a build)
that throw is caught the same way as every other Notion failure in this
guide — silent fallback to sample content, not a visible connection error.

Restart `npm run dev`. Your Notion content replaces the sample content.

For the live site, the same five variables go into Vercel — see
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

Every failure mode described above shares one root cause and one symptom,
so it's worth understanding as a single rule instead of memorizing each
case separately.

**The rule:** if a fetch from Notion fails for any reason during a
build — a query-filter property typo, an unshared database, a missing
database ID, a required field left blank — the site does not error and does
not go blank. It logs a warning to a server log you'll never see, and
quietly serves the bundled sample content instead, for whatever it
couldn't fetch. Since that sample content is Klao's own real data, the
site keeps looking completely correct.

**How to actually verify a connection is live — don't trust the page
looking right:** add a throwaway row (e.g. a Project named `TEST — delete
me`), tick Published, and confirm it appears on the site. Fixture content
cannot pass this test — `TEST — delete me` isn't in the bundled sample
data, so seeing it appear is the one check that proves you're reading from
Notion and not from fixtures. Delete the row once you've confirmed it.

## Everyday workflow

*(Once you've confirmed you're actually connected — see above.)*

- Add or edit rows/pages in Notion as normal.
- Tick **Published** when a Project, Post, or Career entry is ready to show.
  Untick it to hide it again — instantly for local dev, within the hour for
  production (see below). Profile has no Published toggle; it's always live.
- **Local (`npm run dev`):** just reload the page — every request re-reads
  Notion live.
- **Production:** the site uses Next.js ISR with a 1-hour cache
  (`revalidate = 3600`). An edit in Notion shows up on the live site within
  about an hour, automatically. You do not need to redeploy for ordinary
  content changes — only for code changes, or (per `docs/DEPLOY.md`) the
  one-time step of adding the Notion environment variables to Vercel in the
  first place.
