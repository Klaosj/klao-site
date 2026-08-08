# Share-card (OpenGraph) images

These are the images people see when a link to the site is pasted into
LINE, Facebook, X, LinkedIn, Slack, or iMessage. Without them, a shared
link is text only.

| File | Renders to | Used by |
|---|---|---|
| `og-en.html` | `public/og/og-en.png` | every `/en/...` page |
| `og-th.html` | `public/og/og-th.png` | every `/th/...` page |

`src/app/[locale]/layout.tsx` points `openGraph.images` and `twitter.images`
at the PNGs. The path there is **relative** (`/og/og-en.png`), so it resolves
against `NEXT_PUBLIC_SITE_URL` automatically — the domain is never hardcoded
in the markup. It *is* hardcoded in the artwork, though: see "Changing the
domain" below.

`concept-a-masthead.html` and `concept-c-statement.html` are the two designs
that were not chosen (a light editorial masthead, and a dark wordmark
statement). They are kept only as a record — nothing references them.

## Regenerating after an edit

Edit the HTML, then re-render. macOS, using the Chrome already installed —
no extra tooling:

```bash
cd design/og
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

"$CHROME" --headless --disable-gpu --no-sandbox --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1200,630 \
  --screenshot="$PWD/../../public/og/og-en.png" "file://$PWD/og-en.html"

# Chrome will not run two headless instances against the same profile at
# once, so let the first finish before starting the second.
sleep 2

"$CHROME" --headless --disable-gpu --no-sandbox --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1200,630 \
  --screenshot="$PWD/../../public/og/og-th.png" "file://$PWD/og-th.html"
```

Chrome prints crashpad/sandbox warnings to stderr on macOS. They are noise —
check the PNG was written rather than reading the log.

Then confirm nothing drifted:

```bash
npm run check   # asserts both PNGs exist at exactly 1200x630
```

## What to keep in mind when editing

- **1200×630 exactly.** The tests assert it by reading the PNG header. Every
  platform crops differently around that ratio, so keep anything important
  inside the middle ~80%.
- **Readable as a thumbnail.** In a LINE or Slack preview this is roughly
  300px wide. The headline survives that; the right-hand project list does
  not, which is fine — it is a second layer of detail, not the message.
- **Thai is not Georgia.** Georgia has no Thai glyphs, so `og-th.html` uses a
  Thai sans stack and a smaller headline size. `43px` is deliberate: it is
  the largest size at which `นัก Business Development` stays on one line, and
  breaking a job title across two lines looks like a mistake. If you change
  that string, re-check the wrap.
- **KLAO and the project names stay Latin** in both files. They are a
  wordmark and proper nouns, not copy to translate.
- **The project list is hand-written here**, not pulled from Notion. It is a
  build-time image, so it cannot follow Notion content. When the three
  projects you most want strangers to see change, edit both HTML files and
  re-render.

## Changing the domain

`klao.dev` appears as literal text in the bottom-left of both boards. If the
real domain differs, change it in `og-en.html` and `og-th.html` and
re-render — updating `NEXT_PUBLIC_SITE_URL` alone will not touch the
artwork, only where the file is served from.
