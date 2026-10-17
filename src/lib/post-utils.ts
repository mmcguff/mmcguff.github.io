interface DatedPost {
  data: { pubDate: Date; draft: boolean };
}

/** Drops drafts unless asked to keep them, then sorts newest first. Never mutates `posts`. */
export function filterAndSortPosts<T extends DatedPost>(posts: readonly T[], { includeDrafts }: { includeDrafts: boolean }): T[] {
  return posts
    .filter((post) => includeDrafts || !post.data.draft)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}
