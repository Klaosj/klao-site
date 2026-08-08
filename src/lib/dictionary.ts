import type { Locale } from './models';

const en = {
  projects: 'Projects',
  writing: 'Writing',
  career: 'Career',
  resume: 'Resume',
  selectedProjects: 'Selected projects',
  latestWriting: 'Latest writing',
  allProjects: 'All projects',
  allPosts: 'All posts',
  now: 'Now',
  fullCareer: 'Full career',
  back: 'Back',
};

const th: typeof en = {
  projects: 'ผลงาน',
  writing: 'บทความ',
  career: 'เส้นทางอาชีพ',
  resume: 'เรซูเม่',
  selectedProjects: 'ผลงานเด่น',
  latestWriting: 'บทความล่าสุด',
  allProjects: 'ผลงานทั้งหมด',
  allPosts: 'บทความทั้งหมด',
  now: 'ตอนนี้',
  fullCareer: 'เส้นทางอาชีพทั้งหมด',
  back: 'กลับ',
};

export type UiDict = typeof en;
export const dict: Record<Locale, UiDict> = { en, th };
