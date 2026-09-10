import './project-frame.css';
import { imageAlt } from '@/lib/image-alt';
import type { Project } from '@/lib/models';

type Props = {
  project: Project;
  /** Window-chrome title. Cards pass none (the name is the visible h3 beside
   *  them); the hero tour passes windowTitle(project). */
  title?: string;
  /** First tour slide only: eager load so the LCP image isn't lazy. */
  priority?: boolean;
  className?: string;
};

// Server-safe (no hooks, no 'use client'): WorkDeck and ProjectCard are server
// components and render this directly; ProjectTour renders it from a client
// component, which is also fine.
export default function ProjectFrame({ project, title, priority = false, className = '' }: Props) {
  return (
    <div className={`pframe ${className}`.trim()} data-project-frame>
      {/* Decorative window chrome: a screen reader gets the image (or nothing,
          for the cover) and the visible text beside the frame, never "dot dot
          dot host". */}
      <div className="pframe-chrome" aria-hidden="true">
        <i />
        <i />
        <i />
        {title && <span className="pframe-title">{title}</span>}
      </div>
      <div className="pframe-screen">
        {project.imageSrc ? (
          <img
            src={project.imageSrc}
            alt={imageAlt(project.imageSrc, project.name)}
            width={800}
            height={450}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
          />
        ) : (
          // Monogram cover for a project with no screenshot yet (spec §5).
          // aria-hidden: it carries nothing a screen reader hasn't already
          // heard from the visible name next to the frame — and it is never
          // a fake UI (receipts rule).
          <div className="pcover" data-cover aria-hidden="true">
            {project.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}
