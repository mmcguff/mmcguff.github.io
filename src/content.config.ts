import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';
import { blogSchema } from './content/schema';

const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/blog' }),
  schema: blogSchema,
});

export const collections = { blog };
