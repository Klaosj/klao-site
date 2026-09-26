# White Edition — P3 Career band + By day Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dark About, Craft, CV and Skills bands with the white Career band (time rail, employer pills with a sliding detent, role panel, one-row toolbox) and the By day section (prologue, six method chapters, closing line), backed by new Career/Profile fields and a new Story database with fixtures.

**Architecture:** Content first: `CareerEntry`, `Profile` and a new `StoryChapter` gain their C5 fields, mappers that tolerate pre-migration Notion, fixtures carrying the prototype copy, and `getStory()` (fixtures whenever `NOTION_DB_STORY` is unset). Pure helpers in `src/lib/career.ts` (dates, rail geometry, deep-link keys, toolbox grouping) and `src/lib/bold.ts` keep the components thin. `CareerBand` and `ByDay` are server components; the only client island is `CareerDetent` (pills, detent, panel, keyboard, `klao:career`), which gets the current month from the server so hydration never disagrees.

**Tech Stack:** Next.js 15.5 App Router (ISR 1 h) · React 19.2 · Tailwind v4.3 + plain component CSS · @notionhq/client · Vitest 3 + Testing Library (jsdom per file) · Playwright via the cached `npx` install for screenshots only.

**Spec:** docs/superpowers/specs/2026-09-25-white-edition-design.md · Master plan (contracts, global constraints): docs/superpowers/plans/2026-09-25-white-edition.md

## Global Constraints

Inherits every line of the master plan's Global Constraints. Phase-specific additions:

- Only `transform` and `opacity` animate in P3 CSS: the detent, the rail marker and the panel swap. Pill text colour changes without a transition (the prototype faded it; the global constraint wins).
- The detent is a kram surface (spec §5.1 "kram … primary button, detent"); selected-pill text uses `--on-kram`. Rail segments and the marker stay `--ink-1` as in the prototype.
- "Now" is computed once on the server as a Bangkok `'YYYY-MM'` (`currentYm()`) and passed to `CareerDetent` as a prop. No client-side `new Date()` in P3 code.
- Notion body copy with `**bold**` renders through `splitBold` → React `<strong>`. No `dangerouslySetInnerHTML` in any P3 file.
- Fixed DOM ids: `career`, `career-h`, `career-panel`, `career-tab-<index>`, `toolbox` (inside `#career`), `story`, `story-h`. Other phases (P4 FAQ links, ⌘K) may rely on them.
- Every Thai-capable string goes through `ThaiText` (C3), directly or via `BoldText`.
- Phone text in P3 CSS is ≥ 14 px; tap targets (pills, links, buttons) are ≥ 44 px tall.
- Career keys are always `slugKey(company)` (C5): computed in the mapper and pinned in the fixture by a parity test. Never hand-typed in a component.
- Icon/Sketch names coming from Notion are free text: only names in `STORY_ICONS` / `STORY_SKETCHES` render. A typo drops the icon, never the chapter.

## Review Focus

Master Review Focus lines this phase owns:

1. **Pre-migration Notion (Career, Profile, Story).** A Career row with only the old properties maps to `key` + `start: null, end: null, figure: null` (Task 1). A Profile row without Prologue/ClosingLine maps to nulls (Task 3). A Story row with only `TitleEN` maps with empty defaults (Task 4). `getStory()` with `NOTION_TOKEN` set and `NOTION_DB_STORY` unset returns the fixtures without calling Notion (Task 5). `CareerDetent` renders undated entries with their `period` text and no rail (Task 8). `ByDay` falls back to the headline for the closing line and omits the story paragraph and an empty chapter list (Task 12).
4. **No JavaScript / before hydration.** `CareerBand` server HTML carries the heading, the résumé line, the first role's full panel and the toolbox, with no inline `opacity:0` (Task 9). `ByDay` server HTML carries all six chapters, the phase strip and the closing line, with no inline `opacity:0` (Task 12).

P3 additions (inputs the spec implies that would otherwise go untested):

- **Deep-link keys.** `klao:career` with an exact key, a prototype-style compact key (`abundance`), a live-Notion long name (`a-bun-dance-craft-burger` ← `abundance`), an unknown key or no `detail` selects the right pill or does nothing, and never throws (Task 6 `findCareerIndex`, Task 8 event tests).
- **Month rollover.** Durations come from the server-supplied `now`; Bangkok vs UTC month boundaries are handled (Task 6 `currentYm`, Task 8 `now` prop test).
- **Notion free text in selects.** Unknown `Icon`/`Sketch` values render the chapter without the icon or sketch (Task 12).
- **Unsafe or unbalanced body markup.** HTML-looking text renders as text; an unclosed `**` stays literal (Task 11, Task 12).

---

## Before you start (prerequisites from P0–P2)

Run these on `feat/white-edition` and confirm each expectation. The **names** are fixed by the contracts; if an export's **form** differs (default vs named), use the form you find in every import this plan writes.

```bash
git branch --show-current                               # feat/white-edition
npm run check                                           # green before P3 starts
grep -n "export function slugKey" src/lib/format.ts     # export function slugKey(s: string): string
grep -n "^export" src/components/icons.tsx src/components/sketches.tsx src/components/ThaiText.tsx src/components/motion/Reveal.tsx
#   icons.tsx     → export function Icon … / export type IconName …   (named)
#   sketches.tsx  → export function Sketch … / export type SketchName … (named)
#   ThaiText.tsx  → export default function ThaiText …                  (default)
#   Reveal.tsx    → export default function Reveal … (props: children, as?, className?, delayIndex?)
grep -n "SketchName" src/components/sketches.tsx         # note the five names P0 gave the prototype's SK[0..4]
grep -nE "\.(band|section|wrap|t-h2|t-panel|t-stat|t-title|t-eyebrow|t-lead|rv)\b|--(spine|kram|on-kram|ease-settle|dur-ui)\b" src/app/globals.css | head -40
grep -rn 'id="work"' src/components | head -3            # P2's ProjectsIndex section exists
grep -rn 'id="top"' src/components | head -3             # P1's hero anchor exists (By day links back to it)
```

**Sketch names.** C4 does not name the prototype's `SK` entries. This plan assumes P0 named them, in order, `room` (01 room + NDA), `cases` (02 low/base/high), `formats` (03 shelf strip / archway / e-paper), `rollout` (04 route to shopfront), `handover` (05 key BD → Ops). If P0 chose other names, use P0's names (same order) in Task 4's `STORY_SKETCHES` and `story.json`. Task 4's `satisfies readonly SketchName[]` and its render test fail loudly until they match.

## Files

| Path | Responsibility | Task |
|---|---|---|
| `src/lib/models.ts` | `CareerFigure`; `CareerEntry.key/start/end/figure`; `Profile.prologue/closingLine`; `StoryChapter` | 1, 3, 4 |
| `src/lib/notion-mappers.ts` | `yearMonth` reader; `mapCareerEntry` new fields; `mapProfile` new fields; `mapStoryChapter` | 1, 3, 4 |
| `src/lib/notion.ts` | `'STORY'` DB id; `fetchStory()` | 5 |
| `src/lib/content.ts` | `getStory()` (fixtures when `NOTION_DB_STORY` unset) | 5 |
| `src/content/fixtures/career.json` | Prototype `CAREER` roles, dates, figures, wins | 2 |
| `src/content/fixtures/profile.json` | `prologue`, `closingLine`; "Actmedia" spelling | 3 |
| `src/content/fixtures/story.json` | Prototype `CH` + `RULES`, six chapters | 4 |
| `src/lib/story.ts` | `STORY_ICONS`, `STORY_SKETCHES`, guards | 4 |
| `src/lib/career.ts` | `CAREER_EVENT`, month maths, date labels, rail geometry, key lookup, figure split, toolbox columns | 6 |
| `src/lib/dictionary.ts` | P3 UI strings (EN/TH); dead band keys removed | 7, 10, 13 |
| `src/components/CareerDetent.tsx` | Client island: rail, pills + detent, panel, keyboard, `klao:career` | 8 |
| `src/components/career.css` | Career band styles (`car-*`) | 8 |
| `src/components/sections/CareerBand.tsx` | Server section `#career`: head, `CareerDetent`, `#toolbox` | 9 |
| `src/lib/bold.ts` · `src/components/BoldText.tsx` | `**bold**` → `<strong>` safely, Thai keep-runs per segment | 11 |
| `src/components/sections/ByDay.tsx` · `src/components/by-day.css` | Server section `#story` | 12 |
| `src/app/[locale]/page.tsx` · `next.config.ts` | Wiring (C7 order) · `/career` → `#career` | 10, 13 |
| Deleted | `CvBand.tsx`, `SkillsBand.tsx`, `skill-icons.tsx`, `AboutBand.tsx`, `CraftBand.tsx` (+ `SpotlightList` if orphaned) and their tests | 10, 13 |
| Tests | `mappers`, `career-story-fixtures`, `notion-story`, `content-story`, `career-lib`, `dictionary`, `career-detent`, `career-band`, `next-config`, `smoke`, `bold-text`, `by-day`, `bands` (rewritten) | all |

---

### Task 1: Career model and mapper: key, dates, figure

**Files:**
- Modify: `src/lib/models.ts` (the `CareerEntry` interface, lines 89–102 before P0–P2; find it by name)
- Modify: `src/lib/notion-mappers.ts` (imports at line 1–2; reader helpers lines 6–25; `mapCareerEntry` lines 62–78 before P0–P2)
- Test: `tests/mappers.test.ts` (modify the existing career test; add a describe block)
- Modify: `tests/cv-band.test.tsx` (lines 23–40: two `CareerEntry` literals gain the new fields so `tsc` stays green until Task 10 deletes the file)

**Interfaces:**
- Consumes: `slugKey(s: string): string` from `src/lib/format.ts` (P1, C5).
- Produces:
  ```ts
  export interface CareerFigure { value: string; label: Localized; note: Localized | null }
  // CareerEntry gains:
  key: string; start: string | null; end: string | null; figure: CareerFigure | null;
  ```
  Notion Career properties read: `StartDate`, `EndDate` (date), `FigureValue`, `FigureLabelEN/TH`, `FigureNoteEN/TH` (rich text). `start`/`end` are `'YYYY-MM'` (first 7 chars of `date.start`, validated), else `null`. `figure` is `null` when `FigureValue` is empty; `note` is `null` when `FigureNoteEN` is empty; `label` falls back th → en.

- [ ] **Step 1: Write the failing test**

In `tests/mappers.test.ts`, change the import lines at the top to:

```ts
import { describe, it, expect, vi } from 'vitest';
import { mapProject, mapCareerEntry, mapProfile, mapSkill, mapQuestion } from '@/lib/notion-mappers';
import { slugKey } from '@/lib/format';
```

In the test `'maps wins as newline-split bullets with TH fallback'`, the expected object ends with `order: 1,`. Add four lines after it so that part reads:

```ts
      wins: { en: ['Win one', 'Win two'], th: ['Win one', 'Win two'] },
      order: 1,
      // White Edition P3: this page has none of the new properties -- it
      // stands for the live Career DB before migration, which must still map.
      key: 'actmedia',
      start: null,
      end: null,
      figure: null,
    });
```

Then add this block directly after the closing `});` of `describe('mapCareerEntry', …)`:

```ts
describe('mapCareerEntry — White Edition fields (P3)', () => {
  const full = {
    id: 'c2',
    properties: {
      Role: title('Brand Representative'),
      RoleTH: rich('ตัวแทนแบรนด์'),
      Company: rich('Casetify'),
      Period: rich('MAY 2024 – MAR 2026'),
      StartDate: { date: { start: '2024-05-01', end: null } },
      // Notion's "Include time" toggle yields a timestamp; only the month matters.
      EndDate: { date: { start: '2026-03-31T18:00:00.000+07:00', end: null } },
      FigureValue: rich('THB 1.1M'),
      FigureLabelEN: rich('My personal monthly sales target'),
      FigureLabelTH: rich('เป้ายอดขายส่วนตัวต่อเดือน'),
      FigureNoteEN: rich('Target met'),
      FigureNoteTH: rich('ทำถึงเป้า'),
      WinsEN: rich('Ran the store on shift'),
      WinsTH: rich(''),
      Order: { number: 2 },
    },
  };

  it('maps a full row: slug key, YYYY-MM dates, figure with label and note', () => {
    expect(mapCareerEntry(full)).toMatchObject({
      key: 'casetify',
      start: '2024-05',
      end: '2026-03',
      figure: {
        value: 'THB 1.1M',
        label: { en: 'My personal monthly sales target', th: 'เป้ายอดขายส่วนตัวต่อเดือน' },
        note: { en: 'Target met', th: 'ทำถึงเป้า' },
      },
    });
  });

  it('derives the key from the company with slugKey (FAQ links use career:<key>)', () => {
    const page = { ...full, properties: { ...full.properties, Company: rich('A Bun Dance') } };
    expect(mapCareerEntry(page)!.key).toBe(slugKey('A Bun Dance'));
  });

  it('maps a pre-migration row (no StartDate/EndDate/Figure*) to null dates and no figure', () => {
    // `careerPage` (above) carries only the properties the Career DB had
    // before the White Edition -- it must map, not skip (master Review Focus #1).
    expect(mapCareerEntry(careerPage)).toMatchObject({ key: 'actmedia', start: null, end: null, figure: null });
  });

  it('treats an empty or malformed date as absent', () => {
    const page = {
      ...full,
      properties: { ...full.properties, StartDate: { date: null }, EndDate: { date: { start: '26-3' } } },
    };
    expect(mapCareerEntry(page)).toMatchObject({ start: null, end: null });
  });

  it('has no figure when FigureValue is empty, even if its labels are filled', () => {
    const page = { ...full, properties: { ...full.properties, FigureValue: rich('') } };
    expect(mapCareerEntry(page)!.figure).toBeNull();
  });

  it('keeps the figure without a note when FigureNoteEN is empty; the label falls back th -> en', () => {
    const page = { ...full, properties: { ...full.properties, FigureNoteEN: rich(''), FigureLabelTH: rich('') } };
    expect(mapCareerEntry(page)!.figure).toEqual({
      value: 'THB 1.1M',
      label: { en: 'My personal monthly sales target', th: 'My personal monthly sales target' },
      note: null,
    });
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/mappers.test.ts`
Expected: FAIL — `maps wins as newline-split bullets…` (missing `key`/`start`/`end`/`figure`) and the six new tests (`key` undefined).

- [ ] **Step 3: Implement**

In `src/lib/models.ts`, insert this interface directly above `export interface CareerEntry {`:

```ts
// White Edition P3 (C5): the one big number a role's panel may carry (spec
// §6: big numerals only for 30 / 500 and the Career panel figures). `value`
// is shown as typed ("THB 1.1M", "~35%") -- Notion has a single
// FigureValue, so it is the same string in both locales. `label` says what
// the number is; `note` is the short verdict next to it ("Target met"),
// null when FigureNoteEN is empty.
export interface CareerFigure {
  value: string;
  label: Localized;
  note: Localized | null;
}
```

and inside `CareerEntry`, after `order: number;`, add:

```ts
  // White Edition P3 (C5, spec §7 Career). `key` is slugKey(company): the
  // stable handle FAQ deep links (`career:<key>`) and the ⌘K palette use to
  // open this role's pill. start/end are 'YYYY-MM' from Notion's StartDate /
  // EndDate date properties, null when the property is absent -- a Career
  // database from before the migration still maps, and the band falls back
  // to `period` and draws no rail. A dated role with end null is "now".
  key: string;
  start: string | null;
  end: string | null;
  figure: CareerFigure | null;
```

In `src/lib/notion-mappers.ts`, add the import below the existing two import lines:

```ts
import { slugKey } from './format';
```

Inside the first `/* eslint-disable @typescript-eslint/no-explicit-any */` block, directly after `const selectOf = …;`, add:

```ts
// Career StartDate/EndDate are Notion Date properties. Only the month is
// used ('YYYY-MM'), so a timestamp from the "Include time" toggle and a
// plain date read the same. Anything else -- empty, null, a typo -- is
// "no date", never a crash (pre-migration rows have no such property).
const yearMonth = (prop: any): string | null => {
  const start = prop?.date?.start;
  if (typeof start !== 'string') return null;
  const ym = start.slice(0, 7);
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(ym) ? ym : null;
};
```

Replace the whole `mapCareerEntry` function with:

```ts
export function mapCareerEntry(page: NotionPage): CareerEntry | null {
  const role = text(page.properties.Role);
  // Still gated on the English `Role` alone, so a Career database that has
  // never heard of `RoleTH` maps exactly as it did before. `localized` falls
  // back th -> en, which makes the Thai title purely additive.
  if (!role) return skip('Career', page, 'missing Role');
  const winsEn = lines(text(page.properties.WinsEN));
  const winsTh = lines(text(page.properties.WinsTH));
  const company = text(page.properties.Company);
  // White Edition P3: every new property is optional, same additive
  // treatment as RoleTH -- a missing FigureValue means "no figure", a
  // missing FigureNoteEN means "no note", missing dates mean null.
  const figureValue = text(page.properties.FigureValue);
  const noteEn = text(page.properties.FigureNoteEN);
  return {
    id: page.id,
    role: localized(role, text(page.properties.RoleTH)),
    company,
    period: text(page.properties.Period),
    wins: { en: winsEn, th: winsTh.length ? winsTh : [...winsEn] },
    order: num(page.properties.Order),
    key: slugKey(company),
    start: yearMonth(page.properties.StartDate),
    end: yearMonth(page.properties.EndDate),
    figure: figureValue
      ? {
          value: figureValue,
          label: localized(text(page.properties.FigureLabelEN), text(page.properties.FigureLabelTH)),
          note: noteEn ? localized(noteEn, text(page.properties.FigureNoteTH)) : null,
        }
      : null,
  };
}
```

In `tests/cv-band.test.tsx`, give both literals in `const entries: CareerEntry[]` the new fields (after each `order:` line):

```ts
    order: 1,
    key: 'acme',
    start: null,
    end: null,
    figure: null,
  },
```

```ts
    order: 2,
    key: 'globex',
    start: null,
    end: null,
    figure: null,
  },
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/mappers.test.ts tests/cv-band.test.tsx && npx tsc --noEmit`
Expected: PASS; `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/models.ts src/lib/notion-mappers.ts tests/mappers.test.ts tests/cv-band.test.tsx
git commit -m "feat(content): career key, YYYY-MM dates and panel figure (P3)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 2: Career fixtures from the prototype

**Files:**
- Modify (full rewrite): `src/content/fixtures/career.json`
- Create: `tests/career-story-fixtures.test.tsx`

**Interfaces:**
- Consumes: `CareerEntry` (Task 1), `slugKey` (P1), `getCareer()` (existing).
- Produces: five fixture rows in newest-first `order`, keys `actmedia`, `casetify`, `mmb-technology`, `vela-central-world`, `a-bun-dance`; figures on Casetify (`THB 1.1M`) and A Bun Dance (`~35%`). Copy is the prototype `CAREER` constant verbatim (wins = `b`, figure label = `lead.cap`, figure note = `lead.lab`). `period` keeps the existing hand-typed strings for `/career`.

- [ ] **Step 1: Write the failing test**

Create `tests/career-story-fixtures.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import careerFixture from '@/content/fixtures/career.json';
import { getCareer } from '@/lib/content';
import { slugKey } from '@/lib/format';
import type { CareerEntry } from '@/lib/models';

