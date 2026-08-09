# Hallmark Pass Implementation Plan (round 3)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Opus orchestrates/reviews/commits; Sonnet implements; all 4 tasks are file-disjoint and run in one parallel wave.

**Goal:** Apply the anti-AI-slop findings from Together AI's Hallmark skill (nutlope/hallmark) that Klao approved: de-center the hero (gate 6), strip re-drawn UI chrome and redo the two designed covers as typographic covers (gate 47), tint every neutral toward the periwinkle anchor (gates 7/22 + color.md), fix hero padding rhythm (gate 44a), and reduce eyebrows to the two that carry a function (anti-patterns: eyebrow-on-every-section).

**Branch:** `feat/wow-pass` (stacked).

## Global Constraints

Everything from the wow-pass plan binds verbatim (quoted apostrophe path · no `npm run build` · foreground long timeouts · dictionary parity · A2/A3/A5/A6/A7/A8/A10 · theme.ts↔globals.css mirror · browser QA is the visual gate). Plus:
- Base mood unchanged: dark #17171a/#101013 stay exactly as-is. Only the WHITES and GREYS gain a trace of periwinkle chroma.
- The particle wordmark keeps assembling center-viewport — only the DOM copy de-centers.
- No new fake UI anywhere (no window chrome, no mock bars, no traffic lights) — Hallmark gate 47.

## Wave (parallel ×4)

| Task | Files (exclusive) |
|---|---|
| 1 Tinted neutrals | `src/app/globals.css` (@theme values only), `src/lib/theme.ts`, `tests/theme.test.ts` |
| 2 Hero de-center + padding rhythm | `src/components/sections/Hero.tsx`, `tests/hero.test.tsx` |
| 3 Strip fake chrome + typographic covers | `src/components/sections/WorkGrid.tsx`, `public/images/aisecretary.svg`, `public/images/tickerdesk.svg`, `tests/work-grid.test.tsx` |
| 4 Eyebrow diet | `src/components/sections/AboutBand.tsx`, `src/components/sections/CraftBand.tsx`, `src/components/sections/ClientsBand.tsx`, `tests/bands.test.tsx`, `tests/clients-band.test.tsx` |

---

### Task 1: Tinted neutrals (Hallmark gates 7/22 — "tint the greys")

Zero-chroma greys and pure #fff read flat next to a periwinkle accent. Every neutral gains a trace of the anchor hue. Values are final — copy exactly:

- [ ] **Step 1:** In `src/app/globals.css` `@theme`, change ONLY these values (names unchanged):

```css
  --color-light: #fafafd;                          /* was #ffffff — peri-tinted paper */
  --color-on-dark: #f4f5fa;                        /* was #ffffff — peri-tinted ink */
  --color-on-dark-soft: rgba(228, 232, 246, 0.62); /* was rgba(255,255,255,0.60) */
  --color-on-dark-faint: rgba(202, 208, 234, 0.15);/* was rgba(255,255,255,0.13) */
  --color-on-light-soft: #61626e;                  /* was #63636b — cool tint */
  --color-on-light-faint: #e4e5ef;                 /* was #e6e6ea */
```

And the LEGACY mirrors in the same block (keep the comment intact):

```css
  --color-ink: #f4f5fa;                            /* was #ffffff */
  --color-soft: rgba(228, 232, 246, 0.62);
  --color-line: rgba(202, 208, 234, 0.15);
```

`--color-dark`, `--color-deep`, `--color-peri`, `--color-peri-deep`, `--color-on-light`, `--color-paper`, `--color-card` are UNCHANGED.

- [ ] **Step 2:** Mirror in `src/lib/theme.ts`: `HEX.light` → `'#fafafd'`. Add one comment line noting the tinted-neutral rationale (Hallmark gates 7/22). `PARTICLE_COLORS` unchanged.
- [ ] **Step 3:** `tests/theme.test.ts` — update any assertion on the old literal values.
- [ ] **Step 4:** Contrast sanity (report the numbers): on-dark-soft over #17171a must stay ≥ 4.5:1; on-light-soft over #fafafd must stay ≥ 4.5:1. (Both should — verify with a quick computation in your report.)
- [ ] **Step 5:** `npm run check` green → report.

