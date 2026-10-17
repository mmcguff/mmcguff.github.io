import { describe, expect, it } from 'vitest';
import { GISCUS, SITE_DESCRIPTION, SITE_TITLE } from '../../src/consts';

describe('site constants', () => {
  it('defines a site title and description for the blog and RSS feed', () => {
    expect(SITE_TITLE.trim()).not.toBe('');
    expect(SITE_DESCRIPTION.trim()).not.toBe('');
  });
});

// AC10: Giscus is wired to this repo's Discussions, one thread per post path.
describe('GISCUS config', () => {
  it('points at this repository', () => {
    expect(GISCUS.repo).toBe('mmcguff/mmcguff.github.io');
  });

  it('maps discussions by pathname', () => {
    expect(GISCUS.mapping).toBe('pathname');
  });

  it('names a Discussions category', () => {
    expect(GISCUS.category.trim()).not.toBe('');
  });

  // These fail until real IDs from https://giscus.app are filled in (Discussions must be enabled first).
  it('has a real repo id from giscus.app', () => {
    expect(GISCUS.repoId).toMatch(/^R_[A-Za-z0-9_-]+$/);
  });

  it('has a real category id from giscus.app', () => {
    expect(GISCUS.categoryId).toMatch(/^DIC_[A-Za-z0-9_-]+$/);
  });
});
