import { describe, expect, it } from 'vitest';
import config from '../../astro.config.mjs';

// #24: canonical, RSS and sitemap URLs all derive from `site`.
describe('Astro config', () => {
  it('serves the site from the devguff.com apex', () => {
    expect(config.site).toBe('https://devguff.com');
  });
});
