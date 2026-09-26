import type { Profile } from '@/lib/models';

/** A complete Profile for the White Edition tests, with prototype copy.
 *  Later phases add their new Profile fields here. */
export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    name: 'Suwichak Jarunopratamp (Klao)',
    headline: {
      en: 'Business developer who builds his own tools.',
      th: 'นัก Business Development ที่สร้างเครื่องมือ|ใช้เอง',
    },
    byline: { en: 'Bangkok · BD × Data Analytics', th: 'กรุงเทพฯ · BD × Data Analytics' },
    now: {
      en: 'Senior BD at Actmedia · building AI tools nights & weekends',
      th: 'Senior BD ที่ Actmedia · สร้างเครื่องมือ AI นอกเวลางาน',
    },
    photoSrc: '/images/portrait.jpg',
    linkedin: 'https://linkedin.example/klao',
    github: 'https://github.example/klao',
    email: 'klao@example.com',
    resumeUrl: '/resume.pdf',
    clients: [],
    nameNative: null,
    ...overrides,
  };
}
