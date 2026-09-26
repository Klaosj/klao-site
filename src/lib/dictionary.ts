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

  // SiteFooter's human line. True of the owner (the projects were built
  // nights-and-weekends per profile.now) — personality, not fabrication.
  footerNote: 'Built at night, powered by good coffee.',

  // SkillsBand ("Toolbox" band). Fixed, non-profile UI copy -- same
  // category as craftHeading/aboutHeading/cvHeading above, hence dictionary
  // entries rather than component-local constants. The four tier labels sit
  // between `craftHeading` and dict-level eyebrow labels elsewhere: not the
  // full-sentence claim a bigHead makes, but not a one-word nav label
  // either -- they name the five-way honesty scale (top/daily/working/
  // basic/learning, src/lib/models.ts's SkillTier) the band itself renders
  // as size and brightness, in that same order.
  toolbox: 'Toolbox',
  toolboxHeading: 'What I actually work with.',
  tierDaily: 'Daily craft',
  tierWorking: 'Working knowledge',
  tierBasic: 'Familiar with',
  tierLearning: 'Currently learning',
  // Toolbox redesign, owner decision 2026-08-12: "too many chips reads as
  // overclaiming" (his words, in Thai, on the live band). The band now
  // renders only `top` + this one curated row of iconed tool badges +
  // `learning` -- `tierDaily`/`tierWorking`/`tierBasic` above stay in this
  // file (harmless, re-expansion later needs no schema work) but nothing
  // in SkillsBand.tsx reads them anymore. `toolsLabel` is that row's own
  // mono eyebrow, sized and cased like `tierDaily` et al. but naming a
  // fixed, curated allowlist (SkillsBand's TOOLS_ALLOWLIST) rather than a
  // whole honesty tier.
  toolsLabel: 'Core tools',
  // Open-questions band (wave 2, spec 2026-08-13). The band's copy IS its
  // question list (owner-authored, from the Questions DB) -- these are just
  // the frame: the eyebrow, an optional bigger heading (openQuestionsHeading
  // is dormant until browser review decides the eyebrow alone reads too
  // quiet -- same keep-the-key reasoning as tierDaily above), and the one
  // status marker a `building` question carries.
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
  tourLabel: 'Things I shipped, running',
  tourListLabel: 'Project tour',
  tourPrev: 'Previous project',
  tourNext: 'Next project',
  tourPause: 'Pause the tour',
  tourPlay: 'Play the tour',
  tourStill: 'Still view',
  // HeroTourStage (P1 Task 10): `{n}`/`{total}` are filled in by the
  // component itself, not fill() -- the slot always sits at the same spot
  // in both languages (no other template here needs per-locale reordering).
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

  footerNote: 'สร้างตอนกลางคืน ด้วยกาแฟดีๆ',

  toolbox: 'กล่องเครื่องมือ',
  toolboxHeading: 'ของจริงที่ผมใช้ทำงาน',
  tierDaily: 'ใช้ประจำ',
  tierWorking: 'ใช้เป็น',
  tierBasic: 'รู้พื้นฐาน',
  tierLearning: 'กำลังเรียน',
  toolsLabel: 'เครื่องมือหลัก',
  openQuestions: 'คำถามที่ยังเปิดอยู่',
  openQuestionsHeading: 'คำถามที่ยังไม่มีคำตอบ',
  statusBuilding: 'กำลังสร้าง',
  askedOn: 'ตั้งคำถามไว้เมื่อ',
  contentUpdated: 'อัปเดตเนื้อหาล่าสุด',
  tourLabel: 'ของที่ผมสร้าง และยังรันอยู่',
  tourListLabel: 'ทัวร์โปรเจกต์',
  tourPrev: 'โปรเจกต์ก่อนหน้า',
  tourNext: 'โปรเจกต์ถัดไป',
  tourPause: 'หยุดทัวร์ชั่วคราว',
  tourPlay: 'เล่นทัวร์',
  tourStill: 'มุมมองภาพนิ่ง',
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
