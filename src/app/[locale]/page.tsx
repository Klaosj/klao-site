import HeroMonument from '@/components/motion/HeroMonument';
import PointerFx from '@/components/motion/PointerFx';
import AboutBand from '@/components/sections/AboutBand';
import ClientsBand from '@/components/sections/ClientsBand';
import ContactBand from '@/components/sections/ContactBand';
import CraftBand from '@/components/sections/CraftBand';
import CvBand from '@/components/sections/CvBand';
import Hero from '@/components/sections/Hero';
import SkillsBand from '@/components/sections/SkillsBand';
import WorkGrid from '@/components/sections/WorkGrid';
import { getCareer, getFeaturedProjects, getProfile, getSkills } from '@/lib/content';
import { assertLocale } from '@/lib/locale';

// See layout.tsx: a layout-level `dynamicParams = false` poisons
// writing/[slug], so it is set per leaf page instead.
export const dynamicParams = false;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = assertLocale((await params).locale);
  const [profile, projects, career, skills] = await Promise.all([
    getProfile(),
    getFeaturedProjects(),
    getCareer(),
    getSkills(),
  ]);

  // Owner-supplied: profile.nameNative (the Thai display name) drives the
  // /th monument text, so the wordmark reads in Thai rather than a
  // transliterated Latin fragment. HeroMonument already rasterises Thai
  // (THAI_RANGE) -- no changes needed there. Falls back to the Latin first
  // name (uppercased) on /en, or on /th when nameNative is null.
  const wordmark =
    locale === 'th' && profile.nameNative
      ? profile.nameNative
      : profile.name.split(' ')[0].toUpperCase();

  return (
    <>
      <HeroMonument word={wordmark} heroSelector="#hero" />
      <PointerFx />
      <Hero profile={profile} locale={locale} />
      <AboutBand profile={profile} locale={locale} />
      <CraftBand locale={locale} />
      <WorkGrid projects={projects} locale={locale} />
      {/* Sits right before the Skills/CV pair on purpose: these names are
          the owner's credibility (BD is the client/employer relationships
          he's built), so the visitor sees the roll call of brands
          immediately before the toolbox and career timeline that back it
          up, not buried at the page's bottom. bg-light also breaks up the
          dark(Work) -> dark(Skills) -> deep(Cv) run that would otherwise
          repeat CraftBand's own `deep` two bands later -- Work(dark) ->
          Clients(light) -> Skills(dark) -> Cv(deep) -> Contact(dark) keeps
          no two adjacent bands on the same token. */}
      <ClientsBand clients={profile.clients} locale={locale} />
      <SkillsBand skills={skills} locale={locale} />
      <CvBand entries={career} locale={locale} resumeUrl={profile.resumeUrl} />
      <ContactBand profile={profile} locale={locale} />
    </>
  );
}
