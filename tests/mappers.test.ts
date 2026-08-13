import { describe, it, expect, vi } from 'vitest';
import { mapProject, mapCareerEntry, mapProfile, mapSkill, mapQuestion } from '@/lib/notion-mappers';

const title = (s: string) => ({ title: [{ plain_text: s }] });
const rich = (s: string) => ({ rich_text: s ? [{ plain_text: s }] : [] });
const select = (name: string | null) => ({ select: name ? { name } : null });

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

  it('maps QuestionEN/TH and Slug', () => {
    const p = mapProject({
      ...projectPage,
      properties: {
        ...projectPage.properties,
        Name: title('GoNai'),
        QuestionEN: rich('One day in Bangkok — what is the real budget?'),
        QuestionTH: rich('ไปเที่ยวหนึ่งวัน งบจริงเท่าไหร่?'),
        Slug: rich('gonai'),
      },
    })!;
    expect(p?.question).toEqual({ en: 'One day in Bangkok — what is the real budget?', th: 'ไปเที่ยวหนึ่งวัน งบจริงเท่าไหร่?' });
    expect(p?.slug).toBe('gonai');
  });

  it('maps a row without Question/Slug to nulls (not dropped)', () => {
    const p = mapProject(projectPage);
    expect(p).not.toBeNull();
    expect(p?.question).toBeNull();
    expect(p?.slug).toBeNull();
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
      // `role` became Localized in the 2026-08-09 QA pass. This fixture page
      // has no RoleTH property at all -- which is the point: it stands for an
      // existing Notion database that predates the field, and it must still
      // map, falling back th -> en.
      role: { en: 'Business Development', th: 'Business Development' },
      company: 'Actmedia',
      period: '2024 – present',
      wins: { en: ['Win one', 'Win two'], th: ['Win one', 'Win two'] },
      order: 1,
    });
    // wins.th falls back to wins.en's *content*, not the same array reference,
    // so an in-place mutation (.sort()/.push()) on one locale can't leak into the other.
    expect(c.wins.th).not.toBe(c.wins.en);
  });

  it('uses the Thai job title when RoleTH is present', () => {
    // The other half of the contract: the fallback above must not be so
    // eager that a real Thai title gets ignored.
    const page = {
      ...careerPage,
      properties: { ...careerPage.properties, RoleTH: rich('นักพัฒนาธุรกิจ') },
    };
    expect(mapCareerEntry(page)!.role).toEqual({
      en: 'Business Development',
      th: 'นักพัฒนาธุรกิจ',
    });
  });

  it('still skips the row when the English Role is missing, even if RoleTH is set', () => {
    // The skip stays gated on `Role` alone, so adding the optional Thai
    // property cannot accidentally resurrect a row that should be skipped.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const page = {
      ...careerPage,
      properties: { ...careerPage.properties, Role: title(''), RoleTH: rich('นักพัฒนาธุรกิจ') },
    };
    expect(mapCareerEntry(page)).toBeNull();
    warn.mockRestore();
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
      // Same additive treatment as RoleTH: this fixture page has no
      // `Clients` property, so an existing Profile database maps to an
      // empty list rather than failing, and the band that reads it simply
      // does not render.
      clients: [],
      // NameNative is optional rich text, same additive treatment as RoleTH
      // above: this fixture page has no `NameNative` property, so an
      // existing Profile database maps to null rather than failing.
      nameNative: null,
    });
  });

  it('uses the native name when NameNative is present', () => {
    // The other half of the contract: the null-default above must not be so
    // eager that a real native-script name gets ignored.
    const page = {
      ...profilePage,
      properties: { ...profilePage.properties, NameNative: rich('สุวิจักขณ์') },
    };
    expect(mapProfile(page)!.nameNative).toBe('สุวิจักขณ์');
  });

  it('returns null and warns on missing Name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const page = { ...profilePage, properties: { ...profilePage.properties, Name: title('') } };
    expect(mapProfile(page)).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

const skillPage = {
  id: 's1',
  properties: {
    Name: title('Python'),
    Tier: select('working'),
    Category: select('data'),
    Order: { number: 3 },
  },
};

describe('mapSkill', () => {
  it('maps a full row', () => {
    expect(mapSkill(skillPage)).toEqual({
      id: 's1',
      name: 'Python',
      tier: 'working',
      category: 'data',
      order: 3,
    });
  });

  it('returns null and warns on missing Name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const page = { ...skillPage, properties: { ...skillPage.properties, Name: title('') } };
    expect(mapSkill(page)).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('returns null and warns when Tier is missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const page = { ...skillPage, properties: { ...skillPage.properties, Tier: select(null) } };
    expect(mapSkill(page)).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('returns null and warns when Tier is not one of the five recognised values', () => {
    // A typo'd or stale Select option (e.g. renamed in Notion) must drop the
    // row rather than silently mis-tiering it -- Tier controls the band's
    // whole visual hierarchy, so there is no safe guess to fall back to.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const page = { ...skillPage, properties: { ...skillPage.properties, Tier: select('expert') } };
    expect(mapSkill(page)).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('defaults Category to "biz" when the property is empty', () => {
    // Additive treatment, same as CareerEntry.RoleTH/Profile.Clients: an
    // existing Skills database without a Category property (or an empty
    // one) still maps, it just falls back to a default rather than failing
    // the row -- unlike Tier, which has no safe default.
    const page = { ...skillPage, properties: { ...skillPage.properties, Category: select(null) } };
    expect(mapSkill(page)!.category).toBe('biz');
  });

  it('uses the real Category when present, not always the default', () => {
    expect(mapSkill(skillPage)!.category).toBe('data');
  });
});

const questionPage = {
  id: 'q1',
  created_time: '2026-08-01T09:30:00.000Z',
  properties: {
    Question: title('Can a Notion database run a whole website?'),
    QuestionTH: rich('ฐานข้อมูล Notion อันเดียว รันทั้งเว็บได้ไหม?'),
    Status: select('building'),
    LinkSlug: rich(''),
    Date: { date: { start: '2026-08-05' } },
    Published: { checkbox: true },
  },
};

describe('mapQuestion', () => {
  it('maps a full row', () => {
    expect(mapQuestion(questionPage)).toEqual({
      id: 'q1',
      question: {
        en: 'Can a Notion database run a whole website?',
        th: 'ฐานข้อมูล Notion อันเดียว รันทั้งเว็บได้ไหม?',
      },
      status: 'building',
      linkSlug: null,
      date: '2026-08-05',
    });
  });

  it('falls back TH -> EN when QuestionTH empty', () => {
    const page = { ...questionPage, properties: { ...questionPage.properties, QuestionTH: rich('') } };
    expect(mapQuestion(page)!.question.th).toBe('Can a Notion database run a whole website?');
  });

  it('defaults missing or unrecognised Status to wondering', () => {
    const missing = { ...questionPage, properties: { ...questionPage.properties, Status: select(null) } };
    const bogus = { ...questionPage, properties: { ...questionPage.properties, Status: select('someday') } };
    expect(mapQuestion(missing)!.status).toBe('wondering');
    expect(mapQuestion(bogus)!.status).toBe('wondering');
  });

  it('maps a non-empty LinkSlug', () => {
    const page = { ...questionPage, properties: { ...questionPage.properties, LinkSlug: rich('gonai') } };
    expect(mapQuestion(page)!.linkSlug).toBe('gonai');
  });

  it('falls back to created_time date when Date is empty', () => {
    const page = { ...questionPage, properties: { ...questionPage.properties, Date: { date: null } } };
    expect(mapQuestion(page)!.date).toBe('2026-08-01');
  });

  it('returns null and warns on missing Question title', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const page = { ...questionPage, properties: { ...questionPage.properties, Question: title('') } };
    expect(mapQuestion(page)).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
