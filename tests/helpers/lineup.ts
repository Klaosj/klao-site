import type { Project } from '@/lib/models';
import { makeProject } from './project';

// The prototype's five-project lineup (design/white-edition/prototype/index.html, `P` and
// `STATUS`), shaped as the P1 Project model, plus Cafénista (below). Test data only -- every
// string here is public copy from the prototype or the bundled fixture.
//
// Built on P1's makeProject/P1_DEFAULTS (tests/helpers/project.ts) rather than a second
// BASE (preflight ruling D-3): P1's bare-row default is a screenshot ('img' + a proxy
// imageSrc), so any row here that has no screenshot in the prototype -- Talatify's rings,
// Tripedia's five-apps drawing -- passes `imageSrc: null` explicitly instead of inheriting
// that default.
export { makeProject };

export const TALATIFY = makeProject({
  id: 'fx-talatify',
  name: 'Talatify',
  type: 'business',
  order: 1,
  imageSrc: null,
  description: {
    en: 'Fresh-market delivery platform: local wet-market vendors sell online and deliver straight to restaurants and cafés. Co-founder; pitched at the TEP startup screening round, 2025.',
    th: 'แพลตฟอร์มส่งของสดจากตลาด: พ่อค้าแม่ค้าตลาดสดขายออนไลน์และส่งตรงถึงร้านอาหารและคาเฟ่ เป็น Co-founder นำเสนอในรอบคัดเลือก TEP startup ปี 2025',
  },
  question: {
    en: 'Can a restaurant get wet-market fresh produce without the morning market run?',
    th: 'ร้านอาหารจะได้ของสดจากตลาด โดยไม่ต้องไปจ่ายตลาดเองตอนเช้า ได้ไหม?',
  },
  statusKey: 'pitched',
  status: { en: 'Pitched · TEP 2025', th: 'นำเสนอแล้ว · TEP 2025' },
  kicker: { en: 'Business · Co-founder · 2025', th: 'ธุรกิจ · Co-founder · 2025' },
  media: 'rings',
  alt: {
    en: 'Three nested rings labelled TAM, SAM and SOM, with SOM filled. Method, not to scale.',
    th: 'วงกลมซ้อนสามวง TAM, SAM และ SOM โดยระบาย SOM วิธีคิด ไม่ใช่สัดส่วนจริง',
  },
  outcomes: {
    en: ['Market sized (TAM–SAM–SOM, SOM THB 37M, an estimate)', '5 revenue streams', 'First-year financial plan', 'Clickable prototype'],
    th: ['ขนาดตลาด TAM–SAM–SOM (SOM 37 ล้านบาท เป็นการประเมิน)', '5 ช่องทางรายได้', 'แผนการเงินปีแรก', 'prototype กดได้จริง'],
  },
});

export const TRIPEDIA = makeProject({
  id: 'fx-tripedia',
  name: 'Tripedia',
  type: 'business',
  order: 2,
  imageSrc: null,
  description: {
    en: 'Travel-tech startup idea: one platform that plans the whole trip in one place. Co-founder at KATALYST Startup Launchpad 2022, the idea GoNai was later built from.',
    th: 'ไอเดียสตาร์ทอัพท่องเที่ยว: แพลตฟอร์มเดียวที่วางแผนทั้งทริปจบในที่เดียว เป็น Co-founder ใน KATALYST Startup Launchpad 2022 และเป็นไอเดียต้นทางที่ GoNai ถูกสร้างขึ้นจริงในภายหลัง',
  },
  // The Thai carries the prototype card's one allowed break mark, so tests can prove it is
  // removed everywhere it renders.
  question: { en: 'Why does planning one trip take five apps?', th: 'ทำไมวางแผนทริปเดียว|ต้องใช้ตั้งห้าแอป?' },
  statusKey: 'finalist',
  status: { en: 'Final 30 of 500 · 2022', th: 'รอบ 30 ทีมสุดท้ายจาก 500 · 2022' },
  kicker: { en: 'Business · Co-founder · 2022', th: 'ธุรกิจ · Co-founder · 2022' },
  media: 'five',
  alt: { en: 'Five separate app squares become one.', th: 'แอปห้าตัวแยกกัน รวมเป็นหนึ่งเดียว' },
  outcomes: {
    en: ['Final 30 of 500 teams', 'Market sized (TAM–SAM–SOM)', 'Subscription + partner-margin revenue model'],
    th: ['เข้ารอบ 30 ทีมสุดท้ายจาก 500 ทีม', 'ขนาดตลาด TAM–SAM–SOM', 'โมเดลรายได้ subscription + ส่วนแบ่งจากพาร์ตเนอร์'],
  },
});

