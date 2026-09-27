import type { Locale } from './models';

const en = {
  // T11: SiteNav's four in-page anchors reuse each section's own eyebrow
  // label where one already exists (about/selectedProjects/career) -- `home`
  // is the one genuinely new label, since Hero has no eyebrow of its own.
  // (`selectedWork` was that eyebrow's key until the owner renamed the
  // section "Selected projects" on 2026-08-15; both call sites now share
  // the pre-existing `selectedProjects` key.)
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
  readStory: 'Read the story',
  greeting: "Hi, I'm",
  roleLine: 'Business Development · builds his own tools',
  about: 'About',
  howIWork: 'How I work',
  // Pitch deck (spec 2026-08-15 §5): the two chapter labels and the deck
  // subtitle. Chapter labels also head the /projects listing's two groups.
  workTypeBusiness: 'Business',
  workTypeBuild: 'Build',
  // QA 2026-08-15 finding 1: the deck gets a display-scale statement like
  // every other band; the SectionLabel stays as its eyebrow.
  deckHeading: 'Business plays, and the things I shipped.',
  deckSubtitle: 'Business first. Every project opens with the question it answers.',
  // Finding 7: rendered instead of deckSubtitle while no business-typed
  // project exists — the copy never promises a chapter that isn't there.
  deckSubtitleBuildOnly: 'Every project opens with the question it answers.',
  // Finding 17: /projects index gets its own one-line voice under the h1.
  projectsSubtitle: 'Every project, business and build — each opens with the question it answers.',
  // By day's headline (ByDay, P3). Ported verbatim from the studio.html
  // brainstorm and kept in the approved White Edition prototype.
  aboutHeading: 'I like building things that are simple, and that stay running.',
  copied: 'Copied',
  startConversation: 'Start a conversation',
  basedIn: 'Based in',
  workingIn: 'Working in',
  photoPlaceholder: 'Photo',
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

  // SiteFooter's human line. True of the owner (the projects were built
  // nights-and-weekends per profile.now) — personality, not fabrication.
  footerNote: 'Built at night, powered by good coffee.',

  // "Toolbox" band copy (CareerBand's #toolbox div, P3) -- fixed,
  // non-profile UI copy, hence dictionary entries rather than
  // component-local constants. The retired standalone SkillsBand rendered
  // this as a five-way honesty scale; CareerBand instead groups it into
  // three plain categories (Works in / Focus / Languages, CareerBand.tsx).
  toolbox: 'Toolbox',
  toolboxHeading: 'What I actually work with.',
  // Open-questions band (wave 2, spec 2026-08-13). The band's copy IS its
  // question list (owner-authored, from the Questions DB) -- these are just
  // the frame: the eyebrow, an optional bigger heading (openQuestionsHeading
  // is dormant until browser review decides the eyebrow alone reads too
  // quiet), and the one status marker a `building` question carries.
  openQuestions: 'Open questions',
  openQuestionsHeading: 'Questions I have not answered yet.',
  statusBuilding: 'building',
  // Task 4: the case page's "born from a question" line -- an `answered`
  // question whose linkSlug points at this story surfaces when it was
  // asked, prefixed by this label.
  askedOn: 'Asked',
  // Task 5: SiteFooter's honest freshness line -- the newest date across
  // posts and questions, or nothing at all when neither has a date yet.
  contentUpdated: 'Content last updated',
  // Project tour (spec 2026-09-10 §8): the hero's screenshot walkthrough.
  tourListLabel: 'Project tour',
  tourPrev: 'Previous project',
  tourNext: 'Next project',
  tourPause: 'Pause the tour',
  tourPlay: 'Play the tour',
  tourOf: '{n} of {total}',
  tourChapters: 'Chapters',
  tourReplay: 'Replay the tour',
  tourEndTitle: 'The idea, then the app.',
  // Years and arrow are locale-invariant (sharedKeys in dictionary.test.ts).
  tourEndKicker: '2022 → 2026 ↓',
  // White Edition theme control (ThemeToggle): footer, phone menu, ⌘K.
  // Prototype copy. P1 and P4 reuse these keys rather than adding their own.
  appearance: 'Appearance',
  themeAuto: 'Auto',
  themeLight: 'Light',
  themeDark: 'Dark',
  // White Edition P1 — navigation (contract C7). Words from the prototype's UI.en.
  // No `navAppearance` here (preflight ruling C5): the phone menu's Appearance
  // label reuses the `appearance` key above instead of a duplicate.
  navWork: 'Projects',
  navCareer: 'Career',
  navStory: 'How I work',
  navFaq: 'FAQ',
  // `{name}` becomes the first word of profile.name. The visible brand text is
  // that name, so the accessible name starts with it (WCAG 2.5.3).
  navBrandAria: '{name}, back to top',
  navMenu: 'Menu',
  navCloseMenu: 'Close menu',
  navSearchPrompt: 'Search or jump to…',
  copyEmail: 'Copy email',
  resumeShort: 'Résumé',
  navQuickActions: 'Quick actions',
  // The capsule's own Contact pill and ⌘K button (T9), distinct from
  // NavMenu's navSearchPrompt (the phone menu's full search row copy).
  navContact: 'Contact',
  navSearch: 'Search (⌘K)',
  // HeroTour's (T11) second action -- the same résumé link as ThumbBar's
  // `resumeShort` and NavMenu's, but the hero's own full "Résumé (PDF) ›"
  // copy (prototype ctas). P4's CloseBand reuses this exact key rather than
  // adding its own (preflight ruling: one canonical résumé-link string).
  resumePdf: 'Résumé (PDF) ›',

  // --- White Edition P3: Career band + By day ------------------------------
  // Copy from the approved prototype (design/white-edition/prototype). The
  // headlines reuse cvHeading / toolboxHeading / aboutHeading above, whose
  // copy is already the prototype's, rather than duplicating the strings.
  resumeLink: 'Résumé (PDF) ↗',
  // Describes public/suwichak-jarunopratamp-resume.pdf. Update it in the same
  // commit whenever that PDF is rebuilt (spec §3: rebuilt at ship time).
  resumeMeta: '2 pages · updated Aug 2026',
  careerNow: 'Now',
  careerPresent: 'Present',
  careerMonthsUnit: 'mo',
  careerEarlier: 'Earlier: ',
  careerDealLink: 'How a deal runs ↓',
  monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as readonly string[],
  toolboxStack: 'Works in',
  toolboxMethods: 'Focus',
  toolboxLanguages: 'Languages',
  toolLanguageNames: ['Thai', 'English (conversational)'] as readonly string[],
  storyEyebrow: 'By day',
  storyLead: 'One retail-media deal, start to finish, with the names taken out.',
  portraitAlt: 'Portrait of Suwichak (Klao)',
  storyPhasesLabel: 'Five launch phases',
  storyPhases: [
    'Commercial terms',
    'Screen preparation',
    'Installation',
    'Sales readiness',
    'Post-launch audit',
  ] as readonly string[],
  storyHealth: ['On track', 'At risk', 'Off track'] as readonly string[],
  backToTour: 'Aje · GoNai · klao-site ↑',
  // Amendment A10 (polish plan): the Short/Full segmented control above the
  // chapters. Not in the approved prototype (it predates the polish pass) --
  // "Detail" as the group's aria-label and "Short"/"Full" as the two option
  // labels are the polish lab's own reference copy (polish-lab/index.html
  // §10, `#depthSeg`), carried over verbatim rather than invented here.
  storyDetailLabel: 'Detail',
  storyShort: 'Short',
  storyFull: 'Full',

  // --- White Edition P4: FAQ, close band, footer, ⌘K + Ask Preview. -----
  // Every string is the approved prototype's (design/white-edition/
  // prototype/index.html, `UI`). Templates carry {q}/{n}/{email} slots for
  // format.ts's fill(), because the slot sits in a different place in Thai.
  faqTitle: 'What people usually ask.',
  faqExpand: 'Expand all',
  faqCollapse: 'Collapse all',
  faqSource: 'Source:',
  faqMore: 'Didn’t find it? Search or ask Klao (⌘K) ›',
  closeCopyFail: 'Press ⌘C to copy',
  closeOpenQ: 'Open question:',
  closeOpenQSubject: 'Open question',
  closeTellMe: 'Tell me by email ›',
  footElsewhere: 'Elsewhere',
  palSuggested: 'Suggested',
  palGo: 'Go to',
  palFaq: 'FAQ',
  palLinks: 'Links',
  palPrefs: 'Preferences',
  // Fix round 1 #7: names the ⌘K listbox on its own (aria-label) instead of
  // aria-labelledby pointing at the search input -- the input's own label
  // is its placeholder text, not "the results", so pointing the listbox at
  // it named the wrong thing.
  palResults: 'Results',
  palNone: 'No results for “{q}”',
  palAsk: 'Ask Klao: “{q}”',
  palCount: '{n} results',
  palMove: '↑↓ move',
  palOpen: '↵ open',
  palClose: 'esc close',
  palCancel: 'Cancel',
  palTop: 'Top',
  palOpenResume: 'Open résumé',
  palLang: 'Switch to ภาษาไทย',
  askTitle: 'Ask Klao',
  askBadge: 'Preview',
  askTrust: 'Preview. Answers are pre-written from this page, with the section each one came from. No AI is called yet.',
  askSources: 'Sources',
  askSourceN: 'Source {n}',
  askReady: 'Answer ready, {n} sources',
  askDeclined: 'That isn’t in Klao’s published content, so I won’t guess. You can ask him directly at {email}.',
  askWrong: 'Something wrong? Tell Klao',
};

