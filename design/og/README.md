# Share-card (OpenGraph) images

These are the images people see when a link to the site is pasted into LINE, Facebook, X, LinkedIn, Slack or
iMessage. Without them, a shared link is text only. Spec: `docs/superpowers/specs/2026-10-01-film-og-design.md` §5.

| File | What it is |
|---|---|
| `og-en.html` | source of `public/og/og-en.png`, used by every `/en/...` page |
| `og-th.html` | source of `public/og/og-th.png`, used by every `/th/...` page |
| `card.css` | the frame both cards share (faces, tokens, layout); each HTML sets only its headline face and size |
| `assets/<key>-end.png` | each sting's finished last frame (GoNai, Aje, Cafénista), scaled to the frame's box (304×173) |
| `render.mjs` | takes the stills, renders both cards, checks them, writes the PNGs |

`src/app/[locale]/layout.tsx` points `openGraph.images` and `twitter.images` at the PNGs. The path there is
**relative** (`/og/og-en.png?v=2`), so it resolves against `NEXT_PUBLIC_SITE_URL` automatically. The domain is still
drawn in the artwork, though: see "Changing the words" below. Other routes reuse the same two PNGs and only set
their own `alt`.

**Bump `OG_VERSION` in `src/lib/site.ts` whenever the PNGs change** (LINE, Facebook, X and LinkedIn cache the card by URL; the `?v=` query is what makes them refetch).

`concept-a-masthead.html`, `concept-b-builder.html` and `concept-c-statement.html` are the August 2026 concepts,
from before the White Edition look. They are kept only as a record; nothing references them.

## The look

The cards follow [`../clips/frame.md`](../clips/frame.md), the same frame as the stings and the 40-second film,
so a shared link looks like the site. Light only: share images have no dark mode.

- **Stage** `#F5F6F8`, no gradient, glow or texture.
- **The message:** the headline, in New York 600 (EN) or Anuphan 600 (TH), set like the film's title card (same
  line breaks), and the name under it. Beside the name, after the **one accent mark** (`#26314A`), the URL.
- **The second layer:** the three apps' stings, each shown by its finished last frame in a paper (`#FFFFFF`) frame
  with one hairline and `shadow.surface`, radius 14, and its status under it.

Every word is verbatim from spec §3.1, and nothing else is on the card (no tagline, no numbers):

| | EN | TH |
|---|---|---|
| Headline | Business developer who builds his own tools. | นัก Business Development ที่สร้างเครื่องมือใช้เอง |
| Name | Suwichak Jarunopratamp | Suwichak Jarunopratamp |
| URL | klao-site.vercel.app | klao-site.vercel.app |
| Apps | GoNai · Live / Aje · Working prototype / Cafénista · Prototype · simulated data | GoNai · เปิดใช้งานแล้ว / Aje · Prototype ใช้งานได้ / Cafénista · Prototype · ข้อมูลจำลอง |

"simulated data" / "ข้อมูลจำลอง" always stays on Cafénista's label.

## Regenerating

Needs macOS (New York ships with it) with Google Chrome installed, Node 22+, ffmpeg, and Playwright somewhere
`scripts/qa-lib.mjs` can find it (the same one `npm run qa` uses: run `npx playwright --version` once, or set
`PLAYWRIGHT_PATH`).

```bash
node design/og/render.mjs            # stills, then render + checks → public/og/og-{en,th}.png
node design/og/render.mjs render     # only render + checks (after editing the HTML or card.css)
node design/og/render.mjs stills     # only re-take the stills (after a sting is re-rendered)
OUT=/some/dir node design/og/render.mjs render   # write the PNGs somewhere else to compare first
```

- **stills** takes the last frame of each committed web clip, `public/clips/<key>.mp4` (the sting's 5 s hold), and
  Lanczos-scales it to cover 304×173, centre-cropped. Re-run it whenever a sting changes, then render.
- **render** opens each HTML file straight from disk in headless Google Chrome at 1200×630, device scale 1, waits
  for the fonts and images, checks the card and only then writes the PNG. Same input, same bytes (re-rendered
  twice on 2026-10-01: identical).

`render.mjs` refuses to write anything if any check fails:

1. **Faces.** Chrome's own report of the fonts that drew each headline line (DevTools `getPlatformFontsForNode`):
   EN must be only New York loaded from the file, at weight 600; TH must be Anuphan for every Thai glyph and SF for
   the Latin, with no Thai system fallback (Thonburi). The Thai in the TH labels must be Anuphan too.
2. **Stills** load and are drawn 1:1, so Chrome never resamples them.
3. **Copy.** Every line on the card is a run of spec §3.1 for that locale, and all seven strings above are there.
4. **Safe area.** Every text run and frame sits inside the middle 80% (x 120–1080, y 63–567), and no label runs
   past its frame.
5. **Size.** The PNG header says 1200×630 (`npm test` checks this again).

## Faces: never commit an Apple font

The repo is public, and New York is Apple's.

- **New York** is loaded by path, `url("file:///System/Library/Fonts/NewYork.ttf")` in `card.css`. Nothing is
  copied. `local("New York")` does not resolve in Chrome: every name tried (`New York`, `NewYork`, `.New York`,
  `NewYork-Regular`) fell back (checked 2026-10-01). Weight 600 comes from the font's own weight axis.
- **Anuphan** 500/600 is the film's committed OFL woff2, reused by relative path
  (`../clips/film/assets/fonts/`, licence `OFL.txt` there). Thai code points only, as on the site, so Latin inside a
  Thai line stays on the system font (SF).
- Everything else is `system-ui` (SF).

**Why not HyperFrames.** It can emit a single 1200×630 PNG (`hyperframes snapshot --at 0`), but it serves the folder
over http, where neither font path loads: New York by `file://` and Anuphan from outside the folder both fell back
to monospace (one-frame test, 2026-10-01). Using it would mean staging copies of both fonts into this folder for a
still image. Chrome reads both from disk as they are.

## Checking legibility

In a LINE or Slack preview the card is about 300 px wide. The headline must read at that size; the app labels do
not have to (they are the second layer).

```bash
ffmpeg -v error -y -i public/og/og-en.png -vf scale=300:-1:flags=lanczos /tmp/og-en-300.png   # then look at it
```

Platforms crop differently around 1.91:1, so anything important stays inside the middle 80% (render.mjs checks).

## Changing the words

- Copy comes from spec §3.1, not from Notion: the cards are build-time images. If the headline, a status or the
  domain changes on the site, update §3.1 first, then both HTML files (and `MUST` in `render.mjs`), then render.
- **Thai line breaks.** The TH headline is two explicit lines, broken at the space after "Development" exactly as
  the film's title card breaks it. Each line is `white-space: nowrap`, so it never breaks inside a word. If you
  change the string, break it only at a space.
- **App names and the URL stay Latin** in both files. They are proper nouns, not copy to translate.
- After any change, update the OG `alt` text in `src/app/[locale]/layout.tsx` if what the card shows changed.
