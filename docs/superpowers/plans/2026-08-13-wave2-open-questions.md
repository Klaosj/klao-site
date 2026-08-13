# Wave 2 — Open Questions (living band) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A home-page band of the owner's currently-open questions (Notion Questions DB), a "born from a question" line on case pages, and an honest footer freshness line.

**Architecture:** Reuse the existing Notion pipeline end to end — `queryAll` + a new `mapQuestion` for the list, `cache()`-wrapped `getQuestions()` in content.ts consumed by three surfaces (band, case page, footer). The only new component is `QuestionsBand`, built from ClientsBand/WorkGrid idioms. Spec: `docs/superpowers/specs/2026-08-13-wave2-open-questions-design.md`.

**Tech Stack:** Next.js 15 (App Router, Turbopack), Notion API via existing `src/lib/notion.ts`, Vitest + jsdom, Tailwind v4.

## Global Constraints

- Working checkout for this wave is a clean clone (the Desktop repo is TCC-blocked this session); path contains no spaces, but keep quoting habits anyway.
- Run every command foreground with a generous timeout (≥ 300000 ms). Never background installs or servers.
- A harness hook blocks writes to `eslint.config.mjs`. Do not touch it.
- `src/lib/dictionary.ts`: any key added to `en` must be added to `th` (`th: typeof en` enforces it).
- Thai text NEVER goes through `font-mono`/wide tracking — always `eyebrowFont(locale, …)` (src/lib/typography.ts explains why).
- Content rules (parent spec §1): no placeholder/invented content; empty states hide themselves; every string bilingual via `Localized`/dictionary.
- Gates for every task: `npm run check` green. Builds/browser checks are the orchestrator's job at the end.
- Commit per task, exact paths only (`git add <paths>`, never `-A`).

---

### Task 1: Model, mapper, fixture — `OpenQuestion`

**Files:**
- Modify: `src/lib/models.ts`
- Modify: `src/lib/notion-mappers.ts`
- Create: `src/content/fixtures/questions.json`
- Test: `tests/mappers.test.ts`

**Interfaces:**
- Produces: `QuestionStatus`, `QUESTION_STATUSES`, `OpenQuestion { id: string; question: Localized; status: QuestionStatus; linkSlug: string | null; date: string }` (models.ts); `mapQuestion(page: NotionPage): OpenQuestion | null`; `NotionPage` gains `created_time?: string`. Consumed by Tasks 2, 3, 4, 5.

- [ ] **Step 1: Write failing tests** — append a `describe('mapQuestion', …)` to `tests/mappers.test.ts`, reusing the file's `title`/`rich`/`select` helpers:

```ts
const questionPage = {
  id: 'q1',
  created_time: '2026-08-01T09:30:00.000Z',
  properties: {
    Question: title('Can a Notion database run a whole website?'),
    QuestionTH: rich('ฐานข้อมูล Notion อันเดียว รันทั้งเว็บได้ไหม?'),
    Status: select('building'),
    LinkSlug: rich(''),
    Date: { date: { start: '2026-08-05' } },
    Published: { checkbox: true },
  },
};

describe('mapQuestion', () => {
  it('maps a full row', () => {
    expect(mapQuestion(questionPage)).toEqual({
      id: 'q1',
      question: {
        en: 'Can a Notion database run a whole website?',
        th: 'ฐานข้อมูล Notion อันเดียว รันทั้งเว็บได้ไหม?',
      },
      status: 'building',
      linkSlug: null,
      date: '2026-08-05',
    });
  });

  it('falls back TH -> EN when QuestionTH empty', () => {
    const page = { ...questionPage, properties: { ...questionPage.properties, QuestionTH: rich('') } };
    expect(mapQuestion(page)!.question.th).toBe('Can a Notion database run a whole website?');
  });

  it('defaults missing or unrecognised Status to wondering', () => {
    const missing = { ...questionPage, properties: { ...questionPage.properties, Status: select(null) } };
    const bogus = { ...questionPage, properties: { ...questionPage.properties, Status: select('someday') } };
    expect(mapQuestion(missing)!.status).toBe('wondering');
    expect(mapQuestion(bogus)!.status).toBe('wondering');
  });

  it('maps a non-empty LinkSlug', () => {
    const page = { ...questionPage, properties: { ...questionPage.properties, LinkSlug: rich('gonai') } };
    expect(mapQuestion(page)!.linkSlug).toBe('gonai');
  });

  it('falls back to created_time date when Date is empty', () => {
    const page = { ...questionPage, properties: { ...questionPage.properties, Date: { date: null } } };
    expect(mapQuestion(page)!.date).toBe('2026-08-01');
  });

  it('returns null and warns on missing Question title', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const page = { ...questionPage, properties: { ...questionPage.properties, Question: title('') } };
    expect(mapQuestion(page)).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
```

