import MaskedHeading from '@/components/motion/MaskedHeading';
import Reveal from '@/components/motion/Reveal';
import { dict } from '@/lib/dictionary';
import type { Locale, Profile } from '@/lib/models';

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
  wordmark: string;
}) {
  const t = dict[locale];

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

      <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {t.greeting} {profile.name.split(' ')[0]}
      </p>
      <p className="mt-2 text-[12.5px] text-on-dark-soft">{t.roleLine}</p>

      <MaskedHeading
        text={profile.headline[locale]}
        level={1}
        className="mt-8 max-w-[15ch] text-[clamp(34px,6.4vw,84px)] font-bold leading-[1.08] tracking-[-0.03em]"
      />

      <Reveal as="p" className="mt-9 max-w-[60ch] text-[14.5px] leading-[1.95] text-on-dark-soft">
        {profile.byline[locale]}
      </Reveal>

      {profile.email && (
        <Reveal delayIndex={1}>
          <a
            href={`mailto:${profile.email}`}
            className="mt-10 inline-flex items-center gap-3 rounded-full bg-light px-8 py-4 text-[13.5px] font-semibold text-dark"
          >
            {t.startConversation} <span aria-hidden="true">→</span>
          </a>
        </Reveal>
      )}
    </section>
  );
}
