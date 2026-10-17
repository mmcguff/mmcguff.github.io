export const SITE_TITLE = 'Matthew McGuff — Engineering Blog';
export const SITE_DESCRIPTION =
  'Notes on data pipelines, RAG, enterprise integration and software architecture from Matthew McGuff, Staff Software Engineer.';

/**
 * Giscus comments, backed by this repo's GitHub Discussions. These IDs are public, not secrets.
 * categoryId comes from https://giscus.app once Discussions is enabled and the category exists.
 */
export const GISCUS = {
  repo: 'mmcguff/mmcguff.github.io',
  repoId: 'R_kgDOBYwOmw',
  category: 'Blog Comments',
  categoryId: 'TODO_FROM_GISCUS_APP',
  mapping: 'pathname',
} as const;
