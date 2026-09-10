import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import projects from '@/content/fixtures/projects.json';
import { IMAGE_ALT, imageAlt } from '@/lib/image-alt';
import type { Project } from '@/lib/models';

describe('image alt map', () => {
  it('has a curated, name-free description for every fixture screenshot', () => {
    for (const p of projects as Project[]) {
      if (!p.imageSrc) continue;
      const alt = IMAGE_ALT[p.imageSrc];
      expect(alt, `${p.name} (${p.imageSrc}) has no curated alt`).toBeTruthy();
      expect(alt).not.toContain(p.name);
      expect(alt.length).toBeGreaterThan(30);
    }
  });

  it('points every fixture imageSrc at a file that exists in public/', () => {
    for (const p of projects as Project[]) {
      if (!p.imageSrc) continue;
      expect(existsSync(join('public', p.imageSrc)), `${p.imageSrc} is missing from public/`).toBe(true);
    }
  });

  it('still falls back to the generic sentence for Notion-served images', () => {
    expect(imageAlt('/api/img/page/abc/Screenshot')).toBe('Screenshot of the project interface.');
  });
});
