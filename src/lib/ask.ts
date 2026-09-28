import { dict } from './dictionary';
import { faqAnchorId } from './link-target';
import type { FaqItem, Locale } from './models';
import { fold } from './palette-index';
import { unbreak } from './project-view';
import { THAI_RE } from './thai';

// Ask Klao, Preview (spec §6): a reference desk, not a model. Every answer
// is written in advance from this page's own content — Klao's FAQ (Notion)
// and the small canned set below from the approved prototype — and names
// the section it came from. Nothing here leaves the browser: no model call
// and no request of any kind (Global Constraints). tests/ask.test.ts scans
// this file to keep it that way.
//
// Answer text and source quotes are body-size copy, not a keep-run heading,
// so `|` (the Thai break marker some Notion/FAQ copy carries, spec §5.2) is
// simply dropped with unbreak() here — same treatment project-view.ts's
// other body-text callers give it, and the way T11's palette-index.ts
// already unbreak()s FAQ question text for the ⌘K row.

export interface AskSource {
  label: string;
  quote: string; // '' = no quote line
  target: string; // link-target grammar
}

export type AskAnswer =
  | { kind: 'answer'; query: string; lang: Locale; text: string; sources: AskSource[] }
  | { kind: 'decline'; query: string; lang: Locale };

interface CannedSource {
  label: string;
  target: string;
  quote: Record<Locale, string>;
}

type Canned =
  | { match: RegExp; decline: true }
  | { match: RegExp; decline?: false; answer: Record<Locale, string>; sources: CannedSource[] };

const ACTMEDIA: CannedSource = {
  label: 'Career · Actmedia',
  target: 'career:actmedia',
  quote: { en: 'Senior Business Development · Mar 2026 – Present', th: 'นักพัฒนาธุรกิจอาวุโส · มี.ค. 2026 – ปัจจุบัน' },
};
const GONAI: CannedSource = {
  label: 'Projects · GoNai',
  target: 'work/gonai',
  quote: { en: 'Build · Live', th: 'สร้างเอง · เปิดใช้งานแล้ว' },
};
const AJE: CannedSource = {
  label: 'Projects · Aje',
  target: 'work/aje',
  quote: { en: 'Build · Working prototype', th: 'สร้างเอง · Prototype ใช้งานได้' },
};
// The build answer, shared by the two entries that give it (T18-b below).
const BUILD_ANSWER: Record<Locale, string> = {
  en: 'Yes, on nights and weekends, with AI-assisted development (Claude). GoNai is live[1], Aje is a working prototype[2], and this site is edited in Notion.[3]',
  th: 'จริงครับ ทำนอกเวลางานด้วย AI-assisted development (Claude) GoNai เปิดใช้งานแล้ว[1] Aje เป็น prototype ที่ใช้งานได้[2] และเว็บนี้แก้เนื้อหาผ่าน Notion[3]',
};
const BUILD_SOURCES: CannedSource[] = [
  GONAI,
  AJE,
  {
    label: 'Projects · klao-site',
    target: 'work/klao-site',
    quote: { en: 'Notion as the only CMS', th: 'Notion เป็น CMS เดียว' },
  },
];

