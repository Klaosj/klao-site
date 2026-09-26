import type { IconName } from '@/components/icons';
import type { SketchName } from '@/components/sketches';

// The Story DB's Icon / Sketch selects arrive as free text. Only the names
// listed here render; anything else (a typo, an option added in Notion
// before the code knows it) renders the chapter without that ornament.
// `satisfies` makes tsc prove every name exists in P0's icon and sketch sets
// (C4), so a rename there fails the build instead of blanking the page.
// These literals are also the option names the Notion selects must use.
export const STORY_ICONS = [
  'target-duotone',
  'chart-line-up-duotone',
  'translate-duotone',
  'rocket-launch-duotone',
  'key-duotone',
  'wrench-duotone',
] as const satisfies readonly IconName[];

// The prototype's SK[0..4], in chapter order. Chapter 6 has no sketch: it
// carries the five-phase strip instead (see ByDay).
export const STORY_SKETCHES = ['room', 'cases', 'formats', 'rollout', 'handover'] as const satisfies readonly SketchName[];

export type StoryIcon = (typeof STORY_ICONS)[number];
export type StorySketch = (typeof STORY_SKETCHES)[number];

export const isStoryIcon = (name: string): name is StoryIcon => (STORY_ICONS as readonly string[]).includes(name);
export const isStorySketch = (name: string): name is StorySketch =>
  (STORY_SKETCHES as readonly string[]).includes(name);
