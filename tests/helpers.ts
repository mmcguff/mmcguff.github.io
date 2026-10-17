import fs from 'node:fs';
import path from 'node:path';
import { load, type CheerioAPI } from 'cheerio';
import { parse as parseYaml } from 'yaml';

export const ROOT = path.resolve(import.meta.dirname, '..');
export const DIST = path.join(ROOT, 'dist');
export const BLOG_DIR = path.join(ROOT, 'src/content/blog');
export const SITE = 'https://mmcguff.github.io';
export const GA4_ID = 'G-4W1771HBN9';

/** Read a built file from dist/, failing with a clear message if the site was never built. */
export function readDist(relPath: string): string {
  const file = path.join(DIST, relPath);
  if (!fs.existsSync(DIST)) {
    throw new Error('dist/ not found — run `npm run build` before the integration suite');
  }
  if (!fs.existsSync(file)) {
    throw new Error(`Expected built file dist/${relPath} to exist`);
  }
  return fs.readFileSync(file, 'utf8');
}

export function loadDist(relPath: string): CheerioAPI {
  return load(readDist(relPath));
}

export function distFileExists(relPath: string): boolean {
  return fs.existsSync(path.join(DIST, relPath));
}

export interface SourcePost {
  id: string;
  file: string;
  data: Record<string, unknown> & { title: string; description: string; pubDate: string | Date; draft?: boolean };
}

/** Blog source entries as Astro's glob loader sees them: md/mdx files not starting with `_`. */
export function getSourcePosts(): SourcePost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => /\.(md|mdx)$/.test(f) && !f.startsWith('_'))
    .map((file) => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8');
      const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!match) throw new Error(`${file} has no frontmatter`);
      return {
        id: file.replace(/\.(md|mdx)$/, '').toLowerCase(),
        file,
        data: parseYaml(match[1]),
      };
    });
}

export function getPublishedSourcePosts(): SourcePost[] {
  return getSourcePosts().filter((p) => p.data.draft !== true);
}

export function isoDate(value: string | Date): string {
  return new Date(value).toISOString().slice(0, 10);
}
