import type { Metadata } from 'next';
import { getProjects } from '@/lib/content';
import { dict } from '@/lib/dictionary';
import { assertLocale } from '@/lib/locale';
import type { Locale } from '@/lib/models';
import { SITE_URL } from '@/lib/site';
import ProjectCard from '@/components/ProjectCard';
import SectionLabel from '@/components/SectionLabel';

// See src/app/[locale]/page.tsx for why this is set per leaf page rather
// than on the shared layout.
export const dynamicParams = false;

// QA I4: this route previously set only `title`/`alternates.canonical`, so
// `description` and `openGraph` (and, by the same mergeMetadata mechanism --
// see node_modules/next/dist/lib/metadata/resolve-metadata.js's `mergeMetadata`,
// which replaces a field wholesale only when the leaf's own returned object
// has that key -- `twitter` too) fell through untouched to whatever the
// nearest ancestor that DID set them last resolved to, i.e. layout.tsx's
// site-root copy. Every non-home route was serving the homepage's own
// description and share-card verbatim. Fixed the same way layout.tsx fixes
// it for the site root: a per-locale `descriptions` map, and a full
// `openGraph`/`twitter` object of our own (title/description/type/locale/
// url/siteName/images) rather than only the fields that changed -- since
// setting `openGraph` at all replaces the inherited object entirely, a
// partial one would silently drop e.g. `images`.
const descriptions: Record<Locale, string> = {
  en: "Klao's own projects — business plays and shipped software, grouped into Business and Build — with stories, live links and source code where public.",
  th: 'โปรเจกต์ของเกลาเอง ทั้งฝั่งธุรกิจและซอฟต์แวร์ที่สร้างจริง แบ่งเป็นสองหมวด พร้อมเรื่องราว ลิงก์ใช้งานจริง และซอร์สโค้ดเท่าที่เปิดเผยได้',
};

// Reuses the site's one pair of share-card PNGs (design/og/README.md: "every
// /en/... page" / "every /th/... page", not one image per route) -- only the
// alt text is page-specific.
const ogAlt: Record<Locale, string> = {
  en: 'Klao — own projects across business and build, told as case studies with receipts.',
  th: 'เกลา — โปรเจกต์ส่วนตัวทั้งฝั่งธุรกิจและฝั่งสร้าง เล่าเป็นเคสพร้อมใบเสร็จของผลลัพธ์',
};

// Widen-then-narrow `params`, matching layout.tsx's generateMetadata (Task
// 10 review's critical type constraint). Gives this page its own title
// (composed with the layout's `%s · Klao` template) and a self-referential
// canonical, replacing the layout's site-root default -- see Task 10 review
// Important #3: before this, all 12 sitemap URLs shared one title.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  const title = dict[l].projects;
  const description = descriptions[l];
  const url = `${SITE_URL}/${l}/projects`;
  const ogImage = { url: `/og/og-${l}.png`, width: 1200, height: 630, alt: ogAlt[l] };
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} · Klao`,
      description,
      type: 'website',
      locale: l === 'th' ? 'th_TH' : 'en_US',
      url,
      siteName: 'Klao',
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} · Klao`,
      description,
      images: [ogImage],
    },
  };
}

export default async function ProjectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = assertLocale((await params).locale);
  const t = dict[locale];
  const projects = await getProjects();
  // Business first, same chapter order as WorkDeck; an empty group renders
  // nothing (fixture mode has no business rows yet). Each group carries its
  // own `type` so the React key can be the stable data value rather than
  // `label`, which is translated display copy and changes with the locale.
  const groups = (
    [
      { type: 'business', label: t.workTypeBusiness },
      { type: 'build', label: t.workTypeBuild },
    ] as const
  )
    .map((g) => ({ ...g, items: projects.filter((p) => p.type === g.type) }))
    .filter((g) => g.items.length > 0);

  return (
    // See layout.tsx: the shared header is now fixed and transparent, and
    // <main> no longer constrains width for the redesigned full-bleed home
    // route -- this page carries its own reading-width column and top
    // padding to clear the header instead.
    <div className="mx-auto w-full max-w-3xl px-6 pb-16 pt-28">
      {/* QA finding 17: a bare 30px h1 made the site's own project index read
          as a smaller page than the home deck it feeds. Fluid clamp + the
          display face's tight tracking gives it the same weight class as the
          other landing surfaces, and the subtitle answers the question every
          index page owes its reader -- what am I looking at, and how is it
          organised -- before the first section label. */}
      <h1 className="font-display text-[clamp(30px,4vw,46px)] font-bold tracking-[-0.03em]">
        {t.projects}
      </h1>
      <p className="mt-3 max-w-[60ch] text-[14.5px] text-soft">{t.projectsSubtitle}</p>
      {groups.map((g) => (
        <section key={g.type} className="mt-8">
          <SectionLabel as="h2" text={g.label} locale={locale} />
          {/* Blog-index shape (owner request 2026-08-15): one row per
              project, hairline-divided, replacing the old 2/3-column card
              grid — ProjectCard renders the row (thumbnail + question-led
              text) and carries its own vertical padding. */}
          <div className="mt-2 divide-y divide-line">
            {g.items.map((p) => (
              <ProjectCard key={p.id} project={p} locale={locale} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
