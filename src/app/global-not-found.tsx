// The 404 for a path that matches no page anywhere in the app (e.g.
// /en/nope, /th/nope), and for a first segment that is no locale (e.g.
// /foo.png), which the [locale] route 404s: in production through the leaf
// pages' `dynamicParams = false` (Next logs that as a benign
// "NoFallbackError"), otherwise through [locale]/layout.tsx's
// assertLocale() notFound(). Next routes all of these here because
// `experimental.globalNotFound` is on in next.config.ts -- still experimental
// in Next 15.5.26 (the config schema and the dev banner both list it under
// "Experiments (use with caution)"), so re-check this file's own assumptions
// on each Next upgrade. A notFound() thrown inside an already-matched
// [locale] route (e.g. writing/[slug]'s unknown-slug guard) is a different
// case: it still renders [locale]/not-found.tsx inside the locale layout.
//
// Root-cause note (found via Lane B's QA runner, reproduced against a cold
// `npx next dev`): before this file was wired up, under webpack dev (never
// under `next build`), a genuinely unmatched path (e.g. /en/qa-missing-page)
// crashed with "not-found.tsx doesn't have a root layout" and every later
// request 500'd until a restart. Next's dev-only auto-fix (verifyRootLayout
// in node_modules/next/dist/lib/verify-root-layout.js) tries to *write* a
// root layout.tsx for you when one is missing, but its `availableDir` walk
// pops the page's own path segment off first and never assigns a fallback
// for a page that sits directly in `app/` (the former src/app/not-found.tsx
// had zero segments left after that pop) once any *other* layout exists in
// the tree ([locale]/layout.tsx does) -- so the loop it should run in never
// executes, `availableDir` stays `undefined`, and it silently gives up
// instead of throwing or logging. `next build` doesn't hit this at all: it
// exits before ever trying the dev auto-fix. This is a real Next.js dev-mode
// gap, not something P0-P4 broke -- it was already present at the P4 merge
// base (cf64a0f). The flag commit deleted that root not-found.tsx: with the
// flag on, nothing routed to it any more, yet it still shipped its own chunk
// and a second copy of globals.css on every 404.
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
import { THEME_PREPAINT_SCRIPT } from '@/lib/theme';
import { eyebrowFont } from '@/lib/typography';

// Kept and exported per PR9 (a pure helper safe to leave orphaned rather
// than delete, same reasoning as the P5 Task 3 dead-code sweep's contract
// exports) -- nothing in this file calls it any more now that both locale
// copies always render (see the file-top comment), but it is still
// directly unit-tested (tests/not-found.test.tsx), and matches the
// identical helper [locale]/not-found.tsx keeps for the same
// route-convention-export reason (see that file's comment).
export function resolveLocale(pathname: string | null): Locale {
  return pathname?.split('/')[1] === 'th' ? 'th' : 'en';
}

// THEME_PREPAINT_SCRIPT (theme.ts) verbatim, then one more statement that
// sets <html lang> from the real browser pathname before first paint (P1)
// and, for Thai, the tab title (review n1). Composed rather than re-typed
// (review n3), so a later change to the theme logic or its storage key
// reaches this page too; both halves are strings built on the server, so
// the reuse ships no extra JS. This page's server HTML always says
// `lang="en"` with BOTH locale copies present in the body (below) -- only
// this script, reading the actual URL the visitor is on, can pick the right
// one before paint; there is no pure-CSS way to read the URL. A Thai
// visitor with JavaScript disabled therefore sees the English copy -- the
// same tradeoff the theme toggle already accepts for its own no-JS case
// (light, the CSS default).
export const GLOBAL_NOT_FOUND_PREPAINT_SCRIPT = `${THEME_PREPAINT_SCRIPT}(function(){var d=document.documentElement;d.lang=location.pathname.split('/')[1]==='th'?'th':'en';if(d.lang==='th')document.title=${JSON.stringify(
  `${dict.th.notFoundTitle} · Klao`,
)};})();`;

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
        {/* T12 m3: the site's eyebrow size (.t-eyebrow, spec §5.2: 21/25, phone 17/21, Thai
            leading 28/23), not the old 9.5 px label whisper. eyebrowFont and mb-5 are utilities, so
            they still win over the class's own tracking and margin. */}
        <p className={`t-eyebrow mb-5 uppercase text-ink-2 ${eyebrowFont(locale, 'tracking-[0.24em]')}`}>
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
    // THEME_PREPAINT_SCRIPT (the first half of the script below) adds `js`
    // and may set `data-theme` on <html> before React hydrates, and P1 adds
    // `lang` to that same before-hydration write -- so the client DOM
    // legitimately differs from the server HTML on this one element.
    // Without this, every root 404 logs a React hydration error. It only
    // silences attribute warnings for <html> itself, not its children: the
    // <title> carries its own (below), and the two locale copies in <body>
    // are identical on server and client.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* English is the static default (the page is prerendered once, with
            no visited URL); the pre-paint script swaps in the Thai title on
            a /th/ path (review n1). Two props keep that swap past hydration:
            - itemProp opts this <title> out of React 19's hoisting (see the
              react.dev <title> page). React re-writes a hoisted title from
              its props when it hydrates, which put the English title back
              (seen in dev on 28 Sep). There is no itemscope around it: the
              W3C checker flags that, while browsers and React ignore it.
            - suppressHydrationWarning: as a plain element, its text differs
              from the server's on a Thai path; React then keeps the
              browser's text instead of throwing a mismatch (#418). */}
        {/* Never give this file metadata.title: Next would add a second, hoisted <title> first, and the Thai swap is lost. */}
        <title itemProp="name" suppressHydrationWarning>{`${dict.en.notFoundTitle} · Klao`}</title>
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
