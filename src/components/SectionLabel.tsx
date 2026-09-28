import type { Locale } from '@/lib/models';
import { eyebrowFont } from '@/lib/typography';

// The band-name label ("Career", "Toolbox", …), promoted on 2026-08-15
// (owner request: "make the section headings stand out") from the old
// 9.5px on-dark-soft whisper to a marked section break: a short kram rule,
// then 12px semibold kram text. One component instead of the class string
// every band used to repeat, so the next promotion is a one-file change.
//
// `as` exists because the label's role differs by surface: /projects' group
// labels are that page's real h2s, while the home bands pair a plain-<p>
// label with their own big heading right below.
export default function SectionLabel({
  text,
  locale,
  as: Tag = 'p',
  className = '',
}: {
  text: string;
  locale: Locale;
  as?: 'p' | 'h2';
  className?: string;
}) {
  return (
    <Tag
      className={`flex items-center gap-3 ${
        // Thai runs +1px: eyebrowFont() rightly drops the caps-and-tracking
        // "this is a label" cue for TH (no mono face carries Thai, and wide
        // tracking detaches tone marks), and Thai marks sit ABOVE and BELOW
        // the x-height, so at the Latin 12px the `ื่`-style clusters smudge.
        // The extra pixel buys the marks back without touching the rule,
        // which carries the label semantics language-independently.
        locale === 'th' ? 'text-[13px]' : 'text-[12px]'
      } font-semibold uppercase text-kram ${eyebrowFont(locale, 'tracking-[0.24em]')} ${className}`.trim()}
    >
      {/* Decorative rule; empty span so the label's textContent stays
          exactly `text`, with no extra characters for a caller comparing
          it verbatim (e.g. against the dictionary heading it was given). */}
      <span aria-hidden="true" className="h-px w-7 shrink-0 bg-link" />
      {text}
    </Tag>
  );
}
