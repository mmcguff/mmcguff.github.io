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

  // #24: the custom domain and where it is configured.
  it('says the site is served at devguff.com', () => {
    expect(readme()).toContain('https://devguff.com');
  });

  it('explains the domain lives in the Pages settings, not a CNAME file', () => {
    expect(readme()).toMatch(/CNAME/);
    expect(readme()).toMatch(/Cloudflare/);
  });
});

describe('.gitignore', () => {
  const ignored = () => fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8').split(/\r?\n/);

  it.each(['node_modules/', 'dist/', '.astro/', '.sdlc_state.md'])('ignores %s', (entry) => {
    expect(ignored()).toContain(entry);
  });
});

// #30 AC5: the default branch is main; nothing live still points at master.
// docs/ is excluded on purpose: the #18 plan and manual tests are historical records.
describe('default branch references', () => {
  const SELF = path.join(ROOT, 'tests/unit/repo.test.ts');
  const filesUnder = (dir: string) =>
    fs
      .readdirSync(path.join(ROOT, dir), { recursive: true, withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => path.join(e.parentPath, e.name));
  const scanned = () =>
    [path.join(ROOT, 'readme.MD'), ...filesUnder('.github'), ...filesUnder('src'), ...filesUnder('tests')].filter(
      (f) => f !== SELF,
    );

  it('scans the workflow, readme, src and tests', () => {
    const rel = scanned().map((f) => path.relative(ROOT, f));
    expect(rel).toContain('.github/workflows/deploy.yml');
    expect(rel).toContain('readme.MD');
    expect(rel).toContain('src/content/blog/rebuilding-my-site-with-astro.mdx');
  });

  it('has no remaining references to the master branch', () => {
    const offenders = scanned()
      .filter((f) => /\bmaster\b/.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(ROOT, f));
    expect(offenders).toEqual([]);
  });
});
