import { describe, expect, it } from 'vitest';
import { blogSchema } from '../../src/content/schema';

// AC7: frontmatter is typed and enforced.
const valid = {
  title: 'A post',
  description: 'What the post is about',
  pubDate: '2026-10-16',
};

function issuePaths(input: unknown): string[] {
  const result = blogSchema.safeParse(input);
  expect(result.success).toBe(false);
  return result.success ? [] : result.error.issues.map((i) => i.path.join('.'));
}

describe('blogSchema', () => {
  it('accepts valid frontmatter', () => {
    expect(blogSchema.safeParse(valid).success).toBe(true);
  });

  it('coerces pubDate to a Date', () => {
    const result = blogSchema.parse(valid);
    expect(result.pubDate).toBeInstanceOf(Date);
  });

  it('defaults draft to false', () => {
    expect(blogSchema.parse(valid).draft).toBe(false);
  });

  it('accepts an optional updatedDate', () => {
    const result = blogSchema.parse({ ...valid, updatedDate: '2026-10-20' });
    expect(result.updatedDate).toBeInstanceOf(Date);
  });

  it.each(['title', 'description', 'pubDate'])('rejects frontmatter missing %s and names the field', (field) => {
    const input: Record<string, unknown> = { ...valid };
    delete input[field];
    expect(issuePaths(input)).toContain(field);
  });

  it('rejects an unparseable pubDate', () => {
    expect(issuePaths({ ...valid, pubDate: 'not a date' })).toContain('pubDate');
  });

  it('rejects a non-string title', () => {
    expect(issuePaths({ ...valid, title: 42 })).toContain('title');
  });

  it('rejects a non-boolean draft flag', () => {
    expect(issuePaths({ ...valid, draft: 'yes' })).toContain('draft');
  });
});
