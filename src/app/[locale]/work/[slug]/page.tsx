import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProjects, getProjectStory } from '@/lib/content';
import { dict } from '@/lib/dictionary';
import { assertLocale } from '@/lib/locale';
import { LOCALES, type Locale } from '@/lib/models';
import { deriveBodyDescription } from '@/lib/post-description';
import { SITE_URL } from '@/lib/site';
import PostBody from '@/components/PostBody';
import SectionLabel from '@/components/SectionLabel';

// Case-study-specific fallback pair for deriveBodyDescription (wave 1 task
// 3 lifted the body-summarizing logic out of derivePostDescription for
// exactly this reuse) -- a project whose story has a body but no paragraph
// block yet still needs a locale-correct, non-generic-feeling description
// rather than the writing posts' own fallback strings.
const storyFallbacks: Record<Locale, string> = {
  en: 'A build story from Klao — the question, what was tried, and the real numbers.',
  th: 'เรื่องราวการสร้างจากเกลา — คำถามตั้งต้น สิ่งที่ลอง และตัวเลขจริง',
};

export async function generateStaticParams() {
  const projects = await getProjects();
  return LOCALES.flatMap((locale) =>
    projects.filter((p) => p.slug).map((p) => ({ locale, slug: p.slug as string })),
  );
}

// Project stories live in Notion and are deliberately published between
// deploys (see klao-site project notes), so a slug added after the last
// build must still resolve without a redeploy -- that requires the default
// `dynamicParams: true` rather than forcing unknown slugs to 404. The real
// cost is broader than just a brand-new slug's first request: because
// content.ts rethrows outside the build phase, EVERY request for a slug not
// in generateStaticParams -- legit new stories, but also bogus and crawler
// slugs, forever -- is an uncached live Notion lookup, and any of them
// 500s instead of 404ing whenever Notion is degraded or rate-limited.
// 404-correctness for unknown slugs is permanently coupled to Notion's
// uptime.
//
// The pre-check below narrows that exposure. getProjects() is wrapped in
// React's cache() (getProjectsCached in content.ts) -- the same as
// writing/[slug]/page.tsx's getPosts() pre-check (getPostsCached) -- so
// within a single request the pre-check's own list query is free once
// either generateMetadata or the page has already paid for it once. But cache()
// only dedupes calls within a single request/render, not across requests,
// and the Notion SDK doesn't go through the global fetch Next.js patches --
// so a bogus/crawler slug still triggers a fresh live list query on every
// separate request. It's still a strictly cheaper one than
// getProjectStory()'s per-slug filtered query plus the full block-content
// fetch that request would otherwise also trigger. In fixture mode (no
// NOTION_TOKEN -- how this build currently runs) getProjects() is a
// synchronous local read, so the check is genuinely free there. Either way,
// an unknown slug now 404s without ever reaching fetchProjectStory.
//
// This also leaves the `locale` segment on this route dynamically
// resolvable at the framework level (no ancestor sets dynamicParams: false,
// unlike the four leaf pages in this route group -- see layout.tsx's
// generateStaticParams comment). A bogus locale here (e.g.
// `/xx/work/<slug>`) isn't rejected by Next's static-path fallback the way
// `/favicon.ico` is; it's caught one line below by `assertLocale` instead,
// which is fine specifically for this route since it already has to run
// its own body for the equivalent bogus-slug case.
export const dynamicParams = true;

