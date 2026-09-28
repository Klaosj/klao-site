import { describe, expect, it } from 'vitest';
import careerFixture from '@/content/fixtures/career.json';
import faqFixture from '@/content/fixtures/faq.json';
import profileFixture from '@/content/fixtures/profile.json';
import projectsFixture from '@/content/fixtures/projects.json';
import { dict } from '@/lib/dictionary';
import { faqAnchorId } from '@/lib/link-target';
import type { CareerEntry, FaqItem, Profile, Project } from '@/lib/models';
import {
  PALETTE_GROUPS,
  bestScoreIndex,
  buildPaletteIndex,
  fold,
  highlight,
  oneEdit,
  searchPalette,
  type PaletteInput,
} from '@/lib/palette-index';
import { projectKey } from '@/lib/sheet-url';

// Re-review round 1, Important B: the real fixture order matters. The
// hand-built `input` below happens to list GoNai first and its Tripedia
// description never mentions GoNai -- a "gonia" typo test against it alone
// could not have caught a tie broken by array order. `realInput` uses the
// actual content fixtures (Talatify, Tripedia, Aje, GoNai, klao-site --
// Tripedia's own description ends "...the idea GoNai was later built
// from"), the exact shape the bug reproduced in on the live site.
const realInput: PaletteInput = {
  profile: profileFixture as Profile,
  projects: projectsFixture as Project[],
  career: careerFixture as CareerEntry[],
  faq: faqFixture as FaqItem[],
};

const input: PaletteInput = {
  profile: {
    email: 'real@example.com',
    resumeUrl: '/resume.pdf',
    linkedin: 'https://www.linkedin.com/in/test/',
    github: 'https://github.com/test',
  },
  projects: [
    {
      id: 'p-gonai',
      name: 'GoNai',
      slug: null,
      type: 'build',
      kicker: { en: 'Trip planner', th: 'แอปวางแผนเที่ยว' },
      description: { en: 'One-day Bangkok trip planner', th: 'แอปวางแผนเที่ยวกรุงเทพฯ 1 วัน' },
    },
    {
      id: 'p-tripedia',
      name: 'Tripedia',
      slug: null,
      type: 'business',
      kicker: null,
      description: { en: 'Trip-planning platform', th: 'แพลตฟอร์มวางแผนทริป' },
    },
  ],
  career: [
    {
      id: 'c1',
      key: 'actmedia',
      company: 'Actmedia',
      role: { en: 'Senior Business Development', th: 'นักพัฒนาธุรกิจอาวุโส' },
      period: 'MAR 2026 – Present',
      start: '2026-03',
      end: null,
    },
  ],
  faq: [{ id: 'fx-faq-contact', question: { en: 'How do I reach him?', th: 'ติดต่อยังไง?' } }],
};

const byId = (locale: 'en' | 'th' = 'en') => new Map(buildPaletteIndex(input, locale).map((e) => [e.id, e]));

