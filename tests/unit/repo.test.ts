import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getSourcePosts, ROOT } from '../helpers';

// AC12: one starter post ships, and the readme explains how to write more.
describe('starter content', () => {
  it('ships exactly one blog post', () => {
    expect(getSourcePosts()).toHaveLength(1);
  });

  it('publishes the starter post (not a draft)', () => {
    const [post] = getSourcePosts();
    expect(post, 'starter post should exist').toBeDefined();
    expect(post.data.draft ?? false).toBe(false);
  });

  it('writes the starter post in MDX', () => {
    expect(getSourcePosts()[0]?.file).toMatch(/\.mdx$/);
  });
});

describe('readme authoring guide', () => {
  const readme = () => fs.readFileSync(path.join(ROOT, 'readme.MD'), 'utf8');

  it('has a "Writing a post" section', () => {
    expect(readme()).toMatch(/^##+ Writing a post/m);
  });

  it('says where posts live', () => {
    expect(readme()).toContain('src/content/blog');
  });

  it('lists the required frontmatter fields', () => {
    for (const field of ['title', 'description', 'pubDate']) expect(readme()).toContain(field);
  });

  it('explains the draft flag', () => {
    expect(readme()).toContain('draft: true');
  });

  it('gives the local preview command', () => {
    expect(readme()).toContain('npm run dev');
  });
});

describe('.gitignore', () => {
  const ignored = () => fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8').split(/\r?\n/);

  it.each(['node_modules/', 'dist/', '.astro/', '.sdlc_state.md'])('ignores %s', (entry) => {
    expect(ignored()).toContain(entry);
  });
});
