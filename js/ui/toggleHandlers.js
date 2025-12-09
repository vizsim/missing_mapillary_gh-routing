// Toggle handlers for various UI elements (Hillshade, Terrain, Bike Lanes, Missing Streets, etc.)

import { routeState } from '../routing/routeState.js';
import { switchMapTheme } from './mapThemeSwitcher.js';

let updateContextLayersOpacity = null;

// Dynamically import the function to avoid circular dependencies
async function getUpdateContextLayersOpacity() {
  if (!updateContextLayersOpacity) {
    const routingModule = await import('../routing/routing.js');
    updateContextLayersOpacity = routingModule.updateContextLayersOpacity;
  }
  return updateContextLayersOpacity;
}

// Initialize dark mode early (before DOMContentLoaded)
function initDarkMode() {
  // Check for manual override first
  const themeOverride = localStorage.getItem('theme-override');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // If override doesn't match system preference, clear it to follow system
  if (themeOverride === 'dark' && !prefersDark) {
    localStorage.removeItem('theme-override');
    document.documentElement.removeAttribute('data-theme');
  } else if (themeOverride === 'light' && prefersDark) {
    localStorage.removeItem('theme-override');
    document.documentElement.removeAttribute('data-theme');
  } else if (themeOverride === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (themeOverride === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    // No manual override - use system preference
    // Remove data-theme attribute so CSS media query can work
    document.documentElement.removeAttribute('data-theme');
    console.log('[Theme] System prefers:', prefersDark ? 'DARK' : 'LIGHT');
  }
}

// Run immediately if DOM is ready, otherwise wait
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDarkMode);
} else {
  initDarkMode();
}

