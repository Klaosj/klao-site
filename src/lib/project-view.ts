import type { Project, ProjectStatusKey, ProjectWash } from './models';

// Small, pure presentation rules shared by the projects index, the project sheet and the
// signature -- one copy of each rule, so the three surfaces can never disagree.

// Status marks are monochrome shape + word (spec §5.1): filled = live, half = working
// prototype, ring = a business play that was pitched or placed. Colour never carries it.
export type StatusMark = 'live' | 'proto' | 'ring';

export function statusMark(key: ProjectStatusKey | null): StatusMark | null {
  if (key === 'live') return 'live';
  if (key === 'proto') return 'proto';
  if (key === 'pitched' || key === 'finalist') return 'ring';
  return null;
}

// Project colour appears only as a wash behind its own media (spec §3, 24 Sep). 'none' falls
// back to the mist band colour so a pre-migration row still gets a calm surface.
const WASH_VAR: Record<ProjectWash, string> = {
  aje: 'var(--w-aje)',
  gonai: 'var(--w-gonai)',
  site: 'var(--w-site)',
  none: 'var(--mist)',
};

export function washVar(wash: ProjectWash): string {
  return WASH_VAR[wash];
}

// '|' in Notion copy marks the one allowed Thai break inside display text (spec §5.2), where
// ThaiText consumes it. Body-size text (index rows, table cells) has no keep-runs, so there the
// mark is simply removed.
export function unbreak(s: string): string {
  return s.replace(/\|/g, '');
}

// The address a screenshot window's bar shows: the host only, never a path or query.
export function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export interface Lineage {
  earlier: Project;
  later: Project;
}

// The idea -> app pair a project belongs to, from either end: the later row names the earlier
// one in LineageOf (GoNai -> Tripedia). A LineageOf that resolves to no row in the list (the
// earlier row unpublished) is no lineage at all, so the lineage card and the Signature disappear
// instead of rendering half a story.
export function lineageFor(project: Project, projects: Project[]): Lineage | null {
  if (project.lineageOf) {
    const earlier = projects.find((p) => p.id === project.lineageOf && p.id !== project.id);
    return earlier ? { earlier, later: project } : null;
  }
  const later = projects.find((p) => p.lineageOf === project.id && p.id !== project.id);
  return later ? { earlier: project, later } : null;
}

// The first resolvable pair in Order -- what the Signature scene tells.
export function findLineage(projects: Project[]): Lineage | null {
  for (const p of projects) {
    if (!p.lineageOf) continue;
    const pair = lineageFor(p, projects);
    if (pair) return pair;
  }
  return null;
}
