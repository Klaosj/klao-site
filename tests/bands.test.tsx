import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import HomePage from '@/app/[locale]/page';
import type { Locale } from '@/lib/models';

// The page's argument is its order (C7): what he shipped (#work), where he
// has worked (#career), then how he works (#story). The retired dark bands
// must be gone, and the toolbox anchor must exist exactly once (the old
// SkillsBand used the same id).
describe('home page sections (C7 order)', () => {
  for (const locale of ['en', 'th'] as Locale[]) {
    it(`orders work → career → story on /${locale} and drops the retired bands`, async () => {
      const html = renderToStaticMarkup(await HomePage({ params: Promise.resolve({ locale }) }));
      const at = (id: string) => html.indexOf(`id="${id}"`);
      expect(at('work')).toBeGreaterThan(-1);
      expect(at('career')).toBeGreaterThan(at('work'));
      expect(at('story')).toBeGreaterThan(at('career'));
      expect(html.match(/id="toolbox"/g)).toHaveLength(1);
      for (const retired of ['about', 'craft', 'cv']) expect(at(retired)).toBe(-1);
    });
  }
});
