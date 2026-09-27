import { followTarget } from './deep-link';
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

type ClickLike = { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean };

/** A plain left click. New-tab and new-window clicks belong to the browser
 *  (the same rule as P4's DeepLink). */
export const isPlainClick = (e: ClickLike): boolean => e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey);

/**
 * Follows a capsule or phone-menu section link in place (P1 final review I-1).
 * The scroll and the focus move are P4's followTarget, the one in-page path
 * every deep link takes: 76 px clearance, focus on the section's heading, so
 * the reader's next Tab continues from there instead of from the nav.
 * replaceState keeps the address in step without a history entry per click.
 * Returns false when the section is not on this page (every route but home),
 * and the link then navigates to `/{locale}#id` as before.
 */
export function followSection(sec: NavSection): boolean {
  if (!followTarget(sec)) return false;
  history.replaceState(null, '', `#${sec}`);
  return true;
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
