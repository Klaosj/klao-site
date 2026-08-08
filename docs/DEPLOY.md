# Deploying klao-site

Exact steps, in order. Follow them in this order — step 3 in particular must
happen *before* the first Vercel build, not after.

Current state at time of writing: the code lives in a local git repo, branch
`build/v1`, with no GitHub remote configured yet. `gh` (the GitHub CLI) is
not installed on this machine, so both a CLI path and a web-UI path are
given for step 1.

## 1. Create the GitHub repo and push

The implementation work happened on branch `build/v1`; `main` only has the
early spec/plan docs. Decide once, up front, which branch Vercel should
build from — either push `build/v1` as-is and set it as the Vercel
Production branch, or merge `build/v1` into `main` first and push that.
Simplest is usually: merge into `main`, push `main`.

```bash
git checkout main
git merge build/v1
```

**Option A — with `gh` installed** (not currently the case on this machine;
install via `brew install gh` first, then `gh auth login`):

```bash
gh repo create klao-site --private --source . --push
```

**Option B — web UI** (works right now, no install needed):

1. Go to https://github.com/new. Name it `klao-site`, set it **Private**,
   do **not** initialize with a README/`.gitignore`/license (this repo
   already has all three-ish — it has its own `.gitignore`).
2. Copy the commands GitHub shows under "…or push an existing repository
   from the command line" — they'll look like:

```bash
git remote add origin https://github.com/<your-username>/klao-site.git
git push -u origin main
```

Run those from the repo root.

## 2. Import the repo on Vercel

1. Go to https://vercel.com/new.
2. Import the `klao-site` GitHub repo. Vercel auto-detects Next.js — leave
   the framework preset and build command as detected (`next build`, which
   this repo's `package.json` maps to `next build --turbopack`).
3. **Before clicking Deploy**, do step 3 below. Setting environment
   variables after the first deploy means redoing the deploy anyway (see
   step 5), so it's simpler to set them first.

## 3. Set `NEXT_PUBLIC_SITE_URL` — before the first build

In the Vercel project's **Settings → Environment Variables**, add:

```
NEXT_PUBLIC_SITE_URL=https://<your-production-domain>
```

No trailing slash, no trailing whitespace (easy to introduce by accident
when pasting into Vercel's dashboard — both would silently produce
double-slash URLs in the sitemap). Use the actual domain you plan to serve
from (e.g. `https://klao.dev` or the `*.vercel.app` domain Vercel assigns —
you can change this later, see the warning in step 5 below).

**This is not optional and the build will fail loudly without it — that is
intentional, not a bug.** `src/lib/site.ts` throws an error at build/render
time if `NEXT_PUBLIC_SITE_URL` is unset and the code detects it's running on
Vercel (`VERCEL=1`, which Vercel sets in every one of its build and runtime
environments). The alternative — silently defaulting to `localhost` — would
let the build succeed while shipping a sitemap, robots.txt, and canonical
URLs full of `http://localhost:3000` links, which is a broken production
site that looks fine until a search engine tries to use it. If you see a
build fail with an error mentioning `NEXT_PUBLIC_SITE_URL`, this is why —
the fix is to set the variable, not to work around the check.

## 4. Set it for Preview and Development too, not Production-only

When adding the variable, Vercel lets you scope it to Production, Preview,
and/or Development. **Check all three.** `VERCEL=1` is present on Preview
builds as well as Production, so a Production-only-scoped
`NEXT_PUBLIC_SITE_URL` makes every Preview deploy (e.g. from a pull request)
fail at module import with the same throw described in step 3 — Preview
builds hit the exact same code path.

You can point Preview/Development at a different value than Production if
you want (e.g. a `*.vercel.app` preview URL vs. your real domain) — the
requirement is just that *some* valid absolute URL is set in all three
environments, not that they're identical.

## 5. It's a build-time variable — changing it means a redeploy

`NEXT_PUBLIC_` variables are inlined into the JavaScript bundle at build
time, not read at runtime. That means:

- Editing the value in Vercel's dashboard alone does nothing to a
  live deployment — the old value is already baked into the build that's
  currently serving traffic.
- After changing it, trigger a new deploy (push a commit, or use Vercel's
  "Redeploy" button) for the change to actually take effect.

This is different from the five Notion variables below, which are read at
request time and take effect on the next Notion fetch — no redeploy needed
for those.

## 6. The five Notion variables — optional, can come later

```
NOTION_TOKEN=
NOTION_DB_PROJECTS=
NOTION_DB_POSTS=
NOTION_DB_CAREER=
NOTION_DB_PROFILE=
```

You can deploy the site right now without any of these set — it runs fully
on the bundled sample content (the same fixtures used in local dev) until
they're added. That means step 2-5 (get it live) and connecting Notion are
fully independent — do the deploy now, do `docs/NOTION_SETUP.md` whenever
you're ready.

When you do add them: set all five together (a token with a missing
database ID will try and fail to reach Notion, rather than cleanly falling
back to fixtures), and unlike `NEXT_PUBLIC_SITE_URL`, no redeploy is
needed — they're read at request time, so the next ISR revalidation (within
an hour) or the next `npm run dev` reload picks them up.

## 7. Post-deploy verification

After the first deploy completes, check:

- `https://<your-domain>/sitemap.xml` — every URL in it starts with your
  real domain, not `localhost`.
- `https://<your-domain>/robots.txt` — the `Sitemap:` line points at your
  real domain.
- `https://<your-domain>/icon.svg` — returns HTTP 200.
- View source (or DevTools) on any page — the `<link rel="canonical">` tag
  in `<head>` shows your real domain, not `localhost`.
- Once Notion is connected (step 6 done): edit something in Notion (e.g.
  toggle a Project's `Published` checkbox), wait up to an hour, reload the
  live site — the change should appear without you doing anything else (no
  redeploy, no manual cache clear). This is ISR (`revalidate = 3600` in
  `src/app/[locale]/layout.tsx`) working as designed.

## 8. hreflang lives in the sitemap, not in page HTML — expected, not a bug

This site emits per-language alternate links (`hreflang`) inside
`sitemap.xml` (`alternates.languages` on each sitemap entry), not as
`<link rel="alternate" hreflang="...">` tags in the page `<head>`. Google
and Bing both officially support sitemap-based hreflang — it's a valid,
documented alternative to the HTML-tag approach, not a workaround.

If you ever run an SEO audit tool that only checks page HTML for hreflang
tags, it will report hreflang as "missing" on every page. That's the tool
not checking the sitemap, not an actual gap — the real source of truth is
`https://<your-domain>/sitemap.xml`, and that's where to look before
concluding anything is wrong.

## 9. If Turbopack ever misbehaves on Vercel

`npm run build` uses `next build --turbopack`; that's the build command
Vercel will run by default (Next auto-detected). If a future Turbopack
regression ever breaks the Vercel build, `npm run build:webpack` (plain
`next build`) is kept as a working fallback — override the build command in
Vercel's project settings to `npm run build:webpack` and redeploy. (The
apostrophe-in-path bug that made webpack unusable in local dev, documented
in the main `README.md`, is specific to this developer's local checkout
path — Vercel's own build checkout path has no apostrophe, so
`build:webpack` is expected to work fine there. Turbopack is still the
default because it's faster and has no known issue on either environment.)