export const AJE = makeProject({
  id: 'fx-aje',
  name: 'Aje',
  type: 'build',
  order: 3,
  description: {
    en: 'Idea-grading workspace for startup ideas: write one paragraph, get it graded against proven frameworks, and leave with one small test to run next.',
    th: 'เวิร์กสเปซตัดเกรดไอเดียสตาร์ทอัพ: เขียนหนึ่งย่อหน้า ระบบให้เกรดตาม framework ที่พิสูจน์แล้ว แล้วได้การทดสอบเล็กๆ หนึ่งอย่างไปทำต่อ',
  },
  question: { en: 'Is this idea worth a weekend, or a year?', th: 'ไอเดียนี้คุ้มกับ|หนึ่งสุดสัปดาห์ หรือทั้งปี?' },
  statusKey: 'proto',
  status: { en: 'Working prototype', th: 'Prototype ใช้งานได้' },
  kicker: { en: 'Build · Working prototype', th: 'สร้างเอง · Prototype ใช้งานได้' },
  media: 'img',
  wash: 'aje',
  tour: true,
  tourOrder: 1,
  imageSrc: '/images/aje.jpg',
  stack: ['Next.js', 'Claude API', 'Ollama'],
  alt: {
    en: 'Aje’s Review screen for a sample idea, BikeFix Home: its readiness level and a one-line summary of the idea.',
    th: 'หน้า Review ของ Aje สำหรับไอเดียตัวอย่าง BikeFix Home: ระดับความพร้อม และสรุปไอเดียในหนึ่งบรรทัด',
  },
  outcomes: {
    en: ['Working prototype', '8-dimension report card with letter grades', '16 hand-drawn framework diagrams', 'Advisor runs on Claude or a local model'],
    th: ['prototype ใช้งานได้จริง', 'report card 8 มิติพร้อมเกรด', 'framework diagram 16 ใบวาดเอง', 'advisor รันบน Claude หรือโมเดล local'],
  },
});

export const GONAI = makeProject({
  id: 'fx-gonai',
  name: 'GoNai',
  type: 'build',
  order: 4,
  description: {
    en: 'One-day Bangkok trip planner with exact budgets, built as a weekend project.',
    th: 'แอปวางแผนเที่ยวกรุงเทพฯ 1 วัน พร้อมงบประมาณละเอียด สร้างเสร็จในสุดสัปดาห์เดียว',
  },
  question: { en: 'One day in Bangkok — what’s the real budget?', th: 'ไปเที่ยวหนึ่งวัน งบจริงๆ เท่าไหร่?' },
  statusKey: 'live',
  status: { en: 'Live · since Aug 2026', th: 'เปิดใช้งานแล้ว · ตั้งแต่ ส.ค. 2026' },
  kicker: { en: 'Build · Live', th: 'สร้างเอง · เปิดใช้งานแล้ว' },
  media: 'win',
  wash: 'gonai',
  tour: true,
  tourOrder: 2,
  liveUrl: 'https://gonai-three.vercel.app',
  imageSrc: '/images/gonai.jpg',
  stack: ['Next.js', 'Supabase'],
  lineageOf: 'fx-tripedia',
  alt: {
    en: 'GoNai home screen: the headline Plan a full day out, know every baht before you leave.',
    th: 'หน้าแรกของ GoNai: หัวข้อ วางแผนเที่ยวทั้งวัน รู้ทุกบาทก่อนออกจากบ้าน',
  },
});

