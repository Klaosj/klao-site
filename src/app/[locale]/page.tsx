import Link from 'next/link';
import { getFeaturedProjects, getPosts, getProfile } from '@/lib/content';
import { dict } from '@/lib/dictionary';
import { formatDate } from '@/lib/format';
import type { Locale } from '@/lib/models';
import ProjectCard from '@/components/ProjectCard';

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = dict[locale];
  const [profile, featured, posts] = await Promise.all([getProfile(), getFeaturedProjects(), getPosts()]);

  return (
    <div className="space-y-10">
      <section className="flex items-center gap-6">
        <div className="flex-1">
          <h1 className="font-display text-3xl leading-snug">{profile.headline[locale]}</h1>
          <p className="mt-3 text-sm text-soft">{profile.byline[locale]}</p>
          <p className="mt-4 flex gap-4 text-sm">
            <a href={profile.linkedin} className="underline hover:text-soft">LinkedIn</a>
            <a href={profile.github} className="underline hover:text-soft">GitHub</a>
            <a href={`mailto:${profile.email}`} className="underline hover:text-soft">Email</a>
            {profile.resumeUrl && (
              <a href={profile.resumeUrl} className="underline hover:text-soft">↓ {t.resume}</a>
            )}
          </p>
        </div>
        {profile.photoSrc && (
          <img src={profile.photoSrc} alt={profile.name} className="h-24 w-24 rounded-full object-cover" />
        )}
      </section>

      <section className="border-t border-line pt-8">
        <h2 className="text-xs uppercase tracking-widest text-soft">{t.selectedProjects}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {featured.map((p) => (
            <ProjectCard key={p.id} project={p} locale={locale} />
          ))}
        </div>
        <p className="mt-4 text-sm">
          <Link href={`/${locale}/projects`} className="text-soft hover:text-ink">{t.allProjects} →</Link>
        </p>
      </section>

      <section className="border-t border-line pt-8">
        <h2 className="text-xs uppercase tracking-widest text-soft">{t.latestWriting}</h2>
        <ul className="mt-4 space-y-3">
          {posts.slice(0, 3).map((post) => (
            <li key={post.id}>
              <Link href={`/${locale}/writing/${post.slug}`} className="hover:underline">
                {post.title[locale]}
              </Link>
              <span className="ml-2 text-xs text-soft">— {formatDate(post.date, locale)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm">
          <Link href={`/${locale}/writing`} className="text-soft hover:text-ink">{t.allPosts} →</Link>
        </p>
      </section>

      <section className="flex items-center justify-between border-t border-line pt-8">
        <div>
          <h2 className="text-xs uppercase tracking-widest text-soft">{t.now}</h2>
          <p className="mt-2 text-sm">{profile.now[locale]}</p>
        </div>
        <Link href={`/${locale}/career`} className="text-sm text-soft hover:text-ink">{t.fullCareer} →</Link>
      </section>
    </div>
  );
}
