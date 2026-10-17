import { describe, expect, it } from 'vitest';
import { filterAndSortPosts } from '../../src/lib/post-utils';

// AC5 (ordering) and AC8 (drafts excluded). Index, post routes and RSS all go through this function.
const post = (id: string, pubDate: string, draft = false) => ({
  id,
  data: { title: id, description: id, pubDate: new Date(pubDate), draft },
});

const entries = [
  post('older', '2026-01-01'),
  post('draft', '2026-06-01', true),
  post('newest', '2026-09-01'),
  post('middle', '2026-03-01'),
];

const ids = (list: { id: string }[]) => list.map((p) => p.id);

describe('filterAndSortPosts', () => {
  it('sorts posts newest first', () => {
    expect(ids(filterAndSortPosts(entries, { includeDrafts: false }))).toEqual(['newest', 'middle', 'older']);
  });

  it('excludes drafts when includeDrafts is false', () => {
    expect(ids(filterAndSortPosts(entries, { includeDrafts: false }))).not.toContain('draft');
  });

  it('keeps drafts when includeDrafts is true', () => {
    expect(ids(filterAndSortPosts(entries, { includeDrafts: true }))).toEqual(['newest', 'draft', 'middle', 'older']);
  });

  it('does not mutate the input array', () => {
    const copy = [...entries];
    filterAndSortPosts(entries, { includeDrafts: false });
    expect(entries).toEqual(copy);
  });

  it('returns an empty list when there are no posts', () => {
    expect(filterAndSortPosts([], { includeDrafts: false })).toEqual([]);
  });
});
