export const THEME_STORAGE_KEY = "collectra-theme";

/**
 * Runs before hydration (inlined as a blocking script in the document head) to
 * apply the right theme class immediately — avoids a flash of the wrong theme.
 * Keep this dependency-free; it runs outside the React/module graph.
 */
export const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var isLight = stored ? stored === 'light' : !window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isLight) document.documentElement.classList.add('light');
  } catch (e) {}
})();
`;