// S-4: imageSrc: null and order: 5, matching P1's fixture (src/content/fixtures/projects.json)
// -- not the brief's original '/images/klao-site.jpg' / order 6, which drifted from it.
export const KLAO_SITE = makeProject({
  id: 'fx-klao-site',
  name: 'klao-site',
  type: 'build',
  order: 5,
  imageSrc: null,
  description: {
    en: 'This site. A bilingual personal hub where every project, career entry and line of copy is edited in Notion and goes live within the hour, with no deploy.',
    th: 'เว็บนี้เอง: hub ส่วนตัวสองภาษาที่ทุกโปรเจกต์ ประวัติงาน และข้อความ แก้ใน Notion แล้วขึ้นเว็บภายในหนึ่งชั่วโมง ไม่ต้อง deploy',
  },
  question: {
    en: 'Can a personal site update itself from Notion, in two languages?',
    th: 'เว็บส่วนตัวอัปเดตตัวเองจาก Notion สองภาษาได้ไหม?',
  },
  statusKey: 'live',
  status: { en: 'Live · since Aug 2026', th: 'เปิดใช้งานแล้ว · ตั้งแต่ ส.ค. 2026' },
  kicker: { en: 'Build · This site', th: 'สร้างเอง · เว็บนี้เอง' },
  media: 'notion',
  wash: 'site',
  tour: true,
  tourOrder: 3,
  liveUrl: 'https://klao-site.vercel.app',
  repoUrl: 'https://github.com/Klaosj/klao-site',
  stack: ['Next.js', 'Notion API', 'Vercel'],
  alt: {
    en: 'The project’s own Notion row: name, type, stack and status.',
    th: 'แถวข้อมูลของโปรเจกต์นี้ใน Notion: ชื่อ ประเภท stack และสถานะ',
  },
  outcomes: {
    en: ['Live since Aug 2026', 'Notion as the only CMS', 'EN/TH', '400+ automated tests'],
    th: ['ออนไลน์ตั้งแต่ ส.ค. 2026', 'Notion เป็น CMS เดียว', 'EN/TH', 'เทสต์อัตโนมัติ 400+ ข้อ'],
  },
});

// Added 30 Sep 2026, after the prototype: a sixth row, matching the bundled fixture. A plain
// screenshot build ('img', no wash, not in the tour) -- the first row with a product clip
// (src/lib/project-clips.ts), so the clip tests can open it from the same lineup.
export const CAFENISTA = makeProject({
  id: 'fx-cafenista',
  name: 'Cafénista',
  type: 'build',
  order: 6,
  description: {
    en: 'A learning project: what an independent café owner could see on one screen. Sales from the POS, machine temperatures over MQTT, and brew notes tied to each bean. It runs on simulated data and hasn’t been tried in a real café yet.',
    th: 'โปรเจกต์ฝึกมือ: เจ้าของคาเฟ่อิสระควรเห็นอะไรบนจอเดียว ยอดขายจาก POS อุณหภูมิเครื่องผ่าน MQTT และบันทึกการชงผูกกับแต่ละเมล็ด ตอนนี้ใช้ข้อมูลจำลอง ยังไม่ได้ลองกับร้านจริง',
  },
  question: {
    en: 'Can one screen tell an owner who’s away how the machine, the bar and the till are doing?',
    th: 'จอเดียวบอกเจ้าของที่ไม่อยู่ร้านได้ไหม ว่าเครื่อง บาร์ และยอดขายเป็นยังไง?',
  },
  statusKey: 'proto',
  status: { en: 'Prototype · simulated data', th: 'Prototype · ข้อมูลจำลอง' },
  kicker: { en: 'Build · Prototype', th: 'สร้างเอง · Prototype' },
  media: 'img',
  imageSrc: '/images/cafenista.jpg',
  stack: ['Next.js', 'Postgres', 'MQTT', 'Playwright'],
  alt: {
    en: 'Cafénista’s owner screen for today: a red “machine running cold” alert above the day’s net sales.',
    th: 'จอ “วันนี้” ของเจ้าของร้านใน Cafénista: แจ้งเตือนสีแดง “เครื่องชงเย็นกว่าปกติ” เหนือยอดสุทธิของวัน',
  },
  outcomes: {
    en: ['M0–M4 built', '500 unit + 105 browser tests', 'Simulated data, no real café yet'],
    th: ['สร้างครบ M0–M4', 'เทสต์ unit 500 + browser 105 ข้อ', 'ข้อมูลจำลอง ยังไม่มีร้านจริง'],
  },
});

export const LINEUP: Project[] = [TALATIFY, TRIPEDIA, AJE, GONAI, KLAO_SITE, CAFENISTA];
