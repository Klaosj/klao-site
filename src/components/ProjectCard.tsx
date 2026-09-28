import Link from 'next/link';
import ProjectFrame from '@/components/ProjectFrame';
import { dict } from '@/lib/dictionary';
import type { Locale, Project } from '@/lib/models';

// The img contract (800x450, lazy, async) and the IMAGE_ALT/IMAGE_ALT_BY_PROJECT
// lookup no longer live in this file at all -- both moved into ProjectFrame,
// with the alt lookup itself (image-alt.ts) shared further still, by the
// hero tour, the sheet and the signature scene (QA finding 4/27 fixed
// there). This component just wraps that shared frame at the row's own width;
// a project with no screenshot renders no frame at all (owner's call
// 2026-09-11), not the empty grey rectangle this file used to paint.

// Blog-row layout (owner request 2026-08-15): /projects reads as a story
// index, not a card grid -- thumbnail beside a question-led text block,
// one row per project. Link rules:
// - storied (slug set): ONE internal "Read the story" link; live/repo stay
//   off the row entirely -- they belong to the story page's own receipts
//   footer (src/app/[locale]/work/[slug]/page.tsx) instead.
// - unstoried: live/repo render as their own small links, each only when
//   its URL exists. NOT a whole-row anchor: a project with BOTH URLs used
//   to silently drop the repo link under that shape (this component's own
//   pre-2026-08-15 history), and two separate links can't lose one.
export default function ProjectCard({ project, locale }: { project: Project; locale: Locale }) {
  const t = dict[locale];
  return (
    <div className="flex flex-col gap-4 py-6 sm:flex-row sm:items-start sm:gap-6">
      {/* sm:mt-[3px] is optical, not structural (QA finding 26): flush tops
          LOOK misaligned because the text column starts with the question's
          cap-height, not its line-box top. Only from sm up, where the two
          columns actually sit side by side. */}
      {project.imageSrc && (
        <div className="w-full sm:mt-[3px] sm:w-64 sm:shrink-0">
          <ProjectFrame project={project} />
        </div>
      )}
      <div className="min-w-0">
        {/* Question leads when present -- same question-forward principle as
            the home deck's slides; absent question, the row starts at the
            name. */}
        {/* No italic in Thai (QA finding 13): Anuphan ships no italic face,
            so `italic` only gets a synthesised oblique that mangles Thai
            vowel/tone marks. The kram colour already carries the "this is the
            question" signal on its own, so TH simply drops the slant. */}
        {project.question && (
          <p className={`${locale === 'th' ? '' : 'italic '}text-[13px] text-kram`}>
            {project.question[locale]}
          </p>
        )}
        <h3 className="mt-1 font-semibold">{project.name}</h3>
        <p className="mt-1 text-sm text-ink-2">{project.description[locale]}</p>
        {/* Stack is a build-type fact (spec 2026-08-15 §4) — business rows
            never show it, and an empty stack renders no empty element. */}
        {project.type === 'build' && project.stack.length > 0 && (
          <p className="mt-3 text-xs text-ink-2">{project.stack.join(' · ')}</p>
        )}
        {/* Pill buttons (owner request 2026-08-15: "make the buttons stand
            out"): the story CTA is the accented one -- link-blue outline that
            fills on hover -- while live/repo stay neutral outlines. Real
            padding gives each pill its WCAG 2.5.8 hit area, so the old
            p-2/-m-2 hack is gone.

            Three QA fixes ride on this row. The neutral border is `ink-3`,
            not `line`: `line` is a 10 % hairline, below the 3:1 WCAG 1.4.11
            asks of an interactive boundary (finding 5); ink-3 clears it in
            both themes, and `line` stays correct for non-interactive dividers.
            Every pill uses the house 300ms ease so hover matches the rest of
            the site instead of Tailwind's 150ms default (finding 14). The
            arrow is aria-hidden so it isn't announced as "right arrow" after
            the link text (finding 6). */}
        {project.slug ? (
          <p className="mt-4">
            <Link
              href={`/${locale}/work/${project.slug}`}
              className="inline-flex items-center rounded-full border border-link px-4 py-2 text-[12px] font-semibold text-kram transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-kram hover:text-on-kram"
            >
              {t.readStory} <span aria-hidden="true">→</span>
            </Link>
          </p>
        ) : (
          (project.liveUrl || project.repoUrl) && (
            // flex-wrap (finding 23): both pills plus their padding overflow
            // the narrow text column on small screens otherwise.
            <p className="mt-4 flex flex-wrap gap-3">
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border border-ink-3 px-4 py-2 text-[12px] font-medium transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-kram hover:text-kram"
                >
                  {t.liveSite}
                </a>
              )}
              {project.repoUrl && (
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border border-ink-3 px-4 py-2 text-[12px] font-medium transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-kram hover:text-kram"
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
