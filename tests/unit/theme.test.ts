import { describe, expect, it } from 'vitest';
import { GISCUS_ORIGIN, THEME_INIT_SCRIPT, THEME_STORAGE_KEY } from '../../src/lib/theme';

interface Env {
  stored?: string | null;
  prefersDark?: boolean;
  storageThrows?: boolean;
}

/** Runs the pre-paint script against stubbed browser globals and returns the theme it applied. */
function runInitScript({ stored = null, prefersDark = false, storageThrows = false }: Env): string | undefined {
  const root = { dataset: {} as Record<string, string> };
  const doc = { documentElement: root };
  const storage = {
    getItem(key: string) {
      if (storageThrows) throw new DOMException('blocked', 'SecurityError');
      return key === THEME_STORAGE_KEY ? stored : null;
    },
  };
  const matchMedia = (query: string) => ({ matches: query.includes('dark') && prefersDark });
  new Function('document', 'localStorage', 'matchMedia', THEME_INIT_SCRIPT)(doc, storage, matchMedia);
  return root.dataset.theme;
}

// AC1 + AC3: the pre-paint script picks the theme.
describe('THEME_INIT_SCRIPT', () => {
  it('follows a dark device setting on first visit', () => {
    expect(runInitScript({ prefersDark: true })).toBe('dark');
  });

  it('follows a light device setting on first visit', () => {
    expect(runInitScript({ prefersDark: false })).toBe('light');
  });

  it('prefers a stored light choice over a dark device', () => {
    expect(runInitScript({ stored: 'light', prefersDark: true })).toBe('light');
  });

  it('prefers a stored dark choice over a light device', () => {
    expect(runInitScript({ stored: 'dark', prefersDark: false })).toBe('dark');
  });

  it('ignores a garbage stored value', () => {
    expect(runInitScript({ stored: 'purple', prefersDark: true })).toBe('dark');
  });

  it('still works when storage is blocked', () => {
    expect(runInitScript({ storageThrows: true, prefersDark: true })).toBe('dark');
  });
});

describe('theme constants', () => {
  it('posts to the Giscus origin', () => {
    expect(GISCUS_ORIGIN).toBe('https://giscus.app');
  });
});
