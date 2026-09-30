# White Edition "Daylight" — design (2026-09-25)

Owner ask (Klao, 2026-09-24): "ผมแอบไม่ชอบธีมสีดำเท่าไร" → "อยากธีมขาว ตัดด้วยลูกเล่นของภาพ … hero tour … คิดเหมือน designer ของ apple แบบละเอียด".
Follow-up (2026-09-25): "ไปดูขนาดและสไตล์ของ apple หน้า page หน่อย" → measured scale applied.
Status: **Approved by Klao 2026-09-25.** Amended 26 Sep during planning (fonts §5.2, reveal values §5.5, phone eyebrow §5.2) — see the master plan's Reconciliation table. Plan: `docs/superpowers/plans/2026-09-25-white-edition.md`.

## 1. Goal

Replace the dark, band-rotating home page with a white, Apple-calm page that shows
three things in the first minute: he builds real apps (tour), the builds grew out of
earlier business ideas (signature), and his day job is business development done
with method (By day). Light is the default; dark still exists (system + toggle).

Success criteria (all measured on a Vercel preview before merge):

| # | Criterion | Measure |
|---|---|---|
| 1 | White canvas by default; dark via system or toggle, no flash on load | Manual + QA matrix, both themes |
| 2 | Type, spacing, radii and CTAs match the Apple-measured scale (§5) | Computed styles vs `design/white-edition/APPLE-SCALE.md` |
| 3 | Home page ≤ 8.7 screens desktop, ≤ 12 phone (8.6 until 30 Sep, see §10) | QA matrix `len` (prototype today: 9.66 / 12.52) |
| 4 | QA matrix green: 1440 + 390 × EN/TH × light/dark × motion/reduced | 16/16, 0 console errors, 0 horizontal overflow, 0 Thai mid-word breaks, phone text ≥ 14 px, targets ≥ 24 px |
| 5 | AISecretary and DailyBrief appear nowhere | `grep -ri` on `src/`, `public/`, `tests/` = 0 |
| 6 | Every piece of copy stays editable in Notion (two-layer rule: Notion + fixtures) | Content audit table in the plan |
| 7 | Unit tests green after the rewrite | `npm test` |

## 2. References

- **Prototype (source of truth for look and behaviour):** `design/white-edition/prototype/index.html`
  (static HTML, open locally). Published copy: Klao's private artifact "Klao Lineup", Version 6.
- **Apple-measured scale:** `design/white-edition/APPLE-SCALE.md` (apple.com `/`, `/th/`, `/iphone-duo/`,
  `/macbook-air/`, measured 25 Sep 2026 at 1440 and 390).
- Ten design-part specs and the lead's synthesis were written in a working session and are
  summarised here; they are not committed (they quote private working notes).

## 3. Decisions (all by Klao)

