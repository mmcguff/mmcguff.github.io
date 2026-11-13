import { expect, test, type Page } from '@playwright/test';
import { getPublishedSourcePosts } from '../helpers';
import { findLowContrast } from './contrast';

const [firstPost] = getPublishedSourcePosts();
const PAGES = [
  { name: 'home page', path: '/' },
  { name: 'blog index', path: '/blog/' },
  { name: 'blog post', path: `/blog/${firstPost.id}/` },
];

const theme = (page: Page) => page.locator('html').getAttribute('data-theme');
const toggle = (page: Page) => page.getByRole('button', { name: 'Dark mode' });

// AC1: first visit follows the device setting, on every page type.
for (const scheme of ['light', 'dark'] as const) {
  test.describe(`device prefers ${scheme}`, () => {
    test.use({ colorScheme: scheme });

    for (const { name, path } of PAGES) {
      test(`${name} starts ${scheme} with a matching toggle state`, async ({ page }) => {
        await page.goto(path);
        await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
        await expect(toggle(page)).toHaveAttribute('aria-pressed', String(scheme === 'dark'));
      });
    }
  });
}

// AC3: no flash. The theme is set by the inline script even if the bundled scripts never load.
test('theme is set before any bundled script runs', async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: 'dark' });
  const page = await context.newPage();
  await page.route('**/_astro/**', (route) => route.abort());
  await page.goto('/blog/');
  expect(await theme(page)).toBe('dark');
  await context.close();
});

test.describe('toggling', () => {
  test.use({ colorScheme: 'light' });

  test('flips the theme, the pressed state, and the page colours', async ({ page }) => {
    await page.goto('/blog/');
    // Bulma paints the page colour on <html>, not <body>.
    const pageBg = () => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    const lightBg = await pageBg();
    await toggle(page).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
    expect(await pageBg()).not.toBe(lightBg);
    await toggle(page).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
    expect(await pageBg()).toBe(lightBg);
  });

  test('is operable with the keyboard', async ({ page }) => {
    await page.goto('/blog/');
    await toggle(page).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.keyboard.press('Space');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('choice survives a reload and carries across pages', async ({ page }) => {
    await page.goto('/');
    await toggle(page).click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
    await page.goto('/blog/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.goto(PAGES[2].path);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('an explicit choice beats the device setting on the next visit', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark' });
    const page = await context.newPage();
    await page.goto('/blog/');
    await toggle(page).click(); // dark -> light
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await context.close();
  });

  test('still works when localStorage is blocked', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('blocked', 'SecurityError');
        },
      });
    });
    await page.goto('/blog/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await toggle(page).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(errors).toEqual([]);
  });
});

// AC2: reachable on mobile without opening the hamburger.
test.describe('mobile (375px)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  for (const { name, path } of PAGES) {
    test(`${name}: toggle is visible, inside the viewport, and big enough to tap`, async ({ page }) => {
      await page.goto(path);
      await expect(toggle(page)).toBeVisible();
      const box = await toggle(page).boundingBox();
      expect(box!.x + box!.width).toBeLessThanOrEqual(375);
      expect(box!.width).toBeGreaterThanOrEqual(24);
      expect(box!.height).toBeGreaterThanOrEqual(24);
    });
  }

  // The home page already scrolls sideways on main (tag pills, testimonials); only guard pages that were clean.
  for (const { name, path } of PAGES.slice(1)) {
    test(`${name}: the toggle does not make the page scroll sideways`, async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('home: toggling works with the hamburger menu closed', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#navbarMenuHeroA')).not.toHaveClass(/is-active/);
    await toggle(page).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});

// AC4: Giscus follows the site theme.
test.describe('Giscus', () => {
  const giscusTag = (page: Page) => page.locator('script[src="https://giscus.app/client.js"]');

  for (const scheme of ['light', 'dark'] as const) {
    test.describe(`device prefers ${scheme}`, () => {
      test.use({ colorScheme: scheme });

      test('data-theme matches the site theme on load', async ({ page }) => {
        await page.route('https://giscus.app/**', (route) => route.abort());
        await page.goto(PAGES[2].path);
        await expect(giscusTag(page)).toHaveAttribute('data-theme', scheme);
      });
    });
  }

  test('an explicit stored choice wins for the initial Giscus theme', async ({ page }) => {
    await page.route('https://giscus.app/**', (route) => route.abort());
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto(PAGES[2].path);
    await expect(giscusTag(page)).toHaveAttribute('data-theme', 'dark');
  });

  test('toggling posts a setConfig message to the giscus iframe', async ({ page }) => {
    await page.route('https://giscus.app/**', (route) => route.abort());
    await page.goto(PAGES[2].path);
    // Stand in for the real iframe so the test doesn't need the network.
    await page.evaluate(() => {
      const frame = document.createElement('iframe');
      frame.className = 'giscus-frame';
      document.body.append(frame);
      const sent: unknown[] = [];
      (window as unknown as { __sent: unknown[] }).__sent = sent;
      frame.contentWindow!.postMessage = ((message: unknown, origin: string) => {
        sent.push({ message, origin });
      }) as typeof window.postMessage;
    });
    await toggle(page).click();
    const sent = await page.evaluate(() => (window as unknown as { __sent: unknown[] }).__sent);
    expect(sent).toEqual([{ message: { giscus: { setConfig: { theme: 'dark' } } }, origin: 'https://giscus.app' }]);
  });

  test.describe('real iframe @network', () => {
    test.use({ colorScheme: 'dark' });

    test('loads with the dark theme and follows the toggle', async ({ page }) => {
      await page.goto(PAGES[2].path);
      const frame = page.locator('iframe.giscus-frame');
      await expect(frame).toBeAttached({ timeout: 15_000 });
      expect(await frame.getAttribute('src')).toContain('theme=dark');
    });
  });
});

// AC5: text meets AA in both themes.
for (const scheme of ['light', 'dark'] as const) {
  test.describe(`contrast with ${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    for (const { name, path } of PAGES) {
      test(`${name} text meets WCAG AA`, async ({ page }) => {
        await page.route('https://giscus.app/**', (route) => route.abort());
        await page.goto(path);
        await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
        expect(await findLowContrast(page)).toEqual([]);
      });
    }
  });
}
