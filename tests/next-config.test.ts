import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config';

describe('next.config redirects', () => {
  it('sends the retired /career route to the career band anchor (C7)', async () => {
    const redirects = await nextConfig.redirects!();
    expect(redirects).toContainEqual({
      source: '/:locale(en|th)/career',
      destination: '/:locale#career',
      permanent: false,
    });
  });
});
