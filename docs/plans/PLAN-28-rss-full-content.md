# Plan: #28 — Include full post content in the RSS feed (content:encoded)

Ticket: https://github.com/mmcguff/mmcguff.github.io/issues/28

## Problem Statement
`src/pages/rss.xml.js` emits only `title`, `description`, `pubDate` and `link` per item. Feed importers (DEV.to, Hashnode, Medium) and feed readers use the item body, so cross-posting from `https://devguff.com/rss.xml` would produce a one-paragraph stub instead of the article, and the "own the canonical copy, syndicate the rest" workflow from #18 doesn't work. Posts are MDX, so the body has to be rendered the same way the post page renders it, not just run through a Markdown parser.

## Scope
**In scope:**
- Each published post's RSS item gets a `<content:encoded>` element with the post's full rendered HTML, rendered the same way the post page renders it (MDX, including any components), using Astro's container API.
- Code blocks in feed HTML are plain `<pre><code>` (language preserved where available), without Shiki's inline colour styles and token spans.
- Relative URLs in feed content (`href`/`src` starting with `/`, e.g. `/rss.xml`, images in `public/`) become absolute `https://devguff.com/...`. Fragment-only links (`#section`) point at the post URL.
- Feed content doesn't contain page chrome (nav, header, Giscus, scripts) or `<script>`/`<style>` elements.
- Drafts stay out of the feed (unchanged).
- Existing `description`, `pubDate`, `link` and `title` stay as they are.

**Out of scope:**
- Setting up the DEV.to, Hashnode or Medium imports themselves.
- Hero images or `<enclosure>`/media elements.
- Changing how post pages render.
- A separate summary-only feed.

## Acceptance Criteria
- [ ] AC1: Given `dist/rss.xml`, when parsed, then the channel declares the `content` namespace (`xmlns:content="http://purl.org/rss/1.0/modules/content/"`) and every item has a non-empty `content:encoded`.
- [ ] AC2: Given a published post's item, when its `content:encoded` HTML is parsed, then it contains the post's body: every `##` heading's text and the text of its first and last paragraphs, as written in the source file.
- [ ] AC3: Given feed content, when parsed, then every `<pre>` contains a `<code>` child, and no element has a `style` attribute or Shiki classes (`astro-code`, `shiki`, `line`).
- [ ] AC4: Given feed content, when every `href` and `src` is collected, then each is absolute (`https://` or `mailto:`). The in-site ones start with `https://devguff.com/`, and none start with `/` or `#`.
- [ ] AC5: Given feed content, when parsed, then it contains no `<script>`, `<style>`, `<iframe>`, `<nav>` or Giscus markup, and no `<h1>` (the title is already the item title).
- [ ] AC6: Given a draft post exists, when the feed is built, then the draft's body doesn't appear in any item's content (extends the existing draft test).
- [ ] AC7: Given the existing RSS tests (valid RSS 2.0, item count, absolute links, pubDate, autodiscovery), when run, then they still pass.
- [ ] AC8: Given `npm run check`, when run, then it reports 0 errors and 0 warnings.
- [ ] AC9: Given the deployed feed, when validated with the W3C Feed Validation Service, then it's valid RSS (warnings acceptable).

## Open Questions
- None.

## Technical Design

**Pattern: render with Astro, clean with one sanitizer, all at build time inside the existing endpoint.**

