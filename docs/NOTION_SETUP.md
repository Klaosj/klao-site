# Connecting Notion (one-time, ~15 minutes)

The site runs on built-in sample content (the fixtures in
`src/content/fixtures/`) until you finish this guide — there is no rush,
and nothing breaks in the meantime. Deploy first, connect Notion whenever
you're ready.

## 1. Create the integration

1. Open https://www.notion.so/my-integrations → "New integration".
2. Name: `klao-site` · Workspace: yours · Capabilities: **Read content only**
   (the site never writes to Notion).
3. Copy the "Internal Integration Secret" → this is `NOTION_TOKEN`.

## 2. Create four databases

Full-page databases, anywhere in your workspace. **Property names must match
exactly** — same spelling, same capitalization. The code reads properties by
name; a typo doesn't error, it just produces empty content on the site with
no warning you'll see.

Each database also needs a **Published** checkbox property, except Profile
(details below).

### Projects

| Property | Type |
|---|---|
| Name | Title |
| DescriptionEN | Text |
| DescriptionTH | Text |
| Stack | Multi-select |
| LiveURL | URL |
| RepoURL | URL |
| Screenshot | Files & media |
| Featured | Checkbox |
| Order | Number |
| Published | Checkbox |

`Featured` controls which 3 projects show on the home page. `Order` controls
display order everywhere (lower first).

### Posts

| Property | Type |
|---|---|
| TitleEN | Title |
| TitleTH | Text |
| Slug | Text |
| Date | Date |
| Tags | Multi-select |
| Published | Checkbox |

The page body IS the post — write it directly on the Notion page, below the
properties. Slug is what shows in the URL (`/en/writing/<slug>`); keep it
short, lowercase, hyphenated, and unique.

**Bilingual body:** the site looks through the page's blocks for a **Heading
1** block whose text is *exactly* `ไทย` (nothing else on that line, no
different heading level). Everything above that heading becomes the English
body; everything below it becomes the Thai body. If you never add that
heading, there's no error — the whole page body is used as both the English
and the Thai body, so skipping it just means the Thai version shows the
English text.

Supported block types inside the body: headings (H1/H2/H3), paragraphs,
bulleted and numbered lists, quotes, code blocks, and images. Anything else
(tables, embeds, toggles, etc.) is silently skipped — it won't crash the
page, it just won't appear.

### Career

| Property | Type |
|---|---|
| Role | Title |
| Company | Text |
| Period | Text |
| WinsEN | Text |
| WinsTH | Text |
| Order | Number |
| Published | Checkbox |

Put one win per line inside WinsEN / WinsTH (each line becomes one bullet).
If you leave WinsTH empty, the English wins are reused as the Thai wins
automatically — you don't have to duplicate them just to avoid a blank
section.

### Profile

| Property | Type |
|---|---|
| Name | Title |
| HeadlineEN | Text |
| HeadlineTH | Text |
| BylineEN | Text |
| BylineTH | Text |
| NowEN | Text |
| NowTH | Text |
| Photo | Files & media |
| LinkedIn | URL |
| GitHub | URL |
| Email | Email |
| ResumeURL | URL |

Create exactly **one row**. Unlike the other three databases, **Profile has
no Published property** — do not add one, and don't expect a Published
toggle to hide it. The site simply reads whatever the single row contains,
always. (If you want to double-check this against the code: `fetchProfile`
in `src/lib/notion.ts` queries the Profile database without the Published
filter the other three fetchers use, with a comment noting exactly this.)

## 3. Share each database with the integration

On each of the four databases: `•••` menu (top right) → **Connections** →
add `klao-site`. Do this for all four — a database you forget to share
behaves exactly like an empty database (no error, just nothing shown).

## 4. Copy the database IDs

Open each database as a full page (not the inline view — click through to
its own page). The URL looks like:

```
https://notion.so/yourname/25c1e83aa1b280d6b3f4c9e2a1234567?v=...
```

The 32-character hex string right before `?v=` (or before the end of the
URL if there's no `?v=`) is the database ID.

## 5. Fill in your environment variables

Copy `.env.example` to `.env.local` and paste in the five values:

```
NOTION_TOKEN=secret_...
NOTION_DB_PROJECTS=...
NOTION_DB_POSTS=...
NOTION_DB_CAREER=...
NOTION_DB_PROFILE=...
```

Set all five together, not just some of them — the site treats "Notion
configured" as "the token is present," so a token with a missing database ID
will try to talk to Notion and fail, instead of cleanly falling back to
fixtures.

Restart `npm run dev`. Your Notion content replaces the sample content.

For the live site, the same five variables go into Vercel → Project →
Settings → Environment Variables (see `docs/DEPLOY.md`).

## Why images don't break

Notion's own file URLs (for `Screenshot` and `Photo`) are temporary — they
expire after about an hour. The site never stores those URLs directly;
instead it stores a stable link of its own (`/api/img/page/...` or
`/api/img/block/...`) that, on every request, asks Notion for a fresh URL and
redirects to it. So images keep working indefinitely, even though the
underlying Notion URL behind them is constantly rotating.

## Everyday workflow

- Add or edit rows/pages in Notion as normal.
- Tick **Published** when a Project, Post, or Career entry is ready to show.
  Untick it to hide it again — instantly for local dev, within the hour for
  production (see below). Profile has no Published toggle; it's always live.
- **Local (`npm run dev`):** just reload the page — every request re-reads
  Notion live.
- **Production:** the site uses Next.js ISR with a 1-hour cache
  (`revalidate = 3600`). An edit in Notion shows up on the live site within
  about an hour, automatically. You do not need to redeploy for content
  changes — only for code changes.
