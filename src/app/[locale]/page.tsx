import ParticleField from '@/components/motion/ParticleField';
import PointerFx from '@/components/motion/PointerFx';
import AboutBand from '@/components/sections/AboutBand';
import ContactBand from '@/components/sections/ContactBand';
import CraftBand from '@/components/sections/CraftBand';
import CvBand from '@/components/sections/CvBand';
import Hero from '@/components/sections/Hero';
import WorkGrid from '@/components/sections/WorkGrid';
import { getCareer, getFeaturedProjects, getProfile } from '@/lib/content';
import { assertLocale } from '@/lib/locale';

// See layout.tsx: a layout-level `dynamicParams = false` poisons
// writing/[slug], so it is set per leaf page instead.
export const dynamicParams = false;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = assertLocale((await params).locale);
  const [profile, projects, career] = await Promise.all([
    getProfile(),
    getFeaturedProjects(),
    getCareer(),
  ]);

  // Owner-supplied and still undecided. Until it is, derive from the profile
  // rather than guessing a brand name.
  const wordmark = (profile.name.split(' ')[0] ?? '').toUpperCase();

  return (
    <>
      <ParticleField word={wordmark} heroSelector="#hero" />
      <PointerFx />
      <Hero profile={profile} locale={locale} />
      <AboutBand profile={profile} locale={locale} />
      <CraftBand locale={locale} />
      <WorkGrid projects={projects} locale={locale} />
      <CvBand entries={career} locale={locale} />
      <ContactBand profile={profile} locale={locale} />
    </>
  );
}
