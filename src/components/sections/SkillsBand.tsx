import MaskedHeading from '@/components/motion/MaskedHeading';
import Reveal from '@/components/motion/Reveal';
import { LEARNING_MARKER_ICON, SKILL_ICONS } from '@/components/sections/skill-icons';
import { dict } from '@/lib/dictionary';
import type { Locale, Skill } from '@/lib/models';
import { eyebrowFont } from '@/lib/typography';

// Owner decision, 2026-08-12: the live band read as overclaiming once every
// tier stacked up ("มันดูเว่อร์พอมันเยอะ" -- his words). This is a
// RENDER-LAYER curation only: src/lib/models.ts's five-tier Skill model and
// src/lib/content.ts's getSkills() fetcher are untouched, so re-expanding
// the band later needs zero schema work, just deleting the cuts below. The
// band now renders exactly three things --
//   1. the `top` tier, statement-scale, one line per skill
//   2. ONE row of iconed "Core tools" badges (TOOLS_ALLOWLIST below)
//   3. the `learning` tier, as one quiet joined-text line
// `daily`/`working`/`basic` are deliberately NOT rendered here anymore --
// that fuller, honest inventory still lives in the Notion Skills database
// itself and on the owner's GitHub profile; this band is the identity cut,
// impact only.

// A fixed, ORDERED allowlist of tool names -- the owner's own curation of
// which concrete tools earn a badge, in the order he wants them read. Any
// Skill (from ANY tier -- Salesforce today happens to be `daily`, Python
// `working`, since the tools row is about WHAT the tool is, not how often
// it is reached for) whose `name` is not in this list never renders here,
// and a name in this list with no matching fetched Skill (Published
// unticked in Notion, or simply not yet added) is silently skipped -- same
// "trust Notion, don't invent a placeholder" reasoning the rest of this
// codebase's Notion-sourced bands already follow (see ClientsBand).
const TOOLS_ALLOWLIST = [
  'Salesforce',
  'Excel & Sheets modeling',
  'Power BI',
  'Python',
  'SQL',
  'Supabase',
  'Notion API',
  'Vercel',
  'Swift',
] as const;

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
  // order then Skill.order -- `top`/`learning` just partition that
  // already-sorted list, filter() preserving relative order. Same "trust
  // the caller's ordering, don't re-sort here" contract ClientsBand/CvBand
  // already rely on for their own `clients`/`entries` props.
  const top = skills.filter((s) => s.tier === 'top');
  const learning = skills.filter((s) => s.tier === 'learning');

  // Tools row: allowlist order wins, not tier order or Notion `Order` --
  // TOOLS_ALLOWLIST.map(...).filter(...) rather than
  // skills.filter(...).sort(...), so a tool's badge position is the
  // owner's own curated call, unrelated to which tier it happens to sit in.
  const skillByName = new Map(skills.map((s) => [s.name, s] as const));
  const tools = TOOLS_ALLOWLIST.map((name) => skillByName.get(name)).filter((s): s is Skill => s !== undefined);

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
          ClientsBand's own statement scale. The marker is that skill's own
          icon (SKILL_ICONS, keyed by exact name) where the registry has
          one -- a registry MISS falls back to the original `◆` diamond,
          same "don't crash on the common case" contract ProjectCard's
          IMAGE_ALT map documents for itself. */}
      {top.length > 0 && (
        <ul className="mt-14 flex list-none flex-col gap-[2px]">
          {top.map((skill, i) => (
            <Reveal
              as="li"
              key={skill.id}
              delayIndex={i}
              className="flex items-baseline gap-3 text-[clamp(20px,3.4vw,40px)] font-bold leading-[1.2] tracking-[-0.02em]"
            >
              <span aria-hidden="true" className="inline-flex h-[28px] w-[28px] shrink-0 self-center text-peri">
                {SKILL_ICONS[skill.name] ?? <span className="text-[0.7em]">◆</span>}
              </span>
              {skill.name}
            </Reveal>
          ))}
        </ul>
      )}

      {/* Core tools: ONE row of iconed badges, monochrome (fill/stroke
          both key off currentColor -- no tool's own brand color ever
          appears), few, impact-only -- the owner's direct answer to "too
          many chips reads as overclaiming." Hover is CSS-only (`group` /
          `group-hover`, no JS): the border and the badge's own icon/label
          brighten together via `transition-colors`. */}
      {tools.length > 0 && (
        <Reveal delayIndex={1} className="mt-14">
          <p className={`mb-4 text-[9.5px] uppercase text-on-dark-soft ${eyebrowFont(locale, 'tracking-[0.2em]')}`}>
            {t.toolsLabel}
          </p>
          <ul className="flex list-none flex-wrap gap-2.5">
            {tools.map((skill) => (
              <li
                key={skill.id}
                className="group inline-flex items-center gap-2.5 rounded-[10px] border border-on-dark-faint bg-deep px-4 py-2.5 transition-colors hover:border-peri/40"
              >
                <span className="inline-flex h-[18px] w-[18px] shrink-0 text-peri/80 transition-colors group-hover:text-peri">
                  {SKILL_ICONS[skill.name]}
                </span>
                <span className="text-[12.5px] text-on-dark-soft transition-colors group-hover:text-on-dark">
                  {skill.name}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      )}

      {/* Currently learning: deliberately NOT chips -- one quiet line, a
          graduation-cap marker (skill-icons.tsx) ahead of the same
          "label: value" idiom AboutBand's own profile.now row uses. Chips
          here would visually overstate skills the owner is not yet
          shipping with. */}
      {learning.length > 0 && (
        <Reveal as="p" delayIndex={2} className="mt-10 flex items-center gap-2 text-[12.5px] text-on-dark-soft">
          <span aria-hidden="true" className="inline-flex h-[14px] w-[14px] shrink-0 text-on-dark-soft">
            {LEARNING_MARKER_ICON}
          </span>
          <span>
            <span className="font-semibold text-on-dark">{t.tierLearning}: </span>
            {learning.map((skill) => skill.name).join(' · ')}
          </span>
        </Reveal>
      )}
    </section>
  );
}
