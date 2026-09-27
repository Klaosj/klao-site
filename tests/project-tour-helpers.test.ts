import { describe, expect, it } from 'vitest';
import projectsFixture from '@/content/fixtures/projects.json';
import { IMAGE_ALT } from '@/lib/image-alt';
import type { Project } from '@/lib/models';
import {
  TH_DWELL_FACTOR,
  TOUR_DWELL_MS,
  toTourSlides,
  tourDwellMs,
  tourKicker,
  tourProjects,
  windowTitle,
} from '@/lib/project-tour';
import { makeProject } from './helpers/project';

const aje = makeProject({
  id: 'aje',
  name: 'Aje',
  order: 3,
  tour: true,
  tourOrder: 1,
  media: 'img',
  wash: 'aje',
  kicker: { en: 'Build · Working prototype', th: 'สร้างเอง · Prototype ใช้งานได้' },
  question: { en: 'Is this idea worth a weekend, or a year?', th: 'ไอเดียนี้คุ้มกับหนึ่งสุดสัปดาห์ หรือทั้งปี?' },
});
const gonai = makeProject({
  id: 'gonai',
  name: 'GoNai',
  order: 4,
  tour: true,
  tourOrder: 2,
  media: 'win',
  wash: 'gonai',
  liveUrl: 'https://gonai-three.vercel.app',
  kicker: { en: 'Build · Live', th: 'สร้างเอง · เปิดใช้งานแล้ว' },
});
const site = makeProject({
  id: 'site',
  name: 'klao-site',
  order: 5,
  tour: true,
  tourOrder: 3,
  media: 'notion',
  wash: 'site',
  imageSrc: null,
  liveUrl: 'https://klao-site.vercel.app',
  kicker: { en: 'Build · This site', th: 'สร้างเอง · เว็บนี้เอง' },
});
const talatify = makeProject({ id: 'talatify', name: 'Talatify', order: 1, type: 'business', media: 'rings', imageSrc: null });

describe('tourProjects', () => {
  it('plays the Tour-ticked projects in TourOrder, whatever their page order, without mutating the input', () => {
    const input = [site, talatify, gonai, aje];
    const snapshot = [...input];
    expect(tourProjects(input).map((p) => p.name)).toEqual(['Aje', 'GoNai', 'klao-site']);
    expect(input).toEqual(snapshot);
  });

  it('puts a ticked project without a TourOrder after the numbered ones', () => {
    const late = makeProject({ id: 'late', name: 'Late', order: 0, tour: true, tourOrder: null });
    expect(tourProjects([late, gonai, aje]).map((p) => p.name)).toEqual(['Aje', 'GoNai', 'Late']);
  });

  it('skips a ticked project with nothing to show (no screenshot, not the Notion vignette)', () => {
    const blank = makeProject({ id: 'blank', name: 'Blank', tour: true, tourOrder: 0, media: 'win', imageSrc: null });
    expect(tourProjects([blank, aje]).map((p) => p.name)).toEqual(['Aje']);
  });

  it('before Notion has the Tour checkbox, falls back to the old rule: every project with a screenshot, by page order (Review Focus #1)', () => {
    const pre = [
      makeProject({ id: 'b', name: 'B', order: 2 }),
      makeProject({ id: 'none', name: 'None', order: 0, imageSrc: null, media: 'win' }),
      makeProject({ id: 'a', name: 'A', order: 1 }),
    ];
    expect(tourProjects(pre).map((p) => p.name)).toEqual(['A', 'B']);
  });

  it('returns an empty list when nothing can be shown', () => {
    expect(tourProjects([talatify])).toEqual([]);
    expect(tourProjects([])).toEqual([]);
  });

  it('plays Aje → GoNai → klao-site from the real fixtures', () => {
    expect(tourProjects(projectsFixture as Project[]).map((p) => p.name)).toEqual(['Aje', 'GoNai', 'klao-site']);
  });
});

