import BoldText from '@/components/BoldText';
import Reveal from '@/components/motion/Reveal';
import StoryDetail from '@/components/StoryDetail';
import ThaiText from '@/components/ThaiText';
import { dict } from '@/lib/dictionary';
import type { Locale, Profile, StoryChapter } from '@/lib/models';
import '../by-day.css';

type Props = { profile: Profile; chapters: StoryChapter[]; locale: Locale };

// Server component (spec §6 "By day", C7 `#story`). Every chapter is in the
// server HTML; Reveal only adds its fade-rise once html.js is set (C9), so a
// visitor without JavaScript reads the whole method. Replaces AboutBand and
// CraftBand: the prologue is the old About story, the rule labels are the
// old six craft imperatives. The chapters themselves, and their amendment
// A10 Short/Full control, live in StoryDetail (the section's only client
// code, same split CareerBand/CareerDetent already use).
export default function ByDay({ profile, chapters, locale }: Props) {
  const t = dict[locale];
  // Pre-migration Notion has no ClosingLine; the prototype's closing line is
  // the headline anyway, so the section still ends on the right sentence.
  const closing = profile.closingLine ?? profile.headline;

  return (
    <section id="story" className="section wrap" aria-labelledby="story-h">
      {/* Ruling C-3 (P3 preflight): `big` -- this headline block rises the
          prototype's 24 px, not P0 Reveal's 16 px default. */}
      <Reveal big className={profile.photoSrc ? 'bd-prologue' : 'bd-prologue bd-solo'}>
        <div>
          {/* Ruling C-5: eyebrows are display-ish copy, so this goes through
              ThaiText too (default, non-display mode -- it is one short
              line, not a heading that can itself wrap). */}
          <p className="t-eyebrow">
            <ThaiText text={t.storyEyebrow} />
          </p>
          {/* aboutHeading carries the prototype's By day headline verbatim.
              Ruling C-5: .t-h2 is a heading class, so ThaiText renders it in
              display mode (every Thai token kept whole, not just the
              date/unit/keep-list words default mode targets). */}
          <h2 id="story-h" className="t-h2">
            <ThaiText text={t.aboutHeading} display />
          </h2>
          <p className="t-lead">
            <ThaiText text={t.storyLead} />
          </p>
          {profile.prologue && profile.prologue[locale] && (
            <p className="bd-about">
              <BoldText text={profile.prologue[locale]} />
            </p>
          )}
        </div>
        {profile.photoSrc && (
          <img
            className="bd-portrait"
            src={profile.photoSrc}
            width={240}
            height={240}
            alt={t.portraitAlt}
            loading="lazy"
            decoding="async"
          />
        )}
      </Reveal>
      {chapters.length > 0 && <StoryDetail chapters={chapters} locale={locale} t={t} />}
      <Reveal big className="bd-close">
        <i className="bd-enddot" aria-hidden="true" />
        {/* A statement, not a heading: nothing sits under it. Ruling C-5:
            still a .t-h2 for size, so still display-mode ThaiText. */}
        <p className="t-h2 bd-closing">
          <ThaiText text={closing[locale]} display />
        </p>
        <a href="#top">{t.backToTour}</a>
      </Reveal>
    </section>
  );
}
