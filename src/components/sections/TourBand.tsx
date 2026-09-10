import ProjectTour from '@/components/ProjectTour';
import type { Locale, Project } from '@/lib/models';
import { tourProjects } from '@/lib/project-tour';

// The tour band: the projects that have a real screenshot, walked through one
// at a time inside a window frame. Server component — ProjectTour owns the
// client boundary, same composition as QuestionsBand/ClientsBand around
// Reveal.
//
// ProjectTour returns a Fragment of two siblings (the tab list and the stage)
// so both halves can share one piece of playback state; `.tour-band` is the
// grid that places them side by side (project-tour.css).
export default function TourBand({ projects, locale }: { projects: Project[]; locale: Locale }) {
  // ClientsBand's rule: an empty band must not exist. ProjectTour already
  // renders nothing without screenshots, but the <section> would still ship
  // its 11vh of padding and an empty heading-less strip, so the band checks
  // the same membership rule the tour does and removes itself.
  if (tourProjects(projects).length === 0) return null;

  return (
    <section id="tour" className="relative z-[2] bg-deep px-6 py-[11vh]">
      <div className="tour-band">
        <ProjectTour projects={projects} locale={locale} />
      </div>
    </section>
  );
}
