import MaskedHeading from '@/components/motion/MaskedHeading';
import Reveal from '@/components/motion/Reveal';
import { dict } from '@/lib/dictionary';
import type { Locale } from '@/lib/models';

export default function CraftBand({ locale }: { locale: Locale }) {
  const t = dict[locale];
  return (
    <section id="craft" className="relative z-[2] bg-deep px-6 py-[11vh]">
      <p className="mb-5 font-mono text-[9.5px] uppercase tracking-[0.24em] text-on-dark-soft">
        {t.howIWork}
      </p>
      <MaskedHeading
        text={t.craftHeading}
        level={2}
        className="max-w-[17ch] text-[clamp(30px,5.1vw,64px)] font-bold leading-[1.1] tracking-[-0.028em]"
      />
      <ul className="mt-14 flex list-none flex-col gap-[2px]">
        {t.craft.map((line, i) => (
          <Reveal
            as="li"
            key={line}
            delayIndex={i}
            className={`text-[clamp(24px,4.2vw,52px)] font-bold leading-[1.14] tracking-[-0.03em] ${
              i === 0 ? 'text-on-dark' : 'text-on-dark-soft'
            }`}
          >
            {line}
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
