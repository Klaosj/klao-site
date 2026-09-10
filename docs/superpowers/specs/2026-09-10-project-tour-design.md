# Project Tour + real screenshots — design (2026-09-10)

Owner ask (Klao, 2026-09-10): "อัพเดทผลงาน · หา screenshot ในโปรเจกต์ว่าเปลี่ยนได้ไหม · ทำให้ดูเหมือนมีโปรเจกต์จริง ๆ เช่น hero tour UI".
Decisions taken in chat: base = the uncommitted light redesign ("A"), execution = subagents.

## 1. Goal

The home page should show that these projects are real things that run: a hero
"project tour" that walks through real screenshots inside a window frame, cards
that carry the same frame, two new build projects (Aje, klao-site), and fresh
high-resolution screenshots wherever one can be captured today.

## 2. Base: the light redesign is adopted

The working tree held an uncommitted 15-file redesign (mtime 2026-09-05 12:10,
origin unknown — not a Claude Code session on this Mac): green/paper palette
(`dark #20332d`, `deep #f0f5f2`, `light #ffffff`, `peri #2f6955`), HeroMonument
removed, hero = copy left + portrait aside right, WorkDeck = 2-column cards,
CraftBand moved to the end. `npm run check` passes 373/373 on it. It is
committed first, as its own commit, so it can be reverted independently of the
work below. HeroMonument/TiltCard/spotlight files stay in the repo (unused,
covered by their own tests) — deleting them is not part of this change.

## 3. Where screenshots live (answer to "เปลี่ยนได้ไหม")

- Source of truth: Notion Projects DB (`collection://312848d7-9eb3-4267-adc7-09f43c36ada8`),
  each row's `Screenshot` files property. `mapProject` turns it into
  `imageSrc = /api/img/page/<row-id>/Screenshot`, proxied to Notion S3.
  Replacing the file in Notion changes the live site within the hour, no deploy.
