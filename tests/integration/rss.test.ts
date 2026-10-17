import { XMLParser } from 'fast-xml-parser';
import { describe, expect, it } from 'vitest';
import { getPublishedSourcePosts, getSourcePosts, loadDist, readDist, SITE } from '../helpers';

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
    expect(href).toMatch(/\/rss\.xml$/);
  });
});
