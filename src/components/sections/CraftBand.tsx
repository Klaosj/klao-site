import MaskedHeading from '@/components/motion/MaskedHeading';
import Reveal from '@/components/motion/Reveal';
import { dict } from '@/lib/dictionary';
import type { Locale } from '@/lib/models';

// The eyebrow above the heading is the short section label from the
// dictionary (t.howIWork, "How I work"); the big heading below it is a
// different sentence -- the six-line stack's actual thesis statement. Kept
// as a local constant rather than a new dictionary key, for the same reason
// Hero.tsx (T7) keeps its PILLS labels local: this is fixed structural copy
// for the page's composition, not a personal fact `profile` could supply,
// so it has no business in dictionary.ts (T6, already reviewed and
// committed). Ported verbatim from
// .superpowers/brainstorm/11719-1786211516/content/studio.html -- the file
// Hero's own CSS comment names as "the spec's named working prototype" --
// which gives every band a distinct eyebrow/bigHead pair. Reusing
// `t.howIWork` for both (as an earlier draft of this task did) throws that
// distinction away and makes the two renders of the same string ambiguous
// to query in tests.
export const CRAFT_HEADING: Record<Locale, string> = {
  en: 'Six things I will not trade away.',
  th: 'หกข้อที่ผมไม่ยอมแลก',
};

export default function CraftBand({ locale }: { locale: Locale }) {
  const t = dict[locale];
  return (
    <section id="craft" className="relative z-[2] bg-deep px-6 py-[11vh]">
      <p className="mb-5 font-mono text-[9.5px] uppercase tracking-[0.24em] text-on-dark-soft">
        {t.howIWork}
      </p>
      <MaskedHeading
        text={CRAFT_HEADING[locale]}
        level={2}
        className="max-w-[17ch] text-[clamp(30px,5.1vw,64px)] font-bold leading-[1.1] tracking-[-0.028em]"
      />
      <ul className="mt-14 flex list-none flex-col gap-[2px]">
        {t.craft.map((line, i) => (
          <Reveal
            as="li"
            key={line}
            delayIndex={i}
            className={`text-[clamp(24px,4.2vw,52px)] font-bold leading-[1.14] tracking-[-0.03em] ${
              i === 0 ? 'text-on-dark' : 'text-on-dark-soft'
            }`}
          >
            {line}
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
