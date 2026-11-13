import { describe, expect, it } from 'vitest';
import { THEME_STORAGE_KEY } from '../../src/lib/theme';
import { distFileExists, getPublishedSourcePosts, loadDist, readDist } from '../helpers';

const post = getPublishedSourcePosts()[0];
const PAGES = [
  { name: 'home page', file: 'index.html' },
  { name: 'blog index', file: 'blog/index.html' },
  { name: 'blog post', file: `blog/${post.id}/index.html` },
];

// #44 AC2: one accessible toggle on every page type, outside any collapsible menu.
describe.each(PAGES)('theme toggle on the $name', ({ file }) => {
  const toggle = () => loadDist(file)('button[data-theme-toggle]');

  it('has exactly one toggle', () => {
    expect(toggle().length).toBe(1);
  });

  it('is a <button type="button"> with an accessible name and pressed state', () => {
    expect(toggle().attr('type')).toBe('button');
    expect(toggle().attr('aria-label')?.trim()).toBeTruthy();
    expect(toggle().attr('aria-pressed')).toBe('false');
  });

  it('lives in the navbar but not inside the collapsible menu', () => {
    const $ = loadDist(file);
    expect($('nav button[data-theme-toggle]').length).toBe(1);
    expect($('.navbar-menu button[data-theme-toggle]').length).toBe(0);
  });
});

// #44 AC3: the theme is decided before first paint.
describe.each(PAGES)('pre-paint theme script on the $name', ({ file }) => {
  it('is inline in <head> before any stylesheet', () => {
    const html = readDist(file);
    const head = html.slice(0, html.indexOf('</head>'));
    const script = head.indexOf(`localStorage.getItem("${THEME_STORAGE_KEY}")`);
    const firstStylesheet = head.indexOf('rel="stylesheet"');
    expect(script).toBeGreaterThan(-1);
    expect(firstStylesheet).toBeGreaterThan(script);
  });

  it('loads the theme stylesheet after Bulma so overrides win', () => {
    const html = readDist(file);
    const bulma = html.indexOf('bulma@0.9.4');
    const theme = html.indexOf('/css/theme.css');
    expect(bulma).toBeGreaterThan(-1);
    expect(theme).toBeGreaterThan(bulma);
  });
});

it('ships the theme stylesheet', () => {
  expect(distFileExists('css/theme.css')).toBe(true);
});

// #44 AC4: Giscus follows the site theme, not just the device.
describe('Giscus theme on a post', () => {
  const giscus = () => loadDist(`blog/${post.id}/index.html`)('script[src="https://giscus.app/client.js"]');

  it('no longer uses preferred_color_scheme', () => {
    expect(giscus().attr('data-theme')).not.toBe('preferred_color_scheme');
  });

  it('syncs data-theme from the current site theme before the client runs', () => {
    const html = readDist(`blog/${post.id}/index.html`);
    const client = html.indexOf('https://giscus.app/client.js');
    const sync = html.indexOf('documentElement.dataset.theme', client);
    expect(sync).toBeGreaterThan(client);
  });
});
