import { describe, it, expect, vi } from 'vitest';
import { mapProject, mapCareerEntry, mapProfile, mapSkill, mapQuestion, mapStoryChapter } from '@/lib/notion-mappers';
import { slugKey } from '@/lib/format';

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

  it('maps Type select Business to type business', () => {
    const page = { ...projectPage, properties: { ...projectPage.properties, Type: select('Business') } };
    expect(mapProject(page)!.type).toBe('business');
  });

  it('defaults type to build when Type is missing, blank, or unrecognised', () => {
    // Missing entirely (projectPage has no Type property at all):
    expect(mapProject(projectPage)!.type).toBe('build');
    // Present but empty:
    const blank = { ...projectPage, properties: { ...projectPage.properties, Type: select(null) } };
    expect(mapProject(blank)!.type).toBe('build');
    // Present but an unknown option — never a dropped row:
    const junk = { ...projectPage, properties: { ...projectPage.properties, Type: select('Startup') } };
    expect(mapProject(junk)!.type).toBe('build');
  });

  it('maps OutcomeEN/TH with th -> en fallback', () => {
    const page = {
      ...projectPage,
      properties: {
        ...projectPage.properties,
        OutcomeEN: rich('Validated with 3 paying pilots'),
        OutcomeTH: rich(''),
      },
    };
    expect(mapProject(page)!.outcome).toEqual({
      en: 'Validated with 3 paying pilots',
      th: 'Validated with 3 paying pilots',
    });
  });

  it('maps a row without Outcome to null (not dropped)', () => {
    const p = mapProject(projectPage);
    expect(p).not.toBeNull();
    expect(p!.outcome).toBeNull();
  });
});

const numberProp = (n: number | null) => ({ number: n });
const checkboxProp = (b: boolean) => ({ checkbox: b });
const relationProp = (...ids: string[]) => ({ relation: ids.map((id) => ({ id })), has_more: false });

