import { expect, test, type Page, type Route } from '@playwright/test';

// #34: the contact form submits in the background and reports the result inline.
// Every Formspree call is stubbed, so CI never sends a real message.
const FORMSPREE = 'https://formspree.io/f/**';

async function fillForm(page: Page) {
  await page.goto('/');
  const form = page.locator('#contact-form');
  await form.locator('input[name="name"]').fill('Test Visitor');
  await form.locator('input[name="email"]').fill('visitor@example.com');
  await form.locator('textarea[name="message"]').fill('Hello from the E2E suite');
  return form;
}

const status = (page: Page) => page.locator('#contact-status');
const submit = (page: Page) => page.locator('#contact-form button[type="submit"]');

// AC5 + AC3 + AC4
test('a successful send shows a thank-you and clears the form', async ({ page }) => {
  let body = '';
  await page.route(FORMSPREE, async (route) => {
    body = route.request().postData() ?? '';
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  const form = await fillForm(page);
  const url = page.url();

  await submit(page).click();

  await expect(status(page)).toContainText(/thanks/i);
  expect(page.url()).toBe(url);
  await expect(form.locator('input[name="email"]')).toHaveValue('');
  await expect(form.locator('textarea[name="message"]')).toHaveValue('');
  expect(body).toContain('Something Else');
  expect(body).toContain('_gotcha');
});

// AC6
for (const [name, respond] of [
  ['a server error', (r: Route) => r.fulfill({ status: 500, contentType: 'application/json', body: '{}' })],
  ['a network failure', (r: Route) => r.abort('failed')],
  ['a rate limit', (r: Route) => r.fulfill({ status: 429, contentType: 'application/json', body: '{}' })],
] as const) {
  test(`${name} shows an error with the fallback email and keeps the input`, async ({ page }) => {
    await page.route(FORMSPREE, respond);
    const form = await fillForm(page);
    const url = page.url();

    await submit(page).click();

    await expect(status(page)).toContainText('devguff@gmail.com');
    await expect(status(page)).not.toContainText(/thanks/i);
    expect(page.url()).toBe(url);
    await expect(form.locator('input[name="email"]')).toHaveValue('visitor@example.com');
    await expect(form.locator('textarea[name="message"]')).toHaveValue('Hello from the E2E suite');
  });
}

test('a rate limit asks the visitor to try again later', async ({ page }) => {
  await page.route(FORMSPREE, (r) => r.fulfill({ status: 429, contentType: 'application/json', body: '{}' }));
  await fillForm(page);
  await submit(page).click();
  await expect(status(page)).toContainText(/try again/i);
});

// AC7
for (const field of ['input[name="email"]', 'textarea[name="message"]']) {
  test(`an empty ${field.match(/name="(\w+)"/)![1]} blocks the send`, async ({ page }) => {
    let calls = 0;
    await page.route(FORMSPREE, (r) => {
      calls++;
      return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
    const form = await fillForm(page);
    await form.locator(field).fill('');

    await submit(page).click();

    await expect(form.locator(`${field}:invalid`)).toHaveCount(1);
    expect(calls).toBe(0);
  });
}

// AC8
test('the Submit button is disabled while sending', async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route(FORMSPREE, async (route) => {
    await held;
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  await fillForm(page);

  await submit(page).click();
  await expect(submit(page)).toBeDisabled();

  release();
  await expect(status(page)).toContainText(/thanks/i);
  await expect(submit(page)).toBeEnabled();
});
