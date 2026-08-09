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
        {/* Real profile data, not invented biography: the byline is the
            person's own summary, and `now` (Profile.now) is their current
            focus line -- both already localized on the Profile object, so
            no static bilingual filler paragraph is needed here. The width
            cap lives on this plain wrapper div rather than on <Reveal>
            itself: Reveal's Props type only accepts children/as/delayIndex/
            className, so a `data-prose` marker attribute has nowhere to go
            if placed directly on the <Reveal>. */}
        <div data-prose className="max-w-[68ch]">
          <Reveal as="div" delayIndex={1} className="text-[14.5px] leading-[1.95] text-on-light-soft">
            <p>{profile.byline[locale]}</p>
            {profile.now[locale] && (
              <p className="mt-[18px]">
                <span className="font-semibold text-on-light">{t.now}: </span>
                {profile.now[locale]}
              </p>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
