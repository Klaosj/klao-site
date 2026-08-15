import { dict } from '@/lib/dictionary';
import type { Locale, Project } from '@/lib/models';

// Alt text describing what each real screenshot actually SHOWS -- keyed by
// the asset path, not built from project.name/description like WorkDeck's
// `${name} — ${description}` alt on this same pair of images. That format
// duplicates the card's own visible <h3> name and <p> description right
// below the image, so a screen reader announces the same two facts twice
// (flagged in review). Real intrinsic size for both is 800x450 (verified
// with `sips -g pixelWidth -g pixelHeight`). Locale-invariant on purpose:
// these describe the fixed pixels of a static screenshot (which don't
// re-render per locale), not translated UI copy, so there is no dictionary
// key to route this through -- see SiteNav/LocaleToggle's aria-label
// comments for the pattern this deliberately is NOT (inventing inline Thai
// strings for UI chrome). Falls back to a generic, still non-duplicating
// description for any project whose image isn't one of these two known
// fixture assets (e.g. a future Notion-sourced screenshot with no caption).
const IMAGE_ALT: Record<string, string> = {
  '/images/gonai.jpg':
    'A trip recap screen showing 47 baht actually spent against a 450 baht budget, one cafe expense line item, and share and copy-link buttons.',
  '/images/dailybrief.jpg':
    'A Notion page showing a Thai-translated daily news digest split into category cards for economy, AI, tech and US stories.',
};

// Previously the whole card was one <a href={liveUrl ?? repoUrl ?? undefined}>,
// so a project with BOTH a live URL and a repo URL silently dropped the repo
// link -- invisible with every current fixture (liveUrl is null on all four),
// surfacing the first time a real Live URL gets filled in on Notion. Spec §3
// and F5 both say "links out (live app / GitHub)", plural. Fixed by not
// wrapping the card in an anchor at all: both links render in a small row at
// the bottom when present, each only rendered when its own URL exists, so a
// project with neither still renders as a plain (non-clickable) card exactly
// as before.
export default function ProjectCard({ project, locale }: { project: Project; locale: Locale }) {
  const t = dict[locale];
  return (
    <div className="flex h-full flex-col rounded-md border border-line bg-card p-4 transition-shadow hover:shadow-sm">
      {project.imageSrc ? (
        <img
          src={project.imageSrc}
          alt={IMAGE_ALT[project.imageSrc] ?? `${project.name} interface screenshot`}
          width={800}
          height={450}
          loading="lazy"
          decoding="async"
          className="mb-3 aspect-video w-full rounded object-cover"
        />
      ) : (
        <div className="mb-3 aspect-video w-full rounded bg-line" />
      )}
      <h3 className="font-semibold">{project.name}</h3>
      <p className="mt-1 flex-1 text-sm text-soft">{project.description[locale]}</p>
      {/* Stack is a build-type fact (spec 2026-08-15 §4) — business rows
          never show it, and an empty stack renders no empty element. */}
      {project.type === 'build' && project.stack.length > 0 && (
        <p className="mt-3 text-xs text-soft">{project.stack.join(' · ')}</p>
      )}
      {(project.liveUrl || project.repoUrl) && (
        // Hit-area fix (WCAG 2.5.8): both links render as bare underlined
        // text-xs, under the 24x24 CSS px minimum. `p-2` grows the
        // clickable box; the matching `-m-2` cancels that growth for layout
        // purposes (a negative margin shrinks the flow footprint back to
        // unpadded size without changing where the border-box -- the
        // actually clickable area -- gets painted or hit-tested), so the
        // visible underline, text and `gap-4` spacing are unchanged.
        <p className="mt-3 flex gap-4 text-xs">
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center p-2 -m-2 underline hover:text-soft"
            >
              {t.liveSite}
            </a>
          )}
          {project.repoUrl && (
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center p-2 -m-2 underline hover:text-soft"
            >
              {t.viewCode}
            </a>
          )}
        </p>
      )}
    </div>
  );
}
