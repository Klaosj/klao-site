import MaskedHeading from '@/components/motion/MaskedHeading';
import Reveal from '@/components/motion/Reveal';
import { dict } from '@/lib/dictionary';
import type { Locale, Skill } from '@/lib/models';
import { eyebrowFont } from '@/lib/typography';
import './skills-band.css';

// Decoration only (aria-hidden, see CategoryDot below) -- deliberately
// muted, since the whole point of an "honestly-tiered" toolbox is that TIER
// (top/daily/working/basic/learning) carries the visual weight, not which
// category a skill happens to belong to. docs/NOTION_SETUP.md's Category
// Select also allows a fifth option, "human" (soft skills), which has no
// entry here on purpose -- see the fallback in CategoryDot.
const CATEGORY_DOT: Record<string, string> = {
  tech: '#7d86ad',
  biz: '#c2a06b',
  data: '#6ba883',
  fin: '#8fae6f',
};

// Inline `style`, not a Tailwind `bg-[#...]` arbitrary-value utility: the
// color is a JS runtime lookup keyed on Notion content (Skill.category),
// not a string literal Tailwind's build-time class scanner could ever see
// in the source. Same reasoning MaskedHeading/Reveal/Hero already rely on
// for their own `style={{ ['--x']: ... }}` custom-property assignments,
// just landing on a real CSS property instead of a variable.
function CategoryDot({ category }: { category: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-[6px] w-[6px] shrink-0 rounded-full"
      style={{ backgroundColor: CATEGORY_DOT[category] ?? CATEGORY_DOT.biz }}
    />
  );
}

