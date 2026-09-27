import SignatureScene, { type SignatureCopy } from '@/components/SignatureScene';
import { dict } from '@/lib/dictionary';
import { imageAlt } from '@/lib/image-alt';
import type { Locale, Project } from '@/lib/models';
import { findLineage } from '@/lib/project-view';
import { SIG_STAT, SIG_YEARS } from '@/lib/signature';

// 2022 → 2026 (spec §4 row 2, §6 "Signature"). Server side: picks the idea -> app pair from the
// Project rows (the row whose LineageOf names another) and hands the client scene plain strings.
// No pair -- pre-migration Notion, or the earlier row unpublished -- means no section at all,
// never half a story. The scene's own words are prototype copy in the dictionary; every
// project fact (question, name, description, link, screenshot, alt) comes from the rows.
export default function Signature({ projects, locale }: { projects: Project[]; locale: Locale }) {
  const lineage = findLineage(projects);
  if (!lineage) return null;
  const { earlier, later } = lineage;
  const t = dict[locale];

  const copy: SignatureCopy = {
    eyebrow: `${SIG_YEARS[0]} → ${SIG_YEARS[SIG_YEARS.length - 1]}`,
    // Ruling D-4 (preflight): there is no sigTitle key -- this headline is P1's tourEndTitle,
    // reused rather than duplicated.
    title: t.tourEndTitle,
    sub: t.sigSub,
    cardKicker: t.sigCardKicker,
    cardQuestion: earlier.question?.[locale] ?? null,
    statValue: SIG_STAT.value,
    statTotal: SIG_STAT.total,
    cardLabel: t.sigCardLabel,
    capTitle: t.sigCaption,
    capSub: t.sigCaptionSub,
    // "Live" only when it is: a later project that is not live yet ends on its name alone.
    endTitle: later.statusKey === 'live' ? `${later.name} · ${t.sigLive}` : later.name,
    endSub: later.description[locale],
    openLabel: t.workOpenApp,
    openHref: later.liveUrl,
    frameSrc: later.imageSrc,
    frameAlt: later.imageSrc ? (later.alt?.[locale] ?? imageAlt(later.imageSrc, later.name)) : '',
  };

  return <SignatureScene copy={copy} />;
}
