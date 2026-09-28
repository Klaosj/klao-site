import { imageAlt } from './image-alt';
import type { Locale, Project, ProjectWash } from './models';
import { hostOf } from './project-view';
import { projectKey, sheetHash } from './sheet-url';

/** Dwell per frame in ms, by what the frame shows (prototype TOUR, 24 Sep): a
 *  dense app screen ('img', Aje) 6.0 s, a live landing page ('win', GoNai)
 *  5.5 s, the Notion-row vignette ('notion', klao-site) 7.0 s — it plays two
 *  beats, English then Thai at 3.2 s. Line drawings never tour. */
export const TOUR_DWELL_MS = { img: 6000, win: 5500, notion: 7000 } as const;

/** Thai is read a little slower at the same size; the prototype gives every
 *  Thai frame 10 % longer. */
export const TH_DWELL_FACTOR = 1.1;

export function tourDwellMs(p: Pick<Project, 'media'>, locale: Locale): number {
  const base = p.media === 'win' ? TOUR_DWELL_MS.win : p.media === 'notion' ? TOUR_DWELL_MS.notion : TOUR_DWELL_MS.img;
  return Math.round(base * (locale === 'th' ? TH_DWELL_FACTOR : 1));
}

/** A frame the stage can draw: a screenshot, or the Notion vignette (which
 *  needs no image). */
const showable = (p: Project): boolean =>
  p.media === 'notion' || (typeof p.imageSrc === 'string' && p.imageSrc.length > 0);

/**
 * Tour membership (spec §6): projects with the Tour checkbox, in TourOrder
 * (unnumbered ones last, then page order), skipping any that has nothing to
 * show. Until Klao adds the Tour checkbox in Notion no row is ticked, and the
 * tour falls back to the rule it had before White Edition — every project
 * with a screenshot, by page order — so the live hero never loses its stage
 * mid-migration (Review Focus #1). Never mutates the caller's array.
 */
export function tourProjects(projects: Project[]): Project[] {
  const ticked = projects.filter((p) => p.tour && showable(p));
  if (ticked.length > 0) {
    return [...ticked].sort(
      (a, b) => (a.tourOrder ?? Number.POSITIVE_INFINITY) - (b.tourOrder ?? Number.POSITIVE_INFINITY) || a.order - b.order,
    );
  }
  return projects.filter(showable).sort((a, b) => a.order - b.order);
}

/** The window-chrome title: the live host when there is one (it reads as
 *  "this runs at …"), else the project name. `hostOf` is the same host parse
 *  the project sheet uses (ruling D-6, folded into C-1) — one rule, not two. */
export function windowTitle(project: Project): string {
  return hostOf(project.liveUrl) ?? project.name;
}

/**
 * The small line under a tour subtitle, e.g. "GoNai · Live · gonai-three.vercel.app".
 * Kicker copy is written "<chapter> · <detail…>" ("Build · Live"); the tour
 * only shows builds and puts the name first, so it drops the chapter word. A
 * one-part kicker stays whole. A project framed as a live window ('win') adds
 * its host. Pre-migration rows (no kicker) use the status, then the bare name.
 */
export function tourKicker(p: Project, locale: Locale): string {
  const parts = [p.name];
  if (p.kicker) {
    const segments = p.kicker[locale].split(' · ');
    parts.push(...(segments.length > 1 ? segments.slice(1) : segments));
  } else if (p.status) {
    parts.push(p.status[locale]);
  }
  if (p.media === 'win' && p.liveUrl) {
    const host = windowTitle(p);
    if (host !== p.name) parts.push(host);
  }
  return parts.filter(Boolean).join(' · ');
}

/** One tour frame, flattened on the server so the client stage receives plain
 *  serialisable data in the page's own language. `href` is null for a project
 *  with no sheet to open at all -- S-7: a Thai-only name with no Notion Slug
 *  gives `projectKey` `''`, which `sheetHash` would turn into the unparseable
 *  `'#work/'` (ProjectsIndex's Row hits the same case and guards it the same
 *  way, C6-level). The stage renders that slide's caption as plain text
 *  instead of a link to nowhere. */
export interface TourSlide {
  id: string;
  name: string;
  kicker: string;
  question: string;
  href: string | null;
  media: 'img' | 'notion';
  src: string | null;
  /** The phone-only capture (P5 T18-f); null = the phone centre-crops `src`. */
  phoneSrc: string | null;
  alt: string;
  wash: ProjectWash;
  dwellMs: number;
}

/** What the klao-site frame draws: the site's own headline as a Notion row,
 *  then as the page it becomes (from Profile, so it always matches the h1). */
export interface TourVignette {
  titleEn: string;
  titleTh: string;
  photoSrc: string | null;
}

export function toTourSlides(projects: Project[], locale: Locale): TourSlide[] {
  return tourProjects(projects).map((p) => {
    const media = p.media === 'notion' ? 'notion' : 'img';
    const src = media === 'img' ? p.imageSrc : null;
    const key = projectKey(p);
    return {
      id: p.id,
      name: p.name,
      kicker: tourKicker(p, locale),
      question: (p.question ?? p.description)[locale],
      href: key ? sheetHash(key) : null,
      media,
      src,
      phoneSrc: media === 'img' ? p.screenshotPhone : null,
      alt: p.alt?.[locale] || (src ? imageAlt(src, p.name) : ''),
      wash: p.wash,
      dwellMs: tourDwellMs(p, locale),
    };
  });
}
