import ThaiText from '@/components/ThaiText';
import type { CSSProperties } from 'react';
import { HERO, HERO_PATH, PROOF_STATS, type ProofStat } from '@/content/recruiter';
import { mailtoHref } from '@/lib/format';
import type { CareerEntry, Locale, Profile } from '@/lib/models';
import './recruiter-hero.css';

// Same small-portrait swap HeroTour used (P1 final review I-3): the bundled
// portrait is 640 px, the chip is 48 px.
const SMALL_PHOTO: Record<string, string> = { '/images/portrait.jpg': '/images/portrait-128.jpg' };

/** Employers in career order, once each. A founder role is marked as such. */
export function experienceOrgs(career: CareerEntry[]): { name: string; founder: boolean }[] {
  const seen = new Set<string>();
  const out: { name: string; founder: boolean }[] = [];
  for (const c of [...career].sort((a, b) => a.order - b.order)) {
    const name = c.company.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push({ name, founder: /\bfounder\b/i.test(c.role.en) });
  }
  return out;
}

/**
 * Recruiter Edition first screen (2026-11-09): who he is, the role he does,
 * the path card (his five moves, two Actmedia figures, two earlier ones), and the three things a hiring manager
 * wants next -- the résumé, an email, LinkedIn. Server component: every word
 * is in the first HTML response. `#hero-cta` stays the hook SiteNav watches.
 */
function Stat({ s, locale, small = false }: { s: ProofStat; locale: Locale; small?: boolean }) {
  return (
    <li>
      <span className={small ? 'rh-n rh-n-s' : 'rh-n'}>
        {s.value}
        {s.unit && <small> {s.unit}</small>}
      </span>
      <span className="rh-l">
        <ThaiText text={s.label[locale]} />
      </span>
    </li>
  );
}

export default function RecruiterHero({
  profile,
  career,
  locale,
}: {
  profile: Profile;
  career: CareerEntry[];
  locale: Locale;
}) {
  const photo = profile.photoSrc ? (SMALL_PHOTO[profile.photoSrc] ?? profile.photoSrc) : null;
  const current = [...career].sort((a, b) => a.order - b.order)[0];
  const role = [current?.role[locale], profile.basedIn?.[locale]].filter(Boolean).join(' · ');
  const orgs = experienceOrgs(career);

  return (
    <section id="top" className="rh" aria-labelledby="hero-title">
      <div className="wrap rh-grid">
        <div className="rh-copy">
          <p className="rh-who rh-in-a">
            {photo && <img src={photo} alt="" width={48} height={48} fetchPriority="low" />}
            <span>
              <b>{profile.name}</b>
              {role && (
                <span className="rh-role">
                  <ThaiText text={role} />
                </span>
              )}
            </span>
          </p>
          <h1 id="hero-title" className="rh-h1 rh-in-b">
            <ThaiText text={HERO.titleLead[locale]} display />
            {/* The end point, marked with a highlight that draws in once (CSS only). */}
            <span className="rh-mark">
              <ThaiText text={HERO.titleAccent[locale]} display />
            </span>
          </h1>
          <p className="rh-lede rh-in-c">
            <ThaiText text={HERO.lede[locale]} />
          </p>
          <div id="hero-cta" className="rh-ctas rh-in-d">
            {profile.resumeUrl && (
              <a className="btn btn-fill" href={profile.resumeUrl} target="_blank" rel="noreferrer">
                {HERO.downloadResume[locale]}
              </a>
            )}
            {profile.email && (
              <a className="btn btn-out" href={mailtoHref(profile.email)}>
                {HERO.emailMe[locale]}
              </a>
            )}
            {profile.linkedin && (
              <a className="rh-lnk" href={profile.linkedin} target="_blank" rel="noreferrer">
                LinkedIn <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>
        </div>
        {/* The signature card: the h1's promise as a path that draws itself
            once, then the two Actmedia figures, then the earlier receipts. */}
        <div className="rh-card rh-in-d">
          <p className="rh-card-k">{HERO.nowAt[locale]}</p>
          <ol className="rh-path" aria-label={HERO.pathLabel[locale]}>
            {HERO_PATH[locale].map((t, i) => (
              <li key={t} style={{ ['--p' as string]: String(i) } as CSSProperties}>
                <span className="rh-dot" aria-hidden="true" />
                <span className="rh-pl">{t}</span>
              </li>
            ))}
          </ol>
          <ul className="rh-proof" aria-label={HERO.highlights[locale]}>
            {PROOF_STATS.slice(0, 2).map((s) => (
              <Stat key={s.value + s.label.en} s={s} locale={locale} />
            ))}
          </ul>
          {/* Visible label: these two are not Actmedia results (design review round 2). */}
          <div className="rh-earlier">
            <p className="rh-card-k" id="rh-earlier-k">
              {HERO.earlier[locale]}
            </p>
            <ul aria-labelledby="rh-earlier-k">
              {PROOF_STATS.slice(2).map((s) => (
                <Stat key={s.value + s.label.en} s={s} locale={locale} small />
              ))}
            </ul>
          </div>
        </div>
      </div>
      {orgs.length > 0 && (
        <p className="wrap rh-orgs rh-in-d">
          <span>{HERO.experienceAt[locale]}</span>
          {orgs.map((o) => (
            <b key={o.name}>
              {o.name}
              {o.founder && <span className="rh-founder"> ({HERO.founder[locale]})</span>}
            </b>
          ))}
        </p>
      )}
    </section>
  );
}
