import MaskedHeading from '@/components/motion/MaskedHeading';
import Reveal from '@/components/motion/Reveal';
import SpotlightList from '@/components/motion/SpotlightList';
import { dict } from '@/lib/dictionary';
import type { Locale } from '@/lib/models';
import { eyebrowFont } from '@/lib/typography';

export default function CraftBand({ locale }: { locale: Locale }) {
  const t = dict[locale];
  return (
    <section id="craft" className="relative z-[2] bg-deep px-6 py-[11vh]">
      <p className={`mb-5 text-[9.5px] uppercase text-on-dark-soft ${eyebrowFont(locale, 'tracking-[0.24em]')}`}>
        {t.howIWork}
      </p>
      <MaskedHeading
        text={t.craftHeading}
        level={2}
        className="max-w-[17ch] text-[clamp(30px,5.1vw,64px)] font-bold leading-[1.1] tracking-[-0.028em]"
      />
      <Reveal className="mt-14">
        <SpotlightList
          lines={t.craft}
          className="flex list-none flex-col gap-[2px]"
          itemClassName="text-[clamp(24px,4.2vw,52px)] font-bold leading-[1.14] tracking-[-0.03em]"
        />
      </Reveal>
    </section>
  );
}
