import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { describe, expect, it } from 'vitest';
import { DIST, loadDist, readDist, SITE } from '../helpers';

// #24 AC1: the built site only emits devguff.com URLs; mmcguff.github.io survives only as a GitHub repo name.
const OLD_ORIGIN = /https?:\/\/mmcguff\.github\.io/;

function builtFiles(dir = DIST): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return builtFiles(full);
    return /\.(html|xml)$/.test(entry.name) ? [path.relative(DIST, full)] : [];
  });
}

const parser = new XMLParser({ isArray: (name) => name === 'url' || name === 'sitemap' });
const htmlPages = () => builtFiles().filter((f) => f.endsWith('.html'));

describe('old origin (dist/)', () => {
  it('has built HTML and XML files to check', () => {
    expect(builtFiles().length).toBeGreaterThan(0);
  });

  it.each(builtFiles())('%s has no mmcguff.github.io URLs', (file) => {
    expect(readDist(file)).not.toMatch(OLD_ORIGIN);
  });
});

describe('canonical links', () => {
  it.each(htmlPages())('%s has a canonical URL on the new origin', (page) => {
    expect(loadDist(page)('link[rel="canonical"]').attr('href')).toMatch(new RegExp(`^${SITE}/`));
  });
});

describe('sitemap', () => {
  it('sitemap-index.xml points at sitemaps on the new origin', () => {
    const locs = parser.parse(readDist('sitemap-index.xml')).sitemapindex.sitemap.map((s: { loc: string }) => s.loc);
    expect(locs.length).toBeGreaterThan(0);
    for (const loc of locs) expect(loc).toMatch(new RegExp(`^${SITE}/`));
  });

  it('sitemap-0.xml lists pages on the new origin', () => {
    const locs = parser.parse(readDist('sitemap-0.xml')).urlset.url.map((u: { loc: string }) => u.loc);
    expect(locs).toContain(`${SITE}/`);
    for (const loc of locs) expect(loc).toMatch(new RegExp(`^${SITE}/`));
  });
});
