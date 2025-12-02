import { switchMapTheme } from './mapThemeSwitcher.js';

/**
 * Reinitialize all map layers and sources after a style change
 */
async function reinitializeMapLayers(map) {
  const { addBasicSources } = await import('../mapdata/sources.js');
  const { addBasicLayers } = await import('../mapdata/basicLayers.js');
  const { addBikeLanesLayers } = await import('../mapdata/bikeLanesLayers.js');
  const { addMissingStreetsLayers } = await import('../mapdata/missingStreetsLayers.js');
  const { setupPhotonGeocoder } = await import('../utils/geocoder.js');
  const { setupRouting } = await import('../routing/routing.js');
  
  addBasicSources(map);
  addBasicLayers(map);
  addBikeLanesLayers(map);
  addMissingStreetsLayers(map);
  setupPhotonGeocoder(map);
  setupRouting(map);
}

/**
 * Restore context layer visibility based on toggle checkbox states
 */
async function restoreContextLayerVisibility(map) {
  // Wait for layers to be created before trying to set visibility
  const waitForLayers = (layerIds, maxAttempts = 20, delay = 100) => {
    return new Promise((resolve) => {
      let attempts = 0;
      const checkLayers = () => {
        const allExist = layerIds.every(id => map.getLayer(id));
        if (allExist || attempts >= maxAttempts) {
          resolve(allExist);
          return;
        }
        attempts++;
        setTimeout(checkLayers, delay);
      };
      checkLayers();
    });
  };
  
  // Wait for bike lanes layers if toggle is checked
  const toggleBikelanes = document.getElementById('toggle-bikelanes');
  if (toggleBikelanes && toggleBikelanes.checked) {
    const bikelanesLayers = [
      'bike-lanes-needsClarification',
      'bike-lanes-gehweg',
      'bike-lanes-kfz',
      'bike-lanes-fussverkehr',
      'bike-lanes-eigenstaendig',
      'bike-lanes-baulich'
    ];
    await waitForLayers(bikelanesLayers);
    // Dispatch change event to trigger the toggle handler
    toggleBikelanes.dispatchEvent(new Event('change'));
  }
  
  // Wait for missing streets layers if toggle is checked
  const toggleMissingStreets = document.getElementById('toggle-missing-streets');
  if (toggleMissingStreets && toggleMissingStreets.checked) {
    const missingStreetsLayers = [
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
    await waitForLayers(missingStreetsLayers);
    // Dispatch change event to trigger the toggle handler
    toggleMissingStreets.dispatchEvent(new Event('change'));
  }
  
  // Restore context layers opacity if route exists
  try {
    const { routeState } = await import('../routing/routeState.js');
    if (routeState && routeState.currentRouteData) {
      const { updateContextLayersOpacity } = await import('../routing/routing.js');
      updateContextLayersOpacity(map, true);
    }
  } catch (err) {
    // Ignore if modules not available
  }
}

/**
 * Restore route after style change
 */
async function restoreRoute(map) {
  try {
    const { routeState } = await import('../routing/routeState.js');
    if (!routeState || !routeState.currentRouteData || !routeState.startPoint || !routeState.endPoint) {
      return; // No route to restore
    }
    
    const { coordinates, elevations, distance, encodedValues } = routeState.currentRouteData;
    if (!coordinates || coordinates.length === 0) {
      return; // No coordinates to restore
    }
    
    const { updateRouteColor } = await import('../routing/routeVisualization.js');
    const { drawHeightgraph } = await import('../routing/heightgraph.js');
    const { updateContextLayersOpacity } = await import('../routing/routing.js');
    
    // Wait for route source and layer to be ready
    const waitForRouteLayer = (maxAttempts = 30, delay = 100) => {
      return new Promise((resolve) => {
        let attempts = 0;
        const checkLayer = () => {
          const source = map.getSource('route');
          const layer = map.getLayer('route-layer');
          if (source && layer) {
            resolve(true);
            return;
          }
          if (attempts >= maxAttempts) {
            console.warn('Route layer not ready after max attempts');
            resolve(false);
            return;
          }
          attempts++;
          setTimeout(checkLayer, delay);
        };
        checkLayer();
      });
    };
    
    const routeReady = await waitForRouteLayer();
    if (!routeReady) {
      // Retry once more after a longer delay
      await new Promise(resolve => setTimeout(resolve, 500));
      const retryReady = await waitForRouteLayer();
      if (!retryReady) {
        console.warn('Could not restore route: route layer not available');
        return;
      }
    }
    
    // Ensure routeState.mapInstance is set
    routeState.mapInstance = map;
    
    // Get route source and layer
    const routeSource = map.getSource('route');
    const routeLayer = map.getLayer('route-layer');
    
    if (!routeSource || !routeLayer) {
      console.warn('Route source or layer not found after waiting');
      return;
    }
    
    // Set basic route data first to ensure it's visible
    routeSource.setData({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: coordinates
      },
      properties: {
        color: '#3b82f6'
      }
    });
    
    // Update layer to support property-based coloring
    map.setPaintProperty('route-layer', 'line-color', ['get', 'color']);
    
    // Restore route visualization with encoded values (if available)
    const select = document.getElementById('heightgraph-encoded-select');
    const selectedType = select ? select.value : routeState.currentEncodedType || 'mapillary_coverage';
    
    // Update route color with current encoded values
    // This will create segments if encodedValues are available
    if (encodedValues && Object.keys(encodedValues).length > 0) {
      updateRouteColor(selectedType, encodedValues);
    }
    
    // Restore heightgraph
    if (elevations && elevations.length > 0) {
      drawHeightgraph(elevations, distance, encodedValues || {}, coordinates);
    } else if (encodedValues && Object.keys(encodedValues).length > 0) {
      drawHeightgraph([], distance, encodedValues, coordinates);
    }
    
    // Restore context layers opacity
    updateContextLayersOpacity(map, true);
  } catch (err) {
    console.warn('Could not restore route after style change:', err);
  }
}

