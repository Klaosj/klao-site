import type { Locale } from './models';

/** Tailwind's `font-mono` utility (`ui-monospace, ... monospace`) has no
 *  Thai glyphs, so every mono-styled eyebrow/label fell back to Thai per
 *  glyph -- and the wide tracking these labels use (0.18em-0.24em) then
 *  pulled each combining vowel/tone mark away from its base letter, since
 *  tracking inserts space between every character, marks included. `:lang
 *  (th)` in globals.css already points the Thai stack at `--font-thai`, but
 *  the `font-mono` utility (Tailwind's own `@layer utilities`, generated
 *  later than the base layer that rule lives in) wins regardless of
 *  selector specificity -- same cascade-layer mechanism as the heading
 *  line-height fix in globals.css. Rather than fight that layer ordering
 *  with `!important`, callers simply don't apply `font-mono`/tracking to
 *  Thai text in the first place: pass the caller's own Latin tracking
 *  utility (or '' when it uses none), and this returns the whole
 *  font-family + tracking class pair for the active locale. */
export function eyebrowFont(locale: Locale, latinTracking: string): string {
  return locale === 'th' ? 'font-thai tracking-normal' : `font-mono ${latinTracking}`.trim();
}
