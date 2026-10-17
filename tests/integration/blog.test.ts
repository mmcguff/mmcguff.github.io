import { describe, expect, it } from 'vitest';
import { GISCUS } from '../../src/consts';
import {
  distFileExists,
  GA4_ID,
  getPublishedSourcePosts,
  getSourcePosts,
  isoDate,
  loadDist,
  SITE,
} from '../helpers';

const published = getPublishedSourcePosts();
const drafts = getSourcePosts().filter((p) => p.data.draft === true);
const postPage = (id: string) => `blog/${id}/index.html`;

describe('blog index (dist/blog/index.html)', () => {
  it('is built', () => {
    expect(distFileExists('blog/index.html')).toBe(true);
  });

  it('has at least one published post to list', () => {
    expect(published.length).toBeGreaterThan(0);
  });

  // AC5
  describe.each(published)('entry for $id', (post) => {
    it('links to the post page', () => {
      const $ = loadDist('blog/index.html');
      expect($(`a[href="/blog/${post.id}/"]`).length).toBeGreaterThan(0);
    });

    it('shows the title', () => {
      expect(loadDist('blog/index.html')('main').text()).toContain(post.data.title);
    });

    it('shows the description', () => {
      expect(loadDist('blog/index.html')('main').text()).toContain(post.data.description);
    });

    it('shows the publish date', () => {
      const $ = loadDist('blog/index.html');
      const dates = $('time[datetime]').map((_, el) => $(el).attr('datetime')!.slice(0, 10)).get();
      expect(dates).toContain(isoDate(post.data.pubDate));
    });
  });

  it('lists posts newest first', () => {
    const $ = loadDist('blog/index.html');
    const dates = $('main time[datetime]').map((_, el) => $(el).attr('datetime')!).get();
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('loads the GA4 tag', () => {
    expect(loadDist('blog/index.html')(`script[src*="${GA4_ID}"]`).length).toBe(1);
  });
});

// AC6
describe.each(published)('post page for $id', (post) => {
  it('is built at /blog/<id>/', () => {
    expect(distFileExists(postPage(post.id))).toBe(true);
  });

  it('renders the title as the page heading', () => {
    expect(loadDist(postPage(post.id))('h1').first().text().trim()).toBe(post.data.title);
  });

  it('uses the title in <title>', () => {
    expect(loadDist(postPage(post.id))('title').text()).toContain(post.data.title);
  });

  it('uses the description as the meta description', () => {
    expect(loadDist(postPage(post.id))('meta[name="description"]').attr('content')).toBe(post.data.description);
  });

  it('shows the publish date', () => {
    const $ = loadDist(postPage(post.id));
    expect($('time[datetime]').first().attr('datetime')!.slice(0, 10)).toBe(isoDate(post.data.pubDate));
  });

  it('renders the post body', () => {
    expect(loadDist(postPage(post.id))('article').text().trim().length).toBeGreaterThan(500);
  });

  it('has an absolute canonical URL', () => {
    expect(loadDist(postPage(post.id))('link[rel="canonical"]').attr('href')).toBe(`${SITE}/blog/${post.id}/`);
  });

  it('loads the GA4 tag', () => {
    expect(loadDist(postPage(post.id))(`script[src*="${GA4_ID}"]`).length).toBe(1);
  });

  // AC10
  describe('Giscus comments', () => {
    const giscus = () => loadDist(postPage(post.id))('script[src="https://giscus.app/client.js"]');

    it('embeds the Giscus client', () => {
      expect(giscus().length).toBe(1);
    });

    it('targets this repo and category', () => {
      expect(giscus().attr('data-repo')).toBe(GISCUS.repo);
      expect(giscus().attr('data-repo-id')).toBe(GISCUS.repoId);
      expect(giscus().attr('data-category')).toBe(GISCUS.category);
      expect(giscus().attr('data-category-id')).toBe(GISCUS.categoryId);
    });

    it('maps one discussion per pathname', () => {
      expect(giscus().attr('data-mapping')).toBe('pathname');
    });
  });
});

// AC8: only meaningful once a draft exists in src/content/blog; the unit suite covers the filter itself.
describe.skipIf(drafts.length === 0)('drafts', () => {
  it.each(drafts)('does not build a page for draft $id', (post) => {
    expect(distFileExists(postPage(post.id))).toBe(false);
  });

  it.each(drafts)('does not list draft $id on the blog index', (post) => {
    expect(loadDist('blog/index.html')(`a[href="/blog/${post.id}/"]`).length).toBe(0);
  });
});
