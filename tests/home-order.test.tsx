import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import HomePage from '@/app/[locale]/page';

const params = (locale: 'en' | 'th') => ({ params: Promise.resolve({ locale }) });

// Contract C7: #top + #tour (HeroTour) -> #signature -> #work -> … Runs on the real fixtures,
// where GoNai's LineageOf names Tripedia, so the signature must render.
describe('home page order (contract C7)', () => {
  it('puts the signature after the hero tour and before the projects, in both locales', async () => {
    for (const locale of ['en', 'th'] as const) {
      const html = renderToStaticMarkup(await HomePage(params(locale)));
      const tour = html.indexOf('id="tour"');
      const signature = html.indexOf('id="signature"');
      const work = html.indexOf('id="work"');
      expect(tour).toBeGreaterThan(-1);
      expect(signature).toBeGreaterThan(tour);
      expect(work).toBeGreaterThan(signature);
    }
  });
});
