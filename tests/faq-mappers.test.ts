import { describe, expect, it, vi } from 'vitest';
import { mapFaqItem, mapProfile, parseFaqLinks } from '@/lib/notion-mappers';

const title = (s: string) => ({ title: s ? [{ plain_text: s }] : [] });
const rich = (s: string) => ({ rich_text: s ? [{ plain_text: s }] : [] });

const faqPage = {
  id: 'faq-row-1',
  properties: {
    QuestionEN: title('Has he run a business?'),
    QuestionTH: rich('เคยทำธุรกิจเองไหม?'),
    AnswerEN: rich('He founded A Bun Dance.'),
    AnswerTH: rich('เคยก่อตั้งร้าน A Bun Dance'),
    Links: rich('Career · A Bun Dance|Career · A Bun Dance|career:abundance\nProjects|โปรเจกต์|work'),
    Order: { number: 3 },
    Published: { checkbox: true },
  },
};

describe('mapFaqItem', () => {
  it('maps a full row', () => {
    expect(mapFaqItem(faqPage)).toEqual({
      id: 'faq-row-1',
      question: { en: 'Has he run a business?', th: 'เคยทำธุรกิจเองไหม?' },
      answer: { en: 'He founded A Bun Dance.', th: 'เคยก่อตั้งร้าน A Bun Dance' },
      links: [
        { label: { en: 'Career · A Bun Dance', th: 'Career · A Bun Dance' }, target: 'career:abundance' },
        { label: { en: 'Projects', th: 'โปรเจกต์' }, target: 'work' },
      ],
      order: 3,
    });
  });

  it('maps a minimal row (QuestionEN + AnswerEN only) with TH fallback, no links, order 0', () => {
    // Review Focus #1: a row Klao has only half filled in must still render.
    const minimal = {
      id: 'faq-row-2',
      properties: { QuestionEN: title('How do I reach him?'), AnswerEN: rich('Email him.') },
    };
    expect(mapFaqItem(minimal)).toEqual({
      id: 'faq-row-2',
      question: { en: 'How do I reach him?', th: 'How do I reach him?' },
      answer: { en: 'Email him.', th: 'Email him.' },
      links: [],
      order: 0,
    });
  });

  it('skips, with a warning, a row that has no question or no answer', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(mapFaqItem({ ...faqPage, properties: { ...faqPage.properties, QuestionEN: title('') } })).toBeNull();
    expect(mapFaqItem({ ...faqPage, properties: { ...faqPage.properties, AnswerEN: rich('') } })).toBeNull();
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});

describe('parseFaqLinks', () => {
  it('reads LabelEN|LabelTH|target lines and tolerates spaces around the pipes', () => {
    expect(parseFaqLinks('Toolbox · Languages | Toolbox · ภาษา | toolbox')).toEqual([
      { label: { en: 'Toolbox · Languages', th: 'Toolbox · ภาษา' }, target: 'toolbox' },
    ]);
  });

  it('reads a two-part Label|target line (spec §7 wording) as one label for both languages', () => {
    expect(parseFaqLinks('Contact|contact')).toEqual([{ label: { en: 'Contact', th: 'Contact' }, target: 'contact' }]);
  });

  it('skips malformed lines one by one instead of dropping the whole row', () => {
    const raw = [
      'Contact|ติดต่อ|contact',
      'no pipes at all',
      'a|b|c|d',
      '|ป้าย|work',
      'Label|ป้าย|',
      'Label|ป้าย|javascript:alert(1)',
      'Label|ป้าย|http://insecure.test',
      'Label|ป้าย|work/GoNai',
      '',
      'Toolbox|กล่องเครื่องมือ|toolbox',
    ].join('\n');
    expect(parseFaqLinks(raw)).toEqual([
      { label: { en: 'Contact', th: 'ติดต่อ' }, target: 'contact' },
      { label: { en: 'Toolbox', th: 'กล่องเครื่องมือ' }, target: 'toolbox' },
    ]);
  });

  it('returns [] for an empty Links property', () => {
    expect(parseFaqLinks('')).toEqual([]);
  });
});

describe('mapProfile · BasedIn / WorkingIn', () => {
  const base = { id: 'pr1', properties: { Name: title('Suwichak Jarunopratamp (Klao)') } };

  it('maps both to null on a Profile row that predates them (Review Focus #1)', () => {
    const p = mapProfile(base)!;
    expect(p.basedIn).toBeNull();
    expect(p.workingIn).toBeNull();
  });

  it('maps BasedInEN/TH and WorkingIn', () => {
    const p = mapProfile({
      ...base,
      properties: {
        ...base.properties,
        BasedInEN: rich('Bangkok, TH'),
        BasedInTH: rich('กรุงเทพฯ'),
        WorkingIn: rich('TH / EN'),
      },
    })!;
    expect(p.basedIn).toEqual({ en: 'Bangkok, TH', th: 'กรุงเทพฯ' });
    expect(p.workingIn).toBe('TH / EN');
  });

  it('falls back TH -> EN for BasedIn', () => {
    const p = mapProfile({ ...base, properties: { ...base.properties, BasedInEN: rich('Bangkok, TH') } })!;
    expect(p.basedIn).toEqual({ en: 'Bangkok, TH', th: 'Bangkok, TH' });
  });
});
