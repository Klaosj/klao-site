import { describe, expect, it } from 'vitest';
import { parseSheetHash, projectKey, sheetHash } from '@/lib/sheet-url';

describe('projectKey', () => {
  it('uses the story slug when the project has one', () => {
    expect(projectKey({ slug: 'building-gonai', name: 'GoNai' })).toBe('building-gonai');
  });

  it('falls back to the slugged name, so every project has a sheet key', () => {
    expect(projectKey({ slug: null, name: 'GoNai' })).toBe('gonai');
    expect(projectKey({ slug: null, name: 'klao-site' })).toBe('klao-site');
    expect(projectKey({ slug: null, name: 'Talatify' })).toBe('talatify');
  });
});

describe('sheetHash', () => {
  it('addresses a sheet under #work/', () => {
    expect(sheetHash('gonai')).toBe('#work/gonai');
  });
});

describe('parseSheetHash (Review Focus #3)', () => {
  it.each([
    ['#work/gonai', 'gonai'],
    ['#work/klao-site', 'klao-site'],
    ['#work/a1-b2', 'a1-b2'],
    // Well-formed but unknown: parsing succeeds, and ProjectSheet is what finds no project
    // for it and opens nothing (tests/project-sheet.test.tsx).
    ['#work/unknown', 'unknown'],
  ])('reads %s as %s', (hash, key) => {
    expect(parseSheetHash(hash)).toBe(key);
  });

  it.each([
    '',
    '#',
    '#work',
    '#work/',
    '#work/GoNai',
    '#work/gonai/',
    '#work/gonai/extra',
    '#work/gonai?x=1',
    '#work/go nai',
    '#work/ก',
    'work/gonai',
    '#career',
  ])('rejects %j', (hash) => {
    expect(parseSheetHash(hash)).toBeNull();
  });

  it('round-trips every key sheetHash makes', () => {
    for (const key of ['gonai', 'klao-site', 'aje', 'talatify', 'tripedia']) {
      expect(parseSheetHash(sheetHash(key))).toBe(key);
    }
  });
});
