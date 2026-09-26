# White Edition — P4 FAQ, Close + Footer, ⌘K Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the bottom of the White Edition home page: a Notion-backed FAQ band, the "Have something that should exist?" close band, a rebuilt footer (theme + language), and a lazy-loaded ⌘K palette whose "Ask Klao" fallback answers from page content only.

**Architecture:** One pure link grammar (`src/lib/link-target.ts`) is shared by the FAQ Links column, the footer, the ⌘K index and the Ask Preview sources; a tiny client helper (`src/lib/deep-link.ts`) turns a target into a scroll, a `klao:career` event (C8) or a `#work/<key>` hash (C6). FAQ, Close and Footer are server components with small client islands (Expand all, copy button, deep links, language links). The palette index is built on the server in the layout and handed as plain data to an always-mounted `PaletteHost`, which pulls `CommandPalette` (+ `ask.ts` + its CSS) through `next/dynamic` only on first open.

**Tech Stack:** Next.js 15.5 App Router (server components, `next/dynamic` `ssr:false`) · React 19.2 · Tailwind v4.3 + component CSS files · `@notionhq/client` · Vitest 3 + Testing Library (jsdom per file) · Playwright via the npx cache for screenshots only.

**Spec:** docs/superpowers/specs/2026-09-25-white-edition-design.md · Master plan (contracts, global constraints): docs/superpowers/plans/2026-09-25-white-edition.md

## Global Constraints

Inherits every line of the master plan's Global Constraints. Phase-specific additions:

