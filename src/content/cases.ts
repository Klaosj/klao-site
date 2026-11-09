import type { CaseStudy } from '@/lib/cases';

// Recruiter Edition (2026-11-09): client work told as method. Rules, from the
// portfolio inventory Klao approved on 9 Nov 2026:
//   - no client, partner or colleague names; no THB, store counts, budgets,
//     rate-card prices or revenue-share terms;
//   - outcomes only where already public on this site (Career band wording);
//   - every artifact is illustrative or sample data, labelled as such;
//   - status 'draft' until Klao clears the text -- drafts never render on the
//     production deployment (see visibleCases in src/lib/cases.ts).
export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: 'rollout-playbook',
    status: 'draft',
    thumb: 'rollout',
    kicker: { en: 'Actmedia · Project management · 2026–now', th: 'Actmedia · บริหารโปรเจกต์ · 2026–ปัจจุบัน' },
    title: {
      en: 'Rolling out an in-store screen network, store by store',
      th: 'ติดตั้งเครือข่ายจอในร้านค้าปลีก ทีละร้าน ทีละชุด',
    },
    summary: {
      en: 'Batch planning with a cost cap per store, a 30-point launch checklist I built, and a supplier renegotiation that kept the budget whole.',
      th: 'วางแผนติดตั้งเป็นชุด คุมงบต่อร้าน ใช้เช็กลิสต์ 30 ข้อที่ผมทำเอง และเจรจากับซัพพลายเออร์ใหม่จนงบไม่บานปลาย',
    },
    outcome: { en: 'About two-thirds complete, on track', th: 'คืบหน้าราวสองในสาม ตรงตามแผน' },
    lede: {
      en: 'A national supermarket chain agreed to a network of in-store screens. My job is to get it installed, sold and running across three sides — the retailer, an installation supplier and our own teams — without the schedule or the budget drifting.',
      th: 'เครือซูเปอร์มาร์เก็ตระดับประเทศตกลงติดตั้งเครือข่ายจอในร้าน หน้าที่ของผมคือทำให้จอถูกติดตั้ง ขายได้ และเดินระบบได้จริง โดยประสานสามฝ่าย คือค้าปลีก ซัพพลายเออร์ติดตั้ง และทีมของเราเอง โดยไม่ให้ทั้งเวลาและงบหลุดแผน',
    },
    meta: [
      { label: { en: 'Role', th: 'บทบาท' }, value: { en: 'Project manager, rollout owner', th: 'ผู้จัดการโปรเจกต์ เจ้าของงานติดตั้ง' } },
      { label: { en: 'Worked with', th: 'ทำงานกับ' }, value: { en: 'Retailer · installer · sales, planning, ops', th: 'ค้าปลีก · ผู้ติดตั้ง · ทีมขาย วางแผน ปฏิบัติการ' } },
      { label: { en: 'Tools', th: 'เครื่องมือ' }, value: { en: 'Batch plan · launch checklist · CRM', th: 'แผนติดตั้งเป็นชุด · เช็กลิสต์เปิดตัว · CRM' } },
      { label: { en: 'Status', th: 'สถานะ' }, value: { en: 'About two-thirds complete, on track', th: 'คืบหน้าราวสองในสาม ตรงตามแผน' } },
    ],
    confidentiality: {
      en: 'The client’s name, store counts and budgets are confidential and left out. The tracker below uses illustrative data.',
      th: 'ไม่ระบุชื่อลูกค้า จำนวนสาขา และงบประมาณ ตารางด้านล่างเป็นข้อมูลสมมติเพื่อแสดงวิธีทำงาน',
    },
    problem: [
      {
        en: 'Physical rollouts rarely fail in one big moment. One store slips, then a batch, and nobody sees it until the contract date. Costs creep up store by store. And when installation ends, nobody clearly owns the network.',
        th: 'งานติดตั้งหน้าร้านไม่ค่อยพังในครั้งเดียว แต่พังทีละนิด ร้านหนึ่งช้า แล้วทั้งชุดก็ช้าตาม โดยไม่มีใครเห็นจนใกล้วันส่งงานตามสัญญา ต้นทุนค่อยๆ ขึ้นทีละร้าน และพอติดตั้งเสร็จ ก็ไม่ชัดว่าใครเป็นเจ้าของเครือข่ายต่อ',
      },
    ],
    steps: [
      {
        title: { en: 'Planned in batches, with a cost cap per store', th: 'วางแผนเป็นชุด และตั้งเพดานต้นทุนต่อร้าน' },
        body: {
          en: 'Each batch is checked against the cap before the next one starts, so overspend shows up early and stays small.',
          th: 'ทุกชุดต้องผ่านการเทียบกับเพดานต้นทุนก่อนเริ่มชุดถัดไป ถ้าเกินงบจะเห็นตั้งแต่เนิ่นๆ และยังแก้ได้ง่าย',
        },
      },
      {
        title: { en: 'Agreed a baseline with management', th: 'ตกลง baseline กับผู้บริหาร' },
        body: {
          en: 'Every task has an owner, a due date and a baseline, so a slip shows up the week it happens, not at the deadline.',
          th: 'ทุกงานมีเจ้าของ มีกำหนดส่ง และมี baseline ถ้างานไหนช้าจะเห็นในสัปดาห์นั้นเลย ไม่ใช่ตอนใกล้เส้นตาย',
        },
      },
      {
        title: { en: 'Built the launch tracker myself', th: 'สร้าง tracker สำหรับเปิดตัวเอง' },
        body: {
          en: 'A 30-point checklist covers every launch in five stages: commercial terms, screen preparation, installation, sales readiness and post-launch audit.',
          th: 'เช็กลิสต์ 30 ข้อครอบคลุมทุกการเปิดตัวใน 5 ขั้น คือเงื่อนไขการค้า เตรียมจอ ติดตั้ง ความพร้อมของทีมขาย และตรวจหลังเปิดตัว',
        },
      },
      {
        title: { en: 'Held the budget when a supplier raised prices', th: 'คุมงบไว้ได้ตอนซัพพลายเออร์ขึ้นราคา' },
        body: {
          en: 'Mid-project, a supplier raised prices. I renegotiated and found a new source, and the budget held.',
          th: 'ระหว่างโปรเจกต์ ซัพพลายเออร์ขึ้นราคา ผมเจรจาใหม่และหาแหล่งใหม่ได้ งบจึงยังอยู่ในกรอบเดิม',
        },
      },
      {
        title: { en: 'Handed it over so it keeps running', th: 'ส่งมอบงานให้เดินต่อได้เอง' },
        body: {
          en: 'Operations got an owner map, and sales got a CRM setup they can run themselves.',
          th: 'ทีมปฏิบัติการได้แผนผังว่าใครดูแลอะไร และทีมขายได้ CRM ที่ใช้งานต่อเองได้',
        },
      },
    ],
    artifact: {
      kind: 'tracker',
      heading: { en: 'The tracker', th: 'ตาราง tracker' },
      intro: {
        en: 'One row per batch, one column per stage. The point is that a slip is visible the week it happens.',
        th: 'หนึ่งแถวต่อหนึ่งชุดติดตั้ง หนึ่งคอลัมน์ต่อหนึ่งขั้น เป้าหมายคือเห็นงานที่ช้าได้ในสัปดาห์ที่มันเกิด',
      },
      caption: { en: 'Illustrative data, not the real project', th: 'ข้อมูลสมมติ ไม่ใช่ข้อมูลโปรเจกต์จริง' },
    },
    result: {
      headline: {
        en: 'The largest rollout is about two-thirds complete and on track to the contract.',
        th: 'งานติดตั้งที่ใหญ่ที่สุดคืบหน้าราวสองในสาม และเดินตามสัญญา',
      },
      draftNote: {
        en: 'Klao to confirm the current status and its date before publishing.',
        th: 'เกลาต้องยืนยันสถานะล่าสุดและวันที่ก่อนเผยแพร่',
      },
    },
    skills: {
      en: 'Skills this shows: project delivery, vendor negotiation, budget control, working across three organisations, and handing a system over so it keeps running.',
      th: 'ทักษะที่เห็นจากงานนี้: ส่งมอบโปรเจกต์ เจรจากับผู้ขาย คุมงบ ประสานงานข้ามสามองค์กร และส่งมอบระบบให้เดินต่อได้เอง',
    },
  },
  {
    slug: 'uat-bug-desk',
    status: 'draft',
    thumb: 'uat',
    image: {
      src: '/images/uat-desk-list.jpg',
      alt: {
        en: 'Bug list of the demo desk: status and vendor-answer filters at the top, then bug cards grouped by the vendor’s answer, each with severity, impact, area and reporter.',
        th: 'หน้ารายการบั๊กของเดโม แถบกรองตามสถานะและคำตอบของผู้พัฒนาอยู่ด้านบน ตามด้วยการ์ดบั๊กที่จัดกลุ่มตามคำตอบ แต่ละใบบอกความรุนแรง ผลกระทบ ส่วนของระบบ และผู้แจ้ง',
      },
    },
    imagePhone: {
      src: '/images/uat-desk-phone.jpg',
      alt: {
        en: 'The same bug list on a phone, where most testers reported from.',
        th: 'รายการบั๊กเดียวกันบนมือถือ ซึ่งผู้ทดสอบส่วนใหญ่ใช้แจ้ง',
      },
    },
    imageMini: { src: '/images/uat-desk-cards.jpg' },
    demo: {
      url: 'https://uat-bug-desk.vercel.app',
      previewUrl: 'https://uat-bug-desk-klaosjs-projects.vercel.app',
    },
    kicker: { en: 'Actmedia · CRM rollout · Built by me · 2026', th: 'Actmedia · ติดตั้ง CRM · สร้างเอง · 2026' },
    title: {
      en: 'A bug desk that kept a CRM user-acceptance test moving',
      th: 'ระบบแจ้งบั๊กที่ทำให้การทดสอบ CRM ก่อนใช้งานจริงเดินต่อได้',
    },
    summary: {
      en: 'Testers report a bug in under a minute with a marked-up screenshot; I triage it, record the vendor’s answer and keep paid change requests apart from real bugs.',
      th: 'ผู้ทดสอบแจ้งบั๊กได้ในไม่ถึงนาทีพร้อมภาพหน้าจอที่วงจุดปัญหา ผมคัดแยกความรุนแรง บันทึกคำตอบของผู้พัฒนา และแยก change request ที่มีค่าใช้จ่ายออกจากบั๊กจริง',
    },
    outcome: { en: 'Working tool · try the demo with sample data', th: 'ใช้งานได้จริง · ลองเดโมด้วยข้อมูลตัวอย่างได้' },
    lede: {
      en: 'Our sales team was testing a new CRM before go-live, with an outside vendor building it. I built a small web app so testers could report problems properly and both sides could work from one list.',
      th: 'ทีมขายของเรากำลังทดสอบ CRM ใหม่ก่อนใช้งานจริง โดยมีผู้พัฒนาภายนอกเป็นคนสร้าง ผมจึงทำเว็บแอปเล็กๆ ให้ผู้ทดสอบแจ้งปัญหาได้ครบถ้วน และให้ทั้งสองฝ่ายทำงานจากรายการเดียวกัน',
    },
    meta: [
      { label: { en: 'Role', th: 'บทบาท' }, value: { en: 'UAT lead for the business side; designed and built the tool', th: 'ผู้นำการทดสอบฝั่งธุรกิจ ออกแบบและสร้างเครื่องมือเอง' } },
      { label: { en: 'Users', th: 'ผู้ใช้' }, value: { en: 'Sales testers · project lead · vendor', th: 'ผู้ทดสอบฝั่งขาย · หัวหน้าโปรเจกต์ · ผู้พัฒนา' } },
      { label: { en: 'Built with', th: 'สร้างด้วย' }, value: { en: 'HTML, CSS, JavaScript · Supabase · Vercel', th: 'HTML, CSS, JavaScript · Supabase · Vercel' } },
      { label: { en: 'Demo', th: 'เดโม' }, value: { en: 'Same screens, sample data only', th: 'หน้าจอเดียวกัน ใช้ข้อมูลตัวอย่างทั้งหมด' } },
    ],
    confidentiality: {
      en: 'The real desk sits behind a passcode. The demo is a copy with every bug, name and screen invented, so nothing from the project leaves the company.',
      th: 'ระบบจริงต้องใช้รหัสผ่าน เดโมเป็นสำเนาที่สร้างบั๊ก ชื่อ และหน้าจอขึ้นมาใหม่ทั้งหมด ไม่มีข้อมูลโปรเจกต์จริงหลุดออกไป',
    },
    problem: [
      {
        en: 'In a user-acceptance test, bugs arrive in chat threads and spreadsheets: a screenshot here, “it doesn’t work” there. The vendor can’t reproduce them, nobody knows which ones block go-live, and change requests get mixed up with real bugs, which is where the budget leaks.',
        th: 'ช่วงทดสอบก่อนใช้งานจริง บั๊กมักมาทางแชตและสเปรดชีต ภาพหน้าจอบ้าง ข้อความว่า “มันใช้ไม่ได้” บ้าง ผู้พัฒนาทำซ้ำไม่ได้ ไม่มีใครรู้ว่าข้อไหนขวางการขึ้นระบบ และ change request ปนกับบั๊กจริง ซึ่งเป็นจุดที่งบรั่วไหล',
      },
    ],
    steps: [
      {
        title: { en: 'Made reporting take under a minute', th: 'ทำให้แจ้งบั๊กเสร็จในไม่ถึงนาที' },
        body: {
          en: 'Paste a screenshot, circle the problem with a pen, pick where it happened and how much it hurts. Thai and English on the same screen, and a draft saves itself.',
          th: 'วางภาพหน้าจอ วงจุดที่ผิดด้วยปากกา เลือกว่าเกิดที่ส่วนไหนและกระทบงานแค่ไหน มีทั้งไทยและอังกฤษในหน้าเดียว และบันทึกร่างให้อัตโนมัติ',
        },
      },
      {
        title: { en: 'Split “how bad” from “whose call”', th: 'แยก “หนักแค่ไหน” ออกจาก “ใครเป็นคนตัดสิน”' },
        body: {
          en: 'Testers say the impact on their work; the project lead sets the severity. Critical bugs sort to the top.',
          th: 'ผู้ทดสอบบอกผลกระทบต่องานของตัวเอง ส่วนหัวหน้าโปรเจกต์เป็นคนกำหนดความรุนแรง บั๊กระดับวิกฤตจะขึ้นไปอยู่บนสุด',
        },
      },
      {
        title: { en: 'Recorded the vendor’s answer as one of six verdicts', th: 'บันทึกคำตอบของผู้พัฒนาเป็นหนึ่งในหกแบบ' },
        body: {
          en: 'Fixed, will fix, change request (free or paid), explained, or not feasible. Paid change requests stay visible on their own, instead of hiding inside the bug count.',
          th: 'แก้แล้ว รับแก้ change request (ฟรีหรือเสียเงิน) อธิบายเหตุผล หรือทำไม่ได้ change request ที่ต้องจ่ายเงินจึงเห็นแยกชัดเจน ไม่ไปซ่อนอยู่ในจำนวนบั๊ก',
        },
      },
      {
        title: { en: 'Closed the loop', th: 'ปิดวงจรงานให้ครบ' },
        body: {
          en: 'Every bug moves from new to fixing, ready to retest and closed, with a fix date and a retest note on record.',
          th: 'ทุกบั๊กเดินจากใหม่ ไปกำลังแก้ รอทดสอบซ้ำ และปิดงาน โดยมีวันกำหนดแก้และบันทึกผลทดสอบซ้ำเก็บไว้',
        },
      },
      {
        title: { en: 'Exported it for the steering meeting', th: 'ส่งออกข้อมูลไปใช้ในที่ประชุม' },
        body: {
          en: 'One click gives a CSV of whatever is filtered, ready for the go-live discussion.',
          th: 'กดครั้งเดียวได้ไฟล์ CSV ตามตัวกรองที่เลือก พร้อมใช้คุยเรื่องการขึ้นระบบ',
        },
      },
    ],
    artifact: {
      kind: 'demo',
      heading: { en: 'Try it', th: 'ลองใช้' },
      intro: {
        en: 'Open the demo as a tester to report a bug, or as the project lead to triage one. It runs in your browser on sample data.',
        th: 'เปิดเดโมในบทผู้ทดสอบเพื่อแจ้งบั๊ก หรือในบทหัวหน้าโปรเจกต์เพื่อคัดแยกบั๊ก ทุกอย่างทำงานในเบราว์เซอร์ของคุณด้วยข้อมูลตัวอย่าง',
      },
      caption: { en: 'Sample data only. Nothing you enter leaves your browser.', th: 'ข้อมูลตัวอย่างเท่านั้น สิ่งที่คุณพิมพ์จะอยู่ในเบราว์เซอร์ของคุณเท่านั้น' },
      image: {
        src: '/images/uat-desk-report.jpg',
        width: 2160,
        height: 1400,
        alt: {
          en: 'The report form: pick the part of the system in plain words, then how much it affects your work, then send.',
          th: 'ฟอร์มแจ้งบั๊ก เลือกส่วนของระบบด้วยคำง่าย ๆ เลือกว่ากระทบงานแค่ไหน แล้วกดส่ง',
        },
      },
    },
    result: {
      headline: {
        en: 'One list both sides work from: every bug has a screenshot, an owner, and the vendor’s answer on record.',
        th: 'มีรายการเดียวที่ทั้งสองฝ่ายใช้ร่วมกัน ทุกบั๊กมีภาพหน้าจอ มีผู้รับผิดชอบ และมีคำตอบของผู้พัฒนาบันทึกไว้',
      },
      draftNote: {
        en: 'Klao to confirm how the desk was used (and any figure he is happy to share) before publishing.',
        th: 'เกลาต้องยืนยันว่าใช้ระบบนี้อย่างไร (และตัวเลขที่ยินดีเปิดเผย) ก่อนเผยแพร่',
      },
    },
    skills: {
      en: 'Skills this shows: running a user-acceptance test, managing a vendor, spotting scope creep early, and building the tool the process needed.',
      th: 'ทักษะที่เห็นจากงานนี้: ทำการทดสอบก่อนใช้งานจริง บริหารผู้พัฒนาภายนอก จับ scope ที่บานออกได้เร็ว และสร้างเครื่องมือที่กระบวนการต้องใช้',
    },
  },
];
