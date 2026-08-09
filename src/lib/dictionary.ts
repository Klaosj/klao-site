import type { Locale } from './models';

const en = {
  // T11: SiteNav's four in-page anchors reuse each section's own eyebrow
  // label where one already exists (about/selectedWork/career) -- `home`
  // is the one genuinely new label, since Hero has no eyebrow of its own.
  home: 'Home',
  projects: 'Projects',
  writing: 'Writing',
  career: 'Career',
  resume: 'Resume',
  selectedProjects: 'Selected projects',
  latestWriting: 'Latest writing',
  allProjects: 'All projects',
  allPosts: 'All posts',
  now: 'Now',
  fullCareer: 'Full career',
  back: 'Back',
  email: 'Email',
  liveSite: 'Live site',
  viewCode: 'View code',
  greeting: "Hi, I'm",
  roleLine: 'Business Development · builds his own tools',
  about: 'About',
  howIWork: 'How I work',
  selectedWork: 'Selected work',
  craft: [
    'Scope it honestly.',
    'Ship something that runs.',
    'Write it in both languages.',
    'Leave it maintainable.',
    'Say the number out loud.',
    'Then hand over the keys.',
  ] as readonly string[],
  // Distinct from `about`/`howIWork` above, which are the short eyebrow
  // labels: these are the bigger thesis-statement headings (and, for About,
  // its sub-head) that sit below each eyebrow. Ported verbatim from
  // .superpowers/brainstorm/11719-1786211516/content/studio.html, which
  // gives every band its own eyebrow/bigHead pair. Originally kept as
  // component-local constants (T8 first pass); moved here on review because
  // `craft` above is the same category of fixed, non-profile copy and
  // already lives in the dictionary, and because a local constant sits
  // outside both `th: typeof en`'s compile-time key check and this file's
  // own empty-string/untranslated-string tests below -- exactly the kind of
  // guard a translated <h2>/<h3> needs.
  craftHeading: 'Six things I will not trade away.',
  aboutHeading: 'I like building things that are simple, and that stay running.',
  aboutSubhead: 'A short story about how I ended up on both sides of the table.',
  copied: 'Copied',
  startConversation: 'Start a conversation',
  basedIn: 'Based in',
  workingIn: 'Working in',
  photoPlaceholder: 'Photo',
  careerUnpublished: 'Career data not yet published',
  // T10: CvBand's stat grid is derived from the real `entries` array (role
  // count, unique company count, wins shipped) plus LOCALES.length -- never
  // fabricated numbers -- so only the four labels are fixed copy. Same
  // rationale as craftHeading/aboutHeading above: this is fixed,
  // non-profile UI copy, so it belongs in the dictionary, not a
  // component-local constant.
  statRoles: 'positions held',
  statCompanies: 'companies worked with',
  statWins: 'wins shipped, in both languages',
  statLanguages: 'working languages, both first-class',
  // ContactBand's statement heading. Ported verbatim from
  // .superpowers/brainstorm/11719-1786211516/content/studio.html's #contact
  // bigHead, same as craftHeading/aboutHeading.
  contactHeading: 'Have something that should exist?',

  // --- QA 2026-08-09 additions -------------------------------------------
  // Skip link (WCAG 2.4.1). The header is fixed and holds ~10 focusable
  // items, so a keyboard user otherwise tabs the whole nav on every route.
  skipToContent: 'Skip to content',

  // Custom 404. Next's default ships with no <html lang>, no links out and
  // none of this site's styling -- see .superpowers/qa/2026-08-09-QA-SUMMARY.md C3.
  notFoundTitle: 'This page does not exist.',
  notFoundBody: 'The link may be out of date, or the address mistyped.',
  backHome: 'Back to home',

  // CvBand had an eyebrow but no heading of its own, so heading navigation
  // skipped the whole section (QA I5). This is the heading that fixes it.
  cvHeading: 'Where I have been, and what came of it.',

  // "Companies & brands" band. Names come from profile.json's `clients`,
  // seeded from the owner's OWN career.json -- employers plus the accounts
  // he names in his own ActMedia bullet. Nothing here is invented.
  clients: 'Companies & brands',
  clientsHeading: 'Rooms I have already been in.',

  // CopyEmail's button label. The visible "Copied" text used to be
  // concatenated into the button's accessible name before any click; the
  // button now carries this explicit label instead (QA C2).
  copyEmailAction: 'Copy email address',

  // Hero identity stack, replacing the single `roleLine` above. Every line
  // is literally true of the owner and traceable to his own data: "Business
  // development" is his current ActMedia title, "Barista" is the VELA Central
  // World role in career.json, and the tools are the four builds in
  // projects.json. The combination is the differentiator -- one sentence
  // buried the fact that all three are the same person. Same fixed-copy
  // category as `craft` above, hence a dictionary array rather than a
  // profile field.
  identities: ['Business development.', 'Barista.', 'Builds his own tools.'] as readonly string[],

  // About band's story beats. Every sentence is traceable to career.json:
  // A Bun Dance (business owner), VELA Central World (senior barista),
  // ActMedia (senior BD) + the projects in projects.json. Fixed copy, same
  // category as `craft`, hence dictionary not profile.
  aboutStory: [
    'Started on the owner side of the table — ran A Bun Dance, a craft-burger shop, where menu R&D, pricing and gross margin were all mine to get right.',
    'Learned service the honest way, behind the bar at VELA — one quality standard per cup, kept under pressure.',
    'Now I sell for ActMedia by day and build my own tools at night. When I scope software for a business, I have already sat on both sides of the table.',
  ] as readonly string[],

  // /writing rendered a bare empty <ul> with no message once the two
  // placeholder posts were pulled. Mirrors `careerUnpublished` above: say
  // the content is not there yet rather than showing an empty container the
  // visitor has to interpret.
  writingUnpublished: 'No posts published yet.',

  // Landmark names. Two <nav> elements need distinguishing accessible names,
  // and both were hardcoded English on the Thai pages -- a screen reader
  // reading /th announced "Main navigation" and "Language navigation" in the
  // wrong language. Not inline strings in the components: that is the
  // pattern this codebase deliberately avoids.
  navMain: 'Main',
  navLanguage: 'Language',
};

