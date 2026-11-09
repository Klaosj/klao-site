import type { Localized } from '@/lib/models';

// Recruiter Edition hero (2026-11-09, mockup approved by Klao the same day).
// Every number below is already public on this site, word for word or as a
// shorter cut of it -- source in the comment on each line. No new figure may
// be added here without a source on the live site or Klao's say-so.
export const HERO = {
  title: {
    en: 'Partnerships and business development, from first meeting to live rollout.',
    th: 'งานพาร์ตเนอร์ชิปและพัฒนาธุรกิจ ตั้งแต่คุยกันครั้งแรก จนติดตั้งใช้งานได้จริง',
  },
  lede: {
    en: 'I open new retail channels, model the deal so both sides win, and project-manage the rollout until it runs. Now at Actmedia, a retail-media network in Thailand. I also build working software with AI, so I can prototype the tool a deal needs.',
    th: 'ผมเปิดช่องทางใหม่กับค้าปลีก วางโครงดีลให้คุ้มทั้งสองฝ่าย และดูแลการติดตั้งจนระบบเดินได้จริง ตอนนี้ทำงานที่ Actmedia เครือข่ายสื่อในร้านค้าปลีกของไทย และยังสร้างซอฟต์แวร์ที่ใช้งานได้จริงด้วย AI จึงทำต้นแบบเครื่องมือที่ดีลต้องใช้ได้เอง',
  },
  emailMe: { en: 'Email me', th: 'ส่งอีเมล' },
  downloadResume: { en: 'Download résumé', th: 'ดาวน์โหลดเรซูเม่' },
  experienceAt: { en: 'Experience at', th: 'ประสบการณ์ที่' },
  founder: { en: 'founder', th: 'ผู้ก่อตั้ง' },
  highlights: { en: 'Highlights', th: 'ไฮไลต์' },
} satisfies Record<string, Localized>;

export interface ProofStat {
  value: string;
  /** Smaller trailing part of the value, e.g. "/ 500". */
  unit?: string;
  label: Localized;
}

export const PROOF_STATS: ProofStat[] = [
  // Career · Actmedia: "Project-manage 4 live rollouts across retailer, supplier and internal teams."
  { value: '4', label: { en: 'live in-store rollouts I project-manage', th: 'งานติดตั้งในร้านที่ผมบริหารอยู่' } },
  // Career · Actmedia: "Found 3–4 new channel opportunities with Modern Trade retailers, now in active discussion."
  { value: '3–4', label: { en: 'new retail channel opportunities, in active discussion', th: 'ช่องทางค้าปลีกใหม่ ที่กำลังเจรจาอยู่' } },
  // Projects · Tripedia: "Final 30 of 500 teams" (KATALYST Startup Launchpad, 2022).
  { value: '30', unit: '/ 500', label: { en: 'startup finalist, KATALYST Launchpad 2022', th: 'ทีมเข้ารอบสุดท้าย KATALYST Launchpad 2022' } },
  // Career · A Bun Dance: "Held gross profit at ~35% per unit", 20 months.
  { value: '~35%', label: { en: 'gross profit per unit, 20 months running my own shop', th: 'กำไรขั้นต้นต่อชิ้น ตลอด 20 เดือนที่บริหารร้านเอง' } },
];
