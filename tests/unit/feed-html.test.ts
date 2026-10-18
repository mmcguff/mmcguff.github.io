import { load } from 'cheerio';
import { describe, expect, it } from 'vitest';
import { toFeedHtml } from '../../src/lib/feed-html';

// #28: post HTML is cleaned up for feed readers and importers before it goes into content:encoded.
const POST_URL = new URL('https://devguff.com/blog/some-post/');
const clean = (html: string) => load(toFeedHtml(html, POST_URL), null, false);

const SHIKI =
  '<pre class="astro-code github-dark" style="background-color:#24292e;color:#e1e4e8;overflow-x:auto" tabindex="0" data-language="ts">' +
  '<code><span class="line"><span style="color:#F97583">const</span><span style="color:#E1E4E8"> x </span>' +
  '<span style="color:#F97583">=</span><span style="color:#79B8FF"> 1</span><span style="color:#E1E4E8">;</span></span></code></pre>';

// AC3
describe('code blocks', () => {
  it('turns a Shiki block into plain pre > code with the language', () => {
    const $ = clean(SHIKI);
    expect($('pre').length).toBe(1);
    expect($('pre > code').attr('class')).toBe('language-ts');
  });

  it('keeps the code text', () => {
    expect(clean(SHIKI)('pre code').text()).toBe('const x = 1;');
  });

  it('drops the token spans', () => {
    expect(clean(SHIKI)('span').length).toBe(0);
  });

  it('drops every style, tabindex and Shiki class', () => {
    const $ = clean(SHIKI);
    expect($('[style]').length).toBe(0);
    expect($('[tabindex]').length).toBe(0);
    expect($('.astro-code, .shiki, .line').length).toBe(0);
  });

  it('leaves a block without a language as plain pre > code', () => {
    const $ = clean('<pre class="astro-code" style="color:red"><code>plain</code></pre>');
    expect($('pre > code').text()).toBe('plain');
    expect($('pre > code').attr('class')).toBeUndefined();
  });

  it('keeps inline code', () => {
    expect(clean('<p>Use <code>npm run check</code>.</p>')('p > code').text()).toBe('npm run check');
  });
});

// AC4
describe('URLs', () => {
  const href = (html: string) => clean(html)('a').attr('href');

  it('makes root-relative links absolute on the site origin', () => {
    expect(href('<a href="/rss.xml">feed</a>')).toBe('https://devguff.com/rss.xml');
  });

  it('points fragment links at the post', () => {
    expect(href('<a href="#why-astro">x</a>')).toBe('https://devguff.com/blog/some-post/#why-astro');
  });

  it('resolves page-relative links against the post', () => {
    expect(href('<a href="other/">x</a>')).toBe('https://devguff.com/blog/some-post/other/');
  });

  it('leaves absolute https links alone', () => {
    expect(href('<a href="https://astro.build">x</a>')).toBe('https://astro.build');
  });

  it('leaves mailto links alone', () => {
    expect(href('<a href="mailto:devguff@gmail.com">x</a>')).toBe('mailto:devguff@gmail.com');
  });

  it('drops javascript: links', () => {
    expect(href('<a href="javascript:alert(1)">x</a>')).toBeUndefined();
  });

  it('makes image sources absolute and keeps alt text', () => {
    const img = clean('<img src="/img/diagram.png" alt="Diagram" class="hero" style="width:1px">')('img');
    expect(img.attr('src')).toBe('https://devguff.com/img/diagram.png');
    expect(img.attr('alt')).toBe('Diagram');
    expect(img.attr('class')).toBeUndefined();
    expect(img.attr('style')).toBeUndefined();
  });
});

// AC5
describe('unsafe and page-chrome markup', () => {
  it.each(['script', 'style', 'iframe'])('removes <%s> and its contents', (tag) => {
    const out = toFeedHtml(`<p>keep</p><${tag}>drop-me</${tag}>`, POST_URL);
    expect(out).not.toContain(`<${tag}`);
    expect(out).not.toContain('drop-me');
    expect(out).toContain('keep');
  });

  it.each(['nav', 'h1'])('removes <%s> but not the surrounding content', (tag) => {
    const $ = clean(`<${tag}>x</${tag}><p>keep</p>`);
    expect($(tag).length).toBe(0);
    expect($('p').text()).toBe('keep');
  });

  it('removes inline event handlers', () => {
    expect(clean('<a href="/x" onclick="steal()">x</a>')('a').attr('onclick')).toBeUndefined();
  });

  it('keeps heading ids so fragment links still land', () => {
    expect(clean('<h2 id="why-astro">Why Astro</h2>')('h2').attr('id')).toBe('why-astro');
  });

  it('keeps ordinary article markup', () => {
    const $ = clean('<h2>A</h2><p><strong>b</strong> <em>c</em></p><ol><li>d</li></ol><blockquote>e</blockquote><aside>f</aside>');
    for (const tag of ['h2', 'p', 'strong', 'em', 'ol', 'li', 'blockquote', 'aside']) expect($(tag).length).toBe(1);
  });
});
