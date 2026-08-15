import Link from 'next/link';
import Reveal from '@/components/motion/Reveal';
import TiltCard from '@/components/motion/TiltCard';
import { dict } from '@/lib/dictionary';
import type { Locale, Project } from '@/lib/models';
import { eyebrowFont } from '@/lib/typography';

// Chapter order IS this literal's order (spec 2026-08-15 §3): business
// leads. The B/T prefixes are locale-invariant design marks; only the
// label word is translated. A chapter with no projects contributes no
// slides at all (flatMap over an empty filter) — no header, no kicker —
// which is exactly fixture mode, where all four projects are builds.
const GROUPS = [
  { type: 'business', prefix: 'B', labelKey: 'workTypeBusiness' },
  { type: 'build', prefix: 'T', labelKey: 'workTypeBuild' },
] as const;

// Server component — no 'use client'; Reveal/TiltCard own their client
// boundaries.
export default function WorkDeck({ projects, locale }: { projects: Project[]; locale: Locale }) {
  const t = dict[locale];
  const slides = GROUPS.flatMap((g) =>
    projects
      .filter((p) => p.type === g.type)
      .map((project, i) => ({
        project,
        kicker: `${g.prefix}·${String(i + 1).padStart(2, '0')} — ${t[g.labelKey]}`,
      })),
  );

  return (
    <section id="work" className="relative z-[2] bg-dark px-6 py-[11vh]">
      {/* The eyebrow carries the section's heading role — same WCAG 1.3.1
          rationale applied since the 2026-08-09 QA finding, and
          smoke.test.tsx pins this exact text on the home page. */}
      <h2 className={`text-[9.5px] uppercase text-on-dark-soft ${eyebrowFont(locale, 'tracking-[0.24em]')}`}>
        {t.selectedProjects}
      </h2>
      <p className="mt-2 text-[13px] text-on-dark-soft">{t.deckSubtitle}</p>
      {slides.map(({ project, kicker }, i) => {
        // Image side alternates on the GLOBAL slide index so the rhythm
        // carries across the chapter boundary. Text stays first in source
        // order — mobile always stacks text then image.
        const flip = i % 2 === 1;
        const href = project.liveUrl ?? project.repoUrl;

        const slide = (
          <div className="grid items-center gap-8 border-t border-on-dark-faint py-14 md:grid-cols-2">
            <div className={flip ? 'md:order-2' : ''}>
              <p className={`text-[10px] uppercase text-peri-deep ${eyebrowFont(locale, 'tracking-[0.22em]')}`}>
                {kicker}
              </p>
              {/* Question leads when present (wave-1 principle, restated for
                  the deck): absent question → the slide simply starts at the
                  name, which renders exactly once. */}
              {project.question && (
                <p className="mt-3 text-[15px] italic text-peri">{project.question[locale]}</p>
              )}
              <h3 className="mt-2 font-display text-3xl font-semibold md:text-[40px] md:leading-[1.1]">
                {project.name}
              </h3>
              <p className="mt-3 max-w-[44ch] text-[14.5px] leading-[1.6] text-on-dark-soft">
                {project.description[locale]}
              </p>
              {/* The receipt line: only ever real numbers from Notion
                  (Outcome*), so null simply means no line — never a
                  placeholder. Rendered for both types. */}
              {project.outcome && (
                <p className="mt-4 border-l-2 border-peri-deep pl-3 text-[12.5px] text-peri-deep">
                  {project.outcome[locale]}
                </p>
              )}
              {/* Stack is a build-chapter fact. A business slide never
                  shows it, even when Notion carries one (spec §3.6). */}
              {project.type === 'build' && project.stack.length > 0 && (
                <p className={`mt-4 text-[11px] text-peri-deep ${eyebrowFont(locale, '')}`}>
                  {project.stack.join(' · ')}
                </p>
              )}
            </div>
            {project.imageSrc && (
              <TiltCard>
                <div className="frame overflow-hidden rounded-[12px] border border-on-dark-faint bg-deep">
                  {/* 800x450 (16:9) — the real intrinsic size of the fixture
                      assets; see work-grid.test.tsx's layout-shift history. */}
                  <img
                    src={project.imageSrc}
                    alt={`${project.name} — ${project.description[locale]}`}
                    width={800}
                    height={450}
                    loading="lazy"
                    decoding="async"
                    className="block w-full"
                  />
                </div>
              </TiltCard>
            )}
          </div>
        );

        return (
          <Reveal key={project.id} delayIndex={i}>
            {/* Three-way link contract, unchanged from wave 1:
                1. storied — ONE internal Link to the case-study page;
                   live/repo live on that page's receipts footer, never here.
                2. unstoried + URL — external anchor, live preferred over
                   repo, new tab, no referrer.
                3. unstoried + neither — plain div, never a dangling anchor. */}
            {project.slug ? (
              <Link href={`/${locale}/work/${project.slug}`}>{slide}</Link>
            ) : href ? (
              <a href={href} target="_blank" rel="noreferrer">
                {slide}
              </a>
            ) : (
              <div>{slide}</div>
            )}
            {!project.slug && project.liveUrl && project.repoUrl && (
              // Secondary repo link — a SIBLING of the primary anchor, never
              // nested (invalid HTML). Same hit-area idiom (p-2/-m-2,
              // WCAG 2.5.8) as ProjectCard.
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center rounded-full border border-on-dark-faint px-4 py-2 text-[11px] font-medium text-on-dark-soft transition-colors hover:border-peri hover:text-peri"
              >
                {t.viewCode}
              </a>
            )}
          </Reveal>
        );
      })}
      {/* The deck shows FEATURED projects only (getFeaturedProjects on the
          home route) — this is the way into the full grouped listing, the
          blog-style /projects index. Styled as the site's primary pill
          (ContactBand's idiom: filled bg-light + peri glow + `.btn`
          magnetic hover); the pill's own padding provides the WCAG 2.5.8
          hit area, so no p-2/-m-2 hack needed. */}
      <p className="mt-12">
        <Link
          href={`/${locale}/projects`}
          className="btn inline-flex items-center gap-2 rounded-full bg-light px-6 py-3 text-[13px] font-semibold text-dark transition-shadow hover:shadow-[0_0_0_3px_rgba(168,174,203,0.35),0_18px_60px_-12px_rgba(168,174,203,0.45)]"
        >
          {t.allProjects} →
        </Link>
      </p>
    </section>
  );
}
