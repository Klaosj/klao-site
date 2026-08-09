import CopyEmail from '@/components/CopyEmail';
import MaskedHeading from '@/components/motion/MaskedHeading';
import Reveal from '@/components/motion/Reveal';
import { dict } from '@/lib/dictionary';
import type { Locale, Profile } from '@/lib/models';
import { eyebrowFont } from '@/lib/typography';

// The pills echo facts already present in the headline and byline, so
// they are pure decoration -- `aria-hidden` on their container, never
// something a screen reader visits. They are not sourced from `profile`:
// unlike the headline/byline/greeting (which must reflect the real person),
// these three labels are a fixed part of the visual composition.
const PILLS: Record<Locale, readonly string[]> = {
  en: ['Business Development', 'Builds the systems too', 'Bangkok'],
  th: ['พัฒนาธุรกิจ', 'สร้างระบบเองด้วย', 'กรุงเทพฯ'],
};

export default function Hero({
  profile,
  locale,
}: {
  profile: Profile;
  locale: Locale;
}) {
  const t = dict[locale];
  const now = profile.now[locale];

  return (
    <section id="hero" className="relative z-[2] h-[180vh]">
      <div
        data-hero-stage
        className="sticky top-0 flex h-screen flex-col justify-center px-6 pt-28 pb-40 sm:px-12"
      >
        {/* Decoration only -- the same three facts appear in the copy below.
            Absolutely positioned (see #hero .pill in globals.css), so its
            place in the DOM doesn't affect layout -- it just needs to stay a
            descendant of the sticky stage, which remains its containing
            block. */}
        <div data-pills aria-hidden="true">
          {PILLS[locale].map((label, i) => (
            <span key={label} className={`pill pill-${i + 1}`} style={{ ['--pi' as string]: String(i) }}>
              {label}
            </span>
          ))}
        </div>

        <div className="mx-auto w-full max-w-[1150px]">
          {/* Identity row: portrait + greeting/status, left-anchored. */}
          <Reveal className="mb-9 flex items-center gap-5">
            <span className="relative inline-block h-[84px] w-[84px] shrink-0">
              <span className="halo pointer-events-none absolute -inset-2 rounded-full border border-dashed border-peri/50" />
              {profile.photoSrc ? (
                <img
                  src={profile.photoSrc}
                  alt={profile.name}
                  width={84}
                  height={84}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span
                  data-portrait-placeholder
                  className="grid h-full w-full place-items-center rounded-full bg-peri text-[8px] uppercase tracking-[0.16em] text-dark/55"
                >
                  {t.photoPlaceholder}
                </span>
              )}
            </span>

            <span className="flex flex-col items-start gap-2 text-left">
              <p className="text-xl font-semibold tracking-tight sm:text-2xl">
                {t.greeting} {profile.name.split(' ')[0]}
              </p>

              {/* Availability status pill (Change 2). Morva Labs' "Subtle Folio"
                  signals availability with a dot + short line; the same fact here
                  (profile.now) otherwise only exists in prose further down the
                  page. Flat bg-dark/70 fill, no backdrop-filter -- this sits over
                  the live WebGL canvas, same reasoning as the annotation pills'
                  own "no backdrop-filter" comment above. The dot is decoration
                  (aria-hidden); the text is the real, readable content, so a
                  screen reader gets exactly the sentence and nothing else. Renders
                  nothing when profile.now[locale] is empty, per spec. */}
              {now && (
                <p
                  data-status-pill
                  className="mb-4 inline-flex max-w-[300px] items-start gap-2 rounded-full border border-on-dark-faint bg-dark/70 px-4 py-1.5 text-left text-[11px] leading-[1.55] text-on-dark-soft sm:max-w-none sm:items-center"
                >
                  <span aria-hidden="true" className="mt-[6px] h-[6px] w-[6px] shrink-0 rounded-full bg-peri sm:mt-0" />
                  <span className={eyebrowFont(locale, '')}>{now}</span>
                </p>
              )}
            </span>
          </Reveal>

          <MaskedHeading
            text={profile.headline[locale]}
            level={1}
            className="max-w-[13ch] text-left text-[clamp(34px,6.4vw,84px)] font-bold leading-[1.08] tracking-[-0.03em]"
          />

          <Reveal as="p" className="mt-8 max-w-[52ch] text-left text-[14.5px] leading-[1.95] text-on-dark-soft">
            {profile.byline[locale]}
          </Reveal>

          {profile.email && (
            // Change 3: CopyEmail sits beside the mailto capsule so a visitor
            // can take the address without scrolling to the footer band. The
            // capsule stays the primary action (solid fill, first in source
            // order); CopyEmail is wrapped in text-on-dark-soft so its own
            // unstyled text reads muted/secondary next to the filled button,
            // without editing CopyEmail itself. flex-wrap + the row's gaps
            // keep the pair from colliding or overflowing at narrow widths --
            // once the row can't fit both, CopyEmail simply wraps to its own
            // line, left-anchored under the CTA like everything else in the
            // stage.
            <Reveal delayIndex={1} className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
              <a
                href={`mailto:${profile.email}`}
                className="btn inline-flex items-center gap-3 rounded-full bg-light px-8 py-4 text-[13.5px] font-semibold text-dark"
              >
                {t.startConversation} <span aria-hidden="true">→</span>
              </a>
              <span className="text-on-dark-soft">
                <CopyEmail email={profile.email} copiedLabel={t.copied} locale={locale} />
              </span>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