// Two-layer rule (master Global Constraints): the fixtures are what the site
// renders without Notion, so they must carry every field the mapper
// produces. A JSON import is only *cast* to CareerEntry[], so tsc cannot see
// a missing key here -- these tests can.
describe('career fixture (P3 fields, prototype copy)', () => {
  const FIELDS = ['company', 'end', 'figure', 'id', 'key', 'order', 'period', 'role', 'start', 'wins'];

  it('carries every CareerEntry field on every row', () => {
    for (const row of careerFixture as Record<string, unknown>[]) {
      expect(Object.keys(row).sort()).toEqual(FIELDS);
    }
  });

  it('derives each key from the company exactly as the Notion mapper does', () => {
    for (const entry of careerFixture as CareerEntry[]) expect(entry.key).toBe(slugKey(entry.company));
  });

  it('lists the five prototype roles newest first, with valid YYYY-MM dates', async () => {
    const career = await getCareer();
    expect(career.map((e) => e.company)).toEqual([
      'Actmedia',
      'Casetify',
      'MMB Technology',
      'VELA Central World',
      'A Bun Dance',
    ]);
    for (const e of career) {
      expect(e.start).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
      if (e.end !== null) expect(e.end).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
    }
    expect(career[0].end).toBeNull();
  });

  it('labels THB 1.1M as his personal monthly target, noted "Target met" (spec decision, 24 Sep)', async () => {
    const casetify = (await getCareer()).find((e) => e.key === 'casetify');
    expect(casetify?.figure?.value).toBe('THB 1.1M');
    expect(casetify?.figure?.label.en.startsWith('My personal monthly sales target')).toBe(true);
    expect(casetify?.figure?.note).toEqual({ en: 'Target met', th: 'ทำถึงเป้า' });
    // The old fixture called it the store's target; that framing is retired.
    expect(JSON.stringify(careerFixture)).not.toMatch(/store(’|')s THB 1\.1M/);
  });

  it('spells Actmedia the approved way', () => {
    expect(JSON.stringify(careerFixture)).not.toContain('ActMedia');
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/career-story-fixtures.test.tsx`
Expected: FAIL — rows lack `key/start/end/figure`; companies are the old names; the old Casetify bullet still says "store’s THB 1.1M".

- [ ] **Step 3: Implement**

Replace the whole of `src/content/fixtures/career.json` with:

```json
[
  {
    "id": "fx-actmedia",
    "key": "actmedia",
    "role": {
      "en": "Senior Business Development",
      "th": "นักพัฒนาธุรกิจอาวุโส"
    },
    "company": "Actmedia",
    "period": "MAR 2026 – Present",
    "start": "2026-03",
    "end": null,
    "figure": null,
    "wins": {
      "en": [
        "Found 3–4 new channel opportunities with Modern Trade retailers, now in active discussion, from first contact to partnership structure and negotiation.",
        "Project-manage 4 live rollouts across retailer, supplier and internal teams. The largest, a nationwide in-store screen installation, is about two-thirds complete and on track to the contract."
      ],
      "th": [
        "หาโอกาส channel ใหม่ 3–4 รายกับค้าปลีก Modern Trade ตอนนี้อยู่ระหว่างเจรจา ดูแลตั้งแต่ติดต่อครั้งแรก วางโครงสร้างพาร์ตเนอร์ชิป จนถึงเจรจาต่อรอง",
        "เป็น project manager คุมโปรเจกต์ที่รันอยู่ 4 โปรเจกต์ ประสานทั้งค้าปลีก ซัพพลายเออร์ และทีมภายใน โปรเจกต์ใหญ่สุดคือติดตั้งจอในร้านทั่วประเทศ ตอนนี้เสร็จราวสองในสามและเดินตามสัญญา"
      ]
    },
    "order": 1
  },
  {
    "id": "fx-casetify",
    "key": "casetify",
    "role": {
      "en": "Brand Representative",
      "th": "ตัวแทนแบรนด์"
    },
    "company": "Casetify",
    "period": "MAY 2024 – MAR 2026",
    "start": "2024-05",
    "end": "2026-03",
    "figure": {
      "value": "THB 1.1M",
      "label": {
        "en": "My personal monthly sales target, met as the normal standard, while keeping the whole team’s numbers steady.",
        "th": "เป้ายอดขายส่วนตัวต่อเดือน ทำถึงเป็นมาตรฐานปกติ พร้อมคุมตัวเลขของทั้งทีมให้นิ่ง"
      },
      "note": {
        "en": "Target met",
        "th": "ทำถึงเป้า"
      }
    },
    "wins": {
      "en": [
        "Key person running the store on shift: floor process, service standards, escalations, and coaching junior staff on how to close.",
        "Used store data (9.7K daily visitors, 99.7 avg daily transactions, THB 3.42K average basket) to plan floor tactics, staffing and peak-hour cover."
      ],
      "th": [
        "เป็นคนหลักที่รันร้านในกะ ทั้งกระบวนการหน้าร้าน มาตรฐานบริการ รับมือปัญหา และสอนน้องในทีมว่าจะปิดการขายยังไง",
        "ใช้ข้อมูลร้าน (ผู้เข้าร้าน 9.7 พันคน/วัน 99.7 บิล/วัน ตะกร้าเฉลี่ย 3.42 พันบาท) วางแผนกลยุทธ์หน้าร้าน กำลังคน และช่วงเวลาคนเยอะ"
      ]
    },
    "order": 2
  },
  {
    "id": "fx-mmb",
    "key": "mmb-technology",
    "role": {
      "en": "Sales Coordinator",
      "th": "ผู้ประสานงานขาย"
    },
    "company": "MMB Technology",
    "period": "AUG 2023 – DEC 2023",
    "start": "2023-08",
    "end": "2023-12",
    "figure": null,
    "wins": {
      "en": [
        "Handled the paperwork between the sales team and clients (quotations, purchase orders, delivery notes) and followed up on orders, payments and delivery dates.",
        "Kept customer and pipeline records in the CRM, booked client meetings and prepared sales materials for the team."
      ],
      "th": [
        "ดูแลเอกสารระหว่างทีมขายกับลูกค้า ทั้งใบเสนอราคา ใบสั่งซื้อ ใบส่งของ และติดตามคำสั่งซื้อ การชำระเงิน และกำหนดส่ง",
        "เก็บข้อมูลลูกค้าและ pipeline ใน CRM นัดประชุมลูกค้า และเตรียมเอกสารขายให้ทีม"
      ]
    },
    "order": 3
  },
  {
    "id": "fx-vela",
    "key": "vela-central-world",
    "role": {
      "en": "Senior Barista",
      "th": "บาริสต้าอาวุโส"
    },
    "company": "VELA Central World",
    "period": "APR 2023 – AUG 2023",
    "start": "2023-04",
    "end": "2023-08",
    "figure": null,
    "wins": {
      "en": [
        "Led and coached the junior barista team, and helped build a floor people wanted to work on.",
        "Held brew quality to one consistent standard across the bar.",
        "Stepped onto the bar whenever the team was overwhelmed or short-handed.",
        "Worked the counter directly: service that turned first visits into regulars."
      ],
      "th": [
        "ดูแลและสอนงานทีมบาริสต้ารุ่นน้อง และช่วยสร้างบรรยากาศการทำงานที่ดี",
        "คุมคุณภาพกาแฟทุกแก้วให้ได้มาตรฐานเดียวกัน",
        "เข้าไปช่วยหน้าบาร์ทุกครั้งที่ทีมล้นมือหรือคนไม่พอ",
        "ดูแลลูกค้าหน้าร้านเอง จนลูกค้าใหม่กลายเป็นลูกค้าประจำ"
      ]
    },
    "order": 4
  },
  {
    "id": "fx-abundance",
    "key": "a-bun-dance",
    "role": {
      "en": "Founder",
      "th": "ผู้ก่อตั้ง"
    },
    "company": "A Bun Dance",
    "period": "MAY 2021 – DEC 2022",
    "start": "2021-05",
    "end": "2022-12",
    "figure": {
      "value": "~35%",
      "label": {
        "en": "Held gross profit at ~35% per unit through recipe costing, ingredient sourcing and portion control.",
        "th": "คุมกำไรขั้นต้นที่ ~35% ต่อชิ้น ด้วยการคิดต้นทุนสูตร การหาวัตถุดิบ และการคุมปริมาณ"
      },
      "note": {
        "en": "Gross profit per unit",
        "th": "กำไรขั้นต้นต่อชิ้น"
      }
    },
    "wins": {
      "en": [
        "Founded and ran a student-targeted craft burger shop for 20 months: product and R&D, pricing, marketing, cost control, staff and customer experience.",
        "Managed 6–8 part-time staff on rotating shifts: scheduling, training and daily service standards.",
        "Got customers through university networks, the student union and café partnerships, a local channel with no paid media."
      ],
      "th": [
        "ก่อตั้งและทำร้านเบอร์เกอร์คราฟต์สำหรับนักศึกษาอยู่ 20 เดือน ทั้งสินค้าและ R&D การตั้งราคา การตลาด คุมต้นทุน พนักงาน และประสบการณ์ลูกค้า",
        "ดูแลพนักงานพาร์ทไทม์ 6–8 คนแบบเวียนกะ ทั้งจัดตาราง อบรม และมาตรฐานบริการประจำวัน",
        "หาลูกค้าผ่านเครือข่ายมหาวิทยาลัย สโมสรนักศึกษา และพาร์ตเนอร์ร้านกาแฟ เป็นช่องทางท้องถิ่นที่ไม่ใช้สื่อโฆษณาเลย"
      ]
    },
    "order": 5
  }
]
```

If `slugKey` (P1) does not produce these five keys (the parity test tells you), set each `key` to `slugKey(company)`'s actual output. Do not change `slugKey`.

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/career-story-fixtures.test.tsx tests/content.test.ts tests/career-resume.test.tsx tests/smoke.test.tsx`
Expected: PASS (the `/career` page and the old `CvBand` still render the new rows).

- [ ] **Step 5: Commit**

```bash
git add src/content/fixtures/career.json tests/career-story-fixtures.test.tsx
git commit -m "feat(content): career fixtures from the approved prototype (P3)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 3: Profile prologue and closing line

**Files:**
- Modify: `src/lib/models.ts` (`Profile` interface, lines 104–125 before P0–P2)
- Modify: `src/lib/notion-mappers.ts` (`mapProfile`, lines 80–103 before P0–P2)
- Modify: `src/content/fixtures/profile.json`
- Modify: every test file with a `Profile` literal (`grep -rl "nameNative: null," tests`; today `career-resume`, `hero`, `site-nav`, `bands`, `contact-band`, `site-footer`, `mappers`)
- Test: `tests/mappers.test.ts`, `tests/career-story-fixtures.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `Profile.prologue: Localized | null` (`PrologueEN/TH`), `Profile.closingLine: Localized | null` (`ClosingLineEN/TH`). Null when the EN property is empty; TH falls back to EN. The prologue carries one `**bold**` clause; the Thai closing line carries one `|` break marker (C3).

- [ ] **Step 1: Write the failing test**

Add the two new fields to every `Profile` literal in the tests (this also updates the exact `toEqual` in `mappers.test.ts` to expect `null` for a pre-migration Profile row):

```bash
perl -0pi -e 's/^([ \t]*)nameNative: null,\n/$&$1prologue: null,\n$1closingLine: null,\n/mg' $(grep -rl "nameNative: null," tests)
grep -rn "closingLine: null" tests | wc -l   # one per file listed by the grep above
```

In `tests/mappers.test.ts`, add after the test `'uses the native name when NameNative is present'`:

```ts
  it('maps PrologueEN/TH and ClosingLineEN/TH, TH falling back to EN', () => {
    const page = {
      ...profilePage,
      properties: {
        ...profilePage.properties,
        PrologueEN: rich('I started on the owner side. **Now I build my own tools.**'),
        PrologueTH: rich(''),
        ClosingLineEN: rich('Business developer who builds his own tools.'),
        ClosingLineTH: rich('นัก Business Development ที่สร้างเครื่องมือ|ใช้เอง'),
      },
    };
    const p = mapProfile(page)!;
    expect(p.prologue).toEqual({
      en: 'I started on the owner side. **Now I build my own tools.**',
      th: 'I started on the owner side. **Now I build my own tools.**',
    });
    expect(p.closingLine).toEqual({
      en: 'Business developer who builds his own tools.',
      th: 'นัก Business Development ที่สร้างเครื่องมือ|ใช้เอง',
    });
  });
```

Append to `tests/career-story-fixtures.test.tsx` (add `getProfile` to the `@/lib/content` import and `import profileFixture from '@/content/fixtures/profile.json';` at the top):

```tsx
describe('profile fixture (P3 fields)', () => {
  it('carries the prologue with one bold clause per language and the prototype closing line', async () => {
    const p = await getProfile();
    expect(p.prologue?.en).toContain(
      '**Now I do business development at Actmedia by day, and build my own tools at night.**',
    );
    expect(p.prologue?.th.match(/\*\*/g)).toHaveLength(2);
    expect(p.closingLine).toEqual({
      en: 'Business developer who builds his own tools.',
      th: 'นัก Business Development ที่สร้างเครื่องมือ|ใช้เอง',
    });
  });

  it('spells Actmedia the approved way everywhere in the profile', () => {
    expect(JSON.stringify(profileFixture)).not.toContain('ActMedia');
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/mappers.test.ts tests/career-story-fixtures.test.tsx`
Expected: FAIL — `mapProfile` returns no `prologue`/`closingLine` (the exact `toEqual` and the new test), fixture has no prologue, and still says "ActMedia".

- [ ] **Step 3: Implement**

In `src/lib/models.ts`, inside `Profile`, after `nameNative: string | null;` add:

```ts
  // White Edition P3 (C5): By day's owner-side story (one **bold** clause,
  // rendered by BoldText) and the section's closing line (Thai may carry a
  // '|' break marker, C3). Both null on a Profile row from before the
  // migration: ByDay then drops the paragraph and closes on the headline.
  prologue: Localized | null;
  closingLine: Localized | null;
```

In `src/lib/notion-mappers.ts`, inside `mapProfile`'s returned object, after the `nameNative:` line add:

```ts
    // White Edition P3: optional rich text, same additive treatment as
    // NameNative -- a Profile database without these properties maps to
    // null rather than failing.
    prologue: text(page.properties.PrologueEN)
      ? localized(text(page.properties.PrologueEN), text(page.properties.PrologueTH))
      : null,
    closingLine: text(page.properties.ClosingLineEN)
      ? localized(text(page.properties.ClosingLineEN), text(page.properties.ClosingLineTH))
      : null,
```

In `src/content/fixtures/profile.json`:

1. Replace every `ActMedia` with `Actmedia` (three places today: `now.en`, `now.th`, `clients`):
   ```bash
   perl -pi -e 's/ActMedia/Actmedia/g' src/content/fixtures/profile.json
   ```
2. Replace the last property line `"resumeUrl": "/suwichak-jarunopratamp-resume.pdf"` (and its closing `}`) with:

```json
  "resumeUrl": "/suwichak-jarunopratamp-resume.pdf",
  "prologue": {
    "en": "I started on the owner side of the table, running A Bun Dance, a craft-burger shop where menu R&D, pricing and gross margin were all mine to get right. I learned service the honest way, behind the bar at VELA. **Now I do business development at Actmedia by day, and build my own tools at night.** When I scope software for a business, I have already sat on both sides of the table.",
    "th": "ผมเริ่มจากฝั่งเจ้าของโต๊ะ ทำร้าน A Bun Dance เบอร์เกอร์คราฟต์ ที่ทั้งคิดเมนู ตั้งราคา และคุมกำไรขั้นต้นเองทั้งหมด เรียนรู้งานบริการแบบตรงไปตรงมาหลังบาร์ที่ VELA **ตอนนี้กลางวันทำงาน Business Development ที่ Actmedia และสร้างเครื่องมือของตัวเองตอนกลางคืน** เวลาคุยเรื่องระบบกับธุรกิจ ผมเลยนั่งมาแล้วทั้งสองฝั่งของโต๊ะ"
  },
  "closingLine": {
    "en": "Business developer who builds his own tools.",
    "th": "นัก Business Development ที่สร้างเครื่องมือ|ใช้เอง"
  }
}
```

(If an earlier phase moved `resumeUrl`, add the two properties as the last two keys of the object instead.)

- [ ] **Step 4: Run and pass**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all tests PASS; `tsc` prints nothing. If `tsc` reports a `Profile` literal missing `prologue`, it is one the perl pattern did not match (e.g. `nameNative: 'x',`): add `prologue: null, closingLine: null,` there by hand.

- [ ] **Step 5: Commit**

```bash
git add src/lib/models.ts src/lib/notion-mappers.ts src/content/fixtures/profile.json tests
git commit -m "feat(content): profile prologue and closing line for By day (P3)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 4: Story model, mapper, name guards and fixture

**Files:**
- Modify: `src/lib/models.ts` (append `StoryChapter` after `OpenQuestion`)
- Modify: `src/lib/notion-mappers.ts` (import line; new `mapStoryChapter` after `mapQuestion`)
- Create: `src/lib/story.ts`
- Create: `src/content/fixtures/story.json`
- Test: `tests/mappers.test.ts`, `tests/career-story-fixtures.test.tsx`

**Interfaces:**
- Consumes: `IconName` (`@/components/icons`, P0 C4), `SketchName` + `Sketch` (`@/components/sketches`, P0 C4).
- Produces:
  ```ts
  export interface StoryChapter { id: string; title: Localized; body: Localized; rule: Localized; icon: string; sketch: string; order: number }
  export function mapStoryChapter(page: NotionPage): StoryChapter | null; // skips rows without TitleEN
  // src/lib/story.ts
  export const STORY_ICONS: readonly ['target-duotone','chart-line-up-duotone','translate-duotone','rocket-launch-duotone','key-duotone','wrench-duotone'];
  export const STORY_SKETCHES: readonly ['room','cases','formats','rollout','handover'];
  export type StoryIcon; export type StorySketch;
  export function isStoryIcon(name: string): name is StoryIcon;
  export function isStorySketch(name: string): name is StorySketch;
  ```
  Notion Story properties: `TitleEN` (title), `TitleTH`, `BodyEN/TH`, `RuleEN/TH` (rich text), `Icon`, `Sketch` (select), `Order` (number), `Published` (checkbox, filtered in Task 5). `icon`/`sketch` are `''` when unset.

- [ ] **Step 1: Write the failing test**

In `tests/mappers.test.ts`, add `mapStoryChapter` to the import from `@/lib/notion-mappers`, then append:

```ts
const storyPage = {
  id: 'st1',
  properties: {
    TitleEN: title('Find the room.'),
    TitleTH: rich('หาห้องที่ใช่'),
    BodyEN: rich('I scope first, and **the NDA comes before any data changes hands.**'),
    BodyTH: rich(''),
    RuleEN: rich('Scope it honestly.'),
    RuleTH: rich('ประเมินตามจริง'),
    Icon: select('target-duotone'),
    Sketch: select('room'),
    Order: { number: 1 },
    Published: { checkbox: true },
  },
};

describe('mapStoryChapter', () => {
  it('maps a full row, TH falling back to EN', () => {
    expect(mapStoryChapter(storyPage)).toEqual({
      id: 'st1',
      title: { en: 'Find the room.', th: 'หาห้องที่ใช่' },
      body: {
        en: 'I scope first, and **the NDA comes before any data changes hands.**',
        th: 'I scope first, and **the NDA comes before any data changes hands.**',
      },
      rule: { en: 'Scope it honestly.', th: 'ประเมินตามจริง' },
      icon: 'target-duotone',
      sketch: 'room',
      order: 1,
    });
  });

  it('maps a row with only a title to empty defaults instead of dropping it', () => {
    expect(mapStoryChapter({ id: 'st2', properties: { TitleEN: title('Know the week it slips.') } })).toEqual({
      id: 'st2',
      title: { en: 'Know the week it slips.', th: 'Know the week it slips.' },
      body: { en: '', th: '' },
      rule: { en: '', th: '' },
      icon: '',
      sketch: '',
      order: 0,
    });
  });

  it('returns null and warns when TitleEN is missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const page = { ...storyPage, properties: { ...storyPage.properties, TitleEN: title('') } };
    expect(mapStoryChapter(page)).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
```

Append to `tests/career-story-fixtures.test.tsx` (add these imports at the top: `import { renderToStaticMarkup } from 'react-dom/server';`, `import { Sketch } from '@/components/sketches';`, `import storyFixture from '@/content/fixtures/story.json';`, `import { isStoryIcon, isStorySketch } from '@/lib/story';`, and add `StoryChapter` to the `@/lib/models` type import):

```tsx
describe('story fixture (prototype CH + RULES)', () => {
  const chapters = storyFixture as StoryChapter[];

  it('has six chapters ordered 1..6, each body with exactly one bold clause per language', () => {
    expect(chapters.map((c) => c.order)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(chapters[0].title).toEqual({ en: 'Find the room.', th: 'หาห้องที่ใช่' });
    expect(chapters[5].rule.en).toBe('Leave it maintainable.');
    for (const c of chapters) {
      expect(c.body.en.match(/\*\*/g)).toHaveLength(2);
      expect(c.body.th.match(/\*\*/g)).toHaveLength(2);
    }
  });

  it('uses only icon and sketch names the page can draw; chapter 6 has no sketch (phase strip instead)', () => {
    for (const c of chapters) {
      expect(isStoryIcon(c.icon)).toBe(true);
      if (c.sketch) expect(isStorySketch(c.sketch)).toBe(true);
    }
    expect(chapters[5].sketch).toBe('');
    expect(isStoryIcon('not-an-icon')).toBe(false);
    expect(isStorySketch('nope')).toBe(false);
  });

  it('every named sketch renders an <svg> through the P0 Sketch component', () => {
    for (const c of chapters) {
      if (!isStorySketch(c.sketch)) continue;
      expect(renderToStaticMarkup(<Sketch name={c.sketch} />)).toContain('<svg');
    }
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/mappers.test.ts tests/career-story-fixtures.test.tsx`
Expected: FAIL — `mapStoryChapter` is not exported; `@/content/fixtures/story.json` and `@/lib/story` do not exist.

- [ ] **Step 3: Implement**

Append to `src/lib/models.ts`:

```ts
// White Edition P3 (C5, spec §7 Story DB): one By day chapter. `body`
// carries one **bold** clause (BoldText renders it). `icon` / `sketch` are
// the Notion select values as typed ('' when unset); src/lib/story.ts decides
// which of them the page can actually draw, so a typo in Notion drops the
// icon, never the chapter.
export interface StoryChapter {
  id: string;
  title: Localized;
  body: Localized;
  rule: Localized;
  icon: string;
  sketch: string;
  order: number;
}
```

In `src/lib/notion-mappers.ts`, add `StoryChapter` to the type import on line 1, and add after `mapQuestion`:

```ts
// White Edition P3: the Story DB (spec §7). Gated on TitleEN alone -- the
// same "one required field, everything else optional" shape as mapCareerEntry
// -- so a half-written chapter in Notion still renders its title rather than
// vanishing. Order falls back to 0 via num().
export function mapStoryChapter(page: NotionPage): StoryChapter | null {
  const titleEn = text(page.properties.TitleEN);
  if (!titleEn) return skip('Story', page, 'missing TitleEN');
  return {
    id: page.id,
    title: localized(titleEn, text(page.properties.TitleTH)),
    body: localized(text(page.properties.BodyEN), text(page.properties.BodyTH)),
    rule: localized(text(page.properties.RuleEN), text(page.properties.RuleTH)),
    icon: selectOf(page.properties.Icon) ?? '',
    sketch: selectOf(page.properties.Sketch) ?? '',
    order: num(page.properties.Order),
  };
}
```

Create `src/lib/story.ts`:

```ts
import type { IconName } from '@/components/icons';
import type { SketchName } from '@/components/sketches';

// The Story DB's Icon / Sketch selects arrive as free text. Only the names
// listed here render; anything else (a typo, an option added in Notion
// before the code knows it) renders the chapter without that ornament.
// `satisfies` makes tsc prove every name exists in P0's icon and sketch sets
// (C4), so a rename there fails the build instead of blanking the page.
// These literals are also the option names the Notion selects must use.
export const STORY_ICONS = [
  'target-duotone',
  'chart-line-up-duotone',
  'translate-duotone',
  'rocket-launch-duotone',
  'key-duotone',
  'wrench-duotone',
] as const satisfies readonly IconName[];

// The prototype's SK[0..4], in chapter order. Chapter 6 has no sketch: it
// carries the five-phase strip instead (see ByDay).
export const STORY_SKETCHES = ['room', 'cases', 'formats', 'rollout', 'handover'] as const satisfies readonly SketchName[];

export type StoryIcon = (typeof STORY_ICONS)[number];
export type StorySketch = (typeof STORY_SKETCHES)[number];

export const isStoryIcon = (name: string): name is StoryIcon => (STORY_ICONS as readonly string[]).includes(name);
export const isStorySketch = (name: string): name is StorySketch =>
  (STORY_SKETCHES as readonly string[]).includes(name);
```

Create `src/content/fixtures/story.json` (prototype `CH` titles/bodies and `RULES` labels/icons, verbatim):

```json
[
  {
    "id": "fx-story-1",
    "title": {
      "en": "Find the room.",
      "th": "หาห้องที่ใช่"
    },
    "body": {
      "en": "I open new channels with Modern Trade retailers, from first contact to the shape of the partnership. I scope what is possible first, and **the NDA comes before any data changes hands.**",
      "th": "ผมเปิดช่องทางใหม่กับค้าปลีก Modern Trade ตั้งแต่ติดต่อครั้งแรกจนได้รูปแบบพาร์ตเนอร์ชิป ประเมินสิ่งที่ทำได้จริงก่อน และ**เซ็น NDA ก่อนแลกข้อมูลกันเสมอ**"
    },
    "rule": {
      "en": "Scope it honestly.",
      "th": "ประเมินตามจริง"
    },
    "icon": "target-duotone",
    "sketch": "room",
    "order": 1
  },
  {
    "id": "fx-story-2",
    "title": {
      "en": "Make the deal work for both sides.",
      "th": "ทำดีลให้คุ้มทั้งสองฝั่ง"
    },
    "body": {
      "en": "I weigh revenue share, profit share and a minimum guarantee, and model each in low, base and high cases before we commit, **so our position has a number behind it.**",
      "th": "ผมชั่งระหว่าง revenue share, profit share และ minimum guarantee แล้วทำโมเดลแบบ low / base / high ก่อนตัดสินใจ **จุดยืนของเราจึงมีตัวเลขรองรับเสมอ**"
    },
    "rule": {
      "en": "Say the number out loud.",
      "th": "พูดตัวเลขออกมาตรงๆ"
    },
    "icon": "chart-line-up-duotone",
    "sketch": "cases",
    "order": 2
  },
  {
    "id": "fx-story-3",
    "title": {
      "en": "Design what goes on the wall.",
      "th": "ออกแบบสิ่งที่จะขึ้นบนผนังร้าน"
    },
    "body": {
      "en": "With the planning team I price new in-store formats (digital shelf strips, LED archways, e-paper) and package them into tiered rate cards **a brand can buy and a store can run.**",
      "th": "ร่วมกับทีม planning ผมตั้งราคาสื่อรูปแบบใหม่ในร้าน ทั้ง digital shelf strip, LED archway และ e-paper แล้วจัดเป็น rate card หลายระดับ **ที่แบรนด์ซื้อได้และร้านใช้งานได้จริง**"
    },
    "rule": {
      "en": "Write it in both languages.",
      "th": "เขียนให้ครบสองภาษา"
    },
    "icon": "translate-duotone",
    "sketch": "formats",
    "order": 3
  },
  {
    "id": "fx-story-4",
    "title": {
      "en": "Put it in the stores.",
      "th": "ติดตั้งให้ถึงหน้าร้าน"
    },
    "body": {
      "en": "I roll out store by store, in batches, with a cost cap per store. When a supplier raised prices mid-project, **I renegotiated and found a new source**, and the budget held.",
      "th": "ผมทยอยติดตั้งทีละสาขาเป็นล็อต โดยคุมงบต่อสาขาไว้ ตอนซัพพลายเออร์ขึ้นราคากลางโปรเจกต์ **ผมเจรจาใหม่และหาแหล่งใหม่** งบจึงไม่บาน"
    },
    "rule": {
      "en": "Ship something that runs.",
      "th": "ส่งของที่รันได้จริง"
    },
    "icon": "rocket-launch-duotone",
    "sketch": "rollout",
    "order": 4
  },
  {
    "id": "fx-story-5",
    "title": {
      "en": "Hand it over so it keeps running.",
      "th": "ส่งต่อให้ระบบเดินต่อได้เอง"
    },
    "body": {
      "en": "I hand over to operations with an owner map, and set sales up in a Salesforce CRM they can run. The audience-measurement pilot has **consent written in from day one.**",
      "th": "ผมส่งต่องานให้ทีม Operations พร้อมแผนผังว่าใครดูแลอะไร และวางระบบ Salesforce CRM ให้ทีมขายใช้งานเองได้ ส่วน pilot วัดผู้ชมหน้าจอ**ใส่เงื่อนไข consent ไว้ตั้งแต่วันแรก**"
    },
    "rule": {
      "en": "Then hand over the keys.",
      "th": "แล้วส่งกุญแจให้"
    },
    "icon": "key-duotone",
    "sketch": "handover",
    "order": 5
  },
  {
    "id": "fx-story-6",
    "title": {
      "en": "Know the week it slips.",
      "th": "รู้ตั้งแต่สัปดาห์ที่งานเริ่มเลื่อน"
    },
    "body": {
      "en": "Every task has an owner, a due date and a baseline agreed with management, so a slip shows up the week it happens. A 30-point checklist covers every launch, from terms to audit. **I built that tracker myself.**",
      "th": "ทุกงานมีเจ้าของ มีวันส่ง และมีแผนที่ตกลงกับผู้บริหารไว้ งานไหนเลื่อนจะเห็นภายในสัปดาห์นั้นเลย ทุกการเปิดตัวเดินตาม checklist 30 ข้อ ตั้งแต่เงื่อนไขการค้าจนถึงการตรวจหลังเปิดใช้งาน **ระบบนี้ผมสร้างเอง**"
    },
    "rule": {
      "en": "Leave it maintainable.",
      "th": "ทิ้งไว้ให้ดูแลต่อได้"
    },
    "icon": "wrench-duotone",
    "sketch": "",
    "order": 6
  }
]
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/mappers.test.ts tests/career-story-fixtures.test.tsx && npx tsc --noEmit`
Expected: PASS; `tsc` prints nothing. A `satisfies` error on `STORY_SKETCHES` means P0 named the sketches differently: use P0's five names in `story.ts` and `story.json` (see "Before you start").

- [ ] **Step 5: Commit**

```bash
git add src/lib/models.ts src/lib/notion-mappers.ts src/lib/story.ts src/content/fixtures/story.json tests/mappers.test.ts tests/career-story-fixtures.test.tsx
git commit -m "feat(content): Story chapter model, mapper and prototype fixture (P3)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 5: `fetchStory` and `getStory`

**Files:**
- Modify: `src/lib/notion.ts` (type import line 2; mapper import lines 3–13; `dbId` union line 21; add `fetchStory` after `fetchQuestions`)
- Modify: `src/lib/content.ts` (type import line 2; fixture imports lines 4–9; add `getStory` at the end)
- Create: `tests/notion-story.test.ts`, `tests/content-story.test.ts`
- Test: `tests/career-story-fixtures.test.tsx` (fixture mode)

**Interfaces:**
- Consumes: `mapStoryChapter`, `StoryChapter` (Task 4); `story.json` (Task 4); existing `queryAll`, `fromNotion`.
- Produces:
  ```ts
  export async function fetchStory(): Promise<StoryChapter[]>; // notion.ts: NOTION_DB_STORY, Published only, mapped, bad rows dropped
  export async function getStory(): Promise<StoryChapter[]>;   // content.ts: sorted by order; fixtures when Notion is off OR NOTION_DB_STORY is unset
  ```
  Ordering is applied once, in `getStory`, so fixtures and Notion rows sort the same way.

- [ ] **Step 1: Write the failing test**

Create `tests/notion-story.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock('@notionhq/client', () => ({
  Client: class {
    databases = { query: queryMock };
    blocks = { children: { list: vi.fn() }, retrieve: vi.fn() };
    pages = { retrieve: vi.fn() };
  },
}));

import { fetchStory } from '@/lib/notion';

const title = (s: string) => ({ title: s ? [{ plain_text: s }] : [] });
const row = (id: string, t: string, order: number) => ({
  id,
  properties: { TitleEN: title(t), Order: { number: order }, Published: { checkbox: true } },
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('NOTION_TOKEN', 'test-token');
  vi.stubEnv('NOTION_DB_STORY', 'db-story');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('fetchStory', () => {
  it('queries the Story DB for published rows and maps them, dropping untitled rows', async () => {
    queryMock.mockResolvedValueOnce({
      results: [row('s1', 'Find the room.', 1), row('s2', '', 2)],
      next_cursor: null,
      has_more: false,
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const story = await fetchStory();
    expect(story.map((c) => c.id)).toEqual(['s1']);
    expect(queryMock.mock.calls[0][0].database_id).toBe('db-story');
    expect(queryMock.mock.calls[0][0].filter).toEqual({ property: 'Published', checkbox: { equals: true } });
    warn.mockRestore();
  });

  it('throws a named error when NOTION_DB_STORY is missing (getStory never calls it then)', async () => {
    vi.stubEnv('NOTION_DB_STORY', '');
    await expect(fetchStory()).rejects.toThrow('Missing env NOTION_DB_STORY');
  });
});
```

Create `tests/content-story.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Isolated in its own file so this module mock never leaks into the
// fixture-mode tests (same isolation as tests/content-questions.test.ts).
const { fetchStoryMock } = vi.hoisted(() => ({ fetchStoryMock: vi.fn() }));
vi.mock('@/lib/notion', () => ({ fetchStory: fetchStoryMock }));

const chapter = (id: string, order: number) => ({
  id,
  title: { en: id, th: id },
  body: { en: '', th: '' },
  rule: { en: '', th: '' },
  icon: '',
  sketch: '',
  order,
});

describe('getStory (Notion mode)', () => {
  beforeEach(() => {
    fetchStoryMock.mockReset();
    vi.stubEnv('NOTION_TOKEN', 'x');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('serves the fixture chapters without touching Notion when NOTION_DB_STORY is unset', async () => {
    // Master Review Focus #1: Klao adds the Story DB and its env var after
    // this code ships. Until then the page keeps its six chapters -- unlike
    // Questions, which honestly goes empty.
    const { getStory } = await import('@/lib/content');
    const story = await getStory();
    expect(story).toHaveLength(6);
    expect(story[0].title.en).toBe('Find the room.');
    expect(fetchStoryMock).not.toHaveBeenCalled();
  });

  it('reads Notion and sorts by Order once NOTION_DB_STORY is set', async () => {
    vi.stubEnv('NOTION_DB_STORY', 'db-story');
    fetchStoryMock.mockResolvedValueOnce([chapter('b', 2), chapter('a', 1)]);
    const { getStory } = await import('@/lib/content');
    expect((await getStory()).map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('falls back to the fixtures when Notion fails during the production build', async () => {
    vi.stubEnv('NOTION_DB_STORY', 'db-story');
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    fetchStoryMock.mockRejectedValueOnce(new Error('notion down'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getStory } = await import('@/lib/content');
    expect(await getStory()).toHaveLength(6);
    warn.mockRestore();
  });

  it('rethrows at runtime so ISR keeps serving the last good page', async () => {
    vi.stubEnv('NOTION_DB_STORY', 'db-story');
    fetchStoryMock.mockRejectedValueOnce(new Error('notion down'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getStory } = await import('@/lib/content');
    await expect(getStory()).rejects.toThrow('notion down');
    warn.mockRestore();
  });
});
```

Append to `tests/career-story-fixtures.test.tsx` (add `getStory` to the `@/lib/content` import):

```tsx
describe('getStory (fixture mode)', () => {
  it('returns the six fixture chapters sorted by order', async () => {
    const story = await getStory();
    expect(story.map((c) => c.order)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(story[0].title.en).toBe('Find the room.');
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/notion-story.test.ts tests/content-story.test.ts tests/career-story-fixtures.test.tsx`
Expected: FAIL — `fetchStory` / `getStory` are not exported.

- [ ] **Step 3: Implement**

In `src/lib/notion.ts`:
- add `StoryChapter` to the type import on line 2;
- add `mapStoryChapter,` to the `./notion-mappers` import list;
- change the `dbId` parameter type to
  ```ts
  const dbId = (name: 'PROJECTS' | 'POSTS' | 'CAREER' | 'PROFILE' | 'SKILLS' | 'QUESTIONS' | 'STORY'): string => {
  ```
  (keep any names earlier phases added, e.g. `'FAQ'`);
- add after `fetchQuestions`:

```ts
// White Edition P3 (C5): the By day chapters. Sorting happens once, in
// content.ts's getStory, so the fixture path and this path order the same way.
export async function fetchStory(): Promise<StoryChapter[]> {
  return (await queryAll(dbId('STORY'), true)).map(mapStoryChapter).filter(nonNull);
}
```

In `src/lib/content.ts`:
- add `StoryChapter` to the type import on line 2;
- add `import storyFixture from '@/content/fixtures/story.json';` after the `questionsFixture` import;
- append at the end of the file:

```ts
// White Edition P3 (C5): the six By day chapters. Like getQuestions, an
// unset NOTION_DB_STORY in Notion mode means "Story DB not created yet",
// not an error (Klao adds the DB and its Vercel env var separately from this
// deploy). Unlike getQuestions it serves the fixture chapters, not [], so the
// page never loses its method section mid-migration (master Review Focus #1).
// With the env var present, fromNotion's usual rules hold: build phase ->
// fixtures, runtime failure -> rethrow so ISR keeps the last good page.
const getStoryCached = cache(async (): Promise<StoryChapter[]> => {
  const fixture = storyFixture as StoryChapter[];
  const all =
    process.env.NOTION_TOKEN && !process.env.NOTION_DB_STORY
      ? fixture
      : await fromNotion((n) => n.fetchStory(), fixture);
  return [...all].sort((a, b) => a.order - b.order);
});

export async function getStory(): Promise<StoryChapter[]> {
  return getStoryCached();
}
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/notion-story.test.ts tests/content-story.test.ts tests/career-story-fixtures.test.tsx tests/notion-fetch.test.ts tests/content.test.ts && npx tsc --noEmit`
Expected: PASS; `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notion.ts src/lib/content.ts tests/notion-story.test.ts tests/content-story.test.ts tests/career-story-fixtures.test.tsx
git commit -m "feat(content): fetchStory + getStory with fixture fallback until NOTION_DB_STORY exists (P3)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 6: Career helpers (`src/lib/career.ts`)

**Files:**
- Create: `src/lib/career.ts`
- Create: `tests/career-lib.test.ts`

**Interfaces:**
- Consumes: `CareerEntry`, `Skill` (models); `getSkills()` in the test only.
- Produces (all exported from `src/lib/career.ts`):
  ```ts
  export const CAREER_EVENT = 'klao:career';
  export function monthIndex(ym: string): number;                       // NaN when not 'YYYY-MM'
  export function currentYm(date?: Date): string;                       // Bangkok (UTC+7) 'YYYY-MM'
  export function monthsBetween(start: string, end: string): number;    // inclusive, >= 1
  export function formatYm(ym: string, months: readonly string[]): string;
  export interface DateLabels { months: readonly string[]; present: string; unit: string }
  export function careerDates(entry: Pick<CareerEntry, 'start' | 'end' | 'period'>, now: string, labels: DateLabels): string;
  export function pillYears(entry: Pick<CareerEntry, 'start' | 'end'>, nowWord: string): string | null;
  export interface RailSegment { index: number; left: number; width: number }
  export interface RailTick { year: number; left: number; first: boolean; alt: boolean }
  export interface RailModel { segments: RailSegment[]; ticks: RailTick[]; centers: (number | null)[] }
  export function railModel(entries: Pick<CareerEntry, 'start' | 'end'>[], now: string): RailModel | null;
  export function labelAlign(center: number): 'start' | 'mid' | 'end';
  export function findCareerIndex(entries: Pick<CareerEntry, 'key'>[], key: string): number;
  export interface FigurePart { text: string; unit: boolean }
  export function splitFigureValue(value: string): FigurePart[];
  export type ToolboxColumnId = 'stack' | 'methods' | 'languages';
  export interface ToolboxColumn { id: ToolboxColumnId; label: string; items: string[] }
  export const TOOLBOX_STACK: readonly string[];
  export function toolboxColumns(skills: Skill[], labels: Record<ToolboxColumnId, string>, languages: readonly string[]): ToolboxColumn[];
  ```
  **New rule (flagged in Contract gaps):** toolbox columns do not come from `Skill.category`. `stack` = the owner-curated `TOOLBOX_STACK` names present in Skills (the old SkillsBand allowlist + Next.js, i.e. the prototype's "Works in" + "Builds with"); `methods` = Skills with tier `top` (the prototype's "Focus"); `languages` = dictionary strings. Empty columns are dropped.

- [ ] **Step 1: Write the failing test**

Create `tests/career-lib.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  CAREER_EVENT,
  TOOLBOX_STACK,
  careerDates,
  currentYm,
  findCareerIndex,
  formatYm,
  labelAlign,
  monthIndex,
  monthsBetween,
  pillYears,
  railModel,
  splitFigureValue,
  toolboxColumns,
} from '@/lib/career';
import { getSkills } from '@/lib/content';
import type { Skill } from '@/lib/models';

const EN = {
  months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  present: 'Present',
  unit: 'mo',
};
const TH = {
  months: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
  present: 'ปัจจุบัน',
  unit: 'เดือน',
};

describe('CAREER_EVENT', () => {
  it('is the C8 event name', () => {
    expect(CAREER_EVENT).toBe('klao:career');
  });
});

describe('month arithmetic', () => {
  it('indexes YYYY-MM and rejects anything else', () => {
    expect(monthIndex('2026-03') - monthIndex('2025-03')).toBe(12);
    expect(monthIndex('2026-3')).toBeNaN();
    expect(monthIndex('2026-13')).toBeNaN();
    expect(monthIndex('')).toBeNaN();
  });

  it('counts months inclusively and never below one', () => {
    expect(monthsBetween('2026-03', '2026-09')).toBe(7);
    expect(monthsBetween('2024-05', '2026-03')).toBe(23);
    expect(monthsBetween('2026-05', '2026-03')).toBe(1); // EndDate typed before StartDate
    expect(monthsBetween('bad', '2026-03')).toBe(1);
  });

  it('reads the current month in Bangkok time, not UTC', () => {
    // 30 Sep 20:00 UTC is already 1 Oct 03:00 in Bangkok.
    expect(currentYm(new Date('2026-09-30T20:00:00Z'))).toBe('2026-10');
    expect(currentYm(new Date('2026-09-30T10:00:00Z'))).toBe('2026-09');
  });
});

describe('date labels', () => {
  it('formats the panel date line in both languages', () => {
    const current = { start: '2026-03', end: null, period: 'MAR 2026 – Present' };
    expect(careerDates(current, '2026-09', EN)).toBe('Mar 2026 – Present · 7 mo');
    expect(careerDates(current, '2026-09', TH)).toBe('มี.ค. 2026 – ปัจจุบัน · 7 เดือน');
    expect(careerDates({ start: '2024-05', end: '2026-03', period: '' }, '2026-09', EN)).toBe(
      'May 2024 – Mar 2026 · 23 mo',
    );
  });

  it('falls back to the hand-typed period for a row without dates (pre-migration Notion)', () => {
    expect(careerDates({ start: null, end: null, period: 'MAR 2026 – Present' }, '2026-09', EN)).toBe(
      'MAR 2026 – Present',
    );
  });

  it('shows a malformed month as typed rather than crashing', () => {
    expect(formatYm('2026-3', EN.months)).toBe('2026-3');
  });

  it('labels pills with years only', () => {
    expect(pillYears({ start: '2026-03', end: null }, 'now')).toBe('2026 – now');
    expect(pillYears({ start: '2024-05', end: '2026-03' }, 'now')).toBe('2024 – 2026');
    expect(pillYears({ start: '2023-08', end: '2023-12' }, 'now')).toBe('2023');
    expect(pillYears({ start: null, end: null }, 'now')).toBeNull();
  });
});

describe('railModel', () => {
  const entries = [
    { start: '2026-03', end: null },
    { start: '2024-05', end: '2026-03' },
    { start: '2023-08', end: '2023-12' },
    { start: '2023-04', end: '2023-08' },
    { start: '2021-05', end: '2022-12' },
  ];

  it('lays segments out proportionally from the first start to now (65 months)', () => {
    const r = railModel(entries, '2026-09')!;
    expect(r.segments).toHaveLength(5);
    expect(r.segments[0].left).toBeCloseTo((58 / 65) * 100, 5);
    expect(r.segments[0].width).toBeCloseTo((7 / 65) * 100, 5);
    // Casetify stops where Actmedia starts: the handover month is drawn once.
    expect(r.segments[1].left + r.segments[1].width).toBeCloseTo(r.segments[0].left, 5);
    expect(r.segments[4].left).toBe(0);
    expect(r.centers[0]).toBeCloseTo(((58 + 3.5) / 65) * 100, 5);
  });

  it('does not depend on the order the entries arrive in', () => {
    const shuffled = [entries[3], entries[0], entries[4], entries[1], entries[2]];
    const a = railModel(entries, '2026-09')!;
    const b = railModel(shuffled, '2026-09')!;
    expect(b.centers[1]).toBeCloseTo(a.centers[0]!, 5); // Actmedia
    expect(b.centers[0]).toBeCloseTo(a.centers[3]!, 5); // VELA
  });

  it('ticks every year: the first flush left, alternate years flagged for phone', () => {
    const r = railModel(entries, '2026-09')!;
    expect(r.ticks.map((t) => t.year)).toEqual([2021, 2022, 2023, 2024, 2025, 2026]);
    expect(r.ticks[0]).toMatchObject({ left: 0, first: true, alt: false });
    expect(r.ticks.filter((t) => !t.alt).map((t) => t.year)).toEqual([2021, 2023, 2025]);
    expect(r.ticks[1].left).toBeCloseTo((8 / 65) * 100, 5);
  });

  it('returns null when no entry has a start date (pre-migration Notion)', () => {
    expect(railModel([{ start: null, end: null }], '2026-09')).toBeNull();
    expect(railModel([], '2026-09')).toBeNull();
  });

  it('skips undated entries and keeps a future start inside the rail', () => {
    const r = railModel(
      [
        { start: null, end: null },
        { start: '2025-01', end: null },
        { start: '2027-01', end: null },
      ],
      '2026-01',
    )!;
    expect(r.centers[0]).toBeNull();
    expect(r.segments.map((s) => s.index)).toEqual([1, 2]);
    for (const s of r.segments) {
      expect(s.left).toBeGreaterThanOrEqual(0);
      expect(s.left + s.width).toBeLessThanOrEqual(100);
    }
  });

  it('aligns the marker label so it never runs off either end', () => {
    expect(labelAlign(5)).toBe('start');
    expect(labelAlign(50)).toBe('mid');
    expect(labelAlign(94.6)).toBe('end');
  });
});

describe('findCareerIndex', () => {
  const keys = [{ key: 'actmedia' }, { key: 'casetify' }, { key: 'a-bun-dance-craft-burger' }, { key: '' }];

  it('matches an exact key', () => {
    expect(findCareerIndex(keys, 'casetify')).toBe(1);
  });

  it('matches prototype-style and live-Notion variants of the same company', () => {
    expect(findCareerIndex([{ key: 'a-bun-dance' }], 'abundance')).toBe(0); // prototype FAQ link
    expect(findCareerIndex(keys, 'a-bun-dance')).toBe(2); // unique prefix of a longer Notion name
    expect(findCareerIndex(keys, 'CASETIFY')).toBe(1);
  });

  it('matches nothing for unknown, empty, too-short or ambiguous keys', () => {
    expect(findCareerIndex(keys, 'nope')).toBe(-1);
    expect(findCareerIndex(keys, '')).toBe(-1);
    expect(findCareerIndex(keys, '--')).toBe(-1);
    expect(findCareerIndex(keys, 'a')).toBe(-1);
    expect(findCareerIndex([{ key: 'abc-one' }, { key: 'abc-two' }], 'abc')).toBe(-1);
  });
});

describe('splitFigureValue', () => {
  it('marks letter-only words as units and keeps numerals whole', () => {
    expect(splitFigureValue('THB 1.1M')).toEqual([
      { text: 'THB', unit: true },
      { text: '1.1M', unit: false },
    ]);
    expect(splitFigureValue('~35%')).toEqual([{ text: '~35%', unit: false }]);
    expect(splitFigureValue('1.1 ล้านบาท')).toEqual([
      { text: '1.1', unit: false },
      { text: 'ล้านบาท', unit: true },
    ]);
    expect(splitFigureValue('   ')).toEqual([]);
  });
});

describe('toolboxColumns', () => {
  const labels = { stack: 'Works in', methods: 'Focus', languages: 'Languages' };
  const skill = (name: string, tier: Skill['tier']): Skill => ({ id: name, name, tier, category: 'biz', order: 1 });

  it('builds stack · methods · languages, stack in the curated order', () => {
    const cols = toolboxColumns(
      [skill('AI-assisted building (Claude)', 'top'), skill('Python', 'working'), skill('Salesforce', 'daily'), skill('Pandas', 'working')],
      labels,
      ['Thai', 'English (conversational)'],
    );
    expect(cols.map((c) => c.id)).toEqual(['stack', 'methods', 'languages']);
    expect(cols[0]).toEqual({ id: 'stack', label: 'Works in', items: ['Salesforce', 'Python'] });
    expect(cols[1].items).toEqual(['AI-assisted building (Claude)']);
    expect(cols[2]).toEqual({ id: 'languages', label: 'Languages', items: ['Thai', 'English (conversational)'] });
  });

  it('drops empty columns instead of rendering a bare heading', () => {
    expect(toolboxColumns([], labels, ['Thai']).map((c) => c.id)).toEqual(['languages']);
  });

  it('reproduces the prototype toolbox from the real skills fixture', async () => {
    const cols = toolboxColumns(await getSkills(), labels, []);
    expect(cols[0].items).toEqual([...TOOLBOX_STACK]);
    expect(cols[1].items).toEqual([
      'AI-assisted building (Claude)',
      'Sales forecasting',
      'Retail media & shopper media',
      'PMO / project delivery',
    ]);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/career-lib.test.ts`
Expected: FAIL — `Cannot find module '@/lib/career'`.

- [ ] **Step 3: Implement**

Create `src/lib/career.ts`:

```ts
import type { CareerEntry, Skill } from './models';

// C8 (master plan): FAQ deep links, the ⌘K palette and the footer ask the
// career band to open a role with
//   window.dispatchEvent(new CustomEvent(CAREER_EVENT, { detail: { key } }))
// Exported so dispatchers import the name instead of retyping the string.
export const CAREER_EVENT = 'klao:career';

const YM = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Months since year 0 for a 'YYYY-MM' string, so a difference is a month
 *  count. NaN for anything else; every caller treats NaN as "no date". */
export function monthIndex(ym: string): number {
  const m = YM.exec(ym);
  return m ? Number(m[1]) * 12 + Number(m[2]) - 1 : Number.NaN;
}

/** The current month in Bangkok (UTC+7, no DST) as 'YYYY-MM'. CareerBand
 *  computes it on the server and hands it to the client island, so a visitor
 *  whose clock sits in another month never sees hydrated durations disagree
 *  with the server HTML. ISR (about 1 h) keeps it current. */
export function currentYm(date: Date = new Date()): string {
  const bkk = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return `${bkk.getUTCFullYear()}-${String(bkk.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Inclusive month count ('2026-03'..'2026-09' = 7), never below 1: an
 *  EndDate typed before its StartDate shows "1 mo", not a negative span. */
export function monthsBetween(start: string, end: string): number {
  const n = monthIndex(end) - monthIndex(start) + 1;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** 'Mar 2026' / 'มี.ค. 2026'. A malformed value is shown as typed. */
export function formatYm(ym: string, months: readonly string[]): string {
  const i = monthIndex(ym);
  return Number.isFinite(i) ? `${months[i % 12]} ${Math.floor(i / 12)}` : ym;
}

export interface DateLabels {
  months: readonly string[];
  present: string;
  unit: string;
}

/** The panel's date line, e.g. 'Mar 2026 – Present · 7 mo'. A pre-migration
 *  row (no StartDate) shows its hand-typed `period` instead. */
export function careerDates(
  entry: Pick<CareerEntry, 'start' | 'end' | 'period'>,
  now: string,
  labels: DateLabels,
): string {
  if (!entry.start) return entry.period;
  const to = entry.end ? formatYm(entry.end, labels.months) : labels.present;
  return `${formatYm(entry.start, labels.months)} – ${to} · ${monthsBetween(entry.start, entry.end ?? now)} ${labels.unit}`;
}

/** The pill's quiet year label: '2024 – 2026', '2023' (same year),
 *  '2026 – now'. null without a start, so the pill shows the company only. */
export function pillYears(entry: Pick<CareerEntry, 'start' | 'end'>, nowWord: string): string | null {
  if (!entry.start) return null;
  const from = entry.start.slice(0, 4);
  if (!entry.end) return `${from} – ${nowWord}`;
  const to = entry.end.slice(0, 4);
  return to === from ? from : `${from} – ${to}`;
}

export interface RailSegment {
  index: number; // index into the entries passed in
  left: number; // percent of the rail
  width: number; // percent of the rail
}
export interface RailTick {
  year: number;
  left: number;
  first: boolean; // sits flush left instead of centred on its position
  alt: boolean; // every other year: hidden on phone (CSS)
}
export interface RailModel {
  segments: RailSegment[];
  ticks: RailTick[];
  centers: (number | null)[]; // per entry; null when the entry has no start
}

const pct = (n: number): number => Math.min(100, Math.max(0, n));

/** Geometry for the time rail, in percent of its width, from the earliest
 *  start to `now`. Each role ends where the next newer role starts, so a
 *  handover month is drawn once; this looks at dates, not array order, so a
 *  re-ordered Notion DB draws the same rail. Undated entries are skipped; no
 *  dated entry at all (pre-migration Notion) returns null and the band draws
 *  no rail. Everything is clamped into 0..100 so a future-dated typo can
 *  never push a segment past the rail's edge. */
export function railModel(entries: Pick<CareerEntry, 'start' | 'end'>[], now: string): RailModel | null {
  const starts = entries.map((e) => (e.start ? monthIndex(e.start) : Number.NaN));
  const dated = starts.filter((s) => Number.isFinite(s));
  if (dated.length === 0) return null;
  const origin = Math.min(...dated);
  const nowIdx = monthIndex(now);
  const last = Number.isFinite(nowIdx) ? nowIdx : Math.max(...dated);
  const total = Math.max(1, last - origin + 1);

  const segments: RailSegment[] = [];
  const centers: (number | null)[] = entries.map(() => null);
  entries.forEach((entry, index) => {
    const s = starts[index];
    if (!Number.isFinite(s)) return;
    let end = entry.end ? monthIndex(entry.end) - origin + 1 : total;
    if (!Number.isFinite(end)) end = total;
    const later = dated.filter((x) => x > s);
    if (later.length) end = Math.min(end, Math.min(...later) - origin);
    const left = pct(((s - origin) / total) * 100);
    const width = Math.max(0, pct((end / total) * 100) - left);
    segments.push({ index, left, width });
    centers[index] = left + width / 2;
  });

  const firstYear = Math.floor(origin / 12);
  const lastYear = Math.floor((origin + total - 1) / 12);
  const ticks: RailTick[] = [];
  for (let year = firstYear; year <= lastYear; year++) {
    const left = year === firstYear ? 0 : pct(((year * 12 - origin) / total) * 100);
    ticks.push({ year, left, first: year === firstYear, alt: (year - firstYear) % 2 === 1 });
  }
  return { segments, ticks, centers };
}

/** Where the marker label sits relative to its dot, so it never runs off the rail. */
export function labelAlign(center: number): 'start' | 'mid' | 'end' {
  return center < 12 ? 'start' : center > 88 ? 'end' : 'mid';
}

const compact = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** The entry a `career:<key>` link means, or -1. Exact key first; then the
 *  same letters without separators ('abundance' = 'a-bun-dance', the
 *  prototype's FAQ form); then a unique prefix of at least three letters
 *  ('a-bun-dance' finds a live Notion row still named "A Bun Dance (Craft
 *  Burger)"). Anything else -- unknown, empty, ambiguous -- is -1, so a stale
 *  link does nothing instead of opening the wrong role. */
export function findCareerIndex(entries: Pick<CareerEntry, 'key'>[], key: string): number {
  if (!key) return -1;
  const exact = entries.findIndex((e) => e.key === key);
  if (exact >= 0) return exact;
  const want = compact(key);
  if (!want) return -1;
  const same = entries.findIndex((e) => compact(e.key) === want);
  if (same >= 0) return same;
  if (want.length < 3) return -1;
  const prefixed = entries.flatMap((e, i) => (e.key && compact(e.key).startsWith(want) ? [i] : []));
  return prefixed.length === 1 ? prefixed[0] : -1;
}

export interface FigurePart {
  text: string;
  unit: boolean;
}

const UNIT = /^[A-Za-z฀-๿]+$/;

/** 'THB 1.1M' -> a small unit ('THB') and the numeral ('1.1M'), the way the
 *  prototype set the figure (.u at .45em). Letter-only words are units, so a
 *  Thai value like '1.1 ล้านบาท' works the same once Notion carries one. */
export function splitFigureValue(value: string): FigurePart[] {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((text) => ({ text, unit: UNIT.test(text) }));
}

export type ToolboxColumnId = 'stack' | 'methods' | 'languages';

export interface ToolboxColumn {
  id: ToolboxColumnId;
  label: string;
  items: string[];
}

// The owner's own cut of which concrete tools the toolbox names, in reading
// order: the prototype's "Works in" + "Builds with" cells (the old
// SkillsBand TOOLS_ALLOWLIST plus Next.js). A Skills row not listed here is
// not shown (owner, 2026-08-12: "too many chips reads as overclaiming"); a
// listed name with no Skills row is skipped, never invented.
export const TOOLBOX_STACK: readonly string[] = [
  'Salesforce',
  'Excel & Sheets modeling',
  'Power BI',
  'Python',
  'SQL',
  'Next.js',
  'Supabase',
  'Notion API',
  'Vercel',
  'Swift',
];

/** The toolbox's one row, in spec §10 order: stack · methods · languages.
 *  methods = Skills at tier 'top' (the prototype's "Focus"), in the order
 *  getSkills returns them. Columns with nothing in them are dropped. */
export function toolboxColumns(
  skills: Skill[],
  labels: Record<ToolboxColumnId, string>,
  languages: readonly string[],
): ToolboxColumn[] {
  const names = new Set(skills.map((s) => s.name));
  const columns: ToolboxColumn[] = [
    { id: 'stack', label: labels.stack, items: TOOLBOX_STACK.filter((n) => names.has(n)) },
    { id: 'methods', label: labels.methods, items: skills.filter((s) => s.tier === 'top').map((s) => s.name) },
    { id: 'languages', label: labels.languages, items: [...languages] },
  ];
  return columns.filter((c) => c.items.length > 0);
}
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/career-lib.test.ts && npx tsc --noEmit`
Expected: PASS; `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/career.ts tests/career-lib.test.ts
git commit -m "feat(career): date, rail, deep-link and toolbox helpers (P3)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 7: Dictionary strings for Career and By day

**Files:**
- Modify: `src/lib/dictionary.ts` (append to the `en` object, directly before `const th: typeof en = {`; append to the `th` object, directly before `export type UiDict = typeof en;`)
- Modify: `tests/dictionary.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (keys on `UiDict`; copy from the prototype's `T()` strings, `MON`, `TOOLS`, `PHASES`, `HEALTH`): `resumeLink`, `resumeMeta`, `careerNow`, `careerPresent`, `careerMonthsUnit`, `careerEarlier`, `careerDealLink`, `monthsShort` (12), `toolboxStack`, `toolboxMethods`, `toolboxLanguages`, `toolLanguageNames` (2), `storyEyebrow`, `storyLead`, `portraitAlt`, `storyPhasesLabel`, `storyPhases` (5), `storyHealth` (3), `backToTour`. Reused unchanged (their copy already equals the prototype): `cvHeading` (Career headline), `toolboxHeading` (toolbox heading), `aboutHeading` (By day headline).

- [ ] **Step 1: Write the failing test**

In `tests/dictionary.test.ts`, change the `sharedKeys` line inside `'has no untranslated (en === th) string values…'` to:

```ts
    // backToTour is three project names and an arrow -- identical by design.
    const sharedKeys = new Set<string>(['backToTour']);
```

(If an earlier phase already added names to this set, add `'backToTour'` to it.) Then append inside the top-level `describe('dictionary', …)`:

```ts
  it('carries the Career band and By day copy from the approved prototype', () => {
    expect(dict.en.cvHeading).toBe('Where I have been, and what came of it.');
    expect(dict.en.toolboxHeading).toBe('What I actually work with.');
    expect(dict.en.aboutHeading).toBe('I like building things that are simple, and that stay running.');
    expect(dict.en.resumeLink).toBe('Résumé (PDF) ↗');
    expect(dict.en.storyEyebrow).toBe('By day');
    expect(dict.th.storyEyebrow).toBe('ตอนกลางวัน');
    expect(dict.en.monthsShort).toHaveLength(12);
    expect(dict.th.monthsShort).toHaveLength(12);
    expect(dict.th.monthsShort[2]).toBe('มี.ค.');
    expect(dict.en.storyPhases).toEqual([
      'Commercial terms',
      'Screen preparation',
      'Installation',
      'Sales readiness',
      'Post-launch audit',
    ]);
    expect(dict.th.storyPhases).toHaveLength(5);
    expect(dict.en.storyHealth).toEqual(['On track', 'At risk', 'Off track']);
    expect(dict.th.storyHealth).toHaveLength(3);
    expect(dict.en.toolLanguageNames).toEqual(['Thai', 'English (conversational)']);
    expect(dict.th.toolLanguageNames).toEqual(['ไทย', 'อังกฤษ (ระดับสนทนา)']);
  });
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/dictionary.test.ts`
Expected: FAIL — `resumeLink`, `storyEyebrow`, `monthsShort`… are undefined.

- [ ] **Step 3: Implement**

In `src/lib/dictionary.ts`, add as the last entries of the `en` object (just before its closing `};`, which is directly followed by `const th: typeof en = {`):

```ts
  // --- White Edition P3: Career band + By day ------------------------------
  // Copy from the approved prototype (design/white-edition/prototype). The
  // headlines reuse cvHeading / toolboxHeading / aboutHeading above, whose
  // copy is already the prototype's, rather than duplicating the strings.
  resumeLink: 'Résumé (PDF) ↗',
  // Describes public/suwichak-jarunopratamp-resume.pdf. Update it in the same
  // commit whenever that PDF is rebuilt (spec §3: rebuilt at ship time).
  resumeMeta: '2 pages · updated Aug 2026',
  careerNow: 'Now',
  careerPresent: 'Present',
  careerMonthsUnit: 'mo',
  careerEarlier: 'Earlier: ',
  careerDealLink: 'How a deal runs ↓',
  monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as readonly string[],
  toolboxStack: 'Works in',
  toolboxMethods: 'Focus',
  toolboxLanguages: 'Languages',
  toolLanguageNames: ['Thai', 'English (conversational)'] as readonly string[],
  storyEyebrow: 'By day',
  storyLead: 'One retail-media deal, start to finish, with the names taken out.',
  portraitAlt: 'Portrait of Suwichak (Klao)',
  storyPhasesLabel: 'Five launch phases',
  storyPhases: [
    'Commercial terms',
    'Screen preparation',
    'Installation',
    'Sales readiness',
    'Post-launch audit',
  ] as readonly string[],
  storyHealth: ['On track', 'At risk', 'Off track'] as readonly string[],
  backToTour: 'Aje · GoNai · klao-site ↑',
```

and as the last entries of the `th` object (just before its closing `};`, which is directly followed by `export type UiDict = typeof en;`):

```ts
  resumeLink: 'เรซูเม่ (PDF) ↗',
  resumeMeta: '2 หน้า · อัปเดต ส.ค. 2026',
  careerNow: 'ปัจจุบัน',
  careerPresent: 'ปัจจุบัน',
  careerMonthsUnit: 'เดือน',
  careerEarlier: 'ก่อนหน้า: ',
  careerDealLink: 'ดีลหนึ่งเดินอย่างไร ↓',
  monthsShort: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'] as readonly string[],
  toolboxStack: 'ใช้ทำงาน',
  toolboxMethods: 'ถนัด',
  toolboxLanguages: 'ภาษา',
  toolLanguageNames: ['ไทย', 'อังกฤษ (ระดับสนทนา)'] as readonly string[],
  storyEyebrow: 'ตอนกลางวัน',
  storyLead: 'ดีลสื่อในร้านค้าปลีกหนึ่งดีล ตั้งแต่ต้นจนจบ โดยตัดชื่อออกทั้งหมด',
  portraitAlt: 'ภาพของ Suwichak (Klao)',
  storyPhasesLabel: 'ห้าช่วงของการเปิดตัว',
  storyPhases: ['เงื่อนไขการค้า', 'เตรียมจอ', 'ติดตั้ง', 'พร้อมขาย', 'ตรวจหลังเปิดใช้งาน'] as readonly string[],
  storyHealth: ['ตามแผน', 'มีความเสี่ยง', 'หลุดแผน'] as readonly string[],
  backToTour: 'Aje · GoNai · klao-site ↑',
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/dictionary.test.ts && npx tsc --noEmit`
Expected: PASS (same key set in both locales; nothing untranslated except `backToTour`); `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dictionary.ts tests/dictionary.test.ts
git commit -m "feat(i18n): Career band and By day strings from the prototype (P3)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

> **Visual checks.** Tasks 8, 9 and 12 build sections that are not on the page yet. Their Playwright screenshot checks run in Task 10 (career) and Task 13 (By day), as soon as each section is wired in, and again in the Task 14 gate.

### Task 8: `CareerDetent` client island + career styles

**Files:**
- Create: `src/components/CareerDetent.tsx`
- Create: `src/components/career.css`
- Create: `tests/career-detent.test.tsx`

**Interfaces:**
- Consumes: `CAREER_EVENT`, `careerDates`, `findCareerIndex`, `labelAlign`, `monthsBetween`, `pillYears`, `railModel`, `splitFigureValue` (Task 6); dictionary keys (Task 7); `ThaiText` (C3); `CareerEntry` (Task 1).
- Produces: `export default function CareerDetent(props: { entries: CareerEntry[]; locale: Locale; now: string })`. DOM: `.car-rail` (aria-hidden; only when some entry has a start), `[role=tablist].car-pills[aria-labelledby=career-h]` with `.car-detent` and `button[role=tab]#career-tab-<i>.car-pill`, `#career-panel[role=tabpanel].car-panel[data-swap]`. Renders `null` for an empty list. Listens for `window` `klao:career` `{ detail: { key } }`: selects the matching pill, scrolls `#career` into view, focuses the pill. Arrow keys / Home / End move selection with focus (roving tabindex). The first entry is selected in the server HTML. `career.css` is imported by `CareerBand` (Task 9).

- [ ] **Step 1: Write the failing test**

Create `tests/career-detent.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CareerDetent from '@/components/CareerDetent';
import { CAREER_EVENT } from '@/lib/career';
import type { CareerEntry } from '@/lib/models';

// No RTL auto-cleanup in this project (see tests/hero.test.tsx).
afterEach(cleanup);

let scrolled: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  // jsdom has no layout, so scrollIntoView does not exist; record calls instead.
  scrolled = vi.fn();
  Element.prototype.scrollIntoView = scrolled as unknown as Element['scrollIntoView'];
});

// ThaiText keep-runs may use no-break spaces; compare on plain text.
const norm = (s: string | null | undefined): string =>
  (s ?? '').replace(/ /g, ' ').replace(/​/g, '').trim();

const entries: CareerEntry[] = [
  {
    id: 'e1',
    key: 'actmedia',
    role: { en: 'Senior Business Development', th: 'นักพัฒนาธุรกิจอาวุโส' },
    company: 'Actmedia',
    period: 'MAR 2026 – Present',
    start: '2026-03',
    end: null,
    figure: null,
    wins: { en: ['Opened new retail channels'], th: ['เปิดช่องทางค้าปลีกใหม่'] },
    order: 1,
  },
  {
    id: 'e2',
    key: 'casetify',
    role: { en: 'Brand Representative', th: 'ตัวแทนแบรนด์' },
    company: 'Casetify',
    period: 'MAY 2024 – MAR 2026',
    start: '2024-05',
    end: '2026-03',
    figure: {
      value: 'THB 1.1M',
      label: { en: 'My personal monthly sales target', th: 'เป้ายอดขายส่วนตัวต่อเดือน' },
      note: { en: 'Target met', th: 'ทำถึงเป้า' },
    },
    wins: { en: ['Ran the store on shift'], th: ['รันร้านในกะ'] },
    order: 2,
  },
  {
    id: 'e3',
    key: 'a-bun-dance',
    role: { en: 'Founder', th: 'ผู้ก่อตั้ง' },
    company: 'A Bun Dance',
    period: 'MAY 2021 – DEC 2022',
    start: '2021-05',
    end: '2022-12',
    figure: null,
    wins: { en: [], th: [] },
    order: 3,
  },
];

const tabs = () => screen.getAllByRole('tab');
const panel = () => screen.getByRole('tabpanel');
const selectedIndex = () => tabs().findIndex((t) => t.getAttribute('aria-selected') === 'true');

describe('CareerDetent', () => {
  it('selects the current role first and renders its panel (the server HTML state)', () => {
    render(<CareerDetent entries={entries} locale="en" now="2026-09" />);
    expect(tabs()).toHaveLength(3);
    expect(selectedIndex()).toBe(0);
    expect(tabs().map((t) => t.tabIndex)).toEqual([0, -1, -1]);
    expect(panel().id).toBe('career-panel');
    expect(panel().getAttribute('aria-labelledby')).toBe('career-tab-0');
    expect(panel().getAttribute('data-swap')).toBe('false');
    expect(norm(panel().querySelector('h3')?.textContent)).toBe('Actmedia');
    expect(norm(panel().querySelector('.car-role')?.textContent)).toBe('Senior Business Development');
    expect(norm(panel().querySelector('.car-dates')?.textContent)).toBe('Mar 2026 – Present · 7 mo');
    expect(norm(panel().querySelector('.car-wins')?.textContent)).toBe('Opened new retail channels');
    expect(norm(tabs()[0].querySelector('span')?.textContent)).toBe('2026 – now');
  });

  it('selects on click, slides the detent and shows the figure with its note and label', () => {
    const { container } = render(<CareerDetent entries={entries} locale="en" now="2026-09" />);
    fireEvent.click(tabs()[1]);
    expect(selectedIndex()).toBe(1);
    expect(panel().getAttribute('data-swap')).toBe('true');
    expect((container.querySelector('.car-detent') as HTMLElement).style.getPropertyValue('--dy')).toBe('64px');
    expect(panel().querySelector('.car-fig .u')?.textContent).toBe('THB');
    expect(norm(panel().querySelector('.car-fig')?.textContent)).toBe('THB 1.1M');
    expect(norm(panel().querySelector('.car-note')?.textContent)).toBe('Target met');
    expect(norm(panel().querySelector('.car-cap')?.textContent)).toBe('My personal monthly sales target');
  });

  it('moves selection and focus with arrow keys, wrapping, plus Home and End', () => {
    render(<CareerDetent entries={entries} locale="en" now="2026-09" />);
    tabs()[0].focus();
    fireEvent.keyDown(tabs()[0], { key: 'ArrowDown' });
    expect(selectedIndex()).toBe(1);
    expect(document.activeElement).toBe(tabs()[1]);
    expect(tabs().map((t) => t.tabIndex)).toEqual([-1, 0, -1]);
    fireEvent.keyDown(tabs()[1], { key: 'End' });
    expect(selectedIndex()).toBe(2);
    fireEvent.keyDown(tabs()[2], { key: 'ArrowRight' });
    expect(selectedIndex()).toBe(0);
    fireEvent.keyDown(tabs()[0], { key: 'ArrowUp' });
    expect(selectedIndex()).toBe(2);
    fireEvent.keyDown(tabs()[2], { key: 'Home' });
    expect(selectedIndex()).toBe(0);
    expect(document.activeElement).toBe(tabs()[0]);
    fireEvent.keyDown(tabs()[0], { key: 'Tab' });
    expect(selectedIndex()).toBe(0);
  });

  it('opens a role on klao:career (exact or prototype-style key) and scrolls the band into view', () => {
    render(
      <section id="career">
        <CareerDetent entries={entries} locale="en" now="2026-09" />
      </section>,
    );
    act(() => {
      window.dispatchEvent(new CustomEvent(CAREER_EVENT, { detail: { key: 'abundance' } }));
    });
    expect(selectedIndex()).toBe(2);
    expect(document.activeElement).toBe(tabs()[2]);
    expect(scrolled).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    act(() => {
      window.dispatchEvent(new CustomEvent(CAREER_EVENT, { detail: { key: 'casetify' } }));
    });
    expect(selectedIndex()).toBe(1);
  });

  it('ignores unknown keys, a missing detail and a non-string key', () => {
    render(<CareerDetent entries={entries} locale="en" now="2026-09" />);
    act(() => {
      window.dispatchEvent(new CustomEvent(CAREER_EVENT, { detail: { key: 'nope' } }));
      window.dispatchEvent(new CustomEvent(CAREER_EVENT));
      window.dispatchEvent(new CustomEvent(CAREER_EVENT, { detail: { key: 42 } }));
    });
    expect(selectedIndex()).toBe(0);
    expect(scrolled).not.toHaveBeenCalled();
  });

  it('draws the rail from the dates, with the marker on the selected role', () => {
    const { container } = render(<CareerDetent entries={entries} locale="en" now="2026-09" />);
    const rail = container.querySelector('.car-rail') as HTMLElement;
    expect(rail.getAttribute('aria-hidden')).toBe('true');
    expect(rail.querySelectorAll('.car-rseg')).toHaveLength(3);
    expect(rail.querySelectorAll('.car-rseg[data-on="true"]')).toHaveLength(1);
    expect(rail.querySelector('.car-rlab')?.textContent).toBe('Actmedia · 7 mo');
    const mx = (rail.querySelector('.car-rmark') as HTMLElement).style.getPropertyValue('--mx');
    expect(parseFloat(mx)).toBeCloseTo(94.6, 1);
    fireEvent.click(tabs()[1]);
    expect(container.querySelector('.car-rlab')?.textContent).toBe('Casetify · 23 mo');
    expect(container.querySelector('.car-ryears [data-now="true"]')?.textContent).toBe('Now');
  });

  it('takes "now" from its prop, never the client clock', () => {
    render(<CareerDetent entries={entries} locale="en" now="2026-12" />);
    expect(norm(panel().querySelector('.car-dates')?.textContent)).toBe('Mar 2026 – Present · 10 mo');
  });

  it('renders pre-migration entries (no dates) with their period text and no rail', () => {
    const undated = entries.map((e) => ({ ...e, start: null, end: null }));
    const { container } = render(<CareerDetent entries={undated} locale="en" now="2026-09" />);
    expect(container.querySelector('.car-rail')).toBeNull();
    expect(norm(panel().querySelector('.car-dates')?.textContent)).toBe('MAR 2026 – Present');
    expect(tabs()[0].querySelector('span')).toBeNull();
  });

  it('offers the deal link on the current role only, and an Earlier button that walks back', () => {
    render(<CareerDetent entries={entries} locale="en" now="2026-09" />);
    expect(panel().querySelector('a[href="#story"]')?.textContent).toBe('How a deal runs ↓');
    fireEvent.click(screen.getByRole('button', { name: 'Earlier: Casetify ›' }));
    expect(selectedIndex()).toBe(1);
    expect(document.activeElement).toBe(tabs()[1]);
    expect(panel().querySelector('a[href="#story"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Earlier: A Bun Dance ›' }));
    expect(screen.queryByRole('button', { name: /^Earlier:/ })).toBeNull();
  });

  it('uses Thai month names and units for locale th', () => {
    render(<CareerDetent entries={entries} locale="th" now="2026-09" />);
    expect(norm(panel().querySelector('.car-dates')?.textContent)).toBe('มี.ค. 2026 – ปัจจุบัน · 7 เดือน');
    expect(norm(tabs()[0].querySelector('span')?.textContent)).toBe('2026 – ปัจจุบัน');
    expect(norm(panel().querySelector('.car-role')?.textContent)).toBe('นักพัฒนาธุรกิจอาวุโส');
  });

  it('renders nothing for an empty career list', () => {
    const { container } = render(<CareerDetent entries={[]} locale="en" now="2026-09" />);
    expect(container.innerHTML).toBe('');
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/career-detent.test.tsx`
Expected: FAIL — `Cannot find module '@/components/CareerDetent'`.

- [ ] **Step 3: Implement**

Create `src/components/CareerDetent.tsx`:

```tsx
'use client';

import { Fragment, useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import ThaiText from '@/components/ThaiText';
import {
  CAREER_EVENT,
  careerDates,
  findCareerIndex,
  labelAlign,
  monthsBetween,
  pillYears,
  railModel,
  splitFigureValue,
} from '@/lib/career';
import { dict } from '@/lib/dictionary';
import type { CareerEntry, Locale } from '@/lib/models';

type Props = {
  entries: CareerEntry[];
  locale: Locale;
  // 'YYYY-MM', computed once on the server (currentYm). Durations use this,
  // never the client clock, so hydration always matches the server HTML.
  now: string;
};

// Desktop pill pitch: 56 px pill + 8 px gap. The server HTML places the
// detent with this so it already sits under the first pill before
// hydration; after hydration the real offset is measured (a pill that wraps
// to two lines is taller).
const PILL_PITCH = 64;

export default function CareerDetent({ entries, locale, now }: Props) {
  const t = dict[locale];
  const [selected, setSelected] = useState(0);
  // Only a visitor's own choice replays the panel entrance; the first paint
  // (server HTML and hydration) never animates.
  const [swapped, setSwapped] = useState(false);
  const pills = useRef<(HTMLButtonElement | null)[]>([]);
  const detent = useRef<HTMLSpanElement | null>(null);

  const select = useCallback((index: number, focus: boolean) => {
    setSelected(index);
    setSwapped(true);
    if (focus) pills.current[index]?.focus();
  }, []);

  useEffect(() => {
    const pill = pills.current[selected];
    const el = detent.current;
    // offsetHeight is 0 without layout (jsdom, display:none on phone): keep
    // the pitch-based position from render in that case.
    if (!pill || !el || pill.offsetHeight === 0) return;
    el.style.setProperty('--dy', `${pill.offsetTop}px`);
    el.style.height = `${pill.offsetHeight}px`;
  }, [selected]);

  useEffect(() => {
    // C8: FAQ answers, ⌘K and the footer open a role by key. A stale or
    // unknown key does nothing; it never throws and never opens the wrong role.
    const onCareer = (event: Event) => {
      const key = (event as CustomEvent<{ key?: unknown } | null>).detail?.key;
      const index = findCareerIndex(entries, typeof key === 'string' ? key : '');
      if (index < 0) return;
      select(index, false);
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.getElementById('career')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      pills.current[index]?.focus({ preventScroll: true });
    };
    window.addEventListener(CAREER_EVENT, onCareer);
    return () => window.removeEventListener(CAREER_EVENT, onCareer);
  }, [entries, select]);

  if (entries.length === 0) return null;

  const current = entries[Math.min(selected, entries.length - 1)];
  const next = entries[selected + 1];
  const rail = railModel(entries, now);
  const center = rail?.centers[selected] ?? null;
  const dates = careerDates(current, now, {
    months: t.monthsShort,
    present: t.careerPresent,
    unit: t.careerMonthsUnit,
  });
  const nowWord = t.careerNow.toLowerCase();

  // Tabs pattern with automatic activation: focus and selection move together.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = entries.length - 1;
    let to: number | null = null;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') to = selected >= last ? 0 : selected + 1;
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') to = selected <= 0 ? last : selected - 1;
    else if (event.key === 'Home') to = 0;
    else if (event.key === 'End') to = last;
    if (to === null) return;
    event.preventDefault();
    select(to, true);
  };

  return (
    <>
      {rail && (
        // Decorative: the pills below carry the same choice for keyboard and
        // screen readers.
        <div className="car-rail" aria-hidden="true">
          <span className="car-rtrack" />
          {rail.segments.map((segment) => (
            <span
              key={segment.index}
              className="car-rseg"
              data-on={segment.index === selected}
              style={{ left: `${segment.left}%`, width: `calc(${segment.width}% - 3px)` }}
            />
          ))}
          {center !== null && current.start && (
            <span className="car-rmark" style={{ ['--mx' as string]: `${center}%` }}>
              <i />
              <span className="car-rlab" data-align={labelAlign(center)}>
                {`${current.company} · ${monthsBetween(current.start, current.end ?? now)} ${t.careerMonthsUnit}`}
              </span>
            </span>
          )}
          <div className="car-ryears">
            {rail.ticks.map((tick) => (
              <span key={tick.year} data-first={tick.first} data-alt={tick.alt} style={{ left: `${tick.left}%` }}>
                {tick.year}
              </span>
            ))}
            <span data-now="true" style={{ left: '100%' }}>
              {t.careerNow}
            </span>
          </div>
        </div>
      )}
      <div className="car-grid">
        <div
          className="car-pills"
          role="tablist"
          aria-labelledby="career-h"
          aria-orientation="vertical"
          onKeyDown={onKeyDown}
        >
          <span
            ref={detent}
            className="car-detent"
            aria-hidden="true"
            style={{ ['--dy' as string]: `${selected * PILL_PITCH}px` }}
          />
          {entries.map((entry, index) => {
            const years = pillYears(entry, nowWord);
            return (
              <button
                key={entry.id}
                ref={(el) => {
                  pills.current[index] = el;
                }}
                type="button"
                role="tab"
                id={`career-tab-${index}`}
                className="car-pill"
                aria-selected={index === selected}
                aria-controls="career-panel"
                tabIndex={index === selected ? 0 : -1}
                onClick={() => select(index, false)}
              >
                <b>{entry.company}</b>
                {years && <span>{years}</span>}
              </button>
            );
          })}
        </div>
        {/* Keyed by the selection so a new role mounts fresh and the
            entrance (.car-panel[data-swap]) replays -- opacity + transform only. */}
        <div
          key={selected}
          id="career-panel"
          className="car-panel"
          role="tabpanel"
          aria-labelledby={`career-tab-${selected}`}
          tabIndex={0}
          data-swap={swapped}
        >
          <div className="car-ph">
            <div>
              <h3 className="t-panel">{current.company}</h3>
              <p className="car-role">
                <ThaiText text={current.role[locale]} />
              </p>
            </div>
            <p className="car-dates">
              <ThaiText text={dates} />
            </p>
          </div>
          {current.figure && (
            <>
              <p className="car-fig t-stat">
                {splitFigureValue(current.figure.value).map((part, k) => (
                  <Fragment key={k}>
                    {k > 0 && ' '}
                    {part.unit ? <span className="u">{part.text}</span> : part.text}
                  </Fragment>
                ))}
              </p>
              {current.figure.note && (
                <p className="car-note">
                  <ThaiText text={current.figure.note[locale]} />
                </p>
              )}
              {current.figure.label[locale] && (
                <p className="car-cap">
                  <ThaiText text={current.figure.label[locale]} />
                </p>
              )}
            </>
          )}
          {current.wins[locale].length > 0 && (
            <ul className="car-wins">
              {current.wins[locale].map((win, k) => (
                <li key={k}>
                  <ThaiText text={win} />
                </li>
              ))}
            </ul>
          )}
          {(selected === 0 || next) && (
            <div className="car-pf">
              {/* By day tells the current job's method, so only the first
                  (current) role links to it -- the prototype's `deal` flag. */}
              {selected === 0 && <a href="#story">{t.careerDealLink}</a>}
              {next && (
                <button type="button" onClick={() => select(selected + 1, true)}>
                  {`${t.careerEarlier}${next.company} ›`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
```

Create `src/components/career.css`:

```css
/* Career band (spec §6 "Career", §10 toolbox cut). Ported from the approved
   prototype's .car-h / .rail / .cgrid / .pb / .detent / .panel / .tools with
   P3 names (car-*). Headline, panel title and figure sizes come from the
   shared C9 classes (.t-h2 / .t-panel / .t-stat); this file sets only what
   is specific to the band.
   Global constraint: only transform and opacity animate. The prototype also
   faded the pill text colour; here the colour changes without a transition
   while the detent slides under it. The detent is kram (spec §5.1). */

.car-h { display: flex; justify-content: space-between; align-items: end; gap: 24px; }
.car-h .t-h2 { max-width: 13em; }
.car-res { flex: none; text-align: right; }
.car-res a { display: inline-flex; align-items: center; min-height: 44px; font-size: 17px; color: var(--link); text-decoration: none; }
.car-res a:hover { text-decoration: underline; }
.car-res small { display: block; font-size: 14px; line-height: 20px; color: var(--ink-2); }

/* Time rail. overflow: hidden clips the full-width marker box, whose
   translateX(%) is what lets the marker move with transform only. */
.car-rail { position: relative; height: 64px; margin-top: 36px; overflow: hidden; }
.car-rtrack { position: absolute; left: 0; right: 0; top: 30px; height: 4px; border-radius: 2px; background: var(--line); }
.car-rseg { position: absolute; top: 30px; height: 4px; border-radius: 2px; background: color-mix(in srgb, var(--ink-1) 30%, transparent); }
.car-rseg[data-on="true"] { background: var(--ink-1); }
.car-rmark { position: absolute; inset: 0; pointer-events: none; transform: translateX(var(--mx, 0%)); transition: transform var(--dur-ui) var(--ease-settle); }
.car-rmark i { position: absolute; top: 28px; left: -4px; width: 8px; height: 8px; border-radius: 50%; background: var(--ink-1); box-shadow: 0 0 0 2px var(--mist); }
.car-rlab { position: absolute; top: 2px; left: 0; white-space: nowrap; font-size: 12px; line-height: 16px; font-weight: 600; transform: translateX(-50%); }
.car-rlab[data-align="start"] { transform: translateX(-8px); }
.car-rlab[data-align="end"] { transform: translateX(calc(-100% + 8px)); }
.car-ryears { position: absolute; left: 0; right: 0; top: 44px; height: 16px; font-size: 12px; line-height: 16px; color: var(--ink-2); }
.car-ryears span { position: absolute; transform: translateX(-50%); }
.car-ryears span[data-first="true"] { transform: none; }
.car-ryears span[data-now="true"] { transform: translateX(-100%); }

/* Pills + detent + panel */
.car-grid { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 40px; margin-top: 28px; align-items: start; }
.car-pills { position: relative; display: flex; flex-direction: column; gap: 8px; }
.car-pill { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 56px; padding: 0 22px; border: 0; border-radius: 28px; background: transparent; box-shadow: inset 0 0 0 1px var(--line); color: var(--ink-1); font: inherit; text-align: left; cursor: pointer; transition: transform 220ms var(--ease-settle); }
.car-pill:active { transform: scale(.98); }
.car-pill:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.car-pill b { font-size: 17px; font-weight: 600; }
.car-pill span { font-size: 14px; color: var(--ink-2); white-space: nowrap; }
.car-pill[aria-selected="true"] { color: var(--on-kram); }
.car-pill[aria-selected="true"] span { color: color-mix(in srgb, var(--on-kram) 75%, transparent); }
.car-detent { position: absolute; left: 0; top: 0; width: 100%; height: 56px; border-radius: 28px; background: var(--kram); pointer-events: none; transform: translateY(var(--dy, 0px)); transition: transform var(--dur-ui) var(--ease-settle); }

.car-panel { min-height: 400px; padding: 36px 40px; border-radius: 28px; background: var(--card); }
.car-panel:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.car-panel[data-swap="true"] { animation: car-pin var(--dur-ui) var(--ease-settle) both; }
@keyframes car-pin { from { opacity: 0; transform: translateY(8px); } }
.car-ph { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: start; gap: 16px; }
.car-ph h3 { margin: 0; }
.car-role { margin: 4px 0 0; font-size: 19px; line-height: 25px; color: var(--ink-2); }
.car-role:not(:lang(th)) { letter-spacing: .012em; }
.car-dates { margin: 0; font-size: 14px; line-height: 20px; color: var(--ink-2); text-align: right; font-variant-numeric: tabular-nums; }
.car-fig { margin: 28px 0 0; }
.car-fig .u { font-size: .45em; color: var(--ink-2); letter-spacing: 0; }
.car-note { margin: 8px 0 0; font-size: 12px; line-height: 16px; color: var(--ink-2); }
.car-cap { margin: 10px 0 0; font-size: 17px; line-height: 25px; }
.car-wins { display: grid; gap: 14px; margin: 24px 0 0; padding: 0; list-style: none; }
.car-wins li { position: relative; padding-left: 20px; font-size: 17px; line-height: 26px; }
.car-wins li::before { content: ""; position: absolute; left: 2px; top: 11px; width: 5px; height: 5px; border-radius: 50%; background: var(--ink-3); }
.car-wins li:lang(th), .car-cap:lang(th) { line-height: 28px; }
.car-pf { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 28px; }
.car-pf a, .car-pf button { display: inline-flex; align-items: center; min-height: 44px; padding: 0; border: 0; background: none; font: inherit; font-size: 17px; color: var(--link); text-decoration: none; cursor: pointer; }
.car-pf a:hover, .car-pf button:hover { text-decoration: underline; }

/* Toolbox: one row, heading + three columns (spec §10: stack · methods · languages). */
#toolbox { scroll-margin-top: 96px; }
.car-tools { display: grid; grid-template-columns: 245px minmax(0, 1fr); gap: 24px; margin-top: 44px; padding-top: 32px; border-top: 1px solid var(--line); }
.car-tools h3 { margin: 0; font-size: 24px; line-height: 28px; font-weight: 600; }
.car-tools h3:not(:lang(th)) { letter-spacing: .009em; }
.car-tools h3:lang(th) { line-height: 34px; }
.car-tgrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 22px 32px; }
.car-tcell h4 { margin: 0 0 4px; font-size: 14px; line-height: 18px; font-weight: 600; color: var(--ink-2); }
.car-tcell p { margin: 0; font-size: 17px; line-height: 25px; }

@media (max-width: 1067px) {
  .car-tools { grid-template-columns: 1fr; }
}

@media (max-width: 734px) {
  .car-h { flex-direction: column; align-items: start; }
  .car-res { text-align: left; }
  .car-rail { height: 72px; }
  .car-rtrack, .car-rseg { top: 34px; }
  .car-rmark i { top: 32px; }
  .car-rlab { font-size: 14px; line-height: 20px; }
  .car-ryears { top: 48px; height: 20px; font-size: 14px; line-height: 20px; }
  .car-ryears span[data-alt="true"] { display: none; }
  .car-grid { grid-template-columns: 1fr; gap: 20px; }
  .car-pills { flex-direction: row; flex-wrap: wrap; }
  .car-detent { display: none; }
  .car-pill { min-height: 44px; padding: 0 16px; }
  .car-pill b { font-size: 16px; }
  .car-pill span { display: none; }
  .car-pill[aria-selected="true"] { background: var(--kram); }
  .car-panel { min-height: 0; padding: 28px 22px; border-radius: 24px; }
  .car-dates { text-align: left; }
  .car-fig.t-stat { font-size: 40px; line-height: 44px; }
  .car-note { font-size: 14px; line-height: 20px; }
  .car-wins li { font-size: 16px; line-height: 25px; }
  .car-wins li:lang(th) { line-height: 27px; }
  .car-tools { margin-top: 40px; }
  .car-tgrid { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .car-rmark, .car-detent, .car-pill { transition: none; }
  .car-panel[data-swap="true"] { animation: none; }
}
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/career-detent.test.tsx && npx tsc --noEmit && npx eslint src/components/CareerDetent.tsx`
Expected: PASS; `tsc` and `eslint` print nothing.

- [ ] **Step 5: Commit**

```bash
git add src/components/CareerDetent.tsx src/components/career.css tests/career-detent.test.tsx
git commit -m "feat(career): CareerDetent island with rail, pills, detent and panel (P3)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 9: `CareerBand` server section

**Files:**
- Create: `src/components/sections/CareerBand.tsx`
- Create: `tests/career-band.test.tsx`

**Interfaces:**
- Consumes: `CareerDetent` (Task 8), `career.css` (Task 8), `currentYm`, `toolboxColumns` (Task 6), `Reveal` (C9, P0), `ThaiText` (C3), dictionary (Task 7).
- Produces: `export default function CareerBand(props: { entries: CareerEntry[]; skills: Skill[]; locale: Locale; resumeUrl: string | null; now?: string })` rendering `<section id="career" class="band" aria-labelledby="career-h">` → `.wrap` → head (`h2#career-h.t-h2` + résumé block when `resumeUrl`), `CareerDetent`, `#toolbox` (only when some column has items). `now` defaults to `currentYm()`.

- [ ] **Step 1: Write the failing test**

Create `tests/career-band.test.tsx`:

```tsx
// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CareerBand from '@/components/sections/CareerBand';
import careerFixture from '@/content/fixtures/career.json';
import skillsFixture from '@/content/fixtures/skills.json';
import { dict } from '@/lib/dictionary';
import type { CareerEntry, Skill } from '@/lib/models';

afterEach(cleanup);

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

const entries = careerFixture as CareerEntry[];
const skills = skillsFixture as Skill[];
const norm = (s: string | null | undefined): string =>
  (s ?? '').replace(/ /g, ' ').replace(/​/g, '').trim();

describe('CareerBand', () => {
  it('ships the headline, résumé line, the current role panel and the toolbox in server HTML (no JS)', () => {
    // Master Review Focus #4: everything is in the markup; nothing is hidden inline.
    const html = renderToStaticMarkup(
      <CareerBand entries={entries} skills={skills} locale="en" resumeUrl="/r.pdf" now="2026-09" />,
    );
    expect(html).toContain('id="career"');
    expect(html).toContain('aria-labelledby="career-h"');
    expect(html).toContain(dict.en.cvHeading);
    expect(html).toContain('href="/r.pdf"');
    expect(html).toContain(dict.en.resumeMeta);
    expect(html).toContain('Senior Business Development');
    expect(html).toContain('Found 3–4 new channel opportunities');
    expect(html).toContain('Mar 2026 – Present · 7 mo');
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html).toContain('id="toolbox"');
    expect(html).not.toMatch(/opacity:\s*0/);
  });

  it('lays the toolbox out as stack · methods · languages in one row', () => {
    const { container } = render(
      <CareerBand entries={entries} skills={skills} locale="en" resumeUrl="/r.pdf" now="2026-09" />,
    );
    const toolbox = container.querySelector('#toolbox') as HTMLElement;
    expect(norm(toolbox.querySelector('h3')?.textContent)).toBe(dict.en.toolboxHeading);
    const cells = [...toolbox.querySelectorAll('.car-tcell')];
    expect(cells.map((c) => c.querySelector('h4')?.textContent)).toEqual(['Works in', 'Focus', 'Languages']);
    expect(norm(cells[0].querySelector('p')?.textContent)).toBe(
      'Salesforce · Excel & Sheets modeling · Power BI · Python · SQL · Next.js · Supabase · Notion API · Vercel · Swift',
    );
    expect(norm(cells[1].querySelector('p')?.textContent)).toBe(
      'AI-assisted building (Claude) · Sales forecasting · Retail media & shopper media · PMO / project delivery',
    );
    expect(norm(cells[2].querySelector('p')?.textContent)).toBe('Thai · English (conversational)');
  });

  it('renders Thai headings, labels and the résumé link for locale th', () => {
    const { container } = render(
      <CareerBand entries={entries} skills={skills} locale="th" resumeUrl="/r.pdf" now="2026-09" />,
    );
    expect(norm(container.querySelector('#career-h')?.textContent)).toBe(dict.th.cvHeading);
    expect(container.querySelector('.car-res a')?.textContent).toBe(dict.th.resumeLink);
    expect([...container.querySelectorAll('#toolbox h4')].map((h) => h.textContent)).toEqual(['ใช้ทำงาน', 'ถนัด', 'ภาษา']);
  });

  it('omits the résumé block when there is no résumé URL', () => {
    const { container } = render(
      <CareerBand entries={entries} skills={skills} locale="en" resumeUrl={null} now="2026-09" />,
    );
    expect(container.querySelector('.car-res')).toBeNull();
  });

  it('keeps the headline and toolbox when Notion has no career rows yet', () => {
    const { container } = render(<CareerBand entries={[]} skills={skills} locale="en" resumeUrl="/r.pdf" now="2026-09" />);
    expect(container.querySelector('#career-h')).not.toBeNull();
    expect(container.querySelector('[role="tablist"]')).toBeNull();
    expect(container.querySelector('#toolbox')).not.toBeNull();
  });

  it('animates only transform and opacity (global constraint)', () => {
    const css = readFileSync(join(process.cwd(), 'src/components/career.css'), 'utf8');
    const transitions = [...css.matchAll(/transition:\s*([^;]+);/g)].map((m) => m[1]);
    expect(transitions.length).toBeGreaterThan(0);
    for (const value of transitions) {
      for (const part of value.split(',')) expect(['transform', 'opacity', 'none']).toContain(part.trim().split(/\s+/)[0]);
    }
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/career-band.test.tsx`
Expected: FAIL — `Cannot find module '@/components/sections/CareerBand'`.

- [ ] **Step 3: Implement**

Create `src/components/sections/CareerBand.tsx`:

```tsx
import CareerDetent from '@/components/CareerDetent';
import Reveal from '@/components/motion/Reveal';
import ThaiText from '@/components/ThaiText';
import { currentYm, toolboxColumns } from '@/lib/career';
import { dict } from '@/lib/dictionary';
import type { CareerEntry, Locale, Skill } from '@/lib/models';
import '../career.css';

type Props = {
  entries: CareerEntry[];
  skills: Skill[];
  locale: Locale;
  resumeUrl: string | null;
  // Tests pin the month; the page lets it default to the render time, which
  // ISR refreshes about hourly.
  now?: string;
};

// Server component (spec §6 Career, C7 `#career`): the mist band with the
// head, the rail/pills/panel island and the one-row toolbox. The island is
// the only client code; its first render (the current role) is in the
// server HTML, so the band reads fully without JavaScript.
export default function CareerBand({ entries, skills, locale, resumeUrl, now = currentYm() }: Props) {
  const t = dict[locale];
  const columns = toolboxColumns(
    skills,
    { stack: t.toolboxStack, methods: t.toolboxMethods, languages: t.toolboxLanguages },
    t.toolLanguageNames,
  );

  return (
    <section id="career" className="band" aria-labelledby="career-h">
      <div className="wrap">
        <Reveal className="car-h">
          {/* cvHeading carries the prototype's career headline verbatim. */}
          <h2 id="career-h" className="t-h2">
            <ThaiText text={t.cvHeading} />
          </h2>
          {resumeUrl && (
            <div className="car-res">
              <a href={resumeUrl} target="_blank" rel="noopener">
                {t.resumeLink}
              </a>
              <small>
                <ThaiText text={t.resumeMeta} />
              </small>
            </div>
          )}
        </Reveal>
        <CareerDetent entries={entries} locale={locale} now={now} />
        {columns.length > 0 && (
          <div id="toolbox">
            <Reveal className="car-tools">
              <h3>
                <ThaiText text={t.toolboxHeading} />
              </h3>
              <div className="car-tgrid">
                {columns.map((column) => (
                  <div key={column.id} className="car-tcell">
                    <h4>{column.label}</h4>
                    <p>
                      <ThaiText text={column.items.join(' · ')} />
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/career-band.test.tsx tests/career-detent.test.tsx && npx tsc --noEmit`
Expected: PASS; `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/CareerBand.tsx tests/career-band.test.tsx
git commit -m "feat(career): CareerBand section with résumé head and one-row toolbox (P3)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 10: Put CareerBand on the page; retire CvBand and SkillsBand; `/career` → `#career`

**Files:**
- Modify: `src/app/[locale]/page.tsx` (imports; JSX; the comment block above `<ClientsBand …/>`)
- Modify: `next.config.ts` (the one redirect)
- Modify: `src/lib/dictionary.ts` (delete dead keys in `en` and `th`)
- Modify: `tests/smoke.test.tsx` (two career assertions)
- Create: `tests/next-config.test.ts`
- Delete: `src/components/sections/CvBand.tsx`, `src/components/sections/SkillsBand.tsx`, `src/components/sections/skill-icons.tsx`, `tests/cv-band.test.tsx`, `tests/skills-band.test.tsx`

**Interfaces:**
- Consumes: `CareerBand` (Task 9); `getCareer`, `getSkills`, `getProfile` (already fetched by the page).
- Produces: home page order `… #work → #career …` (C7); exactly one `id="toolbox"`; redirect `{ source: '/:locale(en|th)/career', destination: '/:locale#career', permanent: false }`.

- [ ] **Step 1: Write the failing test**

Create `tests/next-config.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config';

describe('next.config redirects', () => {
  it('sends the retired /career route to the career band anchor (C7)', async () => {
    const redirects = await nextConfig.redirects!();
    expect(redirects).toContainEqual({
      source: '/:locale(en|th)/career',
      destination: '/:locale#career',
      permanent: false,
    });
  });
});
```

In `tests/smoke.test.tsx`, inside `'renders locale-correct heading text on each static page…'`, replace

```ts
      expect(homeText).toContain(t.career); // CvBand's eyebrow
```

with

```ts
      // CareerBand (P3): the section, its toolbox anchor and -- on /en --
      // the headline (Thai headings go through ThaiText keep-spans, so only
      // the Latin string is a contiguous substring of the HTML).
      expect(homeText).toContain('id="career"');
      expect(homeText).toContain('id="toolbox"');
      if (locale === 'en') expect(homeText).toContain(t.cvHeading);
```

and replace

```ts
      expect(homeText).not.toContain(other.career);
```

with

```ts
      expect(homeText).not.toContain(other.cvHeading);
```

(If an earlier phase already reworded these two lines, keep its wording and apply the same intent: assert `id="career"`/`id="toolbox"` present and the other locale's career headline absent.)

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/next-config.test.ts tests/smoke.test.tsx`
Expected: FAIL — the redirect still points at `#cv`; the home page has no `id="career"` yet.

- [ ] **Step 3: Implement**

`src/app/[locale]/page.tsx`:

1. Remove the imports `import CvBand from '@/components/sections/CvBand';` and `import SkillsBand from '@/components/sections/SkillsBand';`; add `import CareerBand from '@/components/sections/CareerBand';` (keep the imports alphabetical).
2. Remove the JSX lines `<SkillsBand skills={skills} locale={locale} />` and `<CvBand entries={career} locale={locale} resumeUrl={profile.resumeUrl} />`.
3. On the line directly after the `<ProjectsIndex … />` element (P2), insert:

```tsx
      {/* C7: what he shipped (#work), then where he has worked (#career).
          The toolbox lives inside the career band (#toolbox). */}
      <CareerBand entries={career} skills={skills} locale={locale} resumeUrl={profile.resumeUrl} />
```

4. Replace the comment block directly above `<ClientsBand clients={profile.clients} locale={locale} />` (the one that begins "Sits right before the Skills/CV pair on purpose") with:

```tsx
      {/* Renders nothing while profile.clients is empty (spec §4: kept in
          code, not on the page). */}
```

`next.config.ts`: replace

```ts
      { source: '/:locale(en|th)/career', destination: '/:locale#cv', permanent: false },
```

with

```ts
      // White Edition P3 (C7): the career section's anchor is #career now.
      { source: '/:locale(en|th)/career', destination: '/:locale#career', permanent: false },
```

Delete the retired components and their tests:

```bash
git rm src/components/sections/CvBand.tsx src/components/sections/SkillsBand.tsx src/components/sections/skill-icons.tsx tests/cv-band.test.tsx tests/skills-band.test.tsx
grep -rnE "from '@/components/sections/(CvBand|SkillsBand|skill-icons)'" src tests   # expect: no output
```

Delete dictionary keys that only those components read. First confirm nothing else reads them:

```bash
for k in statRoles statCompanies statWins statLanguages tierDaily tierWorking tierBasic tierLearning toolsLabel careerUnpublished; do grep -rn "\.$k\b" src tests; done   # expect: no output
```

Then, in `src/lib/dictionary.ts`, delete these keys from **both** `en` and `th`, with the comment lines directly above them that describe only them: `statRoles`, `statCompanies`, `statWins`, `statLanguages` (and the "T10: CvBand's stat grid…" comment), `tierDaily`, `tierWorking`, `tierBasic`, `tierLearning`, `toolsLabel` (and the "Toolbox redesign, owner decision 2026-08-12…" comment), `careerUnpublished`. Keep `cvHeading`, `toolbox`, `toolboxHeading` (still read, or kept for later phases). If the grep above printed a use for any key, keep that key.

`src/app/[locale]/career/page.tsx` needs no change: it reads only `role`, `company`, `period`, `wins`, which still exist.

- [ ] **Step 4: Run and pass**

Run: `npx vitest run && npx tsc --noEmit && npx eslint .`
Expected: all PASS; `tsc`/`eslint` print nothing (the dictionary key-set test stays green because the same keys left both locales).

- [ ] **Step 5: Screenshot check (career band, every pill)**

Start the dev server and run the career capture script (screenshots go to `/tmp/klao-qa/`, never the repo):

```bash
mkdir -p /tmp/klao-qa
cat > /tmp/klao-qa/p3-career.mjs <<'EOF'
// P3 QA: career band, every pill, 1440×900 + 390×844, EN/TH, light/dark.
import { chromium } from '/Users/suvichakjarunopratamp/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:3000';
const OUT = '/tmp/klao-qa/p3';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const report = [];
for (const [width, height, size] of [[1440, 900, 'desk'], [390, 844, 'phone']]) {
  for (const locale of ['en', 'th']) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, deviceScaleFactor: 2 });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      await page.goto(`${BASE}/${locale}`, { waitUntil: 'networkidle' });
      const band = page.locator('#career');
      await band.scrollIntoViewIfNeeded();
      await page.waitForTimeout(900); // head reveal settles
      const tabs = band.getByRole('tab');
      const count = await tabs.count();
      for (let i = 0; i < count; i++) {
        await tabs.nth(i).click();
        await page.waitForTimeout(450); // detent + panel settle (320 ms)
        await band.screenshot({ path: `${OUT}/career-${size}-${locale}-${scheme}-${i + 1}.png` });
      }
      await tabs.nth(0).click();
      await tabs.nth(0).focus();
      await page.keyboard.press('ArrowDown');
      const afterArrow = await band.locator('[role="tab"][aria-selected="true"]').getAttribute('id');
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('klao:career', { detail: { key: 'abundance' } })));
      await page.waitForTimeout(600);
      const afterEvent = await band.locator('[role="tab"][aria-selected="true"]').getAttribute('id');
      const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      const toolboxIds = await page.evaluate(() => document.querySelectorAll('#toolbox').length);
      report.push({ size, locale, scheme, tabs: count, afterArrow, afterEvent, overflowX, toolboxIds, errors });
      await ctx.close();
    }
  }
}
await browser.close();
console.log(JSON.stringify(report, null, 2));
EOF
(npm run dev > /tmp/klao-qa/dev.log 2>&1 &)
until curl -sf -o /dev/null http://localhost:3000/en; do sleep 1; done
node /tmp/klao-qa/p3-career.mjs
pkill -f "next dev"
```

Expected report for all 8 combinations: `tabs: 5`, `afterArrow: "career-tab-1"`, `afterEvent: "career-tab-4"`, `overflowX: false`, `toolboxIds: 1`, `errors: []`. (If port 3000 was busy, `dev.log` names the port: rerun the script with `BASE=http://localhost:<port>`.)

Open the PNGs in `/tmp/klao-qa/p3/` (Read tool) and check: the kram detent sits exactly under the selected pill and its text is legible in both themes; on phone the pills wrap and the selected one is filled; the rail marker sits over the selected role's segment with its label fully inside the rail; Casetify and A Bun Dance show the large figure with the small unit, the note and the label; the toolbox is one row (heading + three columns) at 1440 and stacked at 390; Thai is not broken mid-word. Fix anything off before committing.

- [ ] **Step 6: Commit**

```bash
git add "src/app/[locale]/page.tsx" next.config.ts src/lib/dictionary.ts tests/smoke.test.tsx tests/next-config.test.ts
git commit -m "feat(home): Career band replaces CV and Skills bands; /career redirects to #career (P3)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

(The `git rm` deletions are already staged.)

---

### Task 11: `BoldText` (safe `**bold**` rendering)

**Files:**
- Create: `src/lib/bold.ts`
- Create: `src/components/BoldText.tsx`
- Create: `tests/bold-text.test.tsx`

**Interfaces:**
- Consumes: `ThaiText` (C3).
- Produces:
  ```ts
  export interface BoldSegment { text: string; bold: boolean }
  export function splitBold(input: string): BoldSegment[]; // '**x**' pairs → bold; unclosed/empty markers stay literal; '' → []
  export default function BoldText(props: { text: string }): JSX.Element; // <strong> for bold segments, ThaiText for every segment
  ```

- [ ] **Step 1: Write the failing test**

Create `tests/bold-text.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import BoldText from '@/components/BoldText';
import { splitBold } from '@/lib/bold';

afterEach(cleanup);

const norm = (s: string | null | undefined): string => (s ?? '').replace(/ /g, ' ').replace(/​/g, '');

describe('splitBold', () => {
  it('returns plain text as one segment and nothing for an empty string', () => {
    expect(splitBold('plain')).toEqual([{ text: 'plain', bold: false }]);
    expect(splitBold('')).toEqual([]);
  });

  it('splits the bold clause out of a sentence', () => {
    expect(splitBold('I scope first, and **the NDA comes first.**')).toEqual([
      { text: 'I scope first, and ', bold: false },
      { text: 'the NDA comes first.', bold: true },
    ]);
  });

  it('handles a clause at the start and several clauses', () => {
    expect(splitBold('**A** then **B** end')).toEqual([
      { text: 'A', bold: true },
      { text: ' then ', bold: false },
      { text: 'B', bold: true },
      { text: ' end', bold: false },
    ]);
  });

  it('leaves an unclosed or empty marker as literal text', () => {
    expect(splitBold('a **b')).toEqual([{ text: 'a **b', bold: false }]);
    expect(splitBold('a **** b')).toEqual([{ text: 'a **** b', bold: false }]);
  });
});

describe('BoldText', () => {
  it('wraps the bold clause in <strong> and keeps the rest as text', () => {
    const { container } = render(<BoldText text="I scope first, and **the NDA comes first.**" />);
    expect(container.querySelectorAll('strong')).toHaveLength(1);
    expect(norm(container.querySelector('strong')?.textContent)).toBe('the NDA comes first.');
    expect(norm(container.textContent)).toBe('I scope first, and the NDA comes first.');
  });

  it('renders a Thai clause glued to the word before it', () => {
    const { container } = render(<BoldText text="ประเมินสิ่งที่ทำได้จริงก่อน และ**เซ็น NDA ก่อนแลกข้อมูลกันเสมอ**" />);
    expect(norm(container.querySelector('strong')?.textContent)).toBe('เซ็น NDA ก่อนแลกข้อมูลกันเสมอ');
    expect(norm(container.textContent)).toBe('ประเมินสิ่งที่ทำได้จริงก่อน และเซ็น NDA ก่อนแลกข้อมูลกันเสมอ');
  });

  it('renders HTML-looking Notion text as text, never as markup', () => {
    const { container } = render(<BoldText text="<img src=x onerror=alert(1)> **ok**" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('renders an empty string without throwing', () => {
    const { container } = render(<BoldText text="" />);
    expect(container.textContent).toBe('');
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/bold-text.test.tsx`
Expected: FAIL — `Cannot find module '@/components/BoldText'`.

- [ ] **Step 3: Implement**

Create `src/lib/bold.ts`:

```ts
export interface BoldSegment {
  text: string;
  bold: boolean;
}

// Notion copy marks its one key clause with **…** (spec §7: Story BodyEN/TH,
// Profile PrologueEN/TH). A pair needs at least one character between the
// markers; an unclosed or empty pair stays literal, so a half-typed edit in
// Notion shows up as-is on the page (and gets noticed) instead of bolding the
// rest of the paragraph.
export function splitBold(input: string): BoldSegment[] {
  const out: BoldSegment[] = [];
  const pair = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pair.exec(input)) !== null) {
    if (match.index > last) out.push({ text: input.slice(last, match.index), bold: false });
    out.push({ text: match[1], bold: true });
    last = match.index + match[0].length;
  }
  if (last < input.length) out.push({ text: input.slice(last), bold: false });
  return out;
}
```

Create `src/components/BoldText.tsx`:

```tsx
import { Fragment } from 'react';
import ThaiText from '@/components/ThaiText';
import { splitBold } from '@/lib/bold';

// Renders Notion text whose one key clause is marked **…**. The markers
// become real <strong> elements -- never dangerouslySetInnerHTML -- so
// anything HTML-shaped in Notion renders as text, and every segment still
// gets Thai keep-runs through ThaiText (C3). No hooks: usable from server
// components.
export default function BoldText({ text }: { text: string }) {
  return (
    <>
      {splitBold(text).map((segment, i) =>
        segment.bold ? (
          <strong key={i}>
            <ThaiText text={segment.text} />
          </strong>
        ) : (
          <Fragment key={i}>
            <ThaiText text={segment.text} />
          </Fragment>
        ),
      )}
    </>
  );
}
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/bold-text.test.tsx && npx tsc --noEmit`
Expected: PASS; `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bold.ts src/components/BoldText.tsx tests/bold-text.test.tsx
git commit -m "feat(ui): BoldText renders **clause** as <strong> without innerHTML (P3)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 12: `ByDay` section

**Files:**
- Create: `src/components/sections/ByDay.tsx`
- Create: `src/components/by-day.css`
- Create: `tests/by-day.test.tsx`

**Interfaces:**
- Consumes: `BoldText` (Task 11), `isStoryIcon`, `isStorySketch` (Task 4), `Icon` (C4), `Sketch` (C4), `Reveal` (C9), `ThaiText` (C3), dictionary (`aboutHeading`, Task 7 keys), `Profile.prologue/closingLine/photoSrc/headline` (Task 3), `StoryChapter` (Task 4).
- Produces: `export default function ByDay(props: { profile: Profile; chapters: StoryChapter[]; locale: Locale })` rendering `<section id="story" class="section wrap" aria-labelledby="story-h">`: prologue (`.t-eyebrow` "By day", `h2#story-h.t-h2`, `.t-lead`, `.bd-about` from `profile.prologue`, portrait `img.bd-portrait` 240×240 when `photoSrc`), `ol.bd-chapters` of `li.bd-ch` (number, `.bd-rule` with icon + label, `.bd-sk` sketch, `h3.t-title`, `.bd-body` via `BoldText`; the **last** chapter adds `ol.bd-phases[aria-label]` + `ul.bd-legend`), closing `.bd-closing.t-h2` (`profile.closingLine ?? profile.headline`) + `a[href="#top"]`. No `<ol>` when there are no chapters.

- [ ] **Step 1: Write the failing test**

Create `tests/by-day.test.tsx`:

```tsx
// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ByDay from '@/components/sections/ByDay';
import profileFixture from '@/content/fixtures/profile.json';
import storyFixture from '@/content/fixtures/story.json';
import { dict } from '@/lib/dictionary';
import type { Profile, StoryChapter } from '@/lib/models';

afterEach(cleanup);

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

const profile = profileFixture as Profile;
const chapters = storyFixture as StoryChapter[];
const norm = (s: string | null | undefined): string =>
  (s ?? '').replace(/ /g, ' ').replace(/​/g, '').trim();

describe('ByDay', () => {
  it('renders the prologue: eyebrow, headline, lead, the owner-side story with its bold clause, portrait', () => {
    const { container } = render(<ByDay profile={profile} chapters={chapters} locale="en" />);
    const section = container.querySelector('section#story') as HTMLElement;
    expect(section.getAttribute('aria-labelledby')).toBe('story-h');
    expect(norm(section.querySelector('.t-eyebrow')?.textContent)).toBe('By day');
    expect(norm(section.querySelector('h2#story-h')?.textContent)).toBe(dict.en.aboutHeading);
    expect(norm(section.querySelector('.t-lead')?.textContent)).toBe(dict.en.storyLead);
    expect(norm(section.querySelector('.bd-about strong')?.textContent)).toBe(
      'Now I do business development at Actmedia by day, and build my own tools at night.',
    );
    const img = section.querySelector('img.bd-portrait') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(profile.photoSrc);
    expect(img.getAttribute('width')).toBe('240');
    expect(img.getAttribute('height')).toBe('240');
    expect(img.getAttribute('alt')).toBe(dict.en.portraitAlt);
  });

  it('renders six numbered chapters in order, each with rule, icon, title and one bold clause', () => {
    const { container } = render(<ByDay profile={profile} chapters={chapters} locale="en" />);
    const items = [...container.querySelectorAll('ol.bd-chapters > li')];
    expect(items).toHaveLength(6);
    expect(items.map((li) => li.querySelector('.bd-num')?.textContent)).toEqual(['01', '02', '03', '04', '05', '06']);
    expect(norm(items[0].querySelector('h3')?.textContent)).toBe('Find the room.');
    expect(norm(items[0].querySelector('.bd-rule')?.textContent)).toBe('Scope it honestly.');
    expect(items[0].querySelector('.bd-rule svg')).not.toBeNull();
    expect(items[0].querySelector('.bd-sk svg')).not.toBeNull();
    for (const li of items) expect(li.querySelectorAll('.bd-body strong')).toHaveLength(1);
  });

  it('gives only the last chapter the five-phase strip and the three health words', () => {
    const { container } = render(<ByDay profile={profile} chapters={chapters} locale="en" />);
    const items = [...container.querySelectorAll('ol.bd-chapters > li')];
    const phases = items[5].querySelector('ol.bd-phases') as HTMLElement;
    expect(phases.getAttribute('aria-label')).toBe(dict.en.storyPhasesLabel);
    expect([...phases.querySelectorAll('li')].map((li) => norm(li.textContent))).toEqual([...dict.en.storyPhases]);
    expect([...items[5].querySelectorAll('.bd-legend li')].map((li) => norm(li.textContent))).toEqual([
      ...dict.en.storyHealth,
    ]);
    expect(items[5].querySelector('.bd-sk svg')).toBeNull();
    for (const li of items.slice(0, 5)) expect(li.querySelector('.bd-phases')).toBeNull();
  });

  it('closes with the Notion closing line and a link back to the tour', () => {
    const { container } = render(<ByDay profile={profile} chapters={chapters} locale="en" />);
    expect(norm(container.querySelector('.bd-closing')?.textContent)).toBe('Business developer who builds his own tools.');
    expect(container.querySelector('.bd-close a[href="#top"]')?.textContent).toBe(dict.en.backToTour);
  });

  it('renders Thai copy for locale th, with the | break marker removed', () => {
    const { container } = render(<ByDay profile={profile} chapters={chapters} locale="th" />);
    expect(norm(container.querySelector('.t-eyebrow')?.textContent)).toBe('ตอนกลางวัน');
    expect(norm(container.querySelector('ol.bd-chapters > li h3')?.textContent)).toBe('หาห้องที่ใช่');
    const closing = norm(container.querySelector('.bd-closing')?.textContent);
    expect(closing).toBe('นัก Business Development ที่สร้างเครื่องมือใช้เอง');
    expect(closing).not.toContain('|');
  });

  it('closes on the headline and drops the story paragraph for a pre-migration profile', () => {
    const bare: Profile = { ...profile, prologue: null, closingLine: null };
    const { container } = render(<ByDay profile={bare} chapters={chapters} locale="en" />);
    expect(container.querySelector('.bd-about')).toBeNull();
    expect(norm(container.querySelector('.bd-closing')?.textContent)).toBe(profile.headline.en);
  });

  it('omits the chapter list (never an empty <ol>) when there are no chapters, and the portrait when there is no photo', () => {
    const { container } = render(<ByDay profile={{ ...profile, photoSrc: null }} chapters={[]} locale="en" />);
    expect(container.querySelector('ol')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('h2#story-h')).not.toBeNull();
    expect(container.querySelector('.bd-closing')).not.toBeNull();
  });

  it('renders a chapter with unknown Icon/Sketch names without them, and without throwing', () => {
    const odd: StoryChapter = { ...chapters[0], id: 'odd', icon: 'not-an-icon', sketch: 'nope' };
    const { container } = render(<ByDay profile={profile} chapters={[odd]} locale="en" />);
    const li = container.querySelector('ol.bd-chapters > li') as HTMLElement;
    expect(li.querySelector('.bd-rule svg')).toBeNull();
    expect(li.querySelector('.bd-sk svg')).toBeNull();
    expect(norm(li.querySelector('h3')?.textContent)).toBe('Find the room.');
  });

  it('renders HTML-looking Notion body text as text', () => {
    const odd: StoryChapter = { ...chapters[0], id: 'html', body: { en: '<img src=x onerror=alert(1)> **ok**', th: '' } };
    const { container } = render(<ByDay profile={profile} chapters={[odd]} locale="en" />);
    expect(container.querySelector('.bd-body img')).toBeNull();
    expect(container.querySelector('.bd-body')?.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('ships every chapter in the server HTML with nothing hidden inline (no JS)', () => {
    // Master Review Focus #4.
    const html = renderToStaticMarkup(<ByDay profile={profile} chapters={chapters} locale="en" />);
    expect(html).toContain('id="story"');
    for (const c of chapters) expect(html).toContain(c.title.en);
    expect(html).toContain('Post-launch audit');
    expect(html).not.toMatch(/opacity:\s*0/);
  });

  it('keeps the spec §10 layout: two columns from 1068 px, 48 px between chapters on phone, no transitions', () => {
    const css = readFileSync(join(process.cwd(), 'src/components/by-day.css'), 'utf8');
    const wide = css.slice(css.indexOf('@media (min-width: 1068px)'));
    expect(wide).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    const phone = css.slice(css.indexOf('@media (max-width: 734px)'));
    expect(phone).toMatch(/\.bd-ch \{[^}]*margin-bottom: 48px/);
    expect(css).not.toMatch(/transition:/);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/by-day.test.tsx`
Expected: FAIL — `Cannot find module '@/components/sections/ByDay'`.

- [ ] **Step 3: Implement**

Create `src/components/sections/ByDay.tsx`:

```tsx
import BoldText from '@/components/BoldText';
import { Icon } from '@/components/icons';
import Reveal from '@/components/motion/Reveal';
import { Sketch } from '@/components/sketches';
import ThaiText from '@/components/ThaiText';
import { dict, type UiDict } from '@/lib/dictionary';
import type { Locale, Profile, StoryChapter } from '@/lib/models';
import { isStoryIcon, isStorySketch } from '@/lib/story';
import '../by-day.css';

// The three project-health states as shape + word (spec §5.1: status marks
// are monochrome): full, half and empty circle.
function HealthMark({ index }: { index: number }) {
  if (index === 0) {
    return (
      <svg viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="6" cy="6" r="5" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="6" cy="6" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
      {index === 1 && <path d="M6 1.6a4.4 4.4 0 0 1 0 8.8z" fill="currentColor" />}
    </svg>
  );
}

// Chapter 6 ("Know the week it slips.") shows the launch checklist's five
// phases and the three health words instead of a sketch (prototype PHASES /
// HEALTH). It attaches to the last chapter in Order.
function LaunchPhases({ t }: { t: UiDict }) {
  return (
    <>
      <ol className="bd-phases" aria-label={t.storyPhasesLabel}>
        {t.storyPhases.map((phase) => (
          <li key={phase}>
            <ThaiText text={phase} />
          </li>
        ))}
      </ol>
      <ul className="bd-legend">
        {t.storyHealth.map((word, i) => (
          <li key={word}>
            <HealthMark index={i} />
            {word}
          </li>
        ))}
      </ul>
    </>
  );
}

type Props = { profile: Profile; chapters: StoryChapter[]; locale: Locale };

// Server component (spec §6 "By day", C7 `#story`). Every chapter is in the
// server HTML; Reveal only adds its fade-rise once html.js is set (C9), so a
// visitor without JavaScript reads the whole method. Replaces AboutBand and
// CraftBand: the prologue is the old About story, the rule labels are the
// old six craft imperatives.
export default function ByDay({ profile, chapters, locale }: Props) {
  const t = dict[locale];
  // Pre-migration Notion has no ClosingLine; the prototype's closing line is
  // the headline anyway, so the section still ends on the right sentence.
  const closing = profile.closingLine ?? profile.headline;
  const last = chapters.length - 1;

  return (
    <section id="story" className="section wrap" aria-labelledby="story-h">
      <Reveal className={profile.photoSrc ? 'bd-prologue' : 'bd-prologue bd-solo'}>
        <div>
          <p className="t-eyebrow">{t.storyEyebrow}</p>
          {/* aboutHeading carries the prototype's By day headline verbatim. */}
          <h2 id="story-h" className="t-h2">
            <ThaiText text={t.aboutHeading} />
          </h2>
          <p className="t-lead">
            <ThaiText text={t.storyLead} />
          </p>
          {profile.prologue && profile.prologue[locale] && (
            <p className="bd-about">
              <BoldText text={profile.prologue[locale]} />
            </p>
          )}
        </div>
        {profile.photoSrc && (
          <img
            className="bd-portrait"
            src={profile.photoSrc}
            width={240}
            height={240}
            alt={t.portraitAlt}
            loading="lazy"
            decoding="async"
          />
        )}
      </Reveal>
      {chapters.length > 0 && (
        <ol className="bd-chapters">
          {chapters.map((chapter, i) => (
            <Reveal key={chapter.id} as="li" className="bd-ch">
              <i className="bd-dot" aria-hidden="true" />
              <div className="bd-ch-l">
                <span className="bd-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="bd-rule">
                  {isStoryIcon(chapter.icon) && <Icon name={chapter.icon} />}
                  <span>
                    <ThaiText text={chapter.rule[locale]} />
                  </span>
                </span>
                {isStorySketch(chapter.sketch) ? (
                  <span className="bd-sk">
                    <Sketch name={chapter.sketch} />
                  </span>
                ) : (
                  // Keeps a sketch-less chapter's title level with its row
                  // partner in the two-column layout (by-day.css).
                  <span className="bd-sk bd-sk-none" aria-hidden="true" />
                )}
              </div>
              <div className="bd-ch-r">
                <h3 className="t-title">
                  <ThaiText text={chapter.title[locale]} />
                </h3>
                <p className="bd-body">
                  <BoldText text={chapter.body[locale]} />
                </p>
                {i === last && <LaunchPhases t={t} />}
              </div>
            </Reveal>
          ))}
        </ol>
      )}
      <Reveal className="bd-close">
        <i className="bd-enddot" aria-hidden="true" />
        {/* A statement, not a heading: nothing sits under it. */}
        <p className="t-h2 bd-closing">
          <ThaiText text={closing[locale]} />
        </p>
        <a href="#top">{t.backToTour}</a>
      </Reveal>
    </section>
  );
}
```

Create `src/components/by-day.css`:

```css
/* By day (spec §6 "By day", §10 two-column trim). Ported from the approved
   prototype's .prologue / .chapters / .ch / .rule / .sk / .phases / .legend /
   .sclose with P3 names (bd-*). Eyebrow, headline, lead and chapter-title
   sizes come from the C9 classes (.t-eyebrow / .t-h2 / .t-lead / .t-title).
   Layout: 735–1067 px keeps the prototype's spine and two-part chapter;
   ≥ 1068 px the six chapters sit in two columns (three rows, sketch above
   the title), about 0.7 screen shorter; ≤ 734 px is one column with 48 px
   between chapters (spec §10: 64 → 48). No transitions here: the fade-rise
   is Reveal's (.rv, C9). */

.bd-prologue { display: grid; grid-template-columns: minmax(0, 1fr) 240px; gap: 56px; align-items: start; }
.bd-prologue.bd-solo { grid-template-columns: minmax(0, 1fr); }
.bd-about { max-width: 36em; margin: 22px 0 0; font-size: 19px; line-height: 28px; color: var(--ink-2); }
.bd-about:not(:lang(th)) { letter-spacing: .012em; }
.bd-about:lang(th) { line-height: 31px; }
.bd-about strong, .bd-body strong { color: var(--ink-1); font-weight: 600; }
.bd-portrait { width: 240px; height: 240px; border-radius: 28px; object-fit: cover; object-position: 50% 38%; }

.bd-chapters { position: relative; margin: 72px 0 0; padding: 0; list-style: none; }
.bd-chapters::before { content: ""; position: absolute; left: 8px; top: 8px; bottom: -8px; width: 1px; background: var(--spine); }
.bd-ch { position: relative; display: grid; grid-template-columns: 208px minmax(0, 560px); column-gap: 40px; margin-bottom: 76px; padding-left: 32px; }
.bd-dot { position: absolute; left: 4px; top: 12px; width: 9px; height: 9px; border-radius: 50%; background: var(--ink-1); }
.bd-num { display: block; font-size: 13px; line-height: 16px; color: var(--ink-2); font-variant-numeric: tabular-nums; }
.bd-rule { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 15px; line-height: 20px; color: var(--ink-2); }
.bd-rule:lang(th) { line-height: 24px; }
.bd-rule svg { flex: none; width: 20px; height: 20px; }
.bd-sk { display: block; margin-top: 16px; color: var(--ink-2); }
.bd-sk svg { display: block; width: 160px; height: 64px; }
.bd-sk-none { display: none; }
.bd-ch h3 { margin: 0; text-wrap: balance; }
.bd-body { margin: 12px 0 0; font-size: 17px; line-height: 26px; color: var(--ink-2); }
.bd-body:lang(th) { line-height: 28px; }

.bd-phases { position: relative; display: grid; grid-template-columns: repeat(5, 1fr); margin: 24px 0 0; padding: 0; list-style: none; }
.bd-phases::before { content: ""; position: absolute; left: 10%; right: 10%; top: 5px; height: 1px; background: var(--spine); }
.bd-phases li { position: relative; padding-top: 20px; text-align: center; font-size: 13px; line-height: 17px; color: var(--ink-2); }
.bd-phases li:lang(th) { line-height: 20px; }
.bd-phases li::before { content: ""; position: absolute; left: 50%; top: 0; width: 11px; height: 11px; margin-left: -5.5px; border-radius: 50%; background: var(--canvas); box-shadow: inset 0 0 0 1.5px var(--ink-1); }
.bd-legend { display: flex; flex-wrap: wrap; gap: 20px; margin: 16px 0 0; padding: 0; list-style: none; font-size: 13px; color: var(--ink-2); }
.bd-legend li { display: inline-flex; align-items: center; gap: 6px; }
.bd-legend svg { width: 11px; height: 11px; }

.bd-close { position: relative; padding-top: 8px; text-align: center; }
.bd-enddot { position: absolute; left: 2px; top: -10px; width: 13px; height: 13px; border-radius: 50%; background: var(--ink-1); }
.bd-closing { max-width: 14em; margin: 24px auto 0; }
.bd-close a { display: inline-flex; align-items: center; min-height: 44px; margin-top: 12px; font-size: 14px; color: var(--link); text-decoration: none; }
.bd-close a:hover { text-decoration: underline; }

@media (min-width: 1068px) {
  .bd-chapters { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 64px; row-gap: 72px; }
  .bd-chapters::before, .bd-dot, .bd-enddot { display: none; }
  .bd-ch { display: block; margin-bottom: 0; padding-left: 0; }
  .bd-ch-l { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 0 12px; }
  .bd-rule { margin-top: 0; }
  .bd-sk { grid-column: 1 / -1; margin: 16px 0 20px; }
  .bd-sk-none { display: block; height: 64px; }
}

@media (max-width: 734px) {
  .bd-prologue { grid-template-columns: 1fr; gap: 24px; }
  .bd-portrait { order: -1; width: 160px; height: 160px; border-radius: 24px; }
  .bd-about { font-size: 17px; line-height: 26px; }
  .bd-about:lang(th) { line-height: 28px; }
  .bd-chapters { margin-top: 56px; }
  .bd-chapters::before { left: 6px; }
  .bd-ch { display: block; margin-bottom: 48px; padding-left: 28px; }
  .bd-dot { left: 2px; top: 5px; }
  .bd-ch-l { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 0 10px; }
  .bd-num { font-size: 14px; }
  .bd-rule { margin-top: 0; font-size: 14px; }
  .bd-rule svg { width: 16px; height: 16px; }
  .bd-sk { grid-column: 1 / -1; margin: 8px 0 10px; }
  .bd-body { font-size: 16px; line-height: 24px; }
  .bd-body:lang(th) { line-height: 26px; }
  .bd-phases { grid-template-columns: 1fr; gap: 12px; }
  .bd-phases::before { left: 5px; right: auto; top: 6px; bottom: 6px; width: 1px; height: auto; }
  .bd-phases li { padding: 0 0 0 24px; text-align: left; font-size: 14px; line-height: 20px; }
  .bd-phases li::before { left: 0; top: 4px; margin-left: 0; }
  .bd-legend { gap: 8px 16px; font-size: 14px; }
  .bd-enddot { left: 0; }
}
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/by-day.test.tsx && npx tsc --noEmit && npx eslint src/components/sections/ByDay.tsx`
Expected: PASS; `tsc`/`eslint` print nothing.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/ByDay.tsx src/components/by-day.css tests/by-day.test.tsx
git commit -m "feat(story): By day section with prologue, six chapters and two-column desktop (P3)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

---

### Task 13: Put ByDay on the page; retire AboutBand and CraftBand

**Files:**
- Modify: `src/app/[locale]/page.tsx` (imports; `Promise.all`; JSX)
- Modify: `src/lib/dictionary.ts` (delete dead keys in `en` and `th`)
- Modify: `tests/dictionary.test.ts` (remove the craft-count test)
- Modify: `tests/smoke.test.tsx` (story assertion)
- Rewrite: `tests/bands.test.tsx` (now the C7 section-order test)
- Delete: `src/components/sections/AboutBand.tsx`, `src/components/sections/CraftBand.tsx`; plus `src/components/motion/SpotlightList.tsx`, `src/components/motion/spotlight.css`, `tests/spotlight-list.test.tsx` if nothing else imports `SpotlightList`

**Interfaces:**
- Consumes: `ByDay` (Task 12), `getStory` (Task 5).
- Produces: home page order `#work → #career → #story` (C7); no `#about`, `#craft`, `#cv`; one `#toolbox`.

- [ ] **Step 1: Write the failing test**

Replace the whole of `tests/bands.test.tsx` with:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import HomePage from '@/app/[locale]/page';
import type { Locale } from '@/lib/models';

// The page's argument is its order (C7): what he shipped (#work), where he
// has worked (#career), then how he works (#story). The retired dark bands
// must be gone, and the toolbox anchor must exist exactly once (the old
// SkillsBand used the same id).
describe('home page sections (C7 order)', () => {
  for (const locale of ['en', 'th'] as Locale[]) {
    it(`orders work → career → story on /${locale} and drops the retired bands`, async () => {
      const html = renderToStaticMarkup(await HomePage({ params: Promise.resolve({ locale }) }));
      const at = (id: string) => html.indexOf(`id="${id}"`);
      expect(at('work')).toBeGreaterThan(-1);
      expect(at('career')).toBeGreaterThan(at('work'));
      expect(at('story')).toBeGreaterThan(at('career'));
      expect(html.match(/id="toolbox"/g)).toHaveLength(1);
      for (const retired of ['about', 'craft', 'cv']) expect(at(retired)).toBe(-1);
    });
  }
});
```

In `tests/smoke.test.tsx`, directly after the `if (locale === 'en') expect(homeText).toContain(t.cvHeading);` line added in Task 10, add:

```ts
      expect(homeText).toContain('id="story"'); // ByDay (P3)
      if (locale === 'en') expect(homeText).toContain(t.storyLead);
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/bands.test.tsx tests/smoke.test.tsx`
Expected: FAIL — no `id="story"`; `id="about"` and `id="craft"` still present.

- [ ] **Step 3: Implement**

`src/app/[locale]/page.tsx`:

1. Remove `import AboutBand from '@/components/sections/AboutBand';` and `import CraftBand from '@/components/sections/CraftBand';`; add `import ByDay from '@/components/sections/ByDay';`; add `getStory` to the `@/lib/content` import.
2. Append `getStory()` as the last element of the `Promise.all([...])` array and `story` as the last destructured name. With the entries P0–P2 left in place, the result reads like:

```tsx
  const [profile, projects, career, skills, questions, story] = await Promise.all([
    getProfile(),
    getFeaturedProjects(),
    getCareer(),
    getSkills(),
    getQuestions(),
    getStory(),
  ]);
```

(only the last element and the last name are new; keep whatever the earlier phases put before them).
3. Remove the JSX lines `<AboutBand profile={profile} locale={locale} />` and `<CraftBand locale={locale} />` (and any comment above them that talks only about About/Craft or the dark token rhythm).
4. On the line directly after the `<CareerBand … />` element (Task 10), insert:

```tsx
      {/* C7: then how he works (#story) -- the prologue and six chapters that
          replace the old About and Craft bands. */}
      <ByDay profile={profile} chapters={story} locale={locale} />
```

Delete the retired components (and `SpotlightList` if CraftBand was its last importer):

```bash
git rm src/components/sections/AboutBand.tsx src/components/sections/CraftBand.tsx
grep -rn "from '@/components/motion/SpotlightList'" src tests   # if this prints nothing:
git rm --ignore-unmatch src/components/motion/SpotlightList.tsx src/components/motion/spotlight.css tests/spotlight-list.test.tsx
grep -rnE "from '@/components/sections/(AboutBand|CraftBand)'" src tests   # expect: no output
```

Delete dictionary keys only those components read. First confirm:

```bash
grep -rnE "\.(craft|craftHeading|aboutSubhead|aboutStory)\b" src tests   # expect only tests/dictionary.test.ts (the craft-count test)
```

In `tests/dictionary.test.ts`, delete the whole test `it('carries exactly six craft imperatives in both locales', …)`. In `src/lib/dictionary.ts`, delete `craft`, `craftHeading`, `aboutSubhead`, `aboutStory` from **both** `en` and `th`, with the comment lines directly above them that describe only them (the "About band's story beats…" comment above `aboutStory`; the `craftHeading`/`aboutHeading` comment block stays, reworded to describe `aboutHeading` only, which ByDay still reads):

```ts
  // By day's headline (ByDay, P3). Ported verbatim from the studio.html
  // brainstorm and kept in the approved White Edition prototype.
  aboutHeading: 'I like building things that are simple, and that stay running.',
```

Keep `aboutHeading`, `about`, `howIWork`, `now` (still read, or kept for the nav in other phases). If the grep printed a use outside `dictionary.test.ts` for any key, keep that key.

- [ ] **Step 4: Run and pass**

Run: `npx vitest run && npx tsc --noEmit && npx eslint .`
Expected: all PASS; `tsc`/`eslint` print nothing.

- [ ] **Step 5: Screenshot check (By day, desktop two-column + phone)**

```bash
mkdir -p /tmp/klao-qa
cat > /tmp/klao-qa/p3-byday.mjs <<'EOF'
// P3 QA: By day at 1440×900 (two columns) and 390×844 (one column), EN/TH, light/dark.
import { chromium } from '/Users/suvichakjarunopratamp/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:3000';
const OUT = '/tmp/klao-qa/p3';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const report = [];
for (const [width, height, size] of [[1440, 900, 'desk'], [390, 844, 'phone']]) {
  for (const locale of ['en', 'th']) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, deviceScaleFactor: 2 });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      await page.goto(`${BASE}/${locale}`, { waitUntil: 'networkidle' });
      // Walk the page once so every Reveal has crossed the viewport.
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += 400) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
        }
      });
      await page.waitForTimeout(900);
      await page.locator('#story').screenshot({ path: `${OUT}/story-${size}-${locale}-${scheme}.png` });
      const layout = await page.evaluate(() => {
        const items = [...document.querySelectorAll('#story ol.bd-chapters > li')];
        const lefts = new Set(items.map((li) => Math.round(li.getBoundingClientRect().left)));
        const tops = new Set(items.map((li) => Math.round(li.getBoundingClientRect().top + window.scrollY)));
        // Reading text only: the sketches' 11 px SVG labels are drawings,
        // not copy, so they are excluded from the ≥ 14 px phone check.
        const texts = [...document.querySelectorAll('#story *')].filter(
          (el) => !el.closest('svg') && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()),
        );
        const minFont = Math.min(...texts.map((el) => parseFloat(getComputedStyle(el).fontSize)));
        return { chapters: items.length, columns: lefts.size, rows: tops.size, minFont };
      });
      const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      report.push({ size, locale, scheme, ...layout, overflowX, errors });
      await ctx.close();
    }
  }
}
await browser.close();
console.log(JSON.stringify(report, null, 2));
EOF
(npm run dev > /tmp/klao-qa/dev.log 2>&1 &)
until curl -sf -o /dev/null http://localhost:3000/en; do sleep 1; done
node /tmp/klao-qa/p3-byday.mjs
pkill -f "next dev"
```

Expected: desktop rows `chapters: 6, columns: 2, rows: 3`; phone rows `chapters: 6, columns: 1, rows: 6, minFont >= 14`; every row `overflowX: false, errors: []`. Open `/tmp/klao-qa/p3/story-*.png` and check: sketches sit above titles in the two-column layout and chapter 6's title lines up with chapter 5's; the phase strip reads left → right on desktop and as a vertical list on phone; bold clauses are darker than the body; the portrait is square with a 28 px (phone 24 px) radius; dark theme keeps the spine and dots visible; Thai titles do not break mid-word; the closing line is centred with the "Aje · GoNai · klao-site ↑" link under it.

- [ ] **Step 6: Commit**

```bash
git add "src/app/[locale]/page.tsx" src/lib/dictionary.ts tests/dictionary.test.ts tests/smoke.test.tsx tests/bands.test.tsx
git commit -m "feat(home): By day replaces About and Craft bands; section order work → career → story (P3)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

(The `git rm` deletions are already staged.)

---

### Task 14: P3 gate: check, build, greps, page length, screenshot matrix

**Files:**
- Create (outside the repo): `/tmp/klao-qa/p3-length.mjs`
- No repo changes expected. If a check fails, fix it in the task that owns the code, re-run this gate, and commit the fix with a `fix(p3): …` message and the two trailer lines.

**Interfaces:**
- Consumes: everything above.
- Produces: a green phase and a measured page length handed to P4.

- [ ] **Step 1: Unit tests, types and lint**

Run: `npm run check`
Expected: `tsc` and `eslint` silent; Vitest all green (the count moves from P2's by + new P3 tests − deleted `cv-band`, `skills-band`, `spotlight-list`, old `bands`).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: success; the route list still includes `/[locale]/career` (it builds with the new `CareerEntry` fields and is redirected to `/:locale#career` at request time).

- [ ] **Step 3: Grep checks**

```bash
grep -rniE "aisecretary|dailybrief" src public tests                                   # expect: no output
grep -rnE "from '@/components/sections/(AboutBand|CraftBand|CvBand|SkillsBand|skill-icons)'" src tests   # expect: no output
ls src/components/sections | grep -E "AboutBand|CraftBand|CvBand|SkillsBand|skill-icons"                # expect: no output
grep -rn "dangerouslySetInnerHTML" src/components/CareerDetent.tsx src/components/sections/CareerBand.tsx src/components/sections/ByDay.tsx src/components/BoldText.tsx   # expect: no output
grep -rn "ActMedia" src/content src/components                                          # expect: no output
grep -rniE "\binstant(ly)?\b|immediately" src/components/CareerDetent.tsx src/components/sections/CareerBand.tsx src/components/sections/ByDay.tsx src/content/fixtures/career.json src/content/fixtures/story.json src/content/fixtures/profile.json   # expect: no output
grep -nE "transition:" src/components/career.css src/components/by-day.css             # expect: only transform … / none
grep -rnE "#cv\b|#about\b|#craft\b" src                                                 # expect: no output
```

If the last grep finds `#cv`/`#about`/`#craft` in P1's `SiteNav`, change those links to C7's `#career` / `#story` in that file and note it in the hand-off.

- [ ] **Step 4: Page length at 1440×900 (and phone)**

```bash
cat > /tmp/klao-qa/p3-length.mjs <<'EOF'
// P3: page length in screens (document height / viewport height) and per section, /en, motion on.
import { chromium } from '/Users/suvichakjarunopratamp/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';

const BASE = process.env.BASE ?? 'http://localhost:3000';
const browser = await chromium.launch({ channel: 'chrome' });
for (const [width, height, size] of [[1440, 900, 'desk'], [390, 844, 'phone']]) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
  const r = await page.evaluate(() => {
    const vh = window.innerHeight;
    const sections = {};
    for (const id of ['top', 'tour', 'signature', 'work', 'career', 'story', 'faq', 'contact']) {
      const el = document.getElementById(id);
      if (el) sections[id] = +(el.getBoundingClientRect().height / vh).toFixed(2);
    }
    return { screens: +(document.documentElement.scrollHeight / vh).toFixed(2), sections };
  });
  console.log(JSON.stringify({ size, ...r }));
  await ctx.close();
}
await browser.close();
EOF
(npm run dev > /tmp/klao-qa/dev.log 2>&1 &)
until curl -sf -o /dev/null http://localhost:3000/en; do sleep 1; done
node /tmp/klao-qa/p3-length.mjs
```

Record both lines in the hand-off to P4 and Klao. Reference (prototype, desktop): career 1.42, story 2.28 screens; P3's cuts target about 1.27 and 1.6. The ≤ 8.6 desktop / ≤ 12 phone totals are judged after P4 (FAQ, close, footer). If career or story is above the target, record it and flag it; do not cut the Apple section rhythm (spec §10).

- [ ] **Step 5: Full screenshot matrix and review**

With the dev server still running:

```bash
node /tmp/klao-qa/p3-career.mjs
node /tmp/klao-qa/p3-byday.mjs
pkill -f "next dev"
ls /tmp/klao-qa/p3 | wc -l   # 40 career shots (5 pills × 8 combinations) + 8 story shots = 48
```

Expected reports as in Task 10 Step 5 and Task 13 Step 5. Review every PNG (Read tool) against the checklists in those steps, for 1440 and 390, EN and TH, light and dark. Anything off goes back to its task.

- [ ] **Step 6: Hand-off**

No commit when nothing changed. Report: `npm run check` / `npm run build` results, the two page-length lines, the grep results, and any screenshot findings. Leave the branch unpushed (master plan: push only with Klao's OK at the P6 gate).

---

## Contract gaps

1. **Toolbox grouping does not come from `Skill.category`.** The categories (tech/biz/data/fin) do not map onto the approved stack/methods split. P3 adds a rule (`src/lib/career.ts`): stack = the curated `TOOLBOX_STACK` list (the old SkillsBand allowlist + Next.js), methods = tier `top`, languages = dictionary. The prototype's "Learning now" and "Certified" cells are not in the spec's three columns, so they are dropped. **Klao to confirm.** A `Toolbox` select on Skills could move this into Notion later.
2. **`CareerFigure.value` is one string.** Thai shows "THB 1.1M" where the prototype showed "1.1 ล้านบาท". Suggest an optional `FigureValueTH` later. The prototype's figure scale bar (`.scale`) has no C5 data, so it is not built.
3. **Career keys.** `slugKey` gives `a-bun-dance`, `mmb-technology`, `vela-central-world`. The prototype's FAQ used `career:abundance`. P4's FAQ fixture should use the slug keys. `findCareerIndex` also accepts the compact form and a unique prefix, so live Notion rows still named "A Bun Dance (Craft Burger)" / "MMB Technology Co., Ltd." still resolve.
4. **Sketch names are not in C4.** P3 assumes `room, cases, formats, rollout, handover`. `satisfies` and a render test enforce whatever P0 actually chose.
5. **Export forms assumed.** `Icon`/`Sketch` are named exports; `ThaiText`/`Reveal` are default exports. Check under "Before you start".
6. **UI copy lives in the dictionary, not Notion.** That covers the story headline, lead and eyebrow; the career and toolbox headings; toolbox labels and languages; phase and health words; and `resumeMeta` "2 pages · updated Aug 2026". `resumeMeta` goes stale when the résumé PDF is rebuilt at ship time. This conflicts with spec criterion 6 ("every piece of copy editable in Notion"): C5 only adds `prologue`/`closingLine`.
7. **Chapter-6 extras and the deal link are positional.** The phase strip goes on the last chapter by Order, and "How a deal runs ↓" goes on the first (current) role. C5 has no field for either.
8. **`CAREER_EVENT` is exported from `src/lib/career.ts`.** P4 dispatchers should import it rather than retype `'klao:career'`.
9. **`docs/NOTION_SETUP.md`** (new Career/Profile properties, the Story DB, `NOTION_DB_STORY`, and the Icon/Sketch option names = `STORY_ICONS`/`STORY_SKETCHES`) is left to P5, as the master plan assigns. Spec §9 prefers the same commit.
