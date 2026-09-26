import type { Project } from '@/lib/models';

type P1Fields = 'statusKey' | 'status' | 'kicker' | 'media' | 'wash' | 'tour' | 'tourOrder' | 'lineageOf' | 'alt' | 'outcomes';

/**
 * The White Edition (C5) Project fields at the values a pre-migration Notion
 * row maps to (media 'img' = "has a screenshot"). Older tests spread this into
 * their Project literals so they keep type-checking without restating fields
 * they don't exercise. Later phases extend it when Project grows again.
 */
export const P1_DEFAULTS: Pick<Project, P1Fields> = {
  statusKey: null,
  status: null,
  kicker: null,
  media: 'img',
  wash: 'none',
  tour: false,
  tourOrder: null,
  lineageOf: null,
  alt: null,
  outcomes: { en: [], th: [] },
};

/** A complete Project for tests: a build with a screenshot, every field set. */
export function makeProject(overrides: Partial<Project> & Pick<Project, 'id' | 'name'>): Project {
  return {
    description: { en: `${overrides.name} in one line`, th: `${overrides.name} หนึ่งบรรทัด` },
    stack: [],
    liveUrl: null,
    repoUrl: null,
    imageSrc: `/api/img/page/${overrides.id}/Screenshot`,
    featured: true,
    order: 1,
    type: 'build',
    outcome: null,
    question: null,
    slug: null,
    ...P1_DEFAULTS,
    ...overrides,
  };
}
