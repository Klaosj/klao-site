'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function LocaleToggle() {
  const pathname = usePathname() ?? '/en';
  const segments = pathname.split('/');
  const current = segments[1] === 'th' ? 'th' : 'en';
  const rest = segments.slice(2).join('/');
  const href = (locale: string) => `/${locale}${rest ? `/${rest}` : ''}`;
  return (
    <nav aria-label="Language" className="whitespace-nowrap rounded border border-line px-2 py-1 text-sm">
      <Link
        href={href('en')}
        className={current === 'en' ? 'font-semibold' : 'text-soft'}
        prefetch={false}
        lang="en"
        hrefLang="en"
        aria-current={current === 'en' ? 'page' : undefined}
      >
        EN
      </Link>
      <span className="text-soft"> / </span>
      <Link
        href={href('th')}
        className={current === 'th' ? 'font-semibold' : 'text-soft'}
        prefetch={false}
        lang="th"
        hrefLang="th"
        aria-current={current === 'th' ? 'page' : undefined}
      >
        ไทย
      </Link>
    </nav>
  );
}
