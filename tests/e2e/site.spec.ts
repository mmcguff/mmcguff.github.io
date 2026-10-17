import { expect, test } from '@playwright/test';
import { getPublishedSourcePosts } from '../helpers';

const [firstPost] = getPublishedSourcePosts();
const postPath = () => `/blog/${firstPost.id}/`;

// AC3
test('resume PDF downloads from the homepage link', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('a[href$="matthew-mcguff-resume-2026.pdf"]').first().getAttribute('href');
  const response = await request.get(new URL(href!, page.url()).toString());
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/pdf');
});

// AC4 + AC5
test('Blog nav link opens the blog index, which links to the starter post', async ({ page }) => {
  await page.goto('/');
  await page.locator('.navbar a.navbar-item', { hasText: /blog/i }).click();
  await expect(page).toHaveURL(/\/blog\/$/);
  await page.locator(`a[href="${postPath()}"]`).first().click();
  await expect(page).toHaveURL(new RegExp(`${postPath()}$`));
  await expect(page.locator('h1').first()).toHaveText(firstPost.data.title);
});

// AC10: needs network access to giscus.app.
test('Giscus comments load on a post @network', async ({ page }) => {
  await page.goto(postPath());
  await expect(page.locator('iframe.giscus-frame')).toBeAttached({ timeout: 15_000 });
});

// AC13
test.describe('mobile layout (375px)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  for (const path of ['/blog/', 'POST']) {
    test(`${path === 'POST' ? 'post page' : path} has no horizontal scroll`, async ({ page }) => {
      await page.goto(path === 'POST' ? postPath() : path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
