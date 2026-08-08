import { getProfile } from '@/lib/content';
import type { Locale } from '@/lib/models';

export default async function SiteFooter({ locale }: { locale: Locale }) {
  void locale; // reserved for future locale-aware footer copy
  const profile = await getProfile();
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6 text-sm text-soft">
        <span>© {new Date().getFullYear()} {profile.name}</span>
        <span className="flex gap-4">
          <a href={profile.linkedin} className="hover:text-ink">LinkedIn</a>
          <a href={profile.github} className="hover:text-ink">GitHub</a>
          <a href={`mailto:${profile.email}`} className="hover:text-ink">Email</a>
        </span>
      </div>
    </footer>
  );
}
