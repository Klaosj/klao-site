import type { Metadata } from 'next';
import { getProjects } from '@/lib/content';
import { dict } from '@/lib/dictionary';
import type { Locale } from '@/lib/models';
import { SITE_URL } from '@/lib/site';
import ProjectCard from '@/components/ProjectCard';

// Widen-then-narrow `params`, matching layout.tsx's generateMetadata (Task
// 10 review's critical type constraint). Gives this page its own title
// (composed with the layout's `%s · Klao` template) and a self-referential
// canonical, replacing the layout's site-root default -- see Task 10 review
// Important #3: before this, all 12 sitemap URLs shared one title.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l: Locale = locale === 'th' ? 'th' : 'en';
  return {
    title: dict[l].projects,
    alternates: { canonical: `${SITE_URL}/${l}/projects` },
  };
}

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
