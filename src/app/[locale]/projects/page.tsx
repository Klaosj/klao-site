import { getProjects } from '@/lib/content';
import { dict } from '@/lib/dictionary';
import type { Locale } from '@/lib/models';
import ProjectCard from '@/components/ProjectCard';

export default async function ProjectsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = dict[locale];
  const projects = await getProjects();

  return (
    <div>
      <h1 className="font-display text-3xl">{t.projects}</h1>
      <section className="mt-8">
        <h2 className="text-xs uppercase tracking-widest text-soft">{t.allProjects}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} locale={locale} />
          ))}
        </div>
      </section>
    </div>
  );
}
