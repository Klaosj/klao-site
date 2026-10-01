import FilmSheet from '@/components/FilmSheet';
import ByDay from '@/components/sections/ByDay';
import CareerBand from '@/components/sections/CareerBand';
import CloseBand from '@/components/sections/CloseBand';
import FaqBand from '@/components/sections/FaqBand';
import HeroTour from '@/components/sections/HeroTour';
import ProjectsIndex from '@/components/sections/ProjectsIndex';
import Signature from '@/components/sections/Signature';
import {
  getCareer,
  getFaq,
  getFeaturedProjects,
  getProfile,
  getQuestions,
  getSkills,
  getStory,
} from '@/lib/content';
import { assertLocale } from '@/lib/locale';

// See layout.tsx: a layout-level `dynamicParams = false` poisons
// writing/[slug], so it is set per leaf page instead.
export const dynamicParams = false;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = assertLocale((await params).locale);
  const [profile, projects, career, skills, faq, questions, story] = await Promise.all([
    getProfile(),
    getFeaturedProjects(),
    getCareer(),
    getSkills(),
    getFaq(),
    getQuestions(),
    getStory(),
  ]);

  return (
    <>
      {/* White Edition (spec §4 row 1): the hero copy and the project tour are
          one section (#top with #tour inside). It replaces the old dark Hero
          and the separate tour band. */}
      <HeroTour profile={profile} projects={projects} locale={locale} />
      {/* 2022 → 2026, straight after the tour (contract C7): the tour shows the apps running,
          this shows where one of them came from. The page's only scroll-linked scene; renders
          nothing when no project carries a LineageOf. */}
      <Signature projects={projects} locale={locale} />
      {/* Business plays, then builds; each row opens its sheet at #work/<key> (ProjectSheet).
          The page's one ProjectSheet dialog lives in here -- no other section mounts one. */}
      <ProjectsIndex projects={projects} locale={locale} />
      {/* The film's sheet (#film), next to the project sheet: opened by the Film button in the
          tour pill. Server HTML is the empty dialog; nothing of the film loads until it opens. */}
      <FilmSheet locale={locale} />
      {/* C7: what he shipped (#work), then where he has worked (#career).
          The toolbox lives inside the career band (#toolbox). */}
      <CareerBand entries={career} skills={skills} locale={locale} resumeUrl={profile.resumeUrl} />
      {/* C7: then how he works (#story) -- the prologue and six chapters that
          replace the old About and Craft bands. */}
      <ByDay profile={profile} chapters={story} locale={locale} />
      {/* #faq (C7): Klao's FAQ DB — fixtures until NOTION_DB_FAQ is set.
          ClientsBand stays in the codebase but is no longer rendered (spec §4). */}
      <FaqBand items={faq} locale={locale} />
      {/* #contact (C7), last on the page: close CTA, email, Based in /
          Working in, and one open question from the Questions DB. */}
      <CloseBand profile={profile} questions={questions} locale={locale} />
    </>
  );
}
