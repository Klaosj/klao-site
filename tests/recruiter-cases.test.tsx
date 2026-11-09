import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CaseStudyView from '@/components/CaseStudyView';
import CaseStudies from '@/components/sections/CaseStudies';
import RecruiterHero, { experienceOrgs } from '@/components/sections/RecruiterHero';
import careerFixture from '@/content/fixtures/career.json';
import profileFixture from '@/content/fixtures/profile.json';
import { CASE_STUDIES } from '@/content/cases';
import { HERO, PROOF_STATS } from '@/content/recruiter';
import { CASE_SLUG, demoHref, getCaseStudy, showDrafts, visibleCases, type CaseStudy } from '@/lib/cases';
import type { CareerEntry, Localized, Profile } from '@/lib/models';
import { NAV_SECTIONS, navSections } from '@/lib/nav';

const PROD = { VERCEL_ENV: 'production' };
const PREVIEW = { VERCEL_ENV: 'preview' };
const career = careerFixture as unknown as CareerEntry[];
const profile = profileFixture as unknown as Profile;

// Every Localized value in a case, walked generically so a new field is covered too.
function localizedValues(v: unknown, out: Localized[] = []): Localized[] {
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.en === 'string' && typeof o.th === 'string' && Object.keys(o).length === 2) out.push(o as unknown as Localized);
    else for (const x of Object.values(o)) localizedValues(x, out);
  }
  return out;
}

describe('case study visibility (drafts never reach production)', () => {
  it('shows drafts on previews and local builds, never on production', () => {
    expect(showDrafts(PREVIEW)).toBe(true);
    expect(showDrafts({})).toBe(true);
    expect(showDrafts(PROD)).toBe(false);
    const drafts = CASE_STUDIES.filter((c) => c.status === 'draft');
    for (const c of drafts) {
      expect(getCaseStudy(c.slug, PROD), c.slug).toBeNull();
      expect(getCaseStudy(c.slug, PREVIEW)?.slug).toBe(c.slug);
    }
    expect(visibleCases(PROD).every((c) => c.status === 'cleared')).toBe(true);
  });

  it('links the protected demo while a case is a draft, the public one once cleared', () => {
    const c = CASE_STUDIES.find((x) => x.demo)!;
    expect(demoHref({ ...c, status: 'draft' })).toBe(c.demo!.previewUrl);
    expect(demoHref({ ...c, status: 'cleared' })).toBe(c.demo!.url);
    expect(demoHref({ ...c, demo: undefined })).toBeNull();
  });

  it('drops #cases from the nav when no case is visible, so the capsule never links a dead hash', () => {
    expect(navSections(true)).toEqual(NAV_SECTIONS);
    expect(navSections(false)).not.toContain('cases');
    expect(navSections(false)).toEqual(NAV_SECTIONS.filter((s) => s !== 'cases'));
  });
});

describe('case study content', () => {
  it('has unique, URL-safe slugs', () => {
    const slugs = CASE_STUDIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(CASE_SLUG);
  });

  it('carries every line in both languages, Thai never left as English', () => {
    for (const c of CASE_STUDIES) {
      const values = localizedValues(c);
      expect(values.length).toBeGreaterThan(20);
      for (const v of values) {
        expect(v.en.trim(), `${c.slug}: empty EN`).not.toBe('');
        expect(v.th.trim(), `${c.slug}: empty TH for "${v.en}"`).not.toBe('');
        // A sentence-length English value needs a real Thai translation, not a copy
        // (tool names like "HTML, CSS, JavaScript · Supabase · Vercel" may stay English).
        const sentence = v.en.length > 24 && !/HTML|Supabase|Vercel/.test(v.en);
        if (sentence) expect(v.th, `${c.slug}: TH copies EN "${v.en}"`).not.toBe(v.en);
      }
    }
  });

  it('labels the made-up artifacts as illustrative or sample data', () => {
    for (const c of CASE_STUDIES) expect(c.artifact.caption.en).toMatch(/illustrative|sample/i);
  });

  it('points every screenshot at a real file', () => {
    for (const c of CASE_STUDIES) {
      for (const src of [c.image?.src, c.imagePhone?.src, c.imageMini?.src, c.artifact.image?.src]) {
        if (src) expect(() => readFileSync(`public${src}`), src).not.toThrow();
      }
    }
  });
});

