# Wave 1 — Answered Questions (case studies) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Case-study pages at `/[locale]/work/[slug]` driven by the Notion Projects DB (Question + Slug + page body), with question-forward home cards linking to them.

**Architecture:** Reuse the Posts pipeline end to end — `mapBlocks`/`splitBilingual` for the story body, `fetchPostBySlug`'s shape for `fetchProjectStory`, `writing/[slug]/page.tsx`'s shape for the route. The only genuinely new surface is WorkGrid's storied-card branch.

**Tech Stack:** Next.js 15 (App Router, Turbopack), Notion API via existing `src/lib/notion.ts`, Vitest + jsdom, Tailwind v4.

## Global Constraints

- Repo path contains a space (`Klao Workspace`) — always double-quote paths in shell commands.
- Run every command foreground with a generous timeout (≥ 300000 ms). Never background installs or servers.
- A harness hook blocks writes to `eslint.config.mjs`. Do not touch it.
- `src/lib/dictionary.ts`: any key added to `en` must be added to `th` (`th: typeof en` enforces it).
- Content rules (spec §1): no placeholder content; a project without a Slug simply has no story page; every string bilingual via `Localized`/dictionary.
- **Storied contract (locks a spec ambiguity):** a project is *storied* iff `slug` is non-null. The owner fills Slug only when the story body is written (documented in Task 7). The route still 404s on an empty body as a guard.
- Gates for every task: `npm run check` green. Builds/browser checks are the orchestrator's job at the end (never run `npm run build` while the dev server is on the same checkout).
- Commit per task, exact paths only (`git add <paths>`, never `-A`).

---

### Task 1: Model, mapper, fixtures — `question` + `slug` on Project

**Files:**
- Modify: `src/lib/models.ts` (Project interface)
- Modify: `src/lib/notion-mappers.ts` (mapProject)
- Modify: `src/content/fixtures/projects.json` (all 4 rows)
- Test: `tests/mappers.test.ts`

**Interfaces:**
- Produces: `Project.question: Localized | null`, `Project.slug: string | null` — consumed by Tasks 2, 4, 5, 6.

- [ ] **Step 1: Write failing tests** — append to the existing `mapProject` describe in `tests/mappers.test.ts`, following its page-builder idioms:

```ts
it('maps QuestionEN/TH and Slug', () => {
  const p = mapProject(page({
    Name: title('GoNai'),
    QuestionEN: rich('One day in Bangkok — what is the real budget?'),
    QuestionTH: rich('ไปเที่ยวหนึ่งวัน งบจริงเท่าไหร่?'),
    Slug: rich('gonai'),
  }));
  expect(p?.question).toEqual({ en: 'One day in Bangkok — what is the real budget?', th: 'ไปเที่ยวหนึ่งวัน งบจริงเท่าไหร่?' });
  expect(p?.slug).toBe('gonai');
});

it('maps a row without Question/Slug to nulls (not dropped)', () => {
  const p = mapProject(page({ Name: title('DailyBrief') }));
  expect(p).not.toBeNull();
  expect(p?.question).toBeNull();
  expect(p?.slug).toBeNull();
});
```

(`page`/`title`/`rich` are the file's existing helpers — reuse, don't redefine.)

- [ ] **Step 2: Run to verify failure** — `npx vitest run tests/mappers.test.ts` → the two new tests FAIL (`question` undefined).

