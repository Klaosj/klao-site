import CopyEmail from '@/components/CopyEmail';
import Reveal from '@/components/motion/Reveal';
import ThaiText from '@/components/ThaiText';
import { dict } from '@/lib/dictionary';
import { CONTACT_SUBJECT, mailto } from '@/lib/link-target';
import type { Locale, OpenQuestion, Profile } from '@/lib/models';
import './close-band.css';

// The one open question the close band asks (spec §6): the newest question
// whose status is `wondering` OR `building` (ledger ruling -- the newest
// OPEN question wins outright, status never overrides date order).
// getQuestions() already sorts newest first, so the first match here is
// simply the newest one.
export function pickOpenQuestion(questions: OpenQuestion[]): OpenQuestion | null {
  return questions.find((q) => q.status === 'wondering' || q.status === 'building') ?? null;
}

// #contact (C7): "Have something that should exist?" Server component.
// Every mail affordance hangs off profile.email, so a blank Email in Notion
// removes them all instead of rendering an empty `mailto:`.
export default function CloseBand({
  profile,
  questions,
  locale,
}: {
  profile: Profile;
  questions: OpenQuestion[];
  locale: Locale;
}) {
  const t = dict[locale];
  const open = profile.email ? pickOpenQuestion(questions) : null;
  const facts = [
    profile.basedIn ? { label: t.basedIn, value: profile.basedIn[locale] } : null,
    profile.workingIn ? { label: t.workingIn, value: profile.workingIn } : null,
  ].filter((f): f is { label: string; value: string } => f !== null);

  return (
    <section id="contact" className="close-band" aria-labelledby="close-h">
      <Reveal className="wrap">
        <h2 id="close-h" className="t-h2 close-h" tabIndex={-1}>
          <ThaiText text={t.contactHeading} display />
        </h2>
        {(profile.email || profile.resumeUrl) && (
          <div className="close-ctas">
            {profile.email && (
              <a className="btn btn-fill" href={mailto(profile.email, CONTACT_SUBJECT)}>
                {t.startConversation}
              </a>
            )}
            {profile.resumeUrl && (
              // Repo convention for target="_blank" is rel="noreferrer" (see
              // HeroTour.tsx, SiteFooter.tsx, NavMenu.tsx, ThumbBar.tsx).
              <a className="close-lnk" href={profile.resumeUrl} target="_blank" rel="noreferrer">
                {t.resumePdf}
              </a>
            )}
          </div>
        )}
        {profile.email && (
          <div>
            <CopyEmail email={profile.email} locale={locale} />
          </div>
        )}
        {facts.length > 0 && (
          <ul className="close-facts">
            {facts.map((f) => (
              <li key={f.label}>
                <span>{f.label}</span>
                <b>
                  <ThaiText text={f.value} />
                </b>
              </li>
            ))}
          </ul>
        )}
        {open && profile.email && (
          <p className="close-openq t-body">
            <ThaiText text={`${t.closeOpenQ} ${open.question[locale]}`} />{' '}
            <a href={mailto(profile.email, t.closeOpenQSubject)}>{t.closeTellMe}</a>
          </p>
        )}
      </Reveal>
    </section>
  );
}