describe('mapProject — White Edition fields (C5)', () => {
  const fullRow = {
    id: 'gonai-id',
    properties: {
      ...projectPage.properties,
      StatusKey: select('live'),
      StatusEN: rich('Live · since Aug 2026'),
      StatusTH: rich('เปิดใช้งานแล้ว · ตั้งแต่ ส.ค. 2026'),
      KickerEN: rich('Build · Live'),
      KickerTH: rich('สร้างเอง · เปิดใช้งานแล้ว'),
      Media: select('win'),
      Wash: select('gonai'),
      Tour: checkboxProp(true),
      TourOrder: numberProp(2),
      LineageOf: relationProp('tripedia-id'),
      AltEN: rich('GoNai home screen.'),
      AltTH: rich('หน้าแรกของ GoNai'),
      OutcomeEN: rich('Live since Aug 2026\nNotion as the only CMS'),
      OutcomeTH: rich('ออนไลน์ตั้งแต่ ส.ค. 2026\nNotion เป็น CMS เดียว'),
    },
  };

  it('maps a full row', () => {
    expect(mapProject(fullRow)).toMatchObject({
      statusKey: 'live',
      status: { en: 'Live · since Aug 2026', th: 'เปิดใช้งานแล้ว · ตั้งแต่ ส.ค. 2026' },
      kicker: { en: 'Build · Live', th: 'สร้างเอง · เปิดใช้งานแล้ว' },
      media: 'win',
      wash: 'gonai',
      tour: true,
      tourOrder: 2,
      lineageOf: 'tripedia-id',
      alt: { en: 'GoNai home screen.', th: 'หน้าแรกของ GoNai' },
      outcomes: {
        en: ['Live since Aug 2026', 'Notion as the only CMS'],
        th: ['ออนไลน์ตั้งแต่ ส.ค. 2026', 'Notion เป็น CMS เดียว'],
      },
    });
  });

  it('keeps a pre-migration row (old properties only) on the page, every new field at its default (Review Focus #1)', () => {
    const p = mapProject(projectPage); // has a Screenshot, none of the new properties
    expect(p).not.toBeNull();
    expect(p).toMatchObject({
      statusKey: null,
      status: null,
      kicker: null,
      media: 'img',
      wash: 'none',
      tour: false,
      tourOrder: null,
      lineageOf: null,
      alt: null,
      outcomes: { en: [], th: [] },
    });
  });

  it("defaults media to 'win' on a pre-migration row without a screenshot", () => {
    const page = { ...projectPage, properties: { ...projectPage.properties, Screenshot: { files: [] } } };
    expect(mapProject(page)!.media).toBe('win');
  });

  it('falls back to the default for an unknown select option, never passing it through or dropping the row', () => {
    const page = {
      ...projectPage,
      properties: { ...projectPage.properties, StatusKey: select('shipped'), Media: select('video'), Wash: select('purple') },
    };
    const p = mapProject(page)!;
    expect(p.statusKey).toBeNull();
    expect(p.media).toBe('img');
    expect(p.wash).toBe('none');
  });

  it('takes the first related page as the lineage, and an empty relation as none', () => {
    const two = { ...projectPage, properties: { ...projectPage.properties, LineageOf: relationProp('first', 'second') } };
    expect(mapProject(two)!.lineageOf).toBe('first');
    const none = { ...projectPage, properties: { ...projectPage.properties, LineageOf: relationProp() } };
    expect(mapProject(none)!.lineageOf).toBeNull();
  });

  it('keeps TourOrder 0 as a real position and a blank number as null', () => {
    const zero = { ...projectPage, properties: { ...projectPage.properties, TourOrder: numberProp(0) } };
    expect(mapProject(zero)!.tourOrder).toBe(0);
    const blank = { ...projectPage, properties: { ...projectPage.properties, TourOrder: numberProp(null) } };
    expect(mapProject(blank)!.tourOrder).toBeNull();
  });

  it('splits outcomes one per line, skips blank lines, and falls back th -> en per list', () => {
    const page = {
      ...projectPage,
      properties: { ...projectPage.properties, OutcomeEN: rich('One\n\n  Two  \n'), OutcomeTH: rich('') },
    };
    expect(mapProject(page)!.outcomes).toEqual({ en: ['One', 'Two'], th: ['One', 'Two'] });
  });

  it('keeps the old single-string outcome for the pages that still read it', () => {
    expect(mapProject(fullRow)!.outcome).toEqual({
      en: 'Live since Aug 2026\nNotion as the only CMS',
      th: 'ออนไลน์ตั้งแต่ ส.ค. 2026\nNotion เป็น CMS เดียว',
    });
  });

  it('leaves status, kicker and alt null when only the Thai half is filled (EN is the gate, as for Question)', () => {
    const page = {
      ...projectPage,
      properties: { ...projectPage.properties, StatusTH: rich('ไทยอย่างเดียว'), KickerTH: rich('ไทย'), AltTH: rich('ไทย') },
    };
    const p = mapProject(page)!;
    expect(p.status).toBeNull();
    expect(p.kicker).toBeNull();
    expect(p.alt).toBeNull();
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
      // White Edition P3: this page has none of the new properties -- it
      // stands for the live Career DB before migration, which must still map.
      key: 'actmedia',
      start: null,
      end: null,
      figure: null,
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

describe('mapCareerEntry — White Edition fields (P3)', () => {
  const full = {
    id: 'c2',
    properties: {
      Role: title('Brand Representative'),
      RoleTH: rich('ตัวแทนแบรนด์'),
      Company: rich('Casetify'),
      Period: rich('MAY 2024 – MAR 2026'),
      StartDate: { date: { start: '2024-05-01', end: null } },
      // Notion's "Include time" toggle yields a timestamp; only the month matters.
      EndDate: { date: { start: '2026-03-31T18:00:00.000+07:00', end: null } },
      FigureValue: rich('THB 1.1M'),
      FigureLabelEN: rich('My personal monthly sales target'),
      FigureLabelTH: rich('เป้ายอดขายส่วนตัวต่อเดือน'),
      FigureNoteEN: rich('Target met'),
      FigureNoteTH: rich('ทำถึงเป้า'),
      WinsEN: rich('Ran the store on shift'),
      WinsTH: rich(''),
      Order: { number: 2 },
    },
  };

  it('maps a full row: slug key, YYYY-MM dates, figure with label and note', () => {
    expect(mapCareerEntry(full)).toMatchObject({
      key: 'casetify',
      start: '2024-05',
      end: '2026-03',
      figure: {
        value: 'THB 1.1M',
        label: { en: 'My personal monthly sales target', th: 'เป้ายอดขายส่วนตัวต่อเดือน' },
        note: { en: 'Target met', th: 'ทำถึงเป้า' },
      },
    });
  });

  it('derives the key from the company with slugKey (FAQ links use career:<key>)', () => {
    const page = { ...full, properties: { ...full.properties, Company: rich('A Bun Dance') } };
    expect(mapCareerEntry(page)!.key).toBe(slugKey('A Bun Dance'));
  });

  it('maps a pre-migration row (no StartDate/EndDate/Figure*) to null dates and no figure', () => {
    // `careerPage` (above) carries only the properties the Career DB had
    // before the White Edition -- it must map, not skip (master Review Focus #1).
    expect(mapCareerEntry(careerPage)).toMatchObject({ key: 'actmedia', start: null, end: null, figure: null });
  });

  it('treats an empty or malformed date as absent', () => {
    const page = {
      ...full,
      properties: { ...full.properties, StartDate: { date: null }, EndDate: { date: { start: '26-3' } } },
    };
    expect(mapCareerEntry(page)).toMatchObject({ start: null, end: null });
  });

  it('has no figure when FigureValue is empty, even if its labels are filled', () => {
    const page = { ...full, properties: { ...full.properties, FigureValue: rich('') } };
    expect(mapCareerEntry(page)!.figure).toBeNull();
  });

  it('keeps the figure without a note when FigureNoteEN is empty; the label falls back th -> en', () => {
    const page = { ...full, properties: { ...full.properties, FigureNoteEN: rich(''), FigureLabelTH: rich('') } };
    expect(mapCareerEntry(page)!.figure).toEqual({
      value: 'THB 1.1M',
      label: { en: 'My personal monthly sales target', th: 'My personal monthly sales target' },
      note: null,
    });
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
      prologue: null,
      closingLine: null,
      basedIn: null,
      workingIn: null,
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

  it('maps PrologueEN/TH and ClosingLineEN/TH, TH falling back to EN', () => {
    const page = {
      ...profilePage,
      properties: {
        ...profilePage.properties,
        PrologueEN: rich('I started on the owner side. **Now I build my own tools.**'),
        PrologueTH: rich(''),
        ClosingLineEN: rich('Business developer who builds his own tools.'),
        ClosingLineTH: rich('นัก Business Development ที่สร้างเครื่องมือ|ใช้เอง'),
      },
    };
    const p = mapProfile(page)!;
    expect(p.prologue).toEqual({
      en: 'I started on the owner side. **Now I build my own tools.**',
      th: 'I started on the owner side. **Now I build my own tools.**',
    });
    expect(p.closingLine).toEqual({
      en: 'Business developer who builds his own tools.',
      th: 'นัก Business Development ที่สร้างเครื่องมือ|ใช้เอง',
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

const storyPage = {
  id: 'st1',
  properties: {
    TitleEN: title('Find the room.'),
    TitleTH: rich('หาห้องที่ใช่'),
    BodyEN: rich('I scope first, and **the NDA comes before any data changes hands.**'),
    BodyTH: rich(''),
    RuleEN: rich('Scope it honestly.'),
    RuleTH: rich('ประเมินตามจริง'),
    Icon: select('target-duotone'),
    Sketch: select('room'),
    Order: { number: 1 },
    Published: { checkbox: true },
  },
};

describe('mapStoryChapter', () => {
  it('maps a full row, TH falling back to EN', () => {
    expect(mapStoryChapter(storyPage)).toEqual({
      id: 'st1',
      title: { en: 'Find the room.', th: 'หาห้องที่ใช่' },
      body: {
        en: 'I scope first, and **the NDA comes before any data changes hands.**',
        th: 'I scope first, and **the NDA comes before any data changes hands.**',
      },
      rule: { en: 'Scope it honestly.', th: 'ประเมินตามจริง' },
      icon: 'target-duotone',
      sketch: 'room',
      order: 1,
    });
  });

  it('maps a row with only a title to empty defaults instead of dropping it', () => {
    expect(mapStoryChapter({ id: 'st2', properties: { TitleEN: title('Know the week it slips.') } })).toEqual({
      id: 'st2',
      title: { en: 'Know the week it slips.', th: 'Know the week it slips.' },
      body: { en: '', th: '' },
      rule: { en: '', th: '' },
      icon: '',
      sketch: '',
      order: 0,
    });
  });

  it('returns null and warns when TitleEN is missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const page = { ...storyPage, properties: { ...storyPage.properties, TitleEN: title('') } };
    expect(mapStoryChapter(page)).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
