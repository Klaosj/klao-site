// Not wired up yet: Next only loads this file when `experimental.globalNotFound`
// is on in next.config.ts (Next 15.5.26; the config schema and the dev
// banner both still list it under "Experiments (use with caution)" --
// re-check this file's own assumptions on each Next upgrade), which this
// lane doesn't own -- see the Merge notes in the P5 lane-A report for the
// exact config diff and why src/app/not-found.tsx can't just be renamed in
// place. Until that flag lands, this file has no importer and no route;
// not-found.tsx is what actually runs.
//
// Root-cause note (found via Lane B's QA runner, reproduced against a cold
// `npx next dev`): under webpack dev (never under `next build`), a genuinely
// unmatched path (e.g. /en/qa-missing-page) crashes with "not-found.tsx
// doesn't have a root layout" and every later request 500s until a restart.
// Next's dev-only auto-fix (verifyRootLayout in
// node_modules/next/dist/lib/verify-root-layout.js) tries to *write* a root
// layout.tsx for you when one is missing, but its `availableDir` walk pops
// the page's own path segment off first and never assigns a fallback for a
// page that sits directly in `app/` (our case: not-found.tsx has zero
// segments left after that pop) once any *other* layout exists in the tree
// ([locale]/layout.tsx does) -- so the loop it should run in never executes,
// `availableDir` stays `undefined`, and it silently gives up instead of
// throwing or logging. `next build` doesn't hit this at all: it exits before
// ever trying the dev auto-fix. This is a real Next.js dev-mode gap, not
// something P0-P4 broke -- it is already present at the P4 merge base
// (cf64a0f), unrelated to any P5 change.
//
// `experimental.globalNotFound` sidesteps the whole "no root layout"
// problem: this file becomes ITS OWN root boundary and supplies
// `<html>`/`<body>` directly, so [locale]/layout.tsx's absence stops
// mattering for this one synthetic route.
//
// P1 (review, 28 Sep): this page is STATIC -- Next prerenders one
// `_not-found.html` at build time, when there is no real visited URL to
// read a locale from (`usePathname()` during static generation resolves to
// something that matches neither `en` nor `th`). A first version of this
// file used `usePathname()` client-side to pick ONE locale's copy to
// render, which meant the STATIC payload was always the English copy, and
// a Thai visitor's client would immediately want different text --
// React's hydration-content-mismatch recovery (error #418) then discarded
// the whole tree and re-rendered it from scratch client-side, wiping the
// pre-paint script's `js`/`data-theme` work with it (a saved dark theme
// went white). Fix (option b of three considered): render BOTH locale
// copies unconditionally, identically on server and client -- no text
// content ever differs between them, so there is nothing left to mismatch
// -- and let plain CSS pick which one is visible, keyed off `<html lang>`.
// `<html lang>` itself starts as the server's static "en" default and is
// corrected by the pre-paint script below, which is the one piece of this
// page that legitimately runs after the static HTML was generated: it
// reads the real `location.pathname` in the visitor's own browser, before
// first paint, same timing guarantee as the theme choice. No React hook
// remains involved in picking anything -- resolveLocale below is kept
// exported (PR9: a pure helper, exercised by its own tests) but has no
// caller left in this file; see its own comment.
import './globals.css';

import Link from 'next/link';
import { dict } from '@/lib/dictionary';
import type { Locale } from '@/lib/models';
import { THEME_STORAGE_KEY } from '@/lib/theme';
import { eyebrowFont } from '@/lib/typography';

// Kept and exported per PR9 (a pure helper safe to leave orphaned rather
// than delete, same reasoning as the P5 Task 3 dead-code sweep's contract
// exports) -- nothing in this file calls it any more now that both locale
// copies always render (see the file-top comment), but it is still
// directly unit-tested (tests/not-found.test.tsx), and matches the
// identical helper the two non-global not-found files each keep for the
// same route-convention-export reason (see not-found.tsx's comment).
export function resolveLocale(pathname: string | null): Locale {
  return pathname?.split('/')[1] === 'th' ? 'th' : 'en';
}