---

### Task 2: Hero de-center (gate 6) + padding rhythm (gate 44a)

Everything in the hero currently stacks on one centered axis — the AI-default shape. Re-compose left-anchored; the particle wordmark still assembles center-stage after the copy fades (deliberate contrast). Keep the 180vh pin + sticky stage + `data-hero-stage` + all Reveal/MaskedHeading usage + the `halo` span + status-pill gating exactly as they are — this is a LAYOUT recomposition, not a rewrite.

- [ ] **Step 1:** Restructure the stage content in `src/components/sections/Hero.tsx` to:

```tsx
<section id="hero" className="relative z-[2] h-[180vh]">
  <div
    data-hero-stage
    className="sticky top-0 flex h-screen flex-col justify-center px-6 pt-28 pb-40 sm:px-12"
  >
    <div className="mx-auto w-full max-w-[1150px]">
      {/* Identity row: portrait + greeting/status, left-anchored */}
      <Reveal className="mb-9 flex items-center gap-5">
        <span className="relative inline-block h-[84px] w-[84px] shrink-0">
          <span className="halo pointer-events-none absolute -inset-2 rounded-full border border-dashed border-peri/50" />
          {/* existing photoSrc ? <img> : placeholder branch — unchanged (img keeps
              h-full w-full rounded-full object-cover; width/height attrs → 84) */}
        </span>
        <span className="flex flex-col items-start gap-2 text-left">
          <p className="text-xl font-semibold tracking-tight sm:text-2xl">
            {/* existing greeting line, unchanged content */}
          </p>
          {/* existing status pill block, unchanged classes (already text-left) */}
        </span>
      </Reveal>

      <MaskedHeading
        text={profile.headline[locale]}
        level={1}
        className="max-w-[13ch] text-left text-[clamp(34px,6.4vw,84px)] font-bold leading-[1.08] tracking-[-0.03em]"
      />

      <Reveal as="p" className="mt-8 max-w-[52ch] text-left text-[14.5px] leading-[1.95] text-on-dark-soft">
        {profile.byline[locale]}
      </Reveal>

      {/* CTA row — margin-aligned (off the old center axis): existing
          email-gated Reveal block, className drops justify-center →
          "mt-10 flex flex-wrap items-center gap-x-6 gap-y-3" */}
    </div>
  </div>
</section>
```

Concretely: `items-center` and `text-center` disappear from the stage; the portrait shrinks 118→84 and moves into the identity row; `pt-32 pb-24` becomes `pt-28 pb-40` (bottom ≥ 1.3× top — gate 44a); everything else (pills markup, load-bearing comments, aria attributes) survives.

- [ ] **Step 2:** The decoration pills (`data-pills`, absolute-positioned) are unchanged — they already sit off-axis.
- [ ] **Step 3:** Update `tests/hero.test.tsx`: the pin test (`h-[180vh]` + sticky stage) must still pass; fix any assertion about removed centering classes; keep all content/behavior tests green.
- [ ] **Step 4:** `npx vitest run tests/hero.test.tsx` then `npm run check` — green → report. Note in your report: fold-fit at 1280×800 is the orchestrator's browser check.

---

### Task 3: Strip re-drawn chrome (gate 47) + typographic covers

The three-dot browser bar is hand-drawn fake chrome, and the current AISecretary/TickerDesk SVGs draw fake UI. Real screenshots (GoNai, DailyBrief) stand on their own; the two designed covers become typographic.

