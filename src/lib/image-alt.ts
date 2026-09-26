// Alt text describing what each real screenshot actually SHOWS. Two maps look
// the sentences up -- by asset path here, and by project name below, which is
// the only key the live site can match (see that map's own comment) -- but
// neither is BUILT from project.name/description: that format
// duplicates the name and description already rendered as visible text
// right beside the image, so a screen reader announces both facts twice
// (QA 2026-08-15 finding 4 — the same duplication ProjectCard had already
// fixed locally while WorkDeck still carried the anti-pattern; lifted here
// so both consumers share one map). Locale-invariant on purpose: these
// describe the fixed pixels of a static screenshot, not translated UI copy.
const GONAI =
  'A white landing-page hero with an airplane-and-Thai-flag logomark, a bold headline about planning a full day out and knowing every baht before leaving, a budget search field, a black "start planning" button, and small floating cards noting a confirmed fare and a BTS fare between two stations.';
const AJE =
  'A dark blue idea-review screen with a four-step tracker (Describe, Review, Test, Learn) at "Level 2 of 9", a Thai-language business idea with three side-by-side panels for the idea, its biggest uncertainty and the next test to run, a bulleted list of ways the idea could fail, and a bottom tab bar for ideas, review, frameworks and forecast.';
const KLAO_SITE =
  'A dark portfolio homepage hero with a circular profile photo, a bold headline reading "Business developer who builds his own tools", a location and skills subheading, a "Start a conversation" button next to an email address, and floating tag pills reading Business Development, Builds the systems too, and Bangkok.';

export const IMAGE_ALT: Record<string, string> = {
  '/images/gonai.jpg': GONAI,
  '/images/aje.jpg': AJE,
  '/images/klao-site.jpg': KLAO_SITE,
};

// The live site serves screenshots through /api/img/page/<row-id>/Screenshot — a URL that
// carries no filename — so the path map above can only ever match in fixture mode. The
// project's NAME travels with it either way, so the same sentences are keyed by name too and
// consulted second. Adding a screenshot in Notion without adding a line here still works: the
// generic fallback is the floor, never a wrong description.
export const IMAGE_ALT_BY_PROJECT: Record<string, string> = {
  Aje: AJE,
  GoNai: GONAI,
  'klao-site': KLAO_SITE,
};

// Fallback for images with no curated entry (e.g. a future Notion-sourced
// screenshot). Deliberately name-free: the project name is always visible
// text beside the image (QA finding 27).
export function imageAlt(src: string, projectName?: string): string {
  return (
    IMAGE_ALT[src] ??
    (projectName ? IMAGE_ALT_BY_PROJECT[projectName] : undefined) ??
    'Screenshot of the project interface.'
  );
}
