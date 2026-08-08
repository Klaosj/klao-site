import { describe, it, expect, vi } from 'vitest';
import { mapProject, mapCareerEntry, mapProfile } from '@/lib/notion-mappers';

const title = (s: string) => ({ title: [{ plain_text: s }] });
const rich = (s: string) => ({ rich_text: s ? [{ plain_text: s }] : [] });

const projectPage = {
  id: 'p1',
  properties: {
    Name: title('GoNai'),
    DescriptionEN: rich('Trip planner'),
    DescriptionTH: rich('แอปวางแผนเที่ยว'),
    Stack: { multi_select: [{ name: 'Next.js' }, { name: 'Supabase' }] },
    LiveURL: { url: 'https://gonai.example' },
    RepoURL: { url: null },
    Screenshot: { files: [{ file: { url: 'https://s3.example/x.png' } }] },
    Featured: { checkbox: true },
    Order: { number: 1 },
    Published: { checkbox: true },
  },
};

describe('mapProject', () => {
  it('maps a full row', () => {
    const p = mapProject(projectPage)!;
    expect(p).toMatchObject({
      id: 'p1',
      name: 'GoNai',
      description: { en: 'Trip planner', th: 'แอปวางแผนเที่ยว' },
      stack: ['Next.js', 'Supabase'],
      liveUrl: 'https://gonai.example',
      repoUrl: null,
      imageSrc: '/api/img/page/p1/Screenshot',
      featured: true,
      order: 1,
    });
  });

  it('falls back TH -> EN when TH empty', () => {
    const page = { ...projectPage, properties: { ...projectPage.properties, DescriptionTH: rich('') } };
    expect(mapProject(page)!.description.th).toBe('Trip planner');
  });

  it('returns null and warns on missing Name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const page = { ...projectPage, properties: { ...projectPage.properties, Name: title('') } };
    expect(mapProject(page)).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('uses null imageSrc when no screenshot files', () => {
    const page = { ...projectPage, properties: { ...projectPage.properties, Screenshot: { files: [] } } };
    expect(mapProject(page)!.imageSrc).toBeNull();
  });
});

const careerPage = {
  id: 'c1',
  properties: {
    Role: title('Business Development'),
    Company: rich('Actmedia'),
    Period: rich('2024 – present'),
    WinsEN: rich('Win one\nWin two'),
    WinsTH: rich(''),
    Order: { number: 1 },
  },
};

describe('mapCareerEntry', () => {
  it('maps wins as newline-split bullets with TH fallback', () => {
    const c = mapCareerEntry(careerPage)!;
    expect(c).toEqual({
      id: 'c1',
      role: 'Business Development',
      company: 'Actmedia',
      period: '2024 – present',
      wins: { en: ['Win one', 'Win two'], th: ['Win one', 'Win two'] },
      order: 1,
    });
    // wins.th falls back to wins.en's *content*, not the same array reference,
    // so an in-place mutation (.sort()/.push()) on one locale can't leak into the other.
    expect(c.wins.th).not.toBe(c.wins.en);
  });

  it('returns null and warns on missing Role', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const page = { ...careerPage, properties: { ...careerPage.properties, Role: title('') } };
    expect(mapCareerEntry(page)).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

const profilePage = {
  id: 'pr1',
  properties: {
    Name: title('Suwichak Jarunopratamp (Klao)'),
    HeadlineEN: rich('Business developer who builds his own tools.'),
    HeadlineTH: rich('นัก BD ที่สร้างเครื่องมือใช้เอง'),
    BylineEN: rich('Bangkok'),
    BylineTH: rich(''),
    NowEN: rich('BD at Actmedia'),
    NowTH: rich(''),
    Photo: { files: [] },
    LinkedIn: { url: 'https://linkedin.com/in/x' },
    GitHub: { url: 'https://github.com/Klaosj' },
    Email: { email: 'me@example.com' },
    ResumeURL: { url: null },
  },
};

describe('mapProfile', () => {
  it('maps the single profile row', () => {
    const p = mapProfile(profilePage)!;
    // Full-object assertion: every field on the Profile interface is required,
    // so this is exhaustive coverage rather than a spot check.
    expect(p).toEqual({
      name: 'Suwichak Jarunopratamp (Klao)',
      headline: {
        en: 'Business developer who builds his own tools.',
        th: 'นัก BD ที่สร้างเครื่องมือใช้เอง',
      },
      byline: { en: 'Bangkok', th: 'Bangkok' },
      // NowTH is empty in the fixture: this is the TH->EN fallback case.
      now: { en: 'BD at Actmedia', th: 'BD at Actmedia' },
      photoSrc: null,
      linkedin: 'https://linkedin.com/in/x',
      github: 'https://github.com/Klaosj',
      email: 'me@example.com',
      resumeUrl: null,
    });
  });

  it('returns null and warns on missing Name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const page = { ...profilePage, properties: { ...profilePage.properties, Name: title('') } };
    expect(mapProfile(page)).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