describe('buildPaletteIndex', () => {
  it('lists groups in display order with unique ids, as plain serialisable data', () => {
    const entries = buildPaletteIndex(input, 'en');
    const order = entries.map((e) => PALETTE_GROUPS.indexOf(e.group));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
    // The layout builds this on the server and hands it to a client island.
    expect(JSON.parse(JSON.stringify(entries))).toEqual(entries);
  });

  it('suggests mail (with the prototype subject), copy email and the résumé', () => {
    const e = byId();
    expect(e.get('suggested:mail')?.action).toEqual({
      type: 'href',
      href: 'mailto:real@example.com?subject=Hello%20from%20klao-site',
      external: false,
    });
    expect(e.get('suggested:copy')?.action).toEqual({ type: 'copy', text: 'real@example.com' });
    expect(e.get('suggested:resume')?.action).toEqual({ type: 'href', href: '/resume.pdf', external: true });
  });

  it('drops suggestions it has no data for', () => {
    const entries = buildPaletteIndex(
      { ...input, profile: { email: '', resumeUrl: null, linkedin: '', github: '' } },
      'en',
    );
    expect(entries.some((e) => e.group === 'suggested' || e.group === 'links')).toBe(false);
  });

  // Preflight ruling C1: T5 did not add pal*/foot* duplicates of P0/P1's
  // navWork/navCareer/navStory/navContact, so the section rows use those
  // existing keys directly. palTop and palFaq are not duplicates (no other
  // key carries their text), so they stay.
  it('jumps to the six page sections (C7)', () => {
    const go = buildPaletteIndex(input, 'en').filter((e) => e.group === 'go');
    expect(go.map((e) => e.action)).toEqual(
      ['top', 'work', 'career', 'story', 'faq', 'contact'].map((target) => ({ type: 'target', target })),
    );
    expect(go.map((e) => e.label)).toEqual([
      dict.en.palTop,
      dict.en.navWork,
      dict.en.navCareer,
      dict.en.navStory,
      dict.en.palFaq,
      dict.en.navContact,
    ]);
  });

  it('opens each project sheet by its projectKey, marking business vs build', () => {
    const e = byId();
    const gonai = e.get(`project:${projectKey(input.projects[0])}`)!;
    expect(gonai.action).toEqual({ type: 'target', target: `work/${projectKey(input.projects[0])}` });
    expect(gonai.hint).toBe('Trip planner');
    expect(gonai.icon).toBe('code-duotone');
    expect(e.get(`project:${projectKey(input.projects[1])}`)?.icon).toBe('chart-line-up-duotone');
  });

  // Fix wave finding 1 (Important, gate item 1): a project with a Thai-only
  // name and no Notion Slug gives projectKey('') -- unlike the footer (which
  // drops the row), a ⌘K row must stay findable and unique, so the id falls
  // back to the project's own id and the target falls back to the 'work'
  // section instead of the unparseable 'work/' sheet target.
  it('keeps a slugless, Thai-only-named project findable, targeting the work section instead of a dead sheet (S-7)', () => {
    const slugless = { ...input.projects[0], id: 'p-slugless', slug: null, name: 'ร้านขนมจีบ' };
    const entries = buildPaletteIndex({ ...input, projects: [slugless] }, 'en');
    const row = entries.find((e) => e.group === 'projects')!;
    expect(row.id).toBe('project:p-slugless');
    expect(row.action).toEqual({ type: 'target', target: 'work' });
  });

  it('opens each Career pill and each FAQ answer', () => {
    const e = byId('th');
    expect(e.get('career:actmedia')?.action).toEqual({ type: 'target', target: 'career:actmedia' });
    // M4 (fix wave finding 7): the hint is now pillYears()'s localised short
    // form ('2026 – <nowWord>'), not the hand-typed, untranslated `period`
    // string -- see the dedicated describe block below for the full case.
    expect(e.get('career:actmedia')?.hint).toBe(`2026 – ${dict.th.careerNow}`);
    const faq = e.get('faq:fx-faq-contact')!;
    expect(faq.label).toBe('ติดต่อยังไง?');
    expect(faq.alt).toBe('How do I reach him?');
    expect(faq.action).toEqual({ type: 'target', target: faqAnchorId('fx-faq-contact') });
  });

  it('shortens link hints and offers language + three themes', () => {
    const e = byId();
    expect(e.get('link:linkedin')?.hint).toBe('linkedin.com/in/test');
    expect(e.get('link:github')?.hint).toBe('github.com/test');
    expect(e.get('pref:lang')?.action).toEqual({ type: 'locale', locale: 'th' });
    expect(e.get('pref:theme-dark')?.label).toBe('Appearance: Dark');
    expect(byId('th').get('pref:theme-dark')?.label).toBe('การแสดงผล: มืด');
    expect(byId('th').get('pref:lang')?.action).toEqual({ type: 'locale', locale: 'en' });
  });

  // Ledger ruling (preflight C16): a Thai-only company name slugs to '' (P2
  // S-7's slugKey), and `career:` with an empty key is a target
  // parseTarget's CAREER_RE never matches -- a dead row. It is dropped
  // instead of listed.
  it('skips a career row whose key is empty (C16)', () => {
    const entries = buildPaletteIndex(
      {
        ...input,
        career: [
          ...input.career,
          {
            id: 'c2',
            key: '',
            company: 'ร้านขนมจีบ',
            role: { en: 'Owner', th: 'เจ้าของ' },
            period: '2024',
            start: null,
            end: null,
          },
        ],
      },
      'en',
    );
    const career = entries.filter((e) => e.group === 'career');
    expect(career).toHaveLength(1);
    expect(career[0].id).toBe('career:actmedia');
  });

  // M4 (fix wave finding 7): the hand-typed `period` string ("MAR 2026 –
  // Present") is English regardless of locale, so it leaked untranslated
  // into the Thai palette. pillYears() -- the same helper the Career pill
  // itself uses -- gives a short, localised form instead; `period` is now
  // only a fallback for a pre-migration row with no StartDate at all.
  describe('career hint uses pillYears, localised, falling back to period (M4)', () => {
    it('shows "<year> – <nowWord>" for an ongoing role, in both languages', () => {
      expect(byId('en').get('career:actmedia')?.hint).toBe(`2026 – ${dict.en.careerNow}`);
      expect(byId('th').get('career:actmedia')?.hint).toBe(`2026 – ${dict.th.careerNow}`);
    });

    it('shows "<start> – <end>" for a finished role', () => {
      const entries = buildPaletteIndex(
        { ...input, career: [{ ...input.career[0], start: '2021-05', end: '2022-12' }] },
        'en',
      );
      expect(entries.find((e) => e.group === 'career')?.hint).toBe('2021 – 2022');
    });

    it('falls back to the raw `period` string for a pre-migration row with no StartDate', () => {
      const entries = buildPaletteIndex(
        { ...input, career: [{ ...input.career[0], period: 'Since 2019', start: null, end: null }] },
        'en',
      );
      expect(entries.find((e) => e.group === 'career')?.hint).toBe('Since 2019');
    });
  });

  // Ledger ruling (preflight C13): Notion copy may carry the '|' break mark
  // (Global Constraints: it marks the one allowed Thai break in *display*
  // text). A ⌘K row is body-size text with no keep-runs, so -- exactly like
  // project-view's unbreak() on the projects index -- the mark is simply
  // removed rather than shown literally.
  it('strips the "|" break marker from FAQ, project and career copy (C13)', () => {
    // Notion writes the mark directly between two words (Thai has no spaces
    // between them, e.g. project-view.test.ts's 'ทำไมวางแผนทริปเดียว|ต้อง…') --
    // not padded with spaces, so removal alone yields a clean word boundary.
    const dirty: PaletteInput = {
      ...input,
      projects: [
        {
          ...input.projects[0],
          kicker: { en: 'Trip planner', th: 'แอปวางแผน|เที่ยว' },
          description: { en: 'One-day trip', th: 'ทริป|หนึ่งวัน' },
        },
      ],
      career: [{ ...input.career[0], role: { en: 'Senior|BD', th: 'นักพัฒนาธุรกิจ|อาวุโส' } }],
      faq: [{ id: 'fx-faq-contact', question: { en: 'How|do I reach him?', th: 'ติดต่อ|ยังไง?' } }],
    };
    const entries = buildPaletteIndex(dirty, 'th');
    const project = entries.find((e) => e.group === 'projects')!;
    expect(project.hint).toBe('แอปวางแผนเที่ยว');
    expect(project.keywords).not.toContain('|');
    const career = entries.find((e) => e.group === 'career')!;
    expect(career.keywords).not.toContain('|');
    const faq = entries.find((e) => e.group === 'faq')!;
    expect(faq.label).toBe('ติดต่อยังไง?');
    expect(faq.alt).toBe('Howdo I reach him?'); // alt = the English side, also cleaned
  });
});

