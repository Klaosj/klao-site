# Film, share cards and Cafénista sting fixes — design

- Date: 2026-10-01 · Branch `feat/film-og` from main `b54a7fc` (live)
- Approval: Klao, 1 Oct 2026, "ทำทั้งหมด" on the next-round options A (Cafénista fixes),
  B (40-second film + hero entry) and C (share cards). The direction for B and C is the
  HyperFrames design page Klao decided "A on every item" on the same day: storyboard 05 (film D),
  idea 02 (entry in the tour's control pill), idea 06 (share cards from frame.md), display serif
  New York for film titles (4A). Everything else below is a Claude ruling, listed in §7.
- Brand truth for every frame: `design/clips/frame.md`.

## 1. Goals

1. **A:** The Cafénista sting agrees with its still, and its square phone cut has no text under
   frame.md's minimum size.
2. **B:** A visitor can choose to watch a 40-second film of the work from the hero, in a sheet
   that closes back to where they were. It costs nothing until they choose it.
3. **C:** A link to the site pasted into LINE, LinkedIn, X or Slack shows a card in the same
   look as the site and the film.

Non-goals: per-project share cards (§5.4), narration or voice, autoplaying video, any change to
the stings of Aje or GoNai, any change to Notion.

## 2. A: Cafénista sting fixes

Source `design/clips/cafenista/` (HyperFrames 0.8.97, `tools/build.sh`). Parked in the
sheet-stings ledger with the ruling "need re-render".

1. **Times agree with the still.** The 16:9 opens on `public/images/cafenista.jpg`, whose UI
   reads 08:45 / 08:46. The rebuilt UI currently shows 08:43 / 08:44. Every time shown in either
   cut must agree with the still, and times must stay in order inside the story. Read `BRIEF.md`
   first because it explains where each time comes from.
2. **Minimum text size on the square cut.** frame.md requires 13 px Thai / 12 px Latin once
   scaled to display. The reference display is the square media box in the project sheet at a
   390 px viewport. Measure its rendered width on the current build; do not assume it. Every text
   run in the 1:1 composition must clear the minimum at that scale. That includes the
   machine-card caption, about 10 px today. The fix re-lays the composition, it does not crop.
   The 16:9 must clear the same minimum at the desktop sheet's media width at 1440.
3. **Keep every other contract:** 1580×900 and 1080×1080, 30 fps, 150 frames, frame 0 of the
   16:9 equal to the still (PSNR ≥ 40 dB against `public/images/cafenista.jpg`), ≤ 700 KB per
   file. The square poster `public/images/cafenista-1x1.jpg` stays exactly frame 0 of the 1:1.
   The `PROJECT_CLIPS.cafenista` labels and alt text must still describe what is on screen;
   update them if a time or word changed.

## 3. B: The film

### 3.1 Copy: verbatim from the live site, nothing else

Every word on screen is in this table, copied from klao-site.vercel.app on 1 Oct 2026 (hero, the
Signature scene and the project sheets). Only the app names and the URL are not translated.

| Beat | EN | TH |
|---|---|---|
| Title | Business developer who builds his own tools. | นัก Business Development ที่สร้างเครื่องมือใช้เอง |
| Title name | Suwichak Jarunopratamp | Suwichak Jarunopratamp |
| Signature kicker | 2022 → 2026 | 2022 → 2026 |
| Signature title | The idea, then the app. | ไอเดียมาก่อน แล้วค่อยเป็นแอป |
| 2022 side | 2022 · Tripedia · Co-founder / Why does planning one trip take five apps? / 30 / 500 · final teams · KATALYST Startup Launchpad | 2022 · Tripedia · Co-founder / ทำไมวางแผนทริปเดียวต้องใช้ตั้งห้าแอป? / 30 / 500 · ทีมสุดท้าย · KATALYST Startup Launchpad |
| 2026 side | GoNai · Live / One-day Bangkok trip planner with exact budgets, built as a weekend project. | GoNai · เปิดใช้งานแล้ว / แอปวางแผนเที่ยวกรุงเทพฯ 1 วัน พร้อมงบประมาณละเอียด สร้างเสร็จในสุดสัปดาห์เดียว |
| GoNai | GoNai · Live · since Aug 2026 / One day in Bangkok — what’s the real budget? | GoNai · เปิดใช้งานแล้ว · ตั้งแต่ ส.ค. 2026 / ไปเที่ยวหนึ่งวัน งบจริงๆ เท่าไหร่? |
| Aje | Aje · Working prototype / Is this idea worth a weekend, or a year? | Aje · Prototype ใช้งานได้ / ไอเดียนี้คุ้มกับหนึ่งสุดสัปดาห์ หรือทั้งปี? |
| Cafénista | Cafénista · Prototype · simulated data / Can one screen tell an owner who's away how the machine, the bar and the till are doing? | Cafénista · Prototype · ข้อมูลจำลอง / จอเดียวบอกเจ้าของที่ไม่อยู่ร้านได้ไหม ว่าเครื่อง บาร์ และยอดขายเป็นยังไง? |
| End | Suwichak Jarunopratamp / klao-site.vercel.app | Suwichak Jarunopratamp / klao-site.vercel.app |

A beat may use a subset of its cell. It may not reword, add a number, or drop a status label.
"simulated data" / "ข้อมูลจำลอง" must stay on screen for the whole Cafénista beat.

### 3.2 Structure (40.0 s, 30 fps, 1200 frames)

| Time | Beat | What happens |
|---|---|---|
| 0.0–3.1 | Title | Frame 0 is the finished title card and the poster: headline in display type, name below. It holds to 2.8 s, then leaves. |
| 3.1–10.0 | Signature | Rebuild the site's Signature scene (`SignatureScene.tsx`, `signature.css`, `sketches.tsx`). The 2022 side shows the five grey app tiles (map, calendar, wallet, transit, chat) with the Tripedia lines; the tiles converge into the one GoNai tile, and the 2026 side arrives and holds 1.2 s. Same icons, same order, same grey, GoNai's own green only on its own tile. |
| 10.0–18.7 | GoNai | Kicker and question arrive first and hold (≥ 2.7 s readable), then the GoNai sting plays once (5 s) inside a window frame, holds its finished last frame and leaves. On the 16:9 the question stays, small, in the band above the window. |
| 18.7–27.3 | Aje | Same pattern with the Aje sting. |
| 27.3–37.3 | Cafénista | Same pattern with the (fixed) Cafénista sting and a longer question moment (≥ 4 s readable). The status label stays visible. |
| 37.3–40.0 | End | Name and URL with the one `accent` mark; final hold from 38.0 s. |

Revised 2026-10-01 (task 2 fix round 1, controller ruling): app beats were 12 / 20 / 28 / 36 s; ~2 s was borrowed
from the title, the Signature's last hold and the end hold so the questions can be read on the phone cut.

- **Stings inside the film:** use each app's existing sting as is: the 16:9 sting in the 16:9
  film, the 1:1 sting in the 1:1 film. The source must be a high-quality render: either the
  sting composition nested as a HyperFrames sub-composition, or a near-lossless intermediate
  rendered from its master. The web-compressed files in `public/clips/` are never the source.
- **Motion** follows frame.md: arrive / move / leave eases, exits faster than entrances, one idea
  per beat, nothing loops. Scene changes are opacity and translate/scale only, with no
  whip-pans, shader transitions or masks. Camera scale ≤ 1.06.
- **Type:**
  - EN title and end card: display serif New York 600, referenced from the machine via
    `local()` or a build-time copy.
  - Thai: Anuphan 500/600, Google Fonts, OFL, committed with its licence.
  - Everything else: system-ui (SF).
  - Never commit an Apple font file, because the repo is public.
  - Minimum size: 13 px Thai / 12 px Latin at the display size of §4 (16:9 at the desktop
    sheet's media width at 1440; 1:1 at the phone sheet's media width at 390).

### 3.3 Formats and files

| Cut | Size | Used when |
|---|---|---|
| Film 16:9 | 1920×1080, 30 fps, 40.0 s | viewport wider than 734 px |
| Film 1:1 | 1080×1080, 30 fps, 40.0 s | `PHONE_QUERY` (≤ 734 px); re-composed, not cropped |

- EN and TH come from one composition per cut, with the locale as a HyperFrames variable.
- Outputs (committed):
  - videos: `public/film/film-{en,th}.{mp4,webm}` and `public/film/film-{en,th}-1x1.{mp4,webm}`;
  - posters, exactly frame 0: `public/images/film-{en,th}.jpg` and
    `public/images/film-{en,th}-1x1.jpg`.
- Budgets:
  - 16:9 ≤ 6 MB per file, 1:1 ≤ 5 MB per file, poster ≤ 150 KB;
  - mp4 H.264 + AAC with `+faststart`, webm VP9 + Opus.
- frame.md gains a `film-mobile` format line for the 1:1.

### 3.4 Audio

- **Changed 2026-10-01 (Klao):** the original ffmpeg pad did not fit; Klao wants music and left the pick to Claude.
  The film now uses 40 s of "Ambient Product Background_Ascent" by ummbrella (Pixabay Content License: free, no
  attribution, no standalone redistribution). The track and the cut are never committed (public repo); only the
  films are. Source, cut and rebuild steps: `design/clips/film/README.md` § Music, `tools/music.sh`.
- Mix: integrated loudness about −18 LUFS, true peak ≤ −1 dBTP; the cut is placed so the end card lands on a
  downbeat where the track's own fade begins; 0.6 s fade in, 0.5 s fade out ending at 40.0 s; no sound effects.

## 4. B: Entry and player on the site

### 4.1 Entry: a Film button in the tour pill

- **Element and placement:**
  - It is a `<a class="ht-film" data-film href="/film/film-{locale}.mp4">` inside `.ht-pill`.
  - Without JS it is a plain link to the 16:9 file.
  - Desktop: after `.ht-dots`, separated by a hairline.
  - Phone: in the dots row, with the dots still centred.
- **Label and name:**
  - Visible label: "Film · 0:40" / "ฟิล์ม · 0:40", with a small frame glyph.
  - It never uses the tour's play/pause glyph, so the two controls cannot be confused.
  - Accessible name: "Watch a 40-second film of the work" /
    "ดูฟิล์มสรุปผลงาน 40 วินาที".
- **Hard constraints:**
  - Pill height and page length are unchanged at 1440, 390, 360 and 320 (QA lengths within
    ±0.02 vh of the current run).
  - Touch target ≥ 44×44 via an invisible hit area.
  - No overlap with the dots' hit areas.
  - Visible in reduced motion and without JS.
  - Glass only on the existing pill, with no new glass surface.
- **Clicking it** stops the tour on its current frame, the same as a caption click, and opens
  the film sheet.

### 4.2 Player: `FilmSheet`

- **Shell and routing:**
  - One native `<dialog>` mounted on the home page next to `ProjectSheet`, reusing the sheet's
    shell styles (grabber, close button, radius, backdrop).
  - Hash `#film`, mirroring `#work/<key>`.
  - A click on `a[data-film]` is delegated: it prevents default, pushes `#film`, and opens.
  - Loading a URL with `#film` opens it.
  - Back and `hashchange` close it.
  - Close (button, Esc, backdrop) pauses, clears the hash with `replaceState`, and returns focus
    to the opener.
- **Content:**
  - `h2`: "A 40-second film" / "ฟิล์ม 40 วินาที".
  - The video.
  - A meta line: "40 s · music" / "40 วินาที · มีเพลง".
  - A `<details>` labelled "Text version" / "ฉบับข้อความ", listing the beats' on-screen text from
    §3.1 in order. This is the text alternative for the video.
- **Video:**
  - `<video controls playsinline preload="none" poster>` with webm then mp4 sources for the
    locale.
  - It is the 1:1 cut when `PHONE_QUERY` matches at open; a rotation while open does not swap
    it.
  - Its `aria-label` describes the film in one sentence.
- **Playback:**
  - Opened by a click: call `play()` (sound on, from the user gesture), unless
    `prefers-reduced-motion: reduce` or Save-Data. Then show poster and controls only.
  - Opened by a deep link or hash change: never call `play()`.
  - A rejected `play()` promise is caught silently, and the controls stay.
- **Pause guards:** it pauses when the tab is hidden or the sheet closes, and it never loops.
- **Weight:**
  - Nothing film-related downloads until the sheet opens, the poster included.
  - With the sheet closed, the page is byte-identical apart from the button and the empty
    dialog.
- **Code-side registry:** `src/lib/film.ts` holds the sources, posters, label, duration and the
  text-version beats per locale. Strings live in `dictionary.ts`, EN and TH.

## 5. C: Share cards

1. **Re-render both site-wide cards** `public/og/og-{en,th}.png` at 1200×630 in frame.md's look:
   - `stage` background, light only;
   - the EN headline in display serif New York 600 and the TH headline in Anuphan 600;
   - the name, and the URL klao-site.vercel.app;
   - a second layer of three app frames showing the stings' end stills (GoNai, Aje, Cafénista),
     each with its status from §3.1, Cafénista's "simulated data" included;
   - one `accent` mark at most.
2. **Legibility:** the headline must read at a 300 px-wide preview. Everything important sits
   inside the middle 80%, and no Thai line breaks inside a word.
3. **Source and render:**
   - Source stays in `design/og/` (HTML following frame.md), with the README rewritten.
   - Render with HyperFrames if it can emit a single PNG frame at 1200×630, otherwise with the
     README's headless-Chrome recipe.
   - Fonts as in §3.2.
4. **No per-project cards.** No live URL can carry one: project links are `#work/<key>`, whose
   hash crawlers drop, and no `/work/<slug>` page is published (sitemap, 1 Oct 2026).
5. **Alt text:** update `ogAlt` / layout alt text wherever it describes the card and the card's
   content changed. The PNG stays 1200×630 (existing test).

## 6. Testing and QA

- Unit (vitest):
  - `FilmSheet`: delegation, `#film` push and deep link, `play()` called only on a click and not
    under reduced motion or Save-Data, close pauses, clears the hash and restores focus, phone
    picks the 1:1, text version lists every beat.
  - The film button: href per locale, accessible name, present without JS.
  - `film.ts`: registry files exist on disk within budget.
  - Posters: dimensions.
  - frame.md: lists `film-mobile`.
  - The Cafénista clip contract keeps passing.
- `npm run check` and `npm run build` pass.
- `npm run qa` against a local production build:
  - matrix, probes and pages all ok;
  - lengths unchanged;
  - a new probe opens the film from the pill, asserts the dialog, the chosen source and the
    hash, then closes it and asserts focus on the button.
- Renders:
  - `hyperframes check` clean on every composition;
  - contact sheets of each cut and locale reviewed, with Thai glyph clipping checked;
  - durations and frame counts verified with ffprobe;
  - poster equals frame 0.

## 7. Rulings and risks

| Ruling | Why | If wrong |
|---|---|---|
| Original ffmpeg music bed | No licence exposure; HeyGen catalog needs Klao's account | The bed may sound plain; swap one file or drop audio |
| Film 1:1 for phones as well as 16:9 | 16:9 text at 390 px is far below frame.md's minimum | Two more renders to maintain |
| Entry in the tour pill (not a new pill below the tour) | Design page placed it in the tour's controls, and it adds no page length | If cramped on 320 px, move it to the hero CTA row |
| No per-project share cards | No URL can carry them today | Add when a `/work/<slug>` page ships |
| New York via `local()`/build-time copy, never committed | Repo is public; the font is Apple's | If `local()` fails in a renderer, the build-time copy path is the fallback |
| Cafénista fix touches only times and text size | Scope of the parked rulings | — |

The strongest case against B: a 40-second film on a portfolio is skipped by most visitors. It is
worth it only because it costs nothing until chosen, and it gives Klao one link to send that
shows three apps working in under a minute.
