import { getCollection } from 'astro:content';
import { filterAndSortPosts } from './post-utils';

/** Every page that lists or renders posts goes through here, so draft handling stays consistent. Drafts show only in `astro dev`. */
export async function getPublishedPosts() {
  return filterAndSortPosts(await getCollection('blog'), { includeDrafts: !import.meta.env.PROD });
}
