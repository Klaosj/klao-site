import { getPosts, getProfile, getQuestions } from '@/lib/content';
import { dict } from '@/lib/dictionary';
import { formatDate } from '@/lib/format';
import type { Locale } from '@/lib/models';
import { eyebrowFont } from '@/lib/typography';

// Async server component that fetches its own data, same as before this
// rewrite -- kept that way (rather than lifted to a `profile` prop) so its
// only consumer, layout.tsx, doesn't need to restructure its own data
// fetching just for the footer. getProfile() is wrapped in React's cache()
// (src/lib/content.ts), so this doesn't cost a second real fetch when
// RootLayout has already resolved the same call for SiteNav within the same
// request.
//
// `locale` is optional and defaults to 'en': the dark treatment below
// (bg-deep, a top hairline) has no locale-dependent COPY -- profile.name
// and the year render identically either way, which is why an earlier
// version of this file dropped the prop entirely. It still affects
// PRESENTATION, though -- the copyright line used a bare `font-mono`
// treatment regardless of locale (whole-branch review finding: no
// monospace face carries Thai glyphs, so any Thai text rendered through it
// falls back per-glyph). profile.name itself is a plain, locale-invariant
// string per src/lib/models.ts (always Latin today), so this line renders
// identically either way right now -- the optional default keeps that
// behaviour and this file's existing tests (which call `SiteFooter()` with
// no arguments) working unchanged, while still following the same locale
// convention as every other eyebrow-style label in the redesign. Nothing
// here links to "#": the previous LinkedIn/GitHub/email row was dropped as
// a duplicate of SiteNav's own social links, per the brief's "nothing that
// links to #".
export default async function SiteFooter({ locale = 'en' }: { locale?: Locale } = {}) {
  const [profile, posts, questions] = await Promise.all([getProfile(), getPosts(), getQuestions()]);
  const t = dict[locale];
  // Honest freshness (wave 2, spec §6): the newest date the CMS actually
  // has -- posts and questions are its only two dated sources (projects
  // deliberately carry none; see sitemap.ts). Both lists arrive date-desc
  // sorted, so the newest of each list's head is the site's newest. No
  // dates -> no line, never a fake one. Costs one Posts + one Questions
  // list query per ISR render in Notion mode (hourly, cache()-deduped
  // within a render).
  const newest =
    [posts[0]?.date, questions[0]?.date].filter((d): d is string => Boolean(d)).sort().pop() ?? null;
  return (
    <footer className="relative z-[2] border-t border-on-dark-faint bg-deep px-6 py-8 text-center">
      {newest && (
        <p className="mb-1 text-[11px] text-on-dark-soft">
          {t.contentUpdated} {formatDate(newest, locale)}
        </p>
      )}
      {/* Human micro-copy (T4), sits above the legal line. Plain text, no
          emoji -- per the brand voice rules. */}
      <p className="text-[11px] text-on-dark-soft">{t.footerNote}</p>
      <p className={`mt-2 text-[10.5px] uppercase text-on-dark-soft ${eyebrowFont(locale, 'tracking-[0.18em]')}`}>
        © {new Date().getFullYear()} {profile.name}
      </p>
    </footer>
  );
}
