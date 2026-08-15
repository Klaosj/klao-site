import Link from 'next/link';
import MaskedHeading from '@/components/motion/MaskedHeading';
import Reveal from '@/components/motion/Reveal';
import TiltCard from '@/components/motion/TiltCard';
import SectionLabel from '@/components/SectionLabel';
import { dict } from '@/lib/dictionary';
import { imageAlt } from '@/lib/image-alt';
import type { Locale, Project } from '@/lib/models';
import { eyebrowFont } from '@/lib/typography';

// The house transition. Every hand-written transition in globals.css runs
// 0.25s-0.95s on `cubic-bezier(.16,1,.3,1)`; a bare Tailwind `transition-*`
// runs 150ms on `cubic-bezier(.4,0,.2,1)`, which is why the pills used to
// snap where the rest of the page eases (QA 2026-08-15 finding 14).
const HOUSE_FX = 'duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]';

// Chapter order IS this literal's order (spec 2026-08-15 §3): business
// leads. The B/T prefixes are locale-invariant design marks; only the
// label word is translated, and since finding 24 it is spelled out exactly
// ONCE per chapter (a marker line above that chapter's first slide) instead
// of being repeated in every slide's kicker. A chapter with no projects
// contributes nothing at all — no marker, no slides, no kicker — which is
// exactly fixture mode, where all four projects are builds.
const GROUPS = [
  { type: 'business', prefix: 'B', labelKey: 'workTypeBusiness' },
  { type: 'build', prefix: 'T', labelKey: 'workTypeBuild' },
] as const;

