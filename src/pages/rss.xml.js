import { getContainerRenderer } from '@astrojs/mdx/container-renderer';
import rss from '@astrojs/rss';
import { experimental_AstroContainer } from 'astro/container';
import { loadRenderers } from 'astro:container';
import { render } from 'astro:content';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { toFeedHtml } from '../lib/feed-html';
import { getPublishedPosts } from '../lib/posts';

/** @param {import('astro').APIContext} context */
export async function GET(context) {
  const posts = await getPublishedPosts();
  // Renders each post's body the same way its page does (MDX included), without the page layout.
  const container = await experimental_AstroContainer.create({
    renderers: await loadRenderers([getContainerRenderer()]),
  });
  const items = await Promise.all(
    posts.map(async (post) => {
      const link = `/blog/${post.id}/`;
      const { Content } = await render(post);
      return {
        title: post.data.title,
        description: post.data.description,
        pubDate: post.data.pubDate,
        link,
        content: toFeedHtml(await container.renderToString(Content), new URL(link, context.site)),
      };
    }),
  );
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items,
    customData: '<language>en-us</language>',
  });
}
