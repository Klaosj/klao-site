'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function LocaleToggle() {
  const pathname = usePathname() ?? '/en';
  const segments = pathname.split('/');
  const current = segments[1] === 'th' ? 'th' : 'en';
  const rest = segments.slice(2).join('/');
  const href = (locale: string) => `/${locale}${rest ? `/${rest}` : ''}`;
  // Hit-area fix (WCAG 2.5.8): EN/ไทย render as bare, unpadded text at
  // text-sm, under the 24x24 CSS px minimum. `p-1.5` grows the
  // clickable/tappable box; the matching `-m-1.5` cancels that growth for
  // layout purposes (a negative margin shrinks the element's flow footprint
  // back to its unpadded size without changing where its own border-box --
  // the actually clickable area -- gets painted or hit-tested), so the
  // visible "EN / ไทย" text and the enclosing pill's size are unchanged.
  const linkClass = (active: boolean) =>
    `inline-flex items-center justify-center p-1.5 -m-1.5 ${active ? 'font-semibold' : 'text-soft'}`;
  return (
    <nav aria-label="Language" className="whitespace-nowrap rounded border border-line px-2 py-1 text-sm">
      <Link
        href={href('en')}
        className={linkClass(current === 'en')}
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
        className={linkClass(current === 'th')}
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
