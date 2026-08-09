import MaskedHeading from '@/components/motion/MaskedHeading';
import Reveal from '@/components/motion/Reveal';
import { dict } from '@/lib/dictionary';
import type { Locale } from '@/lib/models';

// Server component -- no 'use client'. Reveal/MaskedHeading are themselves
// client components but are composed here the same way CraftBand/CvBand do
// it: imported and rendered as plain children.
export default function ClientsBand({ clients, locale }: { clients: string[]; locale: Locale }) {
  const t = dict[locale];

  // A Notion profile with the `clients` property unset maps to `[]`. An
  // empty band still carrying its heading and eyebrow would look like a
  // broken section rather than an honestly-absent one, so this band simply
  // doesn't exist for that visitor -- same reasoning CvBand applies to its
  // own "not yet published" branch, one step further.
  if (clients.length === 0) {
    return null;
  }

  return (
    <section id="clients" className="relative z-[2] -mt-8 rounded-t-[32px] bg-light px-6 py-[11vh] pt-[13vh] text-on-light sm:rounded-t-[44px]">
      <MaskedHeading
        text={t.clientsHeading}
        level={2}
        className="max-w-[17ch] text-[clamp(30px,5.1vw,64px)] font-bold leading-[1.1] tracking-[-0.028em]"
      />
      {/* Names are proper nouns (Profile.clients) and render identically in
          both locales, so unlike the eyebrow above they never go through
          eyebrowFont/font-mono -- no monospace face carries Thai glyphs,
          and the surrounding UI is bilingual even though these strings
          themselves are not. A plain, confident list -- most recognisable
          name first, per profile.json's own ordering -- not a hierarchy, so
          every item shares one weight/color rather than singling one out
          the way CraftBand highlights its first imperative. */}
      <ul className="mt-14 flex list-none flex-col gap-[2px]">
        {clients.map((name, i) => (
          <Reveal
            as="li"
            key={name}
            delayIndex={i}
            className="text-[clamp(20px,3.4vw,40px)] font-bold leading-[1.2] tracking-[-0.02em] text-on-light"
          >
            {name}
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