(Import `mapQuestion` alongside the existing mapper imports at the top.)

- [ ] **Step 2: Run to verify failure** — `npx vitest run tests/mappers.test.ts` → the new describe FAILS (`mapQuestion` not exported).

- [ ] **Step 3: Implement.**

`models.ts` — below the `Skill` interface, same single-source-of-truth voice as `SKILL_TIERS`:

```ts
// Wave 2 (spec 2026-08-13): the owner's question loop, open side. Status
// drives band membership (answered questions leave the band) and the
// building marker; same "valid values + one declaration" idiom as
// SKILL_TIERS/LOCALES above -- notion-mappers.ts validates against this
// array.
export type QuestionStatus = 'wondering' | 'building' | 'answered';
export const QUESTION_STATUSES: readonly QuestionStatus[] = ['wondering', 'building', 'answered'];

export interface OpenQuestion {
  id: string;
  question: Localized;
  // 'answered' questions never render on the band; their linkSlug feeds the
  // case page's "born from a question" line instead.
  status: QuestionStatus;
  linkSlug: string | null;
  // YYYY-MM-DD. The Notion Date property when set, else the row's own
  // created_time -- a real timestamp (when the question was logged), never
  // an invented one.
  date: string;
}
```

`notion-mappers.ts` — extend the page type and add the mapper (import `OpenQuestion`, `QuestionStatus`, `QUESTION_STATUSES` in the models import lines):

```ts
export type NotionPage = { id: string; created_time?: string; properties: Record<string, unknown> };
```

Below `mapSkill`:

```ts
// Validates Status against QUESTION_STATUSES (models.ts) -- but unlike
// mapSkill's Tier (which drops the row because no safe default exists), an
// unreadable Status falls back to 'wondering': a question the owner just
// logged IS a wondering one. Same safe-default reasoning as Category ->
// 'biz' above.
function statusOf(page: NotionPage): QuestionStatus {
  const name = selectOf(page.properties.Status);
  return name && (QUESTION_STATUSES as readonly string[]).includes(name)
    ? (name as QuestionStatus)
    : 'wondering';
}

export function mapQuestion(page: NotionPage): OpenQuestion | null {
  const questionEn = text(page.properties.Question);
  if (!questionEn) return skip('Questions', page, 'missing Question');
  // Date property when set, else created_time -- both real timestamps.
  // Same first-10-chars slice as mapPostMeta's "Include time" guard.
  const dateRaw = (page.properties.Date as { date?: { start?: string } | null } | undefined)?.date?.start;
  const date =
    typeof dateRaw === 'string' && dateRaw ? dateRaw.slice(0, 10) : (page.created_time ?? '').slice(0, 10);
  return {
    id: page.id,
    question: localized(questionEn, text(page.properties.QuestionTH)),
    status: statusOf(page),
    linkSlug: text(page.properties.LinkSlug) || null,
    date,
  };
}
```

`src/content/fixtures/questions.json`:

```json
[]
```

(Empty on purpose — parent spec principle 5: fixture mode ships no invented questions, the band hides. Same rule that keeps fixture mode story-less.)

- [ ] **Step 4: Verify green** — `npx vitest run tests/mappers.test.ts` PASS, then `npm run check`.

- [ ] **Step 5: Commit** — `git add src/lib/models.ts src/lib/notion-mappers.ts src/content/fixtures/questions.json tests/mappers.test.ts && git commit -m "feat(questions): OpenQuestion model + mapQuestion (wave 2, task 1)"`

### Task 2: `fetchQuestions` + `getQuestions`

