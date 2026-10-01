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
  /** Phones (max-width: 734px): a square cut with its own poster (frame 0). Its optional label
   *  describes the square cut when that tells a shorter story than the 16:9 one; its optional
   *  alt describes the square poster, which shows a different crop than the 16:9 screenshot. */
  square?: { webm: string; mp4: string; poster: string; label?: Localized; alt?: Localized };
}

/** The phone breakpoint the square cut keys off. Same 734px as the site's phone CSS. */
export const PHONE_QUERY = '(max-width: 734px)';

const square = (key: string, label: Localized, alt: Localized) => ({ webm: `/clips/${key}-1x1.webm`, mp4: `/clips/${key}-1x1.mp4`, poster: `/images/${key}-1x1.jpg`, label, alt });

export const PROJECT_CLIPS: Readonly<Record<string, ProjectClip>> = {
  aje: {
    webm: '/clips/aje.webm',
    mp4: '/clips/aje.mp4',
    durationMs: 5000,
    square: square(
      'aje',
      {
        en: 'Clip, 5 seconds: Aje’s built-in example, Dental LINE receptionist (example). Its test, Talk to 5 clinic owners, shows Evidence reviewed; Problem moves F to B, Customer D to C, both on field evidence.',
        th: 'คลิป 5 วินาที: ไอเดียตัวอย่างใน Aje Dental LINE receptionist (example) การทดสอบ Talk to 5 clinic owners ขึ้น Evidence reviewed คะแนน Problem ขยับจาก F เป็น B และ Customer จาก D เป็น C ด้วยหลักฐานจากภาคสนาม',
      },
      {
        en: 'Aje’s example idea, Dental LINE receptionist (example): the test card Talk to 5 clinic owners.',
        th: 'ไอเดียตัวอย่างใน Aje Dental LINE receptionist (example): การ์ดการทดสอบ Talk to 5 clinic owners',
      },
    ),
    label: {
      en: 'Clip, 5 seconds: Aje’s Review of BikeFix Home zooms into Aje’s built-in example, Dental LINE receptionist (example). Its test, Talk to 5 clinic owners, shows Evidence reviewed; Problem moves F to B, Customer D to C, and both moved on field evidence.',
      th: 'คลิป 5 วินาที: หน้า Review ของ BikeFix Home ใน Aje ซูมเข้าสู่ไอเดียตัวอย่าง Dental LINE receptionist (example) การทดสอบ Talk to 5 clinic owners ขึ้น Evidence reviewed คะแนน Problem ขยับจาก F เป็น B และ Customer จาก D เป็น C ด้วยหลักฐานจากภาคสนาม',
    },
  },
  gonai: {
    webm: '/clips/gonai.webm',
    mp4: '/clips/gonai.mp4',
    durationMs: 5000,
    square: square(
      'gonai',
      {
        en: 'Clip, 5 seconds: a GoNai plan: BTS from Lat Phrao at 64 baht, two sample stops at about 150 baht each, then the budget bar fills to about 410 of 450 baht.',
        th: 'คลิป 5 วินาที: แผน GoNai BTS จากลาดพร้าว 64 บาท ร้านตัวอย่าง 2 แห่ง แห่งละราว 150 บาท แล้วแถบงบเติมถึงราว 410 จาก 450 บาท',
      },
      {
        en: 'A GoNai route card: walk to BTS Ha Yaek Lat Phrao, then BTS to Siam, 64 baht.',
        th: 'การ์ดเส้นทางของ GoNai เดินไป BTS ห้าแยกลาดพร้าว แล้วนั่ง BTS ไปสยาม 64 บาท',
      },
    ),
    label: {
      en: 'Clip, 5 seconds: GoNai’s landing page opens into a plan from Lat Phrao to Siam: BTS at 64 baht, two sample stops at about 150 baht each, and a budget bar filling to about 410 of 450 baht; the same plan then appears as a view-only share card.',
      th: 'คลิป 5 วินาที: หน้าแรกของ GoNai เปิดเข้าสู่แผนจากลาดพร้าวไปสยาม BTS 64 บาท ร้านตัวอย่าง 2 แห่ง แห่งละราว 150 บาท แถบงบเติมถึงราว 410 จาก 450 บาท แล้วแผนเดียวกันขึ้นเป็นการ์ดแชร์แบบดูอย่างเดียว',
    },
  },
  cafenista: {
    webm: '/clips/cafenista.webm',
    mp4: '/clips/cafenista.mp4',
    durationMs: 5000,
    square: square(
      'cafenista',
      {
        en: 'Clip, 5 seconds: Cafénista’s espresso machine card: the reading drops, the chip turns “colder than normal”, the owner’s alert arrives, the bar shows the same alert, “just right” is tapped and the app says “saved”.',
        th: 'คลิป 5 วินาที: การ์ดเครื่องชงของ Cafénista ค่าตกต่ำกว่าปกติ ป้ายเปลี่ยนเป็น “เย็นกว่าปกติ” แจ้งเตือนถึงเจ้าของ หน้าบาร์เห็นแจ้งเตือนเดียวกัน แตะ “พอดี” แอปขึ้น “บันทึกแล้ว”',
      },
      {
        en: 'Cafénista’s espresso machine card, reading normal.',
        th: 'การ์ดเครื่องชงของ Cafénista สถานะปกติ',
      },
    ),
    label: {
      en: 'Clip, 5 seconds: the owner’s Today screen zooms into the espresso machine card; the reading drops, the chip turns “colder than normal”, the owner’s alert arrives, the bar shows the same alert, “just right” is tapped and the app says “saved”.',
      th: 'คลิป 5 วินาที: หน้าวันนี้ของเจ้าของซูมเข้าการ์ดเครื่องชง ค่าตกต่ำกว่าปกติ ป้ายเปลี่ยนเป็น “เย็นกว่าปกติ” แจ้งเตือนถึงเจ้าของ หน้าบาร์เห็นแจ้งเตือนเดียวกัน แตะ “พอดี” แอปขึ้น “บันทึกแล้ว”',
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
