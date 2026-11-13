// @ts-check
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://devguff.com',
  integrations: [mdx(), sitemap()],
  markdown: {
    // Dual themes emit CSS variables; public/css/theme.css picks one to match the site theme.
    shikiConfig: { themes: { light: 'github-light-default', dark: 'github-dark-default' } },
  },
});