const th: typeof en = {
  home: 'หน้าแรก',
  projects: 'ผลงาน',
  writing: 'บทความ',
  career: 'เส้นทางอาชีพ',
  resume: 'เรซูเม่',
  selectedProjects: 'ผลงานเด่น',
  latestWriting: 'บทความล่าสุด',
  allProjects: 'ผลงานทั้งหมด',
  allPosts: 'บทความทั้งหมด',
  now: 'ตอนนี้',
  fullCareer: 'เส้นทางอาชีพทั้งหมด',
  back: 'กลับ',
  email: 'อีเมล',
  liveSite: 'ดูเว็บไซต์',
  viewCode: 'ดูโค้ด',
  greeting: 'สวัสดีครับ ผม',
  roleLine: 'Business Development · สร้างเครื่องมือเอง',
  about: 'เกี่ยวกับ',
  howIWork: 'วิธีทำงานของผม',
  selectedWork: 'ผลงานที่เลือกมา',
  craft: [
    'ประเมินตามจริง',
    'ส่งของที่รันได้จริง',
    'เขียนให้ครบสองภาษา',
    'ทิ้งไว้ให้ดูแลต่อได้',
    'พูดตัวเลขออกมาตรงๆ',
    'แล้วส่งกุญแจให้',
  ] as readonly string[],
  craftHeading: 'หกข้อที่ผมไม่ยอมแลก',
  aboutHeading: 'ผมชอบสร้างของที่เรียบง่าย และยังทำงานอยู่ได้เอง',
  aboutSubhead: 'เรื่องสั้นๆ ว่าทำไมผมถึงมายืนอยู่ทั้งสองฝั่งของโต๊ะ',
  copied: 'คัดลอกแล้ว',
  startConversation: 'เริ่มคุยกัน',
  basedIn: 'ประจำอยู่',
  workingIn: 'ทำงานเป็น',
  photoPlaceholder: 'รูป',
  careerUnpublished: 'ยังไม่ได้เผยแพร่ประวัติการทำงาน',
  statRoles: 'ตำแหน่งที่ผ่านมา',
  statCompanies: 'บริษัทที่เคยร่วมงาน',
  statWins: 'ผลงานที่ส่งมอบ ทั้งสองภาษา',
  statLanguages: 'สองภาษาที่ใช้ทำงานได้เท่ากัน',
  contactHeading: 'มีของที่ควรมีอยู่จริง แต่ยังไม่มีใครทำ?',

  skipToContent: 'ข้ามไปยังเนื้อหาหลัก',

  notFoundTitle: 'ไม่มีหน้านี้อยู่',
  notFoundBody: 'ลิงก์อาจเก่าเกินไป หรือพิมพ์ที่อยู่คลาดเคลื่อน',
  backHome: 'กลับหน้าแรก',

  cvHeading: 'เคยอยู่ที่ไหนมาบ้าง และได้อะไรกลับมา',

  clients: 'บริษัทและแบรนด์',
  clientsHeading: 'ห้องที่ผมเคยเข้าไปนั่งมาแล้ว',

  copyEmailAction: 'คัดลอกที่อยู่อีเมล',

  identities: ['พัฒนาธุรกิจ', 'บาริสต้า', 'สร้างเครื่องมือใช้เอง'] as readonly string[],

  aboutStory: [
    'เริ่มจากฝั่งเจ้าของโต๊ะ — ทำร้าน A Bun Dance เบอร์เกอร์คราฟต์ ที่ทั้งคิดเมนู ตั้งราคา และคุมกำไรขั้นต้นเองทั้งหมด',
    'เรียนรู้งานบริการแบบตรงไปตรงมาหลังบาร์ที่ VELA — มาตรฐานเดียวกันทุกแก้ว แม้หน้าร้านจะแน่นแค่ไหน',
    'ตอนนี้ขายงานให้ ActMedia ตอนกลางวัน และสร้างเครื่องมือของตัวเองตอนกลางคืน เวลาคุยเรื่องระบบกับธุรกิจ ผมเลยนั่งมาแล้วทั้งสองฝั่งของโต๊ะ',
  ] as readonly string[],

  writingUnpublished: 'ยังไม่ได้เผยแพร่บทความ',

  navMain: 'เมนูหลัก',
  navLanguage: 'ภาษา',
};

export type UiDict = typeof en;
export const dict: Record<Locale, UiDict> = { en, th };
