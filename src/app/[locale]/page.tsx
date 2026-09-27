import AboutBand from '@/components/sections/AboutBand';
import CloseBand from '@/components/sections/CloseBand';
import CraftBand from '@/components/sections/CraftBand';
import CvBand from '@/components/sections/CvBand';
import FaqBand from '@/components/sections/FaqBand';
import HeroTour from '@/components/sections/HeroTour';
import SkillsBand from '@/components/sections/SkillsBand';
import WorkDeck from '@/components/sections/WorkDeck';
import { getCareer, getFaq, getFeaturedProjects, getProfile, getQuestions, getSkills } from '@/lib/content';
import { assertLocale } from '@/lib/locale';

// See layout.tsx: a layout-level `dynamicParams = false` poisons
// writing/[slug], so it is set per leaf page instead.
export const dynamicParams = false;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = assertLocale((await params).locale);
  const [profile, projects, career, skills, faq, questions] = await Promise.all([
    getProfile(),
    getFeaturedProjects(),
    getCareer(),
    getSkills(),
    getFaq(),
    getQuestions(),
  ]);

  return (
    <>
      {/* White Edition (spec §4 row 1): the hero copy and the project tour are
          one section (#top with #tour inside). It replaces the old dark Hero
          and the separate tour band. The bands below are the pre-White-Edition
          ones; P2–P4 replace them in C7 order, so this list shrinks phase by
          phase. */}
      <HeroTour profile={profile} projects={projects} locale={locale} />
      <AboutBand profile={profile} locale={locale} />
      <CraftBand locale={locale} />
      <WorkDeck projects={projects} locale={locale} />
      <SkillsBand skills={skills} locale={locale} />
      <CvBand entries={career} locale={locale} resumeUrl={profile.resumeUrl} />
      {/* #faq (C7): Klao's FAQ DB — fixtures until NOTION_DB_FAQ is set.
          ClientsBand stays in the codebase but is no longer rendered (spec §4). */}
      <FaqBand items={faq} locale={locale} />
      {/* #contact (C7), last on the page: close CTA, email, Based in /
          Working in, and one open question from the Questions DB. */}
      <CloseBand profile={profile} questions={questions} locale={locale} />
    </>
  );
}
