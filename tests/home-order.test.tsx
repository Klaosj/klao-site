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

  it('puts the projects index directly after the signature, with the new index markup', async () => {
    for (const locale of ['en', 'th'] as const) {
      const html = renderToStaticMarkup(await HomePage(params(locale)));
      const signature = html.indexOf('id="signature"');
      const work = html.indexOf('id="work"');
      // No other top-level section sits between them.
      expect(html.slice(signature + 1, work)).not.toContain('<section id="');
      expect(html).toContain('class="pi-cols"');
      expect(html).toMatch(/href="#work\/gonai" data-sheet="gonai"/);
    }
  });

  it('mounts exactly one ProjectSheet dialog on the home page (ProjectsIndex owns it)', async () => {
    // ProjectSheet's module-level `latestTransition` token and its fixed `id="sheet-name"`
    // both assume a single instance per page (Task 9's own comment says so). No project is
    // open in a bare server render, so the heading itself doesn't print (it lives inside the
    // client-only `openKey` branch) -- the dialog shell's `aria-labelledby="sheet-name"` is
    // what's always there, and is the SSR contract Tasks 9/11 pin verbatim. WorkDeck never
    // mounted one, so this was moot before the swap; now that ProjectsIndex does, a second
    // section reintroducing its own sheet would silently break focus-return and the URL sync.
    for (const locale of ['en', 'th'] as const) {
      const html = renderToStaticMarkup(await HomePage(params(locale)));
      const matches = html.match(/aria-labelledby="sheet-name"/g) ?? [];
      expect(matches).toHaveLength(1);
    }
  });
});
