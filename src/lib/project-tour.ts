import type { Project } from './models';

/** One slide of the hero tour, in milliseconds. Also drives the CSS progress
 *  bar (ProjectTour passes it as `--tour-ms`), so there is one number. */
export const TOUR_MS = 7000;

/** Membership rule (spec 2026-09-10 §4): the tour shows things you can SEE
 *  running — only projects with a real screenshot. A project without one keeps
 *  its deck slide, which carries its receipts in words and shows no picture at
 *  all, and joins the tour the day a screenshot is uploaded to Notion. Never
 *  mutates the caller's array. */
export function tourProjects(projects: Project[]): Project[] {
  return projects
    .filter((p) => typeof p.imageSrc === 'string' && p.imageSrc.length > 0)
    .sort((a, b) => a.order - b.order);
}

/** The window-chrome title: the live host when there is one (it reads as
 *  "this runs at …"), else the project name. */
export function windowTitle(project: Project): string {
  if (project.liveUrl) {
    try {
      return new URL(project.liveUrl).host;
    } catch {
      // fall through to the name
    }
  }
  return project.name;
}
