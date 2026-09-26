'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { dict } from '@/lib/dictionary';
import type { Locale } from '@/lib/models';
import './locale-toggle.css';

/** The same page in the other language: swap the first path segment and keep
 *  the rest (the logic the old toggle had). The hash is not carried: section
 *  ids exist on both locales' home pages, and a sheet or palette state isn't
 *  worth restoring across a language switch. */
export function switchLocaleHref(pathname: string, target: Locale): string {
  const rest = pathname.split('/').slice(2).filter(Boolean).join('/');
  return `/${target}${rest ? `/${rest}` : ''}`;
}

const ITEMS: readonly { locale: Locale; label: string }[] = [
  { locale: 'en', label: 'EN' },
  { locale: 'th', label: 'ไทย' },
];

/**
 * EN/ไทย as the same segmented control as ThemeToggle (amendment A02): the
 * `.seg` pill and its one sliding `.thumb` are reused from globals.css as-is
 * (R19) -- `--n` fixes the thumb's width to two slots (its fallback is 3,
 * for ThemeToggle's Auto/Light/Dark) and `--i` is the current locale's
 * index, so only the thumb's `transform` ever animates, never a per-link
 * background swap.
 *
 * These stay real links, not radio buttons: each language is its own route
 * (/en, /th) with its own hreflang, so the switch works without JavaScript
 * and search engines see both. `aria-current="page"` marks the one you're
 * already on -- the same attribute any other current-page nav link in this
 * codebase uses -- and it still drives the thumb, because `current` (read
 * from the pathname on every render, including right after a same-tree
 * client navigation lands) is what sets `--i`.
 *
 * `.seg`'s own `button`/`button[aria-checked="true"]` rules are scoped to
 * <button> and never match these <a> tags, so locale-toggle.css adds the
 * minimum `.lt-seg` rules for that -- see its own comment for why, and this
 * task's report for the merge note.
 *
 * The group is labelled in the CURRENT page's language; the two labels are
 * always the language's own name.
 */
export default function LocaleToggle({ wide = false }: { wide?: boolean }) {
  const pathname = usePathname() ?? '/en';
  const current: Locale = pathname.split('/')[1] === 'th' ? 'th' : 'en';
  const index = current === 'th' ? 1 : 0;
  return (
    <div
      role="group"
      aria-label={dict[current].navLanguage}
      className={wide ? 'seg lt-seg lt-wide' : 'seg lt-seg'}
      style={{ ['--n' as string]: '2', ['--i' as string]: String(index) }}
    >
      <span className="thumb" aria-hidden="true" />
      {ITEMS.map(({ locale, label }) => (
        <Link
          key={locale}
          href={switchLocaleHref(pathname, locale)}
          prefetch={false}
          lang={locale}
          hrefLang={locale}
          aria-current={current === locale ? 'page' : undefined}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
