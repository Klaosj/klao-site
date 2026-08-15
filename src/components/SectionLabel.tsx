import type { Locale } from '@/lib/models';
import { eyebrowFont } from '@/lib/typography';

// The band-name label ("Career", "Selected projects", "Toolbox", …),
// promoted on 2026-08-15 (owner request: "make the section headings stand
// out") from the old 9.5px on-dark-soft whisper to a marked section break:
// a short peri rule, then 12px semibold peri text. One component instead of
// the class string every band used to repeat, so the next promotion is a
// one-file change.
//
// `as` exists because the label's role differs by band: WorkDeck's label IS
// the section's heading (h2 — WCAG 1.3.1, smoke test pins its text), while
// CvBand/SkillsBand pair a plain-<p> label with their own big <h2> right
// below (cv-band.test.tsx queries the eyebrow as the section's first <p>).
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
      className={`flex items-center gap-3 text-[12px] font-semibold uppercase text-peri ${eyebrowFont(locale, 'tracking-[0.24em]')} ${className}`.trim()}
    >
      {/* Decorative rule; empty span so the label's textContent stays
          exactly `text` (work-deck.test.tsx compares h2.textContent). */}
      <span aria-hidden="true" className="h-px w-7 shrink-0 bg-peri-deep" />
      {text}
    </Tag>
  );
}