export function setupBaseLayerControls(map, isInitializingRef) {
  document.querySelectorAll('input[name="color-style"]').forEach(rb => {
    rb.addEventListener("change", () => {
      // Permalink update can be added here if needed
    });
  });

  document.querySelectorAll(".basemap-thumb, .basemap-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const selectedMap = btn.dataset.map;
      const isSatellite = selectedMap === "satellite";
      const isOsm = selectedMap === "osm";
      const isStandard = selectedMap === "standard";
      const isDark = selectedMap === "dark";

      // Switch map style for standard and dark
      if (isStandard || isDark) {
        // Use dynamic theme switching instead of reloading the entire style
        // This preserves routes and context layers
        // Check if we're using style_light-dark.json using data attribute (more reliable)
        const isUsingLightDarkStyle = document.body.hasAttribute('data-using-light-dark-style');
        
        if (!isUsingLightDarkStyle) {
          // Need to switch to light-dark style first (coming from old style or raster layer)
          document.body.setAttribute('data-using-light-dark-style', 'true');
          map.setStyle("./style_light-dark.json");
          map.once("style.load", async () => {
            await reinitializeMapLayers(map);
            
            // Hide raster layers
            if (map.getLayer("satellite-layer")) {
              map.setLayoutProperty("satellite-layer", "visibility", "none");
            }
            if (map.getLayer("osm-layer")) {
              map.setLayoutProperty("osm-layer", "visibility", "none");
            }
            
            // Apply theme (light or dark)
            switchMapTheme(map, isDark);
            
            // Wait a bit for all layers to be fully initialized
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Restore context layer visibility based on toggle states
            await restoreContextLayerVisibility(map);
            
            // Restore route if it exists
            await restoreRoute(map);
          });
        } else {
          // Already using light-dark style, just switch theme
          // But first, make sure raster layers are hidden
          if (map.getLayer("satellite-layer")) {
            map.setLayoutProperty("satellite-layer", "visibility", "none");
          }
          if (map.getLayer("osm-layer")) {
            map.setLayoutProperty("osm-layer", "visibility", "none");
          }
          // Then switch theme
          switchMapTheme(map, isDark);
        }
      } else {
        // For raster layers (OSM, Satellite)
        // Check if we're using light-dark style using data attribute (more reliable)
        const isUsingLightDarkStyle = document.body.hasAttribute('data-using-light-dark-style');
        
        if (!isUsingLightDarkStyle) {
          // Need to switch to light-dark style first
          document.body.setAttribute('data-using-light-dark-style', 'true');
          map.setStyle("./style_light-dark.json");
          map.once("style.load", async () => {
            await reinitializeMapLayers(map);
            
            // Switch to light theme (for raster layers)
            switchMapTheme(map, false);
            
            // Wait a bit for all layers to be fully initialized
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Show/hide satellite layer (only if it exists)
            if (map.getLayer("satellite-layer")) {
              map.setLayoutProperty("satellite-layer", "visibility", isSatellite ? "visible" : "none");
            }
            
            // Show/hide OSM layer
            if (map.getLayer("osm-layer")) {
              map.setLayoutProperty("osm-layer", "visibility", isOsm ? "visible" : "none");
            }
            
            // Restore context layer visibility based on toggle states
            await restoreContextLayerVisibility(map);
            
            // Restore route if it exists
            await restoreRoute(map);
          });
        } else {
          // Already using light-dark style, switch to light theme and show/hide raster layers
          switchMapTheme(map, false);
          
          // Show/hide satellite layer (only if it exists)
          if (map.getLayer("satellite-layer")) {
            map.setLayoutProperty("satellite-layer", "visibility", isSatellite ? "visible" : "none");
          }
          
          // Show/hide OSM layer
          if (map.getLayer("osm-layer")) {
            map.setLayoutProperty("osm-layer", "visibility", isOsm ? "visible" : "none");
          }
        }
      }

      document.querySelectorAll(".basemap-thumb, .basemap-btn").forEach(t => t.classList.remove("selected"));
      btn.classList.add("selected");
    });
  });
}