// The anonymity gate. Client, partner, vendor and colleague names from the
// real projects must never appear in the public site's source or bundle.
const BANNED = [
  /\btops\b/i,
  /big\s?c\b/i,
  /watsadu/i,
  /central (retail|food|group)/i,
  /techila/i,
  /tequila/i,
  /moving walls/i,
  /quividi/i,
  /\bsolum\b/i,
  /\bbolt\b/i,
  /\bleo\b/i,
  /dear tummy/i,
  /p'?meen/i,
  /p'nin|p'nick|p'mai|p'thana/i,
  /salesmanager|salessupport/i,
  /supabase\.co/i,
  /\bTHB\s?\d/i,
  /\d[\d,.]*\s?(stores|branches|screens|สาขา)/i,
];

describe('anonymity of the client-work copy', () => {
  const sources = ['src/content/cases.ts', 'src/content/recruiter.ts', 'src/components/CaseStudyView.tsx', 'src/components/CaseThumb.tsx', 'src/components/sections/CaseStudies.tsx'];
  it.each(sources)('%s names no client, partner, vendor or colleague, and no confidential figure', (file) => {
    const text = readFileSync(file, 'utf8');
    for (const re of BANNED) expect(text, `${file} matches ${re}`).not.toMatch(re);
  });
});

describe('Recruiter Edition hero', () => {
  it('uses only figures already public on the site, each with a label in both languages', () => {
    expect(PROOF_STATS.map((s) => s.value)).toEqual(['4', '3–4', '30', '~35%']);
    const careerText = JSON.stringify(careerFixture);
    expect(careerText).toContain('4 live rollouts');
    expect(careerText).toContain('3–4 new channel opportunities');
    expect(careerText).toContain('~35%');
    for (const s of PROOF_STATS) {
      expect(s.label.en).not.toBe('');
      expect(s.label.th).not.toBe(s.label.en);
    }
  });

  it('lists each employer once, in career order, and marks the founder role', () => {
    const orgs = experienceOrgs(career);
    expect(orgs.map((o) => o.name)).toEqual(['Actmedia', 'Casetify', 'MMB Technology', 'VELA Central World', 'A Bun Dance']);
    expect(orgs.filter((o) => o.founder).map((o) => o.name)).toEqual(['A Bun Dance']);
  });

  it('splits the h1 into a lead and a highlighted end point that add up to the title', () => {
    for (const l of ['en', 'th'] as const) expect(HERO.titleLead[l] + HERO.titleAccent[l]).toBe(HERO.title[l]);
  });

  it('shows the figures as static text (no count-up: it would display numbers that are not true) and marks the end point', () => {
    const html = renderToStaticMarkup(<RecruiterHero profile={profile} career={career} locale="en" />);
    expect(html).toContain('<span class="rh-n">4</span>');
    expect(html).toContain('<span class="rh-n rh-n-s">~35%</span>');
    expect(html).not.toContain('rh-c-v');
    expect(html).toContain('class="rh-mark"');
  });

  it.each(['en', 'th'] as const)('renders name, role, the three actions and four stats on /%s', (locale) => {
    const html = renderToStaticMarkup(<RecruiterHero profile={profile} career={career} locale={locale} />);
    expect(html).toContain('id="top"');
    expect(html).toContain('id="hero-cta"');
    expect(html).toContain(profile.name);
    expect(html).toContain(HERO.downloadResume[locale]);
    expect(html).toContain(HERO.emailMe[locale]);
    expect(html).toContain('href="mailto:');
    expect(html).toContain('LinkedIn');
    // Two Actmedia figures lead; the two earlier ones sit in the card's foot.
    expect(html.match(/class="rh-n"/g)).toHaveLength(2);
    expect(html.match(/class="rh-n rh-n-s"/g)).toHaveLength(2);
    // The path card: five stops, ending at Live, labelled for screen readers.
    expect(html.match(/class="rh-dot"/g)).toHaveLength(5);
    expect(html).toContain(`aria-label="${HERO.pathLabel[locale]}"`);
    // The earlier figures sit under a visible "Before Actmedia" label, never under "Now at Actmedia" alone.
    const foot = html.slice(html.indexOf('class="rh-earlier"'));
    expect(foot).toContain(`>${HERO.earlier[locale]}</p>`);
    expect(foot.indexOf(HERO.earlier[locale])).toBeLessThan(foot.indexOf('rh-n rh-n-s'));
  });
});

