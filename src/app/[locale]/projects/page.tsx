import type { Metadata } from 'next';
import { getProjects } from '@/lib/content';
import { dict } from '@/lib/dictionary';
import { assertLocale } from '@/lib/locale';
import { SITE_URL } from '@/lib/site';
import ProjectCard from '@/components/ProjectCard';

// See src/app/[locale]/page.tsx for why this is set per leaf page rather
// than on the shared layout.
export const dynamicParams = false;

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
  const l = assertLocale(locale);
  return {
    title: dict[l].projects,
    alternates: { canonical: `${SITE_URL}/${l}/projects` },
  };
}

export default async function ProjectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = assertLocale((await params).locale);
  const t = dict[locale];
  const projects = await getProjects();

  return (
    // See layout.tsx: the shared header is now fixed and transparent, and
    // <main> no longer constrains width for the redesigned full-bleed home
    // route -- this page carries its own reading-width column and top
    // padding to clear the header instead.
    <div className="mx-auto w-full max-w-3xl px-6 pb-16 pt-28">
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
