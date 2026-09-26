import type { Locale, Profile } from './models';

/**
 * C7: the capsule's section links, in page order. Contact is not in this list:
 * it is the capsule's own pill (and the thumb bar's first button), because it
 * is an action, not a place to read.
 */
export const NAV_SECTIONS = ['work', 'career', 'story', 'faq'] as const;
export type NavSection = (typeof NAV_SECTIONS)[number];

/** The dictionary key for each section link's label. */
export const NAV_LABEL_KEY = {
  work: 'navWork',
  career: 'navCareer',
  story: 'navStory',
  faq: 'navFaq',
} as const satisfies Record<NavSection, string>;

/**
 * A home-page anchor that works from every route: a bare hash on the home page
 * (the browser scrolls in place), `/{locale}#id` everywhere else, so a link
 * never points at an id the current page doesn't have. The same rule as the old
 * SiteNav's `anchorHref`, shared now by the capsule and the phone menu.
 */
export function sectionHref(hash: `#${string}`, pathname: string, locale: Locale): string {
  const home = pathname === `/${locale}` || pathname === `/${locale}/`;
  return home ? hash : `/${locale}${hash}`;
}

/**
 * The first word of the owner's name -- the brand mark's visible letter and
 * the accessible name it starts with (WCAG 2.5.3). Preflight ruling C8: the
 * capsule (SiteNav, T9), the phone menu (NavMenu) and the hero tour (T11)
 * all derive it from here rather than each repeating
 * `.trim().split(/\s+/)[0]` on their own.
 */
export function firstName(profile: Pick<Profile, 'name'>): string {
  return profile.name.trim().split(/\s+/)[0];
}
