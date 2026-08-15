import CopyEmail from '@/components/CopyEmail';
import MaskedHeading from '@/components/motion/MaskedHeading';
import Reveal from '@/components/motion/Reveal';
import { dict } from '@/lib/dictionary';
import type { Locale, Profile } from '@/lib/models';
import { eyebrowFont } from '@/lib/typography';

// Fixed facts about Klao, not sourced from Profile -- the model has no
// location or working-language fields. Same rationale as Hero's PILLS
// constant: this is composition, not translatable UI copy, so it stays a
// local constant rather than a dictionary entry. Both values are identical
// in English and Thai (a city name and a language-pair shorthand), which is
// why they aren't a Localized/Record<Locale, ...> map.
const LOCATION = 'Bangkok, TH';
const LANGUAGES = 'TH / EN';

// The sub-label tier's one size -- 10.5px Latin / 11.5px Thai. A local helper
// rather than three copies of the same ternary, because this band is the only
// place that repeats the idiom three times in a row. Thai runs +1px for the
// reason SectionLabel documents: the marks live outside the x-height.
const subLabelSize = (locale: Locale) => (locale === 'th' ? 'text-[11.5px]' : 'text-[10.5px]');

export default function ContactBand({ profile, locale }: { profile: Profile; locale: Locale }) {
  const t = dict[locale];

  return (
    <section id="contact" className="relative z-[2] bg-dark px-6 py-[11vh] text-center">
      <MaskedHeading
        text={t.contactHeading}
        level={2}
        className="mx-auto max-w-[18ch] text-[clamp(30px,5.1vw,64px)] font-bold leading-[1.1] tracking-[-0.028em]"
      />

      {/* Same mailto CTA pattern as Hero -- gated on profile.email so this
          never renders an empty `mailto:` link. */}
      {profile.email && (
        <Reveal delayIndex={1} className="mt-[38px] inline-block">
          <a
            href={`mailto:${profile.email}`}
            // `duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`: without them
            // Tailwind's default 150ms/`ease-in-out` applies, and this pill
            // was the one element on the page that SNAPPED while everything
            // hand-written around it (.rv, .btn, .u-draw, nav-chrome) eases
            // on the 250-950ms house curve.
            className="btn inline-flex items-center gap-3 rounded-full bg-light px-8 py-4 text-[13.5px] font-semibold text-dark transition-shadow duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_0_0_3px_rgba(168,174,203,0.35),0_18px_60px_-12px_rgba(168,174,203,0.45)]"
          >
            {t.startConversation} <span aria-hidden="true">→</span>
          </a>
        </Reveal>
      )}

      {/* No `opacity-N` utility on top of `text-on-dark-soft` below: that
          combination was a real new WCAG AA contrast failure (2.9:1, measured
          back when these labels were 9px,
          against a 4.5:1 requirement, `opacity-55` stacked on an already-
          60%-alpha colour token) caught by the whole-branch review's
          Lighthouse pass, which jsdom-based component tests have no way to
          measure. `text-on-dark-soft` alone is the same token every other
          eyebrow/label in this codebase uses at full opacity -- see
          AboutBand/CraftBand/WorkDeck/CvBand/SiteFooter's own `font-mono
          ... text-on-dark-soft` labels, none of which stack a further
          opacity on top. */}
      <div className="mt-14 flex flex-wrap justify-center gap-11 text-[13px] text-on-dark-soft">
        {profile.email && (
          <div>
            {/* Sub-label tier -- see SkillsBand's "Core tools" label for what
                that tier is and why Thai runs +1px. */}
            <b className={`mb-[7px] block ${subLabelSize(locale)} font-normal uppercase ${eyebrowFont(locale, 'tracking-[0.2em]')}`}>
              {t.email}
            </b>
            <CopyEmail email={profile.email} copiedLabel={t.copied} locale={locale} />
          </div>
        )}
        <div>
          <b className={`mb-[7px] block ${subLabelSize(locale)} font-normal uppercase ${eyebrowFont(locale, 'tracking-[0.2em]')}`}>
            {t.basedIn}
          </b>
          <span className="font-medium text-on-dark">{LOCATION}</span>
        </div>
        <div>
          <b className={`mb-[7px] block ${subLabelSize(locale)} font-normal uppercase ${eyebrowFont(locale, 'tracking-[0.2em]')}`}>
            {t.workingIn}
          </b>
          <span className="font-medium text-on-dark">{LANGUAGES}</span>
        </div>
      </div>
    </section>
  );
}
