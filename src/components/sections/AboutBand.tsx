import MaskedHeading from '@/components/motion/MaskedHeading';
import Reveal from '@/components/motion/Reveal';
import { dict } from '@/lib/dictionary';
import type { Locale, Profile } from '@/lib/models';
import { eyebrowFont } from '@/lib/typography';

export default function AboutBand({ profile, locale }: { profile: Profile; locale: Locale }) {
  const t = dict[locale];
  return (
    <section id="about" className="relative z-[2] bg-light px-6 py-[11vh] text-on-light">
      <p className={`mb-5 text-[9.5px] uppercase text-on-light-soft ${eyebrowFont(locale, 'tracking-[0.24em]')}`}>
        {t.about}
      </p>
      <MaskedHeading
        text={t.aboutHeading}
        level={2}
        className="max-w-[17ch] text-[clamp(30px,5.1vw,64px)] font-bold leading-[1.1] tracking-[-0.028em]"
      />
      <div className="mt-[70px] grid gap-[clamp(30px,6vw,96px)] md:grid-cols-2">
        <Reveal
          as="h3"
          className="max-w-[20ch] text-[clamp(20px,2.5vw,30px)] font-semibold leading-[1.28] tracking-[-0.018em]"
        >
          {t.aboutSubhead}
        </Reveal>
        {/* The width cap lives on this plain wrapper div rather than on
            <Reveal> itself: Reveal's Props type only accepts
            children/as/delayIndex/className, so a `data-prose` marker
            attribute has nowhere to go if placed directly on the <Reveal>.
            Story beats are dict.aboutStory -- fixed copy traceable to
            career.json/projects.json (see dictionary.ts), not profile.byline:
            the byline already appears verbatim in the hero, so repeating it
            here was another duplication. */}
        <div data-prose className="max-w-[68ch]">
          <ol className="flex list-none flex-col gap-7">
            {t.aboutStory.map((beat, i) => (
              <Reveal as="li" key={beat} delayIndex={i + 1} className="flex gap-5">
                <span aria-hidden="true" className={`mt-[2px] text-[11px] font-semibold text-peri-deep ${eyebrowFont(locale, 'tracking-[0.18em]')}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[14.5px] leading-[1.95] text-on-light-soft">{beat}</span>
              </Reveal>
            ))}
          </ol>
          {profile.now[locale] && (
            <Reveal as="div" delayIndex={4} className="mt-9 border-t border-on-light-faint pt-6 text-[14.5px] leading-[1.95] text-on-light-soft">
              <p>
                <span className="font-semibold text-on-light">{t.now}: </span>
                {profile.now[locale]}
              </p>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
