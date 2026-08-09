import CopyEmail from '@/components/CopyEmail';
import MaskedHeading from '@/components/motion/MaskedHeading';
import Reveal from '@/components/motion/Reveal';
import { dict } from '@/lib/dictionary';
import type { Locale, Profile } from '@/lib/models';
import { eyebrowFont } from '@/lib/typography';

// The same three facts are already stated in the byline copy below, so the
// pills are pure decoration -- `aria-hidden` on their container, never
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
    <section
      id="hero"
      className="relative z-[2] flex min-h-screen flex-col items-center justify-center px-6 pt-32 pb-24 text-center"
    >
      <Reveal className="relative mb-7 h-[118px] w-[118px]">
        <span className="pointer-events-none absolute -inset-2 rounded-full border border-dashed border-peri/50" />
        {profile.photoSrc ? (
          <img
            src={profile.photoSrc}
            alt={profile.name}
            width={118}
            height={118}
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
      </Reveal>

      {/* Decoration only -- the same three facts appear in the copy below. */}
      <div data-pills aria-hidden="true">
        {PILLS[locale].map((label, i) => (
          <span key={label} className={`pill pill-${i + 1}`} style={{ ['--pi' as string]: String(i) }}>
            {label}
          </span>
        ))}
      </div>

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

      <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {t.greeting} {profile.name.split(' ')[0]}
      </p>

      {/* Identity stack (Change 1), replacing the single roleLine <p> that
          used to sit here (`t.roleLine` is now unused by this component --
          left in the dictionary untouched, per spec, since it's a
          read-only file and other code may still reference it). Three
          declarative lines, Bobby-Arnot style: the point is that a reader
          registers three distinct identities belonging to one person,
          which one wrapped sentence flattens into a single fact.
          Rendered as a <ul>, not <h2>/<h3>: these are coordinate, parallel
          items describing the same subject, not a new section of the
          page, so list semantics (announced as "list, 3 items" by a
          screen reader) fit better than a heading -- and unlike a
          heading, a list never enters the page's heading outline, so it
          can't shadow the <h1> immediately below it. Plain stacked <p>
          tags were the other reasonable option, but they'd read to
          assistive tech as three unrelated paragraphs instead of one
          grouped set. Sized and weighted to have more presence than the
          12.5px muted line it replaces, while staying well under the
          <h1>'s clamp(34px,...): the <h1> must remain the visually
          dominant element in the hero. */}
      <ul className="mt-2 flex flex-col items-center gap-0.5 text-[15px] font-medium leading-[1.2] text-on-dark sm:text-[17px]">
        {t.identities.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <MaskedHeading
        text={profile.headline[locale]}
        level={1}
        className="mt-8 max-w-[15ch] text-[clamp(34px,6.4vw,84px)] font-bold leading-[1.08] tracking-[-0.03em]"
      />

      <Reveal as="p" className="mt-9 max-w-[60ch] text-[14.5px] leading-[1.95] text-on-dark-soft">
        {profile.byline[locale]}
      </Reveal>

      {profile.email && (
        // Change 3: CopyEmail sits beside the mailto capsule so a visitor
        // can take the address without scrolling to the footer band. The
        // capsule stays the primary action (solid fill, first in source
        // order); CopyEmail is wrapped in text-on-dark-soft so its own
        // unstyled text reads muted/secondary next to the filled button,
        // without editing CopyEmail itself. flex-wrap + centered gaps keep
        // the pair from colliding or overflowing at narrow widths -- once
        // the row can't fit both, CopyEmail simply wraps to its own line.
        <Reveal delayIndex={1} className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
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
    </section>
  );
}
