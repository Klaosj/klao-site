import AboutBand from '@/components/sections/AboutBand';
import ClientsBand from '@/components/sections/ClientsBand';
import ContactBand from '@/components/sections/ContactBand';
import CraftBand from '@/components/sections/CraftBand';
import CvBand from '@/components/sections/CvBand';
import Hero from '@/components/sections/Hero';
import QuestionsBand from '@/components/sections/QuestionsBand';
import SkillsBand from '@/components/sections/SkillsBand';
import TourBand from '@/components/sections/TourBand';
import WorkDeck from '@/components/sections/WorkDeck';
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
      <Hero profile={profile} locale={locale} />
      <TourBand projects={projects} locale={locale} />
      <AboutBand profile={profile} locale={locale} />
      <CraftBand locale={locale} />
      <WorkDeck projects={projects} locale={locale} />
      <QuestionsBand questions={questions} locale={locale} />
      <ClientsBand clients={profile.clients} locale={locale} />
      <SkillsBand skills={skills} locale={locale} />
      <CvBand entries={career} locale={locale} resumeUrl={profile.resumeUrl} />
      <ContactBand profile={profile} locale={locale} />
    </>
  );
}
