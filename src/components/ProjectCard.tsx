import Link from 'next/link';
import { dict } from '@/lib/dictionary';
import type { Locale, Project } from '@/lib/models';

// Alt text describing what each real screenshot actually SHOWS -- keyed by
// the asset path, not built from project.name/description like WorkDeck's
// `${name} — ${description}` alt on this same pair of images. That format
// duplicates the row's own visible <h3> name and <p> description right
// beside the image, so a screen reader announces the same two facts twice
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

// Blog-row layout (owner request 2026-08-15): /projects reads as a story
// index, not a card grid -- thumbnail beside a question-led text block,
// one row per project. Link rules:
// - storied (slug set): ONE internal "Read the story" link; live/repo stay
//   off the row entirely -- they belong to the story page's receipts
//   footer, the same division of labor WorkDeck's storied slides use.
// - unstoried: live/repo render as their own small links, each only when
//   its URL exists. NOT a whole-row anchor: a project with BOTH URLs used
//   to silently drop the repo link under that shape (this component's own
//   pre-2026-08-15 history), and two separate links can't lose one.
export default function ProjectCard({ project, locale }: { project: Project; locale: Locale }) {
  const t = dict[locale];
  return (
    <div className="flex flex-col gap-4 py-6 sm:flex-row sm:items-start sm:gap-6">
      {project.imageSrc ? (
        <img
          src={project.imageSrc}
          alt={IMAGE_ALT[project.imageSrc] ?? `${project.name} interface screenshot`}
          width={800}
          height={450}
          loading="lazy"
          decoding="async"
          className="aspect-video w-full rounded object-cover sm:w-64 sm:shrink-0"
        />
      ) : (
        <div className="aspect-video w-full rounded bg-line sm:w-64 sm:shrink-0" />
      )}
      <div className="min-w-0">
        {/* Question leads when present -- same question-forward principle as
            the home deck's slides; absent question, the row starts at the
            name. */}
        {project.question && (
          <p className="text-[13px] italic text-peri">{project.question[locale]}</p>
        )}
        <h3 className="mt-1 font-semibold">{project.name}</h3>
        <p className="mt-1 text-sm text-soft">{project.description[locale]}</p>
        {/* Stack is a build-type fact (spec 2026-08-15 §4) — business rows
            never show it, and an empty stack renders no empty element. */}
        {project.type === 'build' && project.stack.length > 0 && (
          <p className="mt-3 text-xs text-soft">{project.stack.join(' · ')}</p>
        )}
        {/* Pill buttons (owner request 2026-08-15: "make the buttons stand
            out"): the story CTA is the accented one -- peri outline that
            fills on hover -- while live/repo stay neutral outlines. Real
            padding gives each pill its WCAG 2.5.8 hit area, so the old
            p-2/-m-2 hack is gone. */}
        {project.slug ? (
          <p className="mt-4 text-xs">
            <Link
              href={`/${locale}/work/${project.slug}`}
              className="inline-flex items-center rounded-full border border-peri-deep px-4 py-2 font-semibold text-peri transition-colors hover:bg-peri hover:text-dark"
            >
              {t.readStory} →
            </Link>
          </p>
        ) : (
          (project.liveUrl || project.repoUrl) && (
            <p className="mt-4 flex gap-3 text-xs">
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border border-line px-4 py-2 font-medium transition-colors hover:border-peri hover:text-peri"
                >
                  {t.liveSite}
                </a>
              )}
              {project.repoUrl && (
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border border-line px-4 py-2 font-medium transition-colors hover:border-peri hover:text-peri"
                >
                  {t.viewCode}
                </a>
              )}
            </p>
          )
        )}
      </div>
    </div>
  );
}
