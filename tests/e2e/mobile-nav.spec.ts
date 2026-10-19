import { expect, test, type Page } from '@playwright/test';

// #42: the hamburger opens the nav on phones, so the blog is reachable.
const burger = (page: Page) => page.locator('.navbar .navbar-burger');
const menu = (page: Page) => page.locator('#navbarMenuHeroA');
const navLink = (page: Page, name: RegExp) => menu(page).locator('a.navbar-item', { hasText: name });

/** WCAG contrast ratio between an element's colour (text, or a child's fill) and the first solid background behind it. */
async function contrast(page: Page, selector: string, colorOf: 'self' | 'firstChildBackground' = 'self') {
  return page.locator(selector).first().evaluate((el, colorOf) => {
    const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const lum = ([r, g, b]: number[]) => {
      const [R, G, B] = [r, g, b].map((v) => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * R + 0.7152 * G + 0.0722 * B;
    };
    const fg = colorOf === 'self' ? getComputedStyle(el).color : getComputedStyle(el.firstElementChild!).backgroundColor;
    let node: Element | null = el;
    let bg = 'rgb(255, 255, 255)';
    for (; node; node = node.parentElement) {
      const c = getComputedStyle(node).backgroundColor;
      // Skip transparent and translucent layers (e.g. a 10% highlight) to reach the solid colour underneath.
      if (rgb(c)[3] === undefined) { bg = c; break; }
    }
    const [a, b] = [lum(rgb(fg)), lum(rgb(bg))].sort((x, y) => y - x);
    return (a + 0.05) / (b + 0.05);
  }, colorOf);
}

test.describe('mobile (375px)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(burger(page)).toBeVisible();
  });

  // AC1
  test('tapping the menu button shows every nav link', async ({ page }) => {
    await expect(navLink(page, /blog/i)).toBeHidden();
    await burger(page).click();
    for (const name of [/experience/i, /about/i, /testimonials/i, /blog/i]) await expect(navLink(page, name)).toBeVisible();
  });

  // AC2
  test('tapping it again hides the menu', async ({ page }) => {
    await burger(page).click();
    await expect(navLink(page, /blog/i)).toBeVisible();
    await burger(page).click();
    await expect(navLink(page, /blog/i)).toBeHidden();
  });

  // AC3
  test('Blog in the open menu goes to the blog', async ({ page }) => {
    await burger(page).click();
    await navLink(page, /blog/i).click();
    await expect(page).toHaveURL(/\/blog\/$/);
  });

  // AC4
  test('an in-page link scrolls to its section and closes the menu', async ({ page }) => {
    await burger(page).click();
    await navLink(page, /about/i).click();
    await expect(page.locator('#about')).toBeInViewport();
    await expect(navLink(page, /blog/i)).toBeHidden();
  });

  // AC6
  test('aria-expanded follows the menu state', async ({ page }) => {
    await expect(burger(page)).toHaveAttribute('aria-expanded', 'false');
    await burger(page).click();
    await expect(burger(page)).toHaveAttribute('aria-expanded', 'true');
    await burger(page).click();
    await expect(burger(page)).toHaveAttribute('aria-expanded', 'false');
  });

  // AC7
  test('Enter and Space toggle the menu from the keyboard', async ({ page }) => {
    await burger(page).focus();
    await page.keyboard.press('Enter');
    await expect(navLink(page, /blog/i)).toBeVisible();
    await page.keyboard.press('Space');
    await expect(navLink(page, /blog/i)).toBeHidden();
  });

  // AC1: readable, not just present. WCAG AA: 4.5:1 for text, 3:1 for the icon.
  test('open menu links are readable against the menu background', async ({ page }) => {
    await burger(page).click();
    for (const name of ['Experience', 'About', 'Testimonials', 'Blog']) {
      const ratio = await contrast(page, `#navbarMenuHeroA a.navbar-item:text-is("${name}")`);
      expect(ratio, `${name} link contrast`).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('the menu icon stands out against the hero', async ({ page }) => {
    expect(await contrast(page, '.navbar .navbar-burger', 'firstChildBackground')).toBeGreaterThanOrEqual(3);
  });

  // AC9
  test('the button has no default border or background', async ({ page }) => {
    const style = await burger(page).evaluate((el) => {
      const cs = getComputedStyle(el);
      return { border: cs.borderTopStyle, background: cs.backgroundColor };
    });
    expect(style.border).toBe('none');
    expect(style.background).toBe('rgba(0, 0, 0, 0)');
  });

  test('the button sits at the right edge of the navbar', async ({ page }) => {
    const brand = await page.locator('.navbar-brand').boundingBox();
    const box = await burger(page).boundingBox();
    expect(Math.round(box!.x + box!.width)).toBe(Math.round(brand!.x + brand!.width));
  });
});

// AC8
test.describe('desktop (1280px)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('shows the nav links inline with no menu button', async ({ page }) => {
    await page.goto('/');
    await expect(burger(page)).toBeHidden();
    await expect(navLink(page, /blog/i)).toBeVisible();
  });
});
