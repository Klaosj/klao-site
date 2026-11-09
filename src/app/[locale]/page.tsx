import ByDay from '@/components/sections/ByDay';
import CareerBand from '@/components/sections/CareerBand';
import CaseStudies from '@/components/sections/CaseStudies';
import CloseBand from '@/components/sections/CloseBand';
import FaqBand from '@/components/sections/FaqBand';
import ProjectsIndex from '@/components/sections/ProjectsIndex';
import RecruiterHero from '@/components/sections/RecruiterHero';
import { visibleCases } from '@/lib/cases';
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
      {/* Recruiter Edition (2026-11-09, Klao approved the mockup): who, what role,
          four receipts and the résumé/email/LinkedIn actions on the first screen.
          It replaces the White Edition hero tour, the 2022 → 2026 signature scene
          and the film sheet on this page; those modules stay in the codebase
          (tests/no-dead-modules.test.ts keeps them). */}
      <RecruiterHero profile={profile} career={career} locale={locale} />
      {/* #cases: client work as case studies, names and figures left out. Drafts
          show on previews only (src/lib/cases.ts). */}
      <CaseStudies cases={visibleCases()} locale={locale} />
      {/* #work: side projects, business plays then builds; each row opens its
          sheet at #work/<key>. The page's one ProjectSheet dialog lives in here. */}
      <ProjectsIndex projects={projects} locale={locale} />
      {/* Where he has worked (#career), with the toolbox (#toolbox) inside. */}
      <CareerBand entries={career} skills={skills} locale={locale} resumeUrl={profile.resumeUrl} />
      {/* How he works (#story): the prologue and six chapters. */}
      <ByDay profile={profile} chapters={story} locale={locale} />
      {/* #faq: Klao's FAQ DB — fixtures until NOTION_DB_FAQ is set.
          ClientsBand stays in the codebase but is not rendered (spec §4). */}
      <FaqBand items={faq} locale={locale} />
      {/* #contact, last on the page. */}
      <CloseBand profile={profile} questions={questions} locale={locale} />
    </>
  );
}
