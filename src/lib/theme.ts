export type Theme = 'light' | 'dark';

/** localStorage key holding the visitor's explicit choice (absent = follow the device). */
export const THEME_STORAGE_KEY = 'theme';

/** Giscus only accepts theme messages posted to its own origin. */
export const GISCUS_ORIGIN = 'https://giscus.app';

/**
 * Runs inline in <head> before first paint so the page never flashes the wrong theme.
 * An explicit stored choice wins; otherwise the device setting decides. Storage may be blocked, hence try/catch.
 */
export const THEME_INIT_SCRIPT =
  `(function(){var t;try{t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})}catch(e){}` +
  `if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}` +
  `document.documentElement.dataset.theme=t})();`;