// Server component — no 'use client'; Reveal/TiltCard/MaskedHeading own
// their client boundaries.
export default function WorkDeck({ projects, locale }: { projects: Project[]; locale: Locale }) {
  const t = dict[locale];

  // Finding 7: the subtitle promised "Business first." above zero business
  // slides. The copy is now wired to the same fact the chapters are, so the
  // band never advertises a chapter the data doesn't have.
  const hasBusiness = projects.some((p) => p.type === 'business');

  // Chapters, not a flat slide list (finding 24): each surviving group
  // carries its own slides plus the GLOBAL index its first slide sits at,
  // so the image side keeps alternating across the chapter boundary
  // (`offset + i`) exactly as it did when this was one flatMap.
  const chapters: {
    key: string;
    label: string;
    offset: number;
    slides: { project: Project; kicker: string }[];
  }[] = [];
  let offset = 0;
  for (const g of GROUPS) {
    const items = projects.filter((p) => p.type === g.type);
    if (items.length === 0) continue;
    chapters.push({
      key: g.type,
      label: t[g.labelKey],
      offset,
      slides: items.map((project, i) => ({
        project,
        kicker: `${g.prefix}·${String(i + 1).padStart(2, '0')}`,
      })),
    });
    offset += items.length;
  }

  // Finding 12: Thai combining vowels/tone marks live outside the x-height,
  // so the same nominal size reads a step smaller than Latin — every micro
  // label gets +1px on /th. The kicker is Latin-only now (`T·01`), but it
  // still sits in the Thai family there, and the marker word is real Thai.
  const kickerSize = locale === 'th' ? 'text-[11px]' : 'text-[10px]';
  const markerSize = locale === 'th' ? 'text-[12px]' : 'text-[11px]';

  return (
    <section id="work" className="relative z-[2] bg-dark px-6 py-[11vh]">
      {/* Eyebrow + MaskedHeading pairing — SkillsBand/CvBand's own idiom,
          at their exact clamp. Until finding 1 the band's <h2> WAS the 12px
          SectionLabel, so the most important band on the page opened three
          type steps below every other one. The label stays (smoke.test.tsx
          pins its text on the home page) but as a plain <p>: the display
          line below is the section's heading now. */}
      <SectionLabel as="p" text={t.selectedProjects} locale={locale} className="mb-5" />
      <MaskedHeading
        text={t.deckHeading}
        level={2}
        className="max-w-[17ch] text-[clamp(30px,5.1vw,64px)] font-bold leading-[1.1] tracking-[-0.028em]"
      />
      <p className="mt-5 max-w-[52ch] text-[13px] text-on-dark-soft">
        {hasBusiness ? t.deckSubtitle : t.deckSubtitleBuildOnly}
      </p>

      {/* Finding 2: the subtitle's bottom and the first slide's `border-t`
          measured 0px apart, so the rule read as an underline on the
          subtitle and the band's opener looked like part of slide 1. The
          list now starts 40px down AND a chapter's first slide carries no
          rule of its own — the rules are purely inter-slide dividers, and
          the chapter marker is what opens a chapter. */}
      <div className="mt-10">
        {chapters.map((chapter, ci) => (
          <div key={chapter.key}>
            <p
              className={`${markerSize} uppercase text-peri-deep ${eyebrowFont(locale, 'tracking-[0.22em]')} ${
                ci > 0 ? 'mt-16' : ''
              }`.trim()}
            >
              {chapter.label}
            </p>
            {chapter.slides.map(({ project, kicker }, i) => {
              // Image side alternates on the GLOBAL slide index so the
              // rhythm carries across the chapter boundary. Text stays
              // first in source order — mobile always stacks text then
              // image.
              const flip = (chapter.offset + i) % 2 === 1;
              const href = project.liveUrl ?? project.repoUrl;
              // A storied slide is the only one whose whole block is a
              // link, so it is the only one that earns a hover state and a
              // standing "read the story" affordance (finding 8a).
              const storied = Boolean(project.slug);

              const slide = (
                <div
                  className={`grid gap-8 py-14 md:grid-cols-2 md:items-start ${
                    i > 0 ? 'border-t border-on-dark-faint' : ''
                  }`.trim()}
                >
                  {/* Finding 10: the column used to be `items-center`-ed
                      against a 379px image, dropping the slide number 94px
                      below the rule that opens the slide. In a pitch deck
                      the slide number is the one thing that registers on
                      the top edge; `md:pt-1` is the optical nudge that
                      lines it up with the image's own top. */}
                  <div className={`md:pt-1 ${flip ? 'md:order-2' : ''}`.trim()}>
                    <p className={`${kickerSize} uppercase text-peri-deep ${eyebrowFont(locale, 'tracking-[0.22em]')}`}>
                      {kicker}
                    </p>
                    {/* Question leads when present (wave-1 principle, restated for
                        the deck): absent question → the slide simply starts at the
                        name, which renders exactly once. */}
                    {project.question && (
                      <p className="mt-3 text-[15px] italic text-peri">{project.question[locale]}</p>
                    )}
                    {/* Finding 28: `text-3xl md:text-[40px]` stepped 30→40px
                        at exactly 768px, i.e. at the narrowest the column
                        ever gets (344px). Interpolating grows the name with
                        its column instead of against it. */}
                    <h3
                      className={`mt-2 font-display text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.1] ${
                        storied ? `transition-colors group-hover:text-peri ${HOUSE_FX}` : ''
                      }`.trim()}
                    >
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
                    {/* Always visible, not a `group-hover:opacity-100`
                        reveal: a touch user never hovers, and this line is
                        the only thing on the slide that says the block is a
                        link at all. Hover just brightens it. */}
                    {storied && (
                      <p className={`mt-6 text-[12px] font-semibold text-peri transition-colors group-hover:text-on-dark ${HOUSE_FX}`}>
                        {t.readStory} <span aria-hidden="true">→</span>
                      </p>
                    )}
                  </div>
                  {project.imageSrc && (
                    <TiltCard>
                      <div className="frame overflow-hidden rounded-[12px] border border-on-dark-faint bg-deep">
                        {/* 800x450 (16:9) — the real intrinsic size of the fixture
                            assets; see work-grid.test.tsx's layout-shift history.
                            Alt describes what the screenshot SHOWS (shared
                            IMAGE_ALT map) — the old `name — description`
                            template made a screen reader announce both facts
                            twice, since both are visible text right beside it
                            (finding 4). */}
                        <img
                          src={project.imageSrc}
                          alt={imageAlt(project.imageSrc)}
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
                // Finding 21: `delayIndex={i}` fed `calc(var(--i) * 75ms)`,
                // but slides are ~492px apart and never enter the viewport
                // together — the stagger only ever added a dead beat before
                // the last slide. Stagger is for siblings arriving at once
                // (CvBand's entries, SkillsBand's top tier); here it is 0.
                <Reveal key={project.id} delayIndex={0}>
                  {/* Three-way link contract, unchanged from wave 1:
                      1. storied — ONE internal Link to the case-study page;
                         live/repo live on that page's receipts footer, never here.
                      2. unstoried + URL — external anchor, live preferred over
                         repo, new tab, no referrer.
                      3. unstoried + neither — plain div, never a dangling anchor. */}
                  {project.slug ? (
                    <Link className="group block" href={`/${locale}/work/${project.slug}`}>
                      {slide}
                    </Link>
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
                    // WCAG 2.5.8) as ProjectCard. `sm` pill: 12px on the
                    // ≥3:1 border token, not an 11px outlier on a border
                    // nobody could see (findings 5, 6).
                    <a
                      href={project.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`mt-4 inline-flex items-center rounded-full border border-on-dark-mid px-4 py-2 text-[12px] font-medium text-on-dark-soft transition-colors hover:border-peri hover:text-peri ${HOUSE_FX}`}
                    >
                      {t.viewCode}
                    </a>
                  )}
                </Reveal>
              );
            })}
          </div>
        ))}
      </div>
      {/* The deck shows FEATURED projects only (getFeaturedProjects on the
          home route) — this is the way into the full grouped listing, the
          blog-style /projects index. Styled as the site's primary pill
          (ContactBand's idiom: filled bg-light + peri glow + `.btn`
          magnetic hover) at the shared `md` step — 12/24 @13.5px, which
          retires the 13-vs-13.5px half-pixel between the two filled pills
          (finding 6); the pill's own padding provides the WCAG 2.5.8 hit
          area, so no p-2/-m-2 hack needed. */}
      <p className="mt-12">
        <Link
          href={`/${locale}/projects`}
          className={`btn inline-flex items-center gap-2 rounded-full bg-light px-6 py-3 text-[13.5px] font-semibold text-dark transition-shadow hover:shadow-[0_0_0_3px_rgba(168,174,203,0.35),0_18px_60px_-12px_rgba(168,174,203,0.45)] ${HOUSE_FX}`}
        >
          {t.allProjects} <span aria-hidden="true">→</span>
        </Link>
      </p>
    </section>
  );
}
