import { z } from 'astro/zod';

/** Frontmatter every blog post must have. Enforced by Astro at build time. */
export const blogSchema = z.object({
  title: z.string(),
  description: z.string(),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  draft: z.boolean().default(false),
  heroImage: z.string().optional(),
});

export type BlogFrontmatter = z.infer<typeof blogSchema>;
