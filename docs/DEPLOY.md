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

Run those from the repo root. **If you're pushing `build/v1` as-is instead
of merging into `main` first**, replace `main` with `build/v1` in that
second command (`git push -u origin build/v1`), and set `build/v1` as the
Production Branch in Vercel's project settings in step 2 below — Vercel
defaults to treating `main`/`master` as Production, so a plain import would
otherwise build the wrong (nearly-empty) branch.

## 2. Import the repo on Vercel

1. Go to https://vercel.com/new.
2. Import the `klao-site` GitHub repo. Vercel auto-detects Next.js — leave
   the framework preset and build command as detected. Vercel's Next.js
   preset runs this repo's `package.json` `build` script by default (it
   isn't substituting some fixed `next build` command of its own); here
   that script is `next build --turbopack`, so Turbopack is what actually
   runs on Vercel too, the same as local `npm run build`.
3. **Before clicking Deploy**, add `NEXT_PUBLIC_SITE_URL` right here on
   this same import screen — see step 3 below for the value and why it
   matters. The project doesn't exist yet at this point, so there's no
   Settings page to visit; the import screen has its own **Environment
   Variables** section for exactly this. (The `Project → Settings →
   Environment Variables` page referenced later in this doc only exists
   after this first deploy — you'll use it in step 6, to add the Notion
   variables afterward.)

## 3. Set `NEXT_PUBLIC_SITE_URL` — before the first build

On the import screen from step 2, expand the **Environment Variables**
section and add:

```
NEXT_PUBLIC_SITE_URL=https://<your-production-domain>
```

Use the actual domain you plan to serve from (e.g. `https://klao.dev`, or
the `*.vercel.app` domain Vercel assigns if you don't have a custom domain
yet — you can change this later, see step 5's redeploy requirement).

Keep it clean — no trailing slash, no trailing whitespace — as a matter of
habit, though `src/lib/site.ts` actually trims and strips both
automatically before using the value, precisely so a stray one pasted into
Vercel's dashboard doesn't produce a broken double slash in the sitemap.
What *isn't* auto-corrected: a value with no protocol (e.g. `klao.dev`
instead of `https://klao.dev`) fails validation and throws a clearly-named
error identifying `NEXT_PUBLIC_SITE_URL` and the bad value you gave it.

**This is not optional, and the build will fail loudly without it — that is
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

## 5. Environment variable changes need a redeploy — for ALL of them, not just NEXT_PUBLIC_SITE_URL

Two different reasons produce the same requirement, so both are worth
knowing:

**`NEXT_PUBLIC_` variables specifically** are inlined into the JavaScript
bundle at build time, not read at runtime. Editing the value in Vercel's
dashboard alone does nothing to a live deployment — the old value is
already baked into the build that's currently serving traffic.

**Every environment variable — including the five Notion ones in step 6
below — is also subject to a separate, platform-level rule:** a Vercel
deployment is an immutable snapshot, and the environment variables visible
to its running functions are fixed at the moment that deployment was built.
Saving a new or changed value under Project → Settings → Environment
Variables updates the *project's* configuration for the *next* deployment
— it does not reach into a deployment that's already live and update it.
This holds even though `src/lib/notion.ts` and `src/lib/content.ts` do read
`process.env` at request time (that part is true) — the `process.env` a
running function actually sees is still whatever was captured when its
specific deployment was built, not whatever is currently saved in Settings.

**In practice:** after adding or changing *any* environment variable in
Vercel — `NEXT_PUBLIC_SITE_URL`, or later the Notion variables — trigger a
new deployment (push a commit, or use the "Redeploy" button in the Vercel
dashboard) before expecting the change to take effect. Saving the variable
alone is not enough for either kind.

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

When you do add them, under Project → Settings → Environment Variables: set
all five together — see `docs/NOTION_SETUP.md` for why a partial set (e.g.
a token with no matching database ID) silently falls back to sample content
rather than failing loudly — then **redeploy** (step 5 above: adding these
variables to the project does not touch the deployment that's already
live, Notion variables included, even though the code technically reads
`process.env` at request time).

**Don't trust the page looking right as proof it worked.** The bundled
sample content is Klao's real name, headline, LinkedIn, email, and project
list — not placeholder text — so an unconnected site looks completely
correct even after you've added the vars and reloaded. The only reliable
check: add a throwaway row in Notion (e.g. a Project named `TEST — delete
me`), tick **both Published and Featured**, redeploy if you haven't already,
and check the home page's Work section (`/en/projects` works too since
2026-08-15 — it lists EVERY published project, not just Featured — but the
home section is the stricter check). The home section shows every Featured+Published
project, uncapped, so a fresh row that's both Featured and Published always
appears there, with no existing Featured slots to compete for. Confirm
`TEST — delete me` shows up on the home page. If it doesn't, you're either
still looking at fixtures or (if this worked before and just stopped)
looking at a frozen stale page from before whatever broke — see
`docs/NOTION_SETUP.md`'s "What happens when something's wrong" section for
the difference and how to tell which one you're looking at.

## 7. Post-deploy verification

After the first deploy completes, check:

- `https://<your-domain>/sitemap.xml` — every URL in it starts with your
  real domain, not `localhost`.
- `https://<your-domain>/robots.txt` — the `Sitemap:` line points at your
  real domain.
- `https://<your-domain>/icon.svg` — returns HTTP 200.
- View source (or DevTools) on any page — the `<link rel="canonical">` tag
  in `<head>` shows your real domain, not `localhost`.
- Once Notion is connected (step 6 done, including the redeploy and the
  throwaway-row check): edit something real in Notion (e.g. toggle a
  Project's `Published` checkbox), wait up to an hour, reload the live
  site — the change should appear with no further action from you (no
  redeploy needed for this kind of edit — only the one-time step of adding
  the variables needed one). This is ISR (`revalidate = 3600` in
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