- [ ] **Step 3: Implement.** `models.ts` — extend `Project` (comment in the file's voice):

```ts
  // Wave 1 (spec 2026-08-13): the originating question and the case-study
  // slug. Both null on a project that has no written story yet — a null
  // slug means "no story page", never a placeholder (spec §1 principle 5).
  question: Localized | null;
  slug: string | null;
```

`notion-mappers.ts` — in `mapProject`'s returned object:

```ts
    question: text(page.properties.QuestionEN)
      ? localized(text(page.properties.QuestionEN), text(page.properties.QuestionTH))
      : null,
    slug: text(page.properties.Slug) || null,
```

`projects.json` — every row gains real questions (the owner's own loop, already approved copy) and `"slug": null` (fixture mode ships no stories):

```json
GoNai:      "question": { "en": "One day in Bangkok — what's the real budget?", "th": "ไปเที่ยวหนึ่งวัน งบจริงๆ เท่าไหร่?" }, "slug": null
AISecretary:"question": { "en": "How much AI am I actually using?", "th": "เดือนนี้ใช้ AI ไปเท่าไหร่กันแน่?" }, "slug": null
DailyBrief: "question": { "en": "Why does the morning news take so long to read?", "th": "ทำไมอ่านข่าวเช้าให้จบมันนานนัก?" }, "slug": null
TickerDesk: "question": { "en": "Which option do I open before the bell?", "th": "ก่อนตลาดเปิด ควรเปิดสัญญาตัวไหน?" }, "slug": null
```

- [ ] **Step 4: Verify green** — `npx vitest run tests/mappers.test.ts` PASS, then `npm run check` (tsc will surface every site that constructs `Project` — fix fixtures/tests it flags by adding the two fields, nothing else).

- [ ] **Step 5: Commit** — `git add src/lib/models.ts src/lib/notion-mappers.ts src/content/fixtures/projects.json tests/mappers.test.ts && git commit -m "feat(work): Project gains question + slug (wave 1, task 1)"`

### Task 2: `fetchProjectStory` + `getProjectStory`

**Files:**
- Modify: `src/lib/notion.ts`
- Modify: `src/lib/content.ts`
- Modify: `src/lib/models.ts` (ProjectStory)
- Test: `tests/notion-fetch.test.ts`, `tests/content.test.ts`

**Interfaces:**
- Consumes: `Project` from Task 1.
- Produces: `export interface ProjectStory extends Project { body: { en: ContentBlock[]; th: ContentBlock[] } }` (models.ts, mirroring `Post extends PostMeta`) and `getProjectStory(slug: string): Promise<ProjectStory | null>`. Consumed by Task 4.

- [ ] **Step 1: Failing tests.** In `tests/notion-fetch.test.ts`, mirror the existing `fetchPostBySlug` tests exactly (same client mock idiom): query filtered on `Slug` rich_text equals + Published, maps first row, fetches blocks, splits bilingual; returns null when no row matches. In `tests/content.test.ts`: `getProjectStory('anything')` resolves null in fixture mode (no NOTION_TOKEN).

- [ ] **Step 2: Verify failure** — `npx vitest run tests/notion-fetch.test.ts tests/content.test.ts`.

- [ ] **Step 3: Implement.** `notion.ts` (below `fetchPostBySlug`, same comment style):

```ts
export async function fetchProjectStory(slug: string): Promise<ProjectStory | null> {
  const pages = await queryAll(dbId('PROJECTS'), true, {
    property: 'Slug',
    rich_text: { equals: slug },
  });
  const meta = pages.map(mapProject).filter(nonNull)[0];
  if (!meta) return null;
  const body = splitBilingual(mapBlocks(await listBlocks(meta.id)));
  return { ...meta, body };
}
```

`content.ts` (mirror `getPostCached` incl. its cache() rationale comment):

```ts
const getProjectStoryCached = cache(async (slug: string): Promise<ProjectStory | null> => {
  return fromNotion((n) => n.fetchProjectStory(slug), null);
});

export async function getProjectStory(slug: string): Promise<ProjectStory | null> {
  return getProjectStoryCached(slug);
}
```

- [ ] **Step 4: Verify** — targeted vitest run PASS, then `npm run check`.
- [ ] **Step 5: Commit** — `git add src/lib/models.ts src/lib/notion.ts src/lib/content.ts tests/notion-fetch.test.ts tests/content.test.ts && git commit -m "feat(work): fetchProjectStory/getProjectStory (wave 1, task 2)"`

### Task 3: Generalize the description deriver

**Files:**
- Modify: `src/lib/post-description.ts`
- Test: `tests/route-metadata.test.ts`

**Interfaces:**
- Produces: `deriveBodyDescription(body: { en: ContentBlock[]; th: ContentBlock[] }, locale: Locale, fallbacks: Record<Locale, string>): string` — exported. `derivePostDescription` becomes a thin wrapper (unchanged signature/behavior) so every existing caller and test keeps passing. Task 4 consumes `deriveBodyDescription` with case-study fallbacks.

- [ ] **Step 1: Failing test** in `tests/route-metadata.test.ts`:

```ts
import { deriveBodyDescription } from '@/lib/post-description';

it('deriveBodyDescription uses the given fallbacks when the body has no paragraph', () => {
  const fallbacks = { en: 'EN fallback', th: 'TH fallback' } as const;
  expect(deriveBodyDescription({ en: [], th: [] }, 'th', fallbacks)).toBe('TH fallback');
});
```

- [ ] **Step 2: Verify failure.**
- [ ] **Step 3: Implement** — move the existing function body into `deriveBodyDescription(body, locale, fallbacks)` (replace `post.body` reads with `body`, `fallbackDescriptions` with the param); keep `fallbackDescriptions` const and re-export `derivePostDescription = (post, locale) => deriveBodyDescription(post.body, locale, fallbackDescriptions)`. Preserve every comment, adjusting references.
- [ ] **Step 4: Verify** targeted + `npm run check` (all existing route-metadata tests must stay green untouched except the added one).
- [ ] **Step 5: Commit** — `git add src/lib/post-description.ts tests/route-metadata.test.ts && git commit -m "refactor(metadata): extract deriveBodyDescription (wave 1, task 3)"`

### Task 4: Route `/[locale]/work/[slug]`

**Files:**
- Create: `src/app/[locale]/work/[slug]/page.tsx`
- Create: `tests/work-story.test.ts`

**Interfaces:**
- Consumes: `getProjects`, `getProjectStory` (Task 2), `deriveBodyDescription` (Task 3), `PostBody`, `assertLocale`, `SITE_URL`, `dict`, `eyebrowFont`.
- Produces: the route; `generateMetadata` and default export shaped exactly like `writing/[slug]/page.tsx` (widen-then-narrow params; `export const dynamicParams = true`).

- [ ] **Step 1: Failing tests** in `tests/work-story.test.ts`, cloned from `tests/route-metadata.test.ts`'s post-page section idioms (mock `@/lib/content`):
  - unknown slug → `generateMetadata` and page both call `notFound` (assert via the `next/navigation` mock the suite already uses);
  - known slug with story → title equals `question[locale]` (falls back to `name` when question is null), canonical `${SITE_URL}/en/work/gonai`, OG type `article`;
  - known slug, empty body both locales → page calls `notFound` (the empty-body guard);
  - TH body empty → PostBody receives the EN blocks (same technique the post-page tests use).
- [ ] **Step 2: Verify failure.**
- [ ] **Step 3: Implement** `page.tsx` — copy `writing/[slug]/page.tsx` and adapt; keep the widen-then-narrow comments and the `dynamicParams = true` rationale comment (stories publish between deploys):

```tsx
const storyFallbacks: Record<Locale, string> = {
  en: 'A build story from Klao — the question, what was tried, and the real numbers.',
  th: 'เรื่องราวการสร้างจากเกลา — คำถามตั้งต้น สิ่งที่ลอง และตัวเลขจริง',
};

export async function generateStaticParams() {
  const projects = await getProjects();
  return LOCALES.flatMap((locale) =>
    projects.filter((p) => p.slug).map((p) => ({ locale, slug: p.slug as string })),
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const l = assertLocale(locale);
  const known = (await getProjects()).find((p) => p.slug === slug);
  if (!known) notFound();
  const story = await getProjectStory(slug);
  if (!story || (story.body.en.length === 0 && story.body.th.length === 0)) notFound();
  const title = story.question?.[l] ?? story.name;
  const description = deriveBodyDescription(story.body, l, storyFallbacks);
  const url = `${SITE_URL}/${l}/work/${slug}`;
  const ogImage = { url: `/og/og-${l}.png`, width: 1200, height: 630, alt: `${story.name} · Klao` };
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, type: 'article', locale: l === 'th' ? 'th_TH' : 'en_US', url, siteName: 'Klao', images: [ogImage] },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
  };
}
```

Default export: same known-slug pre-check + story fetch + empty-body guard, then
`<article className="mx-auto w-full max-w-3xl px-6 pb-16 pt-28">` → back link `<Link href={`/${locale}#work`}>← {dict[locale].back}</Link>` (classes from the post page's back link) → eyebrow `<p className={`text-[9.5px] uppercase text-soft ${eyebrowFont(locale, 'tracking-[0.24em]')}`}>{story.name}</p>` → `<h1 className="mt-4 font-display text-3xl">{story.question?.[locale] ?? story.name}</h1>` → `<div className="mt-8"><PostBody blocks={body} /></div>` with `body = story.body[locale].length ? story.body[locale] : story.body.en` → receipts footer `<p className="mt-10 flex flex-wrap items-center gap-4 text-xs text-soft">`: `<span>{story.stack.join(' · ')}</span>` then Live site / View code anchors exactly as ProjectCard renders them (`inline-flex items-center justify-center p-2 -m-2 underline hover:text-soft`, target=_blank rel=noreferrer, each gated on its URL, labels `dict[locale].liveSite` / `dict[locale].viewCode`).
- [ ] **Step 4: Verify** targeted + `npm run check`.
- [ ] **Step 5: Commit** — `git add "src/app/[locale]/work/[slug]/page.tsx" tests/work-story.test.ts && git commit -m "feat(work): /work/[slug] case-study route (wave 1, task 4)"`

### Task 5: Sitemap entries for stories

**Files:**
- Modify: `src/app/sitemap.ts`
- Test: `tests/sitemap-posts.test.ts`

**Interfaces:** consumes `getProjects` (Task 1's fields).

- [ ] **Step 1: Failing test** — in the existing sitemap suite: with a mocked storied project (`slug: 'gonai'`), the sitemap contains `/en/work/gonai` + `/th/work/gonai` with reciprocal `alternates.languages` incl. `x-default`; a slug-less project contributes nothing.
- [ ] **Step 2: Verify failure.**
- [ ] **Step 3: Implement** — in `sitemap.ts`'s `pages` array, alongside the posts spread:

```ts
    // Case studies: same per-URL reciprocal hreflang treatment as posts.
    // No lastModified — projects carry no date property, and faking one
    // violates the same rule the static paths above follow.
    ...(await getProjects()).filter((p) => p.slug).map((p) => ({ path: `/work/${p.slug}` })),
```

(getProjects imported alongside getPosts; compute before the return the same way `posts` is.)
- [ ] **Step 4: Verify** + `npm run check`. **Step 5: Commit** — `git add src/app/sitemap.ts tests/sitemap-posts.test.ts && git commit -m "feat(work): case studies in the sitemap (wave 1, task 5)"`

### Task 6: Question-forward WorkGrid cards

**Files:**
- Modify: `src/components/sections/WorkGrid.tsx`
- Test: `tests/work-grid.test.tsx`

**Interfaces:** consumes `Project.question/slug` (Task 1); `next/link`.

- [ ] **Step 1: Failing tests** (existing suite idioms):
  - storied project (slug `gonai`, question set) → the card is ONE internal link `a[href="/en/work/gonai"]`, has NO `target` attribute, shows the question text as the lead line, and contains NO external live/repo anchors;
  - storied project with `question: null` → lead falls back to `name`, rendered once (no duplicate name in caption);
  - unstoried project → run the existing assertions untouched to prove byte-identical behavior;
  - unstoried project with both URLs → the secondary View-code link still renders (regression guard).
- [ ] **Step 2: Verify failure.**
- [ ] **Step 3: Implement** — in the card builder: when `project.slug` is truthy the caption block becomes question-forward —

```tsx
<div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
  <p className="text-lg font-semibold text-on-dark">{project.question?.[locale] ?? project.name}</p>
  {project.question && (
    <p className="text-[13px] leading-[1.6] text-on-dark-soft">{project.name} — {project.description[locale]}</p>
  )}
  {!project.question && (
    <p className="text-[13px] leading-[1.6] text-on-dark-soft">{project.description[locale]}</p>
  )}
  <p className={`ml-auto whitespace-nowrap text-[11px] text-peri-deep ${eyebrowFont(locale, '')}`}>{project.stack.join(' · ')}</p>
</div>
```

and the wrapper becomes a three-way branch:

```tsx
{project.slug ? (
  <Link href={`/${locale}/work/${project.slug}`}>
    <TiltCard>{card}</TiltCard>
  </Link>
) : href ? (
  <a href={href} target="_blank" rel="noreferrer">
    <TiltCard>{card}</TiltCard>
  </a>
) : (
  <div>
    <TiltCard>{card}</TiltCard>
  </div>
)}
{!project.slug && project.liveUrl && project.repoUrl && (
  /* existing secondary View-code sibling, unchanged */
)}
```

Update the comment above the branch to state the three-way contract (storied → internal case link, external links live on the case page; unstoried → today's exact behavior). The unstoried caption path must remain byte-identical.
- [ ] **Step 4: Verify** + `npm run check`. **Step 5: Commit** — `git add src/components/sections/WorkGrid.tsx tests/work-grid.test.tsx && git commit -m "feat(work): question-forward cards link to case studies (wave 1, task 6)"`

### Task 7: Documentation

**Files:**
- Modify: `docs/NOTION_SETUP.md` (Projects table + prose)

- [ ] **Step 1:** Add `QuestionEN` / `QuestionTH` / `Slug` rows to the Projects property table (all Text, none required). Prose after the table: Slug is the case-study switch — fill it ONLY when the story is written on the row's own page body (block support + the `ไทย` H1 bilingual split are identical to Posts; cross-reference that section); a project without a Slug keeps the classic card; the story template is คำถาม → สิ่งที่ลอง → สิ่งที่ได้ (ตัวเลขจริง) → สิ่งที่เรียนรู้.
- [ ] **Step 2:** `npm run check` (run anyway per task contract). **Step 3: Commit** — `git add docs/NOTION_SETUP.md && git commit -m "docs(notion): Projects question/slug + story how-to (wave 1, task 7)"`

### Task 8: Orchestrator close-out (not a subagent task)

- [ ] Add `QuestionEN`, `QuestionTH`, `Slug` (all Text) to the live Notion Projects DB via MCP; fill the four questions using Task 1's fixture copy (Slug stays empty until the owner writes each story).
- [ ] Stop the dev server, then sequentially: `npm run check`, `npm run build`, `npm run build:webpack`.
- [ ] Browser QA both locales, desktop + 390px: question cards, unknown-slug 404 path (styled), no horizontal overflow; once the owner's first story exists, the real story page incl. images through the proxy and the receipts footer.
- [ ] Push to main; live smoke on klao-site.vercel.app; hand the owner the story runbook (open Projects row → write body → fill Slug → live within the hour).
