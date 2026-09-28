# White Edition — design reference

Reference material for the White Edition ("Daylight") home page, built in
September 2026. Nothing in this folder is built, served or imported by the
app — `src/` is the product.

| File | What it is | How to use it |
|---|---|---|
| `prototype/index.html` | The static prototype Klao approved on 25 Sep 2026: look, behaviour and first-draft copy. Images are in `prototype/img/`. | Open it straight in a browser (`open design/white-edition/prototype/index.html`). No server, no build. |
| `APPLE-SCALE.md` | Type, spacing, radius and button sizes measured on apple.com on 25 Sep 2026 (1440 and 390 wide), and which of them the site adopted or kept different on purpose. | Check computed styles against it when a size or spacing question comes up. |
| `polish-lab/index.html` | The Sep 2026 micro-interaction shortlist ("Daylight Polish Lab"): which motion and small-copy polish ideas were picked for the build, which are optional follow-ups, and which were ruled out — each tagged **Pick** / **Maybe** / **Skip** against the phase/file it touches. The one deferred item is a full-bleed real photo hero (needs an actual photo shoot). | Open it the same way as the prototype. It's a planning record of decisions already made, not a spec to re-implement from — the spec and the shipped code are what actually apply. |

## What wins when they disagree

- **Copy:** Notion (live), then `src/content/fixtures/*.json`. The prototype's
  copy was the first draft; once a line is edited in Notion, Notion wins —
  don't set the site back to the prototype.
- **Tokens:** `src/app/globals.css` and `src/lib/theme.ts` (they mirror each
  other). The prototype's `:root` block is where they started.
- **Behaviour:** the spec, `docs/superpowers/specs/2026-09-25-white-edition-design.md`.

## Checking the built site against it

`npm run qa` runs the 16 combinations the prototype was checked with — 1440
and 390 wide × EN/TH × light/dark × motion on/reduced — plus 4 narrower
checks (360 and 320 wide, EN/TH, light, motion on) against a running
server, plus probes and the standalone pages. See `scripts/qa-matrix.mjs`
and the "Browser QA" section of the main `README.md`.

## Keep in mind

- The prototype isn't part of the site; don't link to it or deploy it.
- This repository is public: no private working notes, client names or
  internal figures in this folder.
