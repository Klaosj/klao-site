# White Edition — P2 Signature, Projects index, Project sheets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the 2022 → 2026 Signature scene after the hero tour, replace WorkDeck with the compact two-column Projects index, and give every project a native `<dialog>` sheet addressable at `#work/<key>`.

**Architecture:** Pure, DOM-free modules (`sheet-url.ts`, `project-view.ts`, `signature.ts`) hold every rule and number and are unit-tested in node. Server components (`Signature`, `ProjectsIndex`) pick data from the Project rows and render full content into the server HTML; two client islands add behaviour only: `SignatureScene` upgrades the static stack to a pinned scene (CSS `animation-timeline: view()` where supported, IntersectionObserver + rAF fallback elsewhere, over one shared geometry), and `ProjectSheet` owns the `<dialog>` and the `#work/<key>` history contract.

**Tech Stack:** Next.js 15.5 App Router · React 19.2 · Tailwind v4.3 (tokens via C1/C9 classes; component CSS files) · Vitest 3 + Testing Library (jsdom per file) · Playwright (via the npx cache, QA only).

**Spec:** docs/superpowers/specs/2026-09-25-white-edition-design.md · Master plan (contracts, global constraints): docs/superpowers/plans/2026-09-25-white-edition.md

## Global Constraints

Inherits every line of the master plan's Global Constraints. Phase-specific additions:

- P2 CSS class names are prefixed (`sig-*`, `pi-*`, `sheet-*`/`smedia`/`sbody`/`lin`, `st-*`) so they never collide with C9 (`.tile`, `.pill`, `.win`, `.glass`) or with P3/P4. C9 classes are reused where they fit: `.t-h2 .t-lead .t-eyebrow .t-cap .t-stat .wrap .section .btn .btn-fill .btn-out .glass .win`.
- `animation-timeline` appears in `src/components/signature.css` and nowhere else in `src/`. P2 keyframes and transitions touch only `opacity` and `transform` (enforced by `tests/p2-css.test.ts`). The hover background on index rows changes without a transition.
- The Signature is the static stack in the server HTML, before hydration, under reduced motion, on screens under 600 px tall and on phones held sideways; `.pin` is only ever added by `SignatureScene`'s effect.
- GoNai green `#1C7A57` is written only in `signature.css` (the pin face and "Open app") and `project-sheet.css` (`.sheet-gonai`), with white text in both themes.
- Sheets never change the route: hash only. Open = `history.pushState(null, '', '#work/<key>')`; Esc / close button / backdrop = `history.replaceState(null, '', pathname + search)`; Back = `popstate`. The home route stays static ISR.
- Every new UI string is prototype copy and lives in `src/lib/dictionary.ts`; everything project-specific that Notion holds (names, questions, descriptions, statuses, kickers, outcomes, stack, links, images, alt text) comes from the Project rows.
- Test data lives in `tests/helpers/lineup.ts` and uses only the prototype's public lineup copy.

## Review Focus

| Master Review Focus | What P2 proves | Task that adds the test |
|---|---|---|
| #3 Bad sheet URLs | `parseSheetHash` rejects `#work/`, `#work/GoNai`, `#work/a/b`, `#work`, and accepts well-formed keys | Task 1 (`tests/sheet-url.test.ts`) |
| #3 Bad sheet URLs | `#work/`, `#work/unknown`, `#work/GoNai` open nothing and throw nothing, on load and on `hashchange`; Back after opening closes the sheet; loading a URL with a valid hash opens it | Task 9 (`tests/project-sheet.test.tsx`) |
| #4 No JS / before hydration | Signature server HTML is the static stack: every caption present, no `pin`, no inline `opacity:0` | Task 6 (`tests/signature-scene.test.tsx`), Task 7 (`tests/signature.test.tsx`) |
| #4 No JS / before hydration | Projects index server HTML carries every row, the door and a closed empty dialog, no inline `opacity:0` | Task 11 (`tests/projects-index.test.tsx`), Task 9 (closed dialog) |
| #1 Pre-migration Notion (supporting; P1 owns the mapper) | No `LineageOf` → no Signature and no lineage card; no Status / question / screenshot → rows and sheets still render whole | Tasks 2, 7, 10, 11 |

---

## Files

| Path | Action | Task |
|---|---|---|
| `src/lib/sheet-url.ts` · `tests/sheet-url.test.ts` | Create | 1 |
| `tests/helpers/lineup.ts` | Create (test data) | 2 |
| `src/lib/project-view.ts` · `tests/project-view.test.ts` | Create | 2 |
| `src/lib/dictionary.ts` · `tests/dictionary.test.ts` | Modify | 3 |
| `src/lib/signature.ts` · `tests/signature-math.test.ts` | Create | 4 |
| `src/components/signature.css` · `tests/p2-css.test.ts` | Create (test extended in 8, 9, 11) | 5 |
| `src/components/SignatureScene.tsx` · `tests/signature-scene.test.tsx` | Create | 6 |
| `src/components/sections/Signature.tsx` · `tests/signature.test.tsx` · `tests/home-order.test.tsx` | Create | 7 |
| `src/app/[locale]/page.tsx` | Modify | 7, 12 |
| `src/components/StatusChip.tsx` · `src/components/status-chip.css` · `tests/status-chip.test.tsx` | Create | 8 |
| `src/components/ProjectSheet.tsx` · `src/components/project-sheet.css` · `tests/project-sheet.test.tsx` | Create | 9 |
| `src/components/ProjectSheet.tsx` · `src/components/project-sheet.css` · `tests/project-sheet-content.test.tsx` | Modify / Create | 10 |
| `src/components/sections/ProjectsIndex.tsx` · `src/components/projects-index.css` · `tests/projects-index.test.tsx` | Create | 11 |
| `src/components/sections/WorkDeck.tsx` · `tests/work-deck.test.tsx` | Delete (WorkDeck has no CSS file of its own) | 12 |
| `tests/smoke.test.tsx` · `tests/home-order.test.tsx` | Modify | 12 |
| `/tmp/klao-qa/p2-shots.mjs` (outside the repo) | Create | 7 |

Consumed from earlier phases (contracts): C1 tokens (`--canvas --mist --card --ink-1/2/3 --kram --link --line --w-aje --w-gonai --w-site --glass-ctl --e1 --e2 --e3`, `--ease-*`), C3 `ThaiText`, C4 `Icon` + `Sketch` (`'rings'`, `'five'`), C5 Project fields, C7 page order, C9 classes, `Reveal`, `slugKey`, P1 fixtures for the five projects, P1 `HeroTour` (`#tour`).

---

### Task 1: Sheet URL helpers (C6)

**Files:** Create `src/lib/sheet-url.ts` · Test `tests/sheet-url.test.ts`
**Interfaces:** Consumes: `slugKey(s: string): string` from `src/lib/format.ts` (P1), `Project` (C5) · Produces: `projectKey(p: Pick<Project,'slug'|'name'>): string`, `sheetHash(key: string): string`, `parseSheetHash(hash: string): string | null` (exactly C6)

- [ ] **Step 1: Write the failing test** — create `tests/sheet-url.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseSheetHash, projectKey, sheetHash } from '@/lib/sheet-url';

describe('projectKey', () => {
  it('uses the story slug when the project has one', () => {
    expect(projectKey({ slug: 'building-gonai', name: 'GoNai' })).toBe('building-gonai');
  });

  it('falls back to the slugged name, so every project has a sheet key', () => {
    expect(projectKey({ slug: null, name: 'GoNai' })).toBe('gonai');
    expect(projectKey({ slug: null, name: 'klao-site' })).toBe('klao-site');
    expect(projectKey({ slug: null, name: 'Talatify' })).toBe('talatify');
  });
});

describe('sheetHash', () => {
  it('addresses a sheet under #work/', () => {
    expect(sheetHash('gonai')).toBe('#work/gonai');
  });
});

describe('parseSheetHash (Review Focus #3)', () => {
  it.each([
    ['#work/gonai', 'gonai'],
    ['#work/klao-site', 'klao-site'],
    ['#work/a1-b2', 'a1-b2'],
    // Well-formed but unknown: parsing succeeds, and ProjectSheet is what finds no project
    // for it and opens nothing (tests/project-sheet.test.tsx).
    ['#work/unknown', 'unknown'],
  ])('reads %s as %s', (hash, key) => {
    expect(parseSheetHash(hash)).toBe(key);
  });

  it.each([
    '',
    '#',
    '#work',
    '#work/',
    '#work/GoNai',
    '#work/gonai/',
    '#work/gonai/extra',
    '#work/gonai?x=1',
    '#work/go nai',
    '#work/ก',
    'work/gonai',
    '#career',
  ])('rejects %j', (hash) => {
    expect(parseSheetHash(hash)).toBeNull();
  });

  it('round-trips every key sheetHash makes', () => {
    for (const key of ['gonai', 'klao-site', 'aje', 'talatify', 'tripedia']) {
      expect(parseSheetHash(sheetHash(key))).toBe(key);
    }
  });
});
```

- [ ] **Step 2: Run it and see it fail** — `npx vitest run tests/sheet-url.test.ts` → FAIL: `Failed to resolve import "@/lib/sheet-url"`.

- [ ] **Step 3: Implement** — create `src/lib/sheet-url.ts`:

```ts
import { slugKey } from './format';
import type { Project } from './models';

// Project sheets live at `#work/<key>` (spec §4 row "#work/<slug>", contract C6). A hash, not a
// route: opening a sheet is a history entry (so Back closes it) while the home page stays one
// static ISR document with no server round trip.

// The key is the project's story slug when it has one, else its name through slugKey
// ("GoNai" -> "gonai"), so every project gets a sheet link, storied or not.
export function projectKey(p: Pick<Project, 'slug' | 'name'>): string {
  return p.slug ?? slugKey(p.name);
}

export function sheetHash(key: string): string {
  return `#work/${key}`;
}

// Strict on purpose (Review Focus #3): lowercase slug characters only, nothing after them.
// "#work/" (empty), "#work/GoNai" (keys are never uppercase) and "#work/a/b" parse to null, so a
// hand-typed or stale link opens nothing instead of guessing. A well-formed key that matches no
// project ("#work/unknown") parses fine; ProjectSheet is what finds no project for it.
const SHEET_RE = /^#work\/([a-z0-9-]+)$/;

export function parseSheetHash(hash: string): string | null {
  const m = SHEET_RE.exec(hash);
  return m ? m[1] : null;
}
```

- [ ] **Step 4: Run and pass** — `npx vitest run tests/sheet-url.test.ts` → all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sheet-url.ts tests/sheet-url.test.ts
git commit -m "$(cat <<'EOF'
feat(p2): sheet URL helpers for #work/<key>

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
)"
```

---

### Task 2: Test lineup + project presentation rules

**Files:** Create `tests/helpers/lineup.ts` · Create `src/lib/project-view.ts` · Test `tests/project-view.test.ts`
**Interfaces:** Consumes: `Project`, `ProjectStatusKey`, `ProjectWash` (C5) · Produces:
- `tests/helpers/lineup.ts`: `makeProject(overrides: Partial<Project>): Project`, `TALATIFY`, `TRIPEDIA`, `AJE`, `GONAI`, `KLAO_SITE`, `LINEUP: Project[]`
- `src/lib/project-view.ts`: `type StatusMark = 'live' | 'proto' | 'ring'`; `statusMark(key: ProjectStatusKey | null): StatusMark | null`; `washVar(wash: ProjectWash): string`; `unbreak(s: string): string`; `hostOf(url: string | null): string | null`; `interface Lineage { earlier: Project; later: Project }`; `lineageFor(project: Project, projects: Project[]): Lineage | null`; `findLineage(projects: Project[]): Lineage | null`

- [ ] **Step 1: Write the failing test** — first create the test data `tests/helpers/lineup.ts` (not a test file; `vitest.config.ts` only runs `*.test.ts(x)`):

```ts
import type { Project } from '@/lib/models';

// The prototype's five-project lineup (design/white-edition/prototype/index.html, `P` and
// `STATUS`), shaped as the P1 Project model. Test data only -- every string here is public
// prototype copy. If P1 added required Project fields beyond contract C5, give them their
// mapper defaults in BASE so every P2 test keeps compiling.
const BASE: Project = {
  id: '',
  name: '',
  description: { en: '', th: '' },
  stack: [],
  liveUrl: null,
  repoUrl: null,
  imageSrc: null,
  featured: true,
  order: 0,
  type: 'build',
  outcome: null,
  question: null,
  slug: null,
  statusKey: null,
  status: null,
  kicker: null,
  media: 'win',
  wash: 'none',
  tour: false,
  tourOrder: null,
  lineageOf: null,
  alt: null,
  outcomes: { en: [], th: [] },
};

export function makeProject(overrides: Partial<Project>): Project {
  return { ...BASE, ...overrides };
}

export const TALATIFY = makeProject({
  id: 'fx-talatify',
  name: 'Talatify',
  type: 'business',
  order: 1,
  description: {
    en: 'Fresh-market delivery platform: local wet-market vendors sell online and deliver straight to restaurants and cafés. Co-founder; pitched at the TEP startup screening round, 2025.',
    th: 'แพลตฟอร์มส่งของสดจากตลาด: พ่อค้าแม่ค้าตลาดสดขายออนไลน์และส่งตรงถึงร้านอาหารและคาเฟ่ เป็น Co-founder นำเสนอในรอบคัดเลือก TEP startup ปี 2025',
  },
  question: {
    en: 'Can a restaurant get wet-market fresh produce without the morning market run?',
    th: 'ร้านอาหารจะได้ของสดจากตลาด โดยไม่ต้องไปจ่ายตลาดเองตอนเช้า ได้ไหม?',
  },
  statusKey: 'pitched',
  status: { en: 'Pitched · TEP 2025', th: 'นำเสนอแล้ว · TEP 2025' },
  kicker: { en: 'Business · Co-founder · 2025', th: 'ธุรกิจ · Co-founder · 2025' },
  media: 'rings',
  alt: {
    en: 'Three nested rings labelled TAM, SAM and SOM, with SOM filled. Method, not to scale.',
    th: 'วงกลมซ้อนสามวง TAM, SAM และ SOM โดยระบาย SOM วิธีคิด ไม่ใช่สัดส่วนจริง',
  },
  outcomes: {
    en: ['Market sized (TAM–SAM–SOM, SOM THB 37M, an estimate)', '5 revenue streams', 'First-year financial plan', 'Clickable prototype'],
    th: ['ขนาดตลาด TAM–SAM–SOM (SOM 37 ล้านบาท เป็นการประเมิน)', '5 ช่องทางรายได้', 'แผนการเงินปีแรก', 'prototype กดได้จริง'],
  },
});

export const TRIPEDIA = makeProject({
  id: 'fx-tripedia',
  name: 'Tripedia',
  type: 'business',
  order: 2,
  description: {
    en: 'Travel-tech startup idea: one platform that plans the whole trip in one place. Co-founder at KATALYST Startup Launchpad 2022, the idea GoNai was later built from.',
    th: 'ไอเดียสตาร์ทอัพท่องเที่ยว: แพลตฟอร์มเดียวที่วางแผนทั้งทริปจบในที่เดียว เป็น Co-founder ใน KATALYST Startup Launchpad 2022 และเป็นไอเดียต้นทางที่ GoNai ถูกสร้างขึ้นจริงในภายหลัง',
  },
  // The Thai carries the prototype card's one allowed break mark, so tests can prove it is
  // removed everywhere it renders.
  question: { en: 'Why does planning one trip take five apps?', th: 'ทำไมวางแผนทริปเดียว|ต้องใช้ตั้งห้าแอป?' },
  statusKey: 'finalist',
  status: { en: 'Final 30 of 500 · 2022', th: 'รอบ 30 ทีมสุดท้ายจาก 500 · 2022' },
  kicker: { en: 'Business · Co-founder · 2022', th: 'ธุรกิจ · Co-founder · 2022' },
  media: 'five',
  alt: { en: 'Five separate app squares become one.', th: 'แอปห้าตัวแยกกัน รวมเป็นหนึ่งเดียว' },
  outcomes: {
    en: ['Final 30 of 500 teams', 'Market sized (TAM–SAM–SOM)', 'Subscription + partner-margin revenue model'],
    th: ['เข้ารอบ 30 ทีมสุดท้ายจาก 500 ทีม', 'ขนาดตลาด TAM–SAM–SOM', 'โมเดลรายได้ subscription + ส่วนแบ่งจากพาร์ตเนอร์'],
  },
});

export const AJE = makeProject({
  id: 'fx-aje',
  name: 'Aje',
  type: 'build',
  order: 3,
  description: {
    en: 'Idea-grading workspace for startup ideas: write one paragraph, get it graded against proven frameworks, and leave with one small test to run next.',
    th: 'เวิร์กสเปซตัดเกรดไอเดียสตาร์ทอัพ: เขียนหนึ่งย่อหน้า ระบบให้เกรดตาม framework ที่พิสูจน์แล้ว แล้วได้การทดสอบเล็กๆ หนึ่งอย่างไปทำต่อ',
  },
  question: { en: 'Is this idea worth a weekend, or a year?', th: 'ไอเดียนี้คุ้มกับ|หนึ่งสุดสัปดาห์ หรือทั้งปี?' },
  statusKey: 'proto',
  status: { en: 'Working prototype', th: 'Prototype ใช้งานได้' },
  kicker: { en: 'Build · Working prototype', th: 'สร้างเอง · Prototype ใช้งานได้' },
  media: 'img',
  wash: 'aje',
  tour: true,
  tourOrder: 1,
  imageSrc: '/images/aje.jpg',
  stack: ['Next.js', 'Claude API', 'Ollama'],
  alt: {
    en: 'Aje’s Review screen for a sample idea, BikeFix Home: the idea, its biggest uncertainty and the next test.',
    th: 'หน้า Review ของ Aje สำหรับไอเดียตัวอย่าง BikeFix Home: ตัวไอเดีย ความไม่แน่นอนที่ใหญ่ที่สุด และการทดสอบถัดไป',
  },
  outcomes: {
    en: ['Working prototype', '8-dimension report card with letter grades', '16 hand-drawn framework diagrams', 'Advisor runs on Claude or a local model'],
    th: ['prototype ใช้งานได้จริง', 'report card 8 มิติพร้อมเกรด', 'framework diagram 16 ใบวาดเอง', 'advisor รันบน Claude หรือโมเดล local'],
  },
});

export const GONAI = makeProject({
  id: 'fx-gonai',
  name: 'GoNai',
  type: 'build',
  order: 4,
  description: {
    en: 'One-day Bangkok trip planner with exact budgets, built as a weekend project.',
    th: 'แอปวางแผนเที่ยวกรุงเทพฯ 1 วัน พร้อมงบประมาณละเอียด สร้างเสร็จในสุดสัปดาห์เดียว',
  },
  question: { en: 'One day in Bangkok — what’s the real budget?', th: 'ไปเที่ยวหนึ่งวัน งบจริงๆ เท่าไหร่?' },
  statusKey: 'live',
  status: { en: 'Live · since Aug 2026', th: 'เปิดใช้งานแล้ว · ตั้งแต่ ส.ค. 2026' },
  kicker: { en: 'Build · Live', th: 'สร้างเอง · เปิดใช้งานแล้ว' },
  media: 'win',
  wash: 'gonai',
  tour: true,
  tourOrder: 2,
  liveUrl: 'https://gonai-three.vercel.app',
  imageSrc: '/images/gonai.jpg',
  stack: ['Next.js', 'Supabase'],
  lineageOf: 'fx-tripedia',
  alt: {
    en: 'GoNai home screen: Plan a full day out, know every baht before you leave, with a budget prompt.',
    th: 'หน้าแรกของ GoNai: วางแผนเที่ยวทั้งวัน รู้ทุกบาทก่อนออกจากบ้าน พร้อมช่องพิมพ์งบประมาณ',
  },
});

export const KLAO_SITE = makeProject({
  id: 'fx-klao-site',
  name: 'klao-site',
  type: 'build',
  order: 6,
  description: {
    en: 'This site. A bilingual personal hub where every project, career entry and line of copy is edited in Notion and goes live within the hour, with no deploy.',
    th: 'เว็บนี้เอง: hub ส่วนตัวสองภาษาที่ทุกโปรเจกต์ ประวัติงาน และข้อความ แก้ใน Notion แล้วขึ้นเว็บภายในหนึ่งชั่วโมง ไม่ต้อง deploy',
  },
  question: {
    en: 'Can a personal site update itself from Notion, in two languages?',
    th: 'เว็บส่วนตัวอัปเดตตัวเองจาก Notion สองภาษาได้ไหม?',
  },
  statusKey: 'live',
  status: { en: 'Live · since Aug 2026', th: 'เปิดใช้งานแล้ว · ตั้งแต่ ส.ค. 2026' },
  kicker: { en: 'Build · This site', th: 'สร้างเอง · เว็บนี้เอง' },
  media: 'notion',
  wash: 'site',
  tour: true,
  tourOrder: 3,
  liveUrl: 'https://klao-site.vercel.app',
  repoUrl: 'https://github.com/Klaosj/klao-site',
  imageSrc: '/images/klao-site.jpg',
  stack: ['Next.js', 'Notion API', 'Vercel'],
  alt: {
    en: 'The project’s own Notion row: name, type, stack and status.',
    th: 'แถวข้อมูลของโปรเจกต์นี้ใน Notion: ชื่อ ประเภท stack และสถานะ',
  },
  outcomes: {
    en: ['Live since Aug 2026', 'Notion as the only CMS', 'EN/TH', '400+ automated tests'],
    th: ['ออนไลน์ตั้งแต่ ส.ค. 2026', 'Notion เป็น CMS เดียว', 'EN/TH', 'เทสต์อัตโนมัติ 400+ ข้อ'],
  },
});

export const LINEUP: Project[] = [TALATIFY, TRIPEDIA, AJE, GONAI, KLAO_SITE];
```

