export const SITE_TITLE = 'Matthew McGuff — Engineering Blog';
export const SITE_DESCRIPTION =
  'Notes on data pipelines, RAG, enterprise integration and software architecture from Matthew McGuff, Staff Software Engineer.';

/**
 * Giscus comments, backed by this repo's GitHub Discussions. These IDs are public, not secrets.
 * Values from https://giscus.app (or the GitHub GraphQL API with the X-Github-Next-Global-ID header).
 */
export const GISCUS = {
  repo: 'mmcguff/mmcguff.github.io',
  repoId: 'R_kgDOBYwOmw',
  category: 'Announcements',
  categoryId: 'DIC_kwDOBYwOm84DIsDB',
  mapping: 'pathname',
} as const;
