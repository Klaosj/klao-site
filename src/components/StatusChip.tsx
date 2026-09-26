import './status-chip.css';
import type { Locale, Project } from '@/lib/models';
import { statusMark } from '@/lib/project-view';

// Server-safe (no hooks): the index renders it on the server, the sheet from its client island.
// The word is required -- a pre-migration row with no Status shows nothing rather than a bare
// shape nobody can read; the mark is optional (StatusKey empty -> word alone).
export default function StatusChip({ project, locale }: { project: Pick<Project, 'statusKey' | 'status'>; locale: Locale }) {
  const word = project.status?.[locale];
  if (!word) return null;
  const mark = statusMark(project.statusKey);
  return (
    <span className="st-chip">
      {mark && <i className="st-mk" data-mark={mark} aria-hidden="true" />}
      {word}
    </span>
  );
}