1. **Render.** In `src/pages/rss.xml.js`, create one `experimental_AstroContainer` with the MDX container renderer (`loadRenderers([getContainerRenderer()])` from `astro:container` + `@astrojs/mdx/container-renderer`). For each published post, `render(post)` (`astro:content`), then `container.renderToString(Content)`. This is the same `Content` component the post page renders, so MDX components, remark/rehype plugins and smart quotes all match the page, but without the layout (no `<h1>`, nav, header or Giscus). **Spike-verified 2026-10-18 on Astro 7.4.0:** builds clean, ~9.3 KB of HTML for the starter post, and `@astrojs/rss` adds `xmlns:content` automatically when `content` is set.
2. **Clean.** A new pure function `toFeedHtml(html: string, postUrl: URL): string` in `src/lib/feed-html.ts`:
   - **Code blocks:** rewrite Shiki's `<pre class="astro-code …" style="…" data-language="ts"><code>` to `<pre><code class="language-ts">`, then let the sanitizer drop Shiki's token `<span>`s while keeping their text.
   - **Sanitize** with `sanitize-html`. Allowed tags are its defaults **minus** `span`, `nav` and `h1`, **plus** `img`. Allowed attributes are `a[href,title]`, `img[src,alt,title,width,height]`, `h2–h6[id]`, and `code[class]` limited to `language-*`. No `style` anywhere. `script`/`style`/`iframe` are removed with their contents (sanitize-html's `nonTextTags`). Schemes: `http`, `https`, `mailto`.
   - **Absolute URLs:** `transformTags` on `a` and `img` resolves `href`/`src` with `new URL(value, postUrl)`, so `/rss.xml` becomes `https://devguff.com/rss.xml` and `#section` becomes `https://devguff.com/blog/<slug>/#section`. Absolute and `mailto:` URLs pass through.
3. **Wire up:** `content: toFeedHtml(html, new URL(`/blog/${post.id}/`, context.site))` on each item. Everything else in the item is unchanged.

**Why these choices:**
- **Container API over markdown-it:** owner decision. It's the only way MDX renders exactly like the page. `experimental_` means the name may change on an Astro upgrade, but the integration tests fail loudly if it does, and the container is used in one place.
- **sanitize-html:** this is Astro's own RSS recipe dependency. One library covers tag/attribute stripping, script removal and URL rewriting. Hand-rolled regex would be fragile for anything beyond the Shiki `<pre>` rewrite. The repo already has `ultrahtml` and `htmlparser2`, but only as undeclared transitive dependencies, so they shouldn't be relied on.
- **Versions:** `sanitize-html@2.18.0` (2026-09-30). The newest, 2.18.1, is only 4 days old, so it's skipped for supply-chain safety; npm will lock exactly 2.18.0. Plus `@types/sanitize-html@2.16.2` (devDependency), because `src/lib/feed-html.ts` is strict TypeScript and `astro check` (#29) needs the types. `sanitize-html` is a runtime `dependency` (used by the build), matching how `@astrojs/rss` is declared.
- **Pure function in `src/lib`:** this mirrors `post-utils.ts`. The cleaning rules are unit-testable without a build, and `rss.xml.js` stays a thin endpoint.

**Rollback:** revert the PR. The feed goes back to summary-only and nothing else depends on it.

## File Changes
| File | Change | Reason |
|------|--------|--------|
| `src/pages/rss.xml.js` | Modify | Container render per post, plus `content: toFeedHtml(…)` (AC1, AC2) |
| `src/lib/feed-html.ts` | New | `toFeedHtml()`: Shiki → plain code, sanitize, absolute URLs (AC3–AC5) |
| `package.json` / `package-lock.json` | Modify | `sanitize-html@^2.18.0` (dependency), `@types/sanitize-html@^2.16.2` (devDependency) |
| `tests/unit/feed-html.test.ts` | New | Fixture-driven tests of each cleaning rule (AC3–AC5) |
| `tests/integration/rss.test.ts` | Modify | `content:encoded` present and complete, clean and absolute on the built feed; drafts excluded (AC1–AC7) |
| `tests/unit/package.test.ts` | Modify | Dependency placement for `sanitize-html` and its types |
| `docs/MANUAL_TEST_CASES-28-rss-full-content.md` | New (by test-builder) | W3C validator and feed-reader spot check (AC9) |

## Test Strategy
| Acceptance Criteria | Test Type | Notes |
|----------------------|-----------|-------|
| AC1 namespace + content | Integration | `dist/rss.xml` root has `xmlns:content`; every item has a non-empty `content:encoded` |
| AC2 full body | Integration | From the source `.mdx` (outside code fences), every `## ` heading's text appears as an `h2` in the content, and the first paragraph's text (Markdown stripped) appears |
| AC3 plain code | Unit + Integration | Unit: a Shiki fixture becomes `<pre><code class="language-ts">` with no spans or styles. Integration: built content has no `style`, `astro-code`, `shiki` or `line` classes, and every `pre` has a `code` child. |
| AC4 absolute URLs | Unit + Integration | Unit: `/x` → `https://devguff.com/x`, `#a` → post URL `#a`, `https://…` and `mailto:` unchanged, `img` too. Integration: every built `href`/`src` matches `^(https://|mailto:)`. |
| AC5 no chrome/unsafe | Unit + Integration | Unit: `script`, `style`, `iframe`, `nav`, `h1` and inline `on*` handlers removed. Integration: none in the built content, no `giscus`. |
| AC6 drafts | Integration | Existing draft test, extended: no item content contains a draft's title. Covered when a draft exists. |
| AC7 regressions | Integration | Existing `rss.test.ts` cases unchanged |
| AC8 types | CI | `npm run check` step from #29 |
| AC9 valid feed | Manual | W3C Feed Validation Service on https://devguff.com/rss.xml after deploy |

## Blessed Path Check
- Existing components considered: `@astrojs/rss`'s `content` field; Astro's container API with `@astrojs/mdx/container-renderer`; `sanitize-html` from Astro's RSS recipe.
- Verdict: **Reuse**. All the pieces are Astro-documented. The only custom code is the small `toFeedHtml` cleanup policy. Walmart @blessedpath/@mando don't apply.