describe('case study rendering', () => {
  const [first, second] = visibleCases(PREVIEW);

  it.each(['en', 'th'] as const)('renders the cards with the confidential chip and a draft mark on /%s', (locale) => {
    const html = renderToStaticMarkup(<CaseStudies cases={visibleCases(PREVIEW)} locale={locale} />);
    expect(html).toContain('id="cases"');
    for (const c of visibleCases(PREVIEW)) expect(html).toContain(`href="/${locale}/work/${c.slug}"`);
    expect(html.match(/class="cs-chip cs-draft"/g)?.length).toBe(visibleCases(PREVIEW).filter((c) => c.status === 'draft').length);
  });

  it('leads a drawn (tracker) case with its artifact, and the contents list follows the page order', () => {
    const tracker = visibleCases(PREVIEW).find((c) => c.artifact.kind === 'tracker')!;
    const html = renderToStaticMarkup(<CaseStudyView c={tracker} next={null} locale="en" />);
    expect(html.indexOf('id="c-artifact"')).toBeLessThan(html.indexOf('id="c-problem"'));
    const toc = html.slice(html.indexOf('class="cst-toc"'));
    expect(toc.indexOf('href="#c-artifact"')).toBeLessThan(toc.indexOf('href="#c-problem"'));
  });

  it('uses the close crop, not the whole screen, for the next-case mini picture', () => {
    const shot = visibleCases(PREVIEW).find((c) => c.imageMini)!;
    const other = visibleCases(PREVIEW).find((c) => c !== shot)!;
    const html = renderToStaticMarkup(<CaseStudyView c={other} next={shot} locale="en" />);
    expect(html.slice(html.indexOf('class="cst-next"'))).toContain(`src="${shot.imageMini!.src}"`);
  });

  it('hides the next-case mini picture from assistive tech (the link text names the case)', () => {
    const html = renderToStaticMarkup(<CaseStudyView c={first} next={second} locale="en" />);
    const mini = html.slice(html.indexOf('class="cst-next"'));
    expect(mini).toMatch(/class="cs-thumb cs-thumb-mini[^"]*" aria-hidden="true"/);
  });

  it('renders nothing when no case is visible', () => {
    expect(renderToStaticMarkup(<CaseStudies cases={[]} locale="en" />)).toBe('');
  });

  it.each(['en', 'th'] as const)('renders a full case page with every section and the draft note on /%s', (locale) => {
    for (const c of [first, second] as CaseStudy[]) {
      const html = renderToStaticMarkup(<CaseStudyView c={c} next={c === first ? second : first} locale={locale} />);
      for (const id of ['c-problem', 'c-did', 'c-artifact', 'c-result']) expect(html, `${c.slug} lacks #${id}`).toContain(`id="${id}"`);
      expect(html.match(/<li[ >]/g)?.length ?? 0).toBeGreaterThanOrEqual(c.steps.length);
      // A hero picture only from real screenshots (a drawn case leads with its artifact); scroll-spy list always.
      expect(html.includes('cs-thumb-hero')).toBe(Boolean(c.image));
      expect(html).toContain('class="cst-toc"');
      // Status is never shown by fill alone: the two slips carry a flag mark.
      if (c.artifact.kind === 'tracker') expect(html.match(/class="cst-flag"/g)).toHaveLength(2);
      // ...and the phone summary spells the same two slips out in words.
      if (c.artifact.kind === 'tracker') {
        const flags = html.slice(html.indexOf('class="cst-flags"'), html.indexOf('class="cst-scroll"'));
        expect(flags).toContain(locale === 'en' ? 'Batch\u00a0C · Installation · At risk' : 'ชุด\u00a0C · ติดตั้ง · เสี่ยง');
        expect(flags).toContain(locale === 'en' ? 'Batch\u00a0D · Screen prep · Off track' : 'ชุด\u00a0D · เตรียมจอ · หลุดแผน');
        expect(flags.match(/class="cst-flag-i"/g)).toHaveLength(2);
      }
      if (c.status === 'draft') expect(html).toContain('cst-draftnote');
      if (c.artifact.kind === 'tracker') expect(html).toContain('<table>');
      if (c.demo) expect(html).toContain(`href="${demoHref(c)}"`);
      expect(html).toContain(`href="/${locale}/work/${(c === first ? second : first).slug}"`);
    }
  });
});