describe('searchPalette', () => {
  const entries = buildPaletteIndex(input, 'en');

  it('returns everything for an empty query', () => {
    expect(searchPalette(entries, '  ')).toEqual(entries);
  });

  it('ranks label prefixes and keeps the fixed group order', () => {
    expect(searchPalette(entries, 'gon').map((e) => e.label)).toEqual(['GoNai']);
    expect(searchPalette(entries, 'career').map((e) => e.id)).toEqual(['go:career']);
  });

  it('searches the other language and keywords too (bilingual)', () => {
    const ids = searchPalette(entries, 'ติดต่อ').map((e) => e.id);
    // Suggested (mail, via keyword) comes before Go to (Contact, via its Thai name).
    expect(ids).toEqual(['suggested:mail', 'go:contact', 'faq:fx-faq-contact']);
  });

  it('forgives one typo in a Latin query of four or more letters', () => {
    expect(searchPalette(entries, 'resme').map((e) => e.id)).toContain('suggested:resume');
    expect(searchPalette(entries, 'zzzq')).toEqual([]);
  });
});

// M3 (fix wave finding 6): Enter used to just run rows[0] -- searchPalette's
// fixed PALETTE_GROUPS order, not score order, so a weaker match in an
// earlier group could beat the actual best match. bestScoreIndex fixes the
// selection itself; the alias/description scoring split (score(), above)
// and the restored Career alias make the ranking underneath it trustworthy.
describe('bestScoreIndex (M3)', () => {
  // A second FAQ item, its Thai question containing 'ภาษา' as a substring
  // (like the real content fixture's "ทำงานได้กี่ภาษา?") -- gives both the
  // FAQ row (tier 2, an included substring) and Preferences' language row
  // (tier 1 via its keywords on /th, tier 3 via its EN label 'Switch to
  // ภาษาไทย' on /en) something to match.
  const withLangFaq: PaletteInput = {
    ...input,
    faq: [...input.faq, { id: 'fx-faq-lang', question: { en: 'Which languages does he work in?', th: 'ทำงานได้กี่ภาษา?' } }],
  };

  it('picks the FAQ row for "ภาษา" on /th', () => {
    const entries = buildPaletteIndex(withLangFaq, 'th');
    const rows = searchPalette(entries, 'ภาษา');
    expect(rows[bestScoreIndex(rows, 'ภาษา')].id).toBe('faq:fx-faq-lang');
  });

  it('picks Preferences over the FAQ row for "ภาษา" on /en, even though FAQ lists first (group order != score order)', () => {
    const entries = buildPaletteIndex(withLangFaq, 'en');
    const rows = searchPalette(entries, 'ภาษา');
    // Display order is unchanged (still fixed by PALETTE_GROUPS) -- 'faq'
    // lists before 'prefs' regardless of which one actually matches better.
    expect(rows[0].group).toBe('faq');
    // But pref:lang's EN label ('Switch to ภาษาไทย') has a word that starts
    // with the query (tier 3); the FAQ row only contains it as a substring
    // of its Thai alt (tier 2) -- pref:lang is the true best match.
    expect(rows[bestScoreIndex(rows, 'ภาษา')].id).toBe('pref:lang');
  });

  // Re-review round 1, Important B. Tripedia's real description ends "...the
  // idea GoNai was later built from" -- its keyword word 'gonai' used to hit
  // the SAME 0.5 typo tier as GoNai's own name, and the real projects.json
  // array order (Talatify, Tripedia, Aje, GoNai, klao-site) put Tripedia
  // first, so the tie went to Tripedia's index, not the project the typo
  // actually named. score() now scores a typo of the row's own name (0.6)
  // above a typo of a word merely mentioned in its description (0.5).
  it.each(['en', 'th'] as const)('picks GoNai first for the typo "gonia" on /%s, against the real fixtures (Important B)', (locale) => {
    const entries = buildPaletteIndex(realInput, locale);
    // GoNai (index 3) lists after Tripedia (index 1) in display order --
    // this only proves the fix picked the right SELECTION, not that it
    // reordered the list.
    const tripedia = entries.findIndex((e) => e.label === 'Tripedia');
    const gonai = entries.findIndex((e) => e.label === 'GoNai');
    expect(tripedia).toBeGreaterThanOrEqual(0);
    expect(gonai).toBeGreaterThan(tripedia);
    const rows = searchPalette(entries, 'gonia');
    expect(rows.map((r) => r.label)).toContain('Tripedia');
    expect(rows[bestScoreIndex(rows, 'gonia')].label).toBe('GoNai');
  });

  it('finds Actmedia for "retail" and "ค้าปลีก" via the restored alias (M3, ruling: generic words only)', () => {
    const entries = buildPaletteIndex(input, 'en');
    for (const q of ['retail', 'ค้าปลีก']) {
      const rows = searchPalette(entries, q);
      expect(rows[bestScoreIndex(rows, q)].id).toBe('career:actmedia');
    }
  });
});

