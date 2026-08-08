import { describe, it, expect } from 'vitest';
import { assertLocale } from '@/lib/locale';
import { LOCALES } from '@/lib/models';

describe('assertLocale', () => {
  it('returns each supported locale unchanged', () => {
    for (const locale of LOCALES) {
      expect(assertLocale(locale)).toBe(locale);
    }
  });

  it('404s (via next/navigation notFound) on an unrecognized value, instead of silently coercing to "en"', () => {
    // This is the exact class of bug the final-fix-report's finding #1
    // traces: a single-segment dotted path like `/favicon.ico` falls
    // through middleware into `[locale]`, and the old
    // `locale === 'th' ? 'th' : 'en'` coercion would have silently
    // rendered it as English instead of 404ing.
    for (const bogus of ['favicon.ico', 'apple-touch-icon.png', 'xx', '', 'EN']) {
      let thrown: unknown;
      try {
        assertLocale(bogus);
      } catch (e) {
        thrown = e;
      }
      expect(thrown, `expected assertLocale(${JSON.stringify(bogus)}) to throw`).toBeInstanceOf(Error);
      // next/navigation's notFound() throws an Error whose `.digest` encodes
      // the 404 fallback -- asserting that specifically (not just "it
      // threw") pins that this goes through notFound(), not some unrelated
      // error.
      expect((thrown as Error & { digest?: string }).digest).toContain('404');
    }
  });
});