**Files:**
- Modify: `src/lib/notion.ts`
- Modify: `src/lib/content.ts`
- Test: `tests/notion-fetch.test.ts`, `tests/content.test.ts`
- Create: `tests/content-questions.test.ts`

**Interfaces:**
- Consumes: `mapQuestion`, `OpenQuestion` (Task 1).
- Produces: `fetchQuestions(): Promise<OpenQuestion[]>` (notion.ts); `getQuestions(): Promise<OpenQuestion[]>` (content.ts) — published rows, sorted date desc, `[]` in fixture mode and when `NOTION_DB_QUESTIONS` is unset. Consumed by Tasks 3, 4, 5.

- [ ] **Step 1: Failing tests.**

In `tests/notion-fetch.test.ts` (reuse the module-level `queryMock` and helpers; add `vi.stubEnv('NOTION_DB_QUESTIONS', 'db-questions')` to the `beforeEach` stubs alongside the existing ones; import `fetchQuestions`):

```ts
describe('fetchQuestions', () => {
  it('queries published only, maps rows, drops malformed ones', async () => {
    queryMock.mockResolvedValueOnce({
      results: [
        {
          id: 'q1',
          created_time: '2026-08-01T00:00:00.000Z',
          properties: {
            Question: title('A real question?'),
            Status: { select: { name: 'wondering' } },
            Date: { date: { start: '2026-08-05' } },
          },
        },
        { id: 'q2', properties: { Question: title('') } },
      ],
      next_cursor: null,
      has_more: false,
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const questions = await fetchQuestions();
    warn.mockRestore();
    expect(questions).toHaveLength(1);
    expect(questions[0].question.en).toBe('A real question?');
    expect(queryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        database_id: 'db-questions',
        filter: { property: 'Published', checkbox: { equals: true } },
      }),
    );
  });
});
```

In `tests/content.test.ts`, next to the existing fixture-mode assertions:

```ts
it('resolves questions to [] in fixture mode (no NOTION_TOKEN, empty fixture)', async () => {
  const { getQuestions } = await import('@/lib/content');
  await expect(getQuestions()).resolves.toEqual([]);
});
```

