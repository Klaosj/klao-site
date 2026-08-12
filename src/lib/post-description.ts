import type { ContentBlock, Locale, Post, RichSpan } from '@/lib/models';

// --- QA I4: derive a real per-post description ---------------------------
// A post's body is Notion-authored `ContentBlock[]` (models.ts), not a plain
// string, so there is no ready-made "the description" anywhere on a Post --
// one has to be built from the post's own first paragraph. Lives in its own
// module (not a route-local closure in writing/[slug]/page.tsx) for two
// reasons: tests/route-metadata.test.ts needs to exercise it directly
// against constructed Post fixtures, covering two cases that file's own
// generateMetadata can never reach on its own -- a post whose body has no
// paragraph block at all (e.g. only a heading or a quote), and a post whose
// body is empty in BOTH locales; and Next.js pages may not carry extra named
// exports at all -- the webpack production builder's type-check rejects any
// export from a page module beyond the framework's own recognized fields
// (default, generateMetadata, generateStaticParams, etc.), even though
// Turbopack does not enforce that and happily built it. That second case is
// deliberate, not paranoid -- another agent may empty
// src/content/fixtures/posts.json to `[]` this same wave (both current posts
// are placeholders), and even short of that, Notion content is user-edited
// and can legitimately ship a post with no paragraph block yet. The deriver
// must not assume a paragraph, or a post, exists.

function plainText(spans: RichSpan[]): string {
  return spans.map((s) => s.text).join('');
}

const MAX_DESCRIPTION_LENGTH = 155;

// Word-boundary truncation that works for BOTH locales. A plain
// `slice(0, n)`, or splitting on `/\s+/`, is an English assumption: Thai
// prose runs with no spaces between words at all (see the real fixture
// body in src/content/fixtures/posts.json), so cutting mid-word there is
// just as wrong as cutting mid-word in English would be. `Intl.Segmenter`
// with `granularity: 'word'` (available in the Node version this project
// runs on -- verified empirically, not assumed) tokenizes both scripts
// correctly, so walking its segments and stopping before the character
// budget is exceeded lands on a real word boundary in either language,
// instead of slicing a Thai cluster or an English word in half.
function truncateAtWordBoundary(text: string, locale: Locale, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  const segmenter = new Intl.Segmenter(locale === 'th' ? 'th' : 'en', { granularity: 'word' });
  let out = '';
  for (const { segment } of segmenter.segment(trimmed)) {
    if ((out + segment).length > maxLength) break;
    out += segment;
  }
  // A pathological maxLength shorter than the very first segment leaves
  // `out` empty -- fall back to a hard character slice rather than shipping
  // a description that is just an ellipsis.
  return out.trim() ? `${out.trimEnd()}…` : `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

// Locale-correct fallback for the two defensive cases above: no paragraph
// block to summarize, or an empty body outright. Never English-on-/th (the
// task's hard rule) and never blank -- an empty <meta name="description">
// is worse than a generic one, since search engines then improvise a
// snippet from arbitrary on-page text (e.g. the nav) instead.
const fallbackDescriptions: Record<Locale, string> = {
  en: "A post from Klao's writing on business development and building software solo.",
  th: 'บทความจากงานเขียนของเกลา ว่าด้วยเรื่อง Business Development และการสร้างซอฟต์แวร์ด้วยตัวคนเดียว',
};

// Generalized over `derivePostDescription` below: the body-summarizing logic
// itself has nothing Post-specific about it -- it only ever reads
// `post.body` and `fallbackDescriptions` -- so wave 1 task 3 lifts it to take
// those two things as plain parameters. This lets Task 4 reuse the exact
// same paragraph-finding/truncation/fallback behavior for case-study
// descriptions, which need a different fallback pair, without duplicating
// any of the reasoning captured in the comments above.
export function deriveBodyDescription(
  body: { en: ContentBlock[]; th: ContentBlock[] },
  locale: Locale,
  fallbacks: Record<Locale, string>,
): string {
  // Mirrors PostPage's own body-resolution fallback (`post.body[locale].length
  // ? post.body[locale] : post.body.en`): an empty TH body still summarizes
  // the EN paragraph rather than falling straight to the generic fallback,
  // and a post empty in both locales falls through to finding no paragraph
  // at all, landing on `fallbacks` below.
  const blocks = body[locale].length ? body[locale] : body.en;
  const paragraph = blocks.find(
    (b): b is Extract<ContentBlock, { type: 'paragraph' }> => b.type === 'paragraph',
  );
  const text = paragraph ? plainText(paragraph.spans).trim() : '';
  if (!text) return fallbacks[locale];
  return truncateAtWordBoundary(text, locale, MAX_DESCRIPTION_LENGTH);
}

export function derivePostDescription(post: Post, locale: Locale): string {
  return deriveBodyDescription(post.body, locale, fallbackDescriptions);
}
