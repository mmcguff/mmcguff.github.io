import type { Page } from '@playwright/test';

export interface LowContrast {
  text: string;
  tag: string;
  ratio: number;
  required: number;
  color: string;
  background: string;
}

/**
 * Finds visible text whose colour fails WCAG AA (4.5:1, or 3:1 for large text) against the nearest solid
 * background. Skips third-party widgets and elements that are hidden or fully transparent.
 */
export async function findLowContrast(page: Page): Promise<LowContrast[]> {
  return page.evaluate(() => {
    type Rgba = [number, number, number, number];
    const parse = (value: string): Rgba => {
      const m = value.match(/rgba?\(([^)]+)\)/);
      if (!m) return [0, 0, 0, 0];
      const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      return [r, g, b, a];
    };
    const over = (top: Rgba, below: Rgba): Rgba => {
      const a = top[3] + below[3] * (1 - top[3]);
      if (a === 0) return [0, 0, 0, 0];
      const mix = (i: number) => (top[i] * top[3] + below[i] * below[3] * (1 - top[3])) / a;
      return [mix(0), mix(1), mix(2), a];
    };
    const luminance = ([r, g, b]: Rgba) => {
      const [lr, lg, lb] = [r, g, b].map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
    };
    const ratio = (a: Rgba, b: Rgba) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    const backdrop = (el: Element): Rgba => {
      const layers: Rgba[] = [];
      for (let node: Element | null = el; node; node = node.parentElement) {
        layers.push(parse(getComputedStyle(node).backgroundColor));
      }
      const page = parse(getComputedStyle(document.documentElement).backgroundColor);
      return layers.reduceRight((below, layer) => over(layer, below), over(page, [255, 255, 255, 1]));
    };
    const skip = '.calendly-badge-widget, .calendly-overlay, iframe, script, style, noscript, svg';

    const failures: LowContrast[] = [];
    const seen = new Set<Element>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || seen.has(el) || !n.textContent?.trim() || el.closest(skip)) continue;
      seen.add(el);
      if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const style = getComputedStyle(el);
      const fg = over(parse(style.color), backdrop(el));
      const bg = backdrop(el);
      const size = parseFloat(style.fontSize);
      const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
      const required = large ? 3 : 4.5;
      const got = ratio(fg, bg);
      if (got < required) {
        failures.push({
          text: (n.textContent ?? '').trim().slice(0, 40),
          tag: `${el.tagName.toLowerCase()}.${el.className}`,
          ratio: Math.round(got * 100) / 100,
          required,
          color: style.color,
          background: `rgb(${bg.slice(0, 3).map(Math.round).join(',')})`,
        });
      }
    }
    return failures;
  });
}
