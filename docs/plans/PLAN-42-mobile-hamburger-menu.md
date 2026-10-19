# Plan: #42 Mobile hamburger menu doesn't open

Ticket: https://github.com/mmcguff/mmcguff.github.io/issues/42 · Branch: `42-mobile-hamburger-menu`

## Problem Statement
On narrow screens (Bulma's touch breakpoint, < 1024px), the home page nav collapses behind a hamburger icon, and tapping the icon does nothing. Bulma is CSS-only and the site has no handler that toggles the menu. Mobile visitors can't reach Experience, About, Testimonials or, most importantly, the Blog from the nav. The hamburger is also a bare `<span>`, so it can't be reached by keyboard and isn't announced to screen readers.

## Scope
**In scope:**
- The home page navbar (`src/pages/index.astro`): opening and closing the collapsed menu at mobile and tablet widths.
- Keyboard and screen-reader accessibility of the hamburger.
- Closing the menu after an in-page link is used.
- Tests covering the above.

**Out of scope:**
- The latest-post link in the hero (#43) and theming (#44).
- Restyling the navbar or changing its links.
- Blog pages: they use `BlogHeader.astro`, which has no hamburger.

## Acceptance Criteria
- [ ] AC1: Given the home page at 375px wide, when the hamburger is tapped, then the nav menu becomes visible with the Experience, About, Testimonials and Blog links.
- [ ] AC2: Given the menu is open, when the hamburger is tapped again, then the menu is hidden.
- [ ] AC3: Given the menu is open at 375px, when Blog is tapped, then the browser navigates to `/blog/`.
- [ ] AC4: Given the menu is open at 375px, when an in-page link (e.g. About) is tapped, then the page scrolls to that section and the menu closes.
- [ ] AC5: Given the built home page, when its markup is inspected, then the hamburger is a `<button type="button">` with an `aria-label`, `aria-controls="navbarMenuHeroA"` and `aria-expanded="false"`.
- [ ] AC6: Given the home page at 375px, when the hamburger is opened and closed, then `aria-expanded` reads `"true"` while open and `"false"` while closed.
- [ ] AC7: Given the home page at 375px, when the hamburger is focused with the keyboard and Enter or Space is pressed, then the menu toggles.
- [ ] AC8: Given the home page at desktop width (1280px), when it loads, then the hamburger is hidden and all nav links are visible inline without any interaction (unchanged from today).
- [ ] AC9: Given the hamburger is now a `<button>`, when it's shown at 375px, then it looks the same as before: no default button border or background, and the three bars sit in the same place.

## Open Questions
- None.

## Technical Design

Follow Bulma's documented navbar pattern. Bulma ships the burger CSS but leaves the JavaScript to the site.

1. **Markup (`src/pages/index.astro`):** replace `<span class="navbar-burger burger" data-target="navbarMenuHeroA">` with
   `<button type="button" class="navbar-burger burger" data-target="navbarMenuHeroA" aria-label="Menu" aria-controls="navbarMenuHeroA" aria-expanded="false">`.
   Keep the three inner `<span>`s, which are the bars.
   - **Why a `<button>`:** it gives focus, Enter and Space activation, and a button role for free (AC5, AC7), with no keydown handling of our own.
   - **No CSS needed for AC9:** Bulma 0.9.4 already resets `.navbar-burger` buttons (`appearance: none; background: none; border: none; padding: 0; font: inherit; color: currentColor`; checked in the 0.9.4 `bulma.css`). It keeps `display: block` below 1024px and `display: none` from 1024px up, so desktop doesn't change (AC8).
2. **Behaviour (`public/script.js`, inside the existing `DOMContentLoaded` handler, next to the modal code and in the same style):**
   - For each `.navbar-burger`, a click toggles `is-active` on the burger and on its `data-target` menu, and sets `aria-expanded` to match (AC1, AC2, AC6). Bulma's `.navbar-menu.is-active` shows the menu on touch widths.
   - Clicking any `a` inside an active `.navbar-menu` removes `is-active` and resets `aria-expanded="false"` (AC4). The browser still follows the link, so `/blog/` navigates normally (AC3).
   - No new files, no dependencies, and no inline handlers.
3. The hero already renders before `script.js` runs, so there's no new loading order to worry about. Until the script loads, the menu is simply closed, as it is today.

## File Changes
| File | Change | Reason |
|------|--------|--------|
| `src/pages/index.astro` | Modify | The burger becomes an accessible `<button>` with ARIA attributes. |
| `public/script.js` | Modify | Burger toggle and close-on-link handler. |
| `tests/integration/homepage.test.ts` | Modify | AC5: burger markup and ARIA in the built `index.html`. |
| `tests/e2e/mobile-nav.spec.ts` | New | AC1–AC4 and AC6–AC9 at 375px and 1280px. |

## Test Strategy
| Acceptance Criteria | Test Type | Notes |
|----------------------|-----------|-------|
| AC1 | E2E (Playwright, 375px) | Menu links hidden → tap burger → Experience/About/Testimonials/Blog visible. |
| AC2 | E2E (375px) | Tap again → the menu is hidden. |
| AC3 | E2E (375px) | Open → tap Blog → URL is `/blog/`. |
| AC4 | E2E (375px) | Open → tap About → the `#about` section is in the viewport and the menu is hidden. |
| AC5 | Integration (cheerio on `dist/index.html`) | `button.navbar-burger[type=button]` with `aria-label`, `aria-controls="navbarMenuHeroA"`, `aria-expanded="false"`; the target id exists. |
| AC6 | E2E (375px) | `aria-expanded` is `true` after opening and `false` after closing. |
| AC7 | E2E (375px) | `focus()` the burger, then press Enter (opens) and Space (closes). |
| AC8 | E2E (1280px) | The burger is hidden and the Blog link is visible without interaction. The existing `site.spec.ts` desktop Blog test still passes. |
| AC9 | E2E (375px) | The burger's computed `border-style` is `none` and its background is transparent; its bounding box sits at the right edge of the navbar brand. |

## Blessed Path Check
- **Existing component considered:** Bulma 0.9.4's navbar (CSS already loaded) and its documented burger-toggle snippet; the existing `DOMContentLoaded` block in `public/script.js`.
- **Verdict: Reuse.** Bulma's own pattern and the existing script. No new library, no new script file.
