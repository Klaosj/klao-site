import Reveal from '@/components/motion/Reveal';
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
          // liveUrl wins over repoUrl when both are set; when neither is
          // set, href is null and the card renders as a plain <div> below
          // -- never a dangling anchor to nowhere.
          const href = project.liveUrl ?? project.repoUrl;

          const card = (
            <>
              {project.imageSrc && (
                <div className="frame overflow-hidden rounded-[12px] border border-on-dark-faint bg-deep">
                  {/* Browser-chrome bar: three dots above a 1px divider. */}
                  <div className="flex items-center gap-1.5 border-b border-on-dark-faint px-3 py-2.5">
                    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-on-dark-faint" />
                    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-on-dark-faint" />
                    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-on-dark-faint" />
                  </div>
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
                  conditional on imageSrc -- a project with no cover keeps its text. */}
              <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-lg font-semibold text-on-dark">{project.name}</p>
                <p className="text-[13px] leading-[1.6] text-on-dark-soft">{project.description[locale]}</p>
                <p className={`ml-auto whitespace-nowrap text-[11px] text-on-dark-soft ${eyebrowFont(locale, '')}`}>
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
              {href ? (
                // Every project's href here is external (a live deployment
                // or a GitHub repo, never an in-site route -- see
                // ProjectCard.tsx, which sets the same pair on its own
                // liveUrl/repoUrl links). Without target="_blank", clicking
                // a card navigates the visitor away from the portfolio
                // entirely instead of opening the project in a new tab.
                <a href={href} target="_blank" rel="noreferrer">
                  {card}
                </a>
              ) : (
                <div>{card}</div>
              )}
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
