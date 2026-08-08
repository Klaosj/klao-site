import type { Locale, Project } from '@/lib/models';

export default function ProjectCard({ project, locale }: { project: Project; locale: Locale }) {
  const href = project.liveUrl ?? project.repoUrl ?? undefined;
  const body = (
    <div className="flex h-full flex-col rounded-md border border-line bg-white p-4 transition-shadow hover:shadow-sm">
      {project.imageSrc ? (
        <img src={project.imageSrc} alt={project.name} loading="lazy" className="mb-3 aspect-video w-full rounded object-cover" />
      ) : (
        <div className="mb-3 aspect-video w-full rounded bg-line" />
      )}
      <h3 className="font-semibold">{project.name}</h3>
      <p className="mt-1 flex-1 text-sm text-soft">{project.description[locale]}</p>
      <p className="mt-3 text-xs text-soft">{project.stack.join(' · ')}</p>
    </div>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="block h-full">
      {body}
    </a>
  ) : (
    body
  );
}
