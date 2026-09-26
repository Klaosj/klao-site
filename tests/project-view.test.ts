import { describe, expect, it } from 'vitest';
import { findLineage, hostOf, lineageFor, statusMark, unbreak, washVar } from '@/lib/project-view';
import { AJE, GONAI, LINEUP, TALATIFY, TRIPEDIA, makeProject } from './helpers/lineup';

describe('statusMark', () => {
  it.each([
    ['live', 'live'],
    ['proto', 'proto'],
    ['pitched', 'ring'],
    ['finalist', 'ring'],
    [null, null],
  ] as const)('%s -> %s', (key, mark) => {
    expect(statusMark(key)).toBe(mark);
  });
});

describe('washVar', () => {
  it.each([
    ['aje', 'var(--w-aje)'],
    ['gonai', 'var(--w-gonai)'],
    ['site', 'var(--w-site)'],
    ['none', 'var(--mist)'],
  ] as const)('%s -> %s', (wash, css) => {
    expect(washVar(wash)).toBe(css);
  });
});

describe('unbreak', () => {
  it('removes the | break mark and nothing else', () => {
    expect(unbreak('ทำไมวางแผนทริปเดียว|ต้องใช้ตั้งห้าแอป?')).toBe('ทำไมวางแผนทริปเดียวต้องใช้ตั้งห้าแอป?');
    expect(unbreak('No mark here.')).toBe('No mark here.');
    expect(unbreak('')).toBe('');
  });
});

describe('hostOf', () => {
  it('returns the host only, never a path', () => {
    expect(hostOf('https://gonai-three.vercel.app/plan?x=1')).toBe('gonai-three.vercel.app');
  });

  it('returns null for no URL or a malformed one', () => {
    expect(hostOf(null)).toBeNull();
    expect(hostOf('')).toBeNull();
    expect(hostOf('not a url')).toBeNull();
  });
});

describe('findLineage', () => {
  it('pairs the row whose LineageOf points at another (GoNai <- Tripedia)', () => {
    expect(findLineage(LINEUP)).toEqual({ earlier: TRIPEDIA, later: GONAI });
  });

  it('is null when no row has LineageOf (pre-migration Notion)', () => {
    expect(findLineage(LINEUP.map((p) => ({ ...p, lineageOf: null })))).toBeNull();
  });

  it('is null when LineageOf points at a row that is not in the list (unpublished)', () => {
    expect(findLineage([TALATIFY, AJE, GONAI])).toBeNull();
  });

  it('ignores a row that names itself', () => {
    // D-3: a bare row (no screenshot, no drawing) states that explicitly rather than
    // inheriting P1 makeProject's screenshot default -- irrelevant to this assertion, but
    // keeps every hand-built row in this file honest about what "bare" means here.
    expect(findLineage([makeProject({ id: 'x', name: 'X', lineageOf: 'x', imageSrc: null, media: 'win' })])).toBeNull();
  });
});

describe('lineageFor', () => {
  it('finds the pair from the later end', () => {
    expect(lineageFor(GONAI, LINEUP)).toEqual({ earlier: TRIPEDIA, later: GONAI });
  });

  it('finds the pair from the earlier end', () => {
    expect(lineageFor(TRIPEDIA, LINEUP)).toEqual({ earlier: TRIPEDIA, later: GONAI });
  });

  it('is null for a project outside the pair', () => {
    expect(lineageFor(AJE, LINEUP)).toBeNull();
  });
});
