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

describe('mapCareerEntry', () => {
  it('maps wins as newline-split bullets with TH fallback', () => {
    const c = mapCareerEntry({
      id: 'c1',
      properties: {
        Role: title('Business Development'),
        Company: rich('Actmedia'),
        Period: rich('2024 – present'),
        WinsEN: rich('Win one\nWin two'),
        WinsTH: rich(''),
        Order: { number: 1 },
      },
    })!;
    expect(c.wins.en).toEqual(['Win one', 'Win two']);
    expect(c.wins.th).toEqual(['Win one', 'Win two']);
  });
});

describe('mapProfile', () => {
  it('maps the single profile row', () => {
    const p = mapProfile({
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
    })!;
    expect(p.name).toContain('Klao');
    expect(p.byline.th).toBe('Bangkok');
    expect(p.photoSrc).toBeNull();
    expect(p.email).toBe('me@example.com');
  });
});
