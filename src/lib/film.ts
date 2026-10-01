import type { Locale, Localized } from './models';

// The 40-second film of the work (spec 2026-10-01-film-og §3–§4): played in FilmSheet, opened
// from the tour pill's Film button at #film. Code-side like PROJECT_CLIPS: the files are bundled
// in public/ (rendered by design/clips/film/tools/build.sh), not Notion fields.

export interface FilmCut {
  webm: string;
  mp4: string;
  poster: string; // frame 0, the finished title card
  width: number;
  height: number;
}

/** One beat of the film: when it starts (seconds) and its words exactly as on screen. */
export interface FilmBeat {
  at: number;
  // models.ts's Localized is string-only, so the per-locale line lists are spelled out here.
  lines: { en: string[]; th: string[] };
}

export const FILM_DURATION_MS = 40000;

/** Mirrors #work/<key>: opening the film is a history entry, so Back closes it. */
export const FILM_HASH = '#film';

/** The 16:9 cut (1920×1080) above the phone breakpoint; the 1:1 cut (1080×1080, re-composed,
 *  not cropped) when PHONE_QUERY matches at open. */
export function filmCuts(locale: Locale): { wide: FilmCut; square: FilmCut } {
  return {
    wide: { webm: `/film/film-${locale}.webm`, mp4: `/film/film-${locale}.mp4`, poster: `/images/film-${locale}.jpg`, width: 1920, height: 1080 },
    square: {
      webm: `/film/film-${locale}-1x1.webm`,
      mp4: `/film/film-${locale}-1x1.mp4`,
      poster: `/images/film-${locale}-1x1.jpg`,
      width: 1080,
      height: 1080,
    },
  };
}

/** The <video>'s aria-label: what the film shows, in one sentence. The text version below the
 *  video carries every word. */
export const FILM_LABEL: Localized = {
  en: 'Film, 40 seconds, with music: the headline, Tripedia’s 2022 question becoming GoNai, a short clip each of GoNai, Aje and Cafénista (simulated data), then the name and the site’s address.',
  th: 'ฟิล์ม 40 วินาที มีเพลง: พาดหัว คำถามของ Tripedia ปี 2022 ที่กลายเป็น GoNai คลิปสั้นของ GoNai Aje และ Cafénista (ข้อมูลจำลอง) อย่างละคลิป แล้วจบที่ชื่อและที่อยู่เว็บไซต์',
};

/** The text version: every word on screen, beat by beat, verbatim from spec §3.1 (the film's
 *  own COPY in design/clips/film/film-16x9/scenes.js). Starts follow spec §3.2: title,
 *  Signature, GoNai, Aje, Cafénista, end. */
export const FILM_BEATS: readonly FilmBeat[] = [
  {
    at: 0,
    lines: {
      en: ['Business developer who builds his own tools.', 'Suwichak Jarunopratamp'],
      th: ['นัก Business Development ที่สร้างเครื่องมือใช้เอง', 'Suwichak Jarunopratamp'],
    },
  },
  {
    at: 3.1,
    lines: {
      en: [
        '2022 → 2026',
        'The idea, then the app.',
        '2022 · Tripedia · Co-founder',
        'Why does planning one trip take five apps?',
        '30 / 500',
        'final teams · KATALYST Startup Launchpad',
        'GoNai · Live',
        'One-day Bangkok trip planner with exact budgets, built as a weekend project.',
      ],
      th: [
        '2022 → 2026',
        'ไอเดียมาก่อน แล้วค่อยเป็นแอป',
        '2022 · Tripedia · Co-founder',
        'ทำไมวางแผนทริปเดียวต้องใช้ตั้งห้าแอป?',
        '30 / 500',
        'ทีมสุดท้าย · KATALYST Startup Launchpad',
        'GoNai · เปิดใช้งานแล้ว',
        'แอปวางแผนเที่ยวกรุงเทพฯ 1 วัน พร้อมงบประมาณละเอียด สร้างเสร็จในสุดสัปดาห์เดียว',
      ],
    },
  },
  {
    at: 10.0,
    lines: {
      en: ['GoNai · Live · since Aug 2026', 'One day in Bangkok — what’s the real budget?'],
      th: ['GoNai · เปิดใช้งานแล้ว · ตั้งแต่ ส.ค. 2026', 'ไปเที่ยวหนึ่งวัน งบจริงๆ เท่าไหร่?'],
    },
  },
  {
    at: 18.7,
    lines: {
      en: ['Aje · Working prototype', 'Is this idea worth a weekend, or a year?'],
      th: ['Aje · Prototype ใช้งานได้', 'ไอเดียนี้คุ้มกับหนึ่งสุดสัปดาห์ หรือทั้งปี?'],
    },
  },
  {
    at: 27.3,
    lines: {
      en: ['Cafénista · Prototype · simulated data', "Can one screen tell an owner who's away how the machine, the bar and the till are doing?"],
      th: ['Cafénista · Prototype · ข้อมูลจำลอง', 'จอเดียวบอกเจ้าของที่ไม่อยู่ร้านได้ไหม ว่าเครื่อง บาร์ และยอดขายเป็นยังไง?'],
    },
  },
  {
    at: 37.3,
    lines: {
      en: ['Suwichak Jarunopratamp', 'klao-site.vercel.app'],
      th: ['Suwichak Jarunopratamp', 'klao-site.vercel.app'],
    },
  },
];