- [ ] **Step 1:** In `src/components/sections/WorkGrid.tsx`, delete the browser-chrome bar — the `<div className="flex items-center gap-1.5 border-b border-on-dark-faint px-3 py-2.5">` with its three dot spans and its comment. The `.frame` wrapper keeps `overflow-hidden rounded-[12px] border border-on-dark-faint bg-deep` and the `<img>` is unchanged.
- [ ] **Step 2:** Replace `public/images/aisecretary.svg` ENTIRELY with:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450" role="img" aria-label="AISecretary">
  <rect width="800" height="450" fill="#101013"/>
  <rect x="48" y="92" width="44" height="3" fill="#a8aecb"/>
  <text x="48" y="222" font-family="-apple-system,'Helvetica Neue',Arial,sans-serif" font-size="64" font-weight="700" fill="#f4f5fa" letter-spacing="-2">AISecretary</text>
  <text x="48" y="264" font-family="-apple-system,'Helvetica Neue',Arial,sans-serif" font-size="17" fill="rgba(228,232,246,0.62)">Every AI quota, one menu bar.</text>
  <text x="48" y="368" font-family="ui-monospace,Menlo,monospace" font-size="12" fill="#7d86ad" letter-spacing="3">SWIFT · SWIFTUI · MACOS</text>
</svg>
```

- [ ] **Step 3:** Replace `public/images/tickerdesk.svg` ENTIRELY with (variation: label high, name anchored low — not a twin of the first):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450" role="img" aria-label="TickerDesk">
  <rect width="800" height="450" fill="#101013"/>
  <text x="48" y="110" font-family="ui-monospace,Menlo,monospace" font-size="12" fill="#7d86ad" letter-spacing="3">PYTHON · NOTION API · DAILY</text>
  <rect x="48" y="304" width="44" height="3" fill="#a8aecb"/>
  <text x="48" y="374" font-family="-apple-system,'Helvetica Neue',Arial,sans-serif" font-size="64" font-weight="700" fill="#f4f5fa" letter-spacing="-2">TickerDesk</text>
  <text x="470" y="374" font-family="-apple-system,'Helvetica Neue',Arial,sans-serif" font-size="17" fill="rgba(228,232,246,0.62)">Options briefs before the open.</text>
</svg>
```

- [ ] **Step 4:** `tests/work-grid.test.tsx` — remove/adjust any assertion about the chrome-bar dots; the cover-per-project and caption tests stay.
- [ ] **Step 5:** `npx vitest run tests/work-grid.test.tsx` then `npm run check` — green → report.

**Note:** when Klao supplies real screenshots for AISecretary/TickerDesk, they drop in at the same paths — that swap is content, not code.

---

### Task 4: Eyebrow diet (anti-patterns — eyebrow-on-every-section)

Keep eyebrows ONLY where they do a job: WorkGrid (the eyebrow IS the section's h2 — untouched, not in scope) and CvBand (label over a stat grid — untouched, not in scope). Remove the decorative ones:

- [ ] **Step 1:** `AboutBand.tsx` — delete the eyebrow `<p>` (`{t.about}` with eyebrowFont classes). The MaskedHeading h2 stands alone.
- [ ] **Step 2:** `CraftBand.tsx` — delete the eyebrow `<p>` (`{t.howIWork}`).
- [ ] **Step 3:** `ClientsBand.tsx` — READ the file first: if `clientsHeading` renders as its own h2, delete the eyebrow `<p>` (`{t.clients}`); if the eyebrow is itself the section's only heading, keep it (never leave a section without a heading — WCAG 1.3.1) and note that in your report.
- [ ] **Step 4:** Dictionary keys stay (append-only convention). Update `tests/bands.test.tsx` / `tests/clients-band.test.tsx` for any eyebrow-text assertions.
- [ ] **Step 5:** `npx vitest run tests/bands.test.tsx tests/clients-band.test.tsx` then `npm run check` — green → report.

---

### Orchestrator QA (after the wave)

- [ ] Browser: hero reads left-anchored with ≤2 centered elements; fold fits at 1280×800 incl. CTA; particle name still assembles center; covers are typographic (no fake UI anywhere); whites warm-tinted; eyebrows gone from About/Craft(/Clients); contrast spot-checks.
- [ ] Re-run combined R2+R3 checks: tilt cards feel, seams, FPS trace, Lighthouse a11y ≥95.
- [ ] Ledger + memory update.
