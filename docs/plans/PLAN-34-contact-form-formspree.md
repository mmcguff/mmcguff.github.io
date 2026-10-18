# Plan: #34 — Contact form stopped working after the move to devguff.com

Ticket: https://github.com/mmcguff/mmcguff.github.io/issues/34

## Problem Statement
The **Contact Me** form on the homepage posts to Formspree's legacy email-in-URL endpoint (`https://formspree.io/matthewmcguff85@gmail.com`). Formspree activates legacy forms per email and referring-site pair. The only activated pair is for `mmcguff.github.io`, so since the move to `devguff.com` (#24) every submission is rejected with `FORM_NOT_FOUND`, and recruiters and clients can't reach the owner. Legacy email forms are also deprecated, so re-activating the old endpoint isn't a durable fix. The visitor also gets no on-page confirmation either way, so a failure is easy to miss.

## Scope
**In scope:**
- Keep Formspree on the **free plan** (50 submissions/month): a dashboard form with a form ID, created by the owner, delivering to **devguff@gmail.com**.
- The form submits without leaving the page and shows an inline success message (fields cleared) or an inline error message.
- Browser-native validation: **email and message required**. Name is optional. Contact reason is optional and defaults to "Something Else" when not picked.
- Basic spam protection that works on the free plan, and Formspree only accepting submissions from `devguff.com`.
- A regression test that fails if the form goes back to an email-in-URL endpoint.

**Out of scope:**
- Paid Formspree features (custom redirects, advanced spam rules).
- Self-hosted alternatives (Cloudflare Worker, Turnstile, Email Routing) and other vendors. Revisit only if 50/month proves too few.
- Moving old Formspree submission history (owner can ask Formspree support separately).
- Redesigning the contact section or changing the recruiter modal.

## Acceptance Criteria
- [ ] AC1: Given the built homepage, when the contact form is inspected, then its action is a Formspree form-ID endpoint (`https://formspree.io/f/<id>`) and contains no email address.
- [ ] AC2: Given the built homepage, when the form fields are inspected, then `email` (type email) and `message` are `required`, and `name` and `contact_reason` are not.
- [ ] AC3: Given the contact-reason select, when no reason is chosen, then the submitted value is "Something Else". The "Contact Reason:" prompt option is never submitted as a value.
- [ ] AC4: Given the form, when it is inspected, then it includes Formspree's `_gotcha` honeypot field, hidden from sighted users and screen readers, and skipped by keyboard tab order.
- [ ] AC5: Given a visitor fills in a valid email and message, when they click Submit and Formspree returns success, then the page does not navigate, an inline success message appears, and the fields are cleared.
- [ ] AC6: Given Formspree returns an error or the network request fails, when the visitor submits, then the page does not navigate, an inline error message appears with a fallback (the email address), and the visitor's input is kept.
- [ ] AC7: Given the visitor leaves email or message empty, when they click Submit, then the browser blocks submission and no request is sent to Formspree.
- [ ] AC8: Given the Submit button, when a submission is in flight, then the button is disabled to prevent double sends.
- [ ] AC9: Given the Formspree dashboard form, when checked, then it delivers to devguff@gmail.com and its allowed domains are restricted to `devguff.com`.
- [ ] AC10: Given the live site https://devguff.com, when a real test message is submitted, then it arrives in devguff@gmail.com with the name, email, contact reason and message.
- [ ] AC11: Given the CI pipeline, when it runs on the PR, then unit, integration and E2E suites pass (E2E stubs the Formspree request; no real submissions from CI).

## Open Questions
- Formspree form ID: the owner creates the form at formspree.io and shares the `/f/<id>` URL before coding starts.
- Whether the free plan's domain restriction and reCAPTCHA settings need adjusting for background (AJAX) submits. The legacy form's response already mentioned "set a custom key or reCAPTCHA must be disabled". plan-how should confirm against current Formspree docs.

## Technical Design

