import Link from 'next/link';
import { dict } from '@/lib/dictionary';
import type { Locale } from '@/lib/models';
import LocaleToggle from './LocaleToggle';

export default function SiteNav({ locale }: { locale: Locale }) {
  const t = dict[locale];
  return (
    <header className="border-b border-line">
      <nav aria-label="Main" className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link href={`/${locale}`} className="font-display text-lg font-bold tracking-wide">
          KLAO
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <Link href={`/${locale}/projects`} className="text-soft hover:text-ink">{t.projects}</Link>
          <Link href={`/${locale}/writing`} className="text-soft hover:text-ink">{t.writing}</Link>
          <Link href={`/${locale}/career`} className="text-soft hover:text-ink">{t.career}</Link>
          <LocaleToggle />
        </div>
      </nav>
    </header>
  );
}
