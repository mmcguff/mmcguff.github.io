# Manual Test Cases — #34 Contact form (Formspree)

Ticket: https://github.com/mmcguff/mmcguff.github.io/issues/34 · Plan: [PLAN-34-contact-form-formspree.md](plans/PLAN-34-contact-form-formspree.md)

Formspree form: `https://formspree.io/f/xkjoevpv`, owner account devguff@gmail.com, free plan (50 submissions/month). Every real submission below uses one of those 50.

| # | AC | Steps | Expected Result | Environment |
|---|----|-------|------------------|-------------|
| 1 | AC9 | Formspree dashboard → the form → **Settings** | Recipient is devguff@gmail.com. reCAPTCHA is **off**. | Formspree |
| 2 | AC9 | Formspree dashboard → project **Settings → Restrict to Domain** | `devguff.com` | Formspree |
| 3 | AC10 | After deploy, open https://devguff.com/#contact. Fill name, email, pick "Consultancy", type a message, and click **Submit**. | The page stays put, the button shows it's sending, then a thank-you message appears and the fields clear. | Production |
| 4 | AC10 | Check the devguff@gmail.com inbox (and spam). | One email from Formspree with name, email, `contact_reason: Consultancy` and the message. Replying goes to the visitor's email. | Production |
| 5 | AC3 | Submit again without touching Contact Reason. | The email shows `contact_reason: Something Else`. | Production |
| 6 | AC7 | Clear the email field and click Submit. | The browser shows "Please fill in this field" and nothing is sent (no new email, and the Formspree submission count is unchanged). | Production |
| 7 | AC6 | DevTools → Network → set **Offline**, then submit. | An inline error mentions devguff@gmail.com, and the typed text is still there. | Production |
| 8 | AC9 | From a terminal: `curl -s -X POST -H 'Accept: application/json' -H 'Referer: https://example.com/' -d 'email=t@example.com&message=x' https://formspree.io/f/xkjoevpv` | Rejected (domain restriction). No email arrives. | External |
| 9 | — | Optional: Formspree dashboard → **Submissions** | The test submissions from #3 and #5 are listed and marked not spam. | Formspree |
