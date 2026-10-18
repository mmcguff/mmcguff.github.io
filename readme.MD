# Matthew McGuff Portfolio Site

Here is list of things that should be possible from this portfolio site: 

- [ ] As a user, I should be able to download a current copy of Matthew McGuff Resume
- [ ] As a user, I should be able to hire Matthew McGuff Upwork.
- [ ] As an admin, I should have great visibility into who is using the site and what they are doing when on the site.
- [ ] As a user I should be able to easily contact Matthew McGuff.
- [ ] As a user I should be able to book time onto Matthew McGuff's Calendar.
- [x] As a user I should be able to linked to blog pages where I can learn more about what Matthew is currently working
- [ ] As a user I should be able have a space affiliate marketing to make money from visitors who come to my site.

## Local development

The site is built with [Astro](https://astro.build) and deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`. Requires Node 22.22+.

It's served at https://devguff.com. `www.devguff.com` and `mmcguff.github.io` redirect there. The custom domain is set in the repo's Pages settings, not with a `CNAME` file: Pages ignores one when deploying from an Actions workflow. DNS is in Cloudflare, with records set to DNS only (no proxy) so GitHub can issue the HTTPS certificate. Canonical, RSS and sitemap URLs all come from `site` in `astro.config.mjs`. DNSSEC is on for the zone (Cloudflare Registrar publishes the DS record). A non-blocking `@network` test in `tests/e2e/dnssec.spec.ts` checks it in CI, and the validation and rollback steps are in `docs/MANUAL_TEST_CASES-32-enable-dnssec.md`.

```sh
npm ci                 # install
npm run dev            # dev server at http://localhost:4321 (shows drafts)
npm run check          # type check .astro and .ts files (CI runs this too)
npm run build          # production build into dist/
npm run preview        # serve dist/ locally

npm test               # unit tests
npm run test:integration   # checks against dist/ (run `npm run build` first)
npx playwright install chromium && npm run test:e2e   # browser tests against the built site
```

Static files (images, CSS, the resume PDF) live in `public/` and are served from the site root.

## Writing a post

1. Create a file in `src/content/blog/`. The filename becomes the URL: `my-first-post.md` → `/blog/my-first-post/`. Use `.mdx` if you want to embed HTML or components. Files starting with `_` are ignored.
2. Start it with frontmatter:

   ```yaml
   ---
   title: My first post                         # required
   description: One-sentence summary for the index, RSS and SEO   # required
   pubDate: 2026-10-16                          # required
   updatedDate: 2026-10-20                      # optional
   draft: true                                  # optional, defaults to false
   ---
   ```

   A missing or wrongly typed field fails the build with an error naming the field.
3. `draft: true` keeps the post visible in `npm run dev` but leaves it out of the production build: no page, no blog index entry, no RSS item. Remove it (or set `draft: false`) to publish.
4. Preview with `npm run dev`, then open a PR. CI builds and tests it; merging to `main` deploys it.

Published posts appear at `/blog/`, in the RSS feed at `/rss.xml` (point DEV.to/Hashnode/Medium imports there), and get a Giscus comment thread backed by this repo's GitHub Discussions.
