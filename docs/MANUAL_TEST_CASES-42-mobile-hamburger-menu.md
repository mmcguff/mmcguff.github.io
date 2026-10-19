# Manual Test Cases — #42 Mobile hamburger menu

Ticket: https://github.com/mmcguff/mmcguff.github.io/issues/42 · Plan: [PLAN-42-mobile-hamburger-menu.md](plans/PLAN-42-mobile-hamburger-menu.md)

| # | AC | Steps | Expected Result | Environment |
|---|----|-------|------------------|-------------|
| 1 | AC1, AC3 | On your phone, open https://devguff.com/ (hard-refresh or use a private tab so the new `script.js` loads). Tap ☰, then tap **Blog**. | The menu drops down with Experience, About, Testimonials and Blog. Blog opens https://devguff.com/blog/. | Production, phone |
| 2 | AC2 | Tap ☰ twice. | The menu opens, then closes. The icon turns into an ✕ while open (Bulma's active burger). | Production, phone |
| 3 | AC4 | Tap ☰ → **About**. | The page scrolls to About and the menu closes. | Production, phone |
| 4 | AC5–AC7 | iOS VoiceOver (or Android TalkBack): swipe to the menu button and double-tap. | It's announced as "Menu, button, collapsed", and after the double-tap "expanded". | Production, phone |
| 5 | AC8 | Desktop browser wider than 1024px. | No ☰. The nav links show inline at the top right, as before. | Production, desktop |
| 6 | AC9 | Compare the ☰ on the phone with before the change. | Same position (top right) and same look: no grey button box or border. | Production, phone |