Then create `tests/project-view.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { findLineage, hostOf, lineageFor, statusMark, unbreak, washVar } from '@/lib/project-view';
import { AJE, GONAI, LINEUP, TALATIFY, TRIPEDIA, makeProject } from './helpers/lineup';

describe('statusMark', () => {
  it.each([
    ['live', 'live'],
    ['proto', 'proto'],
    ['pitched', 'ring'],
    ['finalist', 'ring'],
    [null, null],
  ] as const)('%s -> %s', (key, mark) => {
    expect(statusMark(key)).toBe(mark);
  });
});

describe('washVar', () => {
  it.each([
    ['aje', 'var(--w-aje)'],
    ['gonai', 'var(--w-gonai)'],
    ['site', 'var(--w-site)'],
    ['none', 'var(--mist)'],
  ] as const)('%s -> %s', (wash, css) => {
    expect(washVar(wash)).toBe(css);
  });
});

describe('unbreak', () => {
  it('removes the | break mark and nothing else', () => {
    expect(unbreak('ทำไมวางแผนทริปเดียว|ต้องใช้ตั้งห้าแอป?')).toBe('ทำไมวางแผนทริปเดียวต้องใช้ตั้งห้าแอป?');
    expect(unbreak('No mark here.')).toBe('No mark here.');
    expect(unbreak('')).toBe('');
  });
});

describe('hostOf', () => {
  it('returns the host only, never a path', () => {
    expect(hostOf('https://gonai-three.vercel.app/plan?x=1')).toBe('gonai-three.vercel.app');
  });

  it('returns null for no URL or a malformed one', () => {
    expect(hostOf(null)).toBeNull();
    expect(hostOf('')).toBeNull();
    expect(hostOf('not a url')).toBeNull();
  });
});

describe('findLineage', () => {
  it('pairs the row whose LineageOf points at another (GoNai <- Tripedia)', () => {
    expect(findLineage(LINEUP)).toEqual({ earlier: TRIPEDIA, later: GONAI });
  });

  it('is null when no row has LineageOf (pre-migration Notion)', () => {
    expect(findLineage(LINEUP.map((p) => ({ ...p, lineageOf: null })))).toBeNull();
  });

  it('is null when LineageOf points at a row that is not in the list (unpublished)', () => {
    expect(findLineage([TALATIFY, AJE, GONAI])).toBeNull();
  });

  it('ignores a row that names itself', () => {
    expect(findLineage([makeProject({ id: 'x', name: 'X', lineageOf: 'x' })])).toBeNull();
  });
});

describe('lineageFor', () => {
  it('finds the pair from the later end', () => {
    expect(lineageFor(GONAI, LINEUP)).toEqual({ earlier: TRIPEDIA, later: GONAI });
  });

  it('finds the pair from the earlier end', () => {
    expect(lineageFor(TRIPEDIA, LINEUP)).toEqual({ earlier: TRIPEDIA, later: GONAI });
  });

  it('is null for a project outside the pair', () => {
    expect(lineageFor(AJE, LINEUP)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and see it fail** — `npx vitest run tests/project-view.test.ts` → FAIL: `Failed to resolve import "@/lib/project-view"`.

- [ ] **Step 3: Implement** — create `src/lib/project-view.ts`:

```ts
import type { Project, ProjectStatusKey, ProjectWash } from './models';

// Small, pure presentation rules shared by the projects index, the project sheet and the
// signature -- one copy of each rule, so the three surfaces can never disagree.

// Status marks are monochrome shape + word (spec §5.1): filled = live, half = working
// prototype, ring = a business play that was pitched or placed. Colour never carries it.
export type StatusMark = 'live' | 'proto' | 'ring';

export function statusMark(key: ProjectStatusKey | null): StatusMark | null {
  if (key === 'live') return 'live';
  if (key === 'proto') return 'proto';
  if (key === 'pitched' || key === 'finalist') return 'ring';
  return null;
}

// Project colour appears only as a wash behind its own media (spec §3, 24 Sep). 'none' falls
// back to the mist band colour so a pre-migration row still gets a calm surface.
const WASH_VAR: Record<ProjectWash, string> = {
  aje: 'var(--w-aje)',
  gonai: 'var(--w-gonai)',
  site: 'var(--w-site)',
  none: 'var(--mist)',
};

export function washVar(wash: ProjectWash): string {
  return WASH_VAR[wash];
}

// '|' in Notion copy marks the one allowed Thai break inside display text (spec §5.2), where
// ThaiText consumes it. Body-size text (index rows, table cells) has no keep-runs, so there the
// mark is simply removed.
export function unbreak(s: string): string {
  return s.replace(/\|/g, '');
}

// The address a screenshot window's bar shows: the host only, never a path or query.
export function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export interface Lineage {
  earlier: Project;
  later: Project;
}

// The idea -> app pair a project belongs to, from either end: the later row names the earlier
// one in LineageOf (GoNai -> Tripedia). A LineageOf that resolves to no row in the list (the
// earlier row unpublished) is no lineage at all, so the lineage card and the Signature disappear
// instead of rendering half a story.
export function lineageFor(project: Project, projects: Project[]): Lineage | null {
  if (project.lineageOf) {
    const earlier = projects.find((p) => p.id === project.lineageOf && p.id !== project.id);
    return earlier ? { earlier, later: project } : null;
  }
  const later = projects.find((p) => p.lineageOf === project.id && p.id !== project.id);
  return later ? { earlier: project, later } : null;
}

// The first resolvable pair in Order -- what the Signature scene tells.
export function findLineage(projects: Project[]): Lineage | null {
  for (const p of projects) {
    if (!p.lineageOf) continue;
    const pair = lineageFor(p, projects);
    if (pair) return pair;
  }
  return null;
}
```

- [ ] **Step 4: Run and pass** — `npx vitest run tests/project-view.test.ts` → all pass. Then `npx tsc --noEmit` → exit 0 (proves `tests/helpers/lineup.ts` matches P1's `Project`; if it reports a missing property, add that field's mapper default to `BASE` and re-run).

- [ ] **Step 5: Commit**

```bash
git add tests/helpers/lineup.ts src/lib/project-view.ts tests/project-view.test.ts
git commit -m "$(cat <<'EOF'
feat(p2): shared project presentation rules and the prototype lineup as test data

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
)"
```

---

### Task 3: Dictionary copy for the signature, index and sheet

**Files:** Modify `src/lib/dictionary.ts` (the `en` object's closing entries around line 197, the `th` object's around line 296, and `th.workTypeBuild` line 222 / `th.deckSubtitle` line 224) · Modify `tests/dictionary.test.ts` (line 32 `sharedKeys`, append tests)
**Interfaces:** Produces dictionary keys (both locales): `sigTitle sigSub sigCardKicker sigCardLabel sigCaption sigCaptionSub sigLive workOpenApp workDoor sheetWhat sheetOutcomes sheetStack sheetStatus sheetClose sheetNotionNote lineageTitle lineageRowHead lineageQuestion` (strings) and `lineageExisted lineageTeam lineageResult` (`readonly string[]` of `[label, earlier, later]`). CHANGED: `th.workTypeBuild` → `'สร้างเอง'`, `th.deckSubtitle` → prototype wording. Reused as-is: `deckHeading`, `deckSubtitle`, `deckSubtitleBuildOnly`, `workTypeBusiness`, `workTypeBuild`, `viewCode`, `readStory`.

- [ ] **Step 1: Write the failing test** — in `tests/dictionary.test.ts`, add `'sigCardKicker'` to the `sharedKeys` Set, keeping every entry earlier phases added. After P1 the line reads `const sharedKeys = new Set<string>(['navFaq']); // "FAQ" is the Thai UI's word too (prototype UI.th.nav)`; replace it with:

```ts
    // navFaq (P1): "FAQ" is the Thai UI's word too (prototype UI.th.nav).
    // sigCardKicker (P2): "2022 · Tripedia · Co-founder" is a year, a name and a role title the
    // prototype keeps in English on /th too.
    const sharedKeys = new Set<string>(['navFaq', 'sigCardKicker']);
```

(If P0 also added entries, keep them in the same array.)

and append these two tests inside the `describe('dictionary', …)` block, after the last `it(…)`:

```ts
  it('carries the White Edition signature, index and sheet copy (prototype wording) in both locales', () => {
    expect(dict.en.sigTitle).toBe('The idea, then the app.');
    expect(dict.en.sigCaption).toBe('Four years. The idea stayed.');
    expect(dict.en.workDoor).toBe('By day: one retail-media deal, from first meeting to a network that runs itself ›');
    expect(dict.en.lineageTitle).toBe('Same idea, four years apart.');
    expect(dict.th.sigTitle).toBe('ไอเดียมาก่อน แล้วค่อยเป็นแอป');
    expect(dict.th.workTypeBuild).toBe('สร้างเอง');
    expect(dict.th.deckSubtitle).toBe('ธุรกิจมาก่อน ทุกโปรเจกต์เริ่มจากคำถามที่มันตอบ');
    for (const k of ['lineageExisted', 'lineageTeam', 'lineageResult'] as const) {
      expect(dict.en[k]).toHaveLength(3);
      expect(dict.th[k]).toHaveLength(3);
    }
  });

  it('never promises instant updates in the sheet note (ISR takes about an hour)', () => {
    expect(dict.en.sheetNotionNote).toContain('within the hour');
    for (const d of [dict.en, dict.th]) {
      expect(d.sheetNotionNote).not.toMatch(/instant|immediately|ทันที/i);
    }
  });
```

- [ ] **Step 2: Run it and see it fail** — `npx vitest run tests/dictionary.test.ts` → FAIL: `expected undefined to be 'The idea, then the app.'` (and `npx tsc --noEmit` reports `Property 'sigTitle' does not exist`).

- [ ] **Step 3: Implement** — in `src/lib/dictionary.ts`:

(a) Append as the last entries of `const en = { … }` (after `tourStill: 'Still view',`, or after whatever P1 appended last):

```ts
  // White Edition P2 -- the 2022 → 2026 signature (prototype UI.sigTitle, sigSub, card, pillA,
  // pillB). Project facts the scene shows (question, name, description, link, screenshot) come
  // from the Project rows; these are the scene's own words.
  sigTitle: 'The idea, then the app.',
  sigSub: 'Tripedia made the final 30 of 500 teams in 2022. Four years later, GoNai is that idea, built and live.',
  sigCardKicker: '2022 · Tripedia · Co-founder',
  sigCardLabel: 'final teams · KATALYST Startup Launchpad',
  sigCaption: 'Four years. The idea stayed.',
  sigCaptionSub: 'Same question, now with the tools to build the answer alone.',
  sigLive: 'Live',
  // Projects index and sheet (prototype UI.door, UI.sheet, UI.lineage).
  workOpenApp: 'Open app',
  workDoor: 'By day: one retail-media deal, from first meeting to a network that runs itself ›',
  sheetWhat: 'What it is',
  sheetOutcomes: 'What came of it',
  sheetStack: 'Built with',
  sheetStatus: 'Status',
  sheetClose: 'Close',
  // "within the hour", never "instantly": the site updates through ISR, about an hour.
  sheetNotionNote: 'Edit this row in Notion, and this page follows within the hour.',
  lineageTitle: 'Same idea, four years apart.',
  lineageRowHead: 'Row',
  lineageQuestion: 'Question',
  // [row label, earlier project's cell, later project's cell] -- the lineage card's fixed rows.
  lineageExisted: ['What existed', 'A business plan (market sizing, revenue model)', 'A live app'] as readonly string[],
  lineageTeam: ['Team', 'Co-founders', 'Solo, with Claude'] as readonly string[],
  lineageResult: ['Result', 'Final 30 of 500', 'Live since Aug 2026'] as readonly string[],
```

(b) Append as the last entries of `const th: typeof en = { … }` (after `tourStill: 'มุมมองภาพนิ่ง',`, or after P1's last entry):

```ts
  sigTitle: 'ไอเดียมาก่อน แล้วค่อยเป็นแอป',
  sigSub: 'Tripedia เข้ารอบ 30 ทีมสุดท้ายจาก 500 ทีมในปี 2022 สี่ปีต่อมา GoNai คือไอเดียเดิมที่สร้างขึ้นจริงและเปิดใช้งานแล้ว',
  sigCardKicker: '2022 · Tripedia · Co-founder',
  sigCardLabel: 'ทีมสุดท้าย · KATALYST Startup Launchpad',
  sigCaption: 'สี่ปีต่อมา ไอเดียยังอยู่',
  sigCaptionSub: 'คำถามเดิม แต่ตอนนี้มีเครื่องมือที่สร้างคำตอบได้เองคนเดียว',
  sigLive: 'เปิดใช้งานแล้ว',
  workOpenApp: 'เปิดแอป',
  workDoor: 'งานกลางวัน: ดีลสื่อในร้านหนึ่งดีล ตั้งแต่นัดแรกจนเครือข่ายเดินเองได้ ›',
  sheetWhat: 'คืออะไร',
  sheetOutcomes: 'ได้อะไรออกมา',
  sheetStack: 'สร้างด้วย',
  sheetStatus: 'สถานะ',
  sheetClose: 'ปิด',
  sheetNotionNote: 'แก้แถวนี้ใน Notion แล้วหน้านี้จะตามภายในหนึ่งชั่วโมง',
  lineageTitle: 'ไอเดียเดียวกัน ห่างกันสี่ปี',
  lineageRowHead: 'หัวข้อ',
  lineageQuestion: 'คำถาม',
  lineageExisted: ['สิ่งที่มี', 'แผนธุรกิจ (ขนาดตลาด โมเดลรายได้)', 'แอปที่เปิดใช้ได้จริง'],
  lineageTeam: ['ทีม', 'Co-founder', 'ทำคนเดียวร่วมกับ Claude'],
  lineageResult: ['ผล', 'รอบ 30 ทีมสุดท้ายจาก 500', 'เปิดใช้งานตั้งแต่ ส.ค. 2026'],
```

(c) CHANGED to the prototype's wording — replace line 222:

```ts
  workTypeBuild: 'งานสร้างเอง',
```

with

```ts
  workTypeBuild: 'สร้างเอง',
```

and replace line 224:

```ts
  deckSubtitle: 'ธุรกิจมาก่อน — ทุกโปรเจกต์เริ่มจากคำถามที่มันตอบ',
```

with

```ts
  deckSubtitle: 'ธุรกิจมาก่อน ทุกโปรเจกต์เริ่มจากคำถามที่มันตอบ',
```

- [ ] **Step 4: Run and pass** — `npx vitest run tests/dictionary.test.ts` → all pass. `npx tsc --noEmit` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dictionary.ts tests/dictionary.test.ts
git commit -m "$(cat <<'EOF'
feat(p2): signature, index and sheet copy from the prototype

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
)"
```

---

### Task 4: Signature math (pure)

**Files:** Create `src/lib/signature.ts` · Test `tests/signature-math.test.ts`
**Interfaces:** Produces:
- `SIG_YEARS: readonly ['2022','2023','2024','2025','2026']`, `SIG_STAT: { value: '30'; total: '500' }`
- `type SigWindow = readonly [number, number]`; `SIG` (named progress windows: `head gather capAIn cardOut collapse face frameIn zoom tilesOut tint capAOut capBIn chipOut`); `SIG_YEAR_STEPS = [0.4, 0.5, 0.6, 0.7]`
- `clamp(v,a,b)`, `sub(p, w: SigWindow)`, `glide(t)`, `sigProgress(scrollY, start, length)`, `shouldPin({ reducedMotion, width, height })`, `sigYear(p): number`
- `interface SigPoint { x; y; r }`, `interface SigTile { scatter; ring; pile }`, `interface SigGeometry { phone; card{left,top}; chip{left,top}; frame{width,left,top,scale0,dx,dy}; tiles: SigTile[] }`, `interface SigInput { width; height; cardWidth; cardHeight }`, `sigGeometry(input): SigGeometry`
- `tileTransform(p: SigPoint): string`; `interface SigStyle { opacity: string; transform: string }`; `interface SigFrameStyles { head; tiles: SigStyle[]; face: string; card; frame; tint: string; chip: string; year: number; capA; capB }`; `sigFrame(p, g): SigFrameStyles`; `interface SigVars { tiles: { s; k; p }[]; frameStart: string }`; `sigVars(g): SigVars`

- [ ] **Step 1: Write the failing test** — create `tests/signature-math.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  SIG_YEARS,
  SIG_YEAR_STEPS,
  glide,
  shouldPin,
  sigFrame,
  sigGeometry,
  sigProgress,
  sigVars,
  sigYear,
  type SigPoint,
} from '@/lib/signature';

// Card sizes as measured on the prototype at 1440×900 and 390×844.
const DESK = sigGeometry({ width: 1440, height: 900, cardWidth: 440, cardHeight: 240 });
const PHONE = sigGeometry({ width: 390, height: 844, cardWidth: 350, cardHeight: 260 });

function expectPoint(actual: SigPoint, expected: SigPoint) {
  expect(actual.x).toBeCloseTo(expected.x, 6);
  expect(actual.y).toBeCloseTo(expected.y, 6);
  expect(actual.r).toBe(expected.r);
}

