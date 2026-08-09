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
};

export type UiDict = typeof en;
export const dict: Record<Locale, UiDict> = { en, th };