**Pattern: progressive enhancement of the existing HTML form. No new dependencies.** The form stays a plain `<form method="POST" action="https://formspree.io/f/xkjoevpv">`, so it still works with JavaScript off (Formspree's own thank-you page). With JavaScript on, the existing `public/script.js` intercepts submit and posts `FormData` with `fetch` and `Accept: application/json`, which is Formspree's documented AJAX pattern (Context7, `/websites/help_formspree_io`). It then renders the result inline. Formspree also ships `@formspree/ajax`, but a ~30-line `fetch` handler in the script the page already loads avoids a new runtime dependency and a bundler change for one form.

**Recon:**
- Form: `src/pages/index.astro:806–858`, Bulma markup, no `id`, nothing `required`. The select's first option "Contact Reason:" has no `value`, so it submits that literal text today.
- `public/script.js` is loaded with `is:inline` at the end of the page and only handles the recruiter modal. The submit handler goes in the same `DOMContentLoaded` block.
- `tests/integration/homepage.test.ts:32` asserts only `form[action^="https://formspree.io/"]`, which the legacy URL also satisfies. It gets tightened.
- E2E serves `dist/` on `localhost:4321`. Playwright `page.route('https://formspree.io/f/**')` can stub every Formspree outcome without network or real submissions.

**Markup changes (`index.astro`):**
- `<form id="contact-form" method="POST" action="https://formspree.io/f/xkjoevpv">`.
- `email`: add `required`. `message`: add `required`. `name` unchanged.
- Select: the prompt becomes `<option value="Something Else" selected>Contact Reason:</option>`. It still shows the prompt, but an untouched select submits "Something Else" (AC3).
- Honeypot: `<input type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true" style="display:none">` (Formspree docs; AC4).
- Status line under the button: `<p id="contact-status" class="help" role="status" aria-live="polite"></p>`. Bulma `is-success` or `is-danger` is toggled on it.

**Script behavior (`public/script.js`):** on submit, `preventDefault`, disable the button and show "Sending…" (AC8).
- `response.ok` → `form.reset()`, then show success text "Thanks! Your message is on its way. I'll get back to you soon." (AC5).
- `429` → error text "Too many messages right now. Please try again in a few minutes, or email devguff@gmail.com."
- Any other non-OK response, or a thrown network error → "Sorry, your message couldn't be sent. Please email devguff@gmail.com." The fields are kept (AC6).
- `finally` re-enables the button.

Browser-native `required` and `type=email` validation run before the `submit` event fires, so empty or invalid submits never reach `fetch` (AC7).

**Formspree dashboard (owner, already partly done):** the form delivers to devguff@gmail.com (account email). Set **Restrict to Domain → `devguff.com`** in the project settings. Keep **reCAPTCHA off**, because Formspree's hosted reCAPTCHA only works with HTML redirects; the old form's response confirms AJAX requires it disabled or a custom key. Spam protection is the `_gotcha` honeypot plus Formspree's built-in free-plan filtering. Formspree also supports Cloudflare Turnstile, a possible follow-up if spam shows up.

**Rollback:** revert the PR. The old legacy endpoint is dead for `devguff.com` anyway, so rolling back restores nothing working. A forward fix is the only real fix.

## File Changes
| File | Change | Reason |
|------|--------|--------|
| `src/pages/index.astro` | Modify | Form-ID action, `id`, `required` on email/message, select default value, `_gotcha` honeypot, inline status element (AC1–AC4) |
| `public/script.js` | Modify | `fetch` submit handler with success, error, 429 and in-flight states (AC5–AC8) |
| `tests/integration/homepage.test.ts` | Modify | Tighten the Formspree assertion to a `/f/<id>` endpoint (AC1) |
| `tests/integration/contact-form.test.ts` | New | Built-HTML checks for action, required fields, select default and honeypot (AC1–AC4) |
| `tests/e2e/contact-form.spec.ts` | New | Stubbed Formspree: success, server error, network failure, 429, required-field block, button disabled in flight (AC5–AC8) |
| `docs/MANUAL_TEST_CASES-34-contact-form-formspree.md` | New (by test-builder) | Dashboard settings and a live end-to-end submission (AC9, AC10) |

## Test Strategy
| Acceptance Criteria | Test Type | Notes |
|----------------------|-----------|-------|
| AC1 Form-ID action | Integration | Action matches `^https://formspree\.io/f/[A-Za-z0-9]+$` and contains no `@`. Also the tightened `homepage.test.ts` assertion. |
| AC2 Required fields | Integration | `email[type=email][required]`, `message[required]`; `name` and `contact_reason` not required |
| AC3 Select default | Integration + E2E | Integration: the selected option's value is "Something Else". E2E: the captured request body has `contact_reason=Something Else` when untouched. |
| AC4 Honeypot | Integration + E2E | Integration: `_gotcha` input is `display:none`, `tabindex=-1`, `autocomplete=off`. E2E: posted body includes empty `_gotcha`. |
| AC5 Success | E2E | Route fulfils `200 {"ok":true}`. URL is unchanged, the status shows the success text, and the fields are empty. |
| AC6 Errors | E2E | Route fulfils `500` and `429`, and `route.abort()` for a network failure. URL is unchanged, the error text includes devguff@gmail.com, and the fields keep their values. |
| AC7 Validation | E2E | Click Submit with an empty email or message; the route handler is never called. |
| AC8 In flight | E2E | Delay the route response; the button is `disabled` while the request is pending and enabled afterward. |
| AC9 Dashboard | Manual | Formspree settings: recipient devguff@gmail.com, Restrict to Domain `devguff.com`, reCAPTCHA off |
| AC10 Live delivery | Manual | Submit one real message on https://devguff.com; it arrives in devguff@gmail.com with every field |
| AC11 CI | CI | PR run green. E2E never hits the real Formspree (all routes stubbed). |

## Blessed Path Check
- Existing component considered: Formspree's documented `fetch` AJAX pattern, and the `@formspree/ajax` library.
- Verdict: **Reuse** Formspree as the backend, with a native `fetch` handler in the existing `script.js` rather than adding `@formspree/ajax`. One form doesn't justify a new dependency and bundling. Walmart @blessedpath/@mando don't apply to this personal repo.