describe('glide (cubic-bezier(.4,0,.6,1), the --ease-glide token)', () => {
  it('is pinned at both ends', () => {
    expect(glide(0)).toBe(0);
    expect(glide(1)).toBe(1);
  });

  it('is symmetric around the midpoint', () => {
    expect(glide(0.5)).toBeCloseTo(0.5, 3);
    expect(glide(0.25) + glide(0.75)).toBeCloseTo(1, 3);
  });

  it('never runs backwards', () => {
    let prev = 0;
    for (let i = 0; i <= 20; i++) {
      const v = glide(i / 20);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe('sigProgress', () => {
  it('maps the pinned scroll to 0..1 and clamps outside it', () => {
    expect(sigProgress(1000, 1000, 900)).toBe(0);
    expect(sigProgress(1450, 1000, 900)).toBe(0.5);
    expect(sigProgress(5000, 1000, 900)).toBe(1);
    expect(sigProgress(0, 1000, 900)).toBe(0);
  });

  it('never divides by zero', () => {
    expect(sigProgress(10, 0, 0)).toBe(1);
  });
});

describe('shouldPin', () => {
  it('pins on a desktop with motion allowed', () => {
    expect(shouldPin({ reducedMotion: false, width: 1440, height: 900 })).toBe(true);
  });

  it('pins on a phone held upright', () => {
    expect(shouldPin({ reducedMotion: false, width: 390, height: 844 })).toBe(true);
  });

  it('never pins under reduced motion', () => {
    expect(shouldPin({ reducedMotion: true, width: 1440, height: 900 })).toBe(false);
  });

  it('keeps the static stack on a short screen', () => {
    expect(shouldPin({ reducedMotion: false, width: 1440, height: 560 })).toBe(false);
  });

  it('keeps the static stack on a phone held sideways', () => {
    expect(shouldPin({ reducedMotion: false, width: 700, height: 650 })).toBe(false);
  });
});

describe('sigGeometry', () => {
  it('centres the card at 54% of the stage height on desktop', () => {
    expect(DESK.phone).toBe(false);
    expect(DESK.card.left).toBeCloseTo(500, 6); // 720 - 220
    expect(DESK.card.top).toBeCloseTo(366, 6); // 486 - 120
    expect(DESK.chip.left).toBeCloseTo(690, 6);
    expect(DESK.chip.top).toBeCloseTo(318, 6);
  });

  it('sizes the frame to the stage minus 160 px (max 1280) and starts it as one 56 px tile on the card', () => {
    expect(DESK.frame.width).toBe(1280);
    expect(DESK.frame.left).toBe(80);
    expect(DESK.frame.top).toBeCloseTo(90, 6); // 450 - 720 / 2
    expect(DESK.frame.scale0).toBeCloseTo(56 / 1280, 9);
    expect(DESK.frame.dx).toBe(0);
    expect(DESK.frame.dy).toBeCloseTo(36, 6); // card centre 486 - frame centre 450
  });

  it('scatters the five tiles around the card, rings them, then piles them at its centre', () => {
    expect(DESK.tiles).toHaveLength(5);
    expectPoint(DESK.tiles[0].scatter, { x: 720 - 220 - 120 - 28, y: 486 - 120 - 30 - 28, r: -8 });
    expectPoint(DESK.tiles[0].ring, { x: 720 - 220 - 40 - 28, y: 486 - 120 + 44 - 28, r: 0 });
    expectPoint(DESK.tiles[0].pile, { x: 720 - 28, y: 486 - 28, r: 0 });
    expectPoint(DESK.tiles[4].pile, { x: 720 - 8 - 28, y: 486 + 10 - 28, r: -10 });
  });

  it('uses the full width and a single row of tiles on a phone', () => {
    expect(PHONE.phone).toBe(true);
    expect(PHONE.frame.width).toBe(390);
    const ringX = PHONE.tiles.map((t) => t.ring.x);
    [-128, -64, 0, 64, 128].forEach((d, i) => expect(ringX[i]).toBeCloseTo(195 + d - 28, 6));
    expect(new Set(PHONE.tiles.map((t) => t.ring.y.toFixed(3))).size).toBe(1);
  });
});

describe('sigYear', () => {
  it('steps the chip from 2022 to 2026 at SIG_YEAR_STEPS', () => {
    expect(SIG_YEARS[sigYear(0)]).toBe('2022');
    expect(SIG_YEARS[sigYear(0.39)]).toBe('2022');
    expect(SIG_YEARS[sigYear(0.4)]).toBe('2023');
    expect(SIG_YEARS[sigYear(0.7)]).toBe('2026');
    expect(SIG_YEARS[sigYear(1)]).toBe('2026');
    expect(SIG_YEAR_STEPS.length + 1).toBe(SIG_YEARS.length);
  });
});

describe('sigFrame', () => {
  it('starts on the head, the card and the scattered tiles, with both captions away', () => {
    const f = sigFrame(0, DESK);
    expect(f.head.opacity).toBe('1.000');
    expect(f.card.opacity).toBe('1.000');
    expect(f.tiles.map((t) => t.transform)).toEqual(sigVars(DESK).tiles.map((t) => t.s));
    expect(f.frame.opacity).toBe('0.000');
    expect(f.capA.opacity).toBe('0.000');
    expect(f.capB.opacity).toBe('0.000');
    // Off-stage, not just transparent: its "Open app" link cannot be clicked while invisible.
    expect(f.capB.transform).toBe('translateY(100vh)');
    expect(f.year).toBe(0);
  });

  it('rings the tiles by .34 and piles them by .50 -- the same strings the CSS path reads', () => {
    expect(sigFrame(0.37, DESK).tiles.map((t) => t.transform)).toEqual(sigVars(DESK).tiles.map((t) => t.k));
    expect(sigFrame(0.51, DESK).tiles.map((t) => t.transform)).toEqual(sigVars(DESK).tiles.map((t) => t.p));
  });

  it('at .45 the head is gone, the card is fading, caption A is up and the chip reads 2023', () => {
    const f = sigFrame(0.45, DESK);
    expect(f.head.opacity).toBe('0.000');
    expect(Number(f.card.opacity)).toBeCloseTo(0.3, 3);
    expect(f.capA.opacity).toBe('1.000');
    expect(SIG_YEARS[f.year]).toBe('2023');
  });

  it('at .60 GoNai has opened from the pile and the tiles are gone', () => {
    const f = sigFrame(0.6, DESK);
    expect(f.tiles.every((t) => t.opacity === '0.000')).toBe(true);
    expect(f.frame.opacity).toBe('1.000');
    expect(f.face).toBe('1.000');
    expect(SIG_YEARS[f.year]).toBe('2025');
  });

  it('ends on the full frame, the GoNai wash and caption B', () => {
    const f = sigFrame(1, DESK);
    expect(f.frame.transform).toBe('translate(0.0px, 0.0px) scale(1.0000)');
    expect(f.tint).toBe('1.000');
    expect(f.chip).toBe('0.000');
    expect(f.capA.opacity).toBe('0.000');
    expect(f.capB).toEqual({ opacity: '1.000', transform: 'translateY(0.0px)' });
    expect(SIG_YEARS[f.year]).toBe('2026');
  });

  it('starts the frame exactly where the CSS path starts it', () => {
    expect(sigFrame(0.5, DESK).frame.transform).toBe(sigVars(DESK).frameStart);
  });
});
```

- [ ] **Step 2: Run it and see it fail** — `npx vitest run tests/signature-math.test.ts` → FAIL: `Failed to resolve import "@/lib/signature"`.

- [ ] **Step 3: Implement** — create `src/lib/signature.ts`:

```ts
// The 2022 → 2026 signature scene as numbers (spec §4 row 2, §5.5, §6 "Signature"; the
// prototype's `sig` engine). Pure and DOM-free, so it is unit-tested in node.
//
// SignatureScene runs one of two motion paths over the SAME geometry:
//   - CSS scroll-driven (animation-timeline): `sigVars(geometry)` becomes custom properties
//     that the keyframes in signature.css read, and the browser scrubs them off the main thread;
//   - IntersectionObserver + rAF fallback (Firefox today): `sigFrame(progress, geometry)` is
//     painted as inline opacity/transform on each frame.
// `SIG` is the one timetable both follow; tests/p2-css.test.ts fails if the keyframe
// percentages in signature.css drift from it.

/** Year chip, first to last. The eyebrow and the lineage card read its two ends. */
export const SIG_YEARS = ['2022', '2023', '2024', '2025', '2026'] as const;

/** The pitch card's numerals -- with the Career figures, the only big numbers on the page. */
export const SIG_STAT = { value: '30', total: '500' } as const;

export type SigWindow = readonly [number, number];

/** Progress windows: 0 = the track's top meets the viewport's top, 1 = its bottom meets the viewport's bottom. */
export const SIG = {
  head: [0.1, 0.13], // the headline lifts away
  gather: [0.1, 0.34], // tiles: scattered -> ringed around the card
  capAIn: [0.35, 0.38], // "Four years. The idea stayed." in
  cardOut: [0.38, 0.48], // the pitch card fades and settles back
  collapse: [0.4, 0.5], // tiles: ringed -> one pile
  face: [0.46, 0.5], // the top tile turns into GoNai's pin
  frameIn: [0.5, 0.54], // GoNai's frame appears out of the pile
  zoom: [0.5, 0.8], // ... and opens to full size
  tilesOut: [0.52, 0.56], // the pile fades under it
  tint: [0.55, 0.85], // the GoNai wash comes up behind
  capAOut: [0.62, 0.65], // caption A out
  capBIn: [0.72, 0.75], // "GoNai · Live" + Open app in
  chipOut: [0.74, 0.8], // the year chip leaves
} as const satisfies Record<string, SigWindow>;

/** The chip reads SIG_YEARS[n] once progress reaches SIG_YEAR_STEPS[n - 1]. */
export const SIG_YEAR_STEPS = [0.4, 0.5, 0.6, 0.7] as const;

const TILE = 56;
const FRAME_RATIO = 9 / 16; // the screenshots are 16:9

export const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
export const sub = (p: number, [a, b]: SigWindow): number => clamp((p - a) / (b - a), 0, 1);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** cubic-bezier(.4,0,.6,1): x solved by bisection (as in the prototype), exact at both ends. */
export function glide(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  let lo = 0;
  let hi = 1;
  let x = t;
  for (let k = 0; k < 14; k++) {
    const m = (lo + hi) / 2;
    const xm = 3 * 0.4 * m * (1 - m) * (1 - m) + 3 * 0.6 * m * m * (1 - m) + m * m * m;
    if (xm < t) lo = m;
    else hi = m;
    x = m;
  }
  return 3 * x * x * (1 - x) + x * x * x;
}

export function sigProgress(scrollY: number, start: number, length: number): number {
  return clamp((scrollY - start) / Math.max(1, length), 0, 1);
}

/** Pin only with motion allowed, at least 600 px of height, and not on a phone held sideways. */
export function shouldPin({ reducedMotion, width, height }: { reducedMotion: boolean; width: number; height: number }): boolean {
  return !reducedMotion && height >= 600 && (width > 734 || height > width);
}

export function sigYear(p: number): number {
  return SIG_YEAR_STEPS.filter((step) => p >= step).length;
}

export interface SigPoint {
  x: number; // tile's top-left in stage px
  y: number;
  r: number; // rotation, deg
}

export interface SigTile {
  scatter: SigPoint;
  ring: SigPoint;
  pile: SigPoint;
}

export interface SigGeometry {
  phone: boolean;
  card: { left: number; top: number };
  chip: { left: number; top: number };
  frame: { width: number; left: number; top: number; scale0: number; dx: number; dy: number };
  tiles: SigTile[];
}

export interface SigInput {
  width: number; // stage clientWidth
  height: number; // stage clientHeight (100vh / 100svh)
  cardWidth: number; // the pitch card as laid out under `.sig.pin`
  cardHeight: number;
}

type Offset = readonly [number, number, number]; // x, y, deg from the card's centre

/** Port of the prototype's `layout()`: every position the scene uses, from four measurements. */
export function sigGeometry({ width: W, height: H, cardWidth, cardHeight }: SigInput): SigGeometry {
  const phone = W <= 734;
  const hw = cardWidth / 2;
  const hh = cardHeight / 2;
  const cx = W / 2;
  const cy = phone ? H * 0.58 : H * 0.54;
  const fw = phone ? W : Math.min(1280, W - 160);
  const fh = fw * FRAME_RATIO;
  const fcy = phone ? H * 0.45 : H / 2;

  const scatter: Offset[] = phone
    ? [[-hw + 30, -hh - 36, -8], [hw - 30, -hh - 40, 6], [-hw + 20, hh + 40, 7], [hw - 20, hh + 46, -6], [0, hh + 70, 4]]
    : [[-hw - 120, -hh - 30, -8], [hw + 110, -hh - 50, 6], [-hw - 130, hh + 20, 7], [hw + 125, hh + 10, -6], [0, hh + 110, 4]];
  const ring: Offset[] = phone
    ? [-2, -1, 0, 1, 2].map((d): Offset => [d * 64, hh + 40, 0])
    : [[-hw - 40, -hh + 44, 0], [hw + 40, -hh + 44, 0], [-hw - 40, hh - 44, 0], [hw + 40, hh - 44, 0], [0, hh + 40, 0]];
  const pile: Offset[] = [[0, 0, 0], [5, 4, 5], [-5, 6, -6], [8, 9, 9], [-8, 10, -10]];
  const at = ([x, y, r]: Offset): SigPoint => ({ x: cx + x - TILE / 2, y: cy + y - TILE / 2, r });

  return {
    phone,
    card: { left: cx - hw, top: cy - hh },
    chip: { left: cx - 30, top: cy - hh - 48 },
    frame: { width: fw, left: W / 2 - fw / 2, top: fcy - fh / 2, scale0: TILE / Math.max(1, fw), dx: cx - W / 2, dy: cy - fcy },
    tiles: scatter.map((s, i) => ({ scatter: at(s), ring: at(ring[i]), pile: at(pile[i]) })),
  };
}

const px = (n: number): string => `${n.toFixed(1)}px`;
const op = (n: number): string => n.toFixed(3);

export function tileTransform(p: SigPoint): string {
  return `translate(${px(p.x)}, ${px(p.y)}) rotate(${p.r.toFixed(2)}deg)`;
}

function frameTransform(dx: number, dy: number, scale: number): string {
  return `translate(${px(dx)}, ${px(dy)}) scale(${scale.toFixed(4)})`;
}

export interface SigStyle {
  opacity: string;
  transform: string;
}

export interface SigFrameStyles {
  head: SigStyle;
  tiles: SigStyle[];
  face: string; // opacity
  card: SigStyle;
  frame: SigStyle;
  tint: string; // opacity
  chip: string; // opacity
  year: number; // index into SIG_YEARS
  capA: SigStyle;
  capB: SigStyle;
}

/** Every inline style the JS fallback paints at progress p (0..1). */
export function sigFrame(p: number, g: SigGeometry): SigFrameStyles {
  const h = sub(p, SIG.head);
  const t1 = glide(sub(p, SIG.gather));
  const t2 = glide(sub(p, SIG.collapse));
  const tilesOpacity = op(1 - sub(p, SIG.tilesOut));
  const tc = sub(p, SIG.cardOut);
  const tz = glide(sub(p, SIG.zoom));
  const a = Math.min(sub(p, SIG.capAIn), 1 - sub(p, SIG.capAOut));
  const b = sub(p, SIG.capBIn);
  return {
    head: { opacity: op(1 - h), transform: `translateY(${px(-16 * h)})` },
    tiles: g.tiles.map(({ scatter: s, ring: k, pile: q }) => ({
      opacity: tilesOpacity,
      transform: tileTransform({
        x: lerp(lerp(s.x, k.x, t1), q.x, t2),
        y: lerp(lerp(s.y, k.y, t1), q.y, t2),
        r: lerp(lerp(s.r, k.r, t1), q.r, t2),
      }),
    })),
    face: op(sub(p, SIG.face)),
    card: { opacity: op(1 - tc), transform: `scale(${(1 - 0.06 * tc).toFixed(4)})` },
    frame: {
      opacity: op(sub(p, SIG.frameIn)),
      transform: frameTransform(g.frame.dx * (1 - tz), g.frame.dy * (1 - tz), lerp(g.frame.scale0, 1, tz)),
    },
    tint: op(sub(p, SIG.tint)),
    chip: op(1 - sub(p, SIG.chipOut)),
    year: sigYear(p),
    capA: { opacity: op(a), transform: `translateY(${px(8 * (1 - a))})` },
    capB: { opacity: op(b), transform: b === 0 ? 'translateY(100vh)' : `translateY(${px(8 * (1 - b))})` },
  };
}

export interface SigVars {
  tiles: { s: string; k: string; p: string }[]; // --s --k --p per tile
  frameStart: string; // --z0 on the frame
}

/** The geometry as the custom properties signature.css's keyframes read. */
export function sigVars(g: SigGeometry): SigVars {
  return {
    tiles: g.tiles.map((t) => ({ s: tileTransform(t.scatter), k: tileTransform(t.ring), p: tileTransform(t.pile) })),
    frameStart: frameTransform(g.frame.dx, g.frame.dy, g.frame.scale0),
  };
}
```

- [ ] **Step 4: Run and pass** — `npx vitest run tests/signature-math.test.ts` → all pass. `npx tsc --noEmit` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/signature.ts tests/signature-math.test.ts
git commit -m "$(cat <<'EOF'
feat(p2): signature geometry and timetable shared by both motion paths

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
)"
```

---

### Task 5: Signature CSS (static stack, pinned layout, scroll-driven keyframes)

**Files:** Create `src/components/signature.css` · Test `tests/p2-css.test.ts`
**Interfaces:** Consumes: `SIG`, `SIG_YEAR_STEPS` (Task 4); C1 `--w-gonai --mist --card --ink-1 --ink-2 --e1 --e2 --glass-ctl`; C9 `.t-lead` · Produces: classes `.sig .sig-track .sig-stage .sig-tint .sig-head .sig-head-in .sig-chip .sig-year .sig-card .sig-card-kick .sig-card-q .sig-stat .sig-stat-of .sig-card-label .sig-apps .sig-app .sig-app-face .sig-ln .sig-frame .sig-cap .sig-cap-a .sig-cap-b .sig-cap-t1 .sig-cap-t2 .sig-open`; state class `.pin`; custom properties `--s --k --p` (tiles) and `--z0` (frame); `view-timeline: --sig`

- [ ] **Step 1: Write the failing test** — create `tests/p2-css.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SIG, SIG_YEAR_STEPS, type SigWindow } from '@/lib/signature';

// Global constraint: only transform and opacity animate. Scoped to the CSS this phase owns, so
// every other phase's CSS is judged by its own tests. Later P2 tasks append their files here.
const P2_CSS = ['src/components/signature.css'];

function block(css: string, name: string): string {
  const start = css.indexOf(`@keyframes ${name} {`);
  if (start < 0) throw new Error(`missing @keyframes ${name}`);
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced @keyframes ${name}`);
}

function allKeyframes(css: string): string[] {
  return [...css.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)].map((m) => block(css, m[1]));
}

const pct = (n: number): string => `${Math.round(n * 1000) / 10}%`;
const hasStop = (kf: string, n: number): boolean => new RegExp(`(^|[\\s,{])${pct(n).replace('.', '\\.')}`).test(kf);

describe('signature.css mirrors SIG in src/lib/signature.ts', () => {
  const css = readFileSync('src/components/signature.css', 'utf8');

  it.each([
    ['sig-head', [SIG.head]],
    ['sig-app', [SIG.gather, SIG.collapse, SIG.tilesOut]],
    ['sig-face', [SIG.face]],
    ['sig-card', [SIG.cardOut]],
    ['sig-frame', [SIG.frameIn, SIG.zoom]],
    ['sig-tint', [SIG.tint]],
    ['sig-chip', [SIG.chipOut]],
    ['sig-cap-a', [SIG.capAIn, SIG.capAOut]],
    ['sig-cap-b', [SIG.capBIn]],
  ] as const)('@keyframes %s carries its windows', (name, windows) => {
    const kf = block(css, name);
    for (const [a, b] of windows as readonly SigWindow[]) {
      expect(hasStop(kf, a), `${name} is missing ${pct(a)}`).toBe(true);
      expect(hasStop(kf, b), `${name} is missing ${pct(b)}`).toBe(true);
    }
  });

  it('switches the year chip at SIG_YEAR_STEPS', () => {
    const edges = [0, ...SIG_YEAR_STEPS, 1];
    for (let i = 0; i < edges.length - 1; i++) {
      expect(css).toContain(`[data-y="${i}"] { animation-range: contain ${pct(edges[i])} contain ${pct(edges[i + 1])}; }`);
    }
  });

  it('keeps the scroll-driven path behind @supports and prefers-reduced-motion', () => {
    expect(css).toContain('@supports (animation-timeline: view())');
    expect(css).toContain('@media (prefers-reduced-motion: no-preference)');
    expect(css).toContain('view-timeline: --sig block;');
  });

  it('keeps every caption visible in the static stack (no hiding outside .pin)', () => {
    // Keyframe stops are only ever applied under `.sig.pin`, so they are judged by the
    // selectors that name them; everything else must not hide content outside `.pin`.
    const rules = allKeyframes(css).reduce((rest, kf) => rest.replace(kf, ''), css);
    const hiding = [...rules.matchAll(/(^|\n)([^{}\n]*)\{[^}\n]*opacity:\s*0[;\s]/g)].map((m) => m[2]);
    expect(hiding.length).toBeGreaterThan(0); // the scan itself works
    for (const selector of hiding) {
      expect(selector.includes('.pin') || selector.includes('.sig-tint') || selector.includes('.sig-app-face'), `hides outside .pin: ${selector}`).toBe(true);
    }
  });
});

describe('P2 CSS animates only transform and opacity', () => {
  it.each(P2_CSS)('%s', (file) => {
    const css = readFileSync(file, 'utf8');
    for (const kf of allKeyframes(css)) {
      for (const m of kf.matchAll(/([a-z-]+)\s*:/g)) {
        expect(['opacity', 'transform', 'animation-timing-function'], `${file}: ${m[1]} in a keyframe`).toContain(m[1]);
      }
    }
    for (const m of css.matchAll(/transition\s*:\s*([^;]+);/g)) {
      for (const part of m[1].split(',')) {
        expect(part.trim(), `${file}: transition "${part.trim()}"`).toMatch(/^(transform|opacity|none)\b/);
      }
    }
  });
});
```

(The "no hiding outside .pin" check allows the decorative wash `.sig-tint` and the pin face, which are invisible by design and carry no content.)

- [ ] **Step 2: Run it and see it fail** — `npx vitest run tests/p2-css.test.ts` → FAIL: `ENOENT: no such file or directory, open 'src/components/signature.css'`.

- [ ] **Step 3: Implement** — create `src/components/signature.css`:

```css
/* Signature: "The idea, then the app." (spec §4 row 2, §5.5, §6; prototype `.sig` block).
   The page's only scroll-linked scene. One markup, three modes:
   1. Static stack -- the default: no JS, before hydration, reduced motion, screens under 600 px
      tall, phones held sideways. Every caption is visible; nothing starts hidden (Review Focus #4).
   2. Pinned + CSS scroll-driven -- `.sig.pin` (added only by SignatureScene) in browsers with
      animation-timeline. The keyframes below read the geometry as custom properties
      (--s --k --p per tile, --z0 on the frame) from src/lib/signature.ts `sigVars`.
   3. Pinned + JS fallback -- `.sig.pin` without animation-timeline (Firefox today):
      SignatureScene paints inline opacity/transform from `sigFrame(p)` on each frame.
   Keyframe percentages mirror `SIG` in src/lib/signature.ts (tests/p2-css.test.ts).
   Only opacity and transform animate. */

.sig { position: relative; margin-top: 120px; }
.sig-stage { position: relative; }
.sig-tint { position: absolute; inset: 0; background: var(--w-gonai); opacity: 0; pointer-events: none; }
.sig-head { text-align: center; }
.sig-head .t-lead { max-width: 34em; margin-inline: auto; }
.sig-chip { display: none; }

/* The 2022 pitch card: an Apple tile (r28, mist, no shadow). */
.sig-card { width: min(440px, 100%); padding: 30px 32px; border-radius: 28px; background: var(--mist); text-align: left; }
.sig-card p { margin: 0; }
.sig-card .sig-card-kick, .sig-card .sig-card-label { color: var(--ink-2); }
.sig-card .sig-card-q { margin: 10px 0 18px; font-size: 21px; line-height: 27px; font-weight: 600; letter-spacing: .011em; text-wrap: balance; }
:lang(th) .sig-card .sig-card-q { line-height: 32px; letter-spacing: 0; }
.sig-card .sig-card-label { margin-top: 6px; }
.sig-stat-of { color: var(--ink-2); }

/* Five apps: map, calendar, wallet, transit, chat. */
.sig-apps { display: flex; justify-content: center; gap: 10px; }
.sig-app { position: relative; display: grid; place-items: center; width: 56px; height: 56px; overflow: hidden; border-radius: 14px; background: var(--card); color: var(--ink-2); box-shadow: var(--e1), 0 6px 14px -8px rgb(20 26 44 / .18); }
.sig-app > svg, .sig-app-face > svg { width: 26px; height: 26px; }
.sig-ln { fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
/* GoNai's own green (spec §5.1: only in GoNai's frame, sheet and "Open app"); white on it in both themes. */
.sig-app-face { position: absolute; inset: 0; display: grid; place-items: center; background: #1C7A57; color: #fff; opacity: 0; }

/* GoNai's screenshot: a window keeps its hairline + soft shadow so a white UI shot never vanishes on white. */
.sig-frame { position: relative; width: min(1040px, 100%); aspect-ratio: 16 / 9; overflow: hidden; border-radius: 14px; background: #fff; box-shadow: var(--e2); }
.sig-frame img { display: block; width: 100%; height: 100%; object-fit: cover; }

/* Glass captions. */
.sig-cap { position: relative; width: min(600px, 100%); padding: 12px 22px; border-radius: 26px; text-align: left; }
.sig-cap p { margin: 0; }
.sig-cap .sig-cap-t1 { font-size: 17px; line-height: 22px; font-weight: 600; }
.sig-cap .sig-cap-t2 { font-size: 14px; line-height: 20px; color: var(--ink-1); }
:lang(th) .sig-cap .sig-cap-t1 { line-height: 26px; }
:lang(th) .sig-cap .sig-cap-t2 { line-height: 22px; }
.sig-cap-b { display: flex; align-items: center; gap: 16px; }
.sig-cap-b > div { flex: 1; min-width: 0; }
.sig-open { position: relative; flex: none; display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 16px; border-radius: 18px; background: #1C7A57; color: #fff; font-size: 14px; font-weight: 500; text-decoration: none; }
.sig-open::after { content: ""; position: absolute; inset: -4px; }

/* 1 · static stack */
.sig:not(.pin) .sig-stage { display: flex; flex-direction: column; align-items: center; gap: 28px; padding: 0 20px; }
.sig:not(.pin) .sig-cap { margin-top: 4px; }

/* 2 + 3 · pinned layout, shared by both motion paths. Positions come from SignatureScene. */
.sig.pin .sig-track { height: 200vh; }
.sig.pin .sig-stage { position: sticky; top: 0; height: 100vh; overflow: clip; }
.sig.pin .sig-head { position: absolute; top: 12vh; left: 0; right: 0; z-index: 3; padding: 0 20px; }
.sig.pin :is(.sig-card, .sig-app, .sig-frame, .sig-chip) { position: absolute; top: 0; left: 0; will-change: transform; }
.sig.pin .sig-card { width: min(440px, 100% - 40px); }
.sig.pin .sig-apps { display: contents; }
.sig.pin .sig-chip { display: grid; padding: 4px 12px; border-radius: 14px; background: var(--glass-ctl); color: var(--ink-1); font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }
.sig.pin .sig-year { grid-area: 1 / 1; opacity: 0; }
.sig.pin .sig-frame { max-width: none; transform-origin: 50% 50%; opacity: 0; }
.sig.pin .sig-cap { position: absolute; left: 50%; bottom: 32px; z-index: 4; width: min(600px, 100% - 32px); margin-left: calc(min(600px, 100% - 32px) / -2); opacity: 0; transform: translateY(8px); }
/* Off-stage until its window: an invisible "Open app" must not catch clicks. */
.sig.pin .sig-cap-b { transform: translateY(100vh); }
/* A keyboard user who tabs to "Open app" early sees it: focus wins over the scrub. */
.sig.pin .sig-cap-b:focus-within { opacity: 1 !important; transform: none !important; }

/* 2 · CSS scroll-driven path. `contain 0%` = the 200vh track's top at the viewport top,
   `contain 100%` = its bottom at the viewport bottom: the same 0..1 as sigProgress(). */
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .sig.pin .sig-track { view-timeline: --sig block; }
    .sig.pin :is(.sig-head-in, .sig-app, .sig-app-face, .sig-card, .sig-frame, .sig-tint, .sig-chip, .sig-cap-a, .sig-cap-b) {
      animation-duration: auto;
      animation-timing-function: linear;
      animation-fill-mode: both;
      animation-timeline: --sig;
      animation-range: contain 0% contain 100%;
    }
    .sig.pin .sig-head-in { animation-name: sig-head; }
    .sig.pin .sig-app { animation-name: sig-app; }
    .sig.pin .sig-app-face { animation-name: sig-face; }
    .sig.pin .sig-card { animation-name: sig-card; }
    .sig.pin .sig-frame { animation-name: sig-frame; }
    .sig.pin .sig-tint { animation-name: sig-tint; }
    .sig.pin .sig-chip { animation-name: sig-chip; }
    .sig.pin .sig-cap-a { animation-name: sig-cap-a; }
    .sig.pin .sig-cap-b { animation-name: sig-cap-b; }
    /* Each year is visible only inside its own slice of the track (fill none = base opacity 0 outside it). */
    .sig.pin .sig-year { animation-name: sig-year-on; animation-duration: auto; animation-timing-function: linear; animation-fill-mode: none; animation-timeline: --sig; }
    .sig.pin .sig-year[data-y="0"] { animation-range: contain 0% contain 40%; }
    .sig.pin .sig-year[data-y="1"] { animation-range: contain 40% contain 50%; }
    .sig.pin .sig-year[data-y="2"] { animation-range: contain 50% contain 60%; }
    .sig.pin .sig-year[data-y="3"] { animation-range: contain 60% contain 70%; }
    .sig.pin .sig-year[data-y="4"] { animation-range: contain 70% contain 100%; }
  }
}

@keyframes sig-head {
  0%, 10% { opacity: 1; transform: none; }
  13%, 100% { opacity: 0; transform: translateY(-16px); }
}
@keyframes sig-app {
  0% { opacity: 1; transform: var(--s); }
  10% { transform: var(--s); animation-timing-function: cubic-bezier(.4, 0, .6, 1); }
  34% { transform: var(--k); }
  40% { transform: var(--k); animation-timing-function: cubic-bezier(.4, 0, .6, 1); }
  50% { transform: var(--p); }
  52% { opacity: 1; }
  56% { opacity: 0; }
  100% { opacity: 0; transform: var(--p); }
}
@keyframes sig-face {
  0%, 46% { opacity: 0; }
  50%, 100% { opacity: 1; }
}
@keyframes sig-card {
  0%, 38% { opacity: 1; transform: scale(1); }
  48%, 100% { opacity: 0; transform: scale(.94); }
}
@keyframes sig-frame {
  0% { opacity: 0; transform: var(--z0); }
  50% { opacity: 0; transform: var(--z0); animation-timing-function: cubic-bezier(.4, 0, .6, 1); }
  54% { opacity: 1; }
  80%, 100% { opacity: 1; transform: translate(0px, 0px) scale(1); }
}
@keyframes sig-tint {
  0%, 55% { opacity: 0; }
  85%, 100% { opacity: 1; }
}
@keyframes sig-chip {
  0%, 74% { opacity: 1; }
  80%, 100% { opacity: 0; }
}
@keyframes sig-cap-a {
  0%, 35% { opacity: 0; transform: translateY(8px); }
  38%, 62% { opacity: 1; transform: translateY(0px); }
  65%, 100% { opacity: 0; transform: translateY(8px); }
}
@keyframes sig-cap-b {
  0%, 71.9% { opacity: 0; transform: translateY(100vh); }
  72% { opacity: 0; transform: translateY(8px); }
  75%, 100% { opacity: 1; transform: translateY(0px); }
}
@keyframes sig-year-on {
  from, to { opacity: 1; }
}

@media (max-width: 734px) {
  .sig { margin-top: 88px; }
  .sig-card { padding: 24px 22px; }
  .sig-card .sig-card-q { font-size: 19px; line-height: 25px; }
  .sig-frame { border-radius: 10px; }
  .sig.pin .sig-track { height: 170svh; }
  .sig.pin .sig-stage { height: 100svh; }
  .sig.pin .sig-head { top: 80px; }
  .sig.pin .sig-cap { bottom: 92px; } /* clears the phone thumb bar */
}
```

- [ ] **Step 4: Run and pass** — `npx vitest run tests/p2-css.test.ts` → all pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/signature.css tests/p2-css.test.ts
git commit -m "$(cat <<'EOF'
feat(p2): signature CSS -- static stack, pinned layout, scroll-driven keyframes

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
)"
```

---

### Task 6: SignatureScene (client island)

**Files:** Create `src/components/SignatureScene.tsx` · Test `tests/signature-scene.test.tsx`
**Interfaces:** Consumes: `SIG_YEARS`, `shouldPin`, `sigFrame`, `sigGeometry`, `sigProgress`, `sigVars`, `SigGeometry`, `SigStyle` (Task 4); `signature.css` classes (Task 5); C3 `ThaiText`; C4 `Icon` (`'arrow-up-right'`); `Reveal` (`as`, `className`) · Produces: `export interface SignatureCopy { eyebrow; title; sub; cardKicker; cardQuestion: string | null; statValue; statTotal; cardLabel; capTitle; capSub; endTitle; endSub; openLabel; openHref: string | null; frameSrc: string | null; frameAlt }` and `export default function SignatureScene({ copy }: { copy: SignatureCopy })` rendering `<section id="signature" class="sig" aria-labelledby="sig-h">`

- [ ] **Step 1: Write the failing test** — create `tests/signature-scene.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignatureScene, { type SignatureCopy } from '@/components/SignatureScene';

const COPY: SignatureCopy = {
  eyebrow: '2022 → 2026',
  title: 'The idea, then the app.',
  sub: 'Tripedia made the final 30 of 500 teams in 2022. Four years later, GoNai is that idea, built and live.',
  cardKicker: '2022 · Tripedia · Co-founder',
  cardQuestion: 'Why does planning one trip take five apps?',
  statValue: '30',
  statTotal: '500',
  cardLabel: 'final teams · KATALYST Startup Launchpad',
  capTitle: 'Four years. The idea stayed.',
  capSub: 'Same question, now with the tools to build the answer alone.',
  endTitle: 'GoNai · Live',
  endSub: 'One-day Bangkok trip planner with exact budgets, built as a weekend project.',
  openLabel: 'Open app',
  openHref: 'https://gonai-three.vercel.app',
  frameSrc: '/images/gonai.jpg',
  frameAlt: 'GoNai home screen: Plan a full day out, know every baht before you leave, with a budget prompt.',
};

type Observed = { cb: IntersectionObserverCallback; targets: Element[]; disconnected: boolean };
let observers: Observed[] = [];
let reduce = false;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  observers = [];
  reduce = false;
  // "(prefers-reduced-motion: reduce)" follows `reduce`; "(… no-preference)" is its inverse.
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: q.includes(': reduce') ? reduce : q.includes('no-preference') ? !reduce : false,
    media: q,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      entry: Observed;
      constructor(cb: IntersectionObserverCallback) {
        this.entry = { cb, targets: [], disconnected: false };
        observers.push(this.entry);
      }
      observe(el: Element) {
        this.entry.targets.push(el);
      }
      unobserve() {}
      disconnect() {
        this.entry.disconnected = true;
      }
    },
  );
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  // jsdom 30 implements CSS.supports and answers true for 'animation-timeline: view()'. Default
  // these tests to the fallback path (Firefox today); the CSS-path test opts in explicitly.
  vi.stubGlobal('CSS', { supports: () => false });
});

const sectionOf = (c: HTMLElement) => c.querySelector('#signature') as HTMLElement;
// Reveal (the headline) runs its own observer; the scene's is the one watching the section.
const sceneObserver = (root: Element) => observers.find((o) => o.targets.includes(root));
const intersect = (o: Observed, root: Element) =>
  act(() => o.cb([{ isIntersecting: true, target: root } as unknown as IntersectionObserverEntry], {} as IntersectionObserver));

describe('SignatureScene: server HTML (Review Focus #4)', () => {
  it('is the static stack: every caption present, nothing hidden inline, not pinned', () => {
    const html = renderToStaticMarkup(<SignatureScene copy={COPY} />);
    for (const s of [COPY.eyebrow, COPY.title, COPY.sub, COPY.cardKicker, COPY.cardQuestion!, COPY.cardLabel, COPY.capTitle, COPY.capSub, COPY.endTitle, COPY.endSub, COPY.openLabel]) {
      expect(html).toContain(s);
    }
    expect(html).toMatch(/>30<span[^>]*> \/ <\/span>500</);
    expect(html).toMatch(/<section id="signature" class="sig" aria-labelledby="sig-h">/);
    expect(html).not.toMatch(/style="[^"]*opacity:\s*0/);
  });
});

describe('SignatureScene: markup', () => {
  it('labels the section by its heading and hides the decorative tiles and year chip', () => {
    reduce = true;
    const { container } = render(<SignatureScene copy={COPY} />);
    expect(container.querySelector('#sig-h')?.textContent).toBe(COPY.title);
    expect(container.querySelector('.sig-apps')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelectorAll('.sig-app')).toHaveLength(5);
    expect(container.querySelector('.sig-chip')?.getAttribute('aria-hidden')).toBe('true');
    expect(Array.from(container.querySelectorAll('.sig-year')).map((y) => y.textContent)).toEqual(['2022', '2023', '2024', '2025', '2026']);
    expect(container.querySelector('.sig-frame img')?.getAttribute('alt')).toBe(COPY.frameAlt);
    const open = container.querySelector('a.sig-open') as HTMLAnchorElement;
    expect(open.getAttribute('href')).toBe(COPY.openHref);
    expect(open.getAttribute('target')).toBe('_blank');
    expect(open.getAttribute('rel')).toContain('noreferrer');
  });

  it('drops the frame, the link and the card question when the data has none', () => {
    reduce = true;
    const { container } = render(<SignatureScene copy={{ ...COPY, frameSrc: null, openHref: null, cardQuestion: null }} />);
    expect(container.querySelector('.sig-frame')).toBeNull();
    expect(container.querySelector('a.sig-open')).toBeNull();
    expect(container.querySelector('.sig-card-q')).toBeNull();
  });
});

describe('SignatureScene: motion modes', () => {
  it('stays the static stack under reduced motion, with no scroll work even in view', () => {
    reduce = true;
    const add = vi.spyOn(window, 'addEventListener');
    const { container } = render(<SignatureScene copy={COPY} />);
    const root = sectionOf(container);
    expect(root.classList.contains('pin')).toBe(false);
    for (const el of root.querySelectorAll('[data-sig-part]')) expect(el.getAttribute('style')).toBeNull();
    intersect(sceneObserver(root)!, root);
    expect(add.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(0);
  });

  it('stays the static stack on a screen under 600 px tall', () => {
    vi.stubGlobal('innerHeight', 560);
    const { container } = render(<SignatureScene copy={COPY} />);
    expect(sectionOf(container).classList.contains('pin')).toBe(false);
  });

  it('without scroll timelines, pins and paints each frame from JS', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const { container } = render(<SignatureScene copy={COPY} />);
    const root = sectionOf(container);
    expect(root.classList.contains('pin')).toBe(true);
    expect(root.querySelector<HTMLElement>('.sig-app')!.style.transform).toMatch(/^translate\(/);
    expect(root.querySelector<HTMLElement>('.sig-cap-b')!.style.transform).toBe('translateY(100vh)');
    const io = sceneObserver(root);
    expect(io).toBeDefined();
    intersect(io!, root);
    expect(add).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
  });

  it('repaints on scroll: at the end of the track caption B is up', () => {
    const { container } = render(<SignatureScene copy={COPY} />);
    const root = sectionOf(container);
    intersect(sceneObserver(root)!, root);
    vi.stubGlobal('scrollY', 500);
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    expect(root.querySelector<HTMLElement>('.sig-cap-b')!.style.transform).toBe('translateY(0.0px)');
  });

  it('with scroll timelines, hands the geometry to CSS and attaches no scroll listener', () => {
    vi.stubGlobal('CSS', { supports: (q: string) => q.includes('animation-timeline') });
    const add = vi.spyOn(window, 'addEventListener');
    const { container } = render(<SignatureScene copy={COPY} />);
    const root = sectionOf(container);
    expect(root.classList.contains('pin')).toBe(true);
    const app = root.querySelector<HTMLElement>('.sig-app')!;
    expect(app.style.getPropertyValue('--s')).toMatch(/^translate\(/);
    expect(app.style.getPropertyValue('--p')).toMatch(/^translate\(/);
    expect(app.style.transform).toBe('');
    expect(sceneObserver(root)).toBeUndefined();
    expect(add.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(0);
  });

  it('removes its listeners, observer, class and inline styles on unmount', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { container, unmount } = render(<SignatureScene copy={COPY} />);
    const root = sectionOf(container);
    const io = sceneObserver(root)!;
    intersect(io, root);
    unmount();
    expect(io.disconnected).toBe(true);
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(root.classList.contains('pin')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and see it fail** — `npx vitest run tests/signature-scene.test.tsx` → FAIL: `Failed to resolve import "@/components/SignatureScene"`.

- [ ] **Step 3: Implement** — create `src/components/SignatureScene.tsx`:

```tsx
'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import './signature.css';
import Reveal from '@/components/motion/Reveal';
import ThaiText from '@/components/ThaiText';
import { Icon } from '@/components/icons';
import {
  SIG_YEARS,
  shouldPin,
  sigFrame,
  sigGeometry,
  sigProgress,
  sigVars,
  type SigGeometry,
  type SigStyle,
} from '@/lib/signature';

// Everything the scene says, prepared on the server (sections/Signature.tsx): the island ships
// no dictionary and no project list, only the strings it renders.
export interface SignatureCopy {
  eyebrow: string;
  title: string;
  sub: string;
  cardKicker: string;
  cardQuestion: string | null;
  statValue: string;
  statTotal: string;
  cardLabel: string;
  capTitle: string;
  capSub: string;
  endTitle: string;
  endSub: string;
  openLabel: string;
  openHref: string | null;
  frameSrc: string | null;
  frameAlt: string;
}

// The five apps a 2022 trip took (map, calendar, wallet, transit, chat) and GoNai's pin that
// replaces them -- the prototype's 24×24 line icons. Decorative: the whole row is aria-hidden.
const APPS: { key: string; icon: ReactNode }[] = [
  {
    key: 'map',
    icon: (
      <>
        <path d="M3.5 6.5l5-2 7 2 5-2v13l-5 2-7-2-5 2z" />
        <path d="M8.5 4.5v13M15.5 6.5v13" />
      </>
    ),
  },
  {
    key: 'calendar',
    icon: (
      <>
        <rect x="4" y="5.5" width="16" height="14" rx="2.5" />
        <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
      </>
    ),
  },
  {
    key: 'wallet',
    icon: (
      <>
        <rect x="3.5" y="6" width="17" height="13" rx="2.5" />
        <path d="M3.5 9.5h13" />
        <path d="M15.5 13.5h2" />
      </>
    ),
  },
  {
    key: 'transit',
    icon: (
      <>
        <rect x="6" y="3.5" width="12" height="13" rx="3" />
        <path d="M6 10.5h12M9 20l1.5-3.5M15 20l-1.5-3.5" />
        <path d="M9 13.5h.01M15 13.5h.01" />
      </>
    ),
  },
  { key: 'chat', icon: <path d="M4.5 5.5h15v10h-9l-4.5 3.5v-3.5h-1.5z" /> },
];

const PIN = (
  <>
    <path d="M12 20.5s6-5.2 6-10.5a6 6 0 0 0-12 0c0 5.3 6 10.5 6 10.5z" />
    <circle cx="12" cy="10" r="2.2" />
  </>
);

function supportsScrollTimeline(): boolean {
  return typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('animation-timeline: view()');
}

export default function SignatureScene({ copy }: { copy: SignatureCopy }) {
  const rootRef = useRef<HTMLElement>(null);

  // One effect owns the motion; React owns only the markup. The markup below IS the static
  // stack the server sends (Review Focus #4). This effect upgrades it to the pinned scene when
  // there is room and motion is allowed, and undoes every class and inline style it wrote on the
  // way out. No React state: the island never re-renders after hydration, so the `pin` class and
  // the inline styles it writes are never overwritten by a render.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const one = (name: string) => root.querySelector<HTMLElement>(`[data-sig-part="${name}"]`);
    const all = (name: string) => Array.from(root.querySelectorAll<HTMLElement>(`[data-sig-part="${name}"]`));
    const track = root.querySelector<HTMLElement>('[data-sig="track"]');
    const stage = root.querySelector<HTMLElement>('[data-sig="stage"]');
    const head = one('head');
    const card = one('card');
    const chip = one('chip');
    const tint = one('tint');
    const capA = one('capA');
    const capB = one('capB');
    const frame = one('frame'); // absent when the later project has no screenshot
    const face = one('face');
    const apps = all('app');
    const years = all('year');
    if (!track || !stage || !head || !card || !chip || !tint || !capA || !capB) return;

    const cssPath = supportsScrollTimeline();
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let geo: SigGeometry | null = null;
    let start = 0;
    let len = 1;
    let last = -1;
    let raf = 0;
    let listening = false;
    let inView = typeof IntersectionObserver === 'undefined'; // no observer: treat as always in view
    let resizeTimer = 0;

    const clear = () => {
      for (const el of root.querySelectorAll<HTMLElement>('[data-sig-part]')) el.removeAttribute('style');
    };
    const paintStyle = (el: HTMLElement, s: SigStyle) => {
      el.style.opacity = s.opacity;
      el.style.transform = s.transform;
    };
    const measure = () => {
      start = track.getBoundingClientRect().top + window.scrollY;
      len = Math.max(1, track.offsetHeight - stage.offsetHeight);
    };
    // Fallback path only: the CSS path never runs per-frame JavaScript.
    const paint = (force: boolean) => {
      if (!geo || cssPath) return;
      const p = sigProgress(window.scrollY, start, len);
      if (!force && Math.abs(p - last) < 0.0005) return;
      last = p;
      const f = sigFrame(p, geo);
      paintStyle(head, f.head);
      paintStyle(card, f.card);
      paintStyle(capA, f.capA);
      paintStyle(capB, f.capB);
      if (frame) paintStyle(frame, f.frame);
      apps.forEach((el, i) => {
        const s = f.tiles[i];
        if (s) paintStyle(el, s);
      });
      if (face) face.style.opacity = f.face;
      tint.style.opacity = f.tint;
      chip.style.opacity = f.chip;
      years.forEach((el, i) => {
        el.style.opacity = i === f.year ? '1' : '0';
      });
    };
    const place = (g: SigGeometry) => {
      card.style.left = `${g.card.left}px`;
      card.style.top = `${g.card.top}px`;
      chip.style.left = `${g.chip.left}px`;
      chip.style.top = `${g.chip.top}px`;
      if (frame) {
        frame.style.width = `${g.frame.width}px`;
        frame.style.left = `${g.frame.left}px`;
        frame.style.top = `${g.frame.top}px`;
      }
      apps.forEach((el, i) => {
        el.style.zIndex = String(apps.length - i);
      });
      if (!cssPath) return;
      const v = sigVars(g);
      apps.forEach((el, i) => {
        const t = v.tiles[i];
        if (!t) return;
        el.style.setProperty('--s', t.s);
        el.style.setProperty('--k', t.k);
        el.style.setProperty('--p', t.p);
      });
      frame?.style.setProperty('--z0', v.frameStart);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        paint(false);
      });
    };
    // Scroll work exists only while it can matter: fallback path, pinned, and within a screen of
    // the viewport. Reduced motion, short screens and the CSS path never attach a scroll listener.
    const syncListening = () => {
      const want = !cssPath && geo !== null && inView;
      if (want === listening) return;
      listening = want;
      if (want) {
        window.addEventListener('scroll', onScroll, { passive: true });
        measure();
        paint(true);
      } else {
        window.removeEventListener('scroll', onScroll);
      }
    };
    const layout = () => {
      const pin = shouldPin({ reducedMotion: reduce.matches, width: window.innerWidth, height: window.innerHeight });
      root.classList.toggle('pin', pin);
      clear();
      geo = null;
      last = -1;
      if (pin) {
        // Read after `.pin` applies: the card's pinned width is what the tiles orbit.
        geo = sigGeometry({ width: stage.clientWidth, height: stage.clientHeight, cardWidth: card.offsetWidth, cardHeight: card.offsetHeight });
        place(geo);
        measure();
        paint(true);
      }
      syncListening();
    };
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(layout, 120);
    };

    let io: IntersectionObserver | null = null;
    let ro: ResizeObserver | null = null;
    if (!cssPath) {
      if (typeof IntersectionObserver !== 'undefined') {
        io = new IntersectionObserver(
          (entries) => {
            for (const e of entries) inView = e.isIntersecting;
            syncListening();
          },
          { rootMargin: '100% 0px 100% 0px' },
        );
        io.observe(root);
      }
      // Content above can change height after load (images, fonts): keep `start` honest.
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => {
          if (geo) measure();
        });
        ro.observe(document.body);
      }
    }
    window.addEventListener('resize', onResize);
    reduce.addEventListener?.('change', layout);
    layout();

    return () => {
      io?.disconnect();
      ro?.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      reduce.removeEventListener?.('change', layout);
      window.clearTimeout(resizeTimer);
      if (raf) cancelAnimationFrame(raf);
      root.classList.remove('pin');
      clear();
    };
  }, []);

  return (
    <section ref={rootRef} id="signature" className="sig" aria-labelledby="sig-h">
      <div className="sig-track" data-sig="track">
        <div className="sig-stage" data-sig="stage">
          <div className="sig-tint" data-sig-part="tint" aria-hidden="true" />
          <Reveal as="header" className="sig-head">
            <div className="sig-head-in" data-sig-part="head">
              <p className="t-eyebrow">{copy.eyebrow}</p>
              <h2 id="sig-h" className="t-h2">
                <ThaiText text={copy.title} />
              </h2>
              <p className="t-lead">
                <ThaiText text={copy.sub} />
              </p>
            </div>
          </Reveal>
          <div className="sig-chip" data-sig-part="chip" aria-hidden="true">
            {SIG_YEARS.map((year, i) => (
              <span key={year} className="sig-year" data-sig-part="year" data-y={i}>
                {year}
              </span>
            ))}
          </div>
          <div className="sig-card" data-sig-part="card">
            <p className="t-cap sig-card-kick">{copy.cardKicker}</p>
            {copy.cardQuestion && (
              <p className="sig-card-q">
                <ThaiText text={copy.cardQuestion} />
              </p>
            )}
            <p className="t-stat sig-stat">
              {copy.statValue}
              <span className="sig-stat-of"> / </span>
              {copy.statTotal}
            </p>
            <p className="t-cap sig-card-label">{copy.cardLabel}</p>
          </div>
          <div className="sig-apps" aria-hidden="true">
            {APPS.map((app, i) => (
              <div key={app.key} className="sig-app" data-sig-part="app">
                <svg viewBox="0 0 24 24" className="sig-ln">
                  {app.icon}
                </svg>
                {i === 0 && (
                  <span className="sig-app-face" data-sig-part="face">
                    <svg viewBox="0 0 24 24" className="sig-ln">
                      {PIN}
                    </svg>
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="sig-cap sig-cap-a glass" data-sig-part="capA">
            <p className="sig-cap-t1">
              <ThaiText text={copy.capTitle} />
            </p>
            <p className="sig-cap-t2">{copy.capSub}</p>
          </div>
          {copy.frameSrc && (
            <div className="sig-frame" data-sig-part="frame">
              <img src={copy.frameSrc} alt={copy.frameAlt} width={1600} height={900} loading="lazy" decoding="async" />
            </div>
          )}
          <div className="sig-cap sig-cap-b glass" data-sig-part="capB">
            <div>
              <p className="sig-cap-t1">{copy.endTitle}</p>
              <p className="sig-cap-t2">{copy.endSub}</p>
            </div>
            {copy.openHref && (
              <a className="sig-open" href={copy.openHref} target="_blank" rel="noreferrer">
                {copy.openLabel} <Icon name="arrow-up-right" />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run and pass** — `npx vitest run tests/signature-scene.test.tsx` → all pass. `npx tsc --noEmit && npx eslint src/components/SignatureScene.tsx` → exit 0, no warnings.

- [ ] **Step 5: Commit**

```bash
git add src/components/SignatureScene.tsx tests/signature-scene.test.tsx
git commit -m "$(cat <<'EOF'
feat(p2): SignatureScene -- static stack upgraded to a pinned scrub, CSS or JS

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
)"
```

---

### Task 7: Signature section on the home page

**Files:** Create `src/components/sections/Signature.tsx` · Modify `src/app/[locale]/page.tsx` (imports block; directly after P1's `<HeroTour … />` element) · Test `tests/signature.test.tsx`, `tests/home-order.test.tsx` · Create `/tmp/klao-qa/p2-shots.mjs` (outside the repo)
**Interfaces:** Consumes: `findLineage` (Task 2), `SIG_YEARS`, `SIG_STAT` (Task 4), `SignatureScene` + `SignatureCopy` (Task 6), dictionary keys (Task 3), `imageAlt(src, name)` (`src/lib/image-alt.ts`), C5 `Project` fields `question description liveUrl imageSrc alt statusKey lineageOf` · Produces: `export default function Signature({ projects, locale }: { projects: Project[]; locale: Locale }): JSX.Element | null`; page order `#tour` → `#signature` (C7)

- [ ] **Step 1: Write the failing test** — create `tests/signature.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Signature from '@/components/sections/Signature';
import { dict } from '@/lib/dictionary';
import { GONAI, LINEUP, TRIPEDIA } from './helpers/lineup';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

describe('Signature', () => {
  it('renders nothing without an idea → app pair (pre-migration Notion rows have no LineageOf)', () => {
    const rows = LINEUP.map((p) => ({ ...p, lineageOf: null }));
    expect(renderToStaticMarkup(<Signature projects={rows} locale="en" />)).toBe('');
  });

  it('renders nothing when LineageOf points at a row that is not published', () => {
    expect(renderToStaticMarkup(<Signature projects={LINEUP.filter((p) => p.name !== 'Tripedia')} locale="en" />)).toBe('');
  });

  it('builds the card from the earlier project and the ending from the later one', () => {
    const { container } = render(<Signature projects={LINEUP} locale="en" />);
    expect(container.querySelector('.t-eyebrow')?.textContent).toBe('2022 → 2026');
    expect(container.querySelector('#sig-h')?.textContent).toBe(dict.en.sigTitle);
    expect(container.querySelector('.sig-card-kick')?.textContent).toBe(dict.en.sigCardKicker);
    expect(container.querySelector('.sig-card-q')?.textContent).toBe(TRIPEDIA.question!.en);
    expect(container.querySelector('.sig-stat')?.textContent).toBe('30 / 500');
    expect(container.querySelector('.sig-cap-b .sig-cap-t1')?.textContent).toBe('GoNai · Live');
    expect(container.querySelector('.sig-cap-b .sig-cap-t2')?.textContent).toBe(GONAI.description.en);
    expect(container.querySelector('a.sig-open')?.getAttribute('href')).toBe(GONAI.liveUrl);
    expect(container.querySelector('.sig-frame img')?.getAttribute('src')).toBe(GONAI.imageSrc);
    expect(container.querySelector('.sig-frame img')?.getAttribute('alt')).toBe(GONAI.alt!.en);
  });

  it('claims "Live" only for a later project that is live (receipts rule)', () => {
    const rows = LINEUP.map((p) => (p.name === 'GoNai' ? { ...p, statusKey: 'proto' as const } : p));
    const { container } = render(<Signature projects={rows} locale="en" />);
    expect(container.querySelector('.sig-cap-b .sig-cap-t1')?.textContent).toBe('GoNai');
  });

  it('switches every string to Thai on /th and drops the | break mark from the card question', () => {
    const { container } = render(<Signature projects={LINEUP} locale="th" />);
    expect(container.querySelector('#sig-h')?.textContent).toBe(dict.th.sigTitle);
    expect(container.querySelector('.sig-card-q')?.textContent).toBe(TRIPEDIA.question!.th.replace(/\|/g, ''));
    expect(container.querySelector('.sig-cap-b .sig-cap-t1')?.textContent).toBe(`GoNai · ${dict.th.sigLive}`);
    expect(container.querySelector('a.sig-open')?.textContent).toContain(dict.th.workOpenApp);
    expect(container.textContent).not.toContain(dict.en.sigCaption);
  });

  it('server HTML shows the whole story with nothing hidden inline (Review Focus #4)', () => {
    const html = renderToStaticMarkup(<Signature projects={LINEUP} locale="en" />);
    expect(html).toContain(dict.en.sigCaption);
    expect(html).toContain('GoNai · Live');
    expect(html).not.toMatch(/style="[^"]*opacity:\s*0/);
    expect(html).not.toMatch(/class="sig pin"/);
  });
});
```

and create `tests/home-order.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import HomePage from '@/app/[locale]/page';

const params = (locale: 'en' | 'th') => ({ params: Promise.resolve({ locale }) });

// Contract C7: #top + #tour (HeroTour) -> #signature -> #work -> … Runs on the real fixtures,
// where GoNai's LineageOf names Tripedia, so the signature must render.
describe('home page order (contract C7)', () => {
  it('puts the signature after the hero tour and before the projects, in both locales', async () => {
    for (const locale of ['en', 'th'] as const) {
      const html = renderToStaticMarkup(await HomePage(params(locale)));
      const tour = html.indexOf('id="tour"');
      const signature = html.indexOf('id="signature"');
      const work = html.indexOf('id="work"');
      expect(tour).toBeGreaterThan(-1);
      expect(signature).toBeGreaterThan(tour);
      expect(work).toBeGreaterThan(signature);
    }
  });
});
```

- [ ] **Step 2: Run it and see it fail** — `npx vitest run tests/signature.test.tsx tests/home-order.test.tsx` → FAIL: `Failed to resolve import "@/components/sections/Signature"`; home-order fails with `expected -1 to be greater than …` once the import resolves.

- [ ] **Step 3: Implement** — create `src/components/sections/Signature.tsx`:

```tsx
import SignatureScene, { type SignatureCopy } from '@/components/SignatureScene';
import { dict } from '@/lib/dictionary';
import { imageAlt } from '@/lib/image-alt';
import type { Locale, Project } from '@/lib/models';
import { findLineage } from '@/lib/project-view';
import { SIG_STAT, SIG_YEARS } from '@/lib/signature';

// 2022 → 2026 (spec §4 row 2, §6 "Signature"). Server side: picks the idea -> app pair from the
// Project rows (the row whose LineageOf names another) and hands the client scene plain strings.
// No pair -- pre-migration Notion, or the earlier row unpublished -- means no section at all,
// never half a story. The scene's own words are prototype copy in the dictionary; every
// project fact (question, name, description, link, screenshot, alt) comes from the rows.
export default function Signature({ projects, locale }: { projects: Project[]; locale: Locale }) {
  const lineage = findLineage(projects);
  if (!lineage) return null;
  const { earlier, later } = lineage;
  const t = dict[locale];

  const copy: SignatureCopy = {
    eyebrow: `${SIG_YEARS[0]} → ${SIG_YEARS[SIG_YEARS.length - 1]}`,
    title: t.sigTitle,
    sub: t.sigSub,
    cardKicker: t.sigCardKicker,
    cardQuestion: earlier.question?.[locale] ?? null,
    statValue: SIG_STAT.value,
    statTotal: SIG_STAT.total,
    cardLabel: t.sigCardLabel,
    capTitle: t.sigCaption,
    capSub: t.sigCaptionSub,
    // "Live" only when it is: a later project that is not live yet ends on its name alone.
    endTitle: later.statusKey === 'live' ? `${later.name} · ${t.sigLive}` : later.name,
    endSub: later.description[locale],
    openLabel: t.workOpenApp,
    openHref: later.liveUrl,
    frameSrc: later.imageSrc,
    frameAlt: later.imageSrc ? (later.alt?.[locale] ?? imageAlt(later.imageSrc, later.name)) : '',
  };

  return <SignatureScene copy={copy} />;
}
```

Then edit `src/app/[locale]/page.tsx`:

(a) add the import next to the other section imports (keep them alphabetical):

```tsx
import Signature from '@/components/sections/Signature';
```

(b) directly after P1's `<HeroTour … />` element (whatever props P1 gave it), insert — passing the same featured-projects array HeroTour receives (`projects` in page.tsx):

```tsx
      {/* 2022 → 2026, straight after the tour (contract C7): the tour shows the apps running,
          this shows where one of them came from. The page's only scroll-linked scene; renders
          nothing when no project carries a LineageOf. */}
      <Signature projects={projects} locale={locale} />
```

- [ ] **Step 4: Run and pass** — `npx vitest run tests/signature.test.tsx tests/home-order.test.tsx tests/smoke.test.tsx` → all pass. `npx tsc --noEmit` → exit 0.

- [ ] **Step 5: Screenshot check** — create `/tmp/klao-qa/p2-shots.mjs` (never inside the repo; Tasks 12 and 13 reuse it):

```js
// White Edition P2 visual check. Not part of the repo.
// Usage: node /tmp/klao-qa/p2-shots.mjs [signature|index|all]   (needs `npm run dev`)
import { chromium } from '/Users/suvichakjarunopratamp/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const MODE = process.argv[2] ?? 'all';
const BASE = process.env.BASE ?? 'http://localhost:3000';
const OUT = '/tmp/klao-qa/p2';
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } };
const LOCALES = ['en', 'th'];
const SCHEMES = ['light', 'dark'];
const PROGRESS = [0, 0.45, 0.6, 1];
const problems = [];
mkdirSync(OUT, { recursive: true });

async function waitForServer() {
  for (let i = 0; i < 90; i++) {
    try {
      const r = await fetch(`${BASE}/en`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`dev server not reachable at ${BASE}`);
}

const browser = await chromium.launch({ channel: 'chrome' });

async function open(vp, scheme, reducedMotion = 'no-preference') {
  const ctx = await browser.newContext({ viewport: VIEWPORTS[vp], colorScheme: scheme, reducedMotion, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(90000);
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console error (${vp}/${scheme}): ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`page error (${vp}/${scheme}): ${e.message}`));
  return { ctx, page };
}

async function settle(page, ms = 450) {
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(ms);
}

async function toProgress(page, p) {
  await page.evaluate((prog) => {
    const track = document.querySelector('#signature .sig-track');
    const stage = document.querySelector('#signature .sig-stage');
    const start = track.getBoundingClientRect().top + window.scrollY;
    const len = Math.max(1, track.offsetHeight - stage.offsetHeight);
    window.scrollTo({ top: start + len * prog, behavior: 'instant' });
  }, p);
  await settle(page);
}

async function overflow(page, label) {
  const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (o > 0) problems.push(`horizontal overflow ${o}px: ${label}`);
}

async function signature() {
  for (const locale of LOCALES) for (const scheme of SCHEMES) for (const vp of Object.keys(VIEWPORTS)) {
    const { ctx, page } = await open(vp, scheme);
    await page.goto(`${BASE}/${locale}`, { waitUntil: 'networkidle' });
    const pinned = await page.evaluate(() => document.querySelector('#signature')?.classList.contains('pin'));
    if (!pinned) problems.push(`signature not pinned: ${locale}/${scheme}/${vp}`);
    for (const p of PROGRESS) {
      await toProgress(page, p);
      await page.screenshot({ path: `${OUT}/sig-${locale}-${scheme}-${vp}-p${String(p).replace('.', '')}.png` });
    }
    await overflow(page, `signature ${locale}/${scheme}/${vp}`);
    await ctx.close();
  }
  for (const locale of LOCALES) for (const vp of Object.keys(VIEWPORTS)) {
    const { ctx, page } = await open(vp, 'light', 'reduce');
    await page.goto(`${BASE}/${locale}`, { waitUntil: 'networkidle' });
    const pinned = await page.evaluate(() => document.querySelector('#signature')?.classList.contains('pin'));
    if (pinned) problems.push(`signature pinned under reduced motion: ${locale}/${vp}`);
    await page.locator('#signature').screenshot({ path: `${OUT}/sig-reduced-${locale}-${vp}.png` });
    await ctx.close();
  }
  // Firefox stand-in: report no scroll timelines so the JS fallback paints, and switch the
  // CSS path's animations off so only the fallback's inline styles show.
  const { ctx, page } = await open('desktop', 'light');
  await page.addInitScript(() => {
    const real = CSS.supports.bind(CSS);
    CSS.supports = (...a) => (String(a.join(' ')).includes('animation-timeline') ? false : real(...a));
  });
  await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: '#signature, #signature * { animation: none !important; }' });
  for (const p of PROGRESS) {
    await toProgress(page, p);
    await page.screenshot({ path: `${OUT}/sig-fallback-en-p${String(p).replace('.', '')}.png` });
  }
  await ctx.close();
}

async function index() {
  for (const locale of LOCALES) for (const scheme of SCHEMES) for (const vp of Object.keys(VIEWPORTS)) {
    const { ctx, page } = await open(vp, scheme);
    await page.goto(`${BASE}/${locale}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.getElementById('work')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await settle(page, 1100); // the headline's fade-rise
    await page.screenshot({ path: `${OUT}/index-${locale}-${scheme}-${vp}.png` });
    await overflow(page, `index ${locale}/${scheme}/${vp}`);
    const keys = await page.$$eval('#work a.pi-row[data-sheet]', (as) => as.map((a) => a.getAttribute('data-sheet')));
    if (keys.length !== 5) problems.push(`expected 5 index rows, got ${keys.length}: ${locale}/${scheme}/${vp}`);
    for (const key of keys) {
      await page.goto('about:blank');
      await page.goto(`${BASE}/${locale}#work/${key}`, { waitUntil: 'networkidle' });
      const opened = await page.waitForSelector('dialog.sheet[open]', { timeout: 5000 }).then(() => true, () => false);
      if (!opened) {
        problems.push(`sheet did not open from its URL: ${key} ${locale}/${scheme}/${vp}`);
        continue;
      }
      await settle(page, 700);
      await page.screenshot({ path: `${OUT}/sheet-${key}-${locale}-${scheme}-${vp}.png` });
      await overflow(page, `sheet ${key} ${locale}/${scheme}/${vp}`);
    }
    // Back closes a sheet opened by a click.
    await page.goto(`${BASE}/${locale}`, { waitUntil: 'networkidle' });
    await page.click(`#work a.pi-row[data-sheet="${keys[0]}"]`);
    await page.waitForSelector('dialog.sheet[open]');
    await page.goBack();
    const closed = await page.waitForSelector('dialog.sheet:not([open])', { state: 'attached', timeout: 3000 }).then(() => true, () => false);
    if (!closed) problems.push(`Back did not close the sheet: ${locale}/${scheme}/${vp}`);
    await ctx.close();
  }
}

await waitForServer();
if (MODE === 'signature' || MODE === 'all') await signature();
if (MODE === 'index' || MODE === 'all') await index();
await browser.close();
console.log(`screenshots in ${OUT}`);
if (problems.length) {
  console.log(problems.join('\n'));
  process.exitCode = 1;
} else {
  console.log('no problems found');
}
```

Run `npm run dev` in the background (leave it running for Tasks 12–13), then `node /tmp/klao-qa/p2-shots.mjs signature` → prints `no problems found`. Open with the Read tool and check:
- `sig-en-light-desktop-p0.png`: eyebrow, h2 and lead centred at the top; pitch card centred with the five tiles scattered around it; year chip "2022" above the card.
- `sig-en-light-desktop-p045.png`: headline gone; card ~30 % opaque; tiles ringed/piling; "Four years. The idea stayed." caption at the bottom; chip "2023".
- `sig-en-light-desktop-p06.png`: GoNai screenshot opening from the pile; tiles gone; chip "2025".
- `sig-en-light-desktop-p1.png`: full GoNai frame on the green-tinted wash; caption "GoNai · Live" with the green Open app; chip gone.
- `sig-th-dark-phone-p1.png`: Thai caption readable on dark, above the thumb bar, no clipped Thai glyphs.
- `sig-reduced-en-desktop.png` and `sig-reduced-th-phone.png`: static stack, every caption visible.
- `sig-fallback-en-p045.png` and `-p1.png`: same composition as the CSS-path shots.

- [ ] **Step 6: Commit**

```bash
git add src/components/sections/Signature.tsx "src/app/[locale]/page.tsx" tests/signature.test.tsx tests/home-order.test.tsx
git commit -m "$(cat <<'EOF'
feat(p2): the 2022 -> 2026 signature follows the hero tour

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
)"
```

---

### Task 8: StatusChip

**Files:** Create `src/components/StatusChip.tsx` · Create `src/components/status-chip.css` · Test `tests/status-chip.test.tsx` · Modify `tests/p2-css.test.ts` (the `P2_CSS` line)
**Interfaces:** Consumes: `statusMark` (Task 2), C5 `statusKey`, `status` · Produces: `export default function StatusChip({ project, locale }: { project: Pick<Project, 'statusKey' | 'status'>; locale: Locale }): JSX.Element | null` rendering `<span class="st-chip"><i class="st-mk" data-mark="live|proto|ring" aria-hidden="true"/>word</span>`

- [ ] **Step 1: Write the failing test** — create `tests/status-chip.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import StatusChip from '@/components/StatusChip';

afterEach(cleanup);

const status = { en: 'Live · since Aug 2026', th: 'เปิดใช้งานแล้ว · ตั้งแต่ ส.ค. 2026' };

describe('StatusChip', () => {
  it.each([
    ['live', 'live'],
    ['proto', 'proto'],
    ['pitched', 'ring'],
    ['finalist', 'ring'],
  ] as const)('%s renders the word with a %s mark hidden from assistive tech', (statusKey, mark) => {
    const { container } = render(<StatusChip project={{ statusKey, status }} locale="en" />);
    expect(container.querySelector('.st-chip')?.textContent).toBe(status.en);
    const mk = container.querySelector('.st-mk');
    expect(mk?.getAttribute('data-mark')).toBe(mark);
    expect(mk?.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows the word without a mark when StatusKey is empty', () => {
    const { container } = render(<StatusChip project={{ statusKey: null, status }} locale="en" />);
    expect(container.querySelector('.st-chip')?.textContent).toBe(status.en);
    expect(container.querySelector('.st-mk')).toBeNull();
  });

  it('renders nothing without a status word (pre-migration rows)', () => {
    const { container } = render(<StatusChip project={{ statusKey: 'live', status: null }} locale="en" />);
    expect(container.innerHTML).toBe('');
  });

  it('switches the word to Thai', () => {
    const { container } = render(<StatusChip project={{ statusKey: 'live', status }} locale="th" />);
    expect(container.querySelector('.st-chip')?.textContent).toBe(status.th);
  });
});
```

and in `tests/p2-css.test.ts` replace

```ts
const P2_CSS = ['src/components/signature.css'];
```

with

```ts
const P2_CSS = ['src/components/signature.css', 'src/components/status-chip.css'];
```

- [ ] **Step 2: Run it and see it fail** — `npx vitest run tests/status-chip.test.tsx tests/p2-css.test.ts` → FAIL: `Failed to resolve import "@/components/StatusChip"` and `ENOENT … status-chip.css`.

- [ ] **Step 3: Implement** — create `src/components/status-chip.css`:

```css
/* Status mark + word (spec §5.1: status marks are monochrome, shape + word). The mark is
   decoration; the word is the status. Used by the projects index and the project sheet. */
.st-chip { display: inline-flex; align-items: center; gap: 6px; color: var(--ink-2); font-size: 13px; line-height: 18px; font-weight: 400; }
:lang(th) .st-chip { line-height: 20px; }
.st-mk { flex: none; box-sizing: border-box; width: 7px; height: 7px; border-radius: 50%; }
.st-mk[data-mark="live"] { background: var(--ink-1); }
.st-mk[data-mark="proto"] { background: linear-gradient(90deg, var(--ink-2) 50%, transparent 50%); box-shadow: inset 0 0 0 1.25px var(--ink-2); }
.st-mk[data-mark="ring"] { box-shadow: inset 0 0 0 1.25px var(--ink-2); }
@media (max-width: 734px) { .st-chip { font-size: 14px; } }
```

and `src/components/StatusChip.tsx`:

```tsx
import './status-chip.css';
import type { Locale, Project } from '@/lib/models';
import { statusMark } from '@/lib/project-view';

// Server-safe (no hooks): the index renders it on the server, the sheet from its client island.
// The word is required -- a pre-migration row with no Status shows nothing rather than a bare
// shape nobody can read; the mark is optional (StatusKey empty -> word alone).
export default function StatusChip({ project, locale }: { project: Pick<Project, 'statusKey' | 'status'>; locale: Locale }) {
  const word = project.status?.[locale];
  if (!word) return null;
  const mark = statusMark(project.statusKey);
  return (
    <span className="st-chip">
      {mark && <i className="st-mk" data-mark={mark} aria-hidden="true" />}
      {word}
    </span>
  );
}
```

- [ ] **Step 4: Run and pass** — `npx vitest run tests/status-chip.test.tsx tests/p2-css.test.ts` → all pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/StatusChip.tsx src/components/status-chip.css tests/status-chip.test.tsx tests/p2-css.test.ts
git commit -m "$(cat <<'EOF'
feat(p2): monochrome status chip (shape + word)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
)"
```

---

### Task 9: ProjectSheet — the dialog and the `#work/<key>` contract

**Files:** Create `src/components/ProjectSheet.tsx` · Create `src/components/project-sheet.css` · Test `tests/project-sheet.test.tsx` · Modify `tests/p2-css.test.ts` (the `P2_CSS` line)
**Interfaces:** Consumes: `projectKey`, `sheetHash`, `parseSheetHash` (Task 1); `dict[locale].sheetClose` (Task 3); C4 `Icon` (`'x'`); C1 `--card --mist --ink-3 --glass-ctl --e3 --ease-settle --ease-exit` · Produces: `export default function ProjectSheet({ projects, locale }: { projects: Project[]; locale: Locale })` rendering `<dialog class="sheet" aria-labelledby="sheet-name">`; opens on click of any `a[data-sheet="<key>"]`, on load, on `hashchange`/`popstate`; `html.sheet-open` while open. Other islands (P4 footer/palette) open a sheet by rendering `<a href={sheetHash(key)} data-sheet={key}>` or assigning `location.hash = sheetHash(key)`.

- [ ] **Step 1: Write the failing test** — create `tests/project-sheet.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectSheet from '@/components/ProjectSheet';
import { dict } from '@/lib/dictionary';
import { projectKey, sheetHash } from '@/lib/sheet-url';
import { LINEUP } from './helpers/lineup';

let showModal: ReturnType<typeof vi.fn>;
let close: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  // jsdom has <dialog> but not its methods: stand-ins that flip `open` the way browsers do.
  showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
  HTMLDialogElement.prototype.showModal = showModal as unknown as HTMLDialogElement['showModal'];
  HTMLDialogElement.prototype.close = close as unknown as HTMLDialogElement['close'];
  window.history.replaceState(null, '', '/en');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.classList.remove('sheet-open');
});

// Rows stand in for the index (Task 11) so the sheet is tested on its own.
function Page() {
  return (
    <>
      <ul>
        {LINEUP.map((p) => (
          <li key={p.id}>
            <a href={sheetHash(projectKey(p))} data-sheet={projectKey(p)}>
              {p.name}
            </a>
          </li>
        ))}
      </ul>
      <ProjectSheet projects={LINEUP} locale="en" />
    </>
  );
}

const dialogOf = (c: HTMLElement) => c.querySelector('dialog.sheet') as HTMLDialogElement;
const row = (name: string) => screen.getByText(name, { selector: 'a' });
const closeButton = () => screen.getByRole('button', { name: dict.en.sheetClose });

describe('ProjectSheet: opening (Review Focus #3)', () => {
  it('a row click pushes #work/<key>, opens the dialog and focuses its heading', () => {
    const push = vi.spyOn(window.history, 'pushState');
    const { container } = render(<Page />);
    fireEvent.click(row('GoNai'));
    const dialog = dialogOf(container);
    expect(push).toHaveBeenCalledWith(null, '', '#work/gonai');
    expect(window.location.hash).toBe('#work/gonai');
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(dialog.open).toBe(true);
    const heading = dialog.querySelector('h2') as HTMLElement;
    expect(heading.textContent).toBe('GoNai');
    expect(document.activeElement).toBe(heading);
  });

  it('leaves modified clicks (new tab, new window) to the browser', () => {
    const push = vi.spyOn(window.history, 'pushState');
    // Stands in for the browser opening a new tab: stops jsdom following the fragment here.
    const stopNavigation = (e: Event) => e.preventDefault();
    window.addEventListener('click', stopNavigation);
    try {
      const { container } = render(<Page />);
      fireEvent.click(row('GoNai'), { metaKey: true });
      expect(push).not.toHaveBeenCalled();
      expect(dialogOf(container).open).toBe(false);
    } finally {
      window.removeEventListener('click', stopNavigation);
    }
  });

  it('opens on load when the URL already carries a known #work/<key>', () => {
    window.history.replaceState(null, '', '/en#work/tripedia');
    const push = vi.spyOn(window.history, 'pushState');
    const { container } = render(<Page />);
    expect(dialogOf(container).open).toBe(true);
    expect(dialogOf(container).querySelector('h2')?.textContent).toBe('Tripedia');
    expect(push).not.toHaveBeenCalled();
  });

  it.each(['#work/', '#work/unknown', '#work/GoNai', '#work/gonai/extra', '#work'])('opens nothing and throws nothing for %s on load', (hash) => {
    window.history.replaceState(null, '', `/en${hash}`);
    let container: HTMLElement | null = null;
    expect(() => {
      container = render(<Page />).container;
    }).not.toThrow();
    expect(showModal).not.toHaveBeenCalled();
    expect(dialogOf(container!).open).toBe(false);
  });

  it.each(['#work/', '#work/unknown', '#work/GoNai'])('ignores a later hashchange to %s', (hash) => {
    const { container } = render(<Page />);
    act(() => {
      window.history.replaceState(null, '', `/en${hash}`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(showModal).not.toHaveBeenCalled();
    expect(dialogOf(container).open).toBe(false);
  });

  it('another island can open a sheet by assigning location.hash', async () => {
    const { container } = render(<Page />);
    act(() => {
      window.location.hash = '#work/klao-site';
    });
    await waitFor(() => expect(dialogOf(container).open).toBe(true));
    expect(dialogOf(container).querySelector('h2')?.textContent).toBe('klao-site');
  });

  it('a hash change to another known project swaps the open sheet', () => {
    const { container } = render(<Page />);
    fireEvent.click(row('Aje'));
    act(() => {
      window.history.pushState(null, '', '/en#work/gonai');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(dialogOf(container).open).toBe(true);
    expect(dialogOf(container).querySelector('h2')?.textContent).toBe('GoNai');
  });
});

describe('ProjectSheet: closing (Review Focus #3)', () => {
  it('Back after opening closes the sheet and returns focus to the row', async () => {
    const { container } = render(<Page />);
    const link = row('GoNai');
    fireEvent.click(link);
    expect(dialogOf(container).open).toBe(true);
    act(() => {
      window.history.back();
    });
    await waitFor(() => expect(dialogOf(container).open).toBe(false));
    expect(window.location.hash).toBe('');
    expect(document.activeElement).toBe(link);
  });

  it('Esc closes the sheet and clears the hash without adding a history entry', () => {
    const replace = vi.spyOn(window.history, 'replaceState');
    const push = vi.spyOn(window.history, 'pushState');
    const { container } = render(<Page />);
    fireEvent.click(row('Aje'));
    const dialog = dialogOf(container);
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(dialog.open).toBe(false);
    expect(window.location.hash).toBe('');
    expect(replace).toHaveBeenCalledWith(null, '', '/en');
    expect(push).toHaveBeenCalledTimes(1); // only the open
    expect(document.activeElement).toBe(row('Aje'));
  });

  it('the close button closes it the same way', () => {
    const { container } = render(<Page />);
    fireEvent.click(row('Talatify'));
    fireEvent.click(closeButton());
    expect(dialogOf(container).open).toBe(false);
    expect(window.location.hash).toBe('');
    expect(document.activeElement).toBe(row('Talatify'));
  });

  it('a click on the backdrop (the dialog itself) closes it', () => {
    const { container } = render(<Page />);
    fireEvent.click(row('Tripedia'));
    fireEvent.click(dialogOf(container));
    expect(dialogOf(container).open).toBe(false);
    expect(window.location.hash).toBe('');
  });

  it('with motion allowed, waits for the exit animation before closing', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('no-preference'), addEventListener() {}, removeEventListener() {} }));
    vi.useFakeTimers();
    try {
      const { container } = render(<Page />);
      fireEvent.click(row('Aje'));
      const dialog = dialogOf(container);
      fireEvent.click(closeButton());
      expect(dialog.classList.contains('closing')).toBe(true);
      expect(dialog.open).toBe(true);
      act(() => {
        vi.advanceTimersByTime(280);
      });
      expect(dialog.open).toBe(false);
      expect(dialog.classList.contains('closing')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('ProjectSheet: page and accessibility', () => {
  it('locks page scroll while open and releases it on close', () => {
    render(<Page />);
    fireEvent.click(row('GoNai'));
    expect(document.documentElement.classList.contains('sheet-open')).toBe(true);
    fireEvent.click(closeButton());
    expect(document.documentElement.classList.contains('sheet-open')).toBe(false);
  });

  it('names the dialog by its heading and labels the close button', () => {
    const { container } = render(<Page />);
    fireEvent.click(row('GoNai'));
    const dialog = dialogOf(container);
    expect(dialog.getAttribute('aria-labelledby')).toBe('sheet-name');
    const heading = dialog.querySelector('#sheet-name') as HTMLElement;
    expect(heading.tagName).toBe('H2');
    expect(heading.getAttribute('tabindex')).toBe('-1');
    expect(closeButton()).toBeTruthy();
  });

  it('ships a closed, empty dialog in server HTML', () => {
    const html = renderToStaticMarkup(<ProjectSheet projects={LINEUP} locale="en" />);
    expect(html).toBe('<dialog class="sheet" aria-labelledby="sheet-name"></dialog>');
  });
});
```

and in `tests/p2-css.test.ts` replace

```ts
const P2_CSS = ['src/components/signature.css', 'src/components/status-chip.css'];
```

with

```ts
const P2_CSS = ['src/components/signature.css', 'src/components/status-chip.css', 'src/components/project-sheet.css'];
```

- [ ] **Step 2: Run it and see it fail** — `npx vitest run tests/project-sheet.test.tsx tests/p2-css.test.ts` → FAIL: `Failed to resolve import "@/components/ProjectSheet"` and `ENOENT … project-sheet.css`.

- [ ] **Step 3: Implement** — create `src/components/project-sheet.css`:

```css
/* Project sheet (spec §4 row "#work/<slug>", §5.3 radii, §5.5 settle/exit; prototype `.sheet`).
   A native modal <dialog>: the browser owns the top layer, the inert page and Esc. It enters on
   the settle curve and leaves on exit; reduced motion gets neither. Only opacity/transform
   animate. Phone: a full-height sheet with a grab handle. */
html.sheet-open { overflow: hidden; }
.sheet { width: min(1040px, 100% - 48px); max-width: none; max-height: calc(100vh - 80px); margin: 40px auto auto; padding: 0; overflow: auto; overscroll-behavior: contain; border: 0; border-radius: 28px; background: var(--card); color: var(--ink-1); box-shadow: var(--e3); }
.sheet::backdrop { background: color-mix(in srgb, var(--mist) 56%, transparent); }
@media (prefers-reduced-motion: no-preference) {
  .sheet[open] { animation: sheet-in 500ms var(--ease-settle); }
  .sheet.closing { animation: sheet-out 280ms var(--ease-exit) forwards; }
}
@keyframes sheet-in {
  from { opacity: 0; transform: translateY(24px) scale(.985); }
}
@keyframes sheet-out {
  to { opacity: 0; transform: translateY(16px); }
}
.sheet-close { position: sticky; top: 16px; z-index: 5; float: right; display: grid; place-items: center; width: 36px; height: 36px; margin: 16px 16px 0 0; border: 0; border-radius: 50%; background: var(--glass-ctl); color: var(--ink-1); font-size: 16px; cursor: pointer; }
.sheet-close::after { content: ""; position: absolute; inset: -4px; }
.sbody { display: grid; grid-template-columns: 7fr 5fr; gap: 40px; padding: 40px; }
.sheet-name { margin: 6px 0 0; font-size: 40px; line-height: 44px; font-weight: 600; letter-spacing: 0; }
/* Focus lands on the heading programmatically (tabindex -1); the ring is for keyboard stops. */
.sheet-name:focus { outline: none; }
@media (max-width: 734px) {
  .sheet { width: 100%; max-width: 100%; height: calc(100dvh - 12px); max-height: none; margin: 12px 0 0; border-radius: 20px 20px 0 0; }
  .sheet::before { content: ""; position: absolute; top: 6px; left: 50%; z-index: 6; width: 36px; height: 5px; margin-left: -18px; border-radius: 3px; background: var(--ink-3); }
  .sheet-close { width: 44px; height: 44px; margin: 12px 12px 0 0; }
  .sbody { grid-template-columns: 1fr; gap: 8px; padding: 24px 20px; }
  .sheet-name { font-size: 32px; line-height: 36px; }
}
```

and `src/components/ProjectSheet.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import './project-sheet.css';
import { Icon } from '@/components/icons';
import { dict } from '@/lib/dictionary';
import type { Locale, Project } from '@/lib/models';
import { parseSheetHash, projectKey, sheetHash } from '@/lib/sheet-url';

// The project sheet (spec §4 row "#work/<slug>", §6 "Projects index + sheets"): one native
// <dialog> for every project on the index, opened three ways --
//   1. a click on any `a[data-sheet]` (index rows; later the footer) -> pushState `#work/<key>`,
//      so Back closes it;
//   2. a page load whose URL already carries a known `#work/<key>` (a shared link);
//   3. `hashchange` / `popstate` (Back, Forward, or another island assigning location.hash).
// Esc, the close button and a backdrop click close it and replaceState the hash away. An
// unknown or malformed hash opens nothing and throws nothing (Review Focus #3). Nothing here
// touches the server: the home route stays one static ISR page.

const EXIT_MS = 280; // .sheet.closing in project-sheet.css

function motionAllowed(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: no-preference)').matches;
}

function clearSheetHash() {
  if (window.location.hash.startsWith('#work/')) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

type SheetBodyProps = {
  project: Project;
  projects: Project[];
  locale: Locale;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onClose: () => void;
};

export default function ProjectSheet({ projects, locale }: { projects: Project[]; locale: Locale }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const exitTimer = useRef(0);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const byKey = useMemo(() => new Map(projects.map((p) => [projectKey(p), p])), [projects]);
  const current = openKey ? (byKey.get(openKey) ?? null) : null;

  const show = useCallback(
    (key: string, push: boolean) => {
      if (!byKey.has(key)) return; // "#work/unknown": nothing to open
      window.clearTimeout(exitTimer.current);
      dialogRef.current?.classList.remove('closing');
      if (push && window.location.hash !== sheetHash(key)) window.history.pushState(null, '', sheetHash(key));
      setOpenKey(key);
    },
    [byKey],
  );

  // Idempotent: the close button, Esc, Back and the dialog's own `close` event can all land
  // here, sometimes twice for one close.
  const finish = useCallback(() => {
    const d = dialogRef.current;
    const trigger = triggerRef.current;
    triggerRef.current = null;
    window.clearTimeout(exitTimer.current);
    if (d) {
      d.classList.remove('closing');
      if (d.open) {
        if (typeof d.close === 'function') d.close();
        else d.removeAttribute('open');
      }
    }
    document.documentElement.classList.remove('sheet-open');
    setOpenKey(null);
    trigger?.focus({ preventScroll: true });
  }, []);

  const hide = useCallback(
    (clearHash: boolean) => {
      if (clearHash) clearSheetHash();
      const d = dialogRef.current;
      if (!d || !d.open) {
        finish();
        return;
      }
      if (d.classList.contains('closing')) return;
      if (!motionAllowed()) {
        finish();
        return;
      }
      d.classList.add('closing');
      exitTimer.current = window.setTimeout(finish, EXIT_MS);
    },
    [finish],
  );

  // The URL is the source of truth for which sheet is open.
  const sync = useCallback(() => {
    const key = parseSheetHash(window.location.hash);
    if (key !== null && byKey.has(key)) show(key, false);
    else if (dialogRef.current?.open) hide(false);
  }, [byKey, show, hide]);

  useEffect(() => {
    sync(); // a URL loaded with #work/<key> opens that sheet
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, [sync]);

  // Rows stay real links (they work without JS); with JS a plain click opens in place.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target instanceof Element ? e.target : null;
      const link = target?.closest<HTMLAnchorElement>('a[data-sheet]') ?? null;
      const key = link?.dataset.sheet;
      if (!link || !key || !byKey.has(key)) return;
      e.preventDefault();
      triggerRef.current = link;
      show(key, true);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [byKey, show]);

  // After the chosen project's content is in the DOM: open, reset scroll, lock the page, focus.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d || !openKey) return;
    if (!d.open) {
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', ''); // browsers without <dialog> methods: open, not modal
    }
    d.scrollTop = 0;
    document.documentElement.classList.add('sheet-open');
    headingRef.current?.focus({ preventScroll: true });
  }, [openKey]);

  useEffect(() => () => document.documentElement.classList.remove('sheet-open'), []);

  return (
    <dialog
      ref={dialogRef}
      className="sheet"
      aria-labelledby="sheet-name"
      onCancel={(e) => {
        e.preventDefault(); // run our own close so the exit animation plays
        hide(true);
      }}
      onClose={() => {
        // The browser can force a close (repeated Esc); keep the URL and state honest.
        clearSheetHash();
        finish();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) hide(true); // the backdrop
      }}
    >
      {current && <SheetBody project={current} projects={projects} locale={locale} headingRef={headingRef} onClose={() => hide(true)} />}
    </dialog>
  );
}

function SheetBody({ project, locale, headingRef, onClose }: SheetBodyProps) {
  const t = dict[locale];
  return (
    <>
      <button type="button" className="sheet-close" aria-label={t.sheetClose} onClick={onClose}>
        <Icon name="x" />
      </button>
      <div className="sbody">
        <div>
          <h2 id="sheet-name" ref={headingRef} tabIndex={-1} className="sheet-name">
            {project.name}
          </h2>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Run and pass** — `npx vitest run tests/project-sheet.test.tsx tests/p2-css.test.ts` → all pass. `npx tsc --noEmit && npx eslint src/components/ProjectSheet.tsx` → exit 0, no warnings.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProjectSheet.tsx src/components/project-sheet.css tests/project-sheet.test.tsx tests/p2-css.test.ts
git commit -m "$(cat <<'EOF'
feat(p2): project sheet dialog with the #work/<key> history contract

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
)"
```

---

### Task 10: ProjectSheet content — media, facts, links, lineage card

**Files:** Modify `src/components/ProjectSheet.tsx` (whole file, below) · Modify `src/components/project-sheet.css` (append after the last line) · Test `tests/project-sheet-content.test.tsx`
**Interfaces:** Consumes: `hostOf`, `lineageFor`, `unbreak`, `washVar`, `Lineage` (Task 2); `SIG_YEARS` (Task 4); `StatusChip` (Task 8); dictionary keys (Task 3); C3 `ThaiText`; C4 `Sketch` (`'rings'`, `'five'`); C9 `.win .btn .btn-fill .btn-out`; `imageAlt`; `next/link` · Produces: sheet content classes `smedia[data-media] sheet-win sheet-bar smedia-draw sheet-notion sheet-notion-row sheet-note sheet-kick sheet-q sheet-desc sheet-side sheet-list sheet-chips sheet-links sheet-gonai sheet-story lin`; custom property `--wash` on `.smedia`

- [ ] **Step 1: Write the failing test** — create `tests/project-sheet-content.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectSheet from '@/components/ProjectSheet';
import { dict } from '@/lib/dictionary';
import type { Locale, Project } from '@/lib/models';
import { AJE, GONAI, KLAO_SITE, LINEUP, TALATIFY, TRIPEDIA, makeProject } from './helpers/lineup';

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/en');
});

// Opens a sheet the way a shared link does: the URL carries the hash on load.
function openAt(key: string, locale: Locale = 'en', projects: Project[] = LINEUP) {
  window.history.replaceState(null, '', `/${locale}#work/${key}`);
  const { container } = render(<ProjectSheet projects={projects} locale={locale} />);
  const dialog = container.querySelector('dialog.sheet') as HTMLDialogElement;
  expect(dialog.open).toBe(true);
  return dialog;
}

const texts = (root: Element, selector: string) => Array.from(root.querySelectorAll(selector)).map((n) => n.textContent);

describe('ProjectSheet content', () => {
  it('GoNai: kicker, name, question, what it is, status, stack, green Open app, and its address bar', () => {
    const dialog = openAt('gonai');
    expect(dialog.querySelector('.sheet-kick')?.textContent).toBe(GONAI.kicker!.en);
    expect(dialog.querySelector('h2#sheet-name')?.textContent).toBe('GoNai');
    expect(dialog.querySelector('.sheet-q')?.textContent).toBe(GONAI.question!.en);
    // No outcomes on GoNai, so that heading is absent rather than empty.
    expect(texts(dialog, '.sbody h3')).toEqual([dict.en.sheetWhat, dict.en.sheetStatus, dict.en.sheetStack]);
    expect(dialog.querySelector('.sheet-desc')?.textContent).toBe(GONAI.description.en);
    expect(dialog.querySelector('.st-chip')?.textContent).toBe(GONAI.status!.en);
    expect(texts(dialog, '.sheet-chips span')).toEqual(GONAI.stack);
    const open = within(dialog).getByRole('link', { name: dict.en.workOpenApp });
    expect(open.getAttribute('href')).toBe(GONAI.liveUrl);
    expect(open.getAttribute('target')).toBe('_blank');
    expect(open.getAttribute('rel')).toContain('noreferrer');
    expect(open.className).toContain('sheet-gonai');
    const media = dialog.querySelector<HTMLElement>('[data-media="win"]')!;
    expect(media.querySelector('.sheet-bar span')?.textContent).toBe('gonai-three.vercel.app');
    expect(media.querySelector('img')?.getAttribute('alt')).toBe(GONAI.alt!.en);
    expect(media.style.getPropertyValue('--wash')).toBe('var(--w-gonai)');
  });

  it('Tripedia: the five→one drawing with its alt text, outcomes, no links, and the lineage card', () => {
    const dialog = openAt('tripedia');
    const art = dialog.querySelector('[data-media="five"] [role="img"]');
    expect(art?.getAttribute('aria-label')).toBe(TRIPEDIA.alt!.en);
    expect(art?.querySelector('svg')).toBeTruthy();
    expect(texts(dialog, '.sheet-list li')).toEqual(TRIPEDIA.outcomes.en);
    expect(dialog.querySelector('.sheet-links')).toBeNull();
    expect(dialog.querySelector('.lin h3')?.textContent).toBe(dict.en.lineageTitle);
    const table = dialog.querySelector('.lin table')!;
    expect(texts(table, 'thead th')).toEqual([dict.en.lineageRowHead, '2022 · Tripedia', '2026 · GoNai']);
    expect(table.querySelector('thead th')?.getAttribute('scope')).toBe('col');
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    expect(rows.map((r) => r.querySelector('th')?.textContent)).toEqual([
      dict.en.lineageQuestion,
      dict.en.lineageExisted[0],
      dict.en.lineageTeam[0],
      dict.en.lineageResult[0],
    ]);
    expect(rows[0].querySelector('th')?.getAttribute('scope')).toBe('row');
    expect(texts(rows[0], 'td')).toEqual([TRIPEDIA.question!.en, GONAI.question!.en]);
    expect(texts(rows[2], 'td')).toEqual([dict.en.lineageTeam[1], dict.en.lineageTeam[2]]);
  });

  it('GoNai carries the same lineage card from the other end', () => {
    const dialog = openAt('gonai');
    expect(texts(dialog, '.lin thead th').slice(1)).toEqual(['2022 · Tripedia', '2026 · GoNai']);
  });

  it('Talatify: the rings drawing, outcomes, no lineage and no links', () => {
    const dialog = openAt('talatify');
    expect(dialog.querySelector('[data-media="rings"] [role="img"]')?.getAttribute('aria-label')).toBe(TALATIFY.alt!.en);
    expect(texts(dialog, '.sheet-list li')).toEqual(TALATIFY.outcomes.en);
    expect(dialog.querySelector('.lin')).toBeNull();
    expect(dialog.querySelector('.sheet-links')).toBeNull();
  });

  it('klao-site: the Notion row vignette with its within-the-hour note, and both links', () => {
    const dialog = openAt('klao-site');
    const win = dialog.querySelector('[data-media="notion"] [role="img"]');
    expect(win?.getAttribute('aria-label')).toBe(KLAO_SITE.alt!.en);
    expect(texts(dialog, '.sheet-notion-row b')).toEqual(['Name', 'Type', 'Stack', 'Status']);
    expect(texts(dialog, '.sheet-notion-row span')).toEqual(['klao-site', 'Build', 'Next.js · Notion API · Vercel', KLAO_SITE.status!.en]);
    expect(dialog.querySelector('.sheet-note')?.textContent).toBe(dict.en.sheetNotionNote);
    const code = within(dialog).getByRole('link', { name: dict.en.viewCode });
    expect(code.getAttribute('href')).toBe(KLAO_SITE.repoUrl);
    expect(code.className).toContain('btn-out');
    expect(within(dialog).getByRole('link', { name: dict.en.workOpenApp }).className).not.toContain('sheet-gonai');
  });

  it('Aje: a plain screenshot window without an address bar, on its own wash', () => {
    const dialog = openAt('aje');
    const media = dialog.querySelector<HTMLElement>('[data-media="img"]')!;
    expect(media.querySelector('.sheet-bar')).toBeNull();
    const img = media.querySelector('img')!;
    expect(img.getAttribute('src')).toBe(AJE.imageSrc);
    expect(img.getAttribute('alt')).toBe(AJE.alt!.en);
    expect(img.getAttribute('width')).toBe('1600');
    expect(img.getAttribute('height')).toBe('900');
    expect(media.style.getPropertyValue('--wash')).toBe('var(--w-aje)');
  });

  it('links the long-form story when the project has a slug', () => {
    const storied = LINEUP.map((p) => (p.name === 'Aje' ? { ...p, slug: 'aje-story' } : p));
    const dialog = openAt('aje-story', 'en', storied);
    expect(within(dialog).getByRole('link', { name: dict.en.readStory }).getAttribute('href')).toBe('/en/work/aje-story');
  });

  it('renders Thai copy on /th, with the | break mark consumed', () => {
    const dialog = openAt('tripedia', 'th');
    expect(dialog.querySelector('.sheet-q')?.textContent).toBe(TRIPEDIA.question!.th.replace(/\|/g, ''));
    expect(texts(dialog, '.sbody h3')).toContain(dict.th.sheetWhat);
    expect(dialog.querySelector('.lin h3')?.textContent).toBe(dict.th.lineageTitle);
    expect(texts(dialog, '.lin tbody tr:first-child td')[0]).toBe(TRIPEDIA.question!.th.replace(/\|/g, ''));
    expect(dialog.textContent).not.toContain(dict.en.sheetWhat);
  });

  it('a pre-migration row (no kicker, status, outcomes or screenshot) still opens whole', () => {
    const bare = makeProject({ id: 'fx-bare', name: 'Bare', description: { en: 'Only the old fields.', th: 'มีแค่ฟิลด์เดิม' } });
    const dialog = openAt('bare', 'en', [bare]);
    expect(dialog.querySelector('.smedia')).toBeNull();
    expect(dialog.querySelector('.sheet-kick')).toBeNull();
    expect(dialog.querySelector('.st-chip')).toBeNull();
    expect(dialog.querySelector('.sheet-list')).toBeNull();
    expect(dialog.querySelector('h2')?.textContent).toBe('Bare');
    expect(dialog.querySelector('.sheet-desc')?.textContent).toBe('Only the old fields.');
  });
});
```

- [ ] **Step 2: Run it and see it fail** — `npx vitest run tests/project-sheet-content.test.tsx` → FAIL: `expected null to be 'Build · Live'` (the Task 9 body renders only the heading).

- [ ] **Step 3: Implement** — replace the whole of `src/components/ProjectSheet.tsx` with:

```tsx
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import './project-sheet.css';
import StatusChip from '@/components/StatusChip';
import ThaiText from '@/components/ThaiText';
import { Icon } from '@/components/icons';
import { Sketch } from '@/components/sketches';
import { dict } from '@/lib/dictionary';
import { imageAlt } from '@/lib/image-alt';
import type { Locale, Project } from '@/lib/models';
import { hostOf, lineageFor, unbreak, washVar, type Lineage } from '@/lib/project-view';
import { parseSheetHash, projectKey, sheetHash } from '@/lib/sheet-url';
import { SIG_YEARS } from '@/lib/signature';

// The project sheet (spec §4 row "#work/<slug>", §6 "Projects index + sheets"): one native
// <dialog> for every project on the index, opened three ways --
//   1. a click on any `a[data-sheet]` (index rows; later the footer) -> pushState `#work/<key>`,
//      so Back closes it;
//   2. a page load whose URL already carries a known `#work/<key>` (a shared link);
//   3. `hashchange` / `popstate` (Back, Forward, or another island assigning location.hash).
// Esc, the close button and a backdrop click close it and replaceState the hash away. An
// unknown or malformed hash opens nothing and throws nothing (Review Focus #3). Nothing here
// touches the server: the home route stays one static ISR page.

const EXIT_MS = 280; // .sheet.closing in project-sheet.css

function motionAllowed(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: no-preference)').matches;
}

function clearSheetHash() {
  if (window.location.hash.startsWith('#work/')) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

type SheetBodyProps = {
  project: Project;
  projects: Project[];
  locale: Locale;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onClose: () => void;
};

export default function ProjectSheet({ projects, locale }: { projects: Project[]; locale: Locale }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const exitTimer = useRef(0);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const byKey = useMemo(() => new Map(projects.map((p) => [projectKey(p), p])), [projects]);
  const current = openKey ? (byKey.get(openKey) ?? null) : null;

  const show = useCallback(
    (key: string, push: boolean) => {
      if (!byKey.has(key)) return; // "#work/unknown": nothing to open
      window.clearTimeout(exitTimer.current);
      dialogRef.current?.classList.remove('closing');
      if (push && window.location.hash !== sheetHash(key)) window.history.pushState(null, '', sheetHash(key));
      setOpenKey(key);
    },
    [byKey],
  );

  // Idempotent: the close button, Esc, Back and the dialog's own `close` event can all land
  // here, sometimes twice for one close.
  const finish = useCallback(() => {
    const d = dialogRef.current;
    const trigger = triggerRef.current;
    triggerRef.current = null;
    window.clearTimeout(exitTimer.current);
    if (d) {
      d.classList.remove('closing');
      if (d.open) {
        if (typeof d.close === 'function') d.close();
        else d.removeAttribute('open');
      }
    }
    document.documentElement.classList.remove('sheet-open');
    setOpenKey(null);
    trigger?.focus({ preventScroll: true });
  }, []);

  const hide = useCallback(
    (clearHash: boolean) => {
      if (clearHash) clearSheetHash();
      const d = dialogRef.current;
      if (!d || !d.open) {
        finish();
        return;
      }
      if (d.classList.contains('closing')) return;
      if (!motionAllowed()) {
        finish();
        return;
      }
      d.classList.add('closing');
      exitTimer.current = window.setTimeout(finish, EXIT_MS);
    },
    [finish],
  );

  // The URL is the source of truth for which sheet is open.
  const sync = useCallback(() => {
    const key = parseSheetHash(window.location.hash);
    if (key !== null && byKey.has(key)) show(key, false);
    else if (dialogRef.current?.open) hide(false);
  }, [byKey, show, hide]);

  useEffect(() => {
    sync(); // a URL loaded with #work/<key> opens that sheet
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, [sync]);

  // Rows stay real links (they work without JS); with JS a plain click opens in place.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target instanceof Element ? e.target : null;
      const link = target?.closest<HTMLAnchorElement>('a[data-sheet]') ?? null;
      const key = link?.dataset.sheet;
      if (!link || !key || !byKey.has(key)) return;
      e.preventDefault();
      triggerRef.current = link;
      show(key, true);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [byKey, show]);

  // After the chosen project's content is in the DOM: open, reset scroll, lock the page, focus.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d || !openKey) return;
    if (!d.open) {
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', ''); // browsers without <dialog> methods: open, not modal
    }
    d.scrollTop = 0;
    document.documentElement.classList.add('sheet-open');
    headingRef.current?.focus({ preventScroll: true });
  }, [openKey]);

  useEffect(() => () => document.documentElement.classList.remove('sheet-open'), []);

  return (
    <dialog
      ref={dialogRef}
      className="sheet"
      aria-labelledby="sheet-name"
      onCancel={(e) => {
        e.preventDefault(); // run our own close so the exit animation plays
        hide(true);
      }}
      onClose={() => {
        // The browser can force a close (repeated Esc); keep the URL and state honest.
        clearSheetHash();
        finish();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) hide(true); // the backdrop
      }}
    >
      {current && <SheetBody project={current} projects={projects} locale={locale} headingRef={headingRef} onClose={() => hide(true)} />}
    </dialog>
  );
}

