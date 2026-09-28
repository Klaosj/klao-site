import Link from 'next/link';
import DeepLink from '@/components/DeepLink';
import { Icon, type IconName } from '@/components/icons';
import LocaleToggle from '@/components/LocaleToggle';
import ThemeToggle from '@/components/ThemeToggle';
import { getCareer, getFeaturedProjects, getPosts, getProfile, getQuestions } from '@/lib/content';
import { dict } from '@/lib/dictionary';
import { formatDate } from '@/lib/format';
import type { Locale } from '@/lib/models';
import { projectKey, sheetHash } from '@/lib/sheet-url';
import './site-footer.css';

// Async server component that fetches its own data, as before -- layout.tsx
// just passes the locale. Every getter here is cache()-wrapped
// (src/lib/content.ts), so on the home route these calls reuse the page's
// own fetches instead of costing a second Notion round trip.
//
// Spec §10 trim ("footer columns 4 -> 3"): the prototype's three link
// columns stay (Projects · Career · Elsewhere) and its fourth column,
// Appearance + Language, moves down beside the legal line.
export default async function SiteFooter({ locale = 'en' }: { locale?: Locale } = {}) {
  const [profile, projects, career, posts, questions] = await Promise.all([
    getProfile(),
    getFeaturedProjects(),
    getCareer(),
    getPosts(),
    getQuestions(),
  ]);
  const t = dict[locale];
  // Honest freshness (wave 2, spec §6): the newest date the CMS actually
  // has. Posts and questions are its only dated sources and both arrive
  // newest first. No dates -> no clause, never a fake one.
  const newest =
    [posts[0]?.date, questions[0]?.date].filter((d): d is string => Boolean(d)).sort().pop() ?? null;
  // P2 S-7 / ledger ruling: a Career entry with no Company text maps to an
  // empty key (slugKey('') === ''), which link-target's CAREER_RE can never
  // match -- DeepLink would fall back to a plain, unclickable <span>. Drop
  // those rows here instead of showing a dead-looking link in the footer.
  const careerLinks = career.filter((c) => c.key);
  // S-7 (carried from ProjectsIndex's Row / project-tour.ts's TourSlide): a
  // project with a Thai-only name and no Notion Slug gives projectKey('') ->
  // sheetHash('') is the unparseable '#work/', a link that changes the URL
  // hash and opens nothing. Dropped here rather than shown, same as
  // careerLinks above -- "All projects" already covers it.
  const projectLinks = projects.filter((p) => projectKey(p) !== '');
  const elsewhere = [
    profile.linkedin ? { href: profile.linkedin, icon: 'linkedin-logo', label: 'LinkedIn' } : null,
    profile.github ? { href: profile.github, icon: 'github-logo', label: 'GitHub' } : null,
    profile.resumeUrl ? { href: profile.resumeUrl, icon: 'file-pdf-duotone', label: t.resumeShort } : null,
  ].filter((l): l is { href: string; icon: IconName; label: string } => l !== null);

  return (
    <footer className="site-foot">
      <div className="wrap">
        <div className="foot-cols">
          {/* No length guard here, unlike Career and Elsewhere: "All projects" is always present (C12), so this column always renders. */}
          <div>
            <h3>{t.navWork}</h3>
            <ul>
              <li>
                {/* C12 ledger ruling: the footer links the standalone
                    /projects page ("All projects") but not /writing -- it
                    has no posts yet, and linking an empty page would read
                    as unfinished. Real next/link: a page navigation, not a
                    sheet or in-page deep link. */}
                <Link href={`/${locale}/projects`}>{t.allProjects}</Link>
              </li>
              {projectLinks.map((p) => (
                <li key={p.id}>
                  {/* Plain <a>, not next/link: the sheet (P2) opens on the
                      hashchange a normal link fires, and from any other
                      route this loads the home page with the sheet open. */}
                  <a href={`/${locale}${sheetHash(projectKey(p))}`}>{p.name}</a>
                </li>
              ))}
            </ul>
          </div>
          {careerLinks.length > 0 && (
            <div>
              <h3>{t.navCareer}</h3>
              <ul>
                {careerLinks.map((c) => (
                  <li key={c.id}>
                    <DeepLink target={`career:${c.key}`} locale={locale}>
                      {c.company}
                    </DeepLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {elsewhere.length > 0 && (
            <div>
              <h3>{t.footElsewhere}</h3>
              <ul>
                {elsewhere.map((l) => (
                  <li key={l.href}>
                    {/* Repo convention for an outbound target="_blank" link
                        is rel="noreferrer" (NavMenu's LinkedIn/GitHub rows,
                        WorkDeck, ProjectTour, PostBody, SignatureScene). */}
                    <a href={l.href} target="_blank" rel="noreferrer">
                      <Icon name={l.icon} /> {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="foot-bottom">
          <div className="foot-legal t-legal">
            <p>
              © {new Date().getFullYear()} {profile.name}
              {newest && ` · ${t.contentUpdated} ${formatDate(newest, locale)}`}
            </p>
            <p className="foot-last">{t.footerNote}</p>
          </div>
          <div className="foot-prefs">
            <div className="foot-pref">
              <span className="foot-pref-label">{t.appearance}</span>
              <ThemeToggle locale={locale} />
            </div>
            <div className="foot-pref">
              <span className="foot-pref-label">{t.navLanguage}</span>
              {/* C2: P1's language control, not a duplicate LanguageLinks --
                  it derives the current locale and its own group label from
                  the pathname, and reuses .seg (R19) instead of a
                  footer-specific pill. */}
              <LocaleToggle />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
