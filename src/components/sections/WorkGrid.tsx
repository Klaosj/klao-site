import Reveal from '@/components/motion/Reveal';
import { dict } from '@/lib/dictionary';
import type { Locale, Project } from '@/lib/models';

// Server component -- no 'use client'. Reveal (T2) is itself a client
// component but is composed here the same way CraftBand/AboutBand do it:
// imported and rendered as a normal child, which is legal because Next only
// requires the boundary at the file that owns the hook, not at every
// ancestor.
export default function WorkGrid({ projects, locale }: { projects: Project[]; locale: Locale }) {
  const t = dict[locale];

  return (
    <section className="relative z-[2] bg-dark px-6 py-[11vh]">
      <p className="mb-5 font-mono text-[9.5px] uppercase tracking-[0.24em] text-on-dark-soft">
        {t.selectedWork}
      </p>
      <div className="grid grid-cols-12 gap-6">
        {projects.map((project, i) => {
          // liveUrl wins over repoUrl when both are set; when neither is
          // set, href is null and the card renders as a plain <div> below
          // -- never `href="#"`.
          const href = project.liveUrl ?? project.repoUrl;
          const meta = `${project.description[locale]} · ${project.stack.join(' · ')}`;

          const card = (
            <>
              {project.imageSrc && (
                <div className="overflow-hidden rounded-[12px] border border-on-dark-faint bg-deep">
                  {/* Browser-chrome bar: three dots above a 1px divider. */}
                  <div className="flex items-center gap-1.5 border-b border-on-dark-faint px-3 py-2.5">
                    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-on-dark-faint" />
                    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-on-dark-faint" />
                    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-on-dark-faint" />
                  </div>
                  <img
                    src={project.imageSrc}
                    alt={`${project.name} — ${project.description[locale]}`}
                    width={1440}
                    height={900}
                    loading="lazy"
                    decoding="async"
                    className="block w-full"
                  />
                </div>
              )}
              {/* Not conditional on imageSrc -- a project with no cover still
                  gets its name and meta line, which is what keeps it from
                  rendering as an empty card. */}
              <div className="mt-4 flex items-baseline justify-between gap-4">
                <p className="text-lg font-semibold text-on-dark">{project.name}</p>
                <p className="font-mono text-[11px] text-on-dark-soft">{meta}</p>
              </div>
            </>
          );

          return (
            <Reveal
              key={project.id}
              delayIndex={i}
              className={i === 0 ? 'col-span-12' : 'col-span-12 md:col-span-6'}
            >
              {href ? <a href={href}>{card}</a> : <div>{card}</div>}
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
