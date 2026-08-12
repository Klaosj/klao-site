import Link from 'next/link';
import Reveal from '@/components/motion/Reveal';
import TiltCard from '@/components/motion/TiltCard';
import { dict } from '@/lib/dictionary';
import type { Locale, Project } from '@/lib/models';
import { eyebrowFont } from '@/lib/typography';

// Server component -- no 'use client'. Reveal (T2) is itself a client
// component but is composed here the same way CraftBand/AboutBand do it:
// imported and rendered as a normal child, which is legal because Next only
// requires the boundary at the file that owns the hook, not at every
// ancestor.
export default function WorkGrid({ projects, locale }: { projects: Project[]; locale: Locale }) {
  const t = dict[locale];

  return (
    <section id="work" className="relative z-[2] bg-dark px-6 py-[11vh]">
      {/* An <h2>, not the <p> this used to be: the Work section had no
          heading of any kind, so heading navigation skipped the whole section
          (2026-08-09 QA, WCAG 1.3.1). Unlike CvBand -- which gained a real
          big-head because copy existed for one -- this band has only its
          eyebrow, so the eyebrow itself carries the heading role. Identical
          classes, so nothing moves visually. */}
      <h2 className={`mb-5 text-[9.5px] uppercase text-on-dark-soft ${eyebrowFont(locale, 'tracking-[0.24em]')}`}>
        {t.selectedWork}
      </h2>
      <div className="grid grid-cols-12 gap-6">
        {projects.map((project, i) => {
          // For an UNSTORIED project (no slug -- see the three-way link
          // contract on the wrapper below), the whole card stays one primary
          // anchor preferring liveUrl over repoUrl (never both -- nested <a>
          // is invalid HTML); when neither is set, href is null and the card
          // renders as a plain <div> below -- never a dangling anchor to
          // nowhere. When BOTH URLs are set, repoUrl doesn't get silently
          // dropped: it renders as its own secondary link, a sibling right
          // after the primary anchor (see below) -- this is the same bug
          // ProjectCard.tsx's own history comment documents ("a project with
          // BOTH a live URL and a repo URL silently dropped the repo link").
          // A storied project ignores this value entirely -- its card links
          // to its case-study page instead (wave 1 task 6).
          const href = project.liveUrl ?? project.repoUrl;

          const card = (
            <>
              {project.imageSrc && (
                <div className="frame overflow-hidden rounded-[12px] border border-on-dark-faint bg-deep">
                  {/* 800x450 (16:9), matching the real intrinsic size of the
                      fixture asset (public/images/placeholder.svg). The
                      previous 1440x900 (16:10) was an invented aspect
                      ratio -- with Tailwind preflight's `img{height:auto}`,
                      the browser reserves a pre-load box from the
                      width/height ratio declared here, so a 16:10 box for a
                      16:9 image was ~11% too tall: exactly the layout shift
                      these explicit dimensions exist to prevent, not avoid. */}
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
              )}
              {/* One caption cluster: name + description read together on the left,
                  stack sits right (wraps under on narrow screens). Previously the
                  name was far-left and the description+stack far-right, so at
                  desktop widths the pair lost any visual association. Still not
                  conditional on imageSrc -- a project with no cover keeps its text.

                  Wave 1 task 6 introduced the question-forward lead line, gated
                  on project.slug at the time; final-review F1 corrected that --
                  the approved spec is "show the question when present," not
                  "show it only for storied projects." The caption now keys on
                  project.question alone: when set, it becomes the lead line and
                  name+description fold into "name — description" as the second
                  line; when absent, the lead line is the plain name and the
                  second line is the description alone (today's classic caption).
                  This decouples the caption from the LINK three-way branch below,
                  which still keys on project.slug exactly as before -- a project
                  can carry a question with no slug yet (story not written) and
                  still lead with it here. One conditional block now, not two
                  duplicated <div>s (also retires a logged DRY nit). */}
              <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-lg font-semibold text-on-dark">{project.question?.[locale] ?? project.name}</p>
                {project.question ? (
                  <p className="text-[13px] leading-[1.6] text-on-dark-soft">
                    {project.name} — {project.description[locale]}
                  </p>
                ) : (
                  <p className="text-[13px] leading-[1.6] text-on-dark-soft">{project.description[locale]}</p>
                )}
                <p className={`ml-auto whitespace-nowrap text-[11px] text-peri-deep ${eyebrowFont(locale, '')}`}>
                  {project.stack.join(' · ')}
                </p>
              </div>
            </>
          );

          return (
            <Reveal
              key={project.id}
              delayIndex={i}
              className={i === 0 ? 'col-span-12' : 'col-span-12 md:col-span-6'}
            >
              {/* Three-way link contract (wave 1 task 6 extends what was a
                  two-way href/no-href branch above this comment's previous
                  home):
                  1. storied (project.slug set) -- the whole card is ONE
                     internal Link to its case-study page (/work/[slug], task
                     4). Plain next/link, no target: it's an in-site route,
                     not an external navigation, matching how Link is used
                     everywhere else in this codebase (see SiteNav.tsx's own
                     "plain <a>, not next/link -- Link is for in-site routes"
                     comment for the inverse case). liveUrl/repoUrl are NOT
                     rendered as anchors on the card in this case, even when
                     set -- they live on the case-study page itself
                     (work/[slug]/page.tsx's receipts footer) instead, so
                     there is never a second/nested link to reconcile here.
                  2. unstoried with an external URL -- unchanged from before
                     task 6: href prefers liveUrl over repoUrl (never both --
                     nested <a> is invalid HTML), opens in a new tab so the
                     visitor isn't carried off the portfolio entirely, and
                     when BOTH URLs are set the repoUrl is recovered as a
                     secondary sibling link below (see that block's own
                     comment; this is the same bug ProjectCard.tsx's own
                     history comment documents).
                  3. unstoried with neither URL -- a plain <div>, never a
                     dangling anchor to nowhere. */}
              {project.slug ? (
                <Link href={`/${locale}/work/${project.slug}`}>
                  <TiltCard>{card}</TiltCard>
                </Link>
              ) : href ? (
                <a href={href} target="_blank" rel="noreferrer">
                  <TiltCard>{card}</TiltCard>
                </a>
              ) : (
                <div>
                  <TiltCard>{card}</TiltCard>
                </div>
              )}
              {!project.slug && project.liveUrl && project.repoUrl && (
                // Secondary link, a SIBLING of the primary anchor above --
                // never nested inside it (nested <a> is invalid HTML). Only
                // rendered when both URLs exist AND the project is
                // unstoried; the repoUrl is otherwise reachable via the
                // primary anchor already (see href above), so this row
                // exists solely to recover the link that would otherwise be
                // silently dropped. A storied project never reaches here --
                // its liveUrl/repoUrl (if any) belong to the case-study
                // page's receipts footer, not this card, per the three-way
                // contract above.
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  // Hit-area fix (WCAG 2.5.8), same idiom as ProjectCard.tsx:
                  // `p-2` grows the clickable box past the 24x24 CSS px
                  // minimum; the matching `-m-2` cancels that growth for
                  // layout purposes so the visible underline stays put.
                  className="mt-3 inline-flex items-center justify-center p-2 -m-2 text-[11px] text-on-dark-soft underline hover:text-peri"
                >
                  {t.viewCode}
                </a>
              )}
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
