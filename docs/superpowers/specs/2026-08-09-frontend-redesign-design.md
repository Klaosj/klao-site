# klao-site frontend redesign — design spec

**Date:** 2026-08-09
**Status:** approved by owner ("เอา design ประมาณนี้ละ ทำ project ต่อได้เลย")
**Supersedes visually:** `2026-08-08-klao-site-design.md` (that build's data layer stays)
**Working prototype:** `.superpowers/brainstorm/11719-1786211516/content/studio.html`

---

## 1. What this is, and what it is not

The site shipped on `main` (commit `30a8b4f`) works: bilingual routing, Notion CMS,
ISR, OG cards, 18 routes, 80/82 tests. **None of that changes.** This spec replaces
only the presentation layer — the visual language, page structure, and motion.

The data layer, i18n routing, image proxy, sitemap, and metadata handling carry over
as-is. If a task in the plan touches `src/lib/notion*.ts`, `src/lib/content.ts`, or
`src/app/api/img/`, it is out of scope unless listed in §11.

---

## 2. Design direction (locked)

Derived from a Dribbble reference the owner chose (*Redesign My Personal Website* by
Habibi), after evaluating and rejecting an editorial alternative modelled on
skyclinics.al. Both prototypes exist; the editorial one is kept at
`content/personal-site.html` for reference only.

| Axis | Decision |
|---|---|
| Base | Charcoal `#17171a`, deep `#101013`, white band `#ffffff` |
| Accent | Periwinkle `#a8aecb` |
| Display face | Geometric grotesk, heavy. `Avenir Next` is a **stand-in** — see §10 |
| Rhythm | Alternating dark → light → dark → deep bands |
| Hero | Circular portrait, floating annotation pills, statement headline, drawn underline |
| Signature | Procedural WebGL particle field that resolves into the wordmark on scroll |

**Why this and not the editorial direction:** the owner picked it. The editorial build
scored better on restraint, but the owner found this motion more compelling, and
motion is the differentiator he is buying.

### Deliberately NOT copied from the reference

The reference is a Dribbble *shot*, not a shipped site. It contains lorem ipsum in two
of its four sections and two typos (`Work Experiance`, `Work i do`). Its strengths are
structural, not editorial. We take the structure and write our own copy.

---

## 3. Page structure

Single scrolling page, seven zones:

1. **Nav** — monogram badge, four centred links, social icons, TH/EN toggle.
   Fixed and transparent; inverts over the white band.
2. **Hero** — portrait, three annotation pills, greeting, role, statement headline
   with drawn underline, blurb, capsule CTA. Particle field behind.
3. **About** (white band) — big heading, then a two-column label/prose split.
4. **How I work** (deep band) — six stacked imperatives. Form borrowed from
   rauno.me's "Make it fast. / Make it beautiful."; the convictions are ours.
5. **Work** (dark band) — heading right-aligned against intro left, then a
   12-column grid of real product screenshots in browser chrome.
6. **CV** (deep band) — a 2×2 stat block beside a timeline of roles and builds.
7. **Contact + footer** — centred statement, capsule CTA, three channels with a
   copy-to-clipboard email.

---

## 4. Motion system

Every item below is implemented and verified in the prototype.

| Behaviour | Detail |
|---|---|
| Reveal on scroll | IntersectionObserver, `rootMargin: 0 0 -12% 0`, threshold `0.08` |
| Headline reveal | Split per word, 52ms stagger, mask on a **wrapper** (see §9) |
| Group stagger | 75ms per child across work grid, timeline, stats, channels |
| Pill entrance | Staggered 140ms, then independent drift loops (9s / 11s / 10s) |
| Pill pointer lag | Per-pill weight 11/18/25px, driven by CSS custom properties |
| Magnetic buttons | 0.22× horizontal, 0.32× vertical pull |
| Custom cursor | 12px, `mix-blend-mode: difference`, swells to 46px over interactives |
| Underline draw | SVG `stroke-dashoffset`, length measured at runtime |
| Portrait halo | Dashed ring, 24s rotation |

**Reduced motion:** `prefers-reduced-motion: reduce` disables every animation, forces
all reveals visible, and removes the custom cursor. Non-negotiable.

---

## 5. The particle field

Kept from the earlier exploration because it is the one thing the reference lacks,
and it is what the owner said he liked.

- 17 × 10 × 17 lattice = **2,890 points**, plus axis-aligned links
- Raw WebGL2, no Three.js. Two draw calls per frame (lines, then points)
- The wordmark target is **rasterised in-page** to an offscreen 2D canvas and
  sampled — **zero model files, zero texture files**
- Scroll drives `uMorph`; the camera roams while scattered and settles face-on as
  the form resolves, so the payoff is not read at an oblique angle
- Past the hero the canvas is invisible, `running` flips false, **the loop stops
  outright** and the GPU goes quiet. This is the main advantage over the Sky Clinics
  reference, which keeps WebGL alive for the whole page
- Thai wordmarks route to a Thai font stack with tracking removed — a didone raster
  of Thai produces empty boxes, and the particles will faithfully assemble into them

---

## 6. Content model

| Zone | Source |
|---|---|
| Projects / work grid | Notion `Projects` DB (existing) |
| Writing | Notion `Writing` DB (existing) |
| CV timeline, years | Notion `Career` DB — **currently placeholders in the prototype** |
| Hero copy, craft stack, about prose | Static, in-repo, bilingual |
| Screenshots | `public/` — real captures, not mockups |

Both languages must be first-class. No machine-translation layer.

---

## 7. Performance budget

Measured this session against the references, same method, same machine:

| | Emil Kowalski | Rauno Freiberg | Prototype |
|---|---|---|---|
| Transfer | 864 KB | 632 KB | **48 KB** |
| Requests | 22 | 34 | **1** |
| DOM nodes | 132 | 184 | 330 |
| Frame rate | — | — | **120 fps** (Apple M5, ANGLE/Metal) |

**Budget for the real build:** ≤ 250 KB transfer on first load excluding screenshots;
≥ 60 fps on the hero; zero 3D asset files.

**Known regression to avoid:** the prototype's DOM is ~2× the references because every
bilingual string exists twice in the markup. The real site does **not** have this
problem — `[locale]` routing renders one language server-side. Do not port the
dual-span pattern into the Next.js build.

---

## 8. Accessibility

- Annotation pills are `aria-hidden` — the same three facts appear in the copy
- Decorative layers (particle canvas, column guides, underline) are `aria-hidden`
- Reveal classes are attached **by JS**, never in markup, so a no-JS page shows
  everything rather than hiding behind `opacity: 0`
- Screenshots carry descriptive alt text stating what the screen shows
- Every image has explicit `width`/`height` — no layout shift
- Reduced-motion path defined in §4

---

## 9. Implementation notes — traps found while prototyping

These cost real time. Recorded so the build does not rediscover them.

1. **Language-hiding rules must be the last rules in the stylesheet.**
   `[data-lang="th"] .en{display:none}` is specificity (0,2,0). Any later rule of
   equal weight that sets `display` wins on source order and leaks both languages
   onto the page. This happened twice (`.rvMask > .rvInner`, `.manifesto .mk`).

2. **Never put `clip-path` on the element you observe.** Chrome folds an element's own
   clip into its intersection rect, so a fully-clipped heading reports 0% visible and
   IntersectionObserver never fires. Mask the wrapper instead.

3. **The loading gate must not depend on the render loop.** A reload restores the
   previous scroll position; if that lands past the hero the loop never starts, the
   first frame never arrives, and the gate sits there forever. Always arm an
   unconditional timeout.

4. **Absolutely-positioned children resolve against the nearest transformed ancestor.**
   The scroll handler puts a `transform` on the hero copy, which silently became the
   containing block for the pills. Percentages did not mean what they appeared to.

5. **Do not animate `margin` on elements with `backdrop-filter` over a live canvas.**
   Margin triggers layout; layout invalidates the backdrop. Use a custom property
   feeding `transform`.

6. **Measurement caution:** exactly-1000ms frame gaps mean Chrome is throttling an
   occluded window to 1 Hz, not that the page is slow. Verify the window is in a
   normal state before trusting a frame-rate reading. One "2 fps bug" this session
   was entirely this.

---

## 10. Open items — must be resolved during the build

| Item | Status |
|---|---|
| **Wordmark text** | Unresolved. `SUWICHAK` is a placeholder; owner rejected "Klao". The prototype accepts any string, Latin or Thai |
| **Portrait photograph** | Missing. Hero shows a labelled placeholder disc |
| **Display typeface** | `Avenir Next` is a macOS stand-in and cannot ship. Needs a licensed or OFL face self-hosted as woff2 |
| **Email address** | `hello@example.dev` is a stand-in |
| **Career data** | Timeline rows are visible `from Notion · Career` placeholders. Nothing was invented |
| **Dead links** | 7 of 19 links are `href="#"` |

**These do not block the build, they block "done".** Every task in the plan can be
implemented against the placeholders. But A7 and A8 in §13 cannot be satisfied until
the owner supplies the wordmark, portrait, typeface, email, and career data. Treat
each as a named input with an owner, not as work the implementer can invent — the one
time a Thai spelling of the owner's name was invented during prototyping, it was wrong
and had to be pulled.

**Frame-rate target device:** A4's ≥ 60 fps is measured on the owner's machine
(Apple M5, Chrome, ANGLE/Metal) at 1440×900. Mobile is a separate budget: the particle
count must drop on coarse pointers, and the target there is ≥ 30 fps.

---

## 11. Out of scope

- Notion schema changes
- Case-study detail pages (deferred; needs written content first)
- Deployment and domain — the owner runs those himself
- Analytics

---

## 12. The structural risk, stated plainly

Measured: the prototype runs **8.3 viewports for 187 words**, and 7 of its 19 links go
nowhere. The three reference sites are short because they are *doorways* — their value
is the writing behind them. Emil's whole site is ~3 viewports.

This design is a landing page with nothing behind it yet. That is a content gap, not a
design gap, and adding words will not fix it. Two honest resolutions:

- **Write three pieces**, and the home page becomes a doorway, or
- **Accept it as a landing page** and cut it to 3–4 viewports

This decision belongs to the owner and should be made before, not after, the build
fills the page with sections that link to nothing.

---

## 13. Acceptance criteria

- **A1** Every zone in §3 renders in both TH and EN with no language leaking
- **A2** No element hidden behind `opacity: 0` when JS is disabled
- **A3** `prefers-reduced-motion: reduce` removes all animation and the cursor
- **A4** Hero holds ≥ 60 fps; the render loop is provably stopped past the hero
- **A5** Zero `.glb`/`.gltf`/texture files in `public/`
- **A6** First load ≤ 250 KB excluding screenshots
- **A7** No `href="#"` in shipped markup
- **A8** No placeholder text (`example.dev`, `from Notion`) in shipped markup
- **A9** Existing test suite still green; no regression in the Notion layer
- **A10** Lighthouse accessibility ≥ 95 on the home route