// Same theme logic as THEME_PREPAINT_SCRIPT (theme.ts), plus one line:
// sets <html lang> from the real browser pathname before first paint (P1).
// This page's server HTML always says `lang="en"` with BOTH locale copies
// present in the body (below) -- only this script, reading the actual URL
// the visitor is on, can pick the right one before paint; there is no
// pure-CSS way to read the URL. A Thai visitor with JavaScript disabled
// therefore sees the English copy -- the same tradeoff the theme toggle
// already accepts for its own no-JS case (light, the CSS default).
export const GLOBAL_NOT_FOUND_PREPAINT_SCRIPT = `(function(){var d=document.documentElement;d.classList.add('js');try{var t=window.localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==='light'||t==='dark')d.setAttribute('data-theme',t);}catch(e){}d.lang=location.pathname.split('/')[1]==='th'?'th':'en';})();`;

// The CSS that shows only the copy matching <html lang>. display:none, not
// visibility:hidden or an opacity/clip trick (review P1's explicit ask):
// visibility/opacity still leave the hidden copy in the accessibility tree
// and (for visibility) still occupy layout space; display:none removes it
// from both, so a screen reader on either locale only ever encounters the
// one copy that's actually meant for it. The visible copy uses
// `display:contents` rather than `display:block` so the wrapper itself
// contributes no extra box -- the <section> inside still does its own
// flex/centering layout exactly as if the wrapper were not there.
export const GLOBAL_NOT_FOUND_STYLE = '[data-gnf-locale]{display:none}html[lang="en"] [data-gnf-locale="en"],html[lang="th"] [data-gnf-locale="th"]{display:contents}';

function NotFoundCopy({ locale }: { locale: Locale }) {
  const t = dict[locale];
  const moreLinks: { href: string; label: string }[] = [
    { href: `/${locale}/projects`, label: t.projects },
    { href: `/${locale}/writing`, label: t.writing },
    { href: `/${locale}/career`, label: t.career },
  ];
  return (
    <div data-gnf-locale={locale}>
      <section className="flex min-h-[70vh] flex-col items-center justify-center bg-canvas px-6 py-[16vh] text-center">
        <p className={`mb-5 text-[9.5px] uppercase text-ink-2 ${eyebrowFont(locale, 'tracking-[0.24em]')}`}>
          404
        </p>
        <h1 className="max-w-[20ch] text-[clamp(28px,4.6vw,52px)] font-bold leading-[1.15] tracking-[-0.025em] text-ink-1">
          {t.notFoundTitle}
        </h1>
        <p className="mt-5 max-w-[46ch] text-[14.5px] leading-[1.7] text-ink-2">{t.notFoundBody}</p>

        <Link href={`/${locale}`} className="btn btn-fill mt-10 inline-flex items-center gap-3">
          {t.backHome} <span aria-hidden="true">→</span>
        </Link>

        <nav className="mt-12 flex flex-wrap justify-center gap-8 text-[12.5px]">
          {moreLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-ink-2 underline underline-offset-4 transition-colors hover:text-ink-1"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </section>
    </div>
  );
}

export default function GlobalNotFound() {
  return (
    // suppressHydrationWarning (review I1, mirrors [locale]/layout.tsx:156-159):
    // THEME_PREPAINT_SCRIPT's logic (folded into the script below) adds `js`
    // and may set `data-theme` on <html> before React hydrates, and P1 adds
    // `lang` to that same before-hydration write -- so the client DOM
    // legitimately differs from the server HTML on this one element.
    // Without this, every root 404 logs a React hydration error once the
    // flag is on. It only silences attribute warnings for <html> itself,
    // not its children -- and there is nothing left for it to hide there:
    // both locale copies below are identical on server and client.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Static default; not locale-aware (see the file-top P1 comment) --
            a much smaller, pre-existing gap than the body-content flash this
            file's redesign fixes, and not one CSS or the pre-paint script
            can close without duplicating dictionary copy into raw JS. */}
        <title>{`${dict.en.notFoundTitle} · Klao`}</title>
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_NOT_FOUND_STYLE }} />
        <script dangerouslySetInnerHTML={{ __html: GLOBAL_NOT_FOUND_PREPAINT_SCRIPT }} />
      </head>
      <body>
        <NotFoundCopy locale="en" />
        <NotFoundCopy locale="th" />
      </body>
    </html>
  );
}
