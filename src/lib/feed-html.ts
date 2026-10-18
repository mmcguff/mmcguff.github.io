import sanitizeHtml from 'sanitize-html';

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** Resolves `/x`, `x/` and `#x` against the post URL; leaves `https:`, `mailto:` etc. untouched for the sanitizer to vet. */
function absolute(url: string, base: URL): string {
  return HAS_SCHEME.test(url) ? url : new URL(url, base).href;
}

/** A `transformTags` entry that makes one URL attribute absolute, when the element has it. */
function absoluteAttr(attr: 'href' | 'src', base: URL): sanitizeHtml.Transformer {
  return (tagName, attribs) => {
    const value = attribs[attr];
    return { tagName, attribs: value === undefined ? attribs : { ...attribs, [attr]: absolute(value, base) } };
  };
}

/** Shiki renders `<pre class="astro-code" style=… data-language="ts"><code>`; keep only the language, on `<code>`. */
function plainCodeBlocks(html: string): string {
  return html.replace(/<pre\b([^>]*)>\s*<code\b[^>]*>/g, (_, attrs: string) => {
    const lang = /\bdata-language="([^"]+)"/.exec(attrs)?.[1];
    return lang ? `<pre><code class="language-${lang}">` : '<pre><code>';
  });
}

/**
 * Cleans a rendered post for RSS `content:encoded`: plain code blocks, no styles, scripts or page chrome,
 * and absolute URLs so links and images work in feed readers and importers (DEV.to, Hashnode, Medium).
 */
export function toFeedHtml(html: string, postUrl: URL): string {
  return sanitizeHtml(plainCodeBlocks(html), {
    allowedTags: [...sanitizeHtml.defaults.allowedTags.filter((tag) => !['span', 'nav', 'h1'].includes(tag)), 'img'],
    allowedAttributes: {
      a: ['href', 'title'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      code: ['class'],
      h2: ['id'],
      h3: ['id'],
      h4: ['id'],
      h5: ['id'],
      h6: ['id'],
    },
    allowedClasses: { code: ['language-*'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'iframe'],
    transformTags: {
      a: absoluteAttr('href', postUrl),
      img: absoluteAttr('src', postUrl),
    },
  });
}
