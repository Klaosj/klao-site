import HeroTourStage from '@/components/HeroTourStage';
import ThaiText from '@/components/ThaiText';
import { dict } from '@/lib/dictionary';
import { mailtoHref } from '@/lib/format';
import type { Locale, Profile, Project } from '@/lib/models';
import { firstName } from '@/lib/nav';
import { toTourSlides } from '@/lib/project-tour';
import './hero-tour.css';

/**
 * The first screen (spec §4 row 1): who he is, in one headline, the two things
 * to do next, and the tour of what he has built (C7: `#top` with `#tour`
 * inside).
 *
 * Server component: every word here is in the first HTML response, so the hero
 * reads complete before (and without) JavaScript, the tour's first frame and
 * its subtitle included (Review Focus #4). HeroTourStage is the only client
 * island, and it receives plain serialisable slides built here.
 */
export default function HeroTour({ profile, projects, locale }: { profile: Profile; projects: Project[]; locale: Locale }) {
  const t = dict[locale];
  // Preflight ruling C8: derive it once, from nav.ts, rather than repeating
  // `.trim().split(/\s+/)[0]` here as its own copy (SiteNav and NavMenu use
  // the same helper).
  const first = firstName(profile);
  // The line under the headline is Profile.Now: the prototype's "Senior BD at
  // Actmedia · building AI tools nights & weekends" is the fixture's Now text,
  // word for word. Byline ("Bangkok · BD × Data Analytics …") is not on the
  // White Edition home page.
  const now = profile.now[locale];
  const slides = toTourSlides(projects, locale);
  const hasActions = Boolean(profile.email || profile.resumeUrl);

  return (
    <section id="top" className="ht-hero" aria-labelledby="hero-title">
      <div className="wrap ht-copy">
        <p className="ht-hi ht-in-a">
          {/* Decorative: the greeting beside it already names him. */}
          {profile.photoSrc && <img src={profile.photoSrc} alt="" width={64} height={64} />}
          <span>
            <ThaiText text={`${t.greeting} ${first}`} />
          </span>
        </p>
        {/* R25: every `.t-hero`/`.t-h2`/`.t-title`/`.t-panel`/`.t-faq` heading
            passes `display` to ThaiText, so a whole space-delimited Thai
            token is kept, not just the fixed keep-list words -- and it can
            still wrap onto the next line as a unit (ThaiText's `.kt`, not
            `.nw`'s hard nowrap), which a headline this long needs. */}
        <h1 id="hero-title" className="t-hero ht-h1 ht-in-b">
          <ThaiText text={profile.headline[locale]} display />
        </h1>
        {now && (
          <p className="ht-sub ht-in-c">
            <ThaiText text={now} />
          </p>
        )}
        {hasActions && (
          // #hero-cta is the hook SiteNav watches: once this row has scrolled
          // away above, Contact fills and the phone thumb bar appears
          // (thumb-bar.css's `html:has(#hero-cta)` rule).
          <div id="hero-cta" className="ht-ctas ht-in-d">
            {profile.email && (
              <a className="btn btn-fill" href={mailtoHref(profile.email)}>
                {t.startConversation}
              </a>
            )}
            {profile.resumeUrl && (
              // Repo convention for target="_blank" is rel="noreferrer"
              // (wave-1 review, carried into ThumbBar/NavMenu's résumé links
              // too): no referrer leaks to whatever serves the PDF.
              <a className="ht-lnk" href={profile.resumeUrl} target="_blank" rel="noreferrer">
                {t.resumePdf}
              </a>
            )}
          </div>
        )}
      </div>
      {slides.length > 0 && (
        <HeroTourStage
          slides={slides}
          vignette={{ titleEn: profile.headline.en, titleTh: profile.headline.th, photoSrc: profile.photoSrc || null }}
          locale={locale}
        />
      )}
    </section>
  );
}
