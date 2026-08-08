import { dict } from '@/lib/dictionary';
import type { Locale, Project } from '@/lib/models';

// Previously the whole card was one <a href={liveUrl ?? repoUrl ?? undefined}>,
// so a project with BOTH a live URL and a repo URL silently dropped the repo
// link -- invisible with every current fixture (liveUrl is null on all four),
// surfacing the first time a real Live URL gets filled in on Notion. Spec §3
// and F5 both say "links out (live app / GitHub)", plural. Fixed by not
// wrapping the card in an anchor at all: both links render in a small row at
// the bottom when present, each only rendered when its own URL exists, so a
// project with neither still renders as a plain (non-clickable) card exactly
// as before.
export default function ProjectCard({ project, locale }: { project: Project; locale: Locale }) {
  const t = dict[locale];
  return (
    <div className="flex h-full flex-col rounded-md border border-line bg-card p-4 transition-shadow hover:shadow-sm">
      {project.imageSrc ? (
        <img src={project.imageSrc} alt="" loading="lazy" className="mb-3 aspect-video w-full rounded object-cover" />
      ) : (
        <div className="mb-3 aspect-video w-full rounded bg-line" />
      )}
      <h3 className="font-semibold">{project.name}</h3>
      <p className="mt-1 flex-1 text-sm text-soft">{project.description[locale]}</p>
      <p className="mt-3 text-xs text-soft">{project.stack.join(' · ')}</p>
      {(project.liveUrl || project.repoUrl) && (
        <p className="mt-3 flex gap-4 text-xs">
          {project.liveUrl && (
            <a href={project.liveUrl} target="_blank" rel="noreferrer" className="underline hover:text-soft">
              {t.liveSite}
            </a>
          )}
          {project.repoUrl && (
            <a href={project.repoUrl} target="_blank" rel="noreferrer" className="underline hover:text-soft">
              {t.viewCode}
            </a>
          )}
        </p>
      )}
    </div>
  );
}