// Assistive-tech attributes for a picture that is a drawing or a vignette: an image with the
// row's alt text when there is one, hidden when there is not (never a nameless role="img").
function pictureA11y(alt: string) {
  return alt ? ({ role: 'img', 'aria-label': alt } as const) : ({ 'aria-hidden': true } as const);
}

function SheetMedia({ project, locale }: { project: Project; locale: Locale }) {
  const t = dict[locale];
  const alt = project.alt?.[locale] ?? '';

  // Business plays carry their receipts as line drawings (Talatify's TAM/SAM/SOM rings,
  // Tripedia's five apps -> one), never a stand-in screenshot.
  if (project.media === 'rings' || project.media === 'five') {
    return (
      <div className="smedia" data-media={project.media}>
        <div className="smedia-draw" {...pictureA11y(alt)}>
          <Sketch name={project.media} />
        </div>
      </div>
    );
  }

  // This site's own Notion row, drawn as a window: the thing the visitor is reading, at its source.
  // Labels are Notion's property names and select literals, so they stay English on /th too.
  if (project.media === 'notion') {
    const rows = (
      [
        ['Name', project.name],
        ['Type', project.type === 'business' ? 'Business' : 'Build'],
        ['Stack', project.stack.join(' · ')],
        ['Status', project.status?.en ?? ''],
      ] as const
    ).filter(([, value]) => value);
    return (
      <div className="smedia" data-media="notion">
        <div className="win sheet-win" {...pictureA11y(alt)}>
          <div className="sheet-bar">
            <i />
            <i />
            <i />
            <span>Notion · Projects</span>
          </div>
          <div className="sheet-notion">
            {rows.map(([label, value]) => (
              <div key={label} className="sheet-notion-row">
                <b>{label}</b>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="sheet-note">{t.sheetNotionNote}</p>
      </div>
    );
  }

  // 'img' / 'win': a real screenshot or nothing (receipts rule) -- a pre-migration row with no
  // image gets no media block at all. 'win' adds the address bar from the live URL.
  if (!project.imageSrc) return null;
  const host = project.media === 'win' ? hostOf(project.liveUrl) : null;
  return (
    <div className="smedia" data-media={project.media} style={{ '--wash': washVar(project.wash) } as CSSProperties}>
      <div className="win sheet-win">
        {host && (
          <div className="sheet-bar" aria-hidden="true">
            <i />
            <i />
            <i />
            <span>{host}</span>
          </div>
        )}
        <img src={project.imageSrc} alt={alt || imageAlt(project.imageSrc, project.name)} width={1600} height={900} decoding="async" />
      </div>
    </div>
  );
}

// "Same idea, four years apart": shown on both ends of the pair. The question row comes from
// the two Project rows; the other rows are the prototype's fixed comparison copy.
function LineageCard({ lineage, locale }: { lineage: Lineage; locale: Locale }) {
  const t = dict[locale];
  const { earlier, later } = lineage;
  const rows: (readonly string[])[] = [
    [t.lineageQuestion, unbreak(earlier.question?.[locale] ?? ''), unbreak(later.question?.[locale] ?? '')],
    t.lineageExisted,
    t.lineageTeam,
    t.lineageResult,
  ];
  return (
    <section className="lin" aria-labelledby="sheet-lineage">
      <h3 id="sheet-lineage">
        <ThaiText text={t.lineageTitle} />
      </h3>
      <table>
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">{t.lineageRowHead}</span>
            </th>
            <th scope="col">{`${SIG_YEARS[0]} · ${earlier.name}`}</th>
            <th scope="col">{`${SIG_YEARS[SIG_YEARS.length - 1]} · ${later.name}`}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, a, b]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td>{a}</td>
              <td>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function SheetBody({ project, projects, locale, headingRef, onClose }: SheetBodyProps) {
  const t = dict[locale];
  const kicker = project.kicker?.[locale];
  const question = project.question?.[locale];
  const outcomes = project.outcomes[locale];
  const lineage = lineageFor(project, projects);

  return (
    <>
      <button type="button" className="sheet-close" aria-label={t.sheetClose} onClick={onClose}>
        <Icon name="x" />
      </button>
      <SheetMedia project={project} locale={locale} />
      <div className="sbody">
        <div>
          {kicker && <p className="sheet-kick">{kicker}</p>}
          <h2 id="sheet-name" ref={headingRef} tabIndex={-1} className="sheet-name">
            {project.name}
          </h2>
          {question && (
            <p className="sheet-q">
              <ThaiText text={question} />
            </p>
          )}
          <h3>{t.sheetWhat}</h3>
          <p className="sheet-desc">{project.description[locale]}</p>
        </div>
        <div className="sheet-side">
          {project.status && (
            <>
              <h3>{t.sheetStatus}</h3>
              <StatusChip project={project} locale={locale} />
            </>
          )}
          {outcomes.length > 0 && (
            <>
              <h3>{t.sheetOutcomes}</h3>
              <ul className="sheet-list">
                {outcomes.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </>
          )}
          {project.stack.length > 0 && (
            <>
              <h3>{t.sheetStack}</h3>
              <div className="sheet-chips">
                {project.stack.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </>
          )}
          {(project.liveUrl || project.repoUrl) && (
            <div className="sheet-links">
              {project.liveUrl && (
                // GoNai's green belongs to GoNai alone (spec §5.1): keyed on its wash, not its name.
                <a
                  className={project.wash === 'gonai' ? 'btn btn-fill sheet-gonai' : 'btn btn-fill'}
                  href={project.liveUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.workOpenApp} <span aria-hidden="true">↗</span>
                </a>
              )}
              {project.repoUrl && (
                <a className="btn btn-out" href={project.repoUrl} target="_blank" rel="noreferrer">
                  {t.viewCode} <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          )}
          {project.slug && (
            <Link className="sheet-story" href={`/${locale}/work/${project.slug}`}>
              {t.readStory} <span aria-hidden="true">›</span>
            </Link>
          )}
        </div>
      </div>
      {lineage && <LineageCard lineage={lineage} locale={locale} />}
    </>
  );
}
```

and append to the end of `src/components/project-sheet.css` (after the closing `}` of its `@media (max-width: 734px)` block):

```css

/* Sheet content (media, facts, links, lineage card). */
.smedia { position: relative; display: grid; place-items: center; aspect-ratio: 16 / 9; overflow: hidden; background: var(--wash, var(--mist)); }
.sheet-win { align-self: start; width: 86%; margin-top: 6%; background: #fff; }
.sheet-win img { display: block; width: 100%; height: auto; }
/* A light window's chrome stays light in dark mode: it is a picture of a window. */
.sheet-bar { display: flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; background: #f2f2f4; }
.sheet-bar i { width: 8px; height: 8px; border-radius: 50%; background: #d4d4d8; }
.sheet-bar span { margin: 0 auto; padding: 1px 12px; border-radius: 9px; background: #fff; color: #6e6e73; font-size: 11px; }
.smedia-draw { display: grid; place-items: center; width: 100%; height: 100%; color: var(--ink-1); }
.smedia-draw svg { width: 100%; height: 100%; }
.sheet-notion { padding: 18px 22px; color: #1A1C20; }
.sheet-notion-row { display: grid; grid-template-columns: 110px 1fr; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgb(20 26 44 / .08); }
.sheet-notion-row b { color: #666970; font-size: 13px; font-weight: 500; }
.sheet-notion-row span { font-size: 14px; line-height: 20px; }
.sheet-note { position: absolute; left: 0; right: 0; bottom: 14px; margin: 0; padding: 0 16px; color: var(--ink-2); font-size: 14px; text-align: center; }
.sheet-kick { margin: 0; color: var(--ink-2); font-size: 14px; line-height: 20px; font-weight: 600; }
.sheet-q { margin: 10px 0 0; color: var(--ink-2); font-size: 24px; line-height: 30px; letter-spacing: .009em; text-wrap: balance; }
:lang(th) .sheet-q { line-height: 34px; letter-spacing: 0; }
.sbody h3 { margin: 28px 0 8px; color: var(--ink-2); font-size: 14px; font-weight: 600; }
.sheet-side > h3:first-child { margin-top: 6px; }
.sheet-desc { margin: 0; font-size: 17px; line-height: 26px; }
:lang(th) .sheet-desc { line-height: 28px; }
.sheet-list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.sheet-list li { position: relative; padding-left: 20px; font-size: 17px; line-height: 26px; }
:lang(th) .sheet-list li { line-height: 28px; }
.sheet-list li::before { content: ""; position: absolute; top: 11px; left: 2px; width: 5px; height: 5px; border-radius: 50%; background: var(--ink-3); }
.sheet-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.sheet-chips span { padding: 4px 12px; border-radius: 14px; background: var(--mist); font-size: 14px; }
.sheet .st-chip { font-size: 14px; }
.sheet-links { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
/* GoNai's own green (spec §5.1: only in GoNai's frame, sheet and "Open app"); white on it in both themes. */
.sheet-links .sheet-gonai, .sheet-links .sheet-gonai:hover { background: #1C7A57; color: #fff; }
.sheet-story { display: inline-flex; align-items: center; min-height: 44px; margin-top: 12px; color: var(--link); font-size: 17px; text-decoration: none; }
.sheet-story:hover { text-decoration: underline; }
.lin { margin: 0 40px 32px; padding: 24px 28px; border-radius: 20px; background: var(--mist); }
.lin h3 { margin: 0 0 12px; font-size: 21px; font-weight: 600; letter-spacing: .011em; }
:lang(th) .lin h3 { letter-spacing: 0; }
.lin table { width: 100%; border-collapse: collapse; font-size: 15px; line-height: 22px; }
.lin :is(th, td) { padding: 10px 12px 10px 0; border-top: 1px solid var(--line); text-align: left; vertical-align: top; }
.lin thead th { border-top: 0; color: var(--ink-2); font-size: 14px; }
.lin tbody th { width: 22%; color: var(--ink-2); font-weight: 600; }
@media (max-width: 734px) {
  .sheet-win { width: 92%; }
  .sheet-bar span { font-size: 14px; }
  .sheet-notion-row b { font-size: 14px; }
  .sheet-q { font-size: 19px; line-height: 26px; }
  :lang(th) .sheet-q { line-height: 29px; }
  .lin { margin: 0 20px 24px; padding: 18px; }
  .lin table { font-size: 14px; }
}
```

- [ ] **Step 4: Run and pass** — `npx vitest run tests/project-sheet-content.test.tsx tests/project-sheet.test.tsx tests/p2-css.test.ts` → all pass. `npx tsc --noEmit && npx eslint src/components/ProjectSheet.tsx` → exit 0, no warnings.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProjectSheet.tsx src/components/project-sheet.css tests/project-sheet-content.test.tsx
git commit -m "$(cat <<'EOF'
feat(p2): sheet content -- media per project, facts, links, lineage card

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
)"
```

---

### Task 11: ProjectsIndex

**Files:** Create `src/components/sections/ProjectsIndex.tsx` · Create `src/components/projects-index.css` · Test `tests/projects-index.test.tsx` · Modify `tests/p2-css.test.ts` (the `P2_CSS` line)
**Interfaces:** Consumes: `projectKey`, `sheetHash` (Task 1); `unbreak` (Task 2); dictionary `deckHeading deckSubtitle deckSubtitleBuildOnly workTypeBusiness workTypeBuild workDoor` (Task 3); `StatusChip` (Task 8); `ProjectSheet` (Tasks 9–10); `Reveal`; C3 `ThaiText`; C4 `Icon` (`'caret-right'`), `Sketch` (`'rings'`, `'five'`); C9 `.section .wrap .t-h2 .t-lead` · Produces: `export default function ProjectsIndex({ projects, locale }: { projects: Project[]; locale: Locale }): JSX.Element | null` rendering `<section id="work" class="section wrap" aria-labelledby="work-h">` with rows `<a class="pi-row" href="#work/<key>" data-sheet="<key>">`

- [ ] **Step 1: Write the failing test** — create `tests/projects-index.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectsIndex from '@/components/sections/ProjectsIndex';
import { dict } from '@/lib/dictionary';
import { projectKey } from '@/lib/sheet-url';
import { GONAI, LINEUP, TRIPEDIA, makeProject } from './helpers/lineup';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/en');
});

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

const keysIn = (group: Element) => Array.from(group.querySelectorAll<HTMLAnchorElement>('a.pi-row')).map((a) => a.dataset.sheet);
const rowOf = (c: HTMLElement, key: string) => c.querySelector(`a.pi-row[data-sheet="${key}"]`) as HTMLAnchorElement;

describe('ProjectsIndex', () => {
  it('heads the section with the prototype headline and lead, labelled for assistive tech', () => {
    const { container } = render(<ProjectsIndex projects={LINEUP} locale="en" />);
    const section = container.querySelector('section#work')!;
    expect(section.getAttribute('aria-labelledby')).toBe('work-h');
    expect(container.querySelector('#work-h')?.textContent).toBe(dict.en.deckHeading);
    expect(screen.getByText(dict.en.deckSubtitle)).toBeTruthy();
  });

  it('lists Business first, then Build, each in Order', () => {
    const { container } = render(<ProjectsIndex projects={LINEUP} locale="en" />);
    const groups = container.querySelectorAll('.pi-cols > section');
    expect(groups).toHaveLength(2);
    expect(groups[0].querySelector('h3')?.textContent).toBe(dict.en.workTypeBusiness);
    expect(groups[1].querySelector('h3')?.textContent).toBe(dict.en.workTypeBuild);
    expect(keysIn(groups[0])).toEqual(['talatify', 'tripedia']);
    expect(keysIn(groups[1])).toEqual(['aje', 'gonai', 'klao-site']);
  });

  it('makes every row a real link to #work/<key>, which works without JavaScript', () => {
    const { container } = render(<ProjectsIndex projects={LINEUP} locale="en" />);
    for (const p of LINEUP) {
      expect(rowOf(container, projectKey(p)).getAttribute('href')).toBe(`#work/${projectKey(p)}`);
    }
  });

  it('shows the name, the status mark + word, and the question without its | break mark', () => {
    const { container } = render(<ProjectsIndex projects={LINEUP} locale="th" />);
    const trip = rowOf(container, 'tripedia');
    expect(trip.querySelector('.pi-name')?.textContent).toContain('Tripedia');
    expect(trip.querySelector('.st-chip')?.textContent).toBe(TRIPEDIA.status!.th);
    expect(trip.querySelector('.st-mk')?.getAttribute('data-mark')).toBe('ring');
    expect(trip.querySelector('.pi-q')?.textContent).toBe(TRIPEDIA.question!.th.replace(/\|/g, ''));
  });

  it('thumbnails: the screenshot for builds, a line drawing for business plays, the Notion vignette for this site', () => {
    const { container } = render(<ProjectsIndex projects={LINEUP} locale="en" />);
    const thumb = (key: string) => rowOf(container, key).querySelector('.pi-thumb')!;
    const img = thumb('gonai').querySelector('img')!;
    expect(img.getAttribute('src')).toBe(GONAI.imageSrc);
    expect(img.getAttribute('alt')).toBe(''); // the name sits right beside it
    expect(img.getAttribute('width')).toBe('88');
    expect(img.getAttribute('height')).toBe('50');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(thumb('talatify').querySelector('svg')).toBeTruthy();
    expect(thumb('tripedia').querySelector('svg')).toBeTruthy();
    expect(thumb('klao-site').querySelector('svg')).toBeTruthy();
    expect(thumb('klao-site').querySelector('img')).toBeNull();
    for (const key of ['talatify', 'gonai', 'klao-site']) expect(thumb(key).getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps a pre-migration row whole: no status, no question, no screenshot', () => {
    const bare = makeProject({ id: 'fx-bare', name: 'Bare', order: 9 });
    const { container } = render(<ProjectsIndex projects={[bare]} locale="en" />);
    const row = rowOf(container, 'bare');
    expect(row.querySelector('.pi-name')?.textContent).toBe('Bare');
    expect(row.querySelector('.st-chip')).toBeNull();
    expect(row.querySelector('.pi-q')).toBeNull();
    expect(row.querySelector('.pi-thumb img')).toBeNull();
    // No business rows: the lead stops promising a chapter that is not there.
    expect(screen.getByText(dict.en.deckSubtitleBuildOnly)).toBeTruthy();
  });

  it('carries the By day door at the foot of the first column', () => {
    const { container } = render(<ProjectsIndex projects={LINEUP} locale="en" />);
    const door = container.querySelector('a.pi-door')!;
    expect(door.getAttribute('href')).toBe('#story');
    expect(door.textContent).toBe(dict.en.workDoor);
    expect(door.closest('section')?.querySelector('h3')?.textContent).toBe(dict.en.workTypeBusiness);
  });

  it('renders nothing for an empty project list', () => {
    expect(renderToStaticMarkup(<ProjectsIndex projects={[]} locale="en" />)).toBe('');
  });

  it('renders Thai group labels and door on /th', () => {
    const { container } = render(<ProjectsIndex projects={LINEUP} locale="th" />);
    const labels = Array.from(container.querySelectorAll('.pi-label')).map((h) => h.textContent);
    expect(labels).toEqual([dict.th.workTypeBusiness, dict.th.workTypeBuild]);
    expect(container.querySelector('a.pi-door')?.textContent).toBe(dict.th.workDoor);
    expect(container.textContent).not.toContain(dict.en.workDoor);
  });

  it('server HTML carries every row, the door and a closed sheet, with nothing hidden inline (Review Focus #4)', () => {
    const html = renderToStaticMarkup(<ProjectsIndex projects={LINEUP} locale="en" />);
    for (const p of LINEUP) {
      expect(html).toContain(`href="#work/${projectKey(p)}"`);
      expect(html).toContain(`>${p.name}`);
    }
    expect(html).toContain('href="#story"');
    expect(html).toContain('<dialog class="sheet" aria-labelledby="sheet-name"></dialog>');
    expect(html).not.toMatch(/style="[^"]*opacity:\s*0/);
  });

  it('opens the sheet in place when a row is clicked', () => {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    const { container } = render(<ProjectsIndex projects={LINEUP} locale="en" />);
    fireEvent.click(rowOf(container, 'aje'));
    expect(window.location.hash).toBe('#work/aje');
    const dialog = container.querySelector('dialog.sheet') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('h2')?.textContent).toBe('Aje');
  });
});
```

and in `tests/p2-css.test.ts` replace

```ts
const P2_CSS = ['src/components/signature.css', 'src/components/status-chip.css', 'src/components/project-sheet.css'];
```

with

```ts
const P2_CSS = [
  'src/components/signature.css',
  'src/components/status-chip.css',
  'src/components/project-sheet.css',
  'src/components/projects-index.css',
];
```

- [ ] **Step 2: Run it and see it fail** — `npx vitest run tests/projects-index.test.tsx tests/p2-css.test.ts` → FAIL: `Failed to resolve import "@/components/sections/ProjectsIndex"` and `ENOENT … projects-index.css`.

- [ ] **Step 3: Implement** — create `src/components/projects-index.css`:

```css
/* Projects index (spec §4 row 3, §6; prototype `.index` block). Two columns -- Business, then
   Build -- of rows that open the project sheet. Hairlines, no shadows (Apple scale). Only the
   thumbnail's hover zoom animates (transform); the row's hover background changes without a
   transition. */
.pi-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 44px; }
.pi-label { margin: 0; padding-bottom: 10px; border-bottom: 1px solid var(--line); color: var(--ink-2); font-size: 14px; line-height: 18px; font-weight: 600; }
.pi-rows { margin: 0; padding: 0; list-style: none; }
.pi-rows > li { border-bottom: 1px solid var(--line); }
.pi-row { display: grid; grid-template-columns: 88px minmax(0, 1fr) 16px; align-items: center; gap: 16px; min-height: 76px; margin: 0 -10px; padding: 12px 10px; border-radius: 12px; color: inherit; text-decoration: none; }
.pi-thumb { position: relative; display: block; width: 88px; height: 50px; overflow: hidden; border-radius: 8px; background: var(--mist); color: var(--ink-2); }
.pi-thumb::after { content: ""; position: absolute; inset: 0; border-radius: inherit; box-shadow: inset 0 0 0 1px var(--line); }
.pi-thumb :is(img, svg) { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform 300ms var(--ease-drift); }
@media (hover: hover) and (pointer: fine) {
  .pi-row:hover { background: var(--mist); }
  .pi-row:hover .pi-thumb :is(img, svg) { transform: scale(1.03); }
}
@media (prefers-reduced-motion: reduce) {
  .pi-thumb :is(img, svg) { transition: none; }
}
.pi-text { min-width: 0; }
.pi-name { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; font-size: 17px; line-height: 22px; font-weight: 600; }
.pi-q { display: block; margin-top: 2px; overflow: hidden; color: var(--ink-2); font-size: 15px; line-height: 20px; white-space: nowrap; text-overflow: ellipsis; }
:lang(th) .pi-q { line-height: 23px; }
.pi-chev { display: grid; place-items: center; color: var(--ink-3); font-size: 16px; }
.pi-door { display: block; min-height: 44px; padding: 26px 0 24px; color: var(--link); font-size: 15px; line-height: 21px; font-weight: 600; text-decoration: none; }
.pi-door:hover { text-decoration: underline; }
@media (max-width: 734px) {
  .pi-cols { grid-template-columns: 1fr; gap: 28px; margin-top: 32px; }
  .pi-row { align-items: start; min-height: 84px; }
  .pi-q { display: -webkit-box; white-space: normal; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
}
```

and `src/components/sections/ProjectsIndex.tsx`:

```tsx
import type { ReactNode } from 'react';
import '../projects-index.css';
import ProjectSheet from '@/components/ProjectSheet';
import StatusChip from '@/components/StatusChip';
import ThaiText from '@/components/ThaiText';
import { Icon } from '@/components/icons';
import Reveal from '@/components/motion/Reveal';
import { Sketch } from '@/components/sketches';
import { dict } from '@/lib/dictionary';
import type { Locale, Project } from '@/lib/models';
import { unbreak } from '@/lib/project-view';
import { projectKey, sheetHash } from '@/lib/sheet-url';

// "Business plays, and the things I shipped." (spec §4 row 3, §6; replaces WorkDeck). Server
// component: every row, label and the door are in the server HTML (Review Focus #4). Each row is
// a real link to `#work/<key>`; ProjectSheet (the one client island here) intercepts plain clicks
// and opens the sheet in place. Business leads, then Build -- the same chapter order WorkDeck
// had -- and an empty group renders nothing.
const GROUPS = [
  { type: 'business', labelKey: 'workTypeBusiness', labelId: 'work-business' },
  { type: 'build', labelKey: 'workTypeBuild', labelId: 'work-build' },
] as const;

// The prototype's 88×50 Notion-row sketch for this site's own row.
function NotionThumb() {
  return (
    <svg viewBox="0 0 88 50">
      <rect width="88" height="50" style={{ fill: 'var(--canvas)' }} />
      <g style={{ fill: 'var(--ink-3)' }}>
        <rect x="8" y="9" width="22" height="4" rx="2" />
        <rect x="36" y="9" width="42" height="4" rx="2" />
        <rect x="8" y="23" width="22" height="4" rx="2" />
        <rect x="36" y="23" width="34" height="4" rx="2" />
        <rect x="8" y="37" width="22" height="4" rx="2" />
      </g>
      <rect x="36" y="37" width="26" height="4" rx="2" style={{ fill: 'var(--ink-1)' }} />
    </svg>
  );
}

// Decorative: the name and the question sit right beside it as text.
function Thumb({ project }: { project: Project }) {
  let art: ReactNode = null;
  if (project.media === 'rings' || project.media === 'five') art = <Sketch name={project.media} />;
  else if (project.media === 'notion') art = <NotionThumb />;
  else if (project.imageSrc) art = <img src={project.imageSrc} alt="" width={88} height={50} loading="lazy" decoding="async" />;
  return (
    <span className="pi-thumb" aria-hidden="true">
      {art}
    </span>
  );
}

function Row({ project, locale }: { project: Project; locale: Locale }) {
  const key = projectKey(project);
  const question = project.question?.[locale];
  return (
    <li>
      <a className="pi-row" href={sheetHash(key)} data-sheet={key}>
        <Thumb project={project} />
        <span className="pi-text">
          <span className="pi-name">
            {project.name}
            {project.status ? ' ' : null}
            <StatusChip project={project} locale={locale} />
          </span>
          {question && <span className="pi-q">{unbreak(question)}</span>}
        </span>
        <span className="pi-chev" aria-hidden="true">
          <Icon name="caret-right" />
        </span>
      </a>
    </li>
  );
}

export default function ProjectsIndex({ projects, locale }: { projects: Project[]; locale: Locale }) {
  const t = dict[locale];
  const groups = GROUPS.map((g) => ({ ...g, items: projects.filter((p) => p.type === g.type) })).filter((g) => g.items.length > 0);
  if (groups.length === 0) return null;
  // The lead promises "Business first" only when a business row exists (WorkDeck's finding 7).
  const hasBusiness = groups.some((g) => g.type === 'business');

  return (
    <section id="work" className="section wrap" aria-labelledby="work-h">
      <Reveal as="header">
        <h2 id="work-h" className="t-h2" tabIndex={-1}>
          <ThaiText text={t.deckHeading} />
        </h2>
        <p className="t-lead">
          <ThaiText text={hasBusiness ? t.deckSubtitle : t.deckSubtitleBuildOnly} />
        </p>
      </Reveal>
      <div className="pi-cols">
        {groups.map((g, gi) => (
          <section key={g.type} aria-labelledby={g.labelId}>
            <h3 id={g.labelId} className="pi-label">
              {t[g.labelKey]}
            </h3>
            <ul className="pi-rows">
              {g.items.map((p) => (
                <Row key={p.id} project={p} locale={locale} />
              ))}
              {/* The way from the plays to the day job (By day, P3), at the foot of the first column. */}
              {gi === 0 && (
                <li>
                  <a className="pi-door" href="#story">
                    {t.workDoor}
                  </a>
                </li>
              )}
            </ul>
          </section>
        ))}
      </div>
      <ProjectSheet projects={projects} locale={locale} />
    </section>
  );
}
```

(`projects-index.css` lives in `src/components/`, one level above `sections/`, next to the other component CSS files.)

- [ ] **Step 4: Run and pass** — `npx vitest run tests/projects-index.test.tsx tests/p2-css.test.ts` → all pass. `npx tsc --noEmit && npx eslint src/components/sections/ProjectsIndex.tsx` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/ProjectsIndex.tsx src/components/projects-index.css tests/projects-index.test.tsx tests/p2-css.test.ts
git commit -m "$(cat <<'EOF'
feat(p2): compact projects index -- Business, then Build, rows open sheets

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
)"
```

---

### Task 12: ProjectsIndex replaces WorkDeck on the home page

**Files:** Modify `src/app/[locale]/page.tsx` (import line `import WorkDeck …`; the `<WorkDeck …/>` line; the `<Signature …/>` line from Task 7) · Delete `src/components/sections/WorkDeck.tsx`, `tests/work-deck.test.tsx` (WorkDeck has no CSS file) · Modify `tests/smoke.test.tsx` (lines 79 and 83) · Modify `tests/home-order.test.tsx`
**Interfaces:** Consumes: `ProjectsIndex` (Task 11), `Signature` (Task 7) · Produces: final C7 order for P2's part: `#tour` → `#signature` → `#work`

- [ ] **Step 1: Write the failing test** — append to `tests/home-order.test.tsx`, inside the `describe` block after the existing `it`:

```tsx
  it('puts the projects index directly after the signature, with the new index markup', async () => {
    for (const locale of ['en', 'th'] as const) {
      const html = renderToStaticMarkup(await HomePage(params(locale)));
      const signature = html.indexOf('id="signature"');
      const work = html.indexOf('id="work"');
      // No other top-level section sits between them.
      expect(html.slice(signature + 1, work)).not.toContain('<section id="');
      expect(html).toContain('class="pi-cols"');
      expect(html).toMatch(/href="#work\/gonai" data-sheet="gonai"/);
    }
  });
```

and in `tests/smoke.test.tsx` replace line 79:

```ts
      expect(homeText).toContain(t.selectedProjects); // WorkDeck's eyebrow
```

with

```ts
      expect(homeText).toContain(t.workTypeBusiness); // ProjectsIndex's first group label
```

and line 83:

```ts
      expect(homeText).not.toContain(other.selectedProjects);
```

with

```ts
      expect(homeText).not.toContain(other.workDoor);
```

(If P1 already removed the `selectedProjects` lines, add the two new `expect`s directly after `const homeText = collectText(home);`.)

- [ ] **Step 2: Run it and see it fail** — `npx vitest run tests/home-order.test.tsx tests/smoke.test.tsx` → home-order's new test FAILS: `expected '…' to contain 'class="pi-cols"'`. The edited smoke assertions already pass on WorkDeck (it shows "Business" as a chapter label and has no door); they are there to keep passing after the swap.

- [ ] **Step 3: Implement** — in `src/app/[locale]/page.tsx`:

(a) replace

```tsx
import WorkDeck from '@/components/sections/WorkDeck';
```

with

```tsx
import ProjectsIndex from '@/components/sections/ProjectsIndex';
```

(keep the section imports alphabetical: move the line if needed).

(b) delete the line

```tsx
      <WorkDeck projects={projects} locale={locale} />
```

(c) replace the Task 7 line

```tsx
      <Signature projects={projects} locale={locale} />
```

with

```tsx
      <Signature projects={projects} locale={locale} />
      {/* Business plays, then builds; each row opens its sheet at #work/<key> (ProjectSheet). */}
      <ProjectsIndex projects={projects} locale={locale} />
```

(d) delete the replaced component and its tests:

```bash
git rm src/components/sections/WorkDeck.tsx tests/work-deck.test.tsx
grep -rn "sections/WorkDeck" src tests
```

The grep must print nothing. Leave comment-only mentions of WorkDeck in other files, and leave `TiltCard`, `MaskedHeading`, `SectionLabel`, `ProjectFrame` and `ProjectCard` in place (`/projects` still renders `ProjectCard`; P5's sweep owns leftovers). Record the output of `grep -rln "TiltCard\|MaskedHeading" src` in the task report for P5.

- [ ] **Step 4: Run and pass** — `npx vitest run tests/home-order.test.tsx tests/smoke.test.tsx tests/dictionary.test.ts` → all pass. `npm run check` → tsc, eslint and the whole suite green.

- [ ] **Step 5: Screenshot check** — with `npm run dev` still running: `node /tmp/klao-qa/p2-shots.mjs index` → prints `no problems found` (5 rows per page, every sheet opens from its URL, Back closes a clicked sheet, no horizontal overflow). Open with the Read tool and check:
- `index-en-light-desktop.png`: headline + lead; two columns (Business: Talatify, Tripedia, then the blue By day door; Build: Aje, GoNai, klao-site); thumbnails (rings, five, two screenshots, Notion sketch); monochrome status marks with words; hairlines, no shadows.
- `index-th-dark-phone.png`: one column; Thai questions clamp at two lines; status words ≥ 14 px; no overflow.
- `sheet-gonai-en-light-desktop.png`: window with the `gonai-three.vercel.app` bar on the GoNai wash; green "Open app ↗"; lineage card with both columns.
- `sheet-talatify-th-light-desktop.png` and `sheet-tripedia-en-dark-desktop.png`: line drawings legible in both themes; outcomes list; Tripedia's lineage card.
- `sheet-klao-site-en-light-phone.png`: full-height sheet with the grab handle; Notion vignette and the "within the hour" note; both links wrap without overflow.
- `sheet-aje-th-dark-phone.png`: screenshot window, Thai text sizes ≥ 14 px, close button reachable at the top right.

- [ ] **Step 6: Commit**

```bash
git add "src/app/[locale]/page.tsx" tests/smoke.test.tsx tests/home-order.test.tsx
git commit -m "$(cat <<'EOF'
feat(p2): the projects index replaces WorkDeck, right after the signature

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
)"
```

(`git rm` in Step 3 already staged the two deletions; they go into this commit.)

---

### Task 13: P2 gate

**Files:** none changed (verification only; fix-ups go back to the task that owns the file)
**Interfaces:** Consumes: everything above · Produces: a green phase and a reviewed screenshot set in `/tmp/klao-qa/p2/`

- [ ] **Step 1: Checks** — `npm run check` → tsc exit 0, eslint no errors and no new warnings in P2 files, vitest all green (the suite count is P1's count − the deleted `work-deck` tests + the new P2 tests).

- [ ] **Step 2: Build** — `npm run build` → `✓ Compiled successfully`, `/[locale]` still listed as static (● SSG/ISR), no dynamic-route warning for the home page.

- [ ] **Step 3: Grep checks** (each must print exactly what is stated):

```bash
grep -rn "sections/WorkDeck" src tests                         # nothing
grep -rln "animation-timeline" src                             # only src/components/signature.css
grep -rlni "1c7a57" src                                        # only signature.css and project-sheet.css
grep -rniE "instant|immediately|ทันที" src/lib/sheet-url.ts src/lib/project-view.ts src/lib/signature.ts src/components/SignatureScene.tsx src/components/ProjectSheet.tsx src/components/StatusChip.tsx src/components/sections/Signature.tsx src/components/sections/ProjectsIndex.tsx src/components/signature.css src/components/project-sheet.css src/components/projects-index.css src/components/status-chip.css   # nothing
grep -rniE "aisecretary|dailybrief" src public tests            # nothing
```

and prove every new UI string is prototype copy (prints nothing):

```bash
for s in "The idea, then the app." "Tripedia made the final 30 of 500 teams in 2022. Four years later, GoNai is that idea, built and live." "2022 · Tripedia · Co-founder" "final teams · KATALYST Startup Launchpad" "Four years. The idea stayed." "Same question, now with the tools to build the answer alone." "By day: one retail-media deal, from first meeting to a network that runs itself ›" "What it is" "What came of it" "Built with" "Edit this row in Notion, and this page follows within the hour." "Same idea, four years apart." "A business plan (market sizing, revenue model)" "Solo, with Claude" "Live since Aug 2026" "ไอเดียมาก่อน แล้วค่อยเป็นแอป" "สี่ปีต่อมา ไอเดียยังอยู่" "งานกลางวัน: ดีลสื่อในร้านหนึ่งดีล ตั้งแต่นัดแรกจนเครือข่ายเดินเองได้ ›" "แก้แถวนี้ใน Notion แล้วหน้านี้จะตามภายในหนึ่งชั่วโมง" "ไอเดียเดียวกัน ห่างกันสี่ปี" "สร้างเอง"; do grep -qF "$s" design/white-edition/prototype/index.html || echo "NOT IN PROTOTYPE: $s"; done
```

- [ ] **Step 4: Screenshots** — with `npm run dev` running: `node /tmp/klao-qa/p2-shots.mjs all` → `no problems found` (0 console errors, 0 page errors, 0 horizontal overflow, signature pinned with motion and static under reduced motion, 5 rows, every sheet opens from its URL, Back closes). Review with the Read tool, at minimum: `sig-{en,th}-{light,dark}-desktop-p{0,045,06,1}.png`, `sig-en-light-phone-p{0,1}.png`, `sig-reduced-{en,th}-{desktop,phone}.png`, `sig-fallback-en-p{045,1}.png`, `index-{en,th}-{light,dark}-{desktop,phone}.png`, and for each of the five keys `sheet-<key>-en-light-desktop.png` and `sheet-<key>-th-dark-phone.png`. Pass criteria: the Task 7 and Task 12 checklists; no Thai word broken mid-word in headings; no text under 14 px on phone; GoNai green nowhere except the pin face, the signature's Open app and GoNai's sheet button; dark mode has no white panels except screenshots and the Notion vignette. Stop the dev server afterwards (`lsof -ti tcp:3000 | xargs kill`).

- [ ] **Step 5: Status** — `git status --short` → clean (the screenshots and the script live in `/tmp/klao-qa/`, not the repo). Report to Klao: what shipped, what was verified (commands above + screenshot set), and the open items below. No push, no merge, no Notion change at this gate.

---

## Contract gaps and assumptions

1. **`Sketch` (C4) has no size or locale input.** Index thumbnails render the full `'rings'`/`'five'` drawing scaled into 88×50 (the prototype used label-free small variants), and the rings drawing's "Method, not to scale." text cannot switch to Thai. Recommendation for P0: `Sketch` accepts `small?: boolean` (label-free thumbnail geometry) and `locale?: Locale`; P2's `Thumb` would then pass `small`. The sheet's accessible text is unaffected (it uses the row's `AltEN/TH`).
2. **C9 has no pill-glass variant.** Signature captions use `.glass` (nav alpha .78, blur 20) instead of the prototype's `.glass.pill` (.80, blur 16).
3. **C1 has no `--raised`, `--e4`, `--curtain`, `--shot-dim`.** The sheet uses `--card`, `--e3`, a `color-mix` of `--mist` for the backdrop, and screenshots are not dimmed in dark mode.
4. **C9 names `.t-title` (28/32) for sheet titles; the prototype's sheet name is 40/44 (phone 32/36).** P2 follows the prototype with its own `.sheet-name`.
5. **Assumed export shapes** (not spelled out in C3/C4/C9): `import ThaiText from '@/components/ThaiText'` (default) and `import { Icon } from '@/components/icons'` (P1's plan imports them the same way); `import { Sketch } from '@/components/sketches'` and P0's `Reveal` keeping its `as` and `className` props are still assumptions (no P0 plan to check against). `slugKey` lowercases (`'GoNai'` → `'gonai'`, confirmed in P1). If any differs, only the import lines change.
6. **New interfaces other phases can use:** `src/lib/project-view.ts` (`statusMark`, `washVar`, `unbreak`, `hostOf`, `lineageFor`, `findLineage`, `Lineage`), `src/lib/signature.ts` (`SIG_YEARS`, …), `StatusChip`, the dictionary keys in Task 3. Other islands open a sheet without a custom event: `<a href={sheetHash(key)} data-sheet={key}>` (intercepted, focus returns to the link on close), a plain `<a href="/<locale>#work/<key>">` (P4's link grammar — fragment navigation fires `hashchange`, covered by the "another island can open a sheet by assigning location.hash" test), or `location.hash = sheetHash(key)` (⌘K). Checked against the P1/P3/P4/P5 plans as written on 2026-09-25: P1's `slugKey`, `#top`/`#tour`, C5 fields and fixtures (GoNai `lineageOf: "fx-tripedia"`) match; P3's ByDay is `#story`; P5's QA probes `#work/`, `#work/unknown`, `#work/GoNai`.
7. **Lineage copy lives in code.** `sigSub`, `sigCardKicker` and the lineage card's "What existed / Team / Result" rows are prototype UI copy that names Tripedia and GoNai; they are dictionary strings, not Notion fields. If the idea → app pair ever changes in Notion, this copy needs a code change (the question row, names, links and images follow Notion).

## Risks

- **klao-site's sheet shows "Open app ↗" and "View code ↗"** (it has both LiveURL and RepoURL); the prototype shows only "View code". Clearing klao-site's LiveURL in Notion would match the prototype but also changes anything else that reads it — Klao's call.
- **The By day door (`#story`) is inert until P3** adds the By day section.
- **Prototype sheet extras left out of this scope:** Previous/Next and "Same principle, by day ›" in the sheet footer, and ←/→ keys between sheets.
- **Firefox's fallback is only simulated in Chrome** (the `sig-fallback-*` shots); the real Firefox and Safari passes are P6's manual check.
- **`/projects` loses its link from the home page** (WorkDeck's "All projects" pill goes away with it); the route still works and stays in the sitemap.
- **TH copy CHANGED for `workTypeBuild` and `deckSubtitle`** also changes the `/projects` page labels (same dictionary keys).
