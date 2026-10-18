import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
import { XMLParser } from 'fast-xml-parser';
import { describe, expect, it } from 'vitest';
import { BLOG_DIR, getPublishedSourcePosts, getSourcePosts, loadDist, readDist, SITE } from '../helpers';

// AC9: valid RSS 2.0 with absolute links, advertised from blog pages.
const parser = new XMLParser({ ignoreAttributes: false, isArray: (name) => name === 'item' });
const feed = () => parser.parse(readDist('rss.xml')).rss;
const items = (): Array<Record<string, string>> => feed().channel.item ?? [];

const published = getPublishedSourcePosts();
const drafts = getSourcePosts().filter((p) => p.data.draft === true);

describe('RSS feed (dist/rss.xml)', () => {
  it('is RSS 2.0', () => {
    expect(feed()['@_version']).toBe('2.0');
  });

  it('has a channel title, description and site link', () => {
    const { title, description, link } = feed().channel;
    expect(title).toBeTruthy();
    expect(description).toBeTruthy();
    expect(link).toMatch(new RegExp(`^${SITE}/?$`));
  });

  it('has one item per published post', () => {
    expect(items()).toHaveLength(published.length);
  });

  it.each(published)('links $id with an absolute post URL', (post) => {
    expect(items().map((i) => i.link)).toContain(`${SITE}/blog/${post.id}/`);
  });

  it('gives every item a title, description and pubDate', () => {
    for (const item of items()) {
      expect(item.title).toBeTruthy();
      expect(item.description).toBeTruthy();
      expect(Number.isNaN(Date.parse(item.pubDate))).toBe(false);
    }
  });

  it.each(drafts)('leaves out draft $id', (post) => {
    expect(items().map((i) => i.link)).not.toContain(`${SITE}/blog/${post.id}/`);
  });
});

describe('RSS autodiscovery', () => {
  const pages = ['blog/index.html', ...published.map((p) => `blog/${p.id}/index.html`)];

  it.each(pages)('%s advertises the feed', (page) => {
    const href = loadDist(page)('link[rel="alternate"][type="application/rss+xml"]').attr('href');
    expect(href).toBe(`${SITE}/rss.xml`);
  });
});

// #28: each item carries the full post as clean, absolute HTML for importers and feed readers.
describe('RSS full content (content:encoded)', () => {
  const contentOf = (id: string) => {
    const item = items().find((i) => i.link === `${SITE}/blog/${id}/`);
    return item?.['content:encoded'] ?? '';
  };
  const html = (id: string) => load(contentOf(id), null, false);

  // Source body outside code fences, with Markdown syntax and smart quotes normalised away.
  const sourceBody = (file: string) =>
    fs
      .readFileSync(path.join(BLOG_DIR, file), 'utf8')
      .replace(/^---[\s\S]*?\n---\n/, '')
      .replace(/```[\s\S]*?```/g, '');
  const plain = (text: string) =>
    text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[`*_]/g, '')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

  // AC1
  it('declares the content namespace', () => {
    expect(feed()['@_xmlns:content']).toBe('http://purl.org/rss/1.0/modules/content/');
  });

  it.each(published)('$id has content:encoded', (post) => {
    expect(contentOf(post.id).trim()).not.toBe('');
  });

  // AC2
  it.each(published)('$id content has every ## heading from the source', (post) => {
    const headings = [...sourceBody(post.file).matchAll(/^## (.+)$/gm)].map((m) => plain(m[1]));
    expect(headings.length).toBeGreaterThan(0);
    const rendered = html(post.id)('h2')
      .map((_, el) => plain(html(post.id)(el).text()))
      .get();
    expect(rendered).toEqual(headings);
  });

  it.each(published)('$id content starts with the first paragraph of the source', (post) => {
    const first = sourceBody(post.file)
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .find((block) => block && !block.startsWith('import ') && !block.startsWith('#'))!;
    expect(plain(html(post.id)('p').first().text())).toBe(plain(first));
  });

  // AC3
  it.each(published)('$id content has plain code blocks', (post) => {
    const $ = html(post.id);
    $('pre').each((_, pre) => expect($(pre).children('code').length).toBe(1));
    expect($('[style]').length).toBe(0);
    expect($('.astro-code, .shiki, .line, span').length).toBe(0);
  });

  // AC4
  it.each(published)('$id content uses only absolute URLs', (post) => {
    const $ = html(post.id);
    const urls = [...$('[href]').map((_, el) => $(el).attr('href')).get(), ...$('[src]').map((_, el) => $(el).attr('src')).get()];
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(url).toMatch(/^(https:\/\/|mailto:)/);
  });

  it.each(published)('$id content links to this site on the new origin', (post) => {
    expect(html(post.id)(`a[href^="${SITE}/"]`).length).toBeGreaterThan(0);
  });

  // AC5
  it.each(published)('$id content has no page chrome or scripts', (post) => {
    const $ = html(post.id);
    expect($('script, style, iframe, nav, h1').length).toBe(0);
    // Markup only: the post text itself may mention Giscus.
    expect($('.giscus, [class*="giscus"], [src*="giscus"], [data-repo]').length).toBe(0);
  });

  // AC6
  it.each(drafts)('leaves draft $id out of every item', (draft) => {
    for (const item of items()) expect(item['content:encoded'] ?? '').not.toContain(draft.data.title);
  });
});