export function setupToggleHandlers() {
  // Dark mode toggle
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (darkModeToggle) {
    // Update toggle icon based on current theme
    function updateToggleIcon() {
      const html = document.documentElement;
      const currentTheme = html.getAttribute('data-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // Determine actual theme (manual override or system preference)
      const actualTheme = currentTheme || (prefersDark ? 'dark' : 'light');
      
      // Update icon (sun for dark mode, moon for light mode would be better, but we use sun icon)
      // Could add moon icon later if needed
    }
    
    darkModeToggle.addEventListener('click', () => {
      const html = document.documentElement;
      const currentTheme = html.getAttribute('data-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // Determine current effective theme
      const effectiveTheme = currentTheme || (prefersDark ? 'dark' : 'light');
      
      let newTheme;
      if (effectiveTheme === 'dark') {
        // Switch to light mode
        html.setAttribute('data-theme', 'light');
        localStorage.setItem('theme-override', 'light');
        newTheme = 'light';
      } else {
        // Switch to dark mode
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme-override', 'dark');
        newTheme = 'dark';
      }
      
      updateToggleIcon();
      
      // Also switch map theme if using style_light-dark.json
      if (window.map && document.body.hasAttribute('data-using-light-dark-style')) {
        const isDark = newTheme === 'dark';
        switchMapTheme(window.map, isDark);
        
        // Update basemap button selection
        const standardBtn = document.querySelector('.basemap-btn[data-map="standard"]');
        const darkBtn = document.querySelector('.basemap-btn[data-map="dark"]');
        if (isDark && darkBtn) {
          document.querySelectorAll('.basemap-thumb, .basemap-btn').forEach(t => t.classList.remove('selected'));
          darkBtn.classList.add('selected');
        } else if (!isDark && standardBtn) {
          document.querySelectorAll('.basemap-thumb, .basemap-btn').forEach(t => t.classList.remove('selected'));
          standardBtn.classList.add('selected');
        }
      }
      
      // Redraw heightgraph if it exists
      redrawHeightgraphOnThemeChange();
    });
    
    // Listen for system theme changes
    // If user changes system theme, we clear the manual override to follow system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    mediaQuery.addEventListener('change', (e) => {
      const themeOverride = localStorage.getItem('theme-override');
      
      // If user changes system theme, clear manual override to follow system
      // This allows the page to react to system theme changes even if override was set
      if (themeOverride) {
        localStorage.removeItem('theme-override');
      }
      
      // Apply system preference
      // Remove data-theme to let CSS media query work
      document.documentElement.removeAttribute('data-theme');
      updateToggleIcon();
      
      // Also switch map theme if using style_light-dark.json
      if (window.map && document.body.hasAttribute('data-using-light-dark-style')) {
        const isDark = e.matches;
        switchMapTheme(window.map, isDark);
        
        // Update basemap button selection
        const standardBtn = document.querySelector('.basemap-btn[data-map="standard"]');
        const darkBtn = document.querySelector('.basemap-btn[data-map="dark"]');
        if (isDark && darkBtn) {
          document.querySelectorAll('.basemap-thumb, .basemap-btn').forEach(t => t.classList.remove('selected'));
          darkBtn.classList.add('selected');
        } else if (!isDark && standardBtn) {
          document.querySelectorAll('.basemap-thumb, .basemap-btn').forEach(t => t.classList.remove('selected'));
          standardBtn.classList.add('selected');
        }
      }
      
      redrawHeightgraphOnThemeChange();
    });
    
    // Initial icon update
    updateToggleIcon();
  }
  
  // Function to redraw heightgraph when theme changes
  function redrawHeightgraphOnThemeChange() {
    // Wait a bit for theme to be applied
    setTimeout(() => {
      if (routeState && routeState.currentRouteData) {
        const { elevations, distance, encodedValues, coordinates } = routeState.currentRouteData;
        if (elevations || Object.keys(encodedValues || {}).length > 0) {
          import('../routing/heightgraph.js').then(({ drawHeightgraph }) => {
            drawHeightgraph(
              elevations || [],
              distance,
              encodedValues || {},
              coordinates || []
            );
          }).catch(err => {
            console.warn('Could not redraw heightgraph on theme change:', err);
          });
        }
      }
    }, 150);
  }

  // Toggle logic for Hillshade and Terrain
  const toggleHillshade = document.getElementById('toggleHillshade');
  const toggleTerrain = document.getElementById('toggleTerrain');
  
  if (toggleHillshade) {
    toggleHillshade.addEventListener('change', (e) => {
      if (window.map && window.map.getLayer('hillshade-layer')) {
        const visibility = e.target.checked ? 'visible' : 'none';
        window.map.setLayoutProperty('hillshade-layer', 'visibility', visibility);
      }
    });
  }

  if (toggleTerrain) {
    toggleTerrain.addEventListener('change', (e) => {
      if (window.map) {
        if (e.target.checked && window.map.getSource('terrain')) {
          window.map.setTerrain({ source: 'terrain', exaggeration: 1.5 });
        } else {
          window.map.setTerrain(null);
        }
      }
    });
  }

  // Map Settings Menu Toggle
  const mapSettingsToggle = document.getElementById('map-settings-toggle');
  const mapSettingsPanel = document.getElementById('map-settings-panel');
  const mapSettingsMenu = document.getElementById('map-settings-menu');
  
  if (mapSettingsToggle && mapSettingsPanel && mapSettingsMenu) {
    mapSettingsToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      mapSettingsPanel.classList.toggle('hidden');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!mapSettingsMenu.contains(e.target)) {
        mapSettingsPanel.classList.add('hidden');
      }
    });
  }

  // Bike lanes toggle
  const toggleBikelanes = document.getElementById('toggle-bikelanes');
  const bikelanesLegend = document.getElementById('bikelanes-legend');
  const toggleBikelanesSegment = document.getElementById('toggle-bikelanes-segment');
  const bikelanesSegmentContent = document.getElementById('bikelanes-segment-content');

  if (toggleBikelanes) {
    toggleBikelanes.addEventListener('change', (e) => {
      if (window.map) {
        const visibility = e.target.checked ? 'visible' : 'none';
        const layers = [
          'bike-lanes-needsClarification',
          'bike-lanes-gehweg',
          'bike-lanes-kfz',
          'bike-lanes-fussverkehr',
          'bike-lanes-eigenstaendig',
          'bike-lanes-baulich'
        ];
        
        layers.forEach(layerId => {
          if (window.map.getLayer(layerId)) {
            window.map.setLayoutProperty(layerId, 'visibility', visibility);
          }
        });

        // Update context layers opacity based on route visibility
        getUpdateContextLayersOpacity().then(updateFn => {
          if (updateFn && window.map) {
            const hasRoute = routeState.currentRouteData !== null;
            updateFn(window.map, hasRoute);
          }
        });

        // Show/hide legend and content
        if (bikelanesLegend) {
          bikelanesLegend.style.display = e.target.checked ? 'flex' : 'none';
        }
        // Auto-expand when enabled, auto-collapse when disabled
        if (bikelanesSegmentContent) {
          if (e.target.checked) {
            bikelanesSegmentContent.classList.remove('collapsed');
          } else {
            bikelanesSegmentContent.classList.add('collapsed');
          }
        }
      }
    });
  }

  // Toggle bike lanes segment (click on header to expand/collapse)
  if (toggleBikelanesSegment && bikelanesSegmentContent) {
    toggleBikelanesSegment.addEventListener('click', (e) => {
      // Don't toggle if clicking on the switch itself
      if (e.target.closest('.switch-toggle')) {
        return;
      }
      const isCollapsed = bikelanesSegmentContent.classList.contains('collapsed');
      bikelanesSegmentContent.classList.toggle('collapsed');
    });
  }

  // Missing streets toggle
  const toggleMissingStreets = document.getElementById('toggle-missing-streets');
  const missingStreetsLegend = document.getElementById('missing-streets-legend');
  const toggleMissingStreetsSegment = document.getElementById('toggle-missing-streets-segment');
  const missingStreetsSegmentContent = document.getElementById('missing-streets-segment-content');

  if (toggleMissingStreets) {
    toggleMissingStreets.addEventListener('change', (e) => {
      if (window.map) {
        const visibility = e.target.checked ? 'visible' : 'none';
        const layers = [
          'missing-streets-missing-pathclasses',
          'missing-streets-missing-roads',
          'missing-streets-missing-bikelanes',
          'missing-streets-regular-pathclasses',
          'missing-streets-regular-roads',
          'missing-streets-regular-bikelanes',
          'missing-streets-pano-pathclasses',
          'missing-streets-pano-roads',
          'missing-streets-pano-bikelanes'
        ];
        
        layers.forEach(layerId => {
          if (window.map.getLayer(layerId)) {
            window.map.setLayoutProperty(layerId, 'visibility', visibility);
          }
        });

        // Update context layers opacity based on route visibility
        getUpdateContextLayersOpacity().then(updateFn => {
          if (updateFn && window.map) {
            const hasRoute = routeState.currentRouteData !== null;
            updateFn(window.map, hasRoute);
          }
        });

        // Auto-expand when enabled, auto-collapse when disabled
        if (missingStreetsSegmentContent) {
          if (e.target.checked) {
            missingStreetsSegmentContent.classList.remove('collapsed');
          } else {
            missingStreetsSegmentContent.classList.add('collapsed');
          }
        }
      }
    });
  }

  // Toggle missing streets segment (click on header to expand/collapse)
  if (toggleMissingStreetsSegment && missingStreetsSegmentContent) {
    toggleMissingStreetsSegment.addEventListener('click', (e) => {
      // Don't toggle if clicking on the switch itself
      if (e.target.closest('.switch-toggle')) {
        return;
      }
      const isCollapsed = missingStreetsSegmentContent.classList.contains('collapsed');
      missingStreetsSegmentContent.classList.toggle('collapsed');
    });
  }
}