const th: typeof en = {
  home: 'หน้าแรก',
  projects: 'ผลงาน',
  writing: 'บทความ',
  career: 'เส้นทางอาชีพ',
  resume: 'เรซูเม่',
  selectedProjects: 'โปรเจกต์ที่เลือกมา',
  latestWriting: 'บทความล่าสุด',
  allProjects: 'ผลงานทั้งหมด',
  allPosts: 'บทความทั้งหมด',
  now: 'ตอนนี้',
  fullCareer: 'เส้นทางอาชีพทั้งหมด',
  back: 'กลับ',
  email: 'อีเมล',
  liveSite: 'ดูเว็บไซต์',
  viewCode: 'ดูโค้ด',
  readStory: 'อ่านเรื่องราว',
  greeting: 'สวัสดีครับ ผม',
  roleLine: 'Business Development · สร้างเครื่องมือเอง',
  about: 'เกี่ยวกับ',
  howIWork: 'วิธีทำงานของผม',
  workTypeBusiness: 'ธุรกิจ',
  workTypeBuild: 'งานสร้างเอง',
  deckHeading: 'เกมธุรกิจที่ผมเดิน และของที่ผมลงมือสร้าง',
  deckSubtitle: 'ธุรกิจมาก่อน — ทุกโปรเจกต์เริ่มจากคำถามที่มันตอบ',
  deckSubtitleBuildOnly: 'ทุกโปรเจกต์เริ่มจากคำถามที่มันตอบ',
  projectsSubtitle: 'ทุกโปรเจกต์ทั้งฝั่งธุรกิจและฝั่งสร้าง — แต่ละอันเริ่มจากคำถามที่มันตอบ',
  aboutHeading: 'ผมชอบสร้างของที่เรียบง่าย และยังทำงานอยู่ได้เอง',
  copied: 'คัดลอกแล้ว',
  startConversation: 'เริ่มคุยกัน',
  basedIn: 'ประจำอยู่',
  workingIn: 'ทำงานเป็น',
  photoPlaceholder: 'รูป',
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

  writingUnpublished: 'ยังไม่ได้เผยแพร่บทความ',

  navMain: 'เมนูหลัก',
  navLanguage: 'ภาษา',

  footerNote: 'สร้างตอนกลางคืน ด้วยกาแฟดีๆ',

  toolbox: 'กล่องเครื่องมือ',
  toolboxHeading: 'ของจริงที่ผมใช้ทำงาน',
  openQuestions: 'คำถามที่ยังเปิดอยู่',
  openQuestionsHeading: 'คำถามที่ยังไม่มีคำตอบ',
  statusBuilding: 'กำลังสร้าง',
  askedOn: 'ตั้งคำถามไว้เมื่อ',
  contentUpdated: 'อัปเดตเนื้อหาล่าสุด',
  tourListLabel: 'ทัวร์โปรเจกต์',
  tourPrev: 'โปรเจกต์ก่อนหน้า',
  tourNext: 'โปรเจกต์ถัดไป',
  tourPause: 'หยุดทัวร์ชั่วคราว',
  tourPlay: 'เล่นทัวร์',
  tourOf: '{n} จาก {total}',
  tourChapters: 'ตอน',
  tourReplay: 'ดูทัวร์อีกครั้ง',
  tourEndTitle: 'ไอเดียมาก่อน แล้วค่อยเป็นแอป',
  tourEndKicker: '2022 → 2026 ↓',
  appearance: 'การแสดงผล',
  themeAuto: 'ตามเครื่อง',
  themeLight: 'สว่าง',
  themeDark: 'มืด',
  navWork: 'โปรเจกต์',
  navCareer: 'เส้นทางอาชีพ',
  navStory: 'วิธีทำงาน',
  navFaq: 'FAQ',
  navBrandAria: '{name} กลับขึ้นด้านบน',
  navMenu: 'เมนู',
  navCloseMenu: 'ปิดเมนู',
  navSearchPrompt: 'ค้นหา หรือไปที่…',
  copyEmail: 'คัดลอกอีเมล',
  resumeShort: 'เรซูเม่',
  navQuickActions: 'ทางลัด',
  navContact: 'ติดต่อ',
  navSearch: 'ค้นหา (⌘K)',
  resumePdf: 'เรซูเม่ (PDF) ›',

  resumeLink: 'เรซูเม่ (PDF) ↗',
  resumeMeta: '2 หน้า · อัปเดต ส.ค. 2026',
  careerNow: 'ปัจจุบัน',
  careerPresent: 'ปัจจุบัน',
  careerMonthsUnit: 'เดือน',
  careerEarlier: 'ก่อนหน้า: ',
  careerDealLink: 'ดีลหนึ่งเดินอย่างไร ↓',
  monthsShort: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'] as readonly string[],
  toolboxStack: 'ใช้ทำงาน',
  toolboxMethods: 'ถนัด',
  toolboxLanguages: 'ภาษา',
  toolLanguageNames: ['ไทย', 'อังกฤษ (ระดับสนทนา)'] as readonly string[],
  storyEyebrow: 'ตอนกลางวัน',
  storyLead: 'ดีลสื่อในร้านค้าปลีกหนึ่งดีล ตั้งแต่ต้นจนจบ โดยตัดชื่อออกทั้งหมด',
  portraitAlt: 'ภาพของ Suwichak (Klao)',
  storyPhasesLabel: 'ห้าช่วงของการเปิดตัว',
  storyPhases: ['เงื่อนไขการค้า', 'เตรียมจอ', 'ติดตั้ง', 'พร้อมขาย', 'ตรวจหลังเปิดใช้งาน'] as readonly string[],
  storyHealth: ['ตามแผน', 'มีความเสี่ยง', 'หลุดแผน'] as readonly string[],
  backToTour: 'Aje · GoNai · klao-site ↑',
  // A10: the polish lab's reference implementation only gave this control
  // English copy (Short/Full, aria-label "Detail") -- there is no Thai
  // wording to carry over, so this is our own translation, ตาม amendment
  // A10's own fallback instruction ("otherwise use สั้น / เต็ม").
  storyDetailLabel: 'รายละเอียด',
  storyShort: 'สั้น',
  storyFull: 'เต็ม',

  faqTitle: 'คำถามที่เจอบ่อย',
  faqExpand: 'เปิดทั้งหมด',
  faqCollapse: 'ปิดทั้งหมด',
  faqSource: 'ที่มา:',
  faqMore: 'ไม่เจอคำตอบ? ค้นหาหรือถาม Klao (⌘K) ›',
  closeCopyFail: 'กด ⌘C เพื่อคัดลอก',
  closeOpenQ: 'คำถามที่ยังเปิดอยู่:',
  closeOpenQSubject: 'คำถามที่ยังเปิดอยู่',
  closeTellMe: 'ตอบกลับทางอีเมลได้เลย ›',
  footElsewhere: 'ช่องทางอื่น',
  palSuggested: 'แนะนำ',
  palGo: 'ไปที่',
  palFaq: 'คำถามที่เจอบ่อย',
  palLinks: 'ลิงก์',
  palPrefs: 'ตั้งค่า',
  palResults: 'ผลลัพธ์',
  palNone: 'ไม่พบ “{q}”',
  palAsk: 'ถาม Klao: “{q}”',
  palCount: 'พบ {n} รายการ',
  palMove: '↑↓ เลื่อน',
  palOpen: '↵ เปิด',
  palClose: 'esc ปิด',
  palCancel: 'ยกเลิก',
  palTop: 'ด้านบน',
  palOpenResume: 'เปิดเรซูเม่',
  palLang: 'Switch to English',
  askTitle: 'ถาม Klao',
  askBadge: 'ตัวอย่าง',
  askTrust: 'ตัวอย่าง: คำตอบเขียนเตรียมไว้จากเนื้อหาในหน้านี้ พร้อมบอกว่ามาจากส่วนไหน ยังไม่ได้เรียก AI จริง',
  askSources: 'ที่มา',
  askSourceN: 'ที่มา {n}',
  askReady: 'ได้คำตอบแล้ว มีที่มา {n} แห่ง',
  askDeclined: 'เรื่องนี้ไม่มีในเนื้อหาที่ Klao เผยแพร่ไว้ เลยขอไม่เดาครับ ถาม Klao ตรงๆ ได้ที่ {email}',
  askWrong: 'ตอบผิด? บอก Klao',
};

export type UiDict = typeof en;
export const dict: Record<Locale, UiDict> = { en, th };

// Keys whose value is a plain string — lets tables of labels (⌘K sections,
// theme names) index `dict[locale]` without casting away the array entries.
export type UiStringKey = { [K in keyof UiDict]: UiDict[K] extends string ? K : never }[keyof UiDict];
