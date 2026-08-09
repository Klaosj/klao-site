import MaskedHeading from '@/components/motion/MaskedHeading';
import Reveal from '@/components/motion/Reveal';
import { dict } from '@/lib/dictionary';
import type { Locale, Profile } from '@/lib/models';

// Same rationale as CraftBand's CRAFT_HEADING (T8): fixed structural copy
// for this band's thesis statement and its sub-head, not a personal fact
// `profile` could supply, ported verbatim from
// .superpowers/brainstorm/11719-1786211516/content/studio.html rather than
// invented here.
export const ABOUT_HEADING: Record<Locale, string> = {
  en: 'I like building things that are simple, and that stay running.',
  th: 'ผมชอบสร้างของที่เรียบง่าย และยังทำงานอยู่ได้เอง',
};

export const ABOUT_SUBHEAD: Record<Locale, string> = {
  en: 'A short story about how I ended up on both sides of the table.',
  th: 'เรื่องสั้นๆ ว่าทำไมผมถึงมายืนอยู่ทั้งสองฝั่งของโต๊ะ',
};

export default function AboutBand({ profile, locale }: { profile: Profile; locale: Locale }) {
  const t = dict[locale];
  return (
    <section id="about" className="relative z-[2] bg-light px-6 py-[11vh] text-on-light">
      <p className="mb-5 font-mono text-[9.5px] uppercase tracking-[0.24em] text-on-light-soft">
        {t.about}
      </p>
      <MaskedHeading
        text={ABOUT_HEADING[locale]}
        level={2}
        className="max-w-[17ch] text-[clamp(30px,5.1vw,64px)] font-bold leading-[1.1] tracking-[-0.028em]"
      />
      <div className="mt-[70px] grid gap-[clamp(30px,6vw,96px)] md:grid-cols-2">
        <Reveal
          as="h3"
          className="max-w-[20ch] text-[clamp(20px,2.5vw,30px)] font-semibold leading-[1.28] tracking-[-0.018em]"
        >
          {ABOUT_SUBHEAD[locale]}
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