// The prototype's ASK array, in its order: first match wins. Pay and rates
// are declined on purpose — not published, so never guessed.
//
// I-3 (fix wave finding 4): every English alternative below is \b-anchored.
// The prototype's bare substrings gave confident wrong answers -- "app"
// matched inside "approach" (the build/app answer), "pay " (a trailing-space
// hack) still matched inside "repay" -- while a Thai alternative stays a
// plain substring (Thai has no spaces to anchor a word boundary on, same
// reasoning as src/lib/thai.ts's KEEP_SOURCE). \bwords?\b keeps the odd
// plural/inflection the old substring test also caught (apps, shoppers,
// languages, developed/developing). The retail entry is also checked
// before the business/founder one now (moved down, unchanged text) and
// gained an explicit "business development" phrase: that combination is
// what stopped "business development" reading as burger-shop founder
// questions -- the retail entry claims it first.
//
// Re-review round 1 (Important A): the first \b pass over-corrected --
// \bretail\b dropped "retailer/retailers" (the exact word Klao's own FAQ
// answer uses), \bdevelops?\b|\bdeveloped\b|\bdeveloping\b dropped the noun
// "developer", and bare "media" was deleted outright instead of
// word-bounded, so "Does he work in media?" (Actmedia's own industry)
// declined. The Thai side had two of its own: the site's own TH role words
// "(นัก)พัฒนาธุรกิจ" only ever matched bare ธุรกิจ (the founder/burger-shop
// entry), and "สื่อโซเชียล" matched bare สื่อ (the retail entry) -- social
// media isn't published content either way, so it now declines explicitly
// (the new entry right after this one) rather than falling through to a
// confident wrong topic.
//
// T18-b (CO-10, ruling PR5) -- the prototype's own wrong answers (P4
// review Minor F), pinned in tests/ask.test.ts's 47 + 20 rows:
//  - "business model" and "featured in/on/by" (press) decline: neither is
//    published content (rows 25 and "featured in the media"). T18-b2 adds
//    the Thai press words (ออกสื่อ, ให้สัมภาษณ์, ลงข่าว).
//  - bare "today" left the right-now entry: "Can I call him today?" is not
//    a current-work question (row 26); it now declines.
//  - "founded"/"founder" answer with the startups (row 14), "built" with
//    the build answer (row 13) -- each guarded against the business and
//    BD nouns that made them steal other questions (lane C review I1, I2).
//  - "code in" / โค้ด is checked before the language entry, so "Which
//    languages does he code in?" / เขียนโค้ดภาษาอะไร get the build answer,
//    not the spoken-language one (rows 24 and 39).
export const ASK_CANNED: readonly Canned[] = [
  { match: /\bsalary\b|\bpay\b|\bpaid\b|\brate card\b|\bprice\b|เงินเดือน|ค่าจ้าง|ค่าตัว/i, decline: true },
  // Re-review Important A: social media strategy/marketing isn't published
  // content -- checked before the retail entry (bare "media"/"สื่อ" would
  // otherwise read "social media"/"สื่อโซเชียล" as a retail-media question).
  { match: /\bsocial media\b|โซเชียล/i, decline: true },
  // T18-b: not published either -- a project's business model, press.
  // T18-b2: the Thai press words too (ออกสื่อ "in the media", ให้สัมภาษณ์
  // "gave an interview", ลงข่าว "in the news"). Checked before the retail
  // entry, whose bare สื่อ would otherwise answer them as retail media;
  // ออกสื่อโฆษณา / ออกสื่อในร้าน mean running ads or in-store media, so
  // those still fall through to retail.
  { match: /\bbusiness models?\b|\bfeatured (in|on|by)\b|ออกสื่อ(?!โฆษณา|ในร้าน)|ให้สัมภาษณ์|ลงข่าว/i, decline: true },
  // Lane C review I1: who founded a company, and when, isn't published
  // either -- "When was Actmedia founded?" read as a startup question. His
  // own ventures are left out (their answers carry the dates), and any
  // founder question about Actmedia declines: he is not its founder, and
  // the retail answer opens with "Yes."
  {
    match:
      /^(?!.*(?:\bbun dance\b|\bburgers?\b|\btripedia\b|\btalatify\b|ร้าน|เบอร์เกอร์)).*\b(?:when|what year|who)\b.*\bfounded\b|\bactmedia\b.*\bfound(?:ed|er)\b|\bfound(?:ed|er)\b.*\bactmedia\b/i,
    decline: true,
  },
  {
    match: /\bright now\b|\bworking on\b|\bcurrently\b|\bthese days\b|ตอนนี้|ทำอะไรอยู่|ช่วงนี้/i,
    answer: {
      en: 'Klao has been Senior Business Development at Actmedia since March 2026, opening new channels with Modern Trade retailers and project-managing live in-store rollouts; the largest is a nationwide in-store screen installation.[1] Outside work he builds AI tools: GoNai is live[2] and Aje is a working prototype.[3]',
      th: 'ตั้งแต่ มี.ค. 2026 Klao เป็น Senior Business Development ที่ Actmedia หาช่องทางใหม่กับค้าปลีก Modern Trade และคุมโปรเจกต์ที่รันอยู่ โปรเจกต์ใหญ่สุดคือติดตั้งจอในร้านทั่วประเทศ[1] นอกเวลางานเขาสร้างเครื่องมือ AI เอง GoNai เปิดใช้งานแล้ว[2] และ Aje เป็น prototype ที่ใช้งานได้[3]',
    },
    sources: [ACTMEDIA, GONAI, AJE],
  },
  {
    // Lane C review I1: PR5's founded/founder only when the question names
    // no shop or business -- "Is he the founder of a burger shop?" is the
    // A Bun Dance question (the business entry below), not this one. (The
    // reviewer's guard also listed Actmedia; a founder question about
    // Actmedia never gets here, the decline entry above takes it.)
    match:
      /\bstartups?\b|\bstart-ups?\b|สตาร์ทอัพ|\btripedia\b|\btalatify\b|\bpitch(ed|es)?\b|^(?!.*(?:\bbusiness\b|\bshops?\b|\bburgers?\b|\brestaurants?\b|\bbun dance\b|ร้าน|เบอร์เกอร์)).*\bfound(?:ed|er)\b/i,
    answer: {
      en: 'Yes. He co-founded two. Tripedia, a trip-planning platform, made the final 30 of 500 teams at KATALYST Startup Launchpad 2022.[1] Talatify, a fresh-market delivery platform, was pitched at the TEP startup screening round in 2025, with SOM sized at THB 37M.[2]',
      th: 'เคยครับ Klao เป็น Co-founder สองโปรเจกต์ Tripedia แพลตฟอร์มวางแผนทริป เข้ารอบ 30 ทีมสุดท้ายจาก 500 ทีมใน KATALYST Startup Launchpad 2022[1] และ Talatify แพลตฟอร์มส่งของสดจากตลาด ที่นำเสนอในรอบคัดเลือก TEP ปี 2025 และประเมิน SOM ไว้ 37 ล้านบาท[2]',
    },
    sources: [
      {
        label: 'Projects · Tripedia',
        target: 'work/tripedia',
        quote: { en: 'Final 30 of 500 teams', th: 'เข้ารอบ 30 ทีมสุดท้ายจาก 500 ทีม' },
      },
      {
        label: 'Projects · Talatify',
        target: 'work/talatify',
        quote: { en: 'Market sized (TAM–SAM–SOM, SOM THB 37M)', th: 'ขนาดตลาด TAM–SAM–SOM (SOM 37 ล้านบาท)' },
      },
    ],
  },
  {
    // I-3: checked before the business/founder entry below (was after it) --
    // "business development" is Klao's job title, not a founder question,
    // and the explicit phrase here claims it first (first-match-wins).
    // Re-review Important A: \bretail(ers?)?\b keeps "retailer/retailers"
    // (Klao's own FAQ answer uses it); \bmedia\b is word-bounded rather than
    // deleted, so "in media" still matches without "social media" (declined
    // above) reopening the hole; พัฒนาธุรกิจ is the site's own TH job-title
    // word for "business development", matched here for the same reason the
    // EN phrase is.
    match: /\bretail(ers?)?\b|\bin-stores?\b|\bshoppers?\b|\bmedia\b|\bbusiness development\b|พัฒนาธุรกิจ|สื่อ|ค้าปลีก|actmedia/i,
    answer: {
      en: 'Yes. At Actmedia he opens new retail channels and project-manages a nationwide in-store screen installation.[1] The day-side story shows how one deal runs, from the NDA to handover.[2] Retail media & shopper media is also on his Focus list.[3]',
      th: 'ได้ครับ ที่ Actmedia เขาเปิดช่องทางค้าปลีกใหม่และคุมโปรเจกต์ติดตั้งจอในร้านทั่วประเทศ[1] ส่วน "ตอนกลางวัน" เล่าว่าดีลหนึ่งเดินอย่างไร ตั้งแต่ NDA จนส่งต่องาน[2] และ Retail media & shopper media อยู่ในรายการที่เขาถนัด[3]',
    },
    sources: [
      ACTMEDIA,
      {
        label: 'By day · 01–06',
        target: 'story',
        quote: { en: 'One retail-media deal, start to finish…', th: 'ดีลสื่อในร้านค้าปลีกหนึ่งดีล ตั้งแต่ต้นจนจบ…' },
      },
      {
        label: 'Toolbox · Focus',
        target: 'toolbox',
        quote: { en: 'Retail media & shopper media', th: 'Retail media & shopper media' },
      },
    ],
  },
  {
    match: /\bbusiness\b|\bown shops?\b|\bburgers?\b|\bfounders?\b|\brestaurants?\b|ธุรกิจ|ร้าน|เจ้าของ/i,
    answer: {
      en: 'Yes. He founded A Bun Dance, a craft-burger shop for students, and ran it for 20 months (May 2021 – Dec 2022): product, pricing, marketing and 6–8 part-time staff. He held gross profit at about 35% per unit.[1]',
      th: 'เคยครับ Klao ก่อตั้งร้าน A Bun Dance เบอร์เกอร์คราฟต์สำหรับนักศึกษา ทำอยู่ 20 เดือน (พ.ค. 2021 – ธ.ค. 2022) ดูแลทั้งสินค้า ราคา การตลาด และพนักงานพาร์ทไทม์ 6–8 คน คุมกำไรขั้นต้นได้ราว 35% ต่อชิ้น[1]',
    },
    sources: [
      {
        label: 'Career · A Bun Dance',
        target: 'career:a-bun-dance',
        quote: { en: 'Held gross profit at ~35% per unit…', th: 'คุมกำไรขั้นต้นที่ ~35% ต่อชิ้น…' },
      },
    ],
  },
  // T18-b: programming languages are a build question -- checked before the
  // spoken-language entry below, with the same answer as the last entry.
  { match: /\bcode in\b|โค้ด/i, answer: BUILD_ANSWER, sources: BUILD_SOURCES },
  {
    match: /\blanguages?\b|\benglish\b|\bthai\b|ภาษา|อังกฤษ/i,
    answer: {
      en: 'Thai, and English at a conversational level. This site and his projects ship in both.[1]',
      th: 'ภาษาไทย และภาษาอังกฤษระดับสนทนา เว็บนี้และโปรเจกต์ของเขาทำครบทั้งสองภาษา[1]',
    },
    sources: [
      {
        label: 'Toolbox · Languages',
        target: 'toolbox',
        quote: { en: 'Thai · English (conversational)', th: 'ไทย · อังกฤษ (ระดับสนทนา)' },
      },
    ],
  },
  {
    // Re-review Important A: \bdevelopers?\b restores the noun (the 1-pass
    // /\bdevelops?\b|\bdeveloped\b|\bdeveloping\b/ verb-only set dropped
    // "Is he a developer?"). "development" stays out on purpose -- it's
    // business development's word, not this row's.
    // Lane C review I2: build/building/built are BD verbs too ("built a
    // sales pipeline", "building a sales team"), so they count only when
    // the question names none of those BD nouns; "apps" etc. still match.
    match:
      /^(?!.*\b(?:partnerships?|pipelines?|relationships?|teams?|networks?|channels?|sales)\b).*\b(?:builds?|building|built)\b|\bcodes?\b|\bcoding\b|\bapps?\b|\bdevelop(s|ed|ing|ers?)?\b|สร้าง|แอป|โค้ด/i,
    answer: BUILD_ANSWER,
    sources: BUILD_SOURCES,
  },
];