| Date | Decision |
|---|---|
| 24 Sep | White canvas; Kram `#26314A` is the only accent; project colours appear only as section washes |
| 24 Sep | Capsule glass nav, always visible; phone thumb bar (Start a conversation · Résumé) |
| 24 Sep | Hero tour plays once (Aje → GoNai → klao-site) with a glass pill as subtitles |
| 24 Sep | Signature = "five apps → one" (Tripedia 2022 → GoNai 2026), the page's only scroll-driven scene |
| 24 Sep | Compact projects index; each project opens a sheet with its own link; no compare view |
| 24 Sep | Career = grey band with a time rail and a sliding detent over employer pills |
| 24 Sep | By day = six chapters of business-development method, first person, no names, no counts |
| 24 Sep | FAQ with its own title ("What people usually ask."); Ask Klao only as a ⌘K fallback labelled Preview; poll removed |
| 24 Sep | Headlines fade-rise once; no count-ups; big numbers only 30 / 500 and the Career panel figures |
| 24 Sep | THB 1.1M is labelled **his personal monthly target** (not the store's) |
| 24 Sep | English described as "conversational"; no Apple headings or copy |
| 24 Sep | **AISecretary and DailyBrief are removed from the site** |
| 24 Sep | Résumé phone number stays public |
| 25 Sep | Page length is trimmed in this spec (§10) |
| 25 Sep | FAQ "What work is he open to?" stays hidden until Klao writes the answer |
| 25 Sep | Spelling: **Actmedia** |
| 25 Sep | Résumé PDF is rebuilt from the current docx at ship time (it still calls 1.1M the store's target) |
| 25 Sep | Apple-measured calibration adopted (tracking per size, 17/25 body, r28 tiles without shadow, 44 px CTAs at weight 400, 128–160 px rhythm) |
| 25 Sep | Thai stays one size step smaller than English everywhere (Apple's same-size rule orphans "ใช้เอง" on phone with Anuphan) |

## 4. Page structure

| # | id | Section | Surface | Motion | Replaces today | Data |
|---|---|---|---|---|---|---|
| 0 | — | Capsule glass nav (brand · Projects · Career · How I work · FAQ · ⌘K · EN/ไทย · Contact) | glass | active pill slides | `SiteNav` | UI strings |
| 1 | `top` + `tour` | Hero: portrait chip, headline, byline, CTAs; tour stage below | white + project wash | tour autoplays once (Aje 6.0 s · GoNai 5.5 s · klao-site 7.0 s; TH ×1.1) | `HeroMonument`, `Hero`, `TourBand` | Profile, Projects (tour flag) |
| 2 | `signature` | "The idea, then the app." 2022 → 2026 | white → GoNai wash | the only scroll scrub (100 vh) | — (new) | Projects (lineage) |
| 3 | `work` | "Business plays, and the things I shipped." Two columns: Business · Build | white | reveal | `WorkDeck` | Projects |
| 4 | `career` | "Where I have been, and what came of it." Rail + pills + panel; toolbox | mist band | tap / detent | `CvBand`, `SkillsBand` | Career, Skills, Profile |
| 5 | `story` | By day: prologue with portrait, six chapters with sketches, closing line | white | reveal | `AboutBand`, `CraftBand` | Story (new DB) |
| 6 | `faq` | "What people usually ask." | white | — | `QuestionsBand` (partly) | FAQ (new DB) |
| 7 | `contact` + footer | "Have something that should exist?" CTA, email, open question, footer with theme + language | white | — | `ContactBand`, `SiteFooter` | Profile, Questions |
| — | `#work/<slug>` | Project sheet (dialog) | card | slide up (settle) | — | Projects |
| — | ⌘K | Command palette + Ask Klao preview card | glass | — | — | index of all of the above |

`ClientsBand` stays in the code but is not rendered (it self-hides when `profile.clients` is empty, which it is).
The standalone `/career`, `/projects`, `/writing` and `/work/[slug]` pages keep working and pick up the new tokens; they get no layout redesign in this change.

## 5. Design system

### 5.1 Colour tokens (light / dark)

| Token | Light | Dark | Use |
|---|---|---|---|
| canvas | `#FFFFFF` | `#0A0B0D` | page |
| mist | `#F5F6F8` | `#141518` | Career band, project cards |
| card | `#FFFFFF` | `#1C1E21` | panels, sheets |
| ink-1 | `#1A1C20` | `#F2F3F5` | text |
| ink-2 | `#666970` | `#A6A9B0` | secondary text |
| ink-3 | `#83868C` | `#777A80` | large text only |
| kram | `#26314A` | `#E0E8F9` | the only accent (primary button, detent) |
| link / focus | `#506CAF` | `#91AAE1` | links, focus ring |
| washes | Aje `#F4F7FB` · GoNai `#F4F8F6` · site `#F5F6F8` | tinted darks | tour stage, signature end |
| line | `rgb(20 26 44 / .10)` | `rgb(255 255 255 / .10)` | hairlines |

GoNai green `#1C7A57` appears only inside GoNai's own frame, sheet and "Open app". Status marks are monochrome (shape + word).

### 5.2 Type (Apple-calibrated)

Latin uses the system stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`), which is SF Pro on Apple devices — no font files shipped for Latin. **Space Grotesk is removed.** Thai uses Anuphan, self-hosted as a Thai-only subset (`public/fonts/anuphan-thai.woff2`, SIL OFL 1.1) through a plain `@font-face` with the Thai `unicode-range`, weights **400**–700, preloaded. *Amended 26 Sep during planning:* `next/font` was dropped because its Google loader still ships a Latin face and Turbopack drops `next/font/local`'s `unicode-range`, so Latin would have rendered in Anuphan.

| Role | EN desktop | EN phone (≤ 734) | TH desktop | TH phone | Tracking (EN) |
|---|---|---|---|---|---|
| Hero h1 | clamp(40, 4.45vw, 64) / 1.0625 | 40/44 | clamp(34, 3.9vw, 56) / 1.3 | 36/47 | −.009em |
| Section h2 | 48/52 | 32/36 | 44/57 | 28/38 | −.003em (phone +.004em) |
| Stat numeral | 48/48 | 48/48 (Career panel 40/44) | same | same | −.003em, tabular |
| Chapter / panel title | 28/32 · 32/36 | 22/28 · 28/32 | 26/36 | 22/32 | +.007em · +.004em |
| FAQ question | 28/32 | 21/25 | 26/36 | 19/28 | +.007em (phone +.011em) |
| Eyebrow · lead | 21/25 · 21/29 | 17/21 · 19/27 | 21/28 · 21/32 | 23 · 29 | +.011em |
| Body | 17/25 | 17/25 | 17 / 1.65 | 17 / 1.65 | −.022em |
| Caption · legal | 14/20 · 12/18 | 14/20 · 14 | 14/22 · 13 | 14 | −.016em |

Thai: letter-spacing 0 everywhere; no italics; display runs are inline-block keep-spans built from a keep-list (the prototype's `KEEP` array: เครื่องมือ, นอกเวลางาน, สุดสัปดาห์, …), and in headings each space-delimited Thai phrase is kept whole as in the prototype (*amended 26 Sep: no `Intl.Segmenter`, master R25*); a `|` in Notion copy marks the one allowed break. Thai dates and number+unit pairs are no-break (`DATERE`, `UNITRE` in the prototype).

### 5.3 Space, shape, elevation

- Containers: text column 980 px; wide 1040–1050 px (tour stage, FAQ); side gutter 20 px on phone (16 px under 360 px).
- Section rhythm: desktop 144 px top on `work`, `story`, `faq`; Career band 128 px top and bottom with 144 px above it; close 160 / 144. Phone 96–112 px.
- Breakpoints: 734 px (phone), 1068 px (tablet), same as apple.com.
- Radii: tiles, panels, sheets, stage 28 px (phone 18–24 for stage/panel); screenshot windows 12–14 px; pills 999 px.
- Elevation: tiles and panels have **no shadow** (Apple). Screenshot windows keep a hairline + soft shadow (`e2`) so white UI shots don't vanish on white; dark mode swaps shadows for inset rims.
- CTAs: pill, 44 px tall, 17 px, weight 400, padding 0 22 px; primary fill kram, secondary outline; phone thumb bar 56 px with 44 px buttons.

### 5.4 Glass

| Layer | Light | Dark |
|---|---|---|
| Nav (1024 × 52, r18) | white / .78, blur 20, saturate 180 % | rgb(28 30 33) / .78, saturate 140 % |
| Tour pill (56, r28) | white / .80, blur 16, saturate 160 % | / .82 |
| Controls | rgb(236 237 241) / .72, blur 12 | rgb(58 60 66) / .60 |

Rim 1 px `rgb(20 26 44 / .07)` + top highlight. Glass turns solid under `prefers-reduced-transparency: reduce` and `prefers-contrast: more` (Safari ignores the first; the solid fallback also applies when `backdrop-filter` is unsupported).

### 5.5 Motion

| Token | cubic-bezier | Use |
|---|---|---|
| drift | .28,.11,.32,1 | reveals, entrances |
| glide | .4,0,.6,1 | crossfades, signature, headline fade-rise |
| settle | .32,.72,0,1 | sheets, detent, pills |
| exit | .4,0,1,1 | leaving |
| tick | .34,1.56,.64,1 | copy-to-clipboard confirmation only |

Headlines fade and rise once when they reach 85 % of the viewport, with the prototype's values (16 px rise, 24 px for big headlines; 600 ms rise, 800 ms fade; drift easing). *Amended 26 Sep:* the earlier "30 px, 0.9 s glide" line was superseded by the reviewed prototype. Only `transform` and `opacity` animate. One scroll-linked loop on the page (signature). Reduced motion: tour shows ‹ › buttons and does not autoplay; signature becomes a static stack with every caption; reveals are off; content is never hidden.

2026-10-01 (Klao 2A, spec 2026-10-01-frame-rhythm): the Career rail draws itself once at the 85 % line (line scaleX from the left 900 ms, years and marker brighten from .55). One-shot, not scroll-linked.

## 6. Components

**Nav (`SiteNav` rewrite).** Floating capsule, always visible, glass. Links with a sliding active pill driven by an IntersectionObserver on sections. Right side: ⌘K button, EN/ไทย segmented link (keeps `/en` ↔ `/th` routes and hreflang), Contact pill. Phone: brand + EN/ไทย + Menu; Menu opens a panel (search, section links, Start a conversation, Copy email, Résumé, Language, Appearance Auto/Light/Dark, LinkedIn, GitHub). The old `nav-on-light` scroll logic is deleted.

**Hero + tour (`Hero`, `ProjectTour` reworked).** Keeps the tour's proven parts (ResizeObserver marker, pause on hover/focus/hidden tab/out of view, reduced-motion sync) and changes the behaviour: plays once, ends on the klao-site frame, camera 1.00 → 1.03 linear, top-layer crossfade only (no 50/50). Pause is first in tab order. Membership: projects with the new `Tour` checkbox, ordered by `TourOrder`. Stage aspect 20:9 desktop, 6:5 phone; the pill sits below the image on phone.

**Signature (new).** Pinned 100 vh scene: the 2022 Tripedia pitch card ("Why does planning one trip take five apps?", 30 / 500) with five app tiles; the tiles collapse into one and GoNai opens from the pile, ending on "GoNai · Live" with Open app. CSS scroll-driven (`animation-timeline: view()`) inside `@supports`; IntersectionObserver + rAF progress fallback for Firefox; static stack under reduced motion.

**Projects index + sheets (`WorkDeck` replaced).** Two lists (Business: Talatify, Tripedia · Build: Aje, GoNai, klao-site) with thumbnail or line drawing, status mark, and the project's question. Row → sheet (`<dialog>`), URL `#work/<slug>` via `history.pushState` (back button closes; opening the URL directly opens the sheet). The home route stays static/ISR. Sheet: media, question, what it is, status, outcomes, stack, links, lineage card ("Same idea, four years apart"), and a link to `/[locale]/work/[slug]` when a long-form story exists. Line drawings for Talatify (TAM/SAM/SOM rings, "Method, not to scale.") and Tripedia (five squares → one) are inline SVG.

**Career (`CvBand` + `SkillsBand` merged).** Mist band. Time rail 2021 → Now with a marker; employer pills (wrap on phone) with a sliding detent; panel with role, dates, duration, optional figure (e.g. THB 1.1M "Target met" + label), wins list; toolbox below in three columns (stack · methods · languages). Résumé link in the head.

**By day (new, replaces `AboutBand` and `CraftBand`).** Prologue (portrait, "I like building things that are simple, and that stay running.", owner-side story), then six chapters, each: number, rule label with icon, sketch (inline SVG), title, body with one bold clause; closing line "Business developer who builds his own tools." Chapter 6 carries the five-phase strip (Commercial terms → Screen preparation → Installation → Sales readiness → Post-launch audit) and the three health states as words. **Desktop layout: two columns (§10).**

**FAQ.** `<details>` list, "Expand all", each answer with deep links (e.g. `career:abundance` opens that pill). Footer line "Didn't find it? Search or ask Klao (⌘K)".

**Close + footer.** "Have something that should exist?", Start a conversation (mailto) + Résumé, email with copy button, Based in / Working in, one open question from the Questions DB (latest `wondering` or `building`) with "Tell me by email". Footer: section links, Appearance (Auto/Light/Dark), Language, legal line "Built at night, powered by good coffee." / "สร้างตอนกลางคืน ด้วยกาแฟดีๆ".

**⌘K palette + Ask Klao preview (new, lazy-loaded).** Opens with ⌘K / Ctrl-K / nav button. Index: sections, projects, career entries, FAQ questions, actions (copy email, theme, language). No match → "Ask Klao: '…'" row → answer card labelled **Preview**, built only from page content (FAQ + a small canned set), with sources and a decline state that points to email. **No model call, no data sent anywhere.**

**Theme.** Inline pre-paint script in `<head>` reads `localStorage['klao-theme']` (try/catch) and sets `data-theme` on `<html>`; Auto = no attribute, CSS follows `prefers-color-scheme`. Toggles live in the footer, the phone menu and ⌘K (not in the nav).

**Removed:** `HeroMonument`, `PointerFx` (custom cursor + magnetic buttons), `TiltCard`, `SpotlightList`, `MaskedHeading` (if unused after the rewrite), the dark band rotation rule and its comments, the legacy token remap (7 files, 22 usages), dead `PARTICLE_COLORS` / `rgbFloat` exports.

## 7. Content model (Notion + fixtures, two-layer)

| DB | Change | Fields |
|---|---|---|
| Projects | add | `StatusKey` (select: live / proto / pitched / finalist), `StatusEN/TH` (e.g. "Live · since Aug 2026"), `KickerEN/TH`, `Media` (select: img / win / notion / rings / five), `Wash` (select: aje / gonai / site / none), `Tour` (checkbox), `TourOrder` (number), `LineageOf` (relation → Projects), `AltEN/TH` |
| Projects | keep | Name, DescriptionEN/TH, QuestionEN/TH, OutcomeEN/TH (one per line), Stack, LiveURL, RepoURL, Screenshot, Type, Order, Slug, Published |
| Career | add | `StartDate`, `EndDate` (empty = now), `FigureValue` (e.g. "THB 1.1M"), `FigureLabelEN/TH` (e.g. "My personal monthly sales target"), `FigureNoteEN/TH` ("Target met") |
| Story (**new**) | create | `TitleEN/TH`, `BodyEN/TH` (`**bold**` for the one clause), `RuleEN/TH`, `Icon` (select), `Sketch` (select), `Order`, `Published` |
| FAQ (**new**) | create | `QuestionEN/TH`, `AnswerEN/TH`, `Links` (lines of `Label|target`), `Order`, `Published` |
| Profile | keep/add | Headline, Byline, Photo, Email, LinkedIn, GitHub, ResumeURL; add `PrologueEN/TH`, `ClosingLineEN/TH`, `BasedInEN/TH`, `WorkingInEN/TH` (master R29; a bare `WorkingIn` is still read as EN) |
| Questions | keep | the close section shows the newest `wondering`/`building` question |
| Skills | keep | toolbox columns map from `Category` |

Fixtures (`src/content/fixtures/*.json`) get the same fields and the prototype's copy. New DB IDs go in env (`NOTION_DB_STORY`, `NOTION_DB_FAQ`) and `docs/NOTION_SETUP.md`. **Klao adds the Notion properties/DBs himself, or approves Claude doing it** (it changes the live CMS).

Copy marked [DRAFT] in the prototype (By day titles and bodies, Career figure labels, FAQ answers, Ask answers, statuses, alt text, footer legal line) goes into Notion as-is and is Klao's to edit there.

## 8. Removals: AISecretary and DailyBrief

- Code: `src/app/[locale]/layout.tsx` OG description (both locales), `src/lib/image-alt.ts` entries and maps.
- Fixtures: `fx-aisecretary`, `fx-dailybrief` in `projects.json`.
- Images: `public/images/aisecretary.jpg`, `public/images/dailybrief.jpg`.
- Tests: `content`, `project-tour-helpers`, `project-tour`, `work-deck` assertions.
- Notion: uncheck `Published` on both rows **at ship time** (confirm with Klao first).

## 9. Engineering notes

- **Prerequisite commit:** `next` 15.5.23 → 15.5.26. It clears GHSA-2xp9-vwfh-vxw4 (AVIF in the image optimizer) and GHSA-p293-qw3h-jr36 (Windows hosts), both published 8 Sep 2026. klao-site is not exposed (no `next/image`, Vercel Linux), so this is hygiene, not an incident. The repo is on **Next 15.5**, not 16: use `document.startViewTransition` directly if needed, not React `<ViewTransition>`.
- Server components render content; client islands: nav, tour, signature, career detent, sheet, ⌘K (dynamic import), theme toggle.
- Images: keep the `/api/img` proxy and `<img>`; every image gets width/height or aspect-ratio (no CLS), ≤ 250 KB, the first tour frame is preloaded (LCP).
- ISR stays at 1 h. A Notion schema change needs the mapper, the fixtures and `NOTION_SETUP.md` updated in the same commit.
- Performance budget: LCP ≤ 2.5 s on the preview (mobile, Lighthouse), CLS ≤ 0.05, no long task > 200 ms from our code on load. Removing `PointerFx` frees the main thread on every pointer move.

## 10. Page length: 9.66 → ≤ 8.7 screens (desktop)

2026-09-30: raised to 8.7 for the sixth project row (Cafénista), Klao approved. The cuts below were planned against the original 8.6.

Measured on the prototype (desktop, motion on): top 0.99 · signature 2.00 · work 0.62 · career 1.42 · story 2.28 · faq 0.77 · contact 0.80 · footer 0.41.

| Cut | Saves | How |
|---|---|---|
| By day in two columns ≥ 1068 px | ≈ 0.7 | six chapters → three rows; sketches sit above titles |
| Career toolbox in one row of three columns | ≈ 0.15 | stack · methods · languages side by side |
| Close + footer tightened | ≈ 0.2 | open question moves into the close block; footer columns 4 → 3 |
| **Total** | **≈ 1.05 → ≈ 8.6** | spacing (Apple rhythm) is not cut |

Phone stays single-column (target ≤ 12 screens: By day chapter spacing 64 → 48 px).

## 11. Testing

- Rewrite: `hero`, `tour-band` → `hero-tour`, `project-tour`, `work-deck` → `projects-index`, `cv-band` + `skills-band` → `career`, `contact-band` → `close`, `site-nav`, `theme`, `content`, `bands` (section order), `questions-band` (close question).
- Delete with their components: `hero-monument`, `pointer-fx`, `tilt-card`, `spotlight-list`, `masked-heading` (if removed).
- New unit tests: theme pre-paint + toggle, sheet URL (`#work/<slug>` open/close/back), ⌘K index + Ask Preview decline, Thai keep-span builder (keep-list, `|` break, dates, units), Notion mappers for the new fields/DBs, fixtures ↔ mapper parity.
- QA matrix: port the prototype's Playwright check to `scripts/qa-matrix.mjs` (16 combinations; checks in §1 criterion 4 plus section lengths); run against `npm run dev` and the Vercel preview.
- Manual: Safari (macOS + iOS) and Firefox pass on the preview. The prototype was only tested in Chrome.

## 12. Delivery

Branch `feat/white-edition` from `main` after this spec is approved; `writing-plans` breaks it into tasks.

| Phase | Scope | Gate |
|---|---|---|
| P0 | Next patch · tokens light/dark · fonts (system + Anuphan Thai 400–700) · theme script · removals (§6, §8 code) | tests green, pages render in both themes |
| P1 | Nav + phone menu + thumb bar · hero + tour | screenshots 1440/390 |
| P2 | Signature · projects index · sheets + `#work/<slug>` | screenshots + sheet URL tests |
| P3 | Career band · By day (two-column desktop) | length check ≤ 8.6 |
| P4 | FAQ · close + footer · ⌘K + Ask Preview | QA matrix 16/16 locally |
| P5 | Notion: new fields + Story + FAQ DBs (Klao approves), fixtures, `NOTION_SETUP.md` | content audit table filled |
| P6 | Push branch → Vercel preview (Klao approves the push) · Safari/Firefox · Lighthouse | Klao reviews the preview |
| Ship | Klao merges (push main = deploy) · unpublish AISecretary/DailyBrief rows (confirm) · rebuild résumé PDF | live check |

## 13. Open items for Klao

1. Recaptures: Aje and GoNai at 2560 px wide without the scrollbar; GoNai at 390 px for phone; a white-edition klao-site shot after P1 (a Notion-row vignette stands in until then).
2. FAQ "What work is he open to?" — hidden until he writes the answer.
3. Draft copy review in Notion after P5 (By day, FAQ, figure labels, statuses, alt text).
4. Approvals at their gates: Notion schema change (P5), branch push for preview (P6), merge, Notion unpublish, résumé PDF.

## 14. Risks and the case against

- **Case against:** this rewrites a working, tested site whose main reader (a recruiter) skims for about a minute; the new content (By day, FAQ) might carry most of the value even on the old layout. It goes ahead because Klao dislikes the dark theme (24 Sep) and the content now depends on the new structure (tour → signature → index), but P0–P3 are ordered so each phase leaves a coherent page if work stops early.
- Test churn: ~20 of 41 test files change; the plan must keep `npm test` green at the end of every phase, not only at the end.
- Firefox has no CSS scroll-driven animations → the signature relies on the JS fallback there; Safari 26 has them but is untested.
- Glass costs GPU on low-end Android; the solid fallback covers `prefers-reduced-transparency`, not slow devices — keep glass to the nav, tour pill and ⌘K.
- A Notion schema change goes live within the hour through ISR; mappers must tolerate the new fields being empty so the live site never breaks mid-migration.
- The archived `archive/light-redesign-2026-09-05` branch is a single-theme swap that deleted most of `globals.css`; it is reference only, not a base.
