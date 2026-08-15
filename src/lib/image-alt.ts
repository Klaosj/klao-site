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
    'A trip recap screen showing 47 baht actually spent against a 450 baht budget, one cafe expense line item, and share and copy-link buttons.',
  '/images/dailybrief.jpg':
    'A Notion page showing a Thai-translated daily news digest split into category cards for economy, AI, tech and US stories.',
};

// Fallback for images with no curated entry (e.g. a future Notion-sourced
// screenshot). Deliberately name-free: the project name is always visible
// text beside the image (QA finding 27).
export function imageAlt(src: string): string {
  return IMAGE_ALT[src] ?? 'Screenshot of the project interface.';
}