// Words that carry no topic; dropping them keeps "how do I reach him"
// matched on "reach", not on "how".
const STOP = new Set([
  'a', 'an', 'and', 'are', 'about', 'at', 'can', 'did', 'do', 'does', 'for', 'has', 'have', 'he', 'him',
  'his', 'how', 'i', 'in', 'is', 'it', 'klao', 'of', 'on', 'the', 'to', 'what', 'which', 'who', 'with',
  'you', 'your',
]);

// Letters + combining marks (Thai vowels and tone marks are marks, not
// letters) + digits; everything else splits.
const tokens = (q: string): string[] => [
  ...new Set(fold(q).split(/[^\p{L}\p{M}\p{N}]+/u).filter((w) => w.length >= 2 && !STOP.has(w))),
];

// The FAQ item whose question + answer contains the most query words. A
// one-word query needs that word; longer queries need two, so a single
// common word can't drag in an unrelated answer. `faq` arrives sorted by
// Order, so a tie goes to the question Klao put first.
function bestFaq(query: string, faq: FaqItem[], lang: Locale): FaqItem | null {
  const words = tokens(query);
  if (words.length === 0) return null;
  let best: FaqItem | null = null;
  let bestScore = 0;
  for (const item of faq) {
    const hay = fold(`${item.question[lang]} ${item.answer[lang]}`);
    const s = words.filter((w) => hay.includes(w)).length;
    if (s > bestScore) {
      best = item;
      bestScore = s;
    }
  }
  return bestScore >= Math.min(2, words.length) ? best : null;
}

