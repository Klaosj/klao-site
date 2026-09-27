import AboutBand from '@/components/sections/AboutBand';
import ClientsBand from '@/components/sections/ClientsBand';
import ContactBand from '@/components/sections/ContactBand';
import CraftBand from '@/components/sections/CraftBand';
import CvBand from '@/components/sections/CvBand';
import HeroTour from '@/components/sections/HeroTour';
import ProjectsIndex from '@/components/sections/ProjectsIndex';
import QuestionsBand from '@/components/sections/QuestionsBand';
import Signature from '@/components/sections/Signature';
import SkillsBand from '@/components/sections/SkillsBand';
import { getCareer, getFeaturedProjects, getProfile, getQuestions, getSkills } from '@/lib/content';
import { assertLocale } from '@/lib/locale';

// See layout.tsx: a layout-level `dynamicParams = false` poisons
// writing/[slug], so it is set per leaf page instead.
export const dynamicParams = false;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = assertLocale((await params).locale);
  const [profile, projects, career, skills, questions] = await Promise.all([
    getProfile(),
    getFeaturedProjects(),
    getCareer(),
    getSkills(),
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
      {/* 2022 → 2026, straight after the tour (contract C7): the tour shows the apps running,
          this shows where one of them came from. The page's only scroll-linked scene; renders
          nothing when no project carries a LineageOf. */}
      <Signature projects={projects} locale={locale} />
      {/* Business plays, then builds; each row opens its sheet at #work/<key> (ProjectSheet). */}
      <ProjectsIndex projects={projects} locale={locale} />
      <AboutBand profile={profile} locale={locale} />
      <CraftBand locale={locale} />
      <QuestionsBand questions={questions} locale={locale} />
      <ClientsBand clients={profile.clients} locale={locale} />
      <SkillsBand skills={skills} locale={locale} />
      <CvBand entries={career} locale={locale} resumeUrl={profile.resumeUrl} />
      <ContactBand profile={profile} locale={locale} />
    </>
  );
}
