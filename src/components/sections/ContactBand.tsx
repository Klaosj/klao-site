import CopyEmail from '@/components/CopyEmail';
import MaskedHeading from '@/components/motion/MaskedHeading';
import Reveal from '@/components/motion/Reveal';
import { dict } from '@/lib/dictionary';
import type { Locale, Profile } from '@/lib/models';

// Fixed facts about Klao, not sourced from Profile -- the model has no
// location or working-language fields. Same rationale as Hero's PILLS
// constant: this is composition, not translatable UI copy, so it stays a
// local constant rather than a dictionary entry. Both values are identical
// in English and Thai (a city name and a language-pair shorthand), which is
// why they aren't a Localized/Record<Locale, ...> map.
const LOCATION = 'Bangkok, TH';
const LANGUAGES = 'TH / EN';

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
            className="inline-flex items-center gap-3 rounded-full bg-light px-8 py-4 text-[13.5px] font-semibold text-dark"
          >
            {t.startConversation} <span aria-hidden="true">→</span>
          </a>
        </Reveal>
      )}

      <div className="mt-14 flex flex-wrap justify-center gap-11 text-[13px] text-on-dark-soft">
        {profile.email && (
          <div>
            <b className="mb-[7px] block font-mono text-[9px] font-normal uppercase tracking-[0.2em] opacity-55">
              {t.email}
            </b>
            <CopyEmail email={profile.email} copiedLabel={t.copied} />
          </div>
        )}
        <div>
          <b className="mb-[7px] block font-mono text-[9px] font-normal uppercase tracking-[0.2em] opacity-55">
            {t.basedIn}
          </b>
          <span className="font-medium text-on-dark">{LOCATION}</span>
        </div>
        <div>
          <b className="mb-[7px] block font-mono text-[9px] font-normal uppercase tracking-[0.2em] opacity-55">
            {t.workingIn}
          </b>
          <span className="font-medium text-on-dark">{LANGUAGES}</span>
        </div>
      </div>
    </section>
  );
}
