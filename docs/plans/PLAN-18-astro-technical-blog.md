# Plan: #18 — Implement Astro-based technical blog & content workflow

Ticket: https://github.com/mmcguff/mmcguff.github.io/issues/18
Branch: `18-implement-astro-based-technical-blog-content-workflow`

## Problem Statement
mmcguff.github.io is a single hand-written `index.html` portfolio with no place to publish long-form technical writing. A blog would give a home for architectural insights and community discussion, and serve as an independent source of thought leadership instead of relying only on third-party platforms. It needs a Markdown-first authoring flow, typed post metadata so mistakes get caught at build time, an RSS feed that DEV.to, Hashnode and Medium can import from, and a comments section for readers.

## Scope
**In scope:**
- Migrate the whole site to Astro. Astro owns the repo and build. The existing homepage is ported over with the same visible content, sections (Experience, About, Testimonials, Contact), styling, GA4 tag, Calendly badge, Upwork/LinkedIn/GitHub links, and resume PDF download.
- A blog at `/blog` with an index page and one page per post.
- A Markdown/MDX content pipeline backed by Astro Content Collections, with a frontmatter schema that is enforced at build time.
- An RSS feed with absolute, canonical post URLs, ready for manual import on DEV.to, Hashnode and Medium.
- Giscus comments (GitHub Discussions) on every post page.
- A homepage navigation link to the blog.
- Deployment to GitHub Pages through a GitHub Actions build-and-deploy workflow.
- One starter post that exercises the pipeline end to end (Claude drafts it as a placeholder; Matthew edits or replaces it before merging).
- A short authoring guide in the readme explaining how to write and publish a post.

