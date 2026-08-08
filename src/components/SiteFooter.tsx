import { getProfile } from '@/lib/content';
import { dict } from '@/lib/dictionary';
import type { Locale } from '@/lib/models';

export default async function SiteFooter({ locale }: { locale: Locale }) {
  const profile = await getProfile();
  const t = dict[locale];
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6 text-sm text-soft">
        <span>© {new Date().getFullYear()} {profile.name}</span>
        <span className="flex gap-4">
          {profile.linkedin && (
            <a href={profile.linkedin} className="hover:text-ink">LinkedIn</a>
          )}
          {profile.github && (
            <a href={profile.github} className="hover:text-ink">GitHub</a>
          )}
          {profile.email && (
            <a href={`mailto:${profile.email}`} className="hover:text-ink">{t.email}</a>
          )}
        </span>
      </div>
    </footer>
  );
}
