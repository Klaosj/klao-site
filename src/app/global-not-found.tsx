'use client';

// Not wired up yet: Next only loads this file when `experimental.globalNotFound`
// is on in next.config.ts (Next >= 15.4), which this lane doesn't own -- see
// the Merge notes in the P5 lane-A report for the exact config diff and why
// src/app/not-found.tsx can't just be renamed in place. Until that flag
// lands, this file has no importer and no route; not-found.tsx is what
// actually runs.
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
// `experimental.globalNotFound` (stable path forward, Next >= 15.4) sidesteps
// the whole "no root layout" problem: this file becomes ITS OWN root
// boundary and supplies `<html>`/`<body>` directly, so [locale]/layout.tsx's
// absence stops mattering for this one synthetic route. That also fixes the
// `<html lang>` gap this repo could only patch with a post-hydration
// `useEffect` before (see not-found.tsx): with a real `<html lang={locale}>`
// on the server payload, no correction is needed at all.
import './globals.css';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { dict } from '@/lib/dictionary';
import type { Locale } from '@/lib/models';
import { THEME_PREPAINT_SCRIPT } from '@/lib/theme';
import { eyebrowFont } from '@/lib/typography';

// Same duplication rationale as not-found.tsx/[locale]/not-found.tsx: a
// named export shared between two Next.js route-convention files broke under
// Turbopack in an earlier fix (see not-found.tsx's own comment). Kept a
// third time here rather than risking that again.
export function resolveLocale(pathname: string | null): Locale {
  return pathname?.split('/')[1] === 'th' ? 'th' : 'en';
}

export default function GlobalNotFound() {
  const pathname = usePathname();
  const locale = resolveLocale(pathname);
  const t = dict[locale];

  const moreLinks: { href: string; label: string }[] = [
    { href: `/${locale}/projects`, label: t.projects },
    { href: `/${locale}/writing`, label: t.writing },
    { href: `/${locale}/career`, label: t.career },
  ];

  return (
    <html lang={locale}>
      <head>
        {/* Same script [locale]/layout.tsx inlines, and the reasoning
            not-found.tsx's fragment-based workaround explains (N9/CO-13) --
            here it has a real <head> to run in, like any other page. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_PREPAINT_SCRIPT }} />
      </head>
      <body>
        <section className="flex min-h-[70vh] flex-col items-center justify-center bg-canvas px-6 py-[16vh] text-center">
          <title>{`${t.notFoundTitle} · Klao`}</title>

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
      </body>
    </html>
  );
}