- Fallback: `src/content/fixtures/projects.json` `imageSrc` → `public/images/*`.
  Used when `NOTION_TOKEN` is unset (local dev, tests). The two layers are kept
  in step by hand (Klao's rule: every content edit is two-layer).
- Alt text: `src/lib/image-alt.ts` map keyed by fixture path; Notion-served
  images get the generic "Screenshot of the project interface." The project
  name is always visible text beside the image, so alt never repeats it.
- Today: GoNai + DailyBrief = real screenshots at 800×450 (too small for a
  ~570 px stage on a 2× display); AISecretary + TickerDesk = abstract SVG
  covers, not screens; Talatify + Tripedia = none.

## 4. ProjectTour (hero)

A client component rendered by `Hero`, occupying the hero's right column
(stage) and the bottom of the left column (list). Pattern: Aje landing
(`Personal/Aje/web/src/components/HeroTour.tsx` + `About.tsx`), simplified.

- **Membership rule:** only projects with a screenshot (`imageSrc !== null`),
  featured, in `order`. Business ideas without screens (Talatify, Tripedia)
  stay in the deck with a typographic cover; they join the tour automatically
  the day a screenshot is uploaded. No fabricated UI anywhere (receipts rule).
- **List (left, under the hero copy):** label `t.tourLabel`, then a vertical
  `role="tablist"` of buttons: `01` number, project name, and (active only)
  the project's question. The active tab carries a 2 px progress bar that
  fills over `TOUR_MS = 7000` ms via CSS animation, paused when not playing.
  Roving tabindex; ArrowUp/Down/Left/Right, Home, End move selection and focus.
- **Stage (right):** `ProjectFrame` (window chrome + screenshot) with the
  window title = host of `liveUrl` else project name; below it a caption row:
  kicker (`Business`/`Build`), `outcome ?? description`, and one link
  (`readStory` → `/{locale}/work/{slug}` if storied; else `liveSite` → liveUrl;
  else `viewCode` → repoUrl; else nothing). Controls: prev / `n / N` / next,
  and a pause/play toggle (`aria-pressed`). Under reduced motion the toggle is
  replaced by the text `t.tourStill`.
- **Playback:** autoplay advances every `TOUR_MS`, wrapping to the first slide.
  It runs only when ALL hold: more than one item · no reduced-motion · not
  paused by the visitor · pointer/focus not inside the stage · stage ≥25 % in
  view (IntersectionObserver) · document visible. Selecting a tab, prev/next
  do not un-pause. The active image is the only one in the DOM (`key` swap
  with a 450 ms fade/rise); the first slide's image loads eagerly (LCP).
- **Announcements:** a `sr-only` `aria-live="polite"` span speaks
  `"<name> · n / N"` on user-initiated changes only (never on autoplay ticks).
- **Empty:** zero eligible projects → renders nothing; the hero grid collapses
  to one column.
- **Layout:** `.hero-layout` becomes a 2×2 grid: areas `"copy stage" / "list
  stage"`, columns `minmax(0,1fr) minmax(0,1.15fr)`; ≤900 px stacks
  `copy / stage / list`. The portrait shrinks to a 64 px round avatar in an
  identity row (avatar + greeting + status pill) above the h1 — the big
  portrait aside is gone.

## 5. ProjectFrame + cover (shared by tour, deck, /projects rows)

`src/components/ProjectFrame.tsx` — server-safe, no hooks.
Props: `{ project: Project; title?: string; priority?: boolean; className?: string }`.

- Window chrome: three dots (decorative, `aria-hidden`) and, only when `title`
  is given, an ellipsised title. Cards pass no title (the name is the h3 right
  beside them); the tour passes `windowTitle(project)`.
- Screen: 16:9 box. With `imageSrc`: `<img width=800 height=450 decoding="async"
  loading={priority ? 'eager' : 'lazy'} alt={imageAlt(src)}>`, `object-fit:
  cover; object-position: top` so tall captures crop at the bottom, not the
  header. Without: a decorative monogram cover (`data-cover`, `aria-hidden`):
  the name's first letter in the display face on a green paper gradient with a
  faint ruled pattern. It shows nothing a screen reader would hear twice.
- WorkDeck and ProjectCard always render the frame (previously: no image → no
  block). Existing img contract (800×450, lazy, async, shared alt) is preserved
  and pinned by the existing tests.

## 6. Content additions (two-layer: fixture + Notion)

Build chapter order after this change: Aje 3 · GoNai 4 · AISecretary 5 ·
klao-site 6 · DailyBrief 7 · TickerDesk 8 (Business stays Talatify 1 ·
Tripedia 2). Aje leads because it is the strongest product screen and the
tour's first slide is the first impression.

**Aje** (build): "Idea-grading workspace for startup ideas: write one paragraph,
get it graded against proven frameworks, and leave with one small test to run
next." Stack `Next.js · Claude API · Ollama`. No live URL, no public repo.
Outcome: "Working prototype · 8-dimension report card with letter grades · 16
hand-drawn framework diagrams · advisor runs on Claude or a local model".
Question: "Is this idea worth a weekend, or a year?" Thai copy in the fixture.
Front-of-house wording rule from the Aje project applies (no Spark/Verdict/
Quests/Brief vocabulary).

**klao-site** (build): "This site. A bilingual personal hub where every project,
career entry and line of copy is edited in Notion and goes live within the
hour, with no deploy." Stack `Next.js · Notion API · Vercel`. Live
`https://klao-site.vercel.app`, repo `https://github.com/Klaosj/klao-site`.
Outcome: "Live since Aug 2026 · Notion as the only CMS · EN/TH · 370+ automated
tests". Question: "Can a personal site update itself from Notion, in two
languages?"

Not added, deliberately: Salesforce/ActMedia work (employer work lives in
Clients + Career per Klao's rule), Ishtar / SME Studio / Little Duck (no real
outcome yet).

## 7. Assets (captured by the main session, not a subagent)

Target: 16:9, 1600×900 JPEG, quality ~80, ≤ 300 KB, saved to `public/images/`
AND uploaded to the matching Notion row's `Screenshot`.

| Project | Source | Plan |
|---|---|---|
| Aje | local dev server `Personal/Aje/web`, `/app` with the seeded example | capture |
| GoNai | https://gonai-three.vercel.app | re-capture at 2× (replace 800×450) |
| klao-site | local dev server after the hero ships, `/en` | capture |
| DailyBrief | Notion digest page | re-capture if a logged-in browser is reachable, else keep the Aug 9 file |
| TickerDesk | Notion options-brief page | capture if reachable, else keep the SVG and flag |
| AISecretary | the menu-bar app on this Mac | capture if screen capture is permitted, else keep the SVG and flag |
| Talatify, Tripedia | Klao's prototype / deck | none today → typographic cover; Klao uploads later |

Every new fixture path gets an `IMAGE_ALT` entry describing what the pixels show.

## 8. Copy (dictionary, en/th, all distinct)

`tourLabel` "Things I shipped, running" / "ของที่ผมสร้าง และยังรันอยู่" ·
`tourListLabel` "Project tour" / "ทัวร์โปรเจกต์" · `tourPrev` "Previous project" /
"โปรเจกต์ก่อนหน้า" · `tourNext` "Next project" / "โปรเจกต์ถัดไป" · `tourPause`
"Pause the tour" / "หยุดทัวร์ชั่วคราว" · `tourPlay` "Play the tour" / "เล่นทัวร์" ·
`tourStill` "Still view" / "มุมมองภาพนิ่ง".

## 9. Accessibility and motion

WAI-ARIA tabs pattern (tablist / tab / tabpanel, roving tabindex, arrow keys).
All controls ≥ 36 px, focus-visible ring from globals. Autoplay never runs under
`prefers-reduced-motion`; the global reduced-motion rule already zeroes all
animations, so the progress bar and fade simply don't happen. No `motion`
library is added — CSS keyframes and one `setTimeout`. Thai text never gets
italic or wide tracking (existing house rules).

## 10. Non-goals

No new Notion properties. No story pages, no `/writing` content, no sitemap
changes, no analytics. No deletion of the dark-era components. No fake UI for
projects without screenshots.

## 11. Acceptance

1. `npm run check` green; `npm run build` green (dev server stopped first).
2. Real browser, `/en` and `/th`, 1280×800: tour lists the 6 screenshot
   projects Aje→TickerDesk, first image eager, autoplay advances at 7 s, hover
   pauses, tab click jumps, prev/next wrap, pause toggle works; deck shows 8
   cards, Talatify/Tripedia with monogram covers.
3. 400×800: hero stacks copy → stage → list, nothing overflows horizontally.
4. Notion has the Aje + klao-site rows with screenshots; live site shows them
   within the hour after publish; fixture and Notion say the same thing.
5. README documents where screenshots live and how to change them.
