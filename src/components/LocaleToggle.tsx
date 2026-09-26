'use client';

import { useEffect, useState } from 'react';
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
 * background swap. `.seg`'s child selectors are generalised to
 * `:is(button, a)` (P0 fix wave), so ThemeToggle's exact per-option markup
 * -- a `.seg-label` wrapper carrying `data-label`, which reserves the bold
 * (checked/current) width via a hidden `::after` duplicate so becoming
 * current never nudges the thumb or this link's own width -- is reused here
 * unchanged, and locale-toggle.css no longer needs to restate any of `.seg`'s
 * own button-scoped rules for `<a>` (see that file's comment).
 *
 * These stay real links, not radio buttons: each language is its own route
 * (/en, /th) with its own hreflang, so the switch works without JavaScript
 * and search engines see both. `aria-current="page"` marks the one you're
 * already on -- the same attribute any other current-page nav link in this
 * codebase uses, and exactly what `.seg > :is(button, a)[aria-current="page"]`
 * keys its bold/current styling on -- and it still drives the thumb, because
 * `current` (read from the pathname on every render, including right after a
 * same-tree client navigation lands) is what sets `--i`. Unlike ThemeToggle,
 * there is no stored-preference sync to settle after mount -- `usePathname`
 * already gives the right locale on the very first render, server and
 * client alike -- but `data-ready` still has a job: without it,
 * `.seg:not([data-ready]) .thumb` (the fix wave's mount-time guard) would
 * match this control FOREVER, since nothing else ever sets the attribute,
 * permanently killing the thumb's transition on every later click. One
 * requestAnimationFrame after mount lifts that, the same as ThemeToggle.
 * Link semantics only: no radiogroup, no arrow-key roving focus -- Tab
 * already moves between two real links.
 *
 * The group is labelled in the CURRENT page's language; the two labels are
 * always the language's own name.
 */
export default function LocaleToggle({ wide = false }: { wide?: boolean }) {
  const pathname = usePathname() ?? '/en';
  const current: Locale = pathname.split('/')[1] === 'th' ? 'th' : 'en';
  const index = current === 'th' ? 1 : 0;
  // See the doc comment above: this never corrects a mismatched guess (there
  // isn't one), it only lifts the fix wave's mount-time `:not([data-ready])`
  // transition guard so the thumb can animate on a later click.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const raf =
      typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => setReady(true)) : undefined;
    return () => {
      if (raf !== undefined) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div
      role="group"
      aria-label={dict[current].navLanguage}
      className={wide ? 'seg lt-seg lt-wide' : 'seg lt-seg'}
      data-ready={ready ? 'true' : undefined}
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
          <span className="seg-label" data-label={label}>
            {label}
          </span>
        </Link>
      ))}
    </div>
  );
}
