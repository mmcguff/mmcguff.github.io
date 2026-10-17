# Manual Test Cases — #18 Astro technical blog

Automated coverage lives in `tests/` (unit → integration against `dist/` → Playwright E2E). These steps cover what automation can't: real GitHub settings, the live Pages deploy, third-party embeds, and visual checks.

**Setup (one time, before cases 7–9):** Repo Settings → Pages → Source: **GitHub Actions**. Settings → General → Features → enable **Discussions**, then create a category (e.g. "Blog Comments", type *Announcements*). Install the [Giscus app](https://github.com/apps/giscus) on the repo, get `repoId`/`categoryId` from https://giscus.app, and put them in `src/consts.ts`.

| # | Steps | Expected Result | Environment |
|---|-------|------------------|-------------|
| 1 | `npm ci && npm run dev`, open http://localhost:4321/ and compare side by side with the current live https://mmcguff.github.io/ | Homepage looks identical (hero, Experience cards with hover overlays, About, Testimonials, Contact form), plus a "Blog" navbar item | local |
| 2 | On the local homepage, click the Calendly "📅 Schedule Meeting" badge and the Calendly button | The Calendly popup opens with the correct meeting type | local |
| 3 | On the local homepage, click "View Resume/CV" | The 2026 resume PDF opens in a new tab | local |
| 4 | Create `src/content/blog/scratch-test.md` with valid frontmatter and `draft: true`. Run `npm run dev` and visit `/blog/` | The draft **is** listed in dev (for previewing) | local |
| 5 | With the draft from case 4 still present, run `npm run build && npm run preview`. Visit `/blog/`, `/blog/scratch-test/` and `/rss.xml` | The draft is missing from the index, its page returns 404, and it isn't in the RSS. Delete the scratch file afterward | local |
| 6 | Remove `description:` from the starter post's frontmatter and run `npm run build` | The build fails with an error naming `description`. Revert the change | local |
| 7 | Open a PR from the feature branch | The "Deploy to GitHub Pages" workflow runs build and all tests, and the **deploy** job is skipped | GitHub PR |
| 8 | Merge the PR to `master` | The workflow builds and deploys; https://mmcguff.github.io/ and `/blog/` serve the new site within a few minutes | prod (Pages) |
| 9 | Open the starter post on the live site, sign in with GitHub in the comments widget, and post a test comment | The comment appears in the post and as a new Discussion in the blog-comments category, titled with the post path. Delete the test discussion afterward | prod (Pages) |
| 10 | Paste https://mmcguff.github.io/rss.xml into https://validator.w3.org/feed/ | Valid RSS; no errors (warnings OK) | prod (Pages) |
| 11 | In DEV.to (Settings → Extensions → "Publishing to DEV Community from RSS"), add the feed URL and fetch | The starter post is imported as a draft, with the canonical URL pointing to mmcguff.github.io. Repeat on Hashnode (import from RSS) and Medium (import story URL) as wanted | prod (Pages) |
| 12 | Open https://mmcguff.github.io/ in GA4 Realtime, then visit `/` and the starter post | Both page views show up in GA4 Realtime | prod (Pages) |
| 13 | On a phone (or DevTools at 375px), open `/blog/` and the starter post. Toggle the OS dark/light theme | No horizontal scroll, readable text, and code blocks scroll inside themselves rather than widening the page | prod (Pages) |
| 14 | Check that old URLs still work: `/matthew-mcguff-resume-2026.pdf`, `/img/profile-2024.jpg`, `/css/custom.css` | All return 200 | prod (Pages) |
