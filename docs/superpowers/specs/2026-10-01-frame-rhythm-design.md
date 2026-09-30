# Frame rhythm: one design file for motion, and two sections that move their own way

Status: approved by Klao 2026-10-01 ("ทำเลย A" on the Frame Design page, decisions 1A–4A).
Source pages:
- klao-site Frame Design (artifact VeNp1Y4ConzDaH5cDZT9qm)
- HyperFrames Use Cases (DaZHBfYsP5FuzGVGyaJkP3)

## 1. Why
Through HyperFrames' design lens (`hyperframes-creative`: one design spec per project, question lazy defaults, build → breathe → resolve), the site passes on:
- one accent;
- no gradients or glow;
- stillness in FAQ and Close;
- exits faster than entrances.

Two things read as defaults:
- **Uniform reveals.** Every section reveals with the same 16 px fade-rise, 600 ms, drift.
- **An equal grid.** The six By day chapters are an equal 2×3 grid that settles in DOM order.

Separately, the three product clips are staged three different ways, because nothing governs them.

## 2. What changes (Klao 1A, 2A, 3A; 4A applies to the future film only)
1. **`design/clips/frame.md`:** the design spec every clip, film and share card follows (tokens copied from the White Edition). This change is documentation only.
2. **The Career time rail draws itself once.** The rail line grows from the left, and the year labels and the marker brighten after it. It fires when the rail crosses the 85 % line. It is not scroll-linked.
3. **By day chapters settle in order of importance,** the deal chapter first: order 2, then 4, 1, 3, 5, 6. They settle rather than rise (opacity .55 → 1 and scale .97 → 1), triggered once for the whole list.
4. **(4A)** Film titles use `ui-serif` (New York). Recorded in frame.md; nothing on the site changes now.

## 3. Rules (binding)
- **Properties:** only `transform` and `opacity` animate.
- **Scroll-linking:** Signature stays the only scroll-linked scene. The new motion is one-shot at the 85 % line (`rootMargin: '0px 0px -15% 0px'`).
- **Reduced motion or no IntersectionObserver:** nothing moves; the final state shows at once.
- **No JS:** the server HTML is the final state.
- **Opacity floor:** text never starts below .55. The decorative rail line may start at `scaleX(0)`.
- **Already on screen:** if the rail is already past the 85 % line when the page mounts (a `#career` link or a reload), it stays drawn and nothing flashes.
- **Timing:** each sequence finishes within 1.5 s, and a stagger's total spread stays under 500 ms.
- **Dependencies:** none new. Component CSS goes in `@layer components`.
- **Page length:** unchanged (budget: desktop 8.7, phone 12).

## 4. Out of scope (later, separate specs)
- UI stings for Aje and GoNai (after the Cafénista pilot).
- The 40-second film and the hero Play pill.
- Share cards.