New file `tests/content-questions.test.ts` (isolated, same pattern and rationale as `tests/content-isr.test.ts`'s own header comment):

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Isolated in its own file so this module mock never leaks into the
// fixture-mode assertions in tests/content.test.ts (same isolation note as
// tests/content-isr.test.ts).
vi.mock('@/lib/notion', () => ({
  fetchQuestions: () =>
    Promise.resolve([
      { id: 'old', question: { en: 'Old?', th: 'Old?' }, status: 'wondering', linkSlug: null, date: '2026-07-01' },
      { id: 'new', question: { en: 'New?', th: 'New?' }, status: 'building', linkSlug: null, date: '2026-08-10' },
    ]),
}));

describe('getQuestions (Notion mode)', () => {
  beforeEach(() => {
    vi.stubEnv('NOTION_TOKEN', 'x');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns [] without touching Notion when NOTION_DB_QUESTIONS is unset', async () => {
    // Missing env = feature not configured yet (the owner adds Vercel env
    // vars separately from code deploys) -- NOT an error to rethrow, or
    // every ISR revalidate of every page would fail until the console
    // action happens. Spec §3.
    const { getQuestions } = await import('@/lib/content');
    await expect(getQuestions()).resolves.toEqual([]);
  });

  it('sorts date desc when configured', async () => {
    vi.stubEnv('NOTION_DB_QUESTIONS', 'db-q');
    const { getQuestions } = await import('@/lib/content');
    const questions = await getQuestions();
    expect(questions.map((q) => q.id)).toEqual(['new', 'old']);
  });
});
```

- [ ] **Step 2: Verify failure** — `npx vitest run tests/notion-fetch.test.ts tests/content.test.ts tests/content-questions.test.ts`.

- [ ] **Step 3: Implement.**

`notion.ts` — widen the union in `dbId` to `'PROJECTS' | 'POSTS' | 'CAREER' | 'PROFILE' | 'SKILLS' | 'QUESTIONS'`; import `mapQuestion` and the `OpenQuestion` type; below `fetchSkills`:

```ts
export async function fetchQuestions(): Promise<OpenQuestion[]> {
  return (await queryAll(dbId('QUESTIONS'), true)).map(mapQuestion).filter(nonNull);
}
```

`content.ts` — import the `OpenQuestion` type and `questionsFixture from '@/content/fixtures/questions.json'`; below `getSkills`:

```ts
// cache()-wrapped like getProjectsCached and for the same reason: the home
// band, the case page's born-from line, and the footer's freshness line can
// all ask for questions within one render.
const getQuestionsCached = cache(async (): Promise<OpenQuestion[]> => {
  // One deliberate divergence from every fetcher above: in Notion mode with
  // NOTION_DB_QUESTIONS unset, this is "feature not configured", not an
  // error. The owner adds Vercel env vars separately from code deploys
  // (NOTION_DB_SKILLS sat unset the same way) -- letting fromNotion rethrow
  // here would fail EVERY ISR revalidate site-wide (SiteFooter calls this
  // on every route) until a console action happens. A failing fetch with
  // the env var present keeps fromNotion's exact semantics: build phase ->
  // fixture fallback, runtime -> rethrow so ISR serves the last good build.
  if (process.env.NOTION_TOKEN && !process.env.NOTION_DB_QUESTIONS) return [];
  const all = await fromNotion((n) => n.fetchQuestions(), questionsFixture as OpenQuestion[]);
  // date is YYYY-MM-DD, so plain string compare sorts chronologically --
  // same contract getPostsCached's date sort relies on.
  return [...all].sort((a, b) => b.date.localeCompare(a.date));
});

export async function getQuestions(): Promise<OpenQuestion[]> {
  return getQuestionsCached();
}
```

- [ ] **Step 4: Verify** — targeted vitest run PASS, then `npm run check`.
- [ ] **Step 5: Commit** — `git add src/lib/notion.ts src/lib/content.ts tests/notion-fetch.test.ts tests/content.test.ts tests/content-questions.test.ts && git commit -m "feat(questions): fetchQuestions/getQuestions (wave 2, task 2)"`

### Task 3: `QuestionsBand` on the home page

**Files:**
- Create: `src/components/sections/QuestionsBand.tsx`
- Modify: `src/lib/dictionary.ts` (en + th: `openQuestions`, `openQuestionsHeading`, `statusBuilding`)
- Modify: `src/app/[locale]/page.tsx`
- Create: `tests/questions-band.test.tsx`

**Interfaces:**
- Consumes: `OpenQuestion` (Task 1), `getQuestions` (Task 2), `Reveal`, `dict`, `eyebrowFont`.
- Produces: `QuestionsBand({ questions, locale }: { questions: OpenQuestion[]; locale: Locale })` — filters `answered` out and shows the newest 3 itself (the 3-cap is presentation, parent spec §3, so it lives here, not in content.ts).

- [ ] **Step 1: Failing tests** — `tests/questions-band.test.tsx`, cloned from `tests/clients-band.test.tsx`'s setup (jsdom banner, `afterEach(cleanup)`, `matchMedia`/`IntersectionObserver` stubs):

```tsx
// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import QuestionsBand from '@/components/sections/QuestionsBand';
import { dict } from '@/lib/dictionary';
import type { OpenQuestion } from '@/lib/models';

afterEach(cleanup);

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

const q = (id: string, date: string, status: OpenQuestion['status'] = 'wondering'): OpenQuestion => ({
  id,
  question: { en: `EN ${id}?`, th: `TH ${id}?` },
  status,
  linkSlug: null,
  date,
});

// getQuestions() hands the band a date-desc list; these are pre-sorted the
// same way to honor that contract.
const four = [q('a', '2026-08-10', 'building'), q('b', '2026-08-08'), q('c', '2026-08-05'), q('d', '2026-08-01')];

describe('QuestionsBand', () => {
  it('renders the newest 3 open questions only', () => {
    const { container } = render(<QuestionsBand questions={four} locale="en" />);
    const items = Array.from(container.querySelectorAll('li')).map((li) => li.textContent);
    expect(items).toHaveLength(3);
    expect(items[0]).toContain('EN a?');
    expect(items[2]).toContain('EN c?');
  });

  it('never renders an answered question', () => {
    const withAnswered = [q('done', '2026-08-12', 'answered'), ...four];
    const { container } = render(<QuestionsBand questions={withAnswered} locale="en" />);
    expect(container.textContent).not.toContain('EN done?');
    expect(container.querySelectorAll('li')).toHaveLength(3);
  });

  it('marks building questions and only those', () => {
    const { container } = render(<QuestionsBand questions={four} locale="en" />);
    const items = Array.from(container.querySelectorAll('li'));
    expect(items[0].textContent).toContain(dict.en.statusBuilding);
    expect(items[1].textContent).not.toContain(dict.en.statusBuilding);
  });

  it('renders nothing at all when no open questions exist', () => {
    // ClientsBand rule: an empty band must not exist -- covers both "owner
    // has answered everything" and "NOTION_DB_QUESTIONS not configured yet"
    // (content.ts returns [] for that state).
    const answeredOnly = [q('done', '2026-08-12', 'answered')];
    expect(render(<QuestionsBand questions={[]} locale="en" />).container.firstChild).toBeNull();
    expect(render(<QuestionsBand questions={answeredOnly} locale="en" />).container.firstChild).toBeNull();
  });

  it('renders Thai text on /th', () => {
    const { container } = render(<QuestionsBand questions={four} locale="th" />);
    expect(container.textContent).toContain('TH a?');
    expect(container.textContent).toContain(dict.th.statusBuilding);
  });
});
```

- [ ] **Step 2: Verify failure** — `npx vitest run tests/questions-band.test.tsx` (module not found).

- [ ] **Step 3: Implement.**

`dictionary.ts` — in `en` after `toolsLabel`:

```ts
  // Open-questions band (wave 2, spec 2026-08-13). The band's copy IS its
  // question list (owner-authored, from the Questions DB) -- these are just
  // the frame: the eyebrow, an optional bigger heading (openQuestionsHeading
  // is dormant until browser review decides the eyebrow alone reads too
  // quiet -- same keep-the-key reasoning as tierDaily above), and the one
  // status marker a `building` question carries.
  openQuestions: 'Open questions',
  openQuestionsHeading: 'Questions I have not answered yet.',
  statusBuilding: 'building',
```

in `th`:

```ts
  openQuestions: 'คำถามที่ยังเปิดอยู่',
  openQuestionsHeading: 'คำถามที่ยังไม่มีคำตอบ',
  statusBuilding: 'กำลังสร้าง',
```

`QuestionsBand.tsx`:

```tsx
import Reveal from '@/components/motion/Reveal';
import { dict } from '@/lib/dictionary';
import type { Locale, OpenQuestion } from '@/lib/models';
import { eyebrowFont } from '@/lib/typography';

// Server component -- no 'use client'. Reveal is a client component composed
// as a plain child, same as ClientsBand/WorkGrid.
export default function QuestionsBand({ questions, locale }: { questions: OpenQuestion[]; locale: Locale }) {
  const t = dict[locale];

  // Newest 3 open questions -- `answered` ones leave the band (their
  // linkSlug feeds the case page's born-from line instead), and the 3-cap
  // is a presentation rule the parent spec locks ("latest ~3"), so it lives
  // here rather than in content.ts. getQuestions() already sorts date desc.
  const open = questions.filter((question) => question.status !== 'answered').slice(0, 3);

  // ClientsBand rule: an empty band must not exist. Also the rendered state
  // while NOTION_DB_QUESTIONS is not configured yet (content.ts maps that
  // to []), so shipping this band never blocks on a Vercel console action.
  if (open.length === 0) {
    return null;
  }

  return (
    <section id="questions" className="relative z-[2] bg-deep px-6 py-[11vh]">
      {/* Eyebrow-as-heading, WorkGrid's idiom: the band's real copy is the
          questions themselves, so the section heading stays a quiet label
          rather than competing display type. */}
      <h2 className={`mb-10 text-[9.5px] uppercase text-on-dark-soft ${eyebrowFont(locale, 'tracking-[0.24em]')}`}>
        {t.openQuestions}
      </h2>
      <ul className="flex list-none flex-col gap-7">
        {open.map((question, i) => (
          <Reveal
            as="li"
            key={question.id}
            delayIndex={i}
            className="max-w-[28ch] text-[clamp(20px,3vw,36px)] font-semibold leading-[1.3] tracking-[-0.02em] text-on-dark"
          >
            {question.question[locale]}
            {question.status === 'building' && (
              // The one status a question can wear on the band. `wondering`
              // is the quiet default and carries nothing. Thai never renders
              // through font-mono -- eyebrowFont picks the face per locale.
              <span
                className={`ml-3 inline-block align-middle text-[10px] uppercase text-peri-deep ${eyebrowFont(locale, 'tracking-[0.18em]')}`}
              >
                {t.statusBuilding}
              </span>
            )}
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
```

`page.tsx` — import `QuestionsBand` and `getQuestions`; extend the `Promise.all` destructure:

```ts
  const [profile, projects, career, skills, questions] = await Promise.all([
    getProfile(),
    getFeaturedProjects(),
    getCareer(),
    getSkills(),
    getQuestions(),
  ]);
```

Insert between `<WorkGrid …/>` and the comment block above `<ClientsBand …/>`:

```tsx
      {/* The loop shown mid-spin: the work grid's cards lead with their
          (answered) questions, and this band holds the ones still open.
          Token rhythm stays legal either way: Work(dark) -> Questions(deep)
          -> Clients(light), or -- while the band hides itself (no open
          questions / NOTION_DB_QUESTIONS not configured) -- Work(dark) ->
          Clients(light), both free of same-token neighbors. */}
      <QuestionsBand questions={questions} locale={locale} />
```

Update the existing rhythm comment above `ClientsBand` so its band chain reads `Work(dark) -> Questions(deep) -> Clients(light) -> Skills(dark) -> Cv(deep) -> Contact(dark)`.

- [ ] **Step 4: Verify** — `npx vitest run tests/questions-band.test.tsx` PASS, then `npm run check`.
- [ ] **Step 5: Commit** — `git add src/components/sections/QuestionsBand.tsx src/lib/dictionary.ts "src/app/[locale]/page.tsx" tests/questions-band.test.tsx && git commit -m "feat(questions): open-questions band on home (wave 2, task 3)"`

### Task 4: "Born from a question" line on case pages

**Files:**
- Modify: `src/app/[locale]/work/[slug]/page.tsx`
- Modify: `src/lib/dictionary.ts` (en + th: `askedOn`)
- Test: `tests/work-story.test.ts`

**Interfaces:**
- Consumes: `getQuestions` (Task 2), `formatDate` (src/lib/format.ts), `dict`.
- Produces: nothing new for later tasks — a render-only addition.

- [ ] **Step 1: Failing tests** — in `tests/work-story.test.ts`, the suite mocks `@/lib/content`; add `getQuestions` to that mock with a default of resolving `[]` (so every existing test keeps passing untouched) and a per-test override hook, following however that file already parameterizes `getProjects`/`getProjectStory` per test. Then add two tests, using the file's existing page-render idiom and text-collection helper:

```ts
it('renders the asked-on line when an answered question points at this slug', async () => {
  // override getQuestions for this test:
  // [{ id: 'q1', question: { en: 'Q?', th: 'Q?' }, status: 'answered', linkSlug: 'gonai', date: '2026-06-15' }]
  // then render the page for slug 'gonai' and collect its text
  expect(text).toContain(dict.en.askedOn);
  expect(text).toContain('Jun 15, 2026');
});

it('renders no asked-on line when no answered question matches', async () => {
  // override getQuestions with the same row but status: 'building'
  expect(text).not.toContain(dict.en.askedOn);
});
```

(The mock/render mechanics are that file's own idiom — extend, don't restructure. `text` stands for the collected render output the file's existing tests already assert on.)

- [ ] **Step 2: Verify failure** — `npx vitest run tests/work-story.test.ts`.

- [ ] **Step 3: Implement.**

`dictionary.ts` — `en`: `askedOn: 'Asked',` · `th`: `askedOn: 'ตั้งคำถามไว้เมื่อ',` (place inside the Task 3 wave-2 section, sharing its comment).

`work/[slug]/page.tsx` — import `getQuestions` (extend the existing `@/lib/content` import) and `formatDate from '@/lib/format'`; in `WorkStoryPage` after the `body` line:

```ts
  // Born-from-a-question line (wave 2, spec §5): if an `answered` question
  // in the Questions DB points its LinkSlug at this story, surface when it
  // was asked -- the loop's receipt. No match, no line (honest-tier: the
  // slot is never filled with anything fabricated). getQuestions() is
  // cache()-wrapped, so this costs one Questions query per story render in
  // Notion mode and nothing in fixture mode.
  const origin = (await getQuestions()).find(
    (question) => question.status === 'answered' && question.linkSlug === slug,
  );
```

In the JSX, between the `<h1>` and the `<div className="mt-8">`:

```tsx
      {origin && (
        <p className="mt-3 text-xs text-soft">
          {dict[locale].askedOn} {formatDate(origin.date, locale)}
        </p>
      )}
```

- [ ] **Step 4: Verify** — targeted run PASS, then `npm run check`.
- [ ] **Step 5: Commit** — `git add "src/app/[locale]/work/[slug]/page.tsx" src/lib/dictionary.ts tests/work-story.test.ts && git commit -m "feat(work): born-from-a-question line on case pages (wave 2, task 4)"`

### Task 5: Footer freshness line

**Files:**
- Modify: `src/components/SiteFooter.tsx`
- Modify: `src/lib/dictionary.ts` (en + th: `contentUpdated`)
- Test: `tests/site-footer.test.tsx`

**Interfaces:**
- Consumes: `getPosts`, `getQuestions` (Task 2), `formatDate`.
- Produces: nothing new for later tasks — render-only.

- [ ] **Step 1: Failing tests** — `tests/site-footer.test.tsx` mocks `@/lib/content` with `{ ...actual, getProfile }`; the real `getPosts`/`getQuestions` resolve `[]` in fixture mode, so every existing no-arg `SiteFooter()` test keeps passing (line absent). Extend the mock so tests can override both: add two mutable module-level arrays (`let mockPosts: PostMeta[] = []; let mockQuestions: OpenQuestion[] = [];`, reset in a `beforeEach`), spread them into the mock as `getPosts: async () => mockPosts, getQuestions: async () => mockQuestions`, then add:

```ts
it('renders the freshness line from the newest of post/question dates', async () => {
  mockPosts = [{ id: 'p1', slug: 's', title: { en: 'T', th: 'T' }, date: '2026-07-01', tags: [] }];
  mockQuestions = [
    { id: 'q1', question: { en: 'Q?', th: 'Q?' }, status: 'wondering', linkSlug: null, date: '2026-08-10' },
  ];
  const { default: SiteFooter } = await import('@/components/SiteFooter');
  const text = collectText(await SiteFooter({ locale: 'en' })).join(' ');
  expect(text).toContain('Content last updated');
  expect(text).toContain('Aug 10, 2026');
  expect(text).not.toContain('Jul 1, 2026');
});

it('omits the freshness line entirely when no dated content exists', async () => {
  mockPosts = [];
  mockQuestions = [];
  const { default: SiteFooter } = await import('@/components/SiteFooter');
  const text = collectText(await SiteFooter()).join(' ');
  expect(text).not.toContain('Content last updated');
});
```

- [ ] **Step 2: Verify failure.**

- [ ] **Step 3: Implement.**

`dictionary.ts` — `en`: `contentUpdated: 'Content last updated',` · `th`: `contentUpdated: 'เนื้อหาอัปเดตล่าสุด',` (same wave-2 section).

`SiteFooter.tsx` — import `getPosts`, `getQuestions` (extend the content import) and `formatDate from '@/lib/format'`; replace the single `getProfile()` await:

```ts
  const [profile, posts, questions] = await Promise.all([getProfile(), getPosts(), getQuestions()]);
  // Honest freshness (wave 2, spec §6): the newest date the CMS actually
  // has -- posts and questions are its only two dated sources (projects
  // deliberately carry none; see sitemap.ts). Both lists arrive date-desc
  // sorted, so the newest of each list's head is the site's newest. No
  // dates -> no line, never a fake one. Costs one Posts + one Questions
  // list query per ISR render in Notion mode (hourly, cache()-deduped
  // within a render).
  const newest =
    [posts[0]?.date, questions[0]?.date].filter((d): d is string => Boolean(d)).sort().pop() ?? null;
```

In the JSX, above the `footerNote` line:

```tsx
      {newest && (
        <p className="mb-1 text-[11px] text-on-dark-soft">
          {t.contentUpdated} {formatDate(newest, locale)}
        </p>
      )}
```

(`footerNote`'s own `<p>` stays untouched.)

- [ ] **Step 4: Verify** — `npx vitest run tests/site-footer.test.tsx` PASS, then `npm run check`.
- [ ] **Step 5: Commit** — `git add src/components/SiteFooter.tsx src/lib/dictionary.ts tests/site-footer.test.tsx && git commit -m "feat(footer): honest content-freshness line (wave 2, task 5)"`

### Task 6: Documentation

**Files:**
- Modify: `docs/NOTION_SETUP.md`

- [ ] **Step 1:** Add a **Questions** database section after Skills, matching the doc's existing table style: the six properties from spec §2 (Question Title required; QuestionTH Text optional, EN fallback; Status Select with exactly `wondering`/`building`/`answered` — anything else reads as `wondering`; LinkSlug Text — fill with the `/work/` slug when a question becomes a shipped case study; Date Date — when the question was born; left empty, the row's created time is used; Published Checkbox). Prose: the home band shows the newest 3 `wondering`/`building` questions; `answered` rows leave the band and instead power the case page's "Asked …" line via LinkSlug; an empty band hides itself — log questions only when they actually occur. Add `NOTION_DB_QUESTIONS=...` to the env-var block next to `NOTION_DB_SKILLS`, with a note that until it is set the band (and nothing else) stays hidden.
- [ ] **Step 2:** `npm run check` (run anyway per task contract).
- [ ] **Step 3: Commit** — `git add docs/NOTION_SETUP.md && git commit -m "docs(notion): Questions DB schema + band behavior (wave 2, task 6)"`

### Task 7: Orchestrator close-out (not a subagent task)

- [ ] Create the **Questions** database in Notion via MCP under the CMS parent (`3baa127d90d781c8ac9dde561d7f608a`): Question (title), QuestionTH (rich text), Status (select: wondering/building/answered), LinkSlug (rich text), Date (date), Published (checkbox). No seeded rows — the owner logs his own questions (parent spec §3: "Log questions in Notion as they actually occur").
- [ ] Update the CMS parent page blurb: it still says "four databases" — make it name all six with one line each for Skills + Questions.
- [ ] Sequentially: `npm run check`, `npm run build`, `npm run build:webpack`.
- [ ] Browser QA (chrome-devtools MCP, `emulate` for viewports), both locales, desktop + 390px: band typography/rhythm between Work and Clients (temporarily non-empty `questions.json` for the visual pass — REVERT before commit, never ship invented questions), building chip, footer line, no horizontal overflow, band absent when fixture is `[]`.
- [ ] Push to main; live smoke on klao-site.vercel.app (band correctly absent until the owner adds `NOTION_DB_QUESTIONS` + logs a question; footer line absent until a dated row exists; home unharmed).
- [ ] Report to the owner: Vercel env var to add (`NOTION_DB_QUESTIONS`, alongside the still-missing `NOTION_DB_SKILLS`), `git pull` needed on the Desktop checkout, wave-1 stories still pending.

## Self-review (done at plan time)

- Spec coverage: §2→Task 7 (DB) + Task 6 (docs); §3→Tasks 1–2; §4→Task 3; §5→Task 4; §6→Task 5; §7→Tasks 3/4/5 dictionary steps; §8→each task's tests + Task 7 browser pass; §9→Task 7 report. No gaps.
- Types: `OpenQuestion` fields (`id/question/status/linkSlug/date`) used identically in Tasks 2–5 test data; `getQuestions()` name consistent everywhere.
- Placeholders: Task 4's mock-override mechanics are explicitly delegated to `tests/work-story.test.ts`'s existing idiom (that file is authoritative); everything else is concrete.
