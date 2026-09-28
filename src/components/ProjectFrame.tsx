import './project-frame.css';
import { imageAlt } from '@/lib/image-alt';
import type { Project } from '@/lib/models';

type Props = {
  project: Project;
  /** Window-chrome title (e.g. windowTitle(project) for a live app). Cards pass
   *  none: the name is the visible h3 beside them. */
  title?: string;
  /** Load eagerly, for a frame that is above the fold. */
  priority?: boolean;
  className?: string;
};

// Server-safe (no hooks, no 'use client'): ProjectCard is a server component
// and renders this directly.
export default function ProjectFrame({ project, title, priority = false, className = '' }: Props) {
  // A frame is a window onto a real screen. A project with no screenshot shows
  // no image block at all (owner's call 2026-09-11) rather than a stand-in --
  // the receipts rule applied to pictures. Callers already check this so they
  // don't ship an empty wrapper; this guard is what makes it impossible.
  if (!project.imageSrc) return null;
  return (
    <div className={`pframe ${className}`.trim()} data-project-frame>
      {/* Decorative window chrome: a screen reader gets the image and the
          visible text beside the frame, never "dot dot dot host". */}
      <div className="pframe-chrome" aria-hidden="true">
        <i />
        <i />
        <i />
        {title && <span className="pframe-title">{title}</span>}
      </div>
      <div className="pframe-screen">
        <img
          src={project.imageSrc}
          alt={imageAlt(project.imageSrc, project.name)}
          width={800}
          height={450}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      </div>
    </div>
  );
}