describe('helpers', () => {
  it('fold strips accents and case', () => {
    expect(fold('Résumé')).toBe('resume');
  });

  it('oneEdit accepts one insert, delete, substitution or neighbour swap', () => {
    expect(oneEdit('resume', 'resme')).toBe(true);
    expect(oneEdit('gonai', 'gonia')).toBe(true);
    expect(oneEdit('gonai', 'gnoia')).toBe(false);
  });

  it('highlight splits around the first match, ignoring accents and case', () => {
    expect(highlight('Open résumé', 'resume')).toEqual(['Open ', 'résumé', '']);
    expect(highlight('GoNai', 'x')).toBeNull();
    expect(highlight('GoNai', '')).toBeNull();
  });

  // Fix round 1, Important: highlight() used to slice by code-unit length,
  // ignoring Thai grapheme-cluster boundaries. A base consonant plus its
  // tone mark ('อ่') is two code units but one glyph a reader never sees
  // split, so the naive slice returned a fragment starting with a bare
  // combining mark -- a broken glyph once T13 renders it inside <mark>.
  describe('highlight (Thai grapheme clusters, fix round 1)', () => {
    it('never returns an "after" fragment that starts with a combining mark', () => {
      const parts = highlight('อ่อนนุช', 'อ')!;
      expect(parts).toEqual(['', 'อ่', 'อนนุช']);
      expect(parts[2][0]).not.toMatch(/[ัิ-ฺ็-๎]/);
    });

    it('extends the match forward when a tone mark sits exactly at the match end', () => {
      // 'มานี่'.indexOf('มานี') = 0; the naive end (index 4) lands right on
      // the tone mark that closes the last cluster ('นี่'), so it must be
      // pulled into the match rather than left to open the "after" side.
      expect(highlight('มานี่', 'มานี')).toEqual(['', 'มานี่', '']);
    });

    it('snaps both edges around a match in the middle of a Thai word', () => {
      // 'นเที' sits mid-word in 'ก่อนเที่ยง': the naive end (index 7) lands on
      // the tone mark that closes 'ที่', so the match grows to include it.
      expect(highlight('ก่อนเที่ยง', 'นเที')).toEqual(['ก่อ', 'นเที่', 'ยง']);
      // A query that itself starts on a tone mark ('่อน') snaps its start
      // back to the base consonant that mark belongs to ('ก'), growing the
      // match backward instead of splitting 'ก' from its own tone mark.
      expect(highlight('ก่อนเที่ยง', '่อน')).toEqual(['', 'ก่อน', 'เที่ยง']);
    });

    it('falls back to the Thai combining-mark ranges when Intl.Segmenter is unavailable', () => {
      const IntlUnknown = Intl as Record<string, unknown>;
      const original = IntlUnknown.Segmenter;
      IntlUnknown.Segmenter = undefined;
      try {
        expect(highlight('อ่อนนุช', 'อ')).toEqual(['', 'อ่', 'อนนุช']);
        expect(highlight('มานี่', 'มานี')).toEqual(['', 'มานี่', '']);
        // English is unaffected by either path.
        expect(highlight('Open résumé', 'resume')).toEqual(['Open ', 'résumé', '']);
      } finally {
        IntlUnknown.Segmenter = original;
      }
    });
  });
});
