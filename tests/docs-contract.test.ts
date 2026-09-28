import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import story from '@/content/fixtures/story.json';

// docs/NOTION_SETUP.md is what Klao follows when he changes the live CMS.
// A property name misspelled there becomes a property the mappers never
// read — silently. The names below are the master plan's contract C5.
// Profile lists WorkingInEN/TH, not a bare WorkingIn (PR1, 2026-09-28
// preflight refresh N6): it mirrors BasedInEN/TH so Klao can localise it.
const NEW_PROPERTIES: Record<string, string[]> = {
  Projects: ['StatusKey', 'StatusEN', 'StatusTH', 'KickerEN', 'KickerTH', 'Media', 'Wash', 'Tour', 'TourOrder', 'LineageOf', 'AltEN', 'AltTH'],
  Career: ['StartDate', 'EndDate', 'FigureValue', 'FigureLabelEN', 'FigureLabelTH', 'FigureNoteEN', 'FigureNoteTH'],
  Profile: ['PrologueEN', 'PrologueTH', 'ClosingLineEN', 'ClosingLineTH', 'BasedInEN', 'BasedInTH', 'WorkingInEN', 'WorkingInTH'],
  Story: ['TitleEN', 'TitleTH', 'BodyEN', 'BodyTH', 'RuleEN', 'RuleTH', 'Icon', 'Sketch', 'Order', 'Published'],
  FAQ: ['QuestionEN', 'QuestionTH', 'AnswerEN', 'AnswerTH', 'Links', 'Order', 'Published'],
};
const SELECTS: Record<string, string[]> = {
  StatusKey: ['live', 'proto', 'pitched', 'finalist'],
  Media: ['img', 'win', 'notion', 'rings', 'five'],
  Wash: ['aje', 'gonai', 'site', 'none'],
};
// The site refreshes through ISR (about an hour); docs must never promise more.
const BANNED_WORDS = /\binstant(ly)?\b|\bimmediately\b/i;

const guide = readFileSync('docs/NOTION_SETUP.md', 'utf8');

/** The guide's "### <db>" section, up to the next ## or ### heading. */
function section(db: string): string {
  const start = guide.indexOf(`\n### ${db}\n`);
  if (start < 0) return '';
  const rest = guide.slice(start + db.length + 6);
  const end = rest.search(/\n#{2,3} /);
  return end < 0 ? rest : rest.slice(0, end);
}

/** The first table row `| <prop> | … |` inside that section. */
function row(db: string, prop: string): string {
  return section(db).split('\n').find((l) => l.startsWith(`| ${prop} |`)) ?? '';
}

describe('docs/NOTION_SETUP.md', () => {
  it.each(Object.entries(NEW_PROPERTIES))('lists every %s property the mappers read', (db, props) => {
    for (const p of props) expect(row(db, p), `${db}.${p}`).not.toBe('');
  });

  it('names every select option exactly', () => {
    for (const [prop, options] of Object.entries(SELECTS)) {
      for (const o of options) expect(row('Projects', prop), `${prop}: ${o}`).toContain(o);
    }
  });

  it('offers every Icon and Sketch the bundled chapters use', () => {
    for (const c of story as { icon: string; sketch: string }[]) {
      expect(row('Story', 'Icon'), c.icon).toContain(c.icon);
      expect(row('Story', 'Sketch'), c.sketch).toContain(c.sketch);
    }
  });

  it('documents the two new environment variables and the migration checklist', () => {
    expect(guide).toContain('NOTION_DB_STORY');
    expect(guide).toContain('NOTION_DB_FAQ');
    expect(guide).toMatch(/^## 6\. White Edition migration/m);
    expect(guide).toMatch(/in any order/);
  });

  it('never promises instant updates', () => {
    expect(guide).not.toMatch(BANNED_WORDS);
  });
});

const ALL_ENV = [
  'NOTION_TOKEN', 'NOTION_DB_PROJECTS', 'NOTION_DB_POSTS', 'NOTION_DB_CAREER', 'NOTION_DB_PROFILE',
  'NOTION_DB_SKILLS', 'NOTION_DB_QUESTIONS', 'NOTION_DB_STORY', 'NOTION_DB_FAQ',
];

describe('deploy docs, env example and README', () => {
  it('.env.example has a line for every Notion variable', () => {
    const env = readFileSync('.env.example', 'utf8');
    for (const v of ALL_ENV) expect(env, v).toMatch(new RegExp(`^${v}=`, 'm'));
  });

  it('docs/DEPLOY.md lists every Notion variable and promises nothing instant', () => {
    const deploy = readFileSync('docs/DEPLOY.md', 'utf8');
    for (const v of ALL_ENV) expect(deploy, v).toContain(v);
    expect(deploy).not.toMatch(BANNED_WORDS);
  });

  it('README explains the QA matrix and promises nothing instant', () => {
    const readme = readFileSync('README.md', 'utf8');
    expect(readme).toContain('npm run qa');
    expect(readme).not.toMatch(BANNED_WORDS);
  });
});

describe('design/white-edition/README.md', () => {
  it('explains both reference files and how to check the site against them', () => {
    const path = 'design/white-edition/README.md';
    expect(existsSync(path)).toBe(true);
    const text = existsSync(path) ? readFileSync(path, 'utf8') : '';
    for (const s of ['prototype/index.html', 'APPLE-SCALE.md', 'npm run qa']) expect(text, s).toContain(s);
    expect(text).not.toMatch(BANNED_WORDS);
  });
});