// Server component -- no 'use client'. Reveal/MaskedHeading are themselves
// client components but are composed here the same way every other band
// does it: imported and rendered as plain children.
export default function SkillsBand({ skills, locale }: { skills: Skill[]; locale: Locale }) {
  const t = dict[locale];

  // A Notion Skills database that hasn't been populated yet -- or one whose
  // every row failed mapSkill's Name/Tier checks -- maps to `[]`. A heading
  // with nothing under it would look like a broken section rather than an
  // honestly-absent one, so the whole band doesn't exist for that visitor.
  // Same reasoning ClientsBand applies to `clients.length === 0`.
  if (skills.length === 0) {
    return null;
  }

  // getSkills() (src/lib/content.ts) already sorts the full list by tier
  // order then Skill.order -- this just partitions that already-sorted
  // list into its five tiers, filter() preserving relative order within
  // each. Same "trust the caller's ordering, don't re-sort here" contract
  // ClientsBand/CvBand already rely on for their own `clients`/`entries`
  // props.
  const top = skills.filter((s) => s.tier === 'top');
  const daily = skills.filter((s) => s.tier === 'daily');
  const working = skills.filter((s) => s.tier === 'working');
  const basic = skills.filter((s) => s.tier === 'basic');
  const learning = skills.filter((s) => s.tier === 'learning');

  return (
    <section id="toolbox" className="relative z-[2] bg-dark px-6 py-[11vh]">
      {/* Eyebrow + MaskedHeading pairing -- CvBand's own idiom (a `<p>`
          eyebrow label ahead of the band's big-head), not ClientsBand's
          (which has no eyebrow of its own since its heading already reads
          as a self-contained statement). */}
      <p className={`mb-5 text-[9.5px] uppercase text-on-dark-soft ${eyebrowFont(locale, 'tracking-[0.24em]')}`}>
        {t.toolbox}
      </p>
      <MaskedHeading
        text={t.toolboxHeading}
        level={2}
        className="max-w-[17ch] text-[clamp(30px,5.1vw,64px)] font-bold leading-[1.1] tracking-[-0.028em]"
      />

      {/* Top tier: the honest headline claim, one skill per line at
          ClientsBand's own statement scale -- a marker, not a rank number,
          since these four are peers, not a 1-2-3-4 ladder. */}
      {top.length > 0 && (
        <ul className="mt-14 flex list-none flex-col gap-[2px]">
          {top.map((skill, i) => (
            <Reveal
              as="li"
              key={skill.id}
              delayIndex={i}
              className="flex items-baseline gap-3 text-[clamp(20px,3.4vw,40px)] font-bold leading-[1.2] tracking-[-0.02em]"
            >
              <span aria-hidden="true" className="text-[0.5em] text-peri">
                ◆
              </span>
              {skill.name}
            </Reveal>
          ))}
        </ul>
      )}

      {/* Daily craft: quiet pill chips, the hero status pill's own "no
          backdrop-filter, just a border and soft text" look (Hero.tsx's
          data-status-pill) rather than anything louder. */}
      {daily.length > 0 && (
        <Reveal delayIndex={0} className="mt-14">
          <p className={`mb-4 text-[9.5px] uppercase text-on-dark-soft ${eyebrowFont(locale, 'tracking-[0.2em]')}`}>
            {t.tierDaily}
          </p>
          <ul className="flex list-none flex-wrap gap-2">
            {daily.map((skill) => (
              <li
                key={skill.id}
                className="inline-flex items-center gap-2 rounded-full border border-on-dark-faint px-4 py-1.5 text-[12.5px] text-on-dark-soft"
              >
                <CategoryDot category={skill.category} />
                {skill.name}
              </li>
            ))}
          </ul>
        </Reveal>
      )}

      {/* Working knowledge: the same chip, one size and one notch of
          opacity quieter -- smaller/dimmer is the whole "honestly tiered"
          point, not a different shape. */}
      {working.length > 0 && (
        <Reveal delayIndex={1} className="mt-10">
          <p className={`mb-4 text-[9.5px] uppercase text-on-dark-soft ${eyebrowFont(locale, 'tracking-[0.2em]')}`}>
            {t.tierWorking}
          </p>
          <ul className="flex list-none flex-wrap gap-2 opacity-75">
            {working.map((skill) => (
              <li
                key={skill.id}
                className="inline-flex items-center gap-2 rounded-full border border-on-dark-faint px-4 py-1.5 text-[11.5px] text-on-dark-soft"
              >
                <CategoryDot category={skill.category} />
                {skill.name}
              </li>
            ))}
          </ul>
        </Reveal>
      )}

      {/* Familiar with: deliberately NOT chips -- a single quiet line, same
          "label: value" idiom AboutBand's own profile.now row uses
          (`<span className="font-semibold ...">{t.now}: </span>{...}`),
          adapted to this band's dark palette. Chips at this tier would
          visually overstate four skills the owner is not shipping with. */}
      {basic.length > 0 && (
        <Reveal as="p" delayIndex={2} className="mt-10 text-[12.5px] text-on-dark-soft">
          <span className="font-semibold text-on-dark">{t.tierBasic}: </span>
          {basic.map((skill) => skill.name).join(' · ')}
        </Reveal>
      )}

      {/* Currently learning: the smallest, dimmest chip, with a slow pulse
          (skills-band.css) instead of a static dot -- "still in motion,"
          not yet a settled fact about the owner's toolbox. */}
      {learning.length > 0 && (
        <Reveal delayIndex={3} className="mt-10">
          <p className={`mb-4 text-[9.5px] uppercase text-on-dark-soft ${eyebrowFont(locale, 'tracking-[0.2em]')}`}>
            {t.tierLearning}
          </p>
          <ul className="flex list-none flex-wrap gap-2">
            {learning.map((skill) => (
              <li
                key={skill.id}
                className="inline-flex items-center gap-2 rounded-full border border-on-dark-faint px-4 py-1.5 text-[11.5px] text-on-dark-soft opacity-75"
              >
                <span aria-hidden="true" className="skill-pulse inline-block h-[6px] w-[6px] shrink-0 rounded-full bg-peri" />
                {skill.name}
              </li>
            ))}
          </ul>
        </Reveal>
      )}
    </section>
  );
}