**Out of scope:**
- API cross-posting or automation to DEV.to, Hashnode or Medium (RSS only; importing is set up by hand on each platform).
- Redesigning the homepage, or any content changes beyond adding the blog link (#23).
- Tag pages (#19), search (#20), newsletter signup (#21), affiliate marketing (#22), and pagination.
- New analytics beyond the existing GA4 tag (GA4 should still fire on blog pages).
- A custom domain (#24).

**Manual repo settings (done by Matthew, not in code):**
- GitHub Pages source → "GitHub Actions".
- Enable Discussions on the repo, create a blog-comments category, and install the Giscus app.

## Acceptance Criteria
- [ ] AC1: Given a clean checkout, when `npm ci && npm run build` runs, then it exits 0 and writes a static site to the build output directory.
- [ ] AC2: Given the built site, when `/` is loaded, then it renders the same section headings (Experience, About, Testimonials, Contact) and all external links found in the current `index.html` (Upwork, LinkedIn, GitHub, company links, Calendly), and includes the GA4 tag `G-4W1771HBN9`.
- [ ] AC3: Given the built site, when the resume link on `/` is followed, then `matthew-mcguff-resume-2026.pdf` is served (HTTP 200, PDF content type), and existing image/favicon paths resolve.
- [ ] AC4: Given the homepage, when the navbar is inspected, then it has a "Blog" link pointing to `/blog/`.
- [ ] AC5: Given one or more published posts, when `/blog/` is loaded, then each non-draft post appears with title, publish date and description, sorted newest first, each linking to its own post page.
- [ ] AC6: Given a post Markdown/MDX file in the blog content collection, when the site builds, then a page is generated at `/blog/<slug>/` that renders the post body, title, date, and a canonical URL `<link>`.
- [ ] AC7: Given a post whose frontmatter is missing a required field (title, description, pubDate) or has a wrong type, when the site builds, then the build fails with a schema validation error naming the field.
- [ ] AC8: Given a post with `draft: true`, when the production site builds, then that post is left out of `/blog/`, the RSS feed, and the generated post pages.
- [ ] AC9: Given the built site, when `/rss.xml` is fetched, then it is valid RSS 2.0, contains one `<item>` per published post with an absolute `https://mmcguff.github.io/blog/<slug>/` link, title, description and pubDate, and is advertised via `<link rel="alternate" type="application/rss+xml">` on blog pages.
- [ ] AC10: Given a post page, when it loads in a browser, then the Giscus widget is embedded and configured for the `mmcguff/mmcguff.github.io` repo and its blog-comments Discussions category, mapped per post (pathname).
- [ ] AC11: Given a push to `master`, when the GitHub Actions workflow runs, then it builds the site and deploys it to GitHub Pages; given a pull request, then the workflow runs the build (and tests) without deploying.
- [ ] AC12: Given the merged change, when the repo is checked out, then exactly one starter post exists and passes AC6–AC10, and the readme documents how to add a post (file location, required frontmatter, draft flag, local preview command).
- [ ] AC13: Given blog pages at 375px viewport width, when rendered, then there is no horizontal scroll and body text is readable (matches the homepage's mobile behaviour).

## Open Questions
- ~~Starter post topic~~ — Resolved: Claude picks the topic and drafts the first post; Matthew reviews it in the PR.
- Giscus `repo-id`/`category-id` values come from giscus.app once Discussions is enabled; Matthew will need to supply them (or they'll be filled in after he enables Discussions).

## Technical Design

### Recon summary (current state)
- No build tooling, no `package.json`, no CI. GitHub Pages serves the repo root from `master`.
- `index.html` (935 lines) is one self-contained page: Bulma 0.9.4 (jsDelivr), Font Awesome 5.3.1, Google Fonts, the GA4 inline script (`G-4W1771HBN9`), the Calendly badge and popup, a Formspree contact form, a hidden recruiter modal (Loom embed), and `script.js` (modal open/close handlers).
- Assets use **relative** paths (`img/...`, `css/custom.css`, `./script.js`, `./matthew-mcguff-resume-2026.pdf`). These work at `/` but would break on `/blog/<slug>/`, so shared layout assets must use root-absolute paths (`/css/custom.css`).
- Local Node is v26; Astro 7.4 needs Node ≥ 22.22.

### Architecture
A **static Astro 7 site** (`output: 'static'`, the default) with `site: 'https://mmcguff.github.io'`, built in GitHub Actions and deployed as a Pages artifact.

1. **Static assets → `public/`.** Move `img/`, `css/`, `script.js`, `matthew-mcguff-resume-2026.pdf` and `img/favicon.ico` there unchanged (`git mv`, which keeps history), so every existing URL (`/img/...`, `/matthew-mcguff-resume-2026.pdf`) keeps resolving exactly as it does today.
2. **Shared `BaseLayout.astro`.** Holds everything the current `<head>` loads: Bulma, Font Awesome, fonts, favicon and `custom.css`, all with root-absolute paths. Also holds the GA4 snippet and an RSS `<link rel="alternate">`. Third-party inline scripts (GA4, Calendly init) use `is:inline` so Astro doesn't bundle or rewrite them. The layout takes `title`, `description` and `canonicalURL` props and renders `<link rel="canonical">`.
3. **Homepage port → `src/pages/index.astro`.** The `<body>` markup is copied over verbatim (no redesign; that's #23) and wrapped in `BaseLayout`. The only change is a "Blog" navbar item linking to `/blog/`. The Calendly badge and `script.js` stay homepage-only, as they are today.
4. **Content Collections (Content Layer API).** `src/content.config.ts` defines a `blog` collection with `glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/blog' })`. Its schema (from `astro/zod`) has: `title: string`, `description: string`, `pubDate: coerce.date`, `updatedDate?: coerce.date`, `draft: boolean = false`, `heroImage?: string`. The schema lives in its own module (`src/content/schema.ts`) so it can be unit-tested directly; `content.config.ts` imports it. A bad field fails `astro build` with Astro's own Zod error, which names the field (AC7).
5. **One point where drafts are filtered.** `src/lib/posts.ts` exports `getPublishedPosts()`. It is a thin wrapper over `getCollection('blog')` built on a pure `filterAndSortPosts(entries, { includeDrafts })` in `src/lib/post-utils.ts` (no `astro:content` import, so Vitest can load it without Astro's virtual modules), that drops drafts in production (`import.meta.env.PROD`) and sorts newest first. The blog index, post routes and RSS all call it, so draft handling can't drift between them (AC5, AC8). Drafts *are* shown in `astro dev` for previewing.
6. **Routes.**
   - `src/pages/blog/index.astro`: post list (title, date, description, link) (AC5).
   - `src/pages/blog/[...slug].astro`: `getStaticPaths()` from `getPublishedPosts()`. Renders through `render(entry)` in `BlogPostLayout` (title, `<time>`, prose body in Bulma's `.content`, Giscus) (AC6, AC10).
   - `src/pages/rss.xml.js`: `@astrojs/rss`, with `site: context.site` and items from `getPublishedPosts()` linking to `/blog/${id}/` (AC9).
7. **MDX** via `@astrojs/mdx`, so a post can embed components later. The starter post is `.mdx` to prove it works. **Sitemap** via `@astrojs/sitemap`, a cheap SEO win that is first-party and needs no configuration.
8. **Giscus.** `src/components/Comments.astro` renders the official `<script src="https://giscus.app/client.js" data-*>` tag (`is:inline`, no npm dependency). Config (`repo`, `repoId`, `category`, `categoryId`, `mapping: 'pathname'`) lives in `src/consts.ts` next to the site title and description. These are public IDs, not secrets. Until Matthew supplies the real `repoId`/`categoryId` from giscus.app, they stay as clearly marked `TODO` placeholders. A unit test asserts they aren't placeholders, so the PR can't silently ship broken comments.
9. **CI/CD: `.github/workflows/deploy.yml`.**
   - Triggers: `push` to `master`, `pull_request` to `master`, and `workflow_dispatch`.
   - `build` job: checkout → `actions/setup-node` (Node 24, npm cache) → `npm ci` → `npm run test:unit` → `npm run build` → `npm run test:integration` → `npx playwright install --with-deps chromium && npm run test:e2e` → `actions/upload-pages-artifact` (`path: dist/`).
   - `deploy` job: `needs: build`, guarded by `if: github.event_name != 'pull_request'`, using `actions/deploy-pages` with `pages: write` and `id-token: write`. (We use explicit steps instead of the `withastro/action` shortcut so tests run in the same job before the artifact is uploaded.)
10. **Starter post:** `src/content/blog/rebuilding-my-site-with-astro.mdx`, titled *"Rebuilding my portfolio as a Markdown-first blog with Astro"*. It covers why Astro, how content collections type-check frontmatter, RSS for syndication, and Giscus for comments, so it doubles as documentation of this ticket. Claude drafts it and Matthew reviews it in the PR.

### Alternatives considered
- **Keep `index.html` as a raw file in `public/`, with Astro serving only `/blog`.** Rejected: you chose a full migration, and it would duplicate the `<head>`/GA4 code across two systems.
- **`withastro/action`.** Simpler, but it builds and uploads in one step, leaving no clean place for tests to gate the upload. Explicit steps cost about eight more YAML lines.
- **`@giscus/react` or another wrapper package.** Unnecessary: the plain script tag is the officially documented embed and needs no UI framework.
- **Tailwind or another blog theme.** Rejected: the site already uses Bulma, and Bulma's `.content` class styles rendered Markdown well enough. No redesign in this ticket.

## File Changes
| File | Change | Reason |
|------|--------|--------|
| `package.json`, `package-lock.json` | New (created in test-builder) | Astro 7, `@astrojs/mdx`, `@astrojs/rss`, `@astrojs/sitemap`; dev: `vitest`, `@playwright/test`, `fast-xml-parser` (RSS), `cheerio` (HTML), `yaml` (frontmatter/workflow). Scripts: `dev`, `build`, `preview`, `test`/`test:unit`, `test:integration` (needs a build), `test:e2e`. `engines.node >=22.22` |
| `astro.config.mjs` | New | `site`, integrations (mdx, sitemap) |
| `tsconfig.json` | New | `astro/tsconfigs/strict` |
| `src/consts.ts` | New | Site title/description, Giscus config |
| `src/content/schema.ts` | New | Blog frontmatter Zod schema (unit-testable) |
| `src/content.config.ts` | New | `blog` collection with `glob()` loader + schema |
| `src/lib/post-utils.ts` | New | `filterAndSortPosts` (pure, unit-tested) |
| `src/lib/posts.ts` | New | `getPublishedPosts()` wrapper over `getCollection` |
| `src/layouts/BaseLayout.astro` | New | Shared `<head>`, GA4, canonical, RSS link |
| `src/layouts/BlogPostLayout.astro` | New | Post header, prose, comments |
| `src/components/Comments.astro` | New | Giscus embed |
| `src/pages/index.astro` | New (ported from `index.html`) | Homepage, plus the Blog nav link |
| `src/pages/blog/index.astro` | New | Blog listing |
| `src/pages/blog/[...slug].astro` | New | Post pages |
| `src/pages/rss.xml.js` | New | RSS feed |
| `src/content/blog/rebuilding-my-site-with-astro.mdx` | New | Starter post |
| `index.html` | Delete | Replaced by `src/pages/index.astro` |
| `img/**`, `css/custom.css`, `script.js`, `matthew-mcguff-resume-2026.pdf` | Move → `public/` | Keep the same public URLs |
| `.github/workflows/deploy.yml` | New | Build/test on PRs; build/test/deploy on `master` |
| `vitest.config.ts` | New | Unit and dist-integration test config |
| `playwright.config.ts` | New | E2E against `astro preview` |
| `tests/helpers.ts`, `tests/fixtures/homepage-baseline.json` | New | Shared dist/source readers; snapshot of the original homepage's sections and 23 external links |
| `tests/unit/*.test.ts` | New | Schema, post filtering, consts/Giscus, workflow YAML, repo (starter post, readme, .gitignore) |
| `tests/integration/*.test.ts` | New | Assertions on `dist/` HTML/XML after build |
| `tests/e2e/*.spec.ts` | New | Browser checks (Giscus iframe, mobile overflow, resume) |
| `.gitignore` | Modify | Add `node_modules/`, `dist/`, `.astro/`, `test-results/`, `playwright-report/` (`.sdlc_state.md` already added) |
| `readme.MD` | Modify | Local dev commands + "Writing a post" guide; tick the blog checklist item |

## Test Strategy
Three layers: **unit** (Vitest, pure functions, no build); **integration** (Vitest, parsing the built `dist/` output after `npm run build`); and **E2E** (Playwright, Chromium, against `astro preview`).

| Acceptance Criteria | Test Type | Notes |
|----------------------|-----------|-------|
| AC1 build succeeds | Integration (CI) | `npm ci && npm run build` exit code in the workflow; the integration suite fails fast if `dist/index.html` is missing |
| AC2 homepage parity | Integration | Parse `dist/index.html`: section ids `portfolio`, `about`, `testimonals`, `contact` exist; every external `href` from the original `index.html` (snapshotted into a fixture list) is present; GA4 id present |
| AC3 resume + assets | Integration + E2E | Integration: `dist/matthew-mcguff-resume-2026.pdf`, `dist/favicon` and every `img` `src` on `/` exist on disk. E2E: GET the resume returns 200 with `application/pdf` |
| AC4 Blog nav link | Integration | Navbar has `a[href="/blog/"]` |
| AC5 blog index | Unit + Integration | Unit: `filterAndSortPosts` sorts newest first. Integration: `dist/blog/index.html` lists the starter post's title, date and description, linking to its page |
| AC6 post page | Integration | `dist/blog/rebuilding-my-site-with-astro/index.html` has the title, a `<time datetime>`, body content and `link[rel=canonical]` = absolute URL |
| AC7 schema enforcement | Unit | `blogSchema.safeParse` fails on a missing title/description/pubDate or a bad date, and the error path names the field; passes on valid data; `draft` defaults to `false` |
| AC8 drafts excluded | Unit | `filterAndSortPosts(..., { includeDrafts: false })` removes drafts. Because index, routes and RSS all go through this one function, the unit test covers all three; the manual test confirms end to end |
| AC9 RSS | Integration | Parse `dist/rss.xml` with `fast-xml-parser`: root `rss@version="2.0"`, one `item` per published post, absolute `https://mmcguff.github.io/blog/<slug>/` links, pubDate present; blog pages include the `application/rss+xml` alternate link |
| AC10 Giscus | Unit + Integration + E2E | Unit: Giscus config has no `TODO` placeholders. Integration: post HTML has the `giscus.app/client.js` script with `data-repo="mmcguff/mmcguff.github.io"` and `data-mapping="pathname"`. E2E: the `iframe.giscus-frame` appears (network-dependent; can be marked `@flaky`/skipped offline) |
| AC11 CI/CD | Unit + Manual | Unit: parse `deploy.yml` (triggers, permissions, step order, upload of `dist/`, deploy job guarded against PRs). Manual: a real PR run and a deploy after merge |
| AC12 starter post + readme | Unit + Manual | Unit: exactly one non-draft `.mdx` entry in `src/content/blog/`; readme has a "Writing a post" section covering location, required fields, `draft: true`, `npm run dev`. Manual: readme authoring steps followed by hand create a working post |
| AC13 mobile | E2E | At a 375×812 viewport on `/blog/` and the post page: `document.documentElement.scrollWidth <= innerWidth` |

## Blessed Path Check
- This is a personal GitHub Pages site, so there's no Walmart blessed-path registry to apply. Instead, "blessed" here means **first-party Astro packages and documented recipes**: Content Layer `glob()` loader, `@astrojs/rss`, `@astrojs/mdx`, `@astrojs/sitemap`, the official GitHub Pages deploy guide (`actions/upload-pages-artifact` + `actions/deploy-pages`), and the official Giscus script embed.
- Existing component considered: Bulma (already on the site). It is reused for blog styling via `.content`.
- Verdict: **Reuse.** No custom libraries; the only new code is the thin layout and route files and one filter helper.

## Open Questions (design)
- Giscus `repoId`/`categoryId`: need Discussions enabled first. The unit test in AC10 will deliberately fail until they're filled in.
- Recruiter modal: it's in the markup but nothing currently opens it (`script.js` only binds `.js-modal-trigger`, and the modal has no `id`). It is ported unchanged; whether to remove it is left to #23.

## Implementation Notes (coder)
Deviations from the File Changes table, all small:
- **`src/components/BlogHeader.astro` (new):** shared header for the blog index and post pages (brand link home, Blog, RSS), styled with the homepage's `hero-image` pattern. The blog pages needed a way back to the homepage.
- **`tests/e2e/serve-dist.mjs` (new) + `playwright.config.ts` webServer change:** `astro preview` (Astro 7) moves itself to the background when stdout isn't a TTY, which Playwright treats as the server crashing. A ~50-line dependency-free Node static server for `dist/` replaces it.
- **Homepage markup fixes** needed for Astro's strict compiler, each chosen to match how browsers already render the old page (full-page screenshots of live vs. local are the same height at 1280px and 375px):
  - 64× `</br>` → `<br>` (browsers treat `</br>` as `<br>`);
  - removed a stray `</hr>`, a stray `</section>`, a stray `</i>`, and a stray `"` in `#hero-title`;
  - removed 4 unclosed outer `<a>` wrappers that browsers turned into empty links (on the Compliance.ai, Language Group, Traeger and Curriculum cards);
  - the About section's missing `</div></section>` is closed at the end of the page, where browsers closed it, so Testimonials and Contact stay nested exactly as they render today. #23 should fix this properly.
- **Redundant inline `<style>@import` Black Ops One** dropped from `<head>`; the same font is already loaded by the `<link>` tag.
- **Workflow** adds a Playwright report upload on failure and a `concurrency` group for Pages.
- **Giscus `repoId`** is filled in (`R_kgDOBYwOmw`, from the GitHub API). `categoryId` stays `TODO_FROM_GISCUS_APP` until Discussions is enabled, so 1 unit test stays red on purpose.
