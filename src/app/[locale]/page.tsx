import ByDay from '@/components/sections/ByDay';
import CareerBand from '@/components/sections/CareerBand';
import ClientsBand from '@/components/sections/ClientsBand';
import ContactBand from '@/components/sections/ContactBand';
import Hero from '@/components/sections/Hero';
import QuestionsBand from '@/components/sections/QuestionsBand';
import TourBand from '@/components/sections/TourBand';
import WorkDeck from '@/components/sections/WorkDeck';
import { getCareer, getFeaturedProjects, getProfile, getQuestions, getSkills, getStory } from '@/lib/content';
import { assertLocale } from '@/lib/locale';

// See layout.tsx: a layout-level `dynamicParams = false` poisons
// writing/[slug], so it is set per leaf page instead.
export const dynamicParams = false;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = assertLocale((await params).locale);
  const [profile, projects, career, skills, questions, story] = await Promise.all([
    getProfile(),
    getFeaturedProjects(),
    getCareer(),
    getSkills(),
    getQuestions(),
    getStory(),
  ]);

  return (
    <>
      <Hero profile={profile} locale={locale} />
      <TourBand projects={projects} locale={locale} />
      <WorkDeck projects={projects} locale={locale} />
      <QuestionsBand questions={questions} locale={locale} />
      <ClientsBand clients={profile.clients} locale={locale} />
      {/* C7: what he shipped (#work), then where he has worked (#career).
          The toolbox lives inside the career band (#toolbox). */}
      <CareerBand entries={career} skills={skills} locale={locale} resumeUrl={profile.resumeUrl} />
      {/* C7: then how he works (#story) -- the prologue and six chapters that
          replace the old About and Craft bands. */}
      <ByDay profile={profile} chapters={story} locale={locale} />
      <ContactBand profile={profile} locale={locale} />
    </>
  );
}
