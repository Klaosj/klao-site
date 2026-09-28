import Reveal from '@/components/motion/Reveal';
import ThaiText from '@/components/ThaiText';
import { dict } from '@/lib/dictionary';
import type { Locale } from '@/lib/models';

// Server component -- no 'use client'. Reveal is itself a client component
// but is composed here the same way CareerBand does it: imported and
// rendered as a plain child.
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

  // Kept in the code, unrendered (spec §4): a plain band in C9 terms so it
  // is correct on arrival if it ever returns to the page.
  return (
    <section id="clients" className="band">
      <div className="wrap">
        <h2 className="t-h2">
          <ThaiText text={t.clientsHeading} display />
        </h2>
        {/* Names are proper nouns (Profile.clients) and render identically
            in both locales. A plain list, most recognisable name first. */}
        <ul className="mt-14 flex list-none flex-col gap-[2px]">
          {clients.map((name, i) => (
            <Reveal
              as="li"
              key={name}
              delayIndex={i}
              className="text-[clamp(20px,3.4vw,40px)] font-semibold leading-[1.2] text-ink-1"
            >
              {name}
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
