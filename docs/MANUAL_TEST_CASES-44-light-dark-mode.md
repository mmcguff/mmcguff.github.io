# Manual Test Cases — #44 Light and dark mode toggle

Ticket: https://github.com/mmcguff/mmcguff.github.io/issues/44 · Plan: [PLAN-44-light-dark-mode.md](plans/PLAN-44-light-dark-mode.md)

Hard-refresh (or use a private tab) so the new `theme.css` and toggle script load.

| # | AC | Steps | Expected Result | Environment |
|---|----|-------|------------------|-------------|
| 1 | AC1 | Set the phone to Dark appearance, open https://devguff.com/ in a private tab. Repeat with Light. | The site opens dark (resp. light) with no flash of the other theme while it loads. | Production, phone |
| 2 | AC2 | On the home page at phone width, look at the top bar without opening the hamburger menu. | A moon button (light mode) or sun button (dark mode) is next to the hamburger. Tap it: the whole page switches theme. | Production, phone |
| 3 | AC2 | Open /blog/ and a post. | The same toggle is at the right of the top bar and works. | Production, phone |
| 4 | AC2 | On desktop, Tab to the toggle and press Enter, then Space. | A visible focus ring shows; each key flips the theme. | Production, desktop |
| 5 | AC2 | iOS VoiceOver / TalkBack on the toggle. | Announced as "Dark mode, toggle button", "on" when dark. | Production, phone |
| 6 | AC3 | Switch to dark, go Home → Blog → a post, then close the tab and reopen the site. | It stays dark everywhere and after reopening, even if the device is set to light. | Production |
| 7 | AC3 | In a browser with site data/cookies blocked, tap the toggle. | The current page still switches theme; no errors. | Production |
| 8 | AC4 | Open a post (comments load) with the device dark, then tap the toggle to light, then back. | The Giscus box is dark when the site is dark and light when light, switching instantly with the toggle, with no reload. | Production |
| 9 | AC4 | Device dark, but choose light with the toggle, then reload the post. | The page and the Giscus box are both light. | Production |
| 10 | AC5 | In each theme scan the home page: hero and buttons, project cards and logos, tags, testimonials, contact form (inputs, dropdown, Submit), the recruiter modal (tap the page's Welcome Recruiters trigger if present). | Everything is readable; logos sit on a light plate in dark mode; nothing is white-on-white or dark-on-dark. | Production |
| 11 | AC5 | In each theme read a post: code blocks, inline code, the blue callout, links. | Code blocks have a border and readable colours; the callout follows the theme. | Production |
