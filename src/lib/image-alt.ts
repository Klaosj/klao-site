// Alt text describing what each real screenshot actually SHOWS -- keyed by
// the asset path, never built from project.name/description: that format
// duplicates the name and description already rendered as visible text
// right beside the image, so a screen reader announces both facts twice
// (QA 2026-08-15 finding 4 — the same duplication ProjectCard had already
// fixed locally while WorkDeck still carried the anti-pattern; lifted here
// so both consumers share one map). Locale-invariant on purpose: these
// describe the fixed pixels of a static screenshot, not translated UI copy.
export const IMAGE_ALT: Record<string, string> = {
  '/images/gonai.jpg':
    'A white landing-page hero with an airplane-and-Thai-flag logomark, a bold headline about planning a full day out and knowing every baht before leaving, a budget search field, a black "start planning" button, and small floating cards noting a confirmed fare and a BTS fare between two stations.',
  '/images/dailybrief.jpg':
    'A Notion page showing a Thai-translated daily news digest split into category cards for economy, AI, tech and US stories.',
  '/images/aje.jpg':
    'A dark blue idea-review screen with a four-step tracker (Describe, Review, Test, Learn) at "Level 2 of 9", a Thai-language business idea with three side-by-side panels for the idea, its biggest uncertainty and the next test to run, a bulleted list of ways the idea could fail, and a bottom tab bar for ideas, review, frameworks and forecast.',
  '/images/aisecretary.jpg':
    'A floating dark quota panel titled "Aqua Quota" with tabs for six AI tools, a large countdown timer until the next reset, a blue progress bar at 28% of peak usage, a red cost bar reading $1,246 of a $25 cap and "100% over cap", and a bottom row of stats for requests, tokens, cache rate and dollar value.',
  '/images/klao-site.jpg':
    'A dark portfolio homepage hero with a circular profile photo, a bold headline reading "Business developer who builds his own tools", a location and skills subheading, a "Start a conversation" button next to an email address, and floating tag pills reading Business Development, Builds the systems too, and Bangkok.',
  '/images/tickerdesk.svg':
    'An abstract placeholder cover, not a screenshot of anything: ten pale blue-grey bars of unevenly rising height on a light background, connected by a thin line tracing their tops to a single dot above the tallest bar.',
};

// Fallback for images with no curated entry (e.g. a future Notion-sourced
// screenshot). Deliberately name-free: the project name is always visible
// text beside the image (QA finding 27).
export function imageAlt(src: string): string {
  return IMAGE_ALT[src] ?? 'Screenshot of the project interface.';
}