// Widen-then-narrow `params`, matching layout.tsx's generateMetadata (Task
// 10 review's critical type constraint). Gives each case study its own
// title -- `question[locale]`, falling back to the project's own `name` for
// a project that has no question yet -- and a self-referential canonical.
// Mirrors this page's own unknown-slug and empty-body guards below so a
// bogus/crawler slug, or a project whose story has no content in either
// locale yet, 404s from generateMetadata too rather than reading
// `story.question[l]` off a null story.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const l = assertLocale(locale);
  const known = (await getProjects()).find((p) => p.slug === slug);
  if (!known) notFound();
  const story = await getProjectStory(slug);
  // A known slug whose story has no body in EITHER locale yet reads as "not
  // published" rather than a real case study -- same defensive posture as
  // writing/[slug]/page.tsx's `if (!post) notFound()`, extended to cover the
  // case a Project row can be in that a Post row can't (a slug that exists
  // but has no story content behind it yet).
  if (!story || (story.body.en.length === 0 && story.body.th.length === 0)) notFound();
  const title = story.question?.[l] ?? story.name;
  const description = deriveBodyDescription(story.body, l, storyFallbacks);
  const url = `${SITE_URL}/${l}/work/${slug}`;
  // Same one pair of site-wide share-card PNGs as every other route (see
  // projects/page.tsx's comment and design/og/README.md) -- only the alt
  // text is story-specific.
  const ogImage = { url: `/og/og-${l}.png`, width: 1200, height: 630, alt: `${story.name} · Klao` };
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      // 'article', not 'website' (every other route here uses 'website') --
      // this is a dated build write-up in the same sense a writing post is,
      // matching writing/[slug]/page.tsx's own reasoning for the same field.
      type: 'article',
      locale: l === 'th' ? 'th_TH' : 'en_US',
      url,
      siteName: 'Klao',
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function WorkStoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = assertLocale(rawLocale);
  const known = (await getProjects()).find((p) => p.slug === slug);
  if (!known) notFound();
  const story = await getProjectStory(slug);
  if (!story || (story.body.en.length === 0 && story.body.th.length === 0)) notFound();
  const body = story.body[locale].length ? story.body[locale] : story.body.en;
  // Both halves of the receipts footer are independently optional, so the
  // pill row has to own the gap to the body whenever the stack line above it
  // didn't render -- otherwise a business story's pills sat 12px under the
  // last paragraph instead of the section's own mt-10.
  const showStack = story.type === 'build' && story.stack.length > 0;
  const showLinks = Boolean(story.liveUrl || story.repoUrl);
  return (
    // See projects/page.tsx and layout.tsx for why this page owns its own
    // reading-width column and top padding now.
    <article className="mx-auto w-full max-w-3xl px-6 pb-16 pt-28">
      <p className="text-sm">
        {/* aria-hidden arrow (QA finding 18): the link's accessible name is
            just "Back", not "left arrow Back". */}
        <Link href={`/${locale}#work`} className="text-soft hover:text-ink">
          <span aria-hidden="true">←</span> {dict[locale].back}
        </Link>
      </p>
      {/* The project-name eyebrow is the same marked section break every
          band uses (QA finding 11) -- it was still the pre-2026-08-15 9.5px
          on-dark-soft whisper, the one size SectionLabel was created to
          retire, so this page's own label was the last unpromoted one.
          Stays a <p>: the h1 below is this page's heading. */}
      <SectionLabel text={story.name} locale={locale} className="mt-4" />
      <h1 className="mt-2 font-display text-3xl">{story.question?.[locale] ?? story.name}</h1>
      <div className="mt-8">
        <PostBody blocks={body} />
      </div>
      {/* Receipts footer (QA finding 25): the stack is a caption, not a
          button, so it gets its own line ABOVE the pills instead of sitting
          inside the same flex row where it read as a third, unstyled
          control. Type-gated exactly as before: a business story never shows
          a stack, even if its Notion row still carries Stack values -- the
          same invariant ProjectCard and WorkDeck enforce -- and the length
          gate keeps an empty <p> from rendering. */}
      {showStack && <p className="mt-10 text-xs text-soft">{story.stack.join(' · ')}</p>}
      {/* Live site is the promoted action here (finding 25): on a case-study
          page the reader has just finished the story, so "go see the thing"
          outranks "read the source". Pills share ProjectCard's spec --
          on-dark-mid border (finding 5) and the house 300ms ease
          (finding 14). */}
      {showLinks && (
        <p className={`${showStack ? 'mt-3' : 'mt-10'} flex flex-wrap gap-3`}>
          {story.liveUrl && (
            <a
              href={story.liveUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-peri-deep px-4 py-2 text-[12px] font-semibold text-peri transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-peri hover:text-dark"
            >
              {dict[locale].liveSite}
            </a>
          )}
          {story.repoUrl && (
            <a
              href={story.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-on-dark-mid px-4 py-2 text-[12px] font-medium transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-peri hover:text-peri"
            >
              {dict[locale].viewCode}
            </a>
          )}
        </p>
      )}
    </article>
  );
}
