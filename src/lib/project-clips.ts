import { slugKey } from './format';
import type { Localized, Project } from './models';
import { projectKey } from './sheet-url';

// Product clips: a few seconds of a project actually working, played once over its screenshot
// in the project sheet (docs/superpowers/specs/2026-09-30-sheet-clips.md). Code-side on
// purpose, not a Notion field: the clips are bundled static files in public/clips/, because
// the /api/img proxy that serves Notion files accepts images only and caps them at 4 MB.
//
// Keyed by the project's sheet key (projectKey: its Slug, else slugKey(Name) -- "Cafénista" ->
// "cafenista"). Frame 0 of a clip must be the project's screenshot, so the swap from the still
// to the video shows no jump. Budgets: ≤ 5 s, ≤ 700 KB per file, 1580x900 like the screenshot.
export interface ProjectClip {
  webm: string;
  mp4: string;
  durationMs: number;
  // What the clip shows, for screen readers (the <video>'s aria-label). The screenshot under
  // it keeps its own alt.
  label: Localized;
}

export const PROJECT_CLIPS: Readonly<Record<string, ProjectClip>> = {
  cafenista: {
    webm: '/clips/cafenista.webm',
    mp4: '/clips/cafenista.mp4',
    durationMs: 5000,
    label: {
      en: 'Clip, 5 seconds: the owner’s Today screen scrolls to a timeline where the espresso machine runs colder than normal, then the bar screen appears beside it with the same alert and a button to pull a check shot.',
      th: 'คลิป 5 วินาที: จอ “วันนี้” ของเจ้าของร้านเลื่อนลงไปที่เส้นเวลาซึ่งเครื่องชงเย็นกว่าปกติ แล้วจอหน้าบาร์ของบาริสต้าขึ้นมาข้าง ๆ พร้อมแจ้งเตือนเดียวกันและปุ่มให้ชงช็อตตรวจ',
    },
  },
};

/** The clip for a project, or null. The sheet key first; the name's own slugKey second, so
 *  giving a clipped project a Notion Slug later doesn't silently drop its clip. Own keys only
 *  (a project named "constructor" must not find Object.prototype's). */
export function clipFor(project: Pick<Project, 'slug' | 'name'>): ProjectClip | null {
  for (const key of [projectKey(project), slugKey(project.name)]) {
    if (key && Object.hasOwn(PROJECT_CLIPS, key)) return PROJECT_CLIPS[key];
  }
  return null;
}
