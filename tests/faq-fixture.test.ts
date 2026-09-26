import { describe, expect, it } from 'vitest';
import careerFixture from '@/content/fixtures/career.json';
import faqFixture from '@/content/fixtures/faq.json';
import projectsFixture from '@/content/fixtures/projects.json';
import { parseTarget } from '@/lib/link-target';
import type { FaqItem, Project } from '@/lib/models';
import { mapFaqItem } from '@/lib/notion-mappers';
import { projectKey } from '@/lib/sheet-url';

const items = faqFixture as FaqItem[];
const rich = (s: string) => ({ rich_text: s ? [{ plain_text: s }] : [] });

describe('faq.json (two-layer rule: Notion + fixtures)', () => {
  it('carries the five approved prototype questions, in order', () => {
    expect(items.map((i) => i.question.en)).toEqual([
      'What does Klao do day to day?',
      'Does he actually build the apps himself?',
      'Has he run a business?',
      'Which languages does he work in?',
      'How do I reach him?',
    ]);
    expect(items.map((i) => i.order)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });

  it('keeps "What work is he open to?" out until Klao writes the answer (spec §3, 25 Sep)', () => {
    expect(JSON.stringify(faqFixture)).not.toMatch(/open to\?/i);
  });

  it('is exactly what the mapper makes of the same Notion row', () => {
    for (const item of items) {
      const page = {
        id: item.id,
        properties: {
          QuestionEN: { title: [{ plain_text: item.question.en }] },
          QuestionTH: rich(item.question.th),
          AnswerEN: rich(item.answer.en),
          AnswerTH: rich(item.answer.th),
          Links: rich(item.links.map((l) => `${l.label.en}|${l.label.th}|${l.target}`).join('\n')),
          Order: { number: item.order },
          Published: { checkbox: true },
        },
      };
      expect(mapFaqItem(page), item.id).toEqual(item);
    }
  });

  it('points every link at something the fixtures actually have', () => {
    // Merge note (lane l3, P4 Task 4): CareerEntry.key is P3's field
    // (lane l2, `key: slugKey(company)`, master plan P3 line ~230) and has
    // not landed in this worktree yet -- career.json here still has no
    // `key` property. Until P3 merges, check the FAQ's career targets
    // against the companies they're meant to name (per preflight.md row
    // P3-b's pinned key list: actmedia, casetify, mmb-technology,
    // vela-central-world, a-bun-dance) instead of a stored `key`. Once
    // P3's CareerEntry.key lands, swap this back to
    // `new Set((careerFixture as CareerEntry[]).map((c) => c.key))`.
    const companyByCareerKey: Record<string, string> = {
      actmedia: 'Actmedia',
      'a-bun-dance': 'A Bun Dance (Craft Burger)',
    };
    const careerCompanies = new Set((careerFixture as { company: string }[]).map((c) => c.company));
    const projectKeys = new Set((projectsFixture as Project[]).map((p) => projectKey(p)));
    for (const item of items) {
      for (const link of item.links) {
        const t = parseTarget(link.target);
        expect(t, link.target).not.toBeNull();
        if (t?.kind === 'career') {
          const company = companyByCareerKey[t.key];
          expect(company, `career key "${t.key}" has no known company mapping`).toBeDefined();
          expect(careerCompanies.has(company), `career company "${company}"`).toBe(true);
        }
        if (t?.kind === 'sheet') expect(projectKeys.has(t.key), `project key "${t.key}"`).toBe(true);
      }
    }
  });
});
