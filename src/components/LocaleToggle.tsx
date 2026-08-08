'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

function LocaleLinks() {
  const pathname = usePathname() ?? '/en';
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const segments = pathname.split('/');
  const current = segments[1] === 'th' ? 'th' : 'en';
  const rest = segments.slice(2).join('/');
  const href = (locale: string) =>
    `/${locale}${rest ? `/${rest}` : ''}${query ? `?${query}` : ''}`;
  return (
    <>
      <Link
        href={href('en')}
        className={current === 'en' ? 'font-semibold' : 'text-soft'}
        prefetch={false}
        aria-current={current === 'en' ? 'true' : undefined}
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
        aria-current={current === 'th' ? 'true' : undefined}
      >
        ไทย
      </Link>
    </>
  );
}

export default function LocaleToggle() {
  return (
    <nav aria-label="Language" className="rounded border border-line px-2 py-1 text-sm">
      <Suspense fallback={<span className="text-soft">EN / ไทย</span>}>
        <LocaleLinks />
      </Suspense>
    </nav>
  );
}
