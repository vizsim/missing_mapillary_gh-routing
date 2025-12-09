/**
 * Map Theme Initializer - Applies initial map theme based on system preference or manual override
 */

import { switchMapTheme } from './mapThemeSwitcher.js';

/**
 * Apply initial map theme based on system preference or manual override
 * @param {maplibregl.Map} map - Map instance
 */
export function applyInitialMapTheme(map) {
  if (!map) {
    return;
  }
  
  // Wait for map to be fully loaded - check both isStyleLoaded and loaded()
  // Also wait a bit for all layers to be initialized
  const tryApplyTheme = () => {
    if (!map.isStyleLoaded() || !map.loaded()) {
      // Try again after a short delay
      setTimeout(tryApplyTheme, 100);
      return;
    }
    
    // Additional check: make sure background layer exists (indicates style is fully loaded)
    if (!map.getLayer('background')) {
      setTimeout(tryApplyTheme, 100);
      return;
    }
    
    // Check if using light-dark style
    if (!document.body.hasAttribute('data-using-light-dark-style')) {
      return;
    }
    
    // Check for manual override first
    const themeOverride = localStorage.getItem('theme-override');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const htmlTheme = document.documentElement.getAttribute('data-theme');
    
    // Determine theme: prioritize html data-theme (which reflects current UI state),
    // then override, then system preference
    // (initDarkMode already cleared override if it didn't match system)
    let shouldBeDark = false;
    
    // First check html data-theme (reflects current UI state)
    if (htmlTheme === 'dark') {
      shouldBeDark = true;
    } else if (htmlTheme === 'light') {
      shouldBeDark = false;
    } else if (themeOverride === 'dark') {
      shouldBeDark = true;
    } else if (themeOverride === 'light') {
      shouldBeDark = false;
    } else {
      // No override - use system preference
      shouldBeDark = prefersDark;
    }
    
    // Apply theme to map
    switchMapTheme(map, shouldBeDark);
    
    // Update basemap button selection (wait a bit for buttons to be available)
    setTimeout(() => {
      const standardBtn = document.querySelector('.basemap-btn[data-map="standard"]');
      const darkBtn = document.querySelector('.basemap-btn[data-map="dark"]');
      if (shouldBeDark && darkBtn) {
        document.querySelectorAll('.basemap-thumb, .basemap-btn').forEach(t => t.classList.remove('selected'));
        darkBtn.classList.add('selected');
      } else if (!shouldBeDark && standardBtn) {
        document.querySelectorAll('.basemap-thumb, .basemap-btn').forEach(t => t.classList.remove('selected'));
        standardBtn.classList.add('selected');
      }
    }, 100);
  };
  
  // Start trying to apply theme
  tryApplyTheme();
}

