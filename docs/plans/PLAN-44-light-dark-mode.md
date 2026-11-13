# Plan: #44 Light and dark mode toggle (match Giscus to the site theme)

Ticket: https://github.com/mmcguff/mmcguff.github.io/issues/44 · Branch: `44-light-and-dark-mode-toggle-match-giscus-to-the-site-theme`

## Problem Statement
The site only has a light theme. Giscus uses `data-theme="preferred_color_scheme"`, so on a device set to dark mode the comments render dark inside a light page, which looks broken.

## Scope
**In scope:** light and dark themes for the home page, blog index and blog posts; a toggle; remembering the choice; no flash of the wrong theme; Giscus following the theme; AA contrast in both themes; tests.

**Out of scope:** the Calendly widget's own styling, third-party iframes (Loom), new blog features (#43), upgrading Bulma.

## Acceptance Criteria
- [ ] AC1: First visit follows `prefers-color-scheme`.
- [ ] AC2: A visible toggle (`<button>`, `aria-pressed`, accessible name) is on the home page, blog index and posts, reachable on mobile without opening the hamburger, keyboard operable.
- [ ] AC3: The choice persists across pages and reloads (`localStorage` inside try/catch), and the theme is set before first paint.
- [ ] AC4: Giscus matches the site theme on load (`data-theme` from the current theme) and on toggle (`postMessage` `setConfig`).
- [ ] AC5: Both themes meet WCAG AA contrast for text, links, buttons, cards, code blocks, the contact form and the hero.
- [ ] AC6: Unit/integration tests cover the toggle markup and the pre-paint script; E2E tests (light and dark `colorScheme`) cover the initial theme, persistence across reload, and Giscus `data-theme`.

## Open Questions
- None. Decision on Bulma: stay on 0.9.4 and add CSS overrides (see design).

## Technical Design
- **Bulma stays on 0.9.4.** Upgrading to 1.x would restyle the whole site (and risk the homepage baseline) for a p2 issue. A small override stylesheet keyed on `html[data-theme="dark"]` is enough.
- **`src/lib/theme.ts`** is the single source of truth: `THEME_STORAGE_KEY`, the `Theme` type, `GISCUS_ORIGIN`, and `THEME_INIT_SCRIPT` (the tiny pre-paint script string). Unit-tested by evaluating the script against stubbed `localStorage`/`matchMedia`.
- **`BaseLayout.astro`** inlines `THEME_INIT_SCRIPT` in `<head>` before the stylesheets, so `<html data-theme>` is set before first paint, and loads `/css/theme.css` after Bulma.
- **`ThemeToggle.astro`** is a `<button type="button" aria-pressed aria-label="Dark mode">` with a CSS-only icon. A bundled `<script>` flips `data-theme`, saves it (try/catch), updates `aria-pressed` and posts `setConfig` to the giscus iframe. Used in the home navbar brand (next to the hamburger) and in `BlogHeader`, so it is always visible on mobile.
- **`Comments.astro`** keeps the static Giscus `<script>` (so its attributes stay testable) and an inline script right after it sets `data-theme` from the current theme before the async client runs.
- **`public/css/theme.css`** overrides Bulma surface/text/link/form/box/tag/button colours for dark, and darkens the few light-theme colours that fail AA (hero grey, success/danger help text, coloured buttons). Logos get a light plate in dark mode.
- **Shiki** switches to dual themes (`github-light-default` / `github-dark-default`) with CSS variables so code blocks follow the site theme. RSS already strips code styles, so the feed is unaffected.

## File Changes
| File | Change | Reason |
|------|--------|--------|
| `src/lib/theme.ts` | New | Constants and pre-paint script. |
| `src/components/ThemeToggle.astro` | New | The toggle and its behaviour. |
| `src/layouts/BaseLayout.astro` | Modify | Pre-paint script and theme stylesheet. |
| `src/components/BlogHeader.astro`, `src/pages/index.astro` | Modify | Place the toggle. |
| `src/components/Comments.astro` | Modify | Giscus `data-theme` from the current theme. |
| `public/css/theme.css` | New | Dark theme and AA fixes. |
| `astro.config.mjs` | Modify | Shiki dual themes. |
| `tests/unit/theme.test.ts`, `tests/integration/theme.test.ts`, `tests/e2e/theme.spec.ts` | New | Coverage for AC1-AC6. |

## Test Strategy
| Acceptance Criteria | Test Type | Notes |
|---------------------|-----------|-------|
| AC1, AC3 (pre-paint) | Unit | Evaluate `THEME_INIT_SCRIPT` with stubs: stored value wins, falls back to media query, survives throwing storage. |
| AC2, AC4 (markup) | Integration (cheerio on dist) | One toggle button per page type with `aria-pressed`/name; pre-paint script is inline in `<head>` before the stylesheets; Giscus tag no longer uses `preferred_color_scheme`. |
| AC1, AC3, AC4 | E2E (Playwright, light and dark `colorScheme`) | Initial theme, toggle, persistence over reload and across pages, keyboard use, mobile visibility, Giscus `data-theme`/`postMessage`. |
| AC5 | E2E | Computed-style contrast check of visible text in both themes on home, blog index and post. |

## Blessed Path Check
- **Considered:** Bulma 1.x built-in dark mode; Astro/Shiki dual-theme support; plain CSS custom properties.
- **Verdict: Reuse** the platform (CSS, `data-theme`, `prefers-color-scheme`) and Shiki's built-in dual themes. No new dependencies.
