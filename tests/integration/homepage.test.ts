import { describe, expect, it } from 'vitest';
import baseline from '../fixtures/homepage-baseline.json';
import { distFileExists, GA4_ID, loadDist } from '../helpers';

// Strip leading "./" or "/" so a page-relative or root-absolute asset path maps onto dist/.
const toDistPath = (href: string) => href.replace(/^\.?\//, '').split(/[?#]/)[0];

describe('homepage (dist/index.html)', () => {
  // AC2: same sections and links as the pre-migration index.html (snapshot in tests/fixtures).
  it.each(baseline.sections)('keeps the "$text" section (#$id)', ({ id, text }) => {
    const $ = loadDist('index.html');
    expect($(`#${id}`).text().trim()).toBe(text);
  });

  it.each(baseline.externalLinks)('keeps the external link %s', (href) => {
    const $ = loadDist('index.html');
    expect($(`a[href="${href}"]`).length).toBeGreaterThan(0);
  });

  it('loads the GA4 tag', () => {
    const $ = loadDist('index.html');
    expect($(`script[src*="googletagmanager.com/gtag/js?id=${GA4_ID}"]`).length).toBe(1);
    expect($('script:not([src])').text()).toContain(`gtag('config', '${GA4_ID}')`);
  });

  it('keeps the Calendly badge widget', () => {
    const $ = loadDist('index.html');
    expect($('script[src*="assets.calendly.com/assets/external/widget.js"]').length).toBeGreaterThan(0);
    expect($('script:not([src])').text()).toContain('https://calendly.com/devguff/meeting');
  });

  it('keeps the Formspree contact form', () => {
    const $ = loadDist('index.html');
    expect($('form[action^="https://formspree.io/f/"]').length).toBe(1);
  });

  // AC3: resume and static assets still resolve.
  it('links to the resume PDF', () => {
    const $ = loadDist('index.html');
    expect($('a[href$="matthew-mcguff-resume-2026.pdf"]').length).toBeGreaterThan(0);
  });

  it('ships the resume PDF at the site root', () => {
    expect(distFileExists('matthew-mcguff-resume-2026.pdf')).toBe(true);
  });

  it('ships every local image the homepage references', () => {
    const $ = loadDist('index.html');
    const missing = $('img[src]')
      .map((_, el) => $(el).attr('src')!)
      .get()
      .filter((src) => !/^https?:|^data:/.test(src))
      .filter((src) => !distFileExists(toDistPath(decodeURI(src))));
    expect(missing).toEqual([]);
  });

  it('ships the favicon it links to', () => {
    const $ = loadDist('index.html');
    const href = $('link[rel="icon"]').attr('href');
    expect(href).toBeDefined();
    expect(distFileExists(toDistPath(href!))).toBe(true);
  });

  it('ships the stylesheet and script it links to', () => {
    const $ = loadDist('index.html');
    const local = [
      ...$('link[rel="stylesheet"][href]').map((_, el) => $(el).attr('href')!).get(),
      ...$('script[src]').map((_, el) => $(el).attr('src')!).get(),
    ].filter((u) => !/^https?:/.test(u) && !u.startsWith('/_astro/'));
    expect(local.length).toBeGreaterThan(0);
    expect(local.filter((u) => !distFileExists(toDistPath(u)))).toEqual([]);
  });

  // AC4: navbar links to the blog.
  it('has a Blog link in the navbar', () => {
    const $ = loadDist('index.html');
    expect($('.navbar a.navbar-item[href="/blog/"]').text()).toMatch(/blog/i);
  });
});