- `CommandPalette`, `AskCard`, `src/lib/ask.ts` and `palette.css` are reachable **only** through the `next/dynamic` import in `PaletteHost`. Never import them statically anywhere else (the gate checks the chunk is absent from the first load).
- Every in-page link the CMS can express uses the grammar in `src/lib/link-target.ts` (`<section id>` · `career:<key>` · `work/<projectKey>` · `https://…`). External links are **https only** — no `http:`, `javascript:`, `data:`.
- Internal links that must open a sheet use a plain `<a href="/<locale>#work/<key>">` (never `next/link`): Next's Link changes the hash with `pushState`, which fires no `hashchange`, so P2's sheet would not open.
- Enhancements hide without JavaScript: "Expand all", the "ask Klao (⌘K)" line and the copy button carry CSS `html:not(.js) … { display: none }`; the FAQ answers, the email address and every link stay in the server HTML (Review Focus #4).
- Dictionary keys added here are prefixed `faq*`, `close*`, `foot*`, `pal*`, `ask*`. If P1–P3 already added a key with the same meaning and text, reuse theirs instead of adding a duplicate (an exact duplicate key is a TS1117 compile error; a differently named duplicate is just clutter).
- Copy is the prototype's (`UI`, `FAQ`, `ASK` blocks in `design/white-edition/prototype/index.html`). The FAQ "What work is he open to?" stays out until Klao writes the answer.
- The palette and the Ask Preview make **no** network request of any kind (not only "no model call") — tests spy on `fetch` and scan the source.

## Review Focus

| Master Review Focus line | What P4 owns | Test added in |
|---|---|---|
| #1 Pre-migration Notion | FAQ row with only `QuestionEN`/`AnswerEN` maps (TH fallback, `links: []`, `order: 0`); Profile row without `BasedIn*`/`WorkingIn` maps to `null`s; `getFaq()` with `NOTION_TOKEN` set but `NOTION_DB_FAQ` unset returns fixtures and never calls Notion | Task 3 (`tests/faq-mappers.test.ts`), Task 4 (`tests/content-faq.test.ts`) |
| #3 Bad sheet URLs (link side only; P2 owns the sheet) | `work/`, `work/GoNai`, `career:` are refused by the grammar, so no FAQ/palette link can produce a bad `#work/…` hash | Task 2 (`tests/link-target.test.ts`) |
| #4 No JavaScript / before hydration | FAQ server HTML carries every answer, native `<details>`, no inline `opacity:0`; Close band server HTML carries the mailto CTA and the address as text | Task 7 (`tests/faq-band.test.tsx`), Task 9 (`tests/close-band.test.tsx`) |
| Global: "⌘K Ask Preview makes no model call and no network request" | `askPreview` is pure; the palette UI never calls `fetch`; in the browser 0 fetch/XHR during an Ask | Task 12 (`tests/ask.test.ts`), Task 13 (`tests/command-palette.test.tsx`), Task 15 (Playwright) |

---

## Files

| Path | Action | Responsibility |
|---|---|---|
| `src/lib/link-target.ts` | Create | Link grammar: `parseTarget`, `isLinkTarget`, `targetHref`, `faqAnchorId`, `swapLocale`, `mailto`, `CONTACT_SUBJECT` |
| `src/lib/models.ts` | Modify | `FaqLink`, `FaqItem`; `Profile.basedIn`, `Profile.workingIn` (C5 P4) |
| `src/lib/notion-mappers.ts` | Modify | `parseFaqLinks`, `mapFaqItem`; `mapProfile` reads `BasedInEN/TH`, `WorkingIn` |
| `src/lib/notion.ts` | Modify | `fetchFaq` (env `NOTION_DB_FAQ`, Published) |
| `src/lib/content.ts` | Modify | `getFaq()` (fixtures when `NOTION_DB_FAQ` unset); `getCareer` wrapped in `cache()` |
| `src/content/fixtures/faq.json` | Create | Five prototype questions EN/TH |
| `src/content/fixtures/profile.json` | Modify | `basedIn`, `workingIn` |
| `.env.example` | Modify | `NOTION_DB_FAQ=` |
| `src/lib/format.ts` | Modify | `fill(template, vars)` |
| `src/lib/dictionary.ts` | Modify | P4 UI strings; `UiStringKey` type; `footerNote`/`contentUpdated` TH match the prototype |
| `src/lib/deep-link.ts` | Modify (P1 created it) | keeps P1's `PALETTE_EVENT`, `openPalette`; adds `CAREER_EVENT` re-export, `followTarget`, `goToTarget` |
| `src/components/DeepLink.tsx` | Create | `<a>` with a real href that deep-links in place when the target is on the page |
| `src/components/PaletteButton.tsx` | Create | Button that dispatches `klao:palette` |
| `src/components/sections/FaqBand.tsx` · `FaqExpandAll.tsx` · `faq.css` | Create | `#faq` band |
| `src/lib/clipboard.ts` | Create | `copyText`, `copyShortcutHint` |
| `src/components/CopyEmail.tsx` · `copy-email.css` | Rework / Create | Address + icon copy button (prototype `.mailrow`) |
| `src/components/sections/CloseBand.tsx` · `close-band.css` | Create | `#contact` band + `pickOpenQuestion` |
| `src/components/LanguageLinks.tsx` | Create | EN / ไทย links for the current path |
| `src/components/SiteFooter.tsx` · `site-footer.css` | Rewrite / Create | Three link columns, legal line, Appearance + Language |
| `src/lib/palette-index.ts` | Create | `PaletteEntry`, `PaletteInput`, `buildPaletteIndex`, `searchPalette`, `fold`, `oneEdit`, `highlight` |
| `src/lib/ask.ts` | Create | `ASK_CANNED`, `askPreview`, `AskAnswer`, `AskSource` |
| `src/components/palette/CommandPalette.tsx` · `AskCard.tsx` · `palette.css` | Create | The lazy palette |
| `src/components/palette/PaletteHost.tsx` | Create | Always-mounted listener + `next/dynamic` loader |
| `src/app/[locale]/page.tsx` | Modify | FaqBand + CloseBand replace QuestionsBand/ClientsBand/ContactBand |
| `src/app/[locale]/layout.tsx` | Modify | Mount `PaletteHost` |
| `src/app/globals.css` | Modify (conditional) | Drop the old `#contact` glow if P0 left it |
| `src/components/sections/QuestionsBand.tsx` · `ContactBand.tsx` | Delete | Replaced |
| Tests | Create / Rewrite / Delete | listed per task |
| `/tmp/klao-qa/p4-qa.mjs`, `/tmp/klao-qa/p4-lazy.mjs` | Create (outside repo) | Screenshot / length / lazy-chunk checks |

Names consumed from earlier phases (contracts): `sheetHash`, `projectKey` (C6, `@/lib/sheet-url`) · `Project.kicker` (C5 P1) · `CareerEntry.key`, `CareerEntry.period` (C5 P3 / existing) · `Icon`, `IconName` (C4, `@/components/icons`) · `ThaiText` (C3, `@/components/ThaiText`) · `THAI_RE` (C3, `@/lib/thai`) · `readThemePref`, `writeThemePref`, `ThemePref` (C2, `@/lib/theme`) · `ThemeToggle` (P0, `@/components/ThemeToggle`) · `Reveal` (P0 rework, `@/components/motion/Reveal`) · C9 classes `.t-h2 .t-faq .t-body .t-legal .wrap .wrap-wide .section .btn .btn-fill .btn-out` · section ids `#story`, `#career`, `#toolbox`, `#work`, `#top` (C7).

---

### Task 1: QA screenshot helper (outside the repo)

**Files:** Create `/tmp/klao-qa/p4-qa.mjs` (not in the repo, never committed)
**Interfaces:** Consumes: the running dev server (`npm run dev`, http://localhost:3000) · Produces: `ONLY=<faq|close|footer|palette|ask|len|all> node /tmp/klao-qa/p4-qa.mjs` → PNGs in `/tmp/klao-qa/p4/`, a console table (length in screens per section, overflow, console errors, fetch/XHR during Ask); exit 1 on console errors, horizontal overflow or any Ask request.

- [ ] **Step 1: Write the script**

```js
// /tmp/klao-qa/p4-qa.mjs — White Edition P4 visual QA. Lives outside the repo on purpose.
// Usage: ONLY=faq|close|footer|palette|ask|len|all (comma list ok) BASE=http://localhost:3000 node /tmp/klao-qa/p4-qa.mjs
import { chromium } from '/Users/suvichakjarunopratamp/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:3000';
const ONLY = new Set((process.env.ONLY ?? 'all').split(','));
const want = (k) => ONLY.has('all') || ONLY.has(k);
const OUT = '/tmp/klao-qa/p4';
mkdirSync(OUT, { recursive: true });

const VIEWS = [
  { name: 'desk', width: 1440, height: 900, maxLen: 8.6 },
  { name: 'phone', width: 390, height: 844, maxLen: 12 },
];
// Strings the script clicks or waits for — all from the prototype copy.
const COPY = {
  en: { expand: 'Expand all', search: 'gonai', ask: 'has he done a startup?', badge: 'Preview' },
  th: { expand: 'เปิดทั้งหมด', search: 'gonai', ask: 'เคยทำสตาร์ทอัพไหม?', badge: 'ตัวอย่าง' },
};

const browser = await chromium.launch({ channel: 'chrome' });
const rows = [];
let failed = false;

for (const locale of ['en', 'th']) {
  for (const theme of ['light', 'dark']) {
    for (const v of VIEWS) {
      const tag = `${locale}-${theme}-${v.name}`;
      // colorScheme drives Auto mode (no stored preference), the default.
      const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, colorScheme: theme });
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(`${BASE}/${locale}`, { waitUntil: 'networkidle' });
      const c = COPY[locale];
      const row = { tag };

      if (want('len')) {
        Object.assign(row, await page.evaluate(() => {
          const vh = innerHeight;
          const out = {
            len: +(document.documentElement.scrollHeight / vh).toFixed(2),
            overflowX: document.documentElement.scrollWidth > innerWidth,
          };
          for (const el of document.querySelectorAll('main section[id], footer')) {
            out[el.id || el.tagName.toLowerCase()] = +(el.getBoundingClientRect().height / vh).toFixed(2);
          }
          return out;
        }));
        row.lenOk = row.len <= v.maxLen;
        if (row.overflowX) failed = true;
      }
      if (want('faq')) {
        await page.locator('#faq').scrollIntoViewIfNeeded();
        await page.getByRole('button', { name: c.expand }).click();
        await page.waitForTimeout(400);
        await page.locator('#faq').screenshot({ path: `${OUT}/${tag}-faq.png` });
      }
      if (want('close')) {
        await page.locator('#contact').scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);
        await page.locator('#contact').screenshot({ path: `${OUT}/${tag}-close.png` });
      }
      if (want('footer')) {
        await page.locator('footer').last().scrollIntoViewIfNeeded();
        await page.locator('footer').last().screenshot({ path: `${OUT}/${tag}-footer.png` });
      }
      if (want('palette') || want('ask')) {
        const requests = [];
        page.on('request', (r) => { if (['fetch', 'xhr'].includes(r.resourceType())) requests.push(r.url()); });
        await page.keyboard.press('Control+K');
        const input = page.getByRole('combobox');
        await input.waitFor();
        if (want('palette')) {
          await input.fill(c.search);
          await page.waitForTimeout(400);
          await page.screenshot({ path: `${OUT}/${tag}-palette.png` });
        }
        if (want('ask')) {
          const before = requests.length;
          await input.fill(c.ask);
          await page.waitForTimeout(100);
          await page.keyboard.press('End'); // the Ask row is always last
          await page.keyboard.press('Enter');
          await page.getByText(c.badge, { exact: true }).waitFor();
          await page.screenshot({ path: `${OUT}/${tag}-ask.png` });
          row.askRequests = requests.length - before;
          if (row.askRequests > 0) failed = true;
        }
      }
      row.errors = errors.length;
      if (errors.length) { failed = true; console.error(tag, errors); }
      rows.push(row);
      await ctx.close();
    }
  }
}
await browser.close();
console.table(rows);
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Syntax-check it**

Run: `mkdir -p /tmp/klao-qa && node --check /tmp/klao-qa/p4-qa.mjs && echo ok`
Expected: `ok`

- [ ] **Step 3: Know how to run it (used by Tasks 7, 9, 10, 14, 15)**

Start the dev server only if it is not already up, then wait for it:

```bash
curl -s -o /dev/null http://localhost:3000/en || (cd "/Users/suvichakjarunopratamp/Desktop/Klao Workspace/Personal/klao-site" && nohup npm run dev > /tmp/klao-qa/dev.log 2>&1 &)
curl --retry 90 --retry-connrefused --retry-delay 1 -s -o /dev/null http://localhost:3000/en && echo up
```
Expected: `up`

- [ ] **Step 4: Nothing to commit** — the script is outside the repo on purpose (PNGs never enter the repo).

---

### Task 2: Link grammar (`link-target.ts`)

**Files:** Create `src/lib/link-target.ts` · Test `tests/link-target.test.ts`
**Interfaces:** Consumes: `sheetHash` (C6), `Locale` · Produces:
`type LinkTarget = { kind:'section'; id } | { kind:'career'; key } | { kind:'sheet'; key } | { kind:'external'; url }` ·
`parseTarget(raw: string): LinkTarget | null` · `isLinkTarget(raw: string): boolean` · `targetHref(raw: string, locale: Locale): string | null` · `faqAnchorId(id: string): string` · `swapLocale(pathname: string, locale: Locale): string` · `CONTACT_SUBJECT = 'Hello from klao-site'` · `mailto(email: string, subject: string): string`

- [ ] **Step 1: Write the failing test** — `tests/link-target.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
  CONTACT_SUBJECT,
  faqAnchorId,
  isLinkTarget,
  mailto,
  parseTarget,
  swapLocale,
  targetHref,
} from '@/lib/link-target';

describe('parseTarget', () => {
  it('reads the four target kinds of contract C5', () => {
    expect(parseTarget('work')).toEqual({ kind: 'section', id: 'work' });
    expect(parseTarget('toolbox')).toEqual({ kind: 'section', id: 'toolbox' });
    expect(parseTarget('career:actmedia')).toEqual({ kind: 'career', key: 'actmedia' });
    expect(parseTarget('work/gonai')).toEqual({ kind: 'sheet', key: 'gonai' });
    expect(parseTarget('work/klao-site')).toEqual({ kind: 'sheet', key: 'klao-site' });
    expect(parseTarget('https://gonai-three.vercel.app')).toEqual({
      kind: 'external',
      url: 'https://gonai-three.vercel.app',
    });
  });

  it('trims the stray spaces a Notion line tends to carry', () => {
    expect(parseTarget('  contact ')).toEqual({ kind: 'section', id: 'contact' });
  });

  it('refuses everything outside the grammar, including script and plain-http URLs', () => {
    const bad = [
      '',
      ' ',
      'javascript:alert(1)',
      'data:text/html,hi',
      'http://insecure.test',
      'https://',
      'work/',
      'work/GoNai', // same rule as the sheet's own hash parser: lower-case keys only
      'career:',
      'career:Act Media',
      'Work',
      '#faq',
      '/en#faq',
      'faq section',
    ];
    for (const raw of bad) {
      expect(parseTarget(raw), raw).toBeNull();
      expect(isLinkTarget(raw), raw).toBe(false);
    }
  });
});

describe('targetHref', () => {
  it('gives every kind a real href, so links work with JavaScript off and from other routes', () => {
    expect(targetHref('work', 'en')).toBe('/en#work');
    expect(targetHref('career:abundance', 'th')).toBe('/th#career');
    expect(targetHref('work/gonai', 'en')).toBe('/en#work/gonai');
    expect(targetHref('https://github.com/Klaosj', 'th')).toBe('https://github.com/Klaosj');
    expect(targetHref('javascript:alert(1)', 'en')).toBeNull();
  });
});

describe('faqAnchorId', () => {
  it('turns fixture ids and Notion UUIDs into section-grammar ids', () => {
    expect(faqAnchorId('fx-faq-day')).toBe('faq-fx-faq-day');
    expect(faqAnchorId('3E4A127D-90D7-8059')).toBe('faq-3e4a127d-90d7-8059');
    expect(isLinkTarget(faqAnchorId('3e4a127d90d78059905aee7814302015'))).toBe(true);
  });
});

describe('swapLocale', () => {
  it('keeps the page and swaps the language', () => {
    expect(swapLocale('/en', 'th')).toBe('/th');
    expect(swapLocale('/en/projects', 'th')).toBe('/th/projects');
    expect(swapLocale('/th/work/gonai', 'en')).toBe('/en/work/gonai');
    expect(swapLocale('/', 'th')).toBe('/th');
  });
});

describe('mailto', () => {
  it('encodes the subject, Thai included', () => {
    expect(mailto('a@b.co', CONTACT_SUBJECT)).toBe('mailto:a@b.co?subject=Hello%20from%20klao-site');
    expect(mailto('a@b.co', 'คำถามที่ยังเปิดอยู่')).toBe(
      `mailto:a@b.co?subject=${encodeURIComponent('คำถามที่ยังเปิดอยู่')}`,
    );
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/link-target.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/link-target"`.

- [ ] **Step 3: Implement** — `src/lib/link-target.ts`

```ts
import type { Locale } from './models';
import { sheetHash } from './sheet-url';

// One grammar for every in-page link the CMS can express (contract C5,
// FaqLink.target). FAQ answers, the Ask Preview's sources, the footer and
// the ⌘K index all speak it, so Klao learns one syntax in Notion and the
// four surfaces cannot drift apart:
//   'work' · 'toolbox' · 'contact' · …   an element id on the home page
//   'career:<key>'                        a Career pill (C8 `klao:career`)
//   'work/<projectKey>'                   a project sheet (C6 `#work/<key>`)
//   'https://…'                           an outside page
export type LinkTarget =
  | { kind: 'section'; id: string }
  | { kind: 'career'; key: string }
  | { kind: 'sheet'; key: string }
  | { kind: 'external'; url: string };

const CAREER_RE = /^career:([a-z0-9-]+)$/;
// Same key alphabet as parseSheetHash (C6): lower-case only, so
// 'work/GoNai' is refused here exactly as '#work/GoNai' is refused by the
// sheet — a link can never produce a hash the sheet would ignore.
const SHEET_RE = /^work\/([a-z0-9-]+)$/;
const SECTION_RE = /^[a-z][a-z0-9-]*$/;
const HTTPS_RE = /^https:\/\/\S+$/;

export function parseTarget(raw: string): LinkTarget | null {
  const s = raw.trim();
  const career = CAREER_RE.exec(s);
  if (career) return { kind: 'career', key: career[1] };
  const sheet = SHEET_RE.exec(s);
  if (sheet) return { kind: 'sheet', key: sheet[1] };
  if (SECTION_RE.test(s)) return { kind: 'section', id: s };
  // https only. Links is free text in Notion; a `javascript:` or `data:`
  // URL that reached an href would run script on the live site.
  if (HTTPS_RE.test(s)) {
    try {
      return new URL(s).protocol === 'https:' ? { kind: 'external', url: s } : null;
    } catch {
      return null;
    }
  }
  return null;
}

export const isLinkTarget = (raw: string): boolean => parseTarget(raw) !== null;

// A real href for every kind, so each link still goes somewhere with
// JavaScript off (Review Focus #4) and from routes other than the home page
// (the footer renders on every route).
export function targetHref(raw: string, locale: Locale): string | null {
  const t = parseTarget(raw);
  if (!t) return null;
  switch (t.kind) {
    case 'external':
      return t.url;
    case 'sheet':
      return `/${locale}${sheetHash(t.key)}`;
    case 'career':
      return `/${locale}#career`;
    case 'section':
      return `/${locale}#${t.id}`;
  }
}

// Element id of one FAQ <details>. Notion page ids are UUIDs (hex + dashes),
// fixture ids are kebab-case; the `faq-` prefix keeps the result a valid
// section target (it must start with a letter), so ⌘K can jump to it.
export function faqAnchorId(id: string): string {
  return `faq-${id.toLowerCase().replace(/[^a-z0-9-]/g, '')}`;
}

// Same page, other language: '/en/projects' → '/th/projects'.
export function swapLocale(pathname: string, locale: Locale): string {
  const rest = pathname.split('/').slice(2).filter(Boolean).join('/');
  return `/${locale}${rest ? `/${rest}` : ''}`;
}

// The prototype's MAILTO subject. English in both locales on purpose: it
// lands in Klao's inbox, where one subject line sorts every enquiry together.
export const CONTACT_SUBJECT = 'Hello from klao-site';

export const mailto = (email: string, subject: string): string =>
  `mailto:${email}?subject=${encodeURIComponent(subject)}`;
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/link-target.test.ts && npx tsc --noEmit`
Expected: all tests PASS; tsc exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/link-target.ts tests/link-target.test.ts
git commit -m "$(cat <<'EOF'
feat(links): one link grammar for FAQ, footer, palette and Ask sources

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
)"
```

---

### Task 3: FAQ + Profile models and mappers

**Files:** Modify `src/lib/models.ts` (append; `interface Profile` after `nameNative`) · Modify `src/lib/notion-mappers.ts` (imports; new functions after `mapQuestion`; `mapProfile` after the `nameNative:` line) · Modify `src/content/fixtures/profile.json` · Modify every test file with a `Profile` literal (`nameNative: null,` anchor) · Test `tests/faq-mappers.test.ts`
**Interfaces:** Consumes: `isLinkTarget` (Task 2) · Produces: `interface FaqLink { label: Localized; target: string }` · `interface FaqItem { id; question: Localized; answer: Localized; links: FaqLink[]; order: number }` · `Profile.basedIn: Localized | null` · `Profile.workingIn: string | null` · `parseFaqLinks(raw: string): FaqLink[]` · `mapFaqItem(page: NotionPage): FaqItem | null`

- [ ] **Step 1: Write the failing test** — `tests/faq-mappers.test.ts`

```ts
import { describe, expect, it, vi } from 'vitest';
import { mapFaqItem, mapProfile, parseFaqLinks } from '@/lib/notion-mappers';

const title = (s: string) => ({ title: s ? [{ plain_text: s }] : [] });
const rich = (s: string) => ({ rich_text: s ? [{ plain_text: s }] : [] });

const faqPage = {
  id: 'faq-row-1',
  properties: {
    QuestionEN: title('Has he run a business?'),
    QuestionTH: rich('เคยทำธุรกิจเองไหม?'),
    AnswerEN: rich('He founded A Bun Dance.'),
    AnswerTH: rich('เคยก่อตั้งร้าน A Bun Dance'),
    Links: rich('Career · A Bun Dance|Career · A Bun Dance|career:abundance\nProjects|โปรเจกต์|work'),
    Order: { number: 3 },
    Published: { checkbox: true },
  },
};

describe('mapFaqItem', () => {
  it('maps a full row', () => {
    expect(mapFaqItem(faqPage)).toEqual({
      id: 'faq-row-1',
      question: { en: 'Has he run a business?', th: 'เคยทำธุรกิจเองไหม?' },
      answer: { en: 'He founded A Bun Dance.', th: 'เคยก่อตั้งร้าน A Bun Dance' },
      links: [
        { label: { en: 'Career · A Bun Dance', th: 'Career · A Bun Dance' }, target: 'career:abundance' },
        { label: { en: 'Projects', th: 'โปรเจกต์' }, target: 'work' },
      ],
      order: 3,
    });
  });

  it('maps a minimal row (QuestionEN + AnswerEN only) with TH fallback, no links, order 0', () => {
    // Review Focus #1: a row Klao has only half filled in must still render.
    const minimal = {
      id: 'faq-row-2',
      properties: { QuestionEN: title('How do I reach him?'), AnswerEN: rich('Email him.') },
    };
    expect(mapFaqItem(minimal)).toEqual({
      id: 'faq-row-2',
      question: { en: 'How do I reach him?', th: 'How do I reach him?' },
      answer: { en: 'Email him.', th: 'Email him.' },
      links: [],
      order: 0,
    });
  });

  it('skips, with a warning, a row that has no question or no answer', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(mapFaqItem({ ...faqPage, properties: { ...faqPage.properties, QuestionEN: title('') } })).toBeNull();
    expect(mapFaqItem({ ...faqPage, properties: { ...faqPage.properties, AnswerEN: rich('') } })).toBeNull();
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});

describe('parseFaqLinks', () => {
  it('reads LabelEN|LabelTH|target lines and tolerates spaces around the pipes', () => {
    expect(parseFaqLinks('Toolbox · Languages | Toolbox · ภาษา | toolbox')).toEqual([
      { label: { en: 'Toolbox · Languages', th: 'Toolbox · ภาษา' }, target: 'toolbox' },
    ]);
  });

  it('reads a two-part Label|target line (spec §7 wording) as one label for both languages', () => {
    expect(parseFaqLinks('Contact|contact')).toEqual([{ label: { en: 'Contact', th: 'Contact' }, target: 'contact' }]);
  });

  it('skips malformed lines one by one instead of dropping the whole row', () => {
    const raw = [
      'Contact|ติดต่อ|contact',
      'no pipes at all',
      'a|b|c|d',
      '|ป้าย|work',
      'Label|ป้าย|',
      'Label|ป้าย|javascript:alert(1)',
      'Label|ป้าย|http://insecure.test',
      'Label|ป้าย|work/GoNai',
      '',
      'Toolbox|กล่องเครื่องมือ|toolbox',
    ].join('\n');
    expect(parseFaqLinks(raw)).toEqual([
      { label: { en: 'Contact', th: 'ติดต่อ' }, target: 'contact' },
      { label: { en: 'Toolbox', th: 'กล่องเครื่องมือ' }, target: 'toolbox' },
    ]);
  });

  it('returns [] for an empty Links property', () => {
    expect(parseFaqLinks('')).toEqual([]);
  });
});

describe('mapProfile · BasedIn / WorkingIn', () => {
  const base = { id: 'pr1', properties: { Name: title('Suwichak Jarunopratamp (Klao)') } };

  it('maps both to null on a Profile row that predates them (Review Focus #1)', () => {
    const p = mapProfile(base)!;
    expect(p.basedIn).toBeNull();
    expect(p.workingIn).toBeNull();
  });

  it('maps BasedInEN/TH and WorkingIn', () => {
    const p = mapProfile({
      ...base,
      properties: {
        ...base.properties,
        BasedInEN: rich('Bangkok, TH'),
        BasedInTH: rich('กรุงเทพฯ'),
        WorkingIn: rich('TH / EN'),
      },
    })!;
    expect(p.basedIn).toEqual({ en: 'Bangkok, TH', th: 'กรุงเทพฯ' });
    expect(p.workingIn).toBe('TH / EN');
  });

  it('falls back TH -> EN for BasedIn', () => {
    const p = mapProfile({ ...base, properties: { ...base.properties, BasedInEN: rich('Bangkok, TH') } })!;
    expect(p.basedIn).toEqual({ en: 'Bangkok, TH', th: 'Bangkok, TH' });
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/faq-mappers.test.ts`
Expected: FAIL — `mapFaqItem is not a function` / `parseFaqLinks is not a function`; `basedIn` is `undefined`, not `null`.

- [ ] **Step 3: Implement**

3a. `src/lib/models.ts` — inside `export interface Profile { … }`, directly after the line `  nameNative: string | null;` insert:

```ts
  // P4 (spec §7, contract C5): the close band's "Based in" / "Working in"
  // facts, moved out of the old ContactBand's hard-coded constants so Klao
  // edits them in Notion. basedIn is Localized (the prototype reads
  // "Bangkok, TH" / "กรุงเทพฯ"); workingIn is one locale-invariant string per
  // C5. null = property missing or blank, and that fact simply doesn't render.
  basedIn: Localized | null;
  workingIn: string | null;
```

Append to the end of `src/lib/models.ts`:

```ts
// P4 (spec §7, contract C5): the FAQ DB. `target` follows the one link
// grammar in src/lib/link-target.ts ('work', 'career:<key>',
// 'work/<projectKey>', 'toolbox', 'contact', an https URL, …).
export interface FaqLink {
  label: Localized;
  target: string;
}

export interface FaqItem {
  id: string;
  question: Localized;
  answer: Localized;
  links: FaqLink[];
  order: number;
}
```

3b. `src/lib/notion-mappers.ts` — add `FaqItem, FaqLink` to the `import type { … } from './models';` list, and add below the existing imports:

```ts
import { isLinkTarget } from './link-target';
```

Inside `mapProfile`'s returned object, directly after the line `    nameNative: text(page.properties.NameNative) || null,` insert:

```ts
    // P4, additive like NameNative: a Profile database without these
    // properties maps to null and the close band leaves the fact out.
    basedIn: text(page.properties.BasedInEN)
      ? localized(text(page.properties.BasedInEN), text(page.properties.BasedInTH))
      : null,
    workingIn: text(page.properties.WorkingIn) || null,
```

Directly after the closing `}` of `mapQuestion`, insert:

```ts
// FAQ `Links` (contract C5): one link per line, `LabelEN|LabelTH|target`.
// Spec §7 documents the shorter `Label|target`, so a two-part line reads as
// one label for both languages. Anything else — wrong part count, a blank
// label, a target outside link-target.ts's grammar — drops that line only,
// so one typo in Notion never takes a whole answer's links down.
export function parseFaqLinks(raw: string): FaqLink[] {
  return lines(raw).flatMap((line) => {
    const parts = line.split('|').map((p) => p.trim());
    if (parts.length !== 2 && parts.length !== 3) return [];
    const [en, th, target] = parts.length === 3 ? parts : [parts[0], '', parts[1]];
    if (!en || !target || !isLinkTarget(target)) return [];
    return [{ label: localized(en, th), target }];
  });
}

// QuestionEN is the FAQ DB's title property; AnswerEN is required too, since
// a question with no answer has nothing to show. Every other property is
// optional (TH falls back to EN, Links to [], Order to 0) so a row created
// before Klao fills in the rest still renders (Review Focus #1).
export function mapFaqItem(page: NotionPage): FaqItem | null {
  const questionEn = text(page.properties.QuestionEN);
  if (!questionEn) return skip('FAQ', page, 'missing QuestionEN');
  const answerEn = text(page.properties.AnswerEN);
  if (!answerEn) return skip('FAQ', page, 'missing AnswerEN');
  return {
    id: page.id,
    question: localized(questionEn, text(page.properties.QuestionTH)),
    answer: localized(answerEn, text(page.properties.AnswerTH)),
    links: parseFaqLinks(text(page.properties.Links)),
    order: num(page.properties.Order),
  };
}
```

3c. `src/content/fixtures/profile.json` — directly after the line `  "email": "suvichuk.j@gmail.com",` insert:

```json
  "basedIn": { "en": "Bangkok, TH", "th": "กรุงเทพฯ" },
  "workingIn": "TH / EN",
```

3d. Every `Profile` literal in the tests gains the two fields (the full-object expectation in `tests/mappers.test.ts` included). The anchor line `nameNative: null,` appears only in Profile-shaped objects:

```bash
perl -pi -e 's/^(\s*)nameNative: null,\n/$1nameNative: null,\n$1basedIn: null,\n$1workingIn: null,\n/' tests/*.ts tests/*.tsx
grep -rn "workingIn: null" tests
```
Expected: one hit per file that has a `nameNative: null,` line (seven before P0–P3 edits: hero, career-resume, site-nav, contact-band, bands, site-footer, mappers — whatever still exists).

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/faq-mappers.test.ts tests/mappers.test.ts && npx tsc --noEmit`
Expected: PASS; tsc exits 0 (a tsc error naming a missing `basedIn` points at a Profile literal the perl anchor missed — add `basedIn: null, workingIn: null,` there by hand).

- [ ] **Step 5: Commit**

```bash
git add src/lib/models.ts src/lib/notion-mappers.ts src/content/fixtures/profile.json tests
git commit -m "$(cat <<'EOF'
feat(faq): FaqItem model, Links parser, Profile BasedIn/WorkingIn

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
)"
```

---

### Task 4: FAQ fixture, `fetchFaq`, `getFaq`

**Files:** Create `src/content/fixtures/faq.json` · Modify `src/lib/notion.ts` (import lines, `dbId` union, new fetcher after `fetchQuestions`) · Modify `src/lib/content.ts` (import + new getter at the end) · Modify `.env.example` · Test `tests/content-faq.test.ts`, `tests/faq-fixture.test.ts`
**Interfaces:** Consumes: `mapFaqItem` (Task 3), `parseTarget` (Task 2), `projectKey` (C6), `CareerEntry.key` (C5 P3) · Produces: `fetchFaq(): Promise<FaqItem[]>` · `getFaq(): Promise<FaqItem[]>` (sorted by `order`; fixtures when `NOTION_DB_FAQ` is unset, even with `NOTION_TOKEN` set)

- [ ] **Step 1: Write the failing tests**

`tests/content-faq.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import faqFixture from '@/content/fixtures/faq.json';

// Isolated file, like tests/content-questions.test.ts, so this module mock
// never leaks into the fixture-mode assertions elsewhere.
const { fetchFaq } = vi.hoisted(() => ({ fetchFaq: vi.fn() }));
vi.mock('@/lib/notion', () => ({ fetchFaq }));

const row = (id: string, order: number) => ({
  id,
  question: { en: `${id}?`, th: `${id}?` },
  answer: { en: 'A', th: 'A' },
  links: [],
  order,
});
const fixtureIds = faqFixture.map((i) => i.id);

describe('getFaq', () => {
  beforeEach(() => {
    fetchFaq.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('serves the fixtures in fixture mode (no NOTION_TOKEN)', async () => {
    vi.stubEnv('NOTION_TOKEN', '');
    const { getFaq } = await import('@/lib/content');
    expect((await getFaq()).map((i) => i.id)).toEqual(fixtureIds);
    expect(fetchFaq).not.toHaveBeenCalled();
  });

  it('serves the fixtures when NOTION_TOKEN is set but NOTION_DB_FAQ is not (Review Focus #1)', async () => {
    // Mid-migration: the token is live, the FAQ DB isn't created yet. The
    // page must keep its FAQ rather than go empty or throw (contract C5).
    vi.stubEnv('NOTION_TOKEN', 'x');
    vi.stubEnv('NOTION_DB_FAQ', '');
    const { getFaq } = await import('@/lib/content');
    expect((await getFaq()).map((i) => i.id)).toEqual(fixtureIds);
    expect(fetchFaq).not.toHaveBeenCalled();
  });

  it('reads Notion, sorted by Order, once NOTION_DB_FAQ is set', async () => {
    vi.stubEnv('NOTION_TOKEN', 'x');
    vi.stubEnv('NOTION_DB_FAQ', 'db-faq');
    fetchFaq.mockResolvedValue([row('b', 2), row('a', 1)]);
    const { getFaq } = await import('@/lib/content');
    expect((await getFaq()).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('falls back to the fixtures when Notion fails during the production build', async () => {
    vi.stubEnv('NOTION_TOKEN', 'x');
    vi.stubEnv('NOTION_DB_FAQ', 'db-faq');
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchFaq.mockRejectedValue(new Error('notion down'));
    const { getFaq } = await import('@/lib/content');
    expect((await getFaq()).map((i) => i.id)).toEqual(fixtureIds);
    warn.mockRestore();
  });

  it('rethrows a Notion failure at runtime, so ISR keeps serving the last good page', async () => {
    vi.stubEnv('NOTION_TOKEN', 'x');
    vi.stubEnv('NOTION_DB_FAQ', 'db-faq');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchFaq.mockRejectedValue(new Error('notion down'));
    const { getFaq } = await import('@/lib/content');
    await expect(getFaq()).rejects.toThrow('notion down');
    warn.mockRestore();
  });
});
```

`tests/faq-fixture.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import careerFixture from '@/content/fixtures/career.json';
import faqFixture from '@/content/fixtures/faq.json';
import projectsFixture from '@/content/fixtures/projects.json';
import { parseTarget } from '@/lib/link-target';
import type { CareerEntry, FaqItem, Project } from '@/lib/models';
import { mapFaqItem } from '@/lib/notion-mappers';
import { projectKey } from '@/lib/sheet-url';

const items = faqFixture as FaqItem[];
const rich = (s: string) => ({ rich_text: s ? [{ plain_text: s }] : [] });

describe('faq.json (two-layer rule: Notion + fixtures)', () => {
  it('carries the five approved prototype questions, in order', () => {
    expect(items.map((i) => i.question.en)).toEqual([
      'What does Klao do day to day?',
      'Does he actually build the apps himself?',
      'Has he run a business?',
      'Which languages does he work in?',
      'How do I reach him?',
    ]);
    expect(items.map((i) => i.order)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });

  it('keeps "What work is he open to?" out until Klao writes the answer (spec §3, 25 Sep)', () => {
    expect(JSON.stringify(faqFixture)).not.toMatch(/open to\?/i);
  });

  it('is exactly what the mapper makes of the same Notion row', () => {
    for (const item of items) {
      const page = {
        id: item.id,
        properties: {
          QuestionEN: { title: [{ plain_text: item.question.en }] },
          QuestionTH: rich(item.question.th),
          AnswerEN: rich(item.answer.en),
          AnswerTH: rich(item.answer.th),
          Links: rich(item.links.map((l) => `${l.label.en}|${l.label.th}|${l.target}`).join('\n')),
          Order: { number: item.order },
          Published: { checkbox: true },
        },
      };
      expect(mapFaqItem(page), item.id).toEqual(item);
    }
  });

  it('points every link at something the fixtures actually have', () => {
    // If this fails on a career key, P3's career.json uses a different
    // `key` for that employer: change the FAQ target to P3's key (and the
    // same target in src/lib/ask.ts), never the other way round.
    const careerKeys = new Set((careerFixture as CareerEntry[]).map((c) => c.key));
    const projectKeys = new Set((projectsFixture as Project[]).map((p) => projectKey(p)));
    for (const item of items) {
      for (const link of item.links) {
        const t = parseTarget(link.target);
        expect(t, link.target).not.toBeNull();
        if (t?.kind === 'career') expect(careerKeys.has(t.key), `career key "${t.key}"`).toBe(true);
        if (t?.kind === 'sheet') expect(projectKeys.has(t.key), `project key "${t.key}"`).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/content-faq.test.ts tests/faq-fixture.test.ts`
Expected: FAIL — `Failed to resolve import "@/content/fixtures/faq.json"`.

- [ ] **Step 3: Implement**

3a. Create `src/content/fixtures/faq.json` (copy verbatim from the prototype's `FAQ` block, lines 1120–1135):

```json
[
  {
    "id": "fx-faq-day",
    "question": {
      "en": "What does Klao do day to day?",
      "th": "Klao ทำงานอะไรในแต่ละวัน?"
    },
    "answer": {
      "en": "Senior Business Development at Actmedia since March 2026: opening new retail channels with Modern Trade retailers, project-managing live in-store rollouts, and building the financial models behind each partnership deal.",
      "th": "เป็น Senior Business Development ที่ Actmedia ตั้งแต่ มี.ค. 2026 หาช่องทางใหม่กับค้าปลีก Modern Trade คุมโปรเจกต์ติดตั้งสื่อในร้านที่รันอยู่ และทำโมเดลการเงินก่อนเข้าดีลพาร์ตเนอร์แต่ละครั้ง"
    },
    "links": [
      { "label": { "en": "Career · Actmedia", "th": "Career · Actmedia" }, "target": "career:actmedia" }
    ],
    "order": 1
  },
  {
    "id": "fx-faq-build",
    "question": {
      "en": "Does he actually build the apps himself?",
      "th": "สร้างแอปเองจริงไหม?"
    },
    "answer": {
      "en": "Yes, on nights and weekends, with AI-assisted development (Claude). GoNai is live, Aje is a working prototype, and this site is edited in Notion.",
      "th": "จริงครับ ทำนอกเวลางานด้วย AI-assisted development (Claude) GoNai เปิดใช้งานแล้ว Aje เป็น prototype ที่ใช้งานได้ และเว็บนี้แก้เนื้อหาผ่าน Notion"
    },
    "links": [
      { "label": { "en": "Projects", "th": "Projects" }, "target": "work" },
      { "label": { "en": "Toolbox", "th": "Toolbox" }, "target": "toolbox" }
    ],
    "order": 2
  },
  {
    "id": "fx-faq-business",
    "question": {
      "en": "Has he run a business?",
      "th": "เคยทำธุรกิจเองไหม?"
    },
    "answer": {
      "en": "He founded A Bun Dance, a craft-burger shop, and ran it for 20 months with 6–8 part-time staff, holding gross profit at about 35% per unit.",
      "th": "เคยก่อตั้งร้าน A Bun Dance เบอร์เกอร์คราฟต์ ทำอยู่ 20 เดือน ดูแลพนักงานพาร์ทไทม์ 6–8 คน และคุมกำไรขั้นต้นได้ราว 35% ต่อชิ้น"
    },
    "links": [
      { "label": { "en": "Career · A Bun Dance", "th": "Career · A Bun Dance" }, "target": "career:a-bun-dance" }
    ],
    "order": 3
  },
  {
    "id": "fx-faq-languages",
    "question": {
      "en": "Which languages does he work in?",
      "th": "ทำงานได้กี่ภาษา?"
    },
    "answer": {
      "en": "Thai, and English at a conversational level. This site and his projects ship in both.",
      "th": "ภาษาไทย และภาษาอังกฤษระดับสนทนา เว็บนี้และโปรเจกต์ของเขาทำครบทั้งสองภาษา"
    },
    "links": [
      { "label": { "en": "Toolbox · Languages", "th": "Toolbox · ภาษา" }, "target": "toolbox" }
    ],
    "order": 4
  },
  {
    "id": "fx-faq-contact",
    "question": {
      "en": "How do I reach him?",
      "th": "ติดต่อยังไง?"
    },
    "answer": {
      "en": "Email suvichuk.j@gmail.com, or use Start a conversation at the end of this page.",
      "th": "อีเมล suvichuk.j@gmail.com หรือกด \"เริ่มคุยกัน\" ท้ายหน้านี้"
    },
    "links": [
      { "label": { "en": "Contact", "th": "Contact" }, "target": "contact" }
    ],
    "order": 5
  }
]
```

3b. `src/lib/notion.ts`:
- add `FaqItem` to the `import type { … } from './models';` list and `mapFaqItem` to the `from './notion-mappers'` import list;
- in the `dbId` parameter union, add `| 'FAQ'` (so the literal list gains `'FAQ'`);
- directly after `fetchQuestions`, add:

```ts
// P4 (spec §7): the FAQ DB. Only called by content.ts once NOTION_DB_FAQ is
// set (getFaq serves fixtures until then), so dbId's throw can't fire mid-migration.
export async function fetchFaq(): Promise<FaqItem[]> {
  return (await queryAll(dbId('FAQ'), true)).map(mapFaqItem).filter(nonNull);
}
```

3c. `src/lib/content.ts` — add `FaqItem` to the `import type { … } from './models';` list, add `import faqFixture from '@/content/fixtures/faq.json';` after the other fixture imports, and append at the end of the file:

```ts
// P4 (contract C5): the FAQ band, the ⌘K index (layout) and the Ask Preview
// all read this in one render, hence cache(). Deliberately unlike Questions:
// with NOTION_DB_FAQ unset this serves the fixtures — even when NOTION_TOKEN
// is set — so the live page keeps its FAQ through the Notion migration
// instead of losing the section until a Vercel env var is added.
const getFaqCached = cache(async (): Promise<FaqItem[]> => {
  const all = process.env.NOTION_DB_FAQ
    ? await fromNotion((n) => n.fetchFaq(), faqFixture as FaqItem[])
    : (faqFixture as FaqItem[]);
  return [...all].sort((a, b) => a.order - b.order);
});

export async function getFaq(): Promise<FaqItem[]> {
  return getFaqCached();
}
```

3d. `.env.example` — directly after the line `NOTION_DB_QUESTIONS=` add `NOTION_DB_FAQ=`.

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/content-faq.test.ts tests/faq-fixture.test.ts tests/no-placeholders.test.tsx tests/content.test.ts && npx tsc --noEmit`
Expected: PASS. The two `career:` targets are P3's pinned fixture keys (`actmedia`, `a-bun-dance` = `slugKey(company)`, P3 plan Task 3), not the prototype's `abundance`. If the parity test still fails on a career key, P3 shipped different keys: use P3's keys in `faq.json` and `src/lib/ask.ts` (Task 12) and re-run.

- [ ] **Step 5: Commit**

```bash
git add src/content/fixtures/faq.json src/lib/notion.ts src/lib/content.ts .env.example tests/content-faq.test.ts tests/faq-fixture.test.ts
git commit -m "$(cat <<'EOF'
feat(faq): FAQ fixtures from the prototype and getFaq with a mid-migration fallback

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
)"
```

---

### Task 5: UI strings and `fill()`

**Files:** Modify `src/lib/format.ts` (append) · Modify `src/lib/dictionary.ts` (end of `en`, end of `th`, two TH lines, end of file) · Test `tests/format-fill.test.ts`, append to `tests/dictionary.test.ts`
**Interfaces:** Produces: `fill(template: string, vars: Record<string, string | number>): string` · `type UiStringKey` (keys of `UiDict` whose value is a string) · dictionary keys `faqTitle faqExpand faqCollapse faqSource faqMore closeResume closeCopyFail closeOpenQ closeOpenQSubject closeTellMe footProjects footCareer footElsewhere footAppearance footResume palSearch palPlaceholder palSuggested palGo palProjects palCareer palFaq palLinks palPrefs palNone palAsk palCount palMove palOpen palClose palCancel palTop palStory palContact palCopyEmail palOpenResume palLang palThemeAuto palThemeLight palThemeDark askTitle askBadge askTrust askSources askSourceN askReady askDeclined askWrong` · CHANGED `th.footerNote`, `th.contentUpdated`

- [ ] **Step 1: Write the failing tests**

`tests/format-fill.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { fill } from '@/lib/format';

describe('fill', () => {
  it('fills named slots', () => {
    expect(fill('{n} results', { n: 3 })).toBe('3 results');
    expect(fill('Ask Klao: “{q}”', { q: 'hi' })).toBe('Ask Klao: “hi”');
  });

  it('leaves an unknown slot visible, so a typo shows on screen instead of vanishing', () => {
    expect(fill('{x} stays', {})).toBe('{x} stays');
  });
});
```

Append inside the `describe('dictionary', …)` block of `tests/dictionary.test.ts`:

```ts
  it('carries the P4 copy from the approved prototype', () => {
    expect(dict.en.faqTitle).toBe('What people usually ask.');
    expect(dict.th.faqTitle).toBe('คำถามที่เจอบ่อย');
    expect(dict.en.askBadge).toBe('Preview');
    expect(dict.th.askBadge).toBe('ตัวอย่าง');
    expect(dict.en.footerNote).toBe('Built at night, powered by good coffee.');
    expect(dict.th.footerNote).toBe('สร้างตอนกลางคืน ด้วยกาแฟดีๆ');
    expect(dict.th.contentUpdated).toBe('อัปเดตเนื้อหาล่าสุด');
  });

  it('keeps every template slot in both locales', () => {
    for (const l of ['en', 'th'] as const) {
      expect(dict[l].palNone, l).toContain('{q}');
      expect(dict[l].palAsk, l).toContain('{q}');
      expect(dict[l].palCount, l).toContain('{n}');
      expect(dict[l].askSourceN, l).toContain('{n}');
      expect(dict[l].askReady, l).toContain('{n}');
      expect(dict[l].askDeclined, l).toContain('{email}');
    }
  });

  it('never promises instant updates (the site refreshes through ISR, about an hour)', () => {
    expect(JSON.stringify(dict)).not.toMatch(/instant|immediately|ทันที/i);
  });
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/format-fill.test.ts tests/dictionary.test.ts`
Expected: FAIL — `fill is not a function`; `dict.en.faqTitle` is `undefined`; TH footerNote is `'สร้างตอนกลางคืน ด้วยกาแฟดีๆ หลายแก้ว'`.

- [ ] **Step 3: Implement**

3a. Append to `src/lib/format.ts`:

```ts
// Fills `{name}` slots in a dictionary template ('{n} results',
// 'Ask Klao: “{q}”'). Word order differs between Thai and English, so the
// dictionary owns the whole sentence and code only supplies the values. An
// unknown slot stays as written: a typo shows on screen instead of vanishing.
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (slot, name: string) => (name in vars ? String(vars[name]) : slot));
}
```

3b. `src/lib/dictionary.ts` — insert this block as the last members of `const en = { … }` (directly before the `};` that precedes `const th: typeof en = {`):

```ts
  // --- White Edition P4: FAQ, close band, footer, ⌘K + Ask Preview. -----
  // Every string is the approved prototype's (design/white-edition/
  // prototype/index.html, `UI`). Templates carry {q}/{n}/{email} slots for
  // format.ts's fill(), because the slot sits in a different place in Thai.
  faqTitle: 'What people usually ask.',
  faqExpand: 'Expand all',
  faqCollapse: 'Collapse all',
  faqSource: 'Source:',
  faqMore: 'Didn’t find it? Search or ask Klao (⌘K) ›',
  closeResume: 'Résumé (PDF) ›',
  closeCopyFail: 'Press ⌘C to copy',
  closeOpenQ: 'Open question:',
  closeOpenQSubject: 'Open question',
  closeTellMe: 'Tell me by email ›',
  footProjects: 'Projects',
  footCareer: 'Career',
  footElsewhere: 'Elsewhere',
  footAppearance: 'Appearance',
  footResume: 'Résumé',
  palSearch: 'Search (⌘K)',
  palPlaceholder: 'Search or jump to…',
  palSuggested: 'Suggested',
  palGo: 'Go to',
  palProjects: 'Projects',
  palCareer: 'Career',
  palFaq: 'FAQ',
  palLinks: 'Links',
  palPrefs: 'Preferences',
  palNone: 'No results for “{q}”',
  palAsk: 'Ask Klao: “{q}”',
  palCount: '{n} results',
  palMove: '↑↓ move',
  palOpen: '↵ open',
  palClose: 'esc close',
  palCancel: 'Cancel',
  palTop: 'Top',
  palStory: 'How I work',
  palContact: 'Contact',
  palCopyEmail: 'Copy email',
  palOpenResume: 'Open résumé',
  palLang: 'Switch to ภาษาไทย',
  palThemeAuto: 'Auto',
  palThemeLight: 'Light',
  palThemeDark: 'Dark',
  askTitle: 'Ask Klao',
  askBadge: 'Preview',
  askTrust: 'Preview. Answers are pre-written from this page, with the section each one came from. No AI is called yet.',
  askSources: 'Sources',
  askSourceN: 'Source {n}',
  askReady: 'Answer ready, {n} sources',
  askDeclined: 'That isn’t in Klao’s published content, so I won’t guess. You can ask him directly at {email}.',
  askWrong: 'Something wrong? Tell Klao',
```

Insert this block as the last members of `const th: typeof en = { … }` (directly before the `};` that precedes `export type UiDict`):

```ts
  faqTitle: 'คำถามที่เจอบ่อย',
  faqExpand: 'เปิดทั้งหมด',
  faqCollapse: 'ปิดทั้งหมด',
  faqSource: 'ที่มา:',
  faqMore: 'ไม่เจอคำตอบ? ค้นหาหรือถาม Klao (⌘K) ›',
  closeResume: 'เรซูเม่ (PDF) ›',
  closeCopyFail: 'กด ⌘C เพื่อคัดลอก',
  closeOpenQ: 'คำถามที่ยังเปิดอยู่:',
  closeOpenQSubject: 'คำถามที่ยังเปิดอยู่',
  closeTellMe: 'ตอบกลับทางอีเมลได้เลย ›',
  footProjects: 'โปรเจกต์',
  footCareer: 'เส้นทางอาชีพ',
  footElsewhere: 'ช่องทางอื่น',
  footAppearance: 'การแสดงผล',
  footResume: 'เรซูเม่',
  palSearch: 'ค้นหา (⌘K)',
  palPlaceholder: 'ค้นหา หรือไปที่…',
  palSuggested: 'แนะนำ',
  palGo: 'ไปที่',
  palProjects: 'โปรเจกต์',
  palCareer: 'เส้นทางอาชีพ',
  palFaq: 'คำถามที่เจอบ่อย',
  palLinks: 'ลิงก์',
  palPrefs: 'ตั้งค่า',
  palNone: 'ไม่พบ “{q}”',
  palAsk: 'ถาม Klao: “{q}”',
  palCount: 'พบ {n} รายการ',
  palMove: '↑↓ เลื่อน',
  palOpen: '↵ เปิด',
  palClose: 'esc ปิด',
  palCancel: 'ยกเลิก',
  palTop: 'ด้านบน',
  palStory: 'วิธีทำงาน',
  palContact: 'ติดต่อ',
  palCopyEmail: 'คัดลอกอีเมล',
  palOpenResume: 'เปิดเรซูเม่',
  palLang: 'Switch to English',
  palThemeAuto: 'ตามเครื่อง',
  palThemeLight: 'สว่าง',
  palThemeDark: 'มืด',
  askTitle: 'ถาม Klao',
  askBadge: 'ตัวอย่าง',
  askTrust: 'ตัวอย่าง: คำตอบเขียนเตรียมไว้จากเนื้อหาในหน้านี้ พร้อมบอกว่ามาจากส่วนไหน ยังไม่ได้เรียก AI จริง',
  askSources: 'ที่มา',
  askSourceN: 'ที่มา {n}',
  askReady: 'ได้คำตอบแล้ว มีที่มา {n} แห่ง',
  askDeclined: 'เรื่องนี้ไม่มีในเนื้อหาที่ Klao เผยแพร่ไว้ เลยขอไม่เดาครับ ถาม Klao ตรงๆ ได้ที่ {email}',
  askWrong: 'ตอบผิด? บอก Klao',
```

CHANGED (match the prototype's legal line) — in `th`:
- `footerNote: 'สร้างตอนกลางคืน ด้วยกาแฟดีๆ หลายแก้ว',` → `footerNote: 'สร้างตอนกลางคืน ด้วยกาแฟดีๆ',`
- `contentUpdated: 'เนื้อหาอัปเดตล่าสุด',` → `contentUpdated: 'อัปเดตเนื้อหาล่าสุด',`

Append at the end of the file (after `export const dict …`):

```ts
// Keys whose value is a plain string — lets tables of labels (⌘K sections,
// theme names) index `dict[locale]` without casting away the array entries.
export type UiStringKey = { [K in keyof UiDict]: UiDict[K] extends string ? K : never }[keyof UiDict];
```

If `tsc` reports `TS1117 An object literal cannot have multiple properties with the same name` for any key above, P1–P3 already added it: delete the P4 line for that key (both locales) and keep theirs.

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/format-fill.test.ts tests/dictionary.test.ts && npx tsc --noEmit`
Expected: PASS (the existing "same key set", "no empty strings" and "no untranslated values" tests still pass — every new EN/TH pair differs).

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/dictionary.ts tests/format-fill.test.ts tests/dictionary.test.ts
git commit -m "$(cat <<'EOF'
feat(copy): P4 strings from the prototype, fill() for templates, TH legal line matches

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
)"
```

---

### Task 6: Deep links (`deep-link.ts`, `DeepLink`, `PaletteButton`)

**Files:** Modify `src/lib/deep-link.ts` (P1 Task 1 created it with `PALETTE_EVENT` + `openPalette`; replace the whole file with the version in Step 3, which keeps both exports byte-for-byte compatible — same names, signature and `{}`/`{ query }` detail — so P1's `tests/palette-event.test.ts` stays green) · Create `src/components/DeepLink.tsx`, `src/components/PaletteButton.tsx` · Test `tests/deep-link.test.tsx`
**Interfaces:** Consumes: `parseTarget`, `targetHref` (Task 2), `sheetHash` (C6), `CAREER_EVENT` (P3, `src/lib/career.ts`, = `'klao:career'`) · Produces: `PALETTE_EVENT = 'klao:palette'` · re-export of `CAREER_EVENT` · `openPalette(query?: string): void` · `followTarget(raw: string): boolean` (true = handled in place) · `goToTarget(raw: string, locale: Locale): void` · `<DeepLink target locale className? children />` · `<PaletteButton query? className? children />`

- [ ] **Step 1: Write the failing test** — `tests/deep-link.test.tsx`

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DeepLink from '@/components/DeepLink';
import PaletteButton from '@/components/PaletteButton';
import { CAREER_EVENT, PALETTE_EVENT, followTarget, openPalette } from '@/lib/deep-link';

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  // jsdom has no layout (window.scrollTo is "not implemented"); the spy
  // records the jump instead.
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  history.replaceState(null, '', '/');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const listen = (name: string) => {
  const heard = vi.fn();
  window.addEventListener(name, heard);
  return heard;
};

describe('openPalette', () => {
  it('dispatches the C8 event, with the query when there is one', () => {
    const heard = listen(PALETTE_EVENT);
    openPalette();
    openPalette('gonai');
    expect((heard.mock.calls[0][0] as CustomEvent).detail).toEqual({});
    expect((heard.mock.calls[1][0] as CustomEvent).detail).toEqual({ query: 'gonai' });
    window.removeEventListener(PALETTE_EVENT, heard);
  });
});

describe('followTarget', () => {
  it('career:<key> tells CareerDetent which pill, then brings the band into view with focus on its heading', () => {
    document.body.innerHTML = '<section id="career"><h2>Career</h2></section>';
    const heard = listen(CAREER_EVENT);
    expect(followTarget('career:actmedia')).toBe(true);
    expect((heard.mock.calls[0][0] as CustomEvent).detail).toEqual({ key: 'actmedia' });
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    const h2 = document.querySelector('h2')!;
    expect(document.activeElement).toBe(h2);
    expect(h2.getAttribute('tabindex')).toBe('-1');
    window.removeEventListener(CAREER_EVENT, heard);
  });

  it('work/<key> sets the sheet hash (P2 opens the sheet on hashchange)', () => {
    document.body.innerHTML = '<section id="work"></section>';
    expect(followTarget('work/gonai')).toBe(true);
    expect(window.location.hash).toBe('#work/gonai');
  });

  it('opens a FAQ <details> it is pointed at and focuses its summary', () => {
    document.body.innerHTML = '<details id="faq-fx-faq-day"><summary>Q</summary><p>A</p></details>';
    expect(followTarget('faq-fx-faq-day')).toBe(true);
    const details = document.querySelector('details')!;
    expect(details.open).toBe(true);
    expect(document.activeElement).toBe(details.querySelector('summary'));
  });

  it('declines (returns false) when the target is not on this page, is external, or is malformed', () => {
    expect(followTarget('career:actmedia')).toBe(false);
    expect(followTarget('work/gonai')).toBe(false);
    expect(followTarget('story')).toBe(false);
    expect(followTarget('https://github.com/Klaosj')).toBe(false);
    expect(followTarget('javascript:alert(1)')).toBe(false);
    expect(window.location.hash).toBe('');
  });
});

describe('DeepLink', () => {
  it('renders a real href and handles the click in place when the target is on the page', () => {
    document.body.innerHTML = '<section id="career"><h2>Career</h2></section>';
    render(<DeepLink target="career:abundance" locale="en">Career · A Bun Dance</DeepLink>);
    const link = screen.getByRole('link', { name: 'Career · A Bun Dance' });
    expect(link.getAttribute('href')).toBe('/en#career');
    // fireEvent returns false when the handler called preventDefault().
    expect(fireEvent.click(link)).toBe(false);
  });

  it('leaves modified clicks (new tab) to the browser', () => {
    document.body.innerHTML = '<section id="career"><h2>Career</h2></section>';
    const heard = listen(CAREER_EVENT);
    render(<DeepLink target="career:abundance" locale="en">Career</DeepLink>);
    expect(fireEvent.click(screen.getByRole('link'), { metaKey: true })).toBe(true);
    expect(heard).not.toHaveBeenCalled();
    window.removeEventListener(CAREER_EVENT, heard);
  });

  it('opens external targets in a new tab without an opener', () => {
    render(<DeepLink target="https://gonai-three.vercel.app" locale="th">GoNai</DeepLink>);
    const link = screen.getByRole('link', { name: 'GoNai' });
    expect(link.getAttribute('href')).toBe('https://gonai-three.vercel.app');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('renders a malformed target as plain text, never as a dead link', () => {
    render(<DeepLink target="javascript:alert(1)" locale="en">Nope</DeepLink>);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Nope')).toBeTruthy();
  });
});

describe('PaletteButton', () => {
  it('opens ⌘K through the C8 event', () => {
    const heard = listen(PALETTE_EVENT);
    render(<PaletteButton>Search</PaletteButton>);
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(heard).toHaveBeenCalledTimes(1);
    window.removeEventListener(PALETTE_EVENT, heard);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/deep-link.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/DeepLink"`.

- [ ] **Step 3: Implement**

`src/lib/deep-link.ts` (replace P1's file entirely):

```ts
import { CAREER_EVENT } from './career';
import { parseTarget, targetHref } from './link-target';
import type { Locale } from './models';
import { sheetHash } from './sheet-url';

// Contract C8. The nav's ⌘K button (P1) and the FAQ's "ask Klao" line
// dispatch PALETTE_EVENT and PaletteHost (P4) listens. CAREER_EVENT is P3's
// constant (src/lib/career.ts, heard by CareerDetent), re-exported so P4
// callers import both event names from one place and the string exists once.
export const PALETTE_EVENT = 'klao:palette';
export { CAREER_EVENT };

export function openPalette(query?: string): void {
  window.dispatchEvent(new CustomEvent(PALETTE_EVENT, { detail: query ? { query } : {} }));
}

// The capsule nav floats over the top of the page; the prototype's
// scrollToEl lands a section 76 px below the viewport top so its heading
// clears the capsule. An instant jump (not smooth) is the prototype's
// choice and needs no reduced-motion branch.
const NAV_CLEARANCE = 76;

function reveal(el: HTMLElement): void {
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - NAV_CLEARANCE, behavior: 'auto' });
  // Move focus with the view, or a keyboard user's next Tab starts from
  // wherever they clicked. Headings get tabindex -1 so they take focus
  // without becoming Tab stops.
  const target =
    (el instanceof HTMLDetailsElement ? el.querySelector<HTMLElement>('summary') : el.querySelector<HTMLElement>('h2, h3')) ??
    el;
  if (!target.matches('a[href], button, summary, input, [tabindex]')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

// Follows a link-target in place when its destination is on this page.
// Returns false when it can't (another route, an outside URL, a malformed
// target) so the caller lets the browser follow the href instead.
export function followTarget(raw: string): boolean {
  const t = parseTarget(raw);
  if (!t || t.kind === 'external') return false;
  if (t.kind === 'sheet') {
    if (!document.getElementById('work')) return false;
    // A real hash change (not pushState) so P2's sheet, which listens for
    // hashchange/popstate, opens exactly as it does for a pasted URL.
    window.location.hash = sheetHash(t.key);
    return true;
  }
  const el = document.getElementById(t.kind === 'career' ? 'career' : t.id);
  if (!el) return false;
  // Switch the pill first, so the panel is already right when it scrolls in.
  if (t.kind === 'career') window.dispatchEvent(new CustomEvent(CAREER_EVENT, { detail: { key: t.key } }));
  if (el instanceof HTMLDetailsElement) el.open = true;
  reveal(el);
  return true;
}

// For callers with no <a> of their own (⌘K rows, Ask sources): follow in
// place, else navigate to the target's href.
export function goToTarget(raw: string, locale: Locale): void {
  if (followTarget(raw)) return;
  const href = targetHref(raw, locale);
  if (!href) return;
  if (parseTarget(raw)?.kind === 'external') window.open(href, '_blank', 'noopener');
  else window.location.assign(href);
}
```

`src/components/DeepLink.tsx`:

```tsx
'use client';

import type { ReactNode } from 'react';
import { followTarget } from '@/lib/deep-link';
import { parseTarget, targetHref } from '@/lib/link-target';
import type { Locale } from '@/lib/models';

// A plain <a> with a real href (works with JavaScript off and from any
// route) that, when its destination is on this page, deep-links in place:
// switches the Career pill, opens the sheet, opens a FAQ answer. Plain <a>,
// not next/link: Link changes the hash with pushState, which fires no
// hashchange, and P2's sheet listens for exactly that.
export default function DeepLink({
  target,
  locale,
  className,
  children,
}: {
  target: string;
  locale: Locale;
  className?: string;
  children: ReactNode;
}) {
  const href = targetHref(target, locale);
  // The mappers already drop malformed Links lines; this only guards
  // hand-written callers, and a label is better than a dead link.
  if (!href) return <span className={className}>{children}</span>;
  const external = parseTarget(target)?.kind === 'external';
  return (
    <a
      href={href}
      className={className}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      onClick={(e) => {
        // New-tab clicks and outside links belong to the browser.
        if (external || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (followTarget(target)) e.preventDefault();
      }}
    >
      {children}
    </a>
  );
}
```

`src/components/PaletteButton.tsx`:

```tsx
'use client';

import type { ReactNode } from 'react';
import { openPalette } from '@/lib/deep-link';

// Opens ⌘K from anywhere in the page (the FAQ's "Didn't find it?" line).
// Only an event: the palette's own code loads on first open (PaletteHost).
export default function PaletteButton({
  query,
  className,
  children,
}: {
  query?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button type="button" className={className} aria-keyshortcuts="Meta+K Control+K" onClick={() => openPalette(query)}>
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/deep-link.test.tsx tests/palette-event.test.ts && npx tsc --noEmit && npx eslint src/lib/deep-link.ts src/components/DeepLink.tsx src/components/PaletteButton.tsx` (P1's palette-event test must still pass against the replaced file)
Expected: PASS, tsc 0, eslint clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/deep-link.ts src/components/DeepLink.tsx src/components/PaletteButton.tsx tests/deep-link.test.tsx
git commit -m "$(cat <<'EOF'
feat(links): deep links that open the Career pill, the sheet or a FAQ answer in place

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
)"
```

---

### Task 7: FaqBand (replaces QuestionsBand; ClientsBand leaves the page)

**Files:** Create `src/components/sections/FaqBand.tsx`, `src/components/sections/FaqExpandAll.tsx`, `src/components/sections/faq.css` · Modify `src/app/[locale]/page.tsx` (imports, `Promise.all`, JSX after `<ByDay … />`) · Delete `src/components/sections/QuestionsBand.tsx`, `tests/questions-band.test.tsx` · Test `tests/faq-band.test.tsx`
**Interfaces:** Consumes: `getFaq` (Task 4), `DeepLink`, `PaletteButton` (Task 6), `faqAnchorId` (Task 2), `dict` keys (Task 5), `Icon` (C4), `ThaiText` (C3), `Reveal` (C9), `.t-h2 .t-faq .t-body .section .wrap-wide` (C9) · Produces: `<FaqBand items={FaqItem[]} locale />` (server; `null` when `items` is empty) · `<FaqExpandAll expandLabel collapseLabel />` (client)

- [ ] **Step 1: Write the failing test** — `tests/faq-band.test.tsx`

```tsx
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FaqBand from '@/components/sections/FaqBand';
import { dict } from '@/lib/dictionary';
import type { FaqItem } from '@/lib/models';

afterEach(cleanup);

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

const items: FaqItem[] = [
  {
    id: 'fx-faq-business',
    question: { en: 'Has he run a business?', th: 'เคยทำธุรกิจเองไหม?' },
    answer: { en: 'He founded A Bun Dance.', th: 'เคยก่อตั้งร้าน A Bun Dance' },
    links: [{ label: { en: 'Career · A Bun Dance', th: 'Career · A Bun Dance' }, target: 'career:abundance' }],
    order: 1,
  },
  {
    id: 'fx-faq-build',
    question: { en: 'Does he actually build the apps himself?', th: 'สร้างแอปเองจริงไหม?' },
    answer: { en: 'Yes, on nights and weekends.', th: 'จริงครับ ทำนอกเวลางาน' },
    links: [
      { label: { en: 'Projects', th: 'Projects' }, target: 'work' },
      { label: { en: 'Toolbox', th: 'Toolbox' }, target: 'toolbox' },
      { label: { en: 'GoNai', th: 'GoNai' }, target: 'https://gonai-three.vercel.app' },
    ],
    order: 2,
  },
];

const detailsOf = (root: ParentNode) => Array.from(root.querySelectorAll('details'));

describe('FaqBand', () => {
  it('renders #faq, named by its headline, with every question and answer in the DOM', () => {
    render(<FaqBand items={items} locale="en" />);
    const section = screen.getByRole('region', { name: dict.en.faqTitle });
    expect(section.id).toBe('faq');
    for (const item of items) {
      expect(within(section).getByText(item.question.en)).toBeTruthy();
      // Answers sit inside closed <details>: still in the DOM, reachable
      // without JavaScript.
      expect(within(section).getByText(item.answer.en)).toBeTruthy();
    }
  });

  it('uses native <details> with stable ids, closed by default', () => {
    const { container } = render(<FaqBand items={items} locale="en" />);
    expect(detailsOf(container).map((d) => d.id)).toEqual(['faq-fx-faq-business', 'faq-fx-faq-build']);
    expect(detailsOf(container).some((d) => d.open)).toBe(false);
    expect(container.querySelectorAll('summary.t-faq')).toHaveLength(2);
  });

  it('renders every source as a real link that works without JavaScript', () => {
    render(<FaqBand items={items} locale="en" />);
    const career = screen.getByRole('link', { name: 'Career · A Bun Dance', hidden: true });
    expect(career.getAttribute('href')).toBe('/en#career');
    expect(screen.getByRole('link', { name: 'Toolbox', hidden: true }).getAttribute('href')).toBe('/en#toolbox');
    const out = screen.getByRole('link', { name: 'GoNai', hidden: true });
    expect(out.getAttribute('target')).toBe('_blank');
    expect(out.getAttribute('rel')).toContain('noopener');
  });

  it('Expand all opens every question, then Collapse all closes them', () => {
    const { container } = render(<FaqBand items={items} locale="en" />);
    const button = screen.getByRole('button', { name: dict.en.faqExpand });
    fireEvent.click(button);
    expect(detailsOf(container).every((d) => d.open)).toBe(true);
    expect(button.textContent).toBe(dict.en.faqCollapse);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(button);
    expect(detailsOf(container).some((d) => d.open)).toBe(false);
    expect(button.textContent).toBe(dict.en.faqExpand);
  });

  it('keeps the button honest when questions are opened one by one', () => {
    const { container } = render(<FaqBand items={items} locale="en" />);
    const button = screen.getByRole('button', { name: dict.en.faqExpand });
    for (const d of detailsOf(container)) {
      act(() => {
        d.open = true;
        d.dispatchEvent(new Event('toggle'));
      });
    }
    expect(button.textContent).toBe(dict.en.faqCollapse);
  });

  it('offers ⌘K when an answer is missing', () => {
    const heard = vi.fn();
    window.addEventListener('klao:palette', heard);
    render(<FaqBand items={items} locale="en" />);
    fireEvent.click(screen.getByRole('button', { name: dict.en.faqMore }));
    expect(heard).toHaveBeenCalledTimes(1);
    window.removeEventListener('klao:palette', heard);
  });

  it('renders nothing at all when no question is published', () => {
    const { container } = render(<FaqBand items={[]} locale="en" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders only Thai on /th', () => {
    render(<FaqBand items={items} locale="th" />);
    expect(screen.getByRole('region', { name: dict.th.faqTitle })).toBeTruthy();
    expect(screen.getByText('เคยทำธุรกิจเองไหม?')).toBeTruthy();
    expect(screen.getByRole('button', { name: dict.th.faqExpand })).toBeTruthy();
    expect(screen.queryByText('Has he run a business?')).toBeNull();
    expect(screen.getByRole('link', { name: 'Career · A Bun Dance', hidden: true }).getAttribute('href')).toBe('/th#career');
  });

  it('server HTML carries every answer and hides nothing inline (Review Focus #4)', () => {
    const html = renderToStaticMarkup(<FaqBand items={items} locale="en" />);
    for (const item of items) expect(html).toContain(item.answer.en);
    expect(html).toContain('<details');
    expect(html).not.toMatch(/opacity:\s*0/);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/faq-band.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/sections/FaqBand"`.

- [ ] **Step 3: Implement**

`src/components/sections/FaqExpandAll.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';

const detailsIn = (el: HTMLElement | null): HTMLDetailsElement[] =>
  Array.from(el?.closest('section')?.querySelectorAll('details') ?? []);

// "Expand all" is an enhancement: every <details> opens natively without
// JavaScript (Review Focus #4), so faq.css hides this button under
// html:not(.js) and it only ever flips the `open` state the browser owns.
export default function FaqExpandAll({ expandLabel, collapseLabel }: { expandLabel: string; collapseLabel: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [allOpen, setAllOpen] = useState(false);

  useEffect(() => {
    const button = ref.current;
    const section = button?.closest('section');
    if (!section) return;
    // `toggle` doesn't bubble, so one capture-phase listener on the section
    // keeps the label honest when questions are opened one by one.
    const sync = () => setAllOpen(detailsIn(button).every((d) => d.open));
    section.addEventListener('toggle', sync, true);
    return () => section.removeEventListener('toggle', sync, true);
  }, []);

  return (
    <button
      ref={ref}
      type="button"
      className="faq-xall"
      aria-expanded={allOpen}
      onClick={() => {
        const next = !detailsIn(ref.current).every((d) => d.open);
        for (const d of detailsIn(ref.current)) d.open = next;
        setAllOpen(next);
      }}
    >
      {allOpen ? collapseLabel : expandLabel}
    </button>
  );
}
```

`src/components/sections/FaqBand.tsx`:

```tsx
import DeepLink from '@/components/DeepLink';
import { Icon } from '@/components/icons';
import Reveal from '@/components/motion/Reveal';
import PaletteButton from '@/components/PaletteButton';
import ThaiText from '@/components/ThaiText';
import { dict } from '@/lib/dictionary';
import { faqAnchorId } from '@/lib/link-target';
import type { FaqItem, Locale } from '@/lib/models';
import FaqExpandAll from './FaqExpandAll';
import './faq.css';

// #faq (spec §6, C7): "What people usually ask." Server component; the
// answers are native <details>, so every answer is in the server HTML and
// opens without JavaScript. Client islands only add Expand all, the deep
// links' in-place behaviour and the ⌘K line.
export default function FaqBand({ items, locale }: { items: FaqItem[]; locale: Locale }) {
  const t = dict[locale];
  // ClientsBand's rule: an empty band must not exist (all rows unpublished).
  if (items.length === 0) return null;
  return (
    <section id="faq" className="section" aria-labelledby="faq-h">
      <div className="wrap-wide">
        <Reveal className="faq-head">
          <h2 id="faq-h" className="t-h2" tabIndex={-1}>
            <ThaiText text={t.faqTitle} />
          </h2>
          <FaqExpandAll expandLabel={t.faqExpand} collapseLabel={t.faqCollapse} />
        </Reveal>
        <div className="faq-list">
          {items.map((item) => (
            <details key={item.id} id={faqAnchorId(item.id)} className="faq-item">
              <summary className="t-faq">
                <span>
                  <ThaiText text={item.question[locale]} />
                </span>
                <span className="faq-chv" aria-hidden="true">
                  <Icon name="caret-right" />
                </span>
              </summary>
              <div className="faq-a t-body">
                <p>
                  <ThaiText text={item.answer[locale]} />
                </p>
                {item.links.length > 0 && (
                  <p className="faq-src">
                    {t.faqSource}{' '}
                    {item.links.map((link, i) => (
                      <span key={`${link.target}-${i}`}>
                        {i > 0 && ' · '}
                        <DeepLink target={link.target} locale={locale}>
                          {link.label[locale]}
                        </DeepLink>
                      </span>
                    ))}
                  </p>
                )}
              </div>
            </details>
          ))}
        </div>
        <p className="faq-more">
          <PaletteButton className="faq-ask">{t.faqMore}</PaletteButton>
        </p>
      </div>
    </section>
  );
}
```

`src/components/sections/faq.css`:

```css
/* FaqBand — the prototype's `.faq` / `.qs` block with the Apple calibration
   (spec §5.2/§5.3). Type sizes come from C9 (.t-h2, .t-faq, .t-body). */
.faq-head {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 16px;
}
.faq-xall {
  min-height: 44px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--link);
  font-size: 14px;
  cursor: pointer;
}
.faq-list {
  margin-top: 28px;
  border-top: 1px solid var(--line);
}
.faq-item {
  border-bottom: 1px solid var(--line);
}
.faq-item > summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 24px 0;
  font-weight: 600;
  list-style: none;
  cursor: pointer;
}
.faq-item > summary::-webkit-details-marker {
  display: none;
}
.faq-chv {
  flex: none;
  display: grid;
  place-items: center;
  color: var(--ink-2);
  transition: transform var(--dur-ui) var(--ease-glide);
}
/* caret-right turned to point down; the wrapper flips it up when open. */
.faq-chv svg {
  width: 20px;
  height: 20px;
  transform: rotate(90deg);
}
.faq-item[open] .faq-chv {
  transform: rotate(180deg);
}
.faq-a {
  max-width: 68ch;
  margin: 0;
  padding: 0 0 28px;
}
.faq-a p {
  margin: 0;
}
.faq-src {
  display: block;
  margin-top: 8px;
  font-size: 14px;
  line-height: 20px;
  color: var(--ink-2);
}
.faq-src a {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  color: var(--link);
  text-decoration: none;
}
.faq-src a:hover {
  text-decoration: underline;
}
.faq-more {
  margin: 20px 0 0;
}
.faq-ask {
  min-height: 44px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--link);
  font-size: 17px;
  text-align: left;
  cursor: pointer;
}
.faq-ask:hover {
  text-decoration: underline;
}
/* Both buttons need JavaScript; without it they would be dead controls. */
html:not(.js) .faq-xall,
html:not(.js) .faq-more {
  display: none;
}
@media (prefers-reduced-motion: no-preference) {
  html.js .faq-item[open] .faq-a {
    animation: faq-fade 200ms var(--ease-glide);
  }
}
@keyframes faq-fade {
  from {
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .faq-chv {
    transition: none;
  }
}
@media (max-width: 734px) {
  .faq-head {
    flex-direction: column;
    align-items: start;
    gap: 4px;
  }
  .faq-item > summary {
    min-height: 56px;
    padding: 18px 0;
  }
}
```

Wire it into `src/app/[locale]/page.tsx`:
1. Delete `import QuestionsBand from '@/components/sections/QuestionsBand';` and `import ClientsBand from '@/components/sections/ClientsBand';`; add `import FaqBand from '@/components/sections/FaqBand';`.
2. In the `@/lib/content` import, add `getFaq` and remove `getQuestions` (ContactBand, still rendered until Task 9, does not use questions; Task 9 adds it back for CloseBand).
3. In the `Promise.all([...])` destructuring, remove the `questions` / `getQuestions()` pair and add `faq` / `getFaq()`.
4. Delete the `<QuestionsBand … />` and `<ClientsBand … />` elements together with the comment blocks directly above each, and insert directly after P3's `<ByDay … />` element:

```tsx
      {/* #faq (C7): Klao's FAQ DB — fixtures until NOTION_DB_FAQ is set.
          ClientsBand stays in the codebase but is no longer rendered (spec §4). */}
      <FaqBand items={faq} locale={locale} />
```

Delete the replaced band and its test:

```bash
git rm src/components/sections/QuestionsBand.tsx tests/questions-band.test.tsx
grep -rn "QuestionsBand" src tests
```
Expected: no output (the band had no CSS file of its own).

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/faq-band.test.tsx tests/smoke.test.tsx && npx tsc --noEmit && npx eslint src/components/sections src/app`
Expected: PASS; tsc 0; eslint clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/FaqBand.tsx src/components/sections/FaqExpandAll.tsx src/components/sections/faq.css src/app/[locale]/page.tsx tests/faq-band.test.tsx
git commit -m "$(cat <<'EOF'
feat(faq): FAQ band with Expand all and deep links; QuestionsBand and ClientsBand leave the page

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
)"
```

- [ ] **Step 6: Screenshot check**

Run Task 1 Step 3 (dev server up), then `ONLY=faq node /tmp/klao-qa/p4-qa.mjs`.
Expected: exit 0, 8 PNGs `/tmp/klao-qa/p4/*-faq.png`. Open 4 of them (en-light-desk, th-light-phone, en-dark-desk, th-dark-desk) with the Read tool and check: headline left + "Expand all" right on desktop (under it on phone); five questions, all expanded, each with its answer and "Source: …" links in link blue; hairlines between rows; chevrons pointing up when open; Thai headline and questions have no mid-word breaks; dark mode keeps text readable.

---

### Task 8: Clipboard helper and CopyEmail rework

**Files:** Create `src/lib/clipboard.ts`, `src/components/copy-email.css` · Rewrite `src/components/CopyEmail.tsx` · Modify every remaining `<CopyEmail …>` call site (drop `copiedLabel`) · Rewrite `tests/copy-email.test.tsx`
**Interfaces:** Consumes: `Icon` (C4), `dict.copied`, `dict.copyEmailAction`, `dict.closeCopyFail` (Task 5) · Produces: `copyText(text: string): Promise<boolean>` · `copyShortcutHint(template: string): string` · `<CopyEmail email: string locale: Locale />` (signature CHANGED: `copiedLabel` removed)

- [ ] **Step 1: Write the failing test** — replace `tests/copy-email.test.tsx` entirely

```tsx
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CopyEmail from '@/components/CopyEmail';
import { copyShortcutHint, copyText } from '@/lib/clipboard';
import { dict } from '@/lib/dictionary';

// Raw `act` from react needs this in Vitest (see the old version of this file).
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  window.getSelection()?.removeAllRanges();
});

// copy() awaits copyText(), which awaits writeText(): a few microtask hops
// before the state update. Draining a handful works with fake timers too.
const flushMicrotasks = async () => {
  for (let i = 0; i < 6; i++) await Promise.resolve();
};
const clickCopy = (name: string = dict.en.copyEmailAction) =>
  act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
    await flushMicrotasks();
  });
const live = (container: HTMLElement) => container.querySelector('[aria-live="polite"]')?.textContent ?? '';

describe('copyText', () => {
  it('resolves true only when the clipboard write succeeds', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    await expect(copyText('a@b.co')).resolves.toBe(true);
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    await expect(copyText('a@b.co')).resolves.toBe(false);
    vi.stubGlobal('navigator', {});
    await expect(copyText('a@b.co')).resolves.toBe(false);
  });

  it('says ⌘C on Apple hardware and Ctrl+C everywhere else', () => {
    vi.stubGlobal('navigator', { platform: 'MacIntel' });
    expect(copyShortcutHint('Press ⌘C to copy')).toBe('Press ⌘C to copy');
    vi.stubGlobal('navigator', { platform: 'Win32' });
    expect(copyShortcutHint('Press ⌘C to copy')).toBe('Press Ctrl+C to copy');
  });
});

describe('CopyEmail', () => {
  it('always shows the address as plain, selectable text', () => {
    vi.stubGlobal('navigator', {});
    render(<CopyEmail email="a@b.co" locale="en" />);
    expect(screen.getByText('a@b.co')).toBeTruthy();
  });

  it('names the icon button by its action in both languages', () => {
    render(<CopyEmail email="a@b.co" locale="en" />);
    expect(screen.getByRole('button', { name: dict.en.copyEmailAction })).toBeTruthy();
    cleanup();
    render(<CopyEmail email="a@b.co" locale="th" />);
    expect(screen.getByRole('button', { name: dict.th.copyEmailAction })).toBeTruthy();
  });

  it('copies, confirms visibly and to screen readers, then clears after 2 s', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const { container } = render(<CopyEmail email="a@b.co" locale="en" />);
    expect(live(container)).toBe('');
    await clickCopy();
    expect(writeText).toHaveBeenCalledWith('a@b.co');
    expect(live(container)).toBe(dict.en.copied);
    expect(container.querySelector('.copy-l')?.textContent).toBe(dict.en.copied);
    expect(container.querySelector('.copy-b')?.getAttribute('data-state')).toBe('ok');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(live(container)).toBe('');
  });

  it('never claims success without a clipboard: selects the address and says how to copy', async () => {
    vi.stubGlobal('navigator', {});
    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand;
    const { container } = render(<CopyEmail email="a@b.co" locale="en" />);
    await clickCopy();
    expect(live(container)).toBe('Press Ctrl+C to copy');
    expect(container.textContent).not.toContain(dict.en.copied);
    expect(window.getSelection()?.rangeCount).toBe(1);
    expect(window.getSelection()?.getRangeAt(0).toString()).toBe('a@b.co');
    // The deprecated execCommand fallback stays gone (it faked success).
    expect(execCommand).not.toHaveBeenCalled();
  });

  it('treats a rejected write (permission denied) the same honest way', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    const { container } = render(<CopyEmail email="a@b.co" locale="th" />);
    await clickCopy(dict.th.copyEmailAction);
    expect(live(container)).toBe('กด Ctrl+C เพื่อคัดลอก');
    expect(container.textContent).not.toContain(dict.th.copied);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/copy-email.test.tsx`
Expected: FAIL — `Failed to resolve import "@/lib/clipboard"`.

- [ ] **Step 3: Implement**

`src/lib/clipboard.ts`:

```ts
// One copy path for the close band's button and the ⌘K "Copy email" row.
// Resolves false instead of throwing: navigator.clipboard exists only in a
// secure context and can reject (permission denied), and both callers then
// say how to copy by hand rather than claim a success that didn't happen.
export async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// The prototype's fallback copy says ⌘C; everyone off Apple hardware
// gets Ctrl+C.
export function copyShortcutHint(template: string): string {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  const apple = /Mac|iPhone|iPad|iPod/.test(nav?.platform || nav?.userAgent || '');
  return apple ? template : template.replace('⌘C', 'Ctrl+C');
}
```

`src/components/CopyEmail.tsx` (whole file):

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { copyShortcutHint, copyText } from '@/lib/clipboard';
import { dict } from '@/lib/dictionary';
import type { Locale } from '@/lib/models';
import './copy-email.css';

type State = 'idle' | 'ok' | 'fail';

// The prototype's `.mailrow`: the address as plain text (always readable and
// selectable by hand, the real fallback) + a 44 px icon button + a status
// word. The status is written twice on purpose (QA C2): once visibly
// (aria-hidden, so it never joins the button's name) and once in an
// sr-only live region that only changes text on a real outcome, so screen
// readers hear exactly one announcement per click.
export default function CopyEmail({ email, locale }: { email: string; locale: Locale }) {
  const t = dict[locale];
  const [state, setState] = useState<State>('idle');
  const addr = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function settle(next: State, ms: number) {
    setState(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), ms);
  }

  async function copy() {
    if (await copyText(email)) {
      settle('ok', 2000);
      return;
    }
    // Honest failure (no clipboard, or permission denied): select the
    // address so ⌘C / Ctrl+C works, and say so. No execCommand fallback —
    // it is deprecated and used to report success it couldn't verify.
    const node = addr.current;
    const selection = window.getSelection();
    if (node && selection) {
      const range = document.createRange();
      range.selectNodeContents(node);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    settle('fail', 3000);
  }

  const message = state === 'ok' ? t.copied : state === 'fail' ? copyShortcutHint(t.closeCopyFail) : '';

  return (
    <span className="mail-row">
      <span ref={addr} className="mail-addr">
        {email}
      </span>
      <button type="button" className="copy-b" data-state={state} aria-label={t.copyEmailAction} onClick={copy}>
        <Icon name={state === 'ok' ? 'check-duotone' : 'copy'} />
      </button>
      <span className="copy-l" aria-hidden="true">
        {message}
      </span>
      <span className="sr-only" aria-live="polite">
        {message}
      </span>
    </span>
  );
}
```

`src/components/copy-email.css`:

```css
/* CopyEmail — the prototype's `.mailrow` / `.copyb` / `.copyl`. */
.mail-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 22px;
  font-size: 17px;
  line-height: 25px;
}
.copy-b {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 22px;
  background: transparent;
  color: var(--ink-1);
  cursor: pointer;
  /* --ease-tick is reserved for exactly this confirmation (spec §5.5). */
  transition: transform 260ms var(--ease-tick);
}
.copy-b svg {
  width: 18px;
  height: 18px;
}
.copy-b:hover {
  background: color-mix(in srgb, var(--ink-1) 6%, transparent);
}
.copy-b[data-state='ok'] {
  transform: scale(1.02);
}
.copy-l {
  min-width: 5em;
  font-size: 14px;
  color: var(--ink-2);
  text-align: left;
}
/* Copying needs JavaScript; the address itself stays for everyone. */
html:not(.js) .copy-b,
html:not(.js) .copy-l {
  display: none;
}
@media (prefers-reduced-motion: reduce) {
  .copy-b {
    transition: none;
  }
}
```

Update the remaining call sites (ContactBand still exists until Task 9; P1's menu may also use it):

```bash
grep -rn "<CopyEmail" src
```
In every hit, delete the `copiedLabel={…}` prop (e.g. in `src/components/sections/ContactBand.tsx`: `<CopyEmail email={profile.email} copiedLabel={t.copied} locale={locale} />` → `<CopyEmail email={profile.email} locale={locale} />`).

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/copy-email.test.tsx tests/contact-band.test.tsx && npx tsc --noEmit`
Expected: PASS (contact-band's old assertions — a button exists, the address is visible, three `<b>` labels — still hold); tsc 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/clipboard.ts src/components/CopyEmail.tsx src/components/copy-email.css tests/copy-email.test.tsx src
git commit -m "$(cat <<'EOF'
refactor(copy-email): prototype mail row, honest Ctrl+C fallback, shared copyText

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
)"
```

---

### Task 9: CloseBand (replaces ContactBand)

**Files:** Create `src/components/sections/CloseBand.tsx`, `src/components/sections/close-band.css` · Modify `src/app/[locale]/page.tsx` · Modify `src/app/globals.css` (conditional, old `#contact` glow) · Delete `src/components/sections/ContactBand.tsx`, `tests/contact-band.test.tsx` · Test `tests/close-band.test.tsx`, append to `tests/smoke.test.tsx`
**Interfaces:** Consumes: `CopyEmail` (Task 8), `mailto`, `CONTACT_SUBJECT` (Task 2), `getQuestions` (existing), `Profile.basedIn/workingIn` (Task 3), `ThaiText`, `Reveal`, `.t-h2 .t-body .wrap .btn .btn-fill` (C9) · Produces: `<CloseBand profile questions locale />` (server) · `pickOpenQuestion(questions: OpenQuestion[]): OpenQuestion | null`

- [ ] **Step 1: Write the failing tests**

`tests/close-band.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import profileFixture from '@/content/fixtures/profile.json';
import CloseBand, { pickOpenQuestion } from '@/components/sections/CloseBand';
import { dict } from '@/lib/dictionary';
import type { OpenQuestion, Profile } from '@/lib/models';

afterEach(cleanup);

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

// Built from the fixture so fields added by other phases are always present.
const profile: Profile = {
  ...(profileFixture as Profile),
  email: 'real@example.com',
  resumeUrl: '/resume.pdf',
  basedIn: { en: 'Bangkok, TH', th: 'กรุงเทพฯ' },
  workingIn: 'TH / EN',
};

const q = (id: string, date: string, status: OpenQuestion['status']): OpenQuestion => ({
  id,
  question: { en: `EN ${id}?`, th: `TH ${id}?` },
  status,
  linkSlug: null,
  date,
});

describe('pickOpenQuestion', () => {
  // getQuestions() hands over a newest-first list.
  it('prefers the newest wondering question, even over a newer building one', () => {
    const list = [q('b', '2026-09-20', 'building'), q('w', '2026-09-10', 'wondering'), q('w0', '2026-08-01', 'wondering')];
    expect(pickOpenQuestion(list)?.id).toBe('w');
  });
  it('falls back to the newest building question', () => {
    expect(pickOpenQuestion([q('a', '2026-09-21', 'answered'), q('b', '2026-09-20', 'building')])?.id).toBe('b');
  });
  it('returns null when nothing is open', () => {
    expect(pickOpenQuestion([q('a', '2026-09-21', 'answered')])).toBeNull();
    expect(pickOpenQuestion([])).toBeNull();
  });
});

describe('CloseBand', () => {
  it('is #contact, named by its headline', () => {
    render(<CloseBand profile={profile} questions={[]} locale="en" />);
    expect(screen.getByRole('region', { name: dict.en.contactHeading }).id).toBe('contact');
  });

  it('starts a conversation by email with the prototype subject', () => {
    render(<CloseBand profile={profile} questions={[]} locale="en" />);
    expect(screen.getByRole('link', { name: dict.en.startConversation }).getAttribute('href')).toBe(
      'mailto:real@example.com?subject=Hello%20from%20klao-site',
    );
  });

  it('opens the résumé in a new tab, and leaves it out when there is none', () => {
    render(<CloseBand profile={profile} questions={[]} locale="en" />);
    const resume = screen.getByRole('link', { name: dict.en.closeResume });
    expect(resume.getAttribute('href')).toBe('/resume.pdf');
    expect(resume.getAttribute('target')).toBe('_blank');
    cleanup();
    render(<CloseBand profile={{ ...profile, resumeUrl: null }} questions={[]} locale="en" />);
    expect(screen.queryByRole('link', { name: dict.en.closeResume })).toBeNull();
  });

  it('shows the address as text with a copy button', () => {
    render(<CloseBand profile={profile} questions={[]} locale="en" />);
    expect(screen.getByText('real@example.com')).toBeTruthy();
    expect(screen.getByRole('button', { name: dict.en.copyEmailAction })).toBeTruthy();
  });

  it('pairs Based in / Working in with their own values', () => {
    render(<CloseBand profile={profile} questions={[]} locale="en" />);
    const based = screen.getByText(dict.en.basedIn).closest('li');
    const working = screen.getByText(dict.en.workingIn).closest('li');
    expect(based?.textContent).toContain('Bangkok, TH');
    expect(based?.textContent).not.toContain('TH / EN');
    expect(working?.textContent).toContain('TH / EN');
  });

  it('uses the Thai city name on /th', () => {
    render(<CloseBand profile={profile} questions={[]} locale="th" />);
    expect(screen.getByText(dict.th.basedIn).closest('li')?.textContent).toContain('กรุงเทพฯ');
  });

  it('leaves out a fact with no value, and the whole list when both are missing', () => {
    render(<CloseBand profile={{ ...profile, workingIn: null }} questions={[]} locale="en" />);
    expect(screen.queryByText(dict.en.workingIn)).toBeNull();
    expect(screen.getByText(dict.en.basedIn)).toBeTruthy();
    cleanup();
    const none = render(<CloseBand profile={{ ...profile, basedIn: null, workingIn: null }} questions={[]} locale="en" />);
    expect(none.container.querySelector('.close-facts')).toBeNull();
  });

  it('asks one open question with a reply-by-email link', () => {
    const { container } = render(
      <CloseBand profile={profile} questions={[q('b', '2026-09-20', 'building'), q('w', '2026-09-10', 'wondering')]} locale="en" />,
    );
    expect(container.querySelector('.close-openq')?.textContent).toContain(`${dict.en.closeOpenQ} EN w?`);
    expect(screen.getByRole('link', { name: dict.en.closeTellMe }).getAttribute('href')).toBe(
      'mailto:real@example.com?subject=Open%20question',
    );
  });

  it('hides the open question when none is open', () => {
    const { container } = render(<CloseBand profile={profile} questions={[q('a', '2026-09-21', 'answered')]} locale="en" />);
    expect(container.querySelector('.close-openq')).toBeNull();
  });

  it('drops every mail affordance when the profile has no email', () => {
    const { container } = render(
      <CloseBand profile={{ ...profile, email: '' }} questions={[q('w', '2026-09-10', 'wondering')]} locale="en" />,
    );
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(screen.queryByRole('button', { name: dict.en.copyEmailAction })).toBeNull();
    expect(container.querySelector('.close-openq')).toBeNull();
  });

  it('server HTML already holds the CTA and the address (Review Focus #4)', () => {
    const html = renderToStaticMarkup(<CloseBand profile={profile} questions={[]} locale="en" />);
    expect(html).toContain('href="mailto:real@example.com?subject=Hello%20from%20klao-site"');
    expect(html).toContain('real@example.com');
    expect(html).not.toMatch(/href=["']#["']/);
    expect(html).not.toMatch(/opacity:\s*0/);
  });
});
```

Append inside the `describe('smoke: …')` block of `tests/smoke.test.tsx`:

```tsx
  it('ends the home page with FAQ then Close, without the retired bands', async () => {
    for (const locale of locales) {
      const html = renderToStaticMarkup(await HomePage(p(locale)));
      const text = html.replace(/<[^>]+>/g, '');
      const storyAt = html.indexOf('id="story"');
      const faqAt = html.indexOf('id="faq"');
      const contactAt = html.indexOf('id="contact"');
      expect(storyAt).toBeGreaterThan(-1);
      expect(faqAt).toBeGreaterThan(storyAt);
      expect(contactAt).toBeGreaterThan(faqAt);
      expect(html).not.toContain('id="questions"');
      expect(html).not.toContain('id="clients"');
      expect(text).toContain(dict[locale].faqTitle);
      expect(text).toContain(dict[locale].contactHeading);
    }
  });
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/close-band.test.tsx tests/smoke.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/sections/CloseBand"`; the smoke test fails on `contactAt > faqAt` or the contact heading being split by MaskedHeading.

- [ ] **Step 3: Implement**

`src/components/sections/CloseBand.tsx`:

```tsx
import CopyEmail from '@/components/CopyEmail';
import Reveal from '@/components/motion/Reveal';
import ThaiText from '@/components/ThaiText';
import { dict } from '@/lib/dictionary';
import { CONTACT_SUBJECT, mailto } from '@/lib/link-target';
import type { Locale, OpenQuestion, Profile } from '@/lib/models';
import './close-band.css';

// The one open question the close band asks (spec §6): the newest
// `wondering` one, else the newest `building` one. getQuestions() already
// sorts newest first, so the first match is the newest.
export function pickOpenQuestion(questions: OpenQuestion[]): OpenQuestion | null {
  return (
    questions.find((q) => q.status === 'wondering') ?? questions.find((q) => q.status === 'building') ?? null
  );
}

// #contact (C7): "Have something that should exist?" Server component.
// Every mail affordance hangs off profile.email, so a blank Email in Notion
// removes them all instead of rendering an empty `mailto:`.
export default function CloseBand({
  profile,
  questions,
  locale,
}: {
  profile: Profile;
  questions: OpenQuestion[];
  locale: Locale;
}) {
  const t = dict[locale];
  const open = profile.email ? pickOpenQuestion(questions) : null;
  const facts = [
    profile.basedIn ? { label: t.basedIn, value: profile.basedIn[locale] } : null,
    profile.workingIn ? { label: t.workingIn, value: profile.workingIn } : null,
  ].filter((f): f is { label: string; value: string } => f !== null);

  return (
    <section id="contact" className="close-band" aria-labelledby="close-h">
      <Reveal className="wrap">
        <h2 id="close-h" className="t-h2 close-h" tabIndex={-1}>
          <ThaiText text={t.contactHeading} />
        </h2>
        {(profile.email || profile.resumeUrl) && (
          <div className="close-ctas">
            {profile.email && (
              <a className="btn btn-fill" href={mailto(profile.email, CONTACT_SUBJECT)}>
                {t.startConversation}
              </a>
            )}
            {profile.resumeUrl && (
              <a className="close-lnk" href={profile.resumeUrl} target="_blank" rel="noopener noreferrer">
                {t.closeResume}
              </a>
            )}
          </div>
        )}
        {profile.email && (
          <div>
            <CopyEmail email={profile.email} locale={locale} />
          </div>
        )}
        {facts.length > 0 && (
          <ul className="close-facts">
            {facts.map((f) => (
              <li key={f.label}>
                <span>{f.label}</span>
                <b>
                  <ThaiText text={f.value} />
                </b>
              </li>
            ))}
          </ul>
        )}
        {open && profile.email && (
          <p className="close-openq t-body">
            <ThaiText text={`${t.closeOpenQ} ${open.question[locale]}`} />{' '}
            <a href={mailto(profile.email, t.closeOpenQSubject)}>{t.closeTellMe}</a>
          </p>
        )}
      </Reveal>
    </section>
  );
}
```

`src/components/sections/close-band.css`:

```css
/* CloseBand — the prototype's `.close` block with the Apple calibration
   (close 160/144 desktop, 112/96 phone; spec §5.3). */
.close-band {
  padding: 160px 0 144px;
  text-align: center;
}
.close-h {
  max-width: 12em;
  margin-inline: auto;
}
.close-ctas {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 22px;
  margin-top: 28px;
}
.close-lnk {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-size: 17px;
  color: var(--link);
  text-decoration: none;
}
.close-lnk:hover {
  text-decoration: underline;
}
.close-facts {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px 40px;
  margin: 36px 0 0;
  padding: 0;
  list-style: none;
  font-size: 14px;
  line-height: 20px;
  color: var(--ink-2);
}
.close-facts b {
  display: block;
  font-size: 17px;
  line-height: 25px;
  font-weight: 500;
  color: var(--ink-1);
}
.close-openq {
  max-width: 36em;
  margin: 40px auto 0;
  color: var(--ink-2);
}
.close-openq a {
  white-space: nowrap;
  color: var(--link);
  text-decoration: none;
}
.close-openq a:hover {
  text-decoration: underline;
}
@media (max-width: 734px) {
  .close-band {
    padding: 112px 0 96px;
  }
  .close-ctas {
    gap: 12px 18px;
  }
  .close-ctas .btn {
    width: 100%;
  }
  .close-facts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    justify-content: start;
    text-align: left;
  }
}
```

Wire it into `src/app/[locale]/page.tsx`:
1. Replace `import ContactBand from '@/components/sections/ContactBand';` with `import CloseBand from '@/components/sections/CloseBand';`.
2. Add `getQuestions` back to the `@/lib/content` import, and the `questions` / `getQuestions()` pair back to the `Promise.all` destructuring.
3. Replace `<ContactBand profile={profile} locale={locale} />` (the page's last element) with:

```tsx
      {/* #contact (C7), last on the page: close CTA, email, Based in /
          Working in, and one open question from the Questions DB. */}
      <CloseBand profile={profile} questions={questions} locale={locale} />
```

Delete the replaced band and the dark glow that belonged to it:

```bash
git rm src/components/sections/ContactBand.tsx tests/contact-band.test.tsx
grep -rn "ContactBand" src tests
grep -n "#contact" src/app/globals.css
```
Expected: the first grep prints nothing. If the second grep still shows the life-injection rules (`#contact::before` in the `#hero [data-hero-stage]::before, #contact::before {` selector list, `#contact { position: relative; }`, `#hero, #contact { overflow-x: clip; }`), remove `#contact` from them: drop the `#contact::before` selector (and the whole rule if it was the only selector left), delete `#contact { position: relative; }`, and change `#hero, #contact { overflow-x: clip; }` to `#hero { overflow-x: clip; }` (or delete it if `#hero` no longer exists). The periwinkle glow was the dark ContactBand's.

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/close-band.test.tsx tests/smoke.test.tsx tests/work-story.test.ts && npx tsc --noEmit && npx eslint src`
Expected: PASS (`getQuestions` is untouched, so the case page's "born from a question" line in `work-story` still passes); tsc 0; eslint clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/CloseBand.tsx src/components/sections/close-band.css src/app/[locale]/page.tsx src/app/globals.css tests/close-band.test.tsx tests/smoke.test.tsx
git commit -m "$(cat <<'EOF'
feat(close): close band with mail row, Based in / Working in and one open question; ContactBand removed

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
)"
```

- [ ] **Step 6: Screenshot check**

Dev server up (Task 1 Step 3), then `ONLY=close node /tmp/klao-qa/p4-qa.mjs`.
Expected: exit 0, 8 PNGs `*-close.png`. Check: centred headline (two lines max on desktop); kram "Start a conversation" pill + "Résumé (PDF) ›" link beside it (full-width pill on phone); address + copy icon; "Based in / Bangkok, TH" and "Working in / TH / EN" (TH: "กรุงเทพฯ"); no open-question line (fixture `questions.json` is `[]` — expected); dark mode legible.

---

### Task 10: SiteFooter rewrite

**Files:** Create `src/components/LanguageLinks.tsx`, `src/components/site-footer.css` · Rewrite `src/components/SiteFooter.tsx` · Modify `src/lib/content.ts` (`getCareer` → `cache()`) · Modify the file that holds P0's temporary `<ThemeToggle />` mount · Rewrite `tests/site-footer.test.tsx`
**Interfaces:** Consumes: `ThemeToggle` (P0; assumed `default` export with `{ locale: Locale }` — see Contract gaps), `DeepLink` (Task 6), `projectKey`, `sheetHash` (C6), `swapLocale` (Task 2), `getProfile/getFeaturedProjects/getCareer/getPosts/getQuestions`, `formatDate`, `Icon`/`IconName` (C4) · Produces: `<SiteFooter locale? />` (async server; same signature as before) · `<LanguageLinks locale label />` (client)

- [ ] **Step 1: Write the failing test** — replace `tests/site-footer.test.tsx` entirely

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import careerFixture from '@/content/fixtures/career.json';
import profileFixture from '@/content/fixtures/profile.json';
import projectsFixture from '@/content/fixtures/projects.json';
import { dict } from '@/lib/dictionary';
import type { CareerEntry, OpenQuestion, PostMeta, Profile, Project } from '@/lib/models';
import { projectKey, sheetHash } from '@/lib/sheet-url';

const projects = (projectsFixture as Project[]).filter((p) => p.featured).sort((a, b) => a.order - b.order);
const career = careerFixture as CareerEntry[];
let mockProfile: Profile = profileFixture as Profile;
let mockPosts: PostMeta[] = [];
let mockQuestions: OpenQuestion[] = [];

vi.mock('@/lib/content', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/content')>();
  return {
    ...actual,
    getProfile: async () => mockProfile,
    getFeaturedProjects: async () => projects,
    getCareer: async () => career,
    getPosts: async () => mockPosts,
    getQuestions: async () => mockQuestions,
  };
});
vi.mock('next/navigation', () => ({ usePathname: () => '/en/projects' }));
// P0 owns ThemeToggle and its tests; here it only has to be mounted.
vi.mock('@/components/ThemeToggle', async () => {
  const { createElement } = await import('react');
  return { default: () => createElement('div', { 'data-testid': 'theme-toggle' }) };
});

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  mockProfile = profileFixture as Profile;
  mockPosts = [];
  mockQuestions = [];
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

async function renderFooter(locale: 'en' | 'th' = 'en') {
  const { default: SiteFooter } = await import('@/components/SiteFooter');
  return render(await SiteFooter({ locale }));
}

describe('SiteFooter', () => {
  it('has three link columns — Projects, Career, Elsewhere — and nothing else as a column (spec §10)', async () => {
    await renderFooter();
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual([dict.en.footProjects, dict.en.footCareer, dict.en.footElsewhere]);
  });

  it('links every featured project to its sheet with a plain hash URL', async () => {
    await renderFooter();
    for (const p of projects) {
      expect(screen.getByRole('link', { name: p.name }).getAttribute('href')).toBe(`/en${sheetHash(projectKey(p))}`);
    }
  });

  it('links every employer to the Career band and opens that pill in place', async () => {
    document.body.insertAdjacentHTML('beforeend', '<section id="career"><h2>Career</h2></section>');
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const heard = vi.fn();
    window.addEventListener('klao:career', heard);
    await renderFooter();
    for (const c of career) {
      expect(screen.getByRole('link', { name: c.company }).getAttribute('href')).toBe('/en#career');
    }
    fireEvent.click(screen.getByRole('link', { name: career[0].company }));
    expect((heard.mock.calls[0][0] as CustomEvent).detail).toEqual({ key: career[0].key });
    window.removeEventListener('klao:career', heard);
  });

  it('opens LinkedIn, GitHub and the résumé in a new tab, and drops what is missing', async () => {
    await renderFooter();
    for (const [name, href] of [
      ['LinkedIn', mockProfile.linkedin],
      ['GitHub', mockProfile.github],
      [dict.en.footResume, mockProfile.resumeUrl],
    ] as const) {
      const link = screen.getByRole('link', { name });
      expect(link.getAttribute('href')).toBe(href);
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    }
    cleanup();
    mockProfile = { ...(profileFixture as Profile), resumeUrl: null };
    await renderFooter();
    expect(screen.queryByRole('link', { name: dict.en.footResume })).toBeNull();
  });

  it('mounts Appearance (ThemeToggle) and Language, keeping the current page', async () => {
    await renderFooter();
    expect(screen.getByText(dict.en.footAppearance)).toBeTruthy();
    expect(screen.getByTestId('theme-toggle')).toBeTruthy();
    const lang = screen.getByRole('group', { name: dict.en.navLanguage });
    expect(within(lang).getByRole('link', { name: 'EN' }).getAttribute('href')).toBe('/en/projects');
    expect(within(lang).getByRole('link', { name: 'EN' }).getAttribute('aria-current')).toBe('page');
    expect(within(lang).getByRole('link', { name: 'ไทย' }).getAttribute('href')).toBe('/th/projects');
  });

  it('carries the legal line: © year + name, then the human line', async () => {
    const { container } = await renderFooter();
    expect(container.textContent).toContain(`© ${new Date().getFullYear()} ${mockProfile.name}`);
    expect(container.textContent).toContain('Built at night, powered by good coffee.');
    cleanup();
    const th = await renderFooter('th');
    expect(th.container.textContent).toContain('สร้างตอนกลางคืน ด้วยกาแฟดีๆ');
  });

  it('adds the honest freshness date only when dated content exists', async () => {
    const empty = await renderFooter();
    expect(empty.container.textContent).not.toContain(dict.en.contentUpdated);
    cleanup();
    mockPosts = [{ id: 'p1', slug: 's', title: { en: 'T', th: 'T' }, date: '2026-07-01', tags: [] }];
    mockQuestions = [
      { id: 'q1', question: { en: 'Q?', th: 'Q?' }, status: 'wondering', linkSlug: null, date: '2026-08-10' },
    ];
    const dated = await renderFooter();
    expect(dated.container.textContent).toContain(`${dict.en.contentUpdated} Aug 10, 2026`);
    expect(dated.container.textContent).not.toContain('Jul 1, 2026');
  });

  it('never renders href="#"', async () => {
    const { container } = await renderFooter();
    for (const a of Array.from(container.querySelectorAll('a'))) expect(a.getAttribute('href')).not.toBe('#');
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/site-footer.test.tsx`
Expected: FAIL — no level-3 headings / no project links in the old footer.

- [ ] **Step 3: Implement**

3a. `src/lib/content.ts` — replace the `getCareer` function with a cached version (if P3 changed its body, keep P3's body inside the `cache()` wrapper):

```ts
// cache()-wrapped since P4: the page's CareerBand, the footer's Career
// column and the ⌘K index (layout) all ask for it within one render — one
// Notion round trip instead of three.
const getCareerCached = cache(async (): Promise<CareerEntry[]> => {
  const all = await fromNotion((n) => n.fetchCareer(), careerFixture as CareerEntry[]);
  return [...all].sort((a, b) => a.order - b.order);
});

export async function getCareer(): Promise<CareerEntry[]> {
  return getCareerCached();
}
```

3b. `src/components/LanguageLinks.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { swapLocale } from '@/lib/link-target';
import { LOCALES, type Locale } from '@/lib/models';

const NAMES: Record<Locale, string> = { en: 'EN', th: 'ไทย' };

// EN / ไทย as real links to the same page in the other language (the
// /en ↔ /th routes and hreflang stay the source of truth, spec §6).
// A role=group, not a <nav>: the footer shouldn't add another landmark.
export default function LanguageLinks({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname() ?? `/${locale}`;
  return (
    <div role="group" aria-label={label} className="lang-links">
      {LOCALES.map((l) => (
        <Link
          key={l}
          href={swapLocale(pathname, l)}
          prefetch={false}
          lang={l}
          hrefLang={l}
          aria-current={l === locale ? 'page' : undefined}
        >
          {NAMES[l]}
        </Link>
      ))}
    </div>
  );
}
```

3c. `src/components/SiteFooter.tsx` (whole file):

```tsx
import DeepLink from '@/components/DeepLink';
import { Icon, type IconName } from '@/components/icons';
import LanguageLinks from '@/components/LanguageLinks';
import ThemeToggle from '@/components/ThemeToggle';
import { getCareer, getFeaturedProjects, getPosts, getProfile, getQuestions } from '@/lib/content';
import { dict } from '@/lib/dictionary';
import { formatDate } from '@/lib/format';
import type { Locale } from '@/lib/models';
import { projectKey, sheetHash } from '@/lib/sheet-url';
import './site-footer.css';

// Async server component that fetches its own data, as before — layout.tsx
// just passes the locale. Every getter is cache()-wrapped, so on the home
// route these calls reuse the page's own fetches.
//
// Spec §10 trim ("footer columns 4 → 3"): the prototype's three link
// columns stay (Projects · Career · Elsewhere) and its fourth column,
// Appearance + Language, moves down beside the legal line.
export default async function SiteFooter({ locale = 'en' }: { locale?: Locale } = {}) {
  const [profile, projects, career, posts, questions] = await Promise.all([
    getProfile(),
    getFeaturedProjects(),
    getCareer(),
    getPosts(),
    getQuestions(),
  ]);
  const t = dict[locale];
  // Honest freshness (wave 2, spec §6): the newest date the CMS actually
  // has. Posts and questions are its only dated sources and both arrive
  // newest first. No dates → no clause, never a fake one.
  const newest =
    [posts[0]?.date, questions[0]?.date].filter((d): d is string => Boolean(d)).sort().pop() ?? null;
  const elsewhere = [
    profile.linkedin ? { href: profile.linkedin, icon: 'linkedin-logo', label: 'LinkedIn' } : null,
    profile.github ? { href: profile.github, icon: 'github-logo', label: 'GitHub' } : null,
    profile.resumeUrl ? { href: profile.resumeUrl, icon: 'file-pdf-duotone', label: t.footResume } : null,
  ].filter((l): l is { href: string; icon: IconName; label: string } => l !== null);

  return (
    <footer className="site-foot">
      <div className="wrap">
        <div className="foot-cols">
          {projects.length > 0 && (
            <div>
              <h3>{t.footProjects}</h3>
              <ul>
                {projects.map((p) => (
                  <li key={p.id}>
                    {/* Plain <a>, not next/link: the sheet (P2) opens on the
                        hashchange a normal link fires, and from any other
                        route this loads the home page with the sheet open. */}
                    <a href={`/${locale}${sheetHash(projectKey(p))}`}>{p.name}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {career.length > 0 && (
            <div>
              <h3>{t.footCareer}</h3>
              <ul>
                {career.map((c) => (
                  <li key={c.id}>
                    <DeepLink target={`career:${c.key}`} locale={locale}>
                      {c.company}
                    </DeepLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {elsewhere.length > 0 && (
            <div>
              <h3>{t.footElsewhere}</h3>
              <ul>
                {elsewhere.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} target="_blank" rel="noopener noreferrer">
                      <Icon name={l.icon} /> {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="foot-bottom">
          <div className="foot-legal t-legal">
            <p>
              © {new Date().getFullYear()} {profile.name}
              {newest && ` · ${t.contentUpdated} ${formatDate(newest, locale)}`}
            </p>
            <p className="foot-last">{t.footerNote}</p>
          </div>
          <div className="foot-prefs">
            <div className="foot-pref">
              <span className="foot-pref-label">{t.footAppearance}</span>
              <ThemeToggle locale={locale} />
            </div>
            <div className="foot-pref">
              <span className="foot-pref-label">{t.navLanguage}</span>
              <LanguageLinks locale={locale} label={t.navLanguage} />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

3d. `src/components/site-footer.css`:

```css
/* SiteFooter — the prototype's `footer` / `.fcols` / `.legal` / `.seg`,
   with the fourth column (prefs) moved beside the legal line (spec §10). */
.site-foot {
  border-top: 1px solid var(--line);
  padding: 44px 0 40px;
}
.foot-cols {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px 40px;
}
.foot-cols h3 {
  margin: 0 0 6px;
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
  color: var(--ink-1);
}
.foot-cols ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
.foot-cols a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 24px;
  min-height: 32px;
  font-size: 14px;
  color: var(--ink-2);
  text-decoration: none;
}
.foot-cols a svg {
  width: 16px;
  height: 16px;
}
.foot-cols a:hover {
  color: var(--ink-1);
  text-decoration: underline;
}
.foot-bottom {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: end;
  gap: 16px 40px;
  margin-top: 36px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
}
.foot-legal {
  color: var(--ink-2);
}
.foot-legal p {
  margin: 0;
}
.foot-last {
  margin-top: 4px;
  color: var(--ink-1);
}
.foot-prefs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 28px;
}
.foot-pref {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}
.foot-pref-label {
  font-weight: 600;
}
.lang-links {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border-radius: 16px;
  background: var(--glass-ctl);
}
.lang-links a {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 14px;
  font-size: 14px;
  color: var(--ink-1);
  text-decoration: none;
}
/* Prototype `.seg button::after`: a 44 px-tall hit area around a 28 px pill. */
.lang-links a::after {
  content: '';
  position: absolute;
  inset: -8px -1px;
}
.lang-links a[aria-current='page'] {
  background: var(--canvas);
  box-shadow: var(--e1);
  font-weight: 600;
}
@media (max-width: 734px) {
  .foot-cols {
    grid-template-columns: 1fr 1fr;
  }
  .foot-cols a {
    min-height: 44px;
    font-size: 15px;
  }
  .foot-bottom {
    flex-direction: column;
    align-items: start;
  }
  .foot-prefs {
    flex-direction: column;
    align-items: start;
  }
}
```

3e. Remove P0's temporary toggle mount:

```bash
grep -rn "ThemeToggle" src --include='*.tsx'
```
P0 mounted its temporary `<ThemeToggle … />` in `src/components/SiteFooter.tsx`, marked `{/* P0-TEMP-THEME-TOGGLE */}` (master R20); this task rewrites that file, so confirm with `grep -rn "P0-TEMP-THEME-TOGGLE" src` that no marker survives. Keep: `src/components/ThemeToggle.tsx` itself, P1's phone-menu use, and the new one in `SiteFooter.tsx`. If `ThemeToggle` takes different props than `{ locale }`, change the one call in `SiteFooter.tsx` to match P0's signature.

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/site-footer.test.tsx tests/content.test.ts tests/smoke.test.tsx && npx tsc --noEmit && npx eslint src`
Expected: PASS; tsc 0; eslint clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/SiteFooter.tsx src/components/LanguageLinks.tsx src/components/site-footer.css src/lib/content.ts src/app tests/site-footer.test.tsx
git commit -m "$(cat <<'EOF'
feat(footer): three link columns, legal line, Appearance and Language beside it

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
)"
```

- [ ] **Step 6: Screenshot check**

Dev server up, then `ONLY=footer node /tmp/klao-qa/p4-qa.mjs`.
Expected: exit 0, 8 PNGs `*-footer.png`. Check: desktop — three columns (Projects · Career · Elsewhere with LinkedIn/GitHub/Résumé icons), then a hairline and a bottom row with the legal lines left and Appearance + Language right; phone — two columns then Elsewhere, then legal, then the two prefs stacked; the active language pill is raised; legal text ≥ 14 px on phone; dark mode legible. Also open http://localhost:3000/en/projects in the script's browser or by eye: the footer renders there too.

---

### Task 11: ⌘K index (`palette-index.ts`)

**Files:** Create `src/lib/palette-index.ts` · Test `tests/palette-index.test.ts`
**Interfaces:** Consumes: `dict`, `UiStringKey` (Task 5), `mailto`, `CONTACT_SUBJECT`, `faqAnchorId` (Task 2), `projectKey` (C6), `IconName` (C4), `ThemePref` (C2), `Project.kicker` (C5 P1), `CareerEntry.key` (C5 P3) · Produces:

```ts
export type PaletteGroup = 'suggested' | 'go' | 'projects' | 'career' | 'faq' | 'links' | 'prefs';
export const PALETTE_GROUPS: readonly PaletteGroup[];
export type PaletteAction =
  | { type: 'target'; target: string }                 // link-target grammar → goToTarget
  | { type: 'href'; href: string; external: boolean }  // mailto / résumé / LinkedIn / GitHub
  | { type: 'copy'; text: string }
  | { type: 'theme'; pref: ThemePref }
  | { type: 'locale'; locale: Locale };
export interface PaletteEntry { id: string; group: PaletteGroup; label: string; alt: string; hint: string; keywords: string; icon: IconName; action: PaletteAction }
export interface PaletteInput {
  profile: Pick<Profile, 'email' | 'resumeUrl' | 'linkedin' | 'github'>;
  projects: Pick<Project, 'id' | 'name' | 'slug' | 'type' | 'kicker' | 'description'>[];
  career: Pick<CareerEntry, 'id' | 'key' | 'company' | 'role' | 'period'>[];
  faq: Pick<FaqItem, 'id' | 'question'>[];
}
export function buildPaletteIndex(input: PaletteInput, locale: Locale): PaletteEntry[];
export function fold(s: string): string;
export function oneEdit(a: string, b: string): boolean;
export function searchPalette(entries: PaletteEntry[], query: string): PaletteEntry[];
export function highlight(text: string, query: string): [string, string, string] | null;
```

- [ ] **Step 1: Write the failing test** — `tests/palette-index.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { dict } from '@/lib/dictionary';
import { faqAnchorId } from '@/lib/link-target';
import {
  PALETTE_GROUPS,
  buildPaletteIndex,
  fold,
  highlight,
  oneEdit,
  searchPalette,
  type PaletteInput,
} from '@/lib/palette-index';
import { projectKey } from '@/lib/sheet-url';

const input: PaletteInput = {
  profile: {
    email: 'real@example.com',
    resumeUrl: '/resume.pdf',
    linkedin: 'https://www.linkedin.com/in/test/',
    github: 'https://github.com/test',
  },
  projects: [
    {
      id: 'p-gonai',
      name: 'GoNai',
      slug: null,
      type: 'build',
      kicker: { en: 'Trip planner', th: 'แอปวางแผนเที่ยว' },
      description: { en: 'One-day Bangkok trip planner', th: 'แอปวางแผนเที่ยวกรุงเทพฯ 1 วัน' },
    },
    {
      id: 'p-tripedia',
      name: 'Tripedia',
      slug: null,
      type: 'business',
      kicker: null,
      description: { en: 'Trip-planning platform', th: 'แพลตฟอร์มวางแผนทริป' },
    },
  ],
  career: [
    {
      id: 'c1',
      key: 'actmedia',
      company: 'Actmedia',
      role: { en: 'Senior Business Development', th: 'นักพัฒนาธุรกิจอาวุโส' },
      period: 'MAR 2026 – Present',
    },
  ],
  faq: [{ id: 'fx-faq-contact', question: { en: 'How do I reach him?', th: 'ติดต่อยังไง?' } }],
};

const byId = (locale: 'en' | 'th' = 'en') => new Map(buildPaletteIndex(input, locale).map((e) => [e.id, e]));

describe('buildPaletteIndex', () => {
  it('lists groups in display order with unique ids, as plain serialisable data', () => {
    const entries = buildPaletteIndex(input, 'en');
    const order = entries.map((e) => PALETTE_GROUPS.indexOf(e.group));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
    // The layout builds this on the server and hands it to a client island.
    expect(JSON.parse(JSON.stringify(entries))).toEqual(entries);
  });

  it('suggests mail (with the prototype subject), copy email and the résumé', () => {
    const e = byId();
    expect(e.get('suggested:mail')?.action).toEqual({
      type: 'href',
      href: 'mailto:real@example.com?subject=Hello%20from%20klao-site',
      external: false,
    });
    expect(e.get('suggested:copy')?.action).toEqual({ type: 'copy', text: 'real@example.com' });
    expect(e.get('suggested:resume')?.action).toEqual({ type: 'href', href: '/resume.pdf', external: true });
  });

  it('drops suggestions it has no data for', () => {
    const entries = buildPaletteIndex(
      { ...input, profile: { email: '', resumeUrl: null, linkedin: '', github: '' } },
      'en',
    );
    expect(entries.some((e) => e.group === 'suggested' || e.group === 'links')).toBe(false);
  });

  it('jumps to the six page sections (C7)', () => {
    const go = buildPaletteIndex(input, 'en').filter((e) => e.group === 'go');
    expect(go.map((e) => e.action)).toEqual(
      ['top', 'work', 'career', 'story', 'faq', 'contact'].map((target) => ({ type: 'target', target })),
    );
    expect(go.map((e) => e.label)).toEqual([
      dict.en.palTop,
      dict.en.palProjects,
      dict.en.palCareer,
      dict.en.palStory,
      dict.en.palFaq,
      dict.en.palContact,
    ]);
  });

  it('opens each project sheet by its projectKey, marking business vs build', () => {
    const e = byId();
    const gonai = e.get(`project:${projectKey(input.projects[0])}`)!;
    expect(gonai.action).toEqual({ type: 'target', target: `work/${projectKey(input.projects[0])}` });
    expect(gonai.hint).toBe('Trip planner');
    expect(gonai.icon).toBe('code-duotone');
    expect(e.get(`project:${projectKey(input.projects[1])}`)?.icon).toBe('chart-line-up-duotone');
  });

  it('opens each Career pill and each FAQ answer', () => {
    const e = byId('th');
    expect(e.get('career:actmedia')?.action).toEqual({ type: 'target', target: 'career:actmedia' });
    expect(e.get('career:actmedia')?.hint).toBe('MAR 2026 – Present');
    const faq = e.get('faq:fx-faq-contact')!;
    expect(faq.label).toBe('ติดต่อยังไง?');
    expect(faq.alt).toBe('How do I reach him?');
    expect(faq.action).toEqual({ type: 'target', target: faqAnchorId('fx-faq-contact') });
  });

  it('shortens link hints and offers language + three themes', () => {
    const e = byId();
    expect(e.get('link:linkedin')?.hint).toBe('linkedin.com/in/test');
    expect(e.get('link:github')?.hint).toBe('github.com/test');
    expect(e.get('pref:lang')?.action).toEqual({ type: 'locale', locale: 'th' });
    expect(e.get('pref:theme-dark')?.label).toBe('Appearance: Dark');
    expect(byId('th').get('pref:theme-dark')?.label).toBe('การแสดงผล: มืด');
    expect(byId('th').get('pref:lang')?.action).toEqual({ type: 'locale', locale: 'en' });
  });
});

describe('searchPalette', () => {
  const entries = buildPaletteIndex(input, 'en');

  it('returns everything for an empty query', () => {
    expect(searchPalette(entries, '  ')).toEqual(entries);
  });

  it('ranks label prefixes and keeps the fixed group order', () => {
    expect(searchPalette(entries, 'gon').map((e) => e.label)).toEqual(['GoNai']);
    expect(searchPalette(entries, 'career').map((e) => e.id)).toEqual(['go:career']);
  });

  it('searches the other language and keywords too (bilingual)', () => {
    const ids = searchPalette(entries, 'ติดต่อ').map((e) => e.id);
    // Suggested (mail, via keyword) comes before Go to (Contact, via its Thai name).
    expect(ids).toEqual(['suggested:mail', 'go:contact', 'faq:fx-faq-contact']);
  });

  it('forgives one typo in a Latin query of four or more letters', () => {
    expect(searchPalette(entries, 'resme').map((e) => e.id)).toContain('suggested:resume');
    expect(searchPalette(entries, 'zzzq')).toEqual([]);
  });
});

describe('helpers', () => {
  it('fold strips accents and case', () => {
    expect(fold('Résumé')).toBe('resume');
  });

  it('oneEdit accepts one insert, delete, substitution or neighbour swap', () => {
    expect(oneEdit('resume', 'resme')).toBe(true);
    expect(oneEdit('gonai', 'gonia')).toBe(true);
    expect(oneEdit('gonai', 'gnoia')).toBe(false);
  });

  it('highlight splits around the first match, ignoring accents and case', () => {
    expect(highlight('Open résumé', 'resume')).toEqual(['Open ', 'résumé', '']);
    expect(highlight('GoNai', 'x')).toBeNull();
    expect(highlight('GoNai', '')).toBeNull();
  });
});
```

Note on the bilingual expectation: `ติดต่อ` matches the mail row through its keywords (score 1), the Contact section through its Thai name (score 3) and the FAQ row through its Thai question `ติดต่อยังไง?` (score 3); results still come out in fixed group order (suggested → go → … → faq), score only orders rows inside a group.

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/palette-index.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/palette-index"`.

- [ ] **Step 3: Implement** — `src/lib/palette-index.ts`

```ts
import type { IconName } from '@/components/icons';
import { dict, type UiStringKey } from './dictionary';
import { CONTACT_SUBJECT, faqAnchorId, mailto } from './link-target';
import type { CareerEntry, FaqItem, Locale, Profile, Project } from './models';
import { projectKey } from './sheet-url';
import type { ThemePref } from './theme';

// The ⌘K index (spec §6): sections, projects (→ sheet), Career entries
// (→ pill), FAQ questions, and actions (copy email, theme, language). Built
// on the server in layout.tsx, so the client receives plain, already
// localised rows and no Notion data shapes; the palette code itself loads
// only when someone opens it.

export type PaletteGroup = 'suggested' | 'go' | 'projects' | 'career' | 'faq' | 'links' | 'prefs';

// Display order of the groups, with or without a query (prototype).
export const PALETTE_GROUPS: readonly PaletteGroup[] = ['suggested', 'go', 'projects', 'career', 'faq', 'links', 'prefs'];

export type PaletteAction =
  | { type: 'target'; target: string }
  | { type: 'href'; href: string; external: boolean }
  | { type: 'copy'; text: string }
  | { type: 'theme'; pref: ThemePref }
  | { type: 'locale'; locale: Locale };

export interface PaletteEntry {
  id: string;
  group: PaletteGroup;
  label: string; // active-locale name
  alt: string; // the other locale's name, so either language finds the row ('' = same)
  hint: string; // right-hand detail ('' = none)
  keywords: string; // extra search words, both languages
  icon: IconName;
  action: PaletteAction;
}

export interface PaletteInput {
  profile: Pick<Profile, 'email' | 'resumeUrl' | 'linkedin' | 'github'>;
  projects: Pick<Project, 'id' | 'name' | 'slug' | 'type' | 'kicker' | 'description'>[];
  career: Pick<CareerEntry, 'id' | 'key' | 'company' | 'role' | 'period'>[];
  faq: Pick<FaqItem, 'id' | 'question'>[];
}

// Section rows. Keywords are the prototype's aliases.
const SECTIONS: readonly { id: string; label: UiStringKey; icon: IconName; keywords: string }[] = [
  { id: 'top', label: 'palTop', icon: 'arrow-up-right', keywords: 'home hero' },
  { id: 'work', label: 'palProjects', icon: 'arrow-right', keywords: 'projects work โปรเจกต์ ผลงาน' },
  { id: 'career', label: 'palCareer', icon: 'arrow-right', keywords: 'career job cv งาน ประวัติ' },
  { id: 'story', label: 'palStory', icon: 'arrow-right', keywords: 'by day deal how work วิธีทำงาน ตอนกลางวัน' },
  { id: 'faq', label: 'palFaq', icon: 'arrow-right', keywords: 'faq questions คำถาม' },
  { id: 'contact', label: 'palContact', icon: 'envelope-duotone', keywords: 'contact email ติดต่อ' },
];

const THEMES: readonly { pref: ThemePref; label: UiStringKey; icon: IconName }[] = [
  { pref: 'auto', label: 'palThemeAuto', icon: 'circle-half' },
  { pref: 'light', label: 'palThemeLight', icon: 'sun' },
  { pref: 'dark', label: 'palThemeDark', icon: 'moon' },
];

// 'https://www.linkedin.com/in/x/' → 'linkedin.com/in/x' for the row hint.
const shortUrl = (url: string): string => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

export function buildPaletteIndex(input: PaletteInput, locale: Locale): PaletteEntry[] {
  const t = dict[locale];
  const other: Locale = locale === 'en' ? 'th' : 'en';
  const o = dict[other];
  const { email, resumeUrl, linkedin, github } = input.profile;
  const entries: PaletteEntry[] = [];

  if (email) {
    entries.push({
      id: 'suggested:mail',
      group: 'suggested',
      label: t.startConversation,
      alt: o.startConversation,
      hint: email,
      keywords: 'email mail contact hire อีเมล ติดต่อ',
      icon: 'envelope-duotone',
      action: { type: 'href', href: mailto(email, CONTACT_SUBJECT), external: false },
    });
    entries.push({
      id: 'suggested:copy',
      group: 'suggested',
      label: t.palCopyEmail,
      alt: o.palCopyEmail,
      hint: email,
      keywords: 'email copy คัดลอก',
      icon: 'copy',
      action: { type: 'copy', text: email },
    });
  }
  if (resumeUrl) {
    entries.push({
      id: 'suggested:resume',
      group: 'suggested',
      label: t.palOpenResume,
      alt: o.palOpenResume,
      hint: 'PDF',
      keywords: 'resume cv pdf เรซูเม่ ประวัติ',
      icon: 'file-pdf-duotone',
      action: { type: 'href', href: resumeUrl, external: true },
    });
  }

  for (const s of SECTIONS) {
    entries.push({
      id: `go:${s.id}`,
      group: 'go',
      label: t[s.label],
      alt: o[s.label],
      hint: `#${s.id}`,
      keywords: s.keywords,
      icon: s.icon,
      action: { type: 'target', target: s.id },
    });
  }

  for (const p of input.projects) {
    const key = projectKey(p);
    entries.push({
      id: `project:${key}`,
      group: 'projects',
      label: p.name,
      alt: '',
      hint: p.kicker?.[locale] ?? '',
      // The descriptions make "trip" or "เที่ยว" find GoNai without a
      // hand-kept alias list per project.
      keywords: `${p.description.en} ${p.description.th}`,
      icon: p.type === 'business' ? 'chart-line-up-duotone' : 'code-duotone',
      action: { type: 'target', target: `work/${key}` },
    });
  }

  for (const c of input.career) {
    entries.push({
      id: `career:${c.key}`,
      group: 'career',
      label: c.company,
      alt: '',
      hint: c.period,
      keywords: `${c.role.en} ${c.role.th}`,
      icon: 'arrow-right',
      action: { type: 'target', target: `career:${c.key}` },
    });
  }

  for (const f of input.faq) {
    entries.push({
      id: `faq:${f.id}`,
      group: 'faq',
      label: f.question[locale],
      alt: f.question[other],
      hint: '',
      keywords: '',
      icon: 'chat-circle-dots-duotone',
      action: { type: 'target', target: faqAnchorId(f.id) },
    });
  }

  if (linkedin) {
    entries.push({
      id: 'link:linkedin',
      group: 'links',
      label: 'LinkedIn',
      alt: '',
      hint: shortUrl(linkedin),
      keywords: 'linkedin',
      icon: 'linkedin-logo',
      action: { type: 'href', href: linkedin, external: true },
    });
  }
  if (github) {
    entries.push({
      id: 'link:github',
      group: 'links',
      label: 'GitHub',
      alt: '',
      hint: shortUrl(github),
      keywords: 'github code source โค้ด',
      icon: 'github-logo',
      action: { type: 'href', href: github, external: true },
    });
  }

  entries.push({
    id: 'pref:lang',
    group: 'prefs',
    label: t.palLang,
    alt: '',
    hint: '',
    keywords: 'language ภาษา thai english ไทย อังกฤษ',
    icon: 'translate-duotone',
    action: { type: 'locale', locale: other },
  });
  for (const th of THEMES) {
    entries.push({
      id: `pref:theme-${th.pref}`,
      group: 'prefs',
      label: `${t.footAppearance}: ${t[th.label]}`,
      alt: `${o.footAppearance}: ${o[th.label]}`,
      hint: '',
      keywords: `theme appearance ${th.pref} ธีม`,
      icon: th.icon,
      action: { type: 'theme', pref: th.pref },
    });
  }

  return entries;
}

// Case- and accent-insensitive form used for matching ('Résumé' → 'resume').
// Thai has no canonical decompositions, so Thai text keeps its length and
// highlight() offsets stay valid.
export const fold = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC').toLowerCase();

const THAI = /[฀-๿]/;

// True when one edit (insert, delete, substitute, or swap two neighbours)
// turns a into b — the prototype's lev1.
export function oneEdit(a: string, b: string): boolean {
  if (a.length === b.length) {
    const diff: number[] = [];
    for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) diff.push(k);
    if (diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]]) {
      return true;
    }
  }
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

// Prototype score(): 3 = a name or word starts with the query, 2 = a name
// contains it, 1 = a keyword matches, 0.5 = one typo away (Latin, 4+ letters
// only — Thai has no spaces to anchor a typo on).
function score(entry: PaletteEntry, q: string): number {
  const names = [fold(entry.label), fold(entry.alt)].filter(Boolean);
  const words = names.join(' ').split(/\s+/).filter(Boolean);
  const kw = fold(entry.keywords);
  const kwWords = kw.split(/\s+/).filter(Boolean);
  if (names.some((n) => n.startsWith(q)) || words.some((w) => w.startsWith(q))) return 3;
  if (names.some((n) => n.includes(q))) return 2;
  if (kwWords.some((w) => w.startsWith(q)) || kw.includes(q)) return 1;
  if (
    q.length >= 4 &&
    !THAI.test(q) &&
    words
      .concat(kwWords)
      .some((w) => oneEdit(w.slice(0, q.length), q) || oneEdit(w.slice(0, q.length + 1), q) || oneEdit(w, q))
  ) {
    return 0.5;
  }
  return 0;
}

// Matching rows, best first inside each group, groups in PALETTE_GROUPS order.
export function searchPalette(entries: PaletteEntry[], query: string): PaletteEntry[] {
  const q = fold(query.trim());
  if (!q) return entries;
  const scored = entries
    .map((entry, index) => ({ entry, index, s: score(entry, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.index - b.index);
  return PALETTE_GROUPS.flatMap((g) => scored.filter((x) => x.entry.group === g).map((x) => x.entry));
}

// [before, match, after] around the first case/accent-insensitive match.
export function highlight(text: string, query: string): [string, string, string] | null {
  const q = fold(query.trim());
  if (!q) return null;
  const i = fold(text).indexOf(q);
  if (i < 0) return null;
  return [text.slice(0, i), text.slice(i, i + q.length), text.slice(i + q.length)];
}
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/palette-index.test.ts && npx tsc --noEmit`
Expected: PASS; tsc 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/palette-index.ts tests/palette-index.test.ts
git commit -m "$(cat <<'EOF'
feat(palette): server-built ⌘K index with bilingual, typo-tolerant search

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
)"
```

---

### Task 12: Ask Preview matching (`ask.ts`)

**Files:** Create `src/lib/ask.ts` · Test `tests/ask.test.ts`
**Interfaces:** Consumes: `fold` (Task 11), `faqAnchorId` (Task 2), `dict.palFaq` (Task 5), `THAI_RE` (C3) · Produces:

```ts
export interface AskSource { label: string; quote: string; target: string }
export type AskAnswer =
  | { kind: 'answer'; query: string; lang: Locale; text: string; sources: AskSource[] } // text carries [n] markers
  | { kind: 'decline'; query: string; lang: Locale };
export const ASK_CANNED: readonly Canned[];
export function askPreview(query: string, faq: FaqItem[], locale: Locale): AskAnswer;
```

- [ ] **Step 1: Write the failing test** — `tests/ask.test.ts`

```ts
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import careerFixture from '@/content/fixtures/career.json';
import faqFixture from '@/content/fixtures/faq.json';
import projectsFixture from '@/content/fixtures/projects.json';
import { ASK_CANNED, askPreview } from '@/lib/ask';
import { parseTarget } from '@/lib/link-target';
import type { CareerEntry, FaqItem, Project } from '@/lib/models';
import { projectKey } from '@/lib/sheet-url';

const faq = faqFixture as FaqItem[];
const fetchSpy = vi.fn();

beforeEach(() => {
  fetchSpy.mockReset();
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  // Global constraint: the Ask Preview never touches the network.
  expect(fetchSpy).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

describe('askPreview', () => {
  it('declines pay and rate questions instead of guessing', () => {
    expect(askPreview('What is his salary?', faq, 'en')).toEqual({
      kind: 'decline',
      query: 'What is his salary?',
      lang: 'en',
    });
    expect(askPreview('เงินเดือนเท่าไหร่', faq, 'en')).toMatchObject({ kind: 'decline', lang: 'th' });
  });

  it('answers from the canned set with numbered sources', () => {
    const a = askPreview('Has he done a startup?', faq, 'en');
    expect(a.kind).toBe('answer');
    if (a.kind !== 'answer') return;
    expect(a.lang).toBe('en');
    expect(a.text).toContain('[1]');
    expect(a.text).toContain('[2]');
    expect(a.sources.map((s) => s.target)).toEqual(['work/tripedia', 'work/talatify']);
    expect(a.sources[0]).toEqual({
      label: 'Projects · Tripedia',
      quote: 'Final 30 of 500 teams',
      target: 'work/tripedia',
    });
  });

  it('answers in the language the question was asked in, whatever the page language', () => {
    const a = askPreview('เคยทำสตาร์ทอัพไหม', faq, 'en');
    expect(a).toMatchObject({ kind: 'answer', lang: 'th' });
    if (a.kind === 'answer') expect(a.sources[0].quote).toBe('เข้ารอบ 30 ทีมสุดท้ายจาก 500 ทีม');
  });

  it('takes the first canned entry that matches (prototype order)', () => {
    const a = askPreview('what is he working on right now', faq, 'en');
    expect(a.kind === 'answer' && a.sources.map((s) => s.target)).toEqual([
      'career:actmedia',
      'work/gonai',
      'work/aje',
    ]);
  });

  it('falls back to Klao’s FAQ when no canned entry matches', () => {
    const a = askPreview('How do I reach him?', faq, 'en');
    expect(a.kind).toBe('answer');
    if (a.kind !== 'answer') return;
    const item = faq.find((f) => f.id === 'fx-faq-contact')!;
    expect(a.text).toBe(`${item.answer.en}[1]`);
    expect(a.sources[0]).toEqual({ label: 'FAQ', quote: 'How do I reach him?', target: 'faq-fx-faq-contact' });
    expect(a.sources[1]).toEqual({ label: 'Contact', quote: '', target: 'contact' });
  });

  it('matches a Thai FAQ question too', () => {
    const a = askPreview('ติดต่อยังไง', faq, 'en');
    expect(a).toMatchObject({ kind: 'answer', lang: 'th' });
    if (a.kind === 'answer') expect(a.sources[0].label).toBe('คำถามที่เจอบ่อย');
  });

  it('declines what the page does not say, and empty input', () => {
    expect(askPreview('favourite colour', faq, 'en').kind).toBe('decline');
    expect(askPreview('', faq, 'en').kind).toBe('decline');
    expect(askPreview('   ', faq, 'th')).toMatchObject({ kind: 'decline', lang: 'th' });
  });

  it('uses the page language when the query has no letters', () => {
    expect(askPreview('12345', faq, 'th')).toMatchObject({ kind: 'decline', lang: 'th' });
  });
});

describe('Ask Preview stays offline and truthful', () => {
  it('has no network or model API in its source', () => {
    expect(readFileSync('src/lib/ask.ts', 'utf8')).not.toMatch(
      /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|import\(/,
    );
  });

  it('points every canned source at something the fixtures actually have', () => {
    // Same rule as faq.json: if a career key fails here, use P3's key.
    const careerKeys = new Set((careerFixture as CareerEntry[]).map((c) => c.key));
    const projectKeys = new Set((projectsFixture as Project[]).map((p) => projectKey(p)));
    for (const c of ASK_CANNED) {
      if (c.decline) continue;
      for (const s of c.sources) {
        const t = parseTarget(s.target);
        expect(t, s.target).not.toBeNull();
        if (t?.kind === 'career') expect(careerKeys.has(t.key), s.target).toBe(true);
        if (t?.kind === 'sheet') expect(projectKeys.has(t.key), s.target).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/ask.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/ask"`.

- [ ] **Step 3: Implement** — `src/lib/ask.ts` (answers copied verbatim from the prototype's `ASK` block, lines 1137–1157; `sheet:<id>` targets rewritten to `work/<key>`)

```ts
import { dict } from './dictionary';
import { faqAnchorId } from './link-target';
import type { FaqItem, Locale } from './models';
import { fold } from './palette-index';
import { THAI_RE } from './thai';

// Ask Klao, Preview (spec §6): a reference desk, not a model. Every answer
// is written in advance from this page's own content — Klao's FAQ (Notion)
// and the small canned set below from the approved prototype — and names
// the section it came from. Nothing here leaves the browser: no model call
// and no request of any kind (Global Constraints). tests/ask.test.ts scans
// this file to keep it that way.

export interface AskSource {
  label: string;
  quote: string; // '' = no quote line
  target: string; // link-target grammar
}

export type AskAnswer =
  | { kind: 'answer'; query: string; lang: Locale; text: string; sources: AskSource[] }
  | { kind: 'decline'; query: string; lang: Locale };

interface CannedSource {
  label: string;
  target: string;
  quote: Record<Locale, string>;
}

type Canned =
  | { match: RegExp; decline: true }
  | { match: RegExp; decline?: false; answer: Record<Locale, string>; sources: CannedSource[] };

const ACTMEDIA: CannedSource = {
  label: 'Career · Actmedia',
  target: 'career:actmedia',
  quote: { en: 'Senior Business Development · Mar 2026 – Present', th: 'นักพัฒนาธุรกิจอาวุโส · มี.ค. 2026 – ปัจจุบัน' },
};
const GONAI: CannedSource = {
  label: 'Projects · GoNai',
  target: 'work/gonai',
  quote: { en: 'Build · Live', th: 'สร้างเอง · เปิดใช้งานแล้ว' },
};
const AJE: CannedSource = {
  label: 'Projects · Aje',
  target: 'work/aje',
  quote: { en: 'Build · Working prototype', th: 'สร้างเอง · Prototype ใช้งานได้' },
};

// The prototype's ASK array, in its order: first match wins. Pay and rates
// are declined on purpose — not published, so never guessed.
export const ASK_CANNED: readonly Canned[] = [
  { match: /salary|pay |paid|rate card|price|เงินเดือน|ค่าจ้าง|ค่าตัว/i, decline: true },
  {
    match: /right now|working on|currently|these days|today|ตอนนี้|ทำอะไรอยู่|ช่วงนี้/i,
    answer: {
      en: 'Klao has been Senior Business Development at Actmedia since March 2026, opening new channels with Modern Trade retailers and project-managing live in-store rollouts; the largest is a nationwide in-store screen installation.[1] Outside work he builds AI tools: GoNai is live[2] and Aje is a working prototype.[3]',
      th: 'ตั้งแต่ มี.ค. 2026 Klao เป็น Senior Business Development ที่ Actmedia หาช่องทางใหม่กับค้าปลีก Modern Trade และคุมโปรเจกต์ที่รันอยู่ โปรเจกต์ใหญ่สุดคือติดตั้งจอในร้านทั่วประเทศ[1] นอกเวลางานเขาสร้างเครื่องมือ AI เอง GoNai เปิดใช้งานแล้ว[2] และ Aje เป็น prototype ที่ใช้งานได้[3]',
    },
    sources: [ACTMEDIA, GONAI, AJE],
  },
  {
    match: /startup|start-up|สตาร์ทอัพ|tripedia|talatify|pitch/i,
    answer: {
      en: 'Yes. He co-founded two. Tripedia, a trip-planning platform, made the final 30 of 500 teams at KATALYST Startup Launchpad 2022.[1] Talatify, a fresh-market delivery platform, was pitched at the TEP startup screening round in 2025, with SOM sized at THB 37M.[2]',
      th: 'เคยครับ Klao เป็น Co-founder สองโปรเจกต์ Tripedia แพลตฟอร์มวางแผนทริป เข้ารอบ 30 ทีมสุดท้ายจาก 500 ทีมใน KATALYST Startup Launchpad 2022[1] และ Talatify แพลตฟอร์มส่งของสดจากตลาด ที่นำเสนอในรอบคัดเลือก TEP ปี 2025 และประเมิน SOM ไว้ 37 ล้านบาท[2]',
    },
    sources: [
      {
        label: 'Projects · Tripedia',
        target: 'work/tripedia',
        quote: { en: 'Final 30 of 500 teams', th: 'เข้ารอบ 30 ทีมสุดท้ายจาก 500 ทีม' },
      },
      {
        label: 'Projects · Talatify',
        target: 'work/talatify',
        quote: { en: 'Market sized (TAM–SAM–SOM, SOM THB 37M)', th: 'ขนาดตลาด TAM–SAM–SOM (SOM 37 ล้านบาท)' },
      },
    ],
  },
  {
    match: /business|own shop|burger|founder|restaurant|ธุรกิจ|ร้าน|เจ้าของ/i,
    answer: {
      en: 'Yes. He founded A Bun Dance, a craft-burger shop for students, and ran it for 20 months (May 2021 – Dec 2022): product, pricing, marketing and 6–8 part-time staff. He held gross profit at about 35% per unit.[1]',
      th: 'เคยครับ Klao ก่อตั้งร้าน A Bun Dance เบอร์เกอร์คราฟต์สำหรับนักศึกษา ทำอยู่ 20 เดือน (พ.ค. 2021 – ธ.ค. 2022) ดูแลทั้งสินค้า ราคา การตลาด และพนักงานพาร์ทไทม์ 6–8 คน คุมกำไรขั้นต้นได้ราว 35% ต่อชิ้น[1]',
    },
    sources: [
      {
        label: 'Career · A Bun Dance',
        target: 'career:a-bun-dance',
        quote: { en: 'Held gross profit at ~35% per unit…', th: 'คุมกำไรขั้นต้นที่ ~35% ต่อชิ้น…' },
      },
    ],
  },
  {
    match: /retail|in-store|shopper|media|สื่อ|ค้าปลีก|actmedia/i,
    answer: {
      en: 'Yes. At Actmedia he opens new retail channels and project-manages a nationwide in-store screen installation.[1] The day-side story shows how one deal runs, from the NDA to handover.[2] Retail media & shopper media is also on his Focus list.[3]',
      th: 'ได้ครับ ที่ Actmedia เขาเปิดช่องทางค้าปลีกใหม่และคุมโปรเจกต์ติดตั้งจอในร้านทั่วประเทศ[1] ส่วน "ตอนกลางวัน" เล่าว่าดีลหนึ่งเดินอย่างไร ตั้งแต่ NDA จนส่งต่องาน[2] และ Retail media & shopper media อยู่ในรายการที่เขาถนัด[3]',
    },
    sources: [
      ACTMEDIA,
      {
        label: 'By day · 01–06',
        target: 'story',
        quote: { en: 'One retail-media deal, start to finish…', th: 'ดีลสื่อในร้านค้าปลีกหนึ่งดีล ตั้งแต่ต้นจนจบ…' },
      },
      {
        label: 'Toolbox · Focus',
        target: 'toolbox',
        quote: { en: 'Retail media & shopper media', th: 'Retail media & shopper media' },
      },
    ],
  },
  {
    match: /language|english|thai|ภาษา|อังกฤษ/i,
    answer: {
      en: 'Thai, and English at a conversational level. This site and his projects ship in both.[1]',
      th: 'ภาษาไทย และภาษาอังกฤษระดับสนทนา เว็บนี้และโปรเจกต์ของเขาทำครบทั้งสองภาษา[1]',
    },
    sources: [
      {
        label: 'Toolbox · Languages',
        target: 'toolbox',
        quote: { en: 'Thai · English (conversational)', th: 'ไทย · อังกฤษ (ระดับสนทนา)' },
      },
    ],
  },
  {
    match: /build|code|app|develop|สร้าง|แอป|โค้ด/i,
    answer: {
      en: 'Yes, on nights and weekends, with AI-assisted development (Claude). GoNai is live[1], Aje is a working prototype[2], and this site is edited in Notion.[3]',
      th: 'จริงครับ ทำนอกเวลางานด้วย AI-assisted development (Claude) GoNai เปิดใช้งานแล้ว[1] Aje เป็น prototype ที่ใช้งานได้[2] และเว็บนี้แก้เนื้อหาผ่าน Notion[3]',
    },
    sources: [
      GONAI,
      AJE,
      {
        label: 'Projects · klao-site',
        target: 'work/klao-site',
        quote: { en: 'Notion as the only CMS', th: 'Notion เป็น CMS เดียว' },
      },
    ],
  },
];

// Words that carry no topic; dropping them keeps "how do I reach him"
// matched on "reach", not on "how".
const STOP = new Set([
  'a', 'an', 'and', 'are', 'about', 'at', 'can', 'did', 'do', 'does', 'for', 'has', 'have', 'he', 'him',
  'his', 'how', 'i', 'in', 'is', 'it', 'klao', 'of', 'on', 'the', 'to', 'what', 'which', 'who', 'with',
  'you', 'your',
]);

// Letters + combining marks (Thai vowels and tone marks are marks, not
// letters) + digits; everything else splits.
const tokens = (q: string): string[] => [
  ...new Set(fold(q).split(/[^\p{L}\p{M}\p{N}]+/u).filter((w) => w.length >= 2 && !STOP.has(w))),
];

// The FAQ item whose question + answer contains the most query words. A
// one-word query needs that word; longer queries need two, so a single
// common word can't drag in an unrelated answer. `faq` arrives sorted by
// Order, so a tie goes to the question Klao put first.
function bestFaq(query: string, faq: FaqItem[], lang: Locale): FaqItem | null {
  const words = tokens(query);
  if (words.length === 0) return null;
  let best: FaqItem | null = null;
  let bestScore = 0;
  for (const item of faq) {
    const hay = fold(`${item.question[lang]} ${item.answer[lang]}`);
    const s = words.filter((w) => hay.includes(w)).length;
    if (s > bestScore) {
      best = item;
      bestScore = s;
    }
  }
  return bestScore >= Math.min(2, words.length) ? best : null;
}

export function askPreview(query: string, faq: FaqItem[], locale: Locale): AskAnswer {
  const q = query.trim();
  // Answer in the language of the question (prototype); a query with no
  // letters at all falls back to the page's language.
  const lang: Locale = THAI_RE.test(q) ? 'th' : /[a-z]/i.test(q) ? 'en' : locale;
  const decline: AskAnswer = { kind: 'decline', query: q, lang };
  if (!q) return decline;

  for (const c of ASK_CANNED) {
    if (!c.match.test(q)) continue;
    if (c.decline) return decline;
    return {
      kind: 'answer',
      query: q,
      lang,
      text: c.answer[lang],
      sources: c.sources.map((s) => ({ label: s.label, quote: s.quote[lang], target: s.target })),
    };
  }

  const item = bestFaq(q, faq, lang);
  if (!item) return decline;
  return {
    kind: 'answer',
    query: q,
    lang,
    // [1] = the FAQ entry itself, so the card always says where it came from.
    text: `${item.answer[lang]}[1]`,
    sources: [
      { label: dict[lang].palFaq, quote: item.question[lang], target: faqAnchorId(item.id) },
      ...item.links.map((l) => ({ label: l.label[lang], quote: '', target: l.target })),
    ],
  };
}
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/ask.test.ts && npx tsc --noEmit`
Expected: PASS; tsc 0. If the fixture-parity test fails on a `career:` key, use P3's shipped key in both `ask.ts` (`ACTMEDIA`, the A Bun Dance source) and `faq.json`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ask.ts tests/ask.test.ts
git commit -m "$(cat <<'EOF'
feat(ask): Ask Klao Preview answers from the FAQ and the prototype's canned set, offline

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
)"
```

---

### Task 13: CommandPalette + AskCard

**Files:** Create `src/components/palette/CommandPalette.tsx`, `src/components/palette/AskCard.tsx`, `src/components/palette/palette.css` · Test `tests/command-palette.test.tsx`
**Interfaces:** Consumes: `searchPalette`, `highlight`, `PaletteEntry`, `PaletteGroup` (Task 11), `askPreview`, `AskAnswer`, `AskSource` (Task 12), `goToTarget` (Task 6), `copyText`, `copyShortcutHint` (Task 8), `swapLocale`, `mailto` (Task 2), `fill` (Task 5), `readThemePref`, `writeThemePref` (C2), `Icon` (C4) · Produces:

```ts
export interface CommandPaletteProps {
  entries: PaletteEntry[]; faq: FaqItem[]; email: string; locale: Locale; initialQuery: string;
  onClose: (opts?: { restoreFocus?: boolean }) => void;
}
export default function CommandPalette(props: CommandPaletteProps): JSX.Element; // mounts open, modal
// AskCard: default export, props { answer: AskAnswer; email: string; locale: Locale; onBack(): void; onGo(target: string): void; onCopyEmail(): void }
```

- [ ] **Step 1: Write the failing test** — `tests/command-palette.test.tsx`

```tsx
// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CommandPalette from '@/components/palette/CommandPalette';
import { dict } from '@/lib/dictionary';
import { fill } from '@/lib/format';
import type { FaqItem } from '@/lib/models';
import { buildPaletteIndex, type PaletteInput } from '@/lib/palette-index';

const faq: FaqItem[] = [
  {
    id: 'fx-faq-contact',
    question: { en: 'How do I reach him?', th: 'ติดต่อยังไง?' },
    answer: {
      en: 'Email suvichuk.j@gmail.com, or use Start a conversation at the end of this page.',
      th: 'อีเมล suvichuk.j@gmail.com หรือกด "เริ่มคุยกัน" ท้ายหน้านี้',
    },
    links: [{ label: { en: 'Contact', th: 'Contact' }, target: 'contact' }],
    order: 5,
  },
];

const input: PaletteInput = {
  profile: { email: 'real@example.com', resumeUrl: '/resume.pdf', linkedin: '', github: '' },
  projects: [
    {
      id: 'p-gonai',
      name: 'GoNai',
      slug: null,
      type: 'build',
      kicker: { en: 'Trip planner', th: 'แอปวางแผนเที่ยว' },
      description: { en: 'One-day Bangkok trip planner', th: 'แอปวางแผนเที่ยวกรุงเทพฯ 1 วัน' },
    },
  ],
  career: [
    {
      id: 'c1',
      key: 'actmedia',
      company: 'Actmedia',
      role: { en: 'Senior Business Development', th: 'นักพัฒนาธุรกิจอาวุโส' },
      period: 'MAR 2026 – Present',
    },
  ],
  faq,
};

let fetchSpy: ReturnType<typeof vi.fn>;
let onClose: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  // jsdom has no modal dialogs and no scrollIntoView; these stand in.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
  Element.prototype.scrollIntoView = vi.fn();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
  onClose = vi.fn();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
  // The whole palette, Ask Preview included, never touches the network.
  expect(fetchSpy).not.toHaveBeenCalled();
  cleanup();
  document.body.innerHTML = '';
  history.replaceState(null, '', '/');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function open(locale: 'en' | 'th' = 'en', initialQuery = '') {
  render(
    <CommandPalette
      entries={buildPaletteIndex(input, locale)}
      faq={faq}
      email="real@example.com"
      locale={locale}
      initialQuery={initialQuery}
      onClose={onClose}
    />,
  );
  return screen.getByRole('combobox') as HTMLInputElement;
}
const type = (box: HTMLElement, value: string) => fireEvent.change(box, { target: { value } });
// Lets the palette's post-close setTimeout(…, 0) and clipboard promises run.
const settle = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });

describe('CommandPalette', () => {
  it('opens as a labelled dialog: a combobox driving a listbox, first option active, input focused', () => {
    const box = open();
    expect(screen.getByRole('dialog', { name: dict.en.palSearch })).toBeTruthy();
    expect(box.getAttribute('aria-expanded')).toBe('true');
    const list = screen.getByRole('listbox');
    expect(box.getAttribute('aria-controls')).toBe(list.id);
    const options = within(list).getAllByRole('option');
    expect(options).toHaveLength(buildPaletteIndex(input, 'en').length);
    expect(options[0].getAttribute('aria-selected')).toBe('true');
    expect(box.getAttribute('aria-activedescendant')).toBe(options[0].id);
    expect(document.activeElement).toBe(box);
  });

  it('moves the active option with the arrows (wrapping) and Home/End', () => {
    const box = open();
    const options = screen.getAllByRole('option');
    fireEvent.keyDown(box, { key: 'ArrowDown' });
    expect(box.getAttribute('aria-activedescendant')).toBe(options[1].id);
    fireEvent.keyDown(box, { key: 'ArrowUp' });
    fireEvent.keyDown(box, { key: 'ArrowUp' });
    expect(box.getAttribute('aria-activedescendant')).toBe(options[options.length - 1].id);
    fireEvent.keyDown(box, { key: 'Home' });
    expect(box.getAttribute('aria-activedescendant')).toBe(options[0].id);
    fireEvent.keyDown(box, { key: 'End' });
    expect(options[options.length - 1].getAttribute('aria-selected')).toBe('true');
  });

  it('filters as you type, keeps the group label and marks the match', () => {
    const box = open();
    type(box, 'gonai');
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0].querySelector('mark')?.textContent).toBe('GoNai');
    expect(screen.getByText(dict.en.palProjects)).toBeTruthy();
  });

  it('Enter on a Career row closes first, then opens that pill (C8)', async () => {
    document.body.insertAdjacentHTML('beforeend', '<section id="career"><h2>Career</h2></section>');
    const heard = vi.fn();
    window.addEventListener('klao:career', heard);
    const box = open();
    type(box, 'actmedia');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onClose).toHaveBeenCalledWith({ restoreFocus: false });
    await settle();
    expect((heard.mock.calls[0][0] as CustomEvent).detail).toEqual({ key: 'actmedia' });
    window.removeEventListener('klao:career', heard);
  });

  it('Esc clears the query first, then closes', () => {
    const box = open('en', 'gonai');
    expect(box.value).toBe('gonai');
    fireEvent.keyDown(box, { key: 'Escape' });
    expect(box.value).toBe('');
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('offers "Ask Klao" when nothing matches, and declines what the page does not say', () => {
    const box = open();
    type(box, 'zzzq');
    expect(screen.getByText(fill(dict.en.palNone, { q: 'zzzq' }))).toBeTruthy();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toContain(fill(dict.en.palAsk, { q: 'zzzq' }));
    fireEvent.keyDown(box, { key: 'Enter' });
    const card = screen.getByRole('region', { name: dict.en.askTitle });
    expect(within(card).getByText(dict.en.askBadge)).toBeTruthy();
    expect(card.textContent).toContain(fill(dict.en.askDeclined, { email: 'real@example.com' }));
    expect(within(card).getByRole('button', { name: dict.en.palCopyEmail })).toBeTruthy();
    expect(document.activeElement?.textContent).toBe(dict.en.askTitle);
  });

  it('answers with numbered sources that jump to where the answer came from', async () => {
    document.body.insertAdjacentHTML('beforeend', '<section id="work"></section>');
    const box = open();
    type(box, 'has he done a startup?');
    fireEvent.keyDown(box, { key: 'End' });
    fireEvent.keyDown(box, { key: 'Enter' });
    const card = screen.getByRole('region', { name: dict.en.askTitle });
    expect(within(card).getAllByRole('button', { name: /^Source \d$/ })).toHaveLength(2);
    const list = within(card).getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    fireEvent.click(within(list).getAllByRole('button')[0]);
    expect(onClose).toHaveBeenCalledWith({ restoreFocus: false });
    await settle();
    expect(window.location.hash).toBe('#work/tripedia');
  });

  it('Cancel or Esc leaves the answer and returns to the search, query intact', () => {
    const box = open();
    type(box, 'zzzq');
    fireEvent.keyDown(box, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: dict.en.palCancel }));
    const again = screen.getByRole('combobox') as HTMLInputElement;
    expect(again.value).toBe('zzzq');
    expect(document.activeElement).toBe(again);
    fireEvent.keyDown(again, { key: 'Enter' });
    fireEvent.keyDown(screen.getByRole('region', { name: dict.en.askTitle }), { key: 'Escape' });
    expect(screen.getByRole('combobox')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps Tab inside the dialog', () => {
    const box = open();
    type(box, 'zzzq');
    fireEvent.keyDown(box, { key: 'Enter' });
    const dialog = screen.getByRole('dialog');
    const cancel = within(dialog).getByRole('button', { name: dict.en.palCancel });
    const wrong = within(dialog).getByRole('link', { name: dict.en.askWrong });
    wrong.focus();
    fireEvent.keyDown(wrong, { key: 'Tab' });
    expect(document.activeElement).toBe(cancel);
    fireEvent.keyDown(cancel, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(wrong);
  });

  it('copies the email in place and says so, without closing', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const box = open();
    type(box, 'copy');
    fireEvent.keyDown(box, { key: 'Enter' });
    await settle();
    expect(writeText).toHaveBeenCalledWith('real@example.com');
    expect(screen.getAllByRole('option')[0].textContent).toContain(dict.en.copied);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('applies a theme from Preferences and closes', () => {
    const box = open();
    type(box, 'dark');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(onClose).toHaveBeenCalledWith();
  });

  it('speaks Thai on /th, including a Thai decline for a Thai question', () => {
    const box = open('th');
    expect(box.getAttribute('placeholder')).toBe(dict.th.palPlaceholder);
    type(box, 'เงินเดือนเท่าไหร่');
    fireEvent.keyDown(box, { key: 'Enter' });
    const card = screen.getByRole('region', { name: dict.th.askTitle });
    expect(within(card).getByText(dict.th.askBadge)).toBeTruthy();
    expect(card.textContent).toContain(fill(dict.th.askDeclined, { email: 'real@example.com' }));
  });

  it('has no network API anywhere in the palette source', () => {
    for (const f of ['src/components/palette/CommandPalette.tsx', 'src/components/palette/AskCard.tsx']) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource/);
    }
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/command-palette.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/palette/CommandPalette"`.

- [ ] **Step 3: Implement**

`src/components/palette/AskCard.tsx`:

```tsx
'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from '@/components/icons';
import type { AskAnswer, AskSource } from '@/lib/ask';
import { dict } from '@/lib/dictionary';
import { fill } from '@/lib/format';
import { mailto } from '@/lib/link-target';
import type { Locale } from '@/lib/models';

// Subject line on the "Something wrong?" mail (prototype).
const ASK_SUBJECT = 'Ask Klao preview';

// The Ask Klao answer card, labelled Preview (spec §6): the question, the
// pre-written answer with [n] source markers, the numbered sources, or a
// decline that points to email. Chrome is in the page's language; the
// answer is in the language the question was asked in (prototype).
export default function AskCard({
  answer,
  email,
  locale,
  onBack,
  onGo,
  onCopyEmail,
}: {
  answer: AskAnswer;
  email: string;
  locale: Locale;
  onBack: () => void;
  onGo: (target: string) => void;
  onCopyEmail: () => void;
}) {
  const t = dict[locale];
  const a = dict[answer.lang];
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);

  // A screen reader lands on the card's title, not on a stale search field.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <section className="ask" aria-labelledby={titleId}>
      <div className="ask-h">
        <Icon name="chat-circle-dots-duotone" className="ck-ic" />
        <h2 id={titleId} ref={titleRef} tabIndex={-1}>
          {t.askTitle}
        </h2>
        <span className="ask-badge">{t.askBadge}</span>
        <button type="button" className="ask-cancel" onClick={onBack}>
          {t.palCancel}
        </button>
      </div>
      <p className="ask-trust">{t.askTrust}</p>
      <p className="ask-q">{answer.query}</p>
      {answer.kind === 'decline' ? (
        <div className="ask-decl">
          <p lang={answer.lang}>{fill(a.askDeclined, { email })}</p>
          <p className="ask-decl-act">
            <button type="button" className="btn btn-out" onClick={onCopyEmail}>
              {t.palCopyEmail}
            </button>
          </p>
        </div>
      ) : (
        <>
          <p className="ask-a" lang={answer.lang}>
            {withMarkers(answer.text, answer.sources, a.askSourceN, onGo)}
          </p>
          <div className="ask-srcs">
            <h3>{t.askSources}</h3>
            <ol>
              {answer.sources.map((s, i) => (
                <li key={`${s.target}-${i}`}>
                  <button type="button" onClick={() => onGo(s.target)}>
                    <b aria-hidden="true">{i + 1}</b>
                    <span>
                      <span>{s.label}</span>
                      {s.quote && <em lang={answer.lang}>“{s.quote}”</em>}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}
      <div className="ask-f">
        <a href={mailto(email, ASK_SUBJECT)}>{t.askWrong}</a>
      </div>
    </section>
  );
}

// "…GoNai is live[2] and…" → each [n] becomes a small button that jumps to
// source n. split() with a capture group puts the numbers at odd indexes.
function withMarkers(
  text: string,
  sources: AskSource[],
  labelTemplate: string,
  onGo: (target: string) => void,
): ReactNode[] {
  return text.split(/\[(\d+)\]/).map((part, i) => {
    if (i % 2 === 0) return part;
    const n = Number(part);
    const src = sources[n - 1];
    if (!src) return null;
    return (
      <sup key={i}>
        <button type="button" aria-label={fill(labelTemplate, { n })} onClick={() => onGo(src.target)}>
          {n}
        </button>
      </sup>
    );
  });
}
```

`src/components/palette/CommandPalette.tsx`:

```tsx
'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Icon } from '@/components/icons';
import { askPreview, type AskAnswer } from '@/lib/ask';
import { copyShortcutHint, copyText } from '@/lib/clipboard';
import { goToTarget } from '@/lib/deep-link';
import { dict, type UiStringKey } from '@/lib/dictionary';
import { fill } from '@/lib/format';
import { swapLocale } from '@/lib/link-target';
import type { FaqItem, Locale } from '@/lib/models';
import { highlight, searchPalette, type PaletteEntry, type PaletteGroup } from '@/lib/palette-index';
import { readThemePref, writeThemePref } from '@/lib/theme';
import AskCard from './AskCard';
import './palette.css';

export interface CommandPaletteProps {
  entries: PaletteEntry[];
  faq: FaqItem[];
  email: string;
  locale: Locale;
  initialQuery: string;
  onClose: (opts?: { restoreFocus?: boolean }) => void;
}

type Row = { kind: 'entry'; entry: PaletteEntry } | { kind: 'ask' };
type GroupKey = PaletteGroup | 'ask';

const GROUP_LABEL: Record<GroupKey, UiStringKey> = {
  suggested: 'palSuggested',
  go: 'palGo',
  projects: 'palProjects',
  career: 'palCareer',
  faq: 'palFaq',
  links: 'palLinks',
  prefs: 'palPrefs',
  ask: 'askTitle',
};

// Tab stops inside the dialog; tabindex="-1" headings are script focus
// targets, not stops.
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function Marked({ text, query }: { text: string; query: string }) {
  const parts = highlight(text, query);
  if (!parts) return <>{text}</>;
  return (
    <>
      {parts[0]}
      <mark>{parts[1]}</mark>
      {parts[2]}
    </>
  );
}

// Bilingual search (prototype): when only the other language matched, show
// both names so the visitor sees why the row is there.
function EntryLabel({ entry, query }: { entry: PaletteEntry; query: string }) {
  if (!query || highlight(entry.label, query) || !entry.alt || !highlight(entry.alt, query)) {
    return <Marked text={entry.label} query={query} />;
  }
  return (
    <>
      {entry.label} · <Marked text={entry.alt} query={query} />
    </>
  );
}

// The ⌘K palette (spec §6), loaded lazily by PaletteHost and mounted only
// while open. A native modal <dialog>: the page behind goes inert, Esc and
// the Android back gesture raise `cancel`, and the top layer sits above the
// glass nav. Combobox/listbox pattern: focus stays in the input and
// aria-activedescendant names the highlighted option.
export default function CommandPalette({ entries, faq, email, locale, initialQuery, onClose }: CommandPaletteProps) {
  const t = dict[locale];
  const uid = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const escHandled = useRef(false);
  const [query, setQuery] = useState(initialQuery);
  const [sel, setSel] = useState(0);
  const [answer, setAnswer] = useState<AskAnswer | null>(null);
  const [status, setStatus] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const raw = query.trim();
  const results = useMemo(() => searchPalette(entries, raw), [entries, raw]);
  // Prototype rule: offer "Ask Klao" from 3 characters, when nothing matched
  // or when the query reads like a question (has a space or ends with "?").
  const showAsk = raw.length >= 3 && (results.length === 0 || /\s/.test(raw) || /[?？]$/.test(raw));
  const rows = useMemo<Row[]>(
    () => [...results.map((entry): Row => ({ kind: 'entry', entry })), ...(showAsk ? [{ kind: 'ask' } as Row] : [])],
    [results, showAsk],
  );
  const active = rows.length > 0 ? Math.min(sel, rows.length - 1) : -1;
  const optionId = (i: number) => `${uid}-o-${i}`;
  const activeId = active >= 0 ? optionId(active) : undefined;
  const theme = readThemePref();

  // Open as a real modal. jsdom (tests) has no showModal; the attribute
  // keeps the element rendered and accessible there.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (typeof d.showModal === 'function') {
      if (!d.open) d.showModal();
    } else {
      d.setAttribute('open', '');
    }
    return () => {
      if (typeof d.close === 'function' && d.open) d.close();
    };
  }, []);

  // Back in the list (first render included), focus is in the search field;
  // AskCard moves focus to its own title when an answer opens.
  useEffect(() => {
    if (!answer) inputRef.current?.focus();
  }, [answer]);

  // Keep the highlighted option on screen while arrowing through the list.
  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView?.({ block: 'nearest' });
  }, [activeId]);

  // Result count for screen readers, debounced so typing isn't read out
  // letter by letter (prototype: 300 ms).
  useEffect(() => {
    if (answer) return;
    const id = setTimeout(() => setStatus(fill(t.palCount, { n: rows.length })), 300);
    return () => clearTimeout(id);
  }, [answer, rows.length, t.palCount]);

  function leave(target: string) {
    onClose({ restoreFocus: false });
    // After the modal is gone: while it is open the page is inert, so a
    // scroll or focus move made now would be dropped.
    setTimeout(() => goToTarget(target, locale), 0);
  }

  async function copy(entryId: string | null, text: string) {
    const ok = await copyText(text);
    setCopiedId(ok ? entryId : null);
    setStatus(ok ? t.copied : copyShortcutHint(t.closeCopyFail));
  }

  function run(row: Row | undefined) {
    if (!row) return;
    if (row.kind === 'ask') {
      const next = askPreview(raw, faq, locale);
      setAnswer(next);
      setStatus(next.kind === 'answer' ? fill(t.askReady, { n: next.sources.length }) : t.askTitle);
      return;
    }
    const { action } = row.entry;
    switch (action.type) {
      case 'target':
        leave(action.target);
        return;
      case 'copy':
        // Stays open: the confirmation is shown on the row itself.
        void copy(row.entry.id, action.text);
        return;
      case 'theme':
        writeThemePref(action.pref);
        onClose();
        return;
      case 'locale':
        onClose({ restoreFocus: false });
        window.location.assign(swapLocale(window.location.pathname, action.locale));
        return;
      case 'href':
        if (action.external) {
          onClose();
          window.open(action.href, '_blank', 'noopener');
        } else {
          onClose({ restoreFocus: false });
          window.location.href = action.href;
        }
        return;
    }
  }

  function backToList() {
    setAnswer(null);
    setStatus('');
  }

  // Esc peels one layer at a time: the answer, then the query, then the palette.
  function onEscape() {
    if (answer) {
      backToList();
      return;
    }
    if (query) {
      setQuery('');
      setSel(0);
      return;
    }
    onClose();
  }

  function trapTab(e: ReactKeyboardEvent<HTMLDialogElement>) {
    const d = dialogRef.current;
    if (!d) return;
    const stops = Array.from(d.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.checkVisibility?.() ?? true);
    if (stops.length === 0) return;
    const first = stops[0];
    const last = stops[stops.length - 1];
    const current = document.activeElement;
    if (e.shiftKey && (current === first || !d.contains(current))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (current === last || !d.contains(current))) {
      e.preventDefault();
      first.focus();
    }
  }

  function onDialogKeyDown(e: ReactKeyboardEvent<HTMLDialogElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      // Some browsers still raise `cancel` for this same key press; the flag
      // stops onCancel from treating it as a second Escape.
      escHandled.current = true;
      setTimeout(() => {
        escHandled.current = false;
      }, 0);
      onEscape();
      return;
    }
    if (e.key === 'Tab') trapTab(e);
  }

  function onInputKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    const n = rows.length;
    if (e.key === 'ArrowDown' && e.metaKey) {
      e.preventDefault();
      setSel(Math.max(0, n - 1));
    } else if (e.key === 'ArrowUp' && e.metaKey) {
      e.preventDefault();
      setSel(0);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSel(n ? (active + 1) % n : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSel(n ? (active - 1 + n) % n : 0);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSel(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSel(Math.max(0, n - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(rows[active]);
    }
  }

  function hintFor(entry: PaletteEntry): string {
    if (entry.action.type === 'theme') return entry.action.pref === theme ? '✓' : '';
    if (entry.action.type === 'copy' && copiedId === entry.id) return t.copied;
    return entry.hint;
  }

  // Consecutive rows of one group share a heading; searchPalette already
  // returns rows grouped in display order, and "Ask Klao" comes last.
  const blocks: { key: GroupKey; items: { row: Row; index: number }[] }[] = [];
  rows.forEach((row, index) => {
    const key: GroupKey = row.kind === 'ask' ? 'ask' : row.entry.group;
    const last = blocks[blocks.length - 1];
    if (last && last.key === key) last.items.push({ row, index });
    else blocks.push({ key, items: [{ row, index }] });
  });

  return (
    <dialog
      ref={dialogRef}
      className="ck"
      aria-label={t.palSearch}
      onKeyDown={onDialogKeyDown}
      onCancel={(e) => {
        e.preventDefault();
        if (!escHandled.current) onClose();
      }}
      onClick={(e) => {
        // A click on the <dialog> box itself (not its content) is the backdrop.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {answer ? (
        <AskCard
          answer={answer}
          email={email}
          locale={locale}
          onBack={backToList}
          onGo={leave}
          onCopyEmail={() => void copy(null, email)}
        />
      ) : (
        <>
          <div className="ck-row">
            <Icon name="magnifying-glass" className="ck-ic" />
            <input
              ref={inputRef}
              id={`${uid}-q`}
              className="ck-input"
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={`${uid}-list`}
              aria-autocomplete="list"
              aria-activedescendant={activeId}
              aria-label={t.palPlaceholder}
              placeholder={t.palPlaceholder}
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSel(0);
                setCopiedId(null);
              }}
              onKeyDown={onInputKeyDown}
            />
            <button type="button" className="ck-cancel" onClick={() => onClose()}>
              {t.palCancel}
            </button>
          </div>
          {raw && results.length === 0 && <p className="ck-empty">{fill(t.palNone, { q: raw })}</p>}
          <div className="ck-list" id={`${uid}-list`} role="listbox" aria-labelledby={`${uid}-q`}>
            {blocks.map((block) => (
              <div key={block.key} role="group" aria-labelledby={`${uid}-g-${block.key}`}>
                <div className="ck-g" id={`${uid}-g-${block.key}`}>
                  {t[GROUP_LABEL[block.key]]}
                </div>
                {block.items.map(({ row, index }) => (
                  <div
                    key={row.kind === 'ask' ? 'ask' : row.entry.id}
                    id={optionId(index)}
                    role="option"
                    aria-selected={index === active}
                    className="ck-o"
                    onClick={() => run(row)}
                    onPointerMove={() => {
                      if (index !== active) setSel(index);
                    }}
                  >
                    {row.kind === 'ask' ? (
                      <>
                        <Icon name="chat-circle-dots-duotone" className="ck-ic" />
                        <span>{fill(t.palAsk, { q: raw })}</span>
                        <span className="ck-hint">↵</span>
                      </>
                    ) : (
                      <>
                        <Icon name={row.entry.icon} className="ck-ic" />
                        <span>
                          <EntryLabel entry={row.entry} query={raw} />
                        </span>
                        <span className="ck-hint">{hintFor(row.entry)}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="ck-foot" aria-hidden="true">
            <span>{t.palMove}</span>
            <span>{t.palOpen}</span>
            <span>{t.palClose}</span>
            <span>{fill(t.palCount, { n: rows.length })}</span>
          </div>
        </>
      )}
      <div className="sr-only" role="status" aria-live="polite">
        {status}
      </div>
    </dialog>
  );
}
```

`src/components/palette/palette.css`:

```css
/* ⌘K palette + Ask Preview. Imported by CommandPalette, so it ships in the
   palette's lazy chunk, never the first load. Values: the prototype's
   .cmdk / .ckrow / .cko / .ask block; --card stands in for the
   prototype's --raised (not a C1 token). */
.ck {
  width: min(640px, 100% - 32px);
  max-width: none;
  max-height: none;
  margin: 14vh auto auto;
  padding: 0;
  border: 0;
  border-radius: 22px;
  background: var(--card);
  color: var(--ink-1);
  box-shadow: 0 24px 64px -16px rgb(0 0 0 / 0.28), 0 0 0 1px var(--line);
  overflow: hidden;
}
.ck::backdrop {
  background: rgb(0 0 0 / 0.2);
}
.ck-ic {
  flex: none;
  width: 20px;
  height: 20px;
  color: var(--ink-2);
}
.ck-row {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 56px;
  padding: 0 16px;
  border-bottom: 1px solid var(--line);
}
.ck-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: 0;
  background: none;
  font: inherit;
  font-size: 17px;
  color: var(--ink-1);
  outline: none;
}
.ck-input::placeholder {
  color: var(--ink-2);
}
.ck-cancel {
  display: none;
  min-height: 44px;
  border: 0;
  background: none;
  color: var(--link);
  font-size: 16px;
  cursor: pointer;
}
.ck-empty {
  margin: 0;
  padding: 14px 16px 4px;
  font-size: 14px;
  color: var(--ink-2);
}
.ck-list {
  max-height: min(56vh, 480px);
  padding: 6px;
  overflow: auto;
  overscroll-behavior: contain;
}
.ck-g {
  padding: 10px 10px 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-2);
}
.ck-o {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 0 10px;
  border-radius: 10px;
  font-size: 15px;
  cursor: pointer;
}
.ck-o[aria-selected='true'] {
  background: color-mix(in srgb, var(--ink-1) 7%, transparent);
}
.ck-o mark {
  background: none;
  color: inherit;
  font-weight: 700;
}
.ck-hint {
  max-width: 45%;
  margin-left: auto;
  overflow: hidden;
  font-size: 12px;
  color: var(--ink-2);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ck-foot {
  display: flex;
  align-items: center;
  gap: 14px;
  height: 36px;
  padding: 0 16px;
  border-top: 1px solid var(--line);
  font-size: 12px;
  color: var(--ink-2);
}
.ck-foot span:last-child {
  margin-left: auto;
}

/* Ask Klao · Preview card */
.ask {
  max-height: min(76vh, 640px);
  padding: 28px;
  overflow: auto;
}
.ask-h {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ask-h h2 {
  margin: 0;
  font-size: 21px;
  line-height: 25px;
  font-weight: 600;
}
.ask-h h2:not(:lang(th)) {
  letter-spacing: 0.011em;
}
.ask-badge {
  padding: 3px 10px;
  border-radius: 12px;
  box-shadow: inset 0 0 0 1px var(--ink-3);
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-1);
}
.ask-cancel {
  min-height: 44px;
  margin-left: auto;
  border: 0;
  background: none;
  color: var(--link);
  font-size: 16px;
  cursor: pointer;
}
.ask-trust {
  margin: 12px 0 0;
  font-size: 14px;
  line-height: 20px;
  color: var(--ink-2);
}
.ask-q {
  margin: 22px 0 0;
  font-size: 19px;
  line-height: 26px;
  font-weight: 600;
}
.ask-a {
  max-width: 60ch;
  margin: 10px 0 0;
  font-size: 17px;
  line-height: 26px;
}
.ask-a:lang(th) {
  line-height: 28px;
}
.ask-a sup button {
  min-width: 24px;
  min-height: 24px;
  padding: 0 4px;
  border: 0;
  border-radius: 6px;
  background: var(--mist);
  color: var(--ink-1);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.ask-srcs {
  margin: 18px 0 0;
  border-top: 1px solid var(--line);
}
.ask-srcs h3 {
  margin: 14px 0 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-2);
}
.ask-srcs ol {
  margin: 0;
  padding: 0;
  list-style: none;
}
.ask-srcs button {
  display: flex;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 8px 0;
  border: 0;
  background: none;
  color: var(--ink-1);
  font-size: 15px;
  line-height: 21px;
  text-align: left;
  cursor: pointer;
}
.ask-srcs button b {
  display: grid;
  flex: none;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--mist);
  font-size: 12px;
}
.ask-srcs em {
  display: block;
  font-style: normal;
  color: var(--ink-2);
}
.ask-srcs button:hover span > span:first-child {
  text-decoration: underline;
}
.ask-decl {
  margin-top: 22px;
  padding: 18px;
  border-radius: 16px;
  box-shadow: inset 0 0 0 1px var(--line);
}
.ask-decl p {
  margin: 0;
  font-size: 17px;
  line-height: 26px;
}
.ask-decl .ask-decl-act {
  margin-top: 12px;
}
.ask-f {
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
  font-size: 14px;
}
.ask-f a {
  color: var(--link);
}
@media (max-width: 734px) {
  .ck {
    width: 100%;
    height: 100dvh;
    margin: 0;
    border-radius: 0;
  }
  .ck-cancel {
    display: block;
  }
  .ck-list {
    max-height: calc(100dvh - 56px);
  }
  .ck-g,
  .ck-empty {
    font-size: 14px;
  }
  .ck-o {
    min-height: 48px;
    font-size: 16px;
  }
  .ck-hint {
    font-size: 14px;
  }
  .ck-foot {
    display: none;
  }
  .ask {
    max-height: calc(100dvh - 24px);
    padding: 22px 20px 28px;
  }
  .ask-badge,
  .ask-a sup button,
  .ask-srcs button b {
    font-size: 14px;
  }
}
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/command-palette.test.tsx && npx tsc --noEmit && npx eslint src/components/palette`
Expected: PASS (13 tests); tsc 0; eslint clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/palette/CommandPalette.tsx src/components/palette/AskCard.tsx src/components/palette/palette.css tests/command-palette.test.tsx
git commit -m "$(cat <<'EOF'
feat(palette): ⌘K dialog with keyboard combobox, focus trap and the Ask Klao Preview card

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
)"
```

---

### Task 14: PaletteHost + layout mount

**Files:** Create `src/components/palette/PaletteHost.tsx` · Modify `src/app/[locale]/layout.tsx` (imports; the `const profile = await getProfile();` line; after `<SiteFooter locale={l} />`) · Test `tests/palette-host.test.tsx`
**Interfaces:** Consumes: `CommandPalette` (Task 13, via `next/dynamic` only), `PALETTE_EVENT` (Task 6), `buildPaletteIndex` (Task 11), `getFaq` (Task 4), `getCareer`, `getFeaturedProjects`, `getProfile` · Produces: `<PaletteHost entries={PaletteEntry[]} faq={FaqItem[]} email={string} locale={Locale} />` — renders nothing until opened; opens on ⌘K / Ctrl-K / `/` (not while typing) / `klao:palette` (with `detail.query`); ⌘K / Ctrl-K toggles closed; returns focus to the opener unless an action moved it.

- [ ] **Step 1: Write the failing test** — `tests/palette-host.test.tsx`

```tsx
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PaletteHost from '@/components/palette/PaletteHost';
import type { FaqItem } from '@/lib/models';
import { buildPaletteIndex } from '@/lib/palette-index';

const loads = vi.hoisted(() => ({ count: 0 }));

// next/dynamic's real loader is wired by Next's compiler; React.lazy is the
// same contract (load on first render, suspend until loaded) and runs in jsdom.
/* eslint-disable @typescript-eslint/no-explicit-any */
vi.mock('next/dynamic', async () => {
  const React = await import('react');
  return {
    default: (loader: () => Promise<{ default: React.ComponentType<any> }>) => {
      const Lazy = React.lazy(loader);
      return function Dynamic(props: any) {
        return React.createElement(React.Suspense, { fallback: null }, React.createElement(Lazy, props));
      };
    },
  };
});
/* eslint-enable @typescript-eslint/no-explicit-any */

// Counts when the palette module is first evaluated — i.e. when its chunk
// would be fetched in the browser.
vi.mock('@/components/palette/CommandPalette', async (importOriginal) => {
  loads.count += 1;
  return importOriginal();
});

const faq: FaqItem[] = [];
const entries = buildPaletteIndex(
  { profile: { email: 'real@example.com', resumeUrl: '/resume.pdf', linkedin: '', github: '' }, projects: [], career: [], faq },
  'en',
);

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

const mount = () => render(<PaletteHost entries={entries} faq={faq} email="real@example.com" locale="en" />);
const press = (init: KeyboardEventInit) =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
  });

describe('PaletteHost', () => {
  it('renders nothing, and loads no palette code, until someone asks for it', () => {
    mount();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(loads.count).toBe(0);
  });

  it('opens on ⌘K, closes on Ctrl-K, and opens again when the key arrives as a capital K', async () => {
    mount();
    press({ key: 'k', metaKey: true });
    expect(await screen.findByRole('combobox')).toBeTruthy();
    expect(loads.count).toBe(1);
    press({ key: 'k', ctrlKey: true });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    press({ key: 'K', ctrlKey: true });
    expect(await screen.findByRole('combobox')).toBeTruthy();
  });

  it('opens from the klao:palette event with its query (nav button, FAQ line)', async () => {
    mount();
    act(() => {
      window.dispatchEvent(new CustomEvent('klao:palette', { detail: { query: 'resume' } }));
    });
    const box = (await screen.findByRole('combobox')) as HTMLInputElement;
    expect(box.value).toBe('resume');
  });

  it('opens on "/" unless the visitor is typing in a field', async () => {
    const field = document.createElement('input');
    document.body.appendChild(field);
    mount();
    field.focus();
    act(() => {
      fireEvent.keyDown(field, { key: '/' });
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    press({ key: '/' });
    expect(await screen.findByRole('combobox')).toBeTruthy();
  });

  it('hands focus back to whatever opened it', async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    mount();
    trigger.focus();
    press({ key: 'k', metaKey: true });
    const box = await screen.findByRole('combobox');
    fireEvent.keyDown(box, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/palette-host.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/palette/PaletteHost"`.

- [ ] **Step 3: Implement**

`src/components/palette/PaletteHost.tsx`:

```tsx
'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PALETTE_EVENT } from '@/lib/deep-link';
import type { FaqItem, Locale } from '@/lib/models';
import type { PaletteEntry } from '@/lib/palette-index';

// The palette itself — search, Ask Preview, its CSS — is a separate chunk,
// fetched the first time someone opens it and never part of the page's
// first load. Only this listener (a few hundred bytes) is always mounted.
const CommandPalette = dynamic(() => import('./CommandPalette'), { ssr: false });

type Session = { seq: number; query: string };

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

export default function PaletteHost({
  entries,
  faq,
  email,
  locale,
}: {
  entries: PaletteEntry[];
  faq: FaqItem[];
  email: string;
  locale: Locale;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const openRef = useRef(false);
  const seq = useRef(0);
  const opener = useRef<HTMLElement | null>(null);

  const show = useCallback((query: string) => {
    if (!openRef.current) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    openRef.current = true;
    seq.current += 1;
    // A new key per opening: every open starts from a fresh query/selection.
    setSession({ seq: seq.current, query });
  }, []);

  const close = useCallback((opts?: { restoreFocus?: boolean }) => {
    openRef.current = false;
    setSession(null);
    const back = opener.current;
    opener.current = null;
    // After the dialog has unmounted; skipped when the chosen action moved
    // focus itself (a deep link focuses the section it scrolled to).
    if (opts?.restoreFocus !== false && back) setTimeout(() => back.focus(), 0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (openRef.current) close();
        else show('');
        return;
      }
      // "/" is the prototype's second shortcut — never while typing, never
      // over another dialog (a project sheet, the phone menu).
      if (e.key === '/' && !openRef.current && !isTyping(e.target) && !document.querySelector('dialog[open]')) {
        e.preventDefault();
        show('');
      }
    };
    const onPalette = (e: Event) => show((e as CustomEvent<{ query?: string }>).detail?.query ?? '');
    window.addEventListener('keydown', onKey);
    window.addEventListener(PALETTE_EVENT, onPalette);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(PALETTE_EVENT, onPalette);
    };
  }, [show, close]);

  if (!session) return null;
  return (
    <CommandPalette
      key={session.seq}
      entries={entries}
      faq={faq}
      email={email}
      locale={locale}
      initialQuery={session.query}
      onClose={close}
    />
  );
}
```

Mount it in `src/app/[locale]/layout.tsx`:
1. Add imports: `import PaletteHost from '@/components/palette/PaletteHost';` and `import { buildPaletteIndex } from '@/lib/palette-index';`; extend the `@/lib/content` import to `getCareer, getFaq, getFeaturedProjects, getProfile`.
2. Replace the line `  const profile = await getProfile();` with:

```tsx
  // P4: the ⌘K index is built here, on the server, so the client receives
  // plain localised rows; the palette's code loads only on first open
  // (PaletteHost). Every getter is cache()-wrapped, so on the home route
  // these reuse the page's own fetches.
  const [profile, projects, career, faq] = await Promise.all([
    getProfile(),
    getFeaturedProjects(),
    getCareer(),
    getFaq(),
  ]);
  const paletteEntries = buildPaletteIndex({ profile, projects, career, faq }, l);
```

3. Directly after `<SiteFooter locale={l} />` add:

```tsx
        <PaletteHost entries={paletteEntries} faq={faq} email={profile.email} locale={l} />
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/palette-host.test.tsx tests/smoke.test.tsx && npx tsc --noEmit && npx eslint src`
Expected: PASS (smoke imports `generateMetadata` from the layout, which now evaluates `next/dynamic` at module load — that works in plain Node, verified 2026-09-25); tsc 0; eslint clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/palette/PaletteHost.tsx src/app/[locale]/layout.tsx tests/palette-host.test.tsx
git commit -m "$(cat <<'EOF'
feat(palette): always-mounted listener loads ⌘K on first open; index built in the layout

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
)"
```

- [ ] **Step 6: Screenshot check**

Dev server up (restart it if it was started before this task: `lsof -ti:3000 | xargs kill; ` then Task 1 Step 3), then `ONLY=palette,ask node /tmp/klao-qa/p4-qa.mjs`.
Expected: exit 0 with `askRequests` 0 in every row; 16 PNGs `*-palette.png`, `*-ask.png`. Check: desktop — a centred card at ~14 vh with the search row, a "Projects" group label and the GoNai row with "GoNai" in bold, hint text right, footer hints; phone — full-screen sheet with a Cancel button and no footer hints; Ask card — "Ask Klao" + a "Preview" badge + Cancel, the trust line, the question, the answer with small numbered source buttons, a "Sources" list with two numbered rows, and "Something wrong? Tell Klao"; TH card answers in Thai; dark mode surfaces readable. Also press ⌘K on http://localhost:3000/en/projects by eye: the palette opens there too.

---

### Task 15: Phase gate

**Files:** Create `/tmp/klao-qa/p4-lazy.mjs` (outside the repo) · no repo changes expected
**Interfaces:** Consumes: everything above · Produces: a green check/build, grep evidence, a lazy-chunk proof, a length table and 40 reviewed screenshots

- [ ] **Step 1: Full check and build**

Run: `npm run check && npm run build`
Expected: tsc, eslint and every Vitest file green; `next build` completes; the `/[locale]` route stays static/ISR (●, revalidate 1h).

- [ ] **Step 2: Grep checks**

```bash
grep -rn "QuestionsBand\|ContactBand" src tests                 # expect: no output
grep -rn "ClientsBand" src/app                                  # expect: no output
test -f src/components/sections/ClientsBand.tsx && echo kept    # expect: kept
grep -rnE "\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket" src/lib/ask.ts src/lib/palette-index.ts src/components/palette   # expect: no output
grep -rnE "import .*(CommandPalette|AskCard|lib/ask)" src | grep -v "src/components/palette/"   # expect: no output (lazy-only)
grep -rniE "instant|immediately|ทันที" src/components/sections/FaqBand.tsx src/components/sections/CloseBand.tsx src/components/SiteFooter.tsx src/components/palette src/lib/ask.ts src/lib/dictionary.ts src/content/fixtures/faq.json   # expect: no output
grep -rn "open to?" src/content/fixtures/faq.json               # expect: no output
grep -rni "aisecretary\|dailybrief" src public tests            # expect: no output
grep -rnE "href=[\"']#[\"']" src                                # expect: no output
```

- [ ] **Step 3: Prove the palette is not in the first load (production build)**

Write `/tmp/klao-qa/p4-lazy.mjs`:

```js
// Proves the ⌘K code is a separate chunk: fetched when the palette opens, never on page load.
import { chromium } from '/Users/suvichakjarunopratamp/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';

const BASE = process.env.BASE ?? 'http://localhost:3000';
// Lives only in src/lib/ask.ts (a regex source minifiers keep verbatim),
// which only the lazy palette chunk imports.
const MARKER = 'rate card';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
const seen = [];
let phase = 'load';
page.on('response', async (res) => {
  if (res.request().resourceType() !== 'script') return;
  const at = phase;
  try {
    if ((await res.text()).includes(MARKER)) seen.push({ at, url: res.url() });
  } catch {}
});
await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
phase = 'open';
await page.keyboard.press('Control+K');
await page.getByRole('combobox').waitFor();
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500);
await browser.close();
const atLoad = seen.filter((s) => s.at === 'load');
const onOpen = seen.filter((s) => s.at === 'open');
console.log({ atLoad, onOpen });
process.exit(atLoad.length === 0 && onOpen.length > 0 ? 0 : 1);
```

Run (dev server stopped first so port 3000 is free):

```bash
lsof -ti:3000 | xargs kill 2>/dev/null
cd "/Users/suvichakjarunopratamp/Desktop/Klao Workspace/Personal/klao-site" && nohup npm run start > /tmp/klao-qa/start.log 2>&1 &
curl --retry 60 --retry-connrefused --retry-delay 1 -s -o /dev/null http://localhost:3000/en && node /tmp/klao-qa/p4-lazy.mjs; echo "exit $?"
lsof -ti:3000 | xargs kill
```
Expected: `atLoad: []`, `onOpen` has one chunk URL, `exit 0`.

- [ ] **Step 4: Length + full screenshot matrix (dev)**

Task 1 Step 3 (dev server up), then `ONLY=all node /tmp/klao-qa/p4-qa.mjs`.
Expected: exit 0 (no console errors, no horizontal overflow, `askRequests` 0); 40 PNGs in `/tmp/klao-qa/p4/` (faq, close, footer, palette, ask × en/th × light/dark × desk/phone); the table's `len` column: desktop ≤ 8.6, phone ≤ 12 (`lenOk` true).
If a row is over: do **not** cut spacing. Copy the per-section columns (`top`, `signature`, `work`, `career`, `story`, `faq`, `contact`, `footer`) into the phase report and list trim candidates for Klao ranked by screens saved (e.g. phone footer Career column, By day chapter spacing 64 → 48 px per spec §10, FAQ closed by default already).

- [ ] **Step 5: Review the screenshots**

Open with the Read tool at least: `en-light-desk-faq`, `th-light-phone-faq`, `en-dark-desk-close`, `th-light-phone-close`, `en-light-desk-footer`, `th-dark-phone-footer`, `en-light-desk-palette`, `th-light-phone-palette`, `en-light-desk-ask`, `th-dark-desk-ask`. Checklist: Kram is the only accent (links in link blue, one kram pill); no Thai mid-word breaks in headlines, questions or the Ask answer; phone text ≥ 14 px (legal, palette group labels and hints); nothing clipped at 390 px; dark mode has no white panels except intentional ones; the Ask card says "Preview" in the badge and the trust line.

- [ ] **Step 6: Stop the dev server and report**

Run: `lsof -ti:3000 | xargs kill`
No commit (nothing changed). If any step above needed a fix, commit that fix on its own with a message naming the failing check, ending with the two trailer lines.
Report to Klao: tests count, build status, lazy-chunk proof, the length table (with trims if over), and the open items below.

---

## Contract gaps

1. **Component export shapes (C2–C4)** — the contracts name `ThemeToggle`, `Icon`, `ThaiText` but not their exports/props. This plan assumes `ThemeToggle` is a default export taking `{ locale: Locale }`, `Icon` + `type IconName` are named exports of `@/components/icons`, `ThaiText` is a default export, and `Reveal` keeps `{ children, as?, className? }`. If P0 differs, adjust the import lines/one call site each (Task 10 Step 3e covers ThemeToggle).
2. **Where P0 mounts the temporary toggle** isn't in the master plan; Task 10 greps for it.
3. **C1 token gaps** — the prototype's `--raised`, `--e4`, `--ctl`, `--select` aren't C1 tokens. The palette uses `--card` + a literal shadow; the footer's language pills use `--glass-ctl`.
4. **FAQ `Links` format** — C5 says `LabelEN|LabelTH|target`; spec §7 says `Label|target`. The parser accepts both (a 2-part line = one label for both languages). P5's NOTION_SETUP should document the 3-part form.
5. **`Profile.workingIn: string`** (C5) — the prototype shows "ไทย / อังกฤษ" on the Thai page; with a plain string the Thai page shows "TH / EN". Making it `Localized | null` would need a C5 change.
6. **Career keys** — the prototype links `career:abundance`; P3 pins `key = slugKey(company)` with the fixture company renamed to "A Bun Dance" → `a-bun-dance` (P3 plan, Task 3). P4 therefore uses `career:actmedia` / `career:a-bun-dance` in `faq.json` and `ask.ts`, and Tasks 4 + 12 assert every `career:` target exists in `career.json`. P3's `findCareerIndex` also tolerates the compact `abundance`, so a Notion FAQ row typed the prototype way still lands on the right pill.
7. **C8 module** — C8 names no module. P3 exports `CAREER_EVENT` from `src/lib/career.ts`; P4 imports and re-exports it from `src/lib/deep-link.ts` next to its own `PALETTE_EVENT` + `openPalette`. P1's nav button can import `openPalette`/`PALETTE_EVENT` from there (a string literal also works).
8. **P2 dependency (covered)** — the footer, FAQ, palette and Ask sources open sheets by changing `location.hash` (plain `<a>` or `location.hash = …`). P2's plan (Task 9, ProjectSheet) opens on load, `hashchange` and `popstate`, and names exactly these two ways for P4, so no change is needed; keep it that way if P2 is revised.
9. **Ask answers in Notion** — spec §7 lists "Ask answers" among the [DRAFT] copy that goes into Notion, but C5 has no Ask DB. The canned set lives in `src/lib/ask.ts` (FAQ-based answers are Notion-editable).
10. **NOTION_SETUP same-commit rule** (spec §9) vs the master plan giving NOTION_SETUP to P5 — P4 adds only `.env.example`; P5's plan (Task 8) documents the FAQ DB, `NOTION_DB_FAQ` and `BasedInEN/TH`, `WorkingIn`, and checks for them in a test.
11. **Icon** — the prototype's career rows use `briefcase-duotone`, which isn't in its `IC` set; career rows use `arrow-right`.
12. **Theme state across islands** — the palette's theme rows call `writeThemePref`; the footer `ThemeToggle` won't show the new pressed state until reload unless P0's toggle listens for a change (not in C2).

## Risks

- **Page length (phone)**: the footer keeps three link columns (prototype content); on phone that's two rows. If the gate measures > 12 screens, dropping the footer's Career column (it repeats the band right above) saves about 0.2 screen — Klao's call, listed in the report, not done silently.
- **Esc double-handling**: Esc is handled on `keydown` and the native `cancel` is suppressed for the same key press by a one-tick flag; if a browser fires `cancel` a task later, a non-empty query could clear and close in one press. Worth a manual Safari/Firefox check in P6.
- **First open latency**: the palette chunk loads on first ⌘K (by design). On a slow phone the first open can lag by a network round trip; later opens are instant from cache.
- **Parallel dictionary edits**: P1–P3 add keys to the same file; a same-name key is a compile error (caught), a same-meaning key under another name is just duplication (reuse theirs per Global Constraints).