export function askPreview(query: string, faq: FaqItem[], locale: Locale): AskAnswer {
  const q = query.trim();
  // Answer in the language of the question (prototype); a query with no
  // letters at all falls back to the page's language.
  const lang: Locale = THAI_RE.test(q) ? 'th' : /[a-z]/i.test(q) ? 'en' : locale;
  const decline: AskAnswer = { kind: 'decline', query: q, lang };
  if (!q) return decline;

  for (const c of ASK_CANNED) {
    if (!c.match.test(q)) continue;
    if (c.decline) return decline;
    return {
      kind: 'answer',
      query: q,
      lang,
      text: unbreak(c.answer[lang]),
      sources: c.sources.map((s) => ({ label: s.label, quote: unbreak(s.quote[lang]), target: s.target })),
    };
  }

  const item = bestFaq(q, faq, lang);
  if (!item) return decline;
  return {
    kind: 'answer',
    query: q,
    lang,
    // [1] = the FAQ entry itself, so the card always says where it came from.
    text: `${unbreak(item.answer[lang])}[1]`,
    sources: [
      { label: dict[lang].palFaq, quote: unbreak(item.question[lang]), target: faqAnchorId(item.id) },
      ...item.links.map((l) => ({ label: l.label[lang], quote: '', target: l.target })),
    ],
  };
}