describe('tourKicker', () => {
  it('reproduces the prototype subtitles: name, the kicker minus its chapter, and the host of a live window', () => {
    expect(tourKicker(aje, 'en')).toBe('Aje · Working prototype');
    expect(tourKicker(gonai, 'en')).toBe('GoNai · Live · gonai-three.vercel.app');
    expect(tourKicker(site, 'en')).toBe('klao-site · This site');
    expect(tourKicker(aje, 'th')).toBe('Aje · Prototype ใช้งานได้');
    expect(tourKicker(gonai, 'th')).toBe('GoNai · เปิดใช้งานแล้ว · gonai-three.vercel.app');
    expect(tourKicker(site, 'th')).toBe('klao-site · เว็บนี้เอง');
  });

  it('keeps a one-part kicker whole', () => {
    expect(tourKicker({ ...aje, kicker: { en: 'Prototype', th: 'ต้นแบบ' } }, 'en')).toBe('Aje · Prototype');
  });

  it('falls back to the status, then to the bare name, on a pre-migration row', () => {
    expect(tourKicker({ ...aje, kicker: null, status: { en: 'Working prototype', th: 'Prototype ใช้งานได้' } }, 'en')).toBe(
      'Aje · Working prototype',
    );
    expect(tourKicker({ ...aje, kicker: null, status: null }, 'en')).toBe('Aje');
  });
});

describe('tourDwellMs', () => {
  it('uses the prototype dwell per kind of frame and gives Thai 10 % longer', () => {
    expect(TOUR_DWELL_MS).toEqual({ img: 6000, win: 5500, notion: 7000 });
    expect(TH_DWELL_FACTOR).toBe(1.1);
    expect(tourDwellMs(aje, 'en')).toBe(6000);
    expect(tourDwellMs(gonai, 'en')).toBe(5500);
    expect(tourDwellMs(site, 'en')).toBe(7000);
    expect(tourDwellMs(aje, 'th')).toBe(6600);
    expect(tourDwellMs(gonai, 'th')).toBe(6050);
    expect(tourDwellMs(site, 'th')).toBe(7700);
  });
});

describe('toTourSlides', () => {
  it('turns the tour projects into plain, serialisable slides for the client stage', () => {
    const slides = toTourSlides([talatify, site, gonai, aje], 'en');
    expect(slides.map((s) => s.id)).toEqual(['aje', 'gonai', 'site']);
    expect(slides[0]).toEqual({
      id: 'aje',
      name: 'Aje',
      kicker: 'Aje · Working prototype',
      question: 'Is this idea worth a weekend, or a year?',
      href: '#work/aje',
      media: 'img',
      src: '/api/img/page/aje/Screenshot',
      alt: IMAGE_ALT['/images/aje.jpg'],
      wash: 'aje',
      dwellMs: 6000,
    });
    expect(slides[1].media).toBe('img'); // a 'win' project is a plain card in the tour
    expect(slides[2]).toMatchObject({ media: 'notion', src: null, wash: 'site', dwellMs: 7000 });
  });

  it("prefers the project's own alt text, in the page's language", () => {
    const withAlt = { ...aje, alt: { en: 'Aje review screen.', th: 'หน้า Review ของ Aje' } };
    expect(toTourSlides([withAlt], 'th')[0].alt).toBe('หน้า Review ของ Aje');
  });

  it('captions with the question, or the description when a project has none', () => {
    expect(toTourSlides([{ ...gonai, question: null }], 'th')[0].question).toBe(gonai.description.th);
  });

  it('shows the Notion vignette for a media=notion project even when Notion also holds a screenshot for it', () => {
    const live = { ...site, imageSrc: '/api/img/page/site/Screenshot' };
    expect(toTourSlides([live], 'en')[0]).toMatchObject({ media: 'notion', src: null });
  });
});

describe('windowTitle', () => {
  it('uses the live URL host when there is one', () => {
    expect(windowTitle(makeProject({ id: 'g', name: 'GoNai', liveUrl: 'https://gonai-three.vercel.app/en?x=1' }))).toBe(
      'gonai-three.vercel.app',
    );
  });

  it('falls back to the project name without a live URL, or with an unparseable one', () => {
    expect(windowTitle(makeProject({ id: 'a', name: 'Aje' }))).toBe('Aje');
    expect(windowTitle(makeProject({ id: 'b', name: 'Broken', liveUrl: 'not a url' }))).toBe('Broken');
  });
});
