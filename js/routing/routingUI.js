// Routing UI handlers: buttons, inputs, markers, geocoding

import { routeState } from './routeState.js';
import { updateRouteColorByProfile } from './routeVisualization.js';
import { exportRouteToGPX } from './gpxExport.js';
import {
  supportsCustomModel,
  ensureCustomModel,
  getMapillaryPriority,
  updateMapillaryPriority
} from './customModel.js';
import { setupRoutingInputGeocoder, reverseGeocode } from '../utils/geocoder.js';
import { ERROR_MESSAGES, MAPILLARY_SLIDER_VALUES } from '../utils/constants.js';

// Available SVG files for waypoints
const WAYPOINT_SVGS = [
  'raspberry-svgrepo-com.svg',
  'pineapple-svgrepo-com.svg',
  'banana-svgrepo-com.svg',
  'fries-svgrepo-com.svg',
  'broccoli-svgrepo-com.svg',
  'doughnut-svgrepo-com.svg',
  'grapes-svgrepo-com.svg',
  'pretzel-svgrepo-com.svg',
  'apple-svgrepo-com.svg',
  'cabbage-svgrepo-com.svg',
  'toffee-svgrepo-com.svg',
  'cheese-svgrepo-com.svg',
  'aubergine-svgrepo-com.svg',
  'carrot-svgrepo-com.svg'
];

/**
 * Get a random SVG ID for a waypoint that hasn't been used yet
 * Only allows duplicates if all 14 SVGs are already in use
 * @returns {string} SVG filename
 */
export function getRandomWaypointSvg() {
  // Get all currently used SVG IDs from waypoints
  const usedSvgIds = new Set(
    routeState.waypoints
      .map(wp => wp && typeof wp === 'object' && wp.svgId ? wp.svgId : null)
      .filter(id => id !== null)
  );
  
  // Get available SVGs (not yet used)
  const availableSvgs = WAYPOINT_SVGS.filter(svg => !usedSvgIds.has(svg));
  
  // If there are available SVGs, use one of them
  if (availableSvgs.length > 0) {
    return availableSvgs[Math.floor(Math.random() * availableSvgs.length)];
  }
  
  // All SVGs are in use, allow duplicates
  return WAYPOINT_SVGS[Math.floor(Math.random() * WAYPOINT_SVGS.length)];
}

export function setupUIHandlers(map) {
  const startBtn = document.getElementById('set-start');
  const endBtn = document.getElementById('set-end');
  const clearBtn = document.getElementById('clear-route');
  const calculateBtn = document.getElementById('calculate-route');
  const startInput = document.getElementById('start-input');
  const endInput = document.getElementById('end-input');
  const collapseBtn = document.getElementById('collapse-routing-panel');
  
  // Profile selection handlers
  document.querySelectorAll('.profile-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all buttons
      document.querySelectorAll('.profile-btn').forEach(b => b.classList.remove('active'));
      // Add active class to clicked button
      btn.classList.add('active');
      // Update selected profile
      routeState.selectedProfile = btn.dataset.profile;
      
      // Reset and set default custom model if customizable profile is selected
      if (supportsCustomModel(routeState.selectedProfile)) {
        routeState.customModel = null; // Reset to ensure correct model is loaded
        routeState.customModel = ensureCustomModel(routeState.customModel, routeState.selectedProfile);
      } else {
        // Clear custom model if switching to non-customizable profile
        routeState.customModel = null;
      }
      
      // Show/hide customizable slider
      const sliderContainer = document.getElementById('customizable-slider-container');
      if (sliderContainer) {
        if (supportsCustomModel(routeState.selectedProfile)) {
          sliderContainer.style.display = 'block';
          // Initialize slider value from customModel
          const multiplyBy = getMapillaryPriority(routeState.customModel);
          if (multiplyBy !== null && multiplyBy !== undefined) {
            // Use the exported function if available, otherwise set directly
            if (window.setMapillarySliderValue) {
              window.setMapillarySliderValue(multiplyBy);
            } else {
              const slider = document.getElementById('mapillary-priority-slider');
              const sliderValue = document.getElementById('slider-value');
              if (slider) {
                // Find closest predefined value for slider position
                const sliderValues = MAPILLARY_SLIDER_VALUES;
                let closestIndex = 0;
                let minDiff = Math.abs(multiplyBy - sliderValues[0]);
                for (let i = 1; i < sliderValues.length; i++) {
                  const diff = Math.abs(multiplyBy - sliderValues[i]);
                  if (diff < minDiff) {
                    minDiff = diff;
                    closestIndex = i;
                  }
                }
                slider.value = closestIndex;
                if (sliderValue) {
                  // Display the actual value (even if not in predefined list)
                  const inverseValue = (1 / multiplyBy).toFixed(0);
                  sliderValue.textContent = `${multiplyBy.toFixed(2)} (×${inverseValue})`;
                }
              }
            }
          }
        } else {
          sliderContainer.style.display = 'none';
        }
      }
      
      // Update route color based on profile
      updateRouteColorByProfile(map, routeState.selectedProfile);
      
      // If route already exists, recalculate with new profile
      if (routeState.startPoint && routeState.endPoint) {
        // Import dynamically to avoid circular dependency
        import('./routing.js').then(({ calculateRoute }) => {
          calculateRoute(map, routeState.startPoint, routeState.endPoint, routeState.waypoints);
        });
      }
    });
  });
  
  // Collapse/expand panel handler
  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      const panel = document.querySelector('.routing-panel');
      if (panel) {
        const isCollapsed = panel.classList.contains('collapsed');
        if (isCollapsed) {
          // Expand panel
          panel.classList.remove('collapsed');
          collapseBtn.classList.remove('collapsed');
          collapseBtn.title = 'Einklappen';
        } else {
          // Collapse panel
          panel.classList.add('collapsed');
          collapseBtn.classList.add('collapsed');
          collapseBtn.title = 'Ausklappen';
        }
        
        // Trigger panel positioning update
        window.dispatchEvent(new CustomEvent('routingPanelToggled'));
      }
    });
  }

  // Helper function to handle start/end button clicks
  const handleStartClick = () => {
    routeState.isSelectingStart = true;
    routeState.isSelectingEnd = false;
    map.getCanvas().style.cursor = 'crosshair';
    // Update both original and header buttons
    document.querySelectorAll('.btn-set-start, .btn-set-start-header').forEach(btn => {
      btn.classList.add('active');
    });
    document.querySelectorAll('.btn-set-end, .btn-set-end-header').forEach(btn => {
      btn.classList.remove('active');
    });
  };

  const handleEndClick = () => {
    routeState.isSelectingEnd = true;
    routeState.isSelectingStart = false;
    map.getCanvas().style.cursor = 'crosshair';
    // Update both original and header buttons
    document.querySelectorAll('.btn-set-end, .btn-set-end-header').forEach(btn => {
      btn.classList.add('active');
    });
    document.querySelectorAll('.btn-set-start, .btn-set-start-header').forEach(btn => {
      btn.classList.remove('active');
    });
  };

  if (startBtn) {
    startBtn.addEventListener('click', handleStartClick);
  }

  // Header start button
  const startBtnHeader = document.getElementById('set-start-header');
  if (startBtnHeader) {
    startBtnHeader.addEventListener('click', handleStartClick);
  }

  if (endBtn) {
    endBtn.addEventListener('click', handleEndClick);
  }

  // Header end button
  const endBtnHeader = document.getElementById('set-end-header');
  if (endBtnHeader) {
    endBtnHeader.addEventListener('click', handleEndClick);
  }

  // Hide route button
  const hideBtn = document.getElementById('hide-route');
  if (hideBtn) {
    let isHidden = false;
    // Store hidden state globally so routeVisualization can access it
    window.routeIsHidden = false;
    
    hideBtn.addEventListener('click', () => {
      isHidden = !isHidden;
      window.routeIsHidden = isHidden;
      
      // Toggle route layer opacity (0.1 when hidden, 0.8 when visible)
      if (map.getLayer('route-layer')) {
        const newOpacity = isHidden ? 0.1 : 0.8;
        map.setPaintProperty('route-layer', 'line-opacity', newOpacity);
        
        // Hide/show hover segment layer when route is hidden
        if (map.getLayer('route-hover-segment-layer')) {
          map.setLayoutProperty('route-hover-segment-layer', 'visibility', isHidden ? 'none' : 'visible');
        }
      }
      
      // Update button icon and title
      const svg = hideBtn.querySelector('svg');
      if (svg) {
        if (isHidden) {
          // Show eye-off icon (hidden)
          svg.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
          hideBtn.title = 'Einblenden';
        } else {
          // Show eye icon (visible)
          svg.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
          hideBtn.title = 'Ausblenden';
        }
      }
    });
  }
  
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      // Clear waypoints list immediately
      const waypointsList = document.getElementById('waypoints-list');
      if (waypointsList) {
        waypointsList.innerHTML = '';
      }
      
      // Import dynamically to avoid circular dependency
      import('./routing.js').then(({ clearRoute }) => {
        clearRoute(map);
        // Reset hide button state
        const hideBtn = document.getElementById('hide-route');
        if (hideBtn) {
          window.routeIsHidden = false;
          const svg = hideBtn.querySelector('svg');
          if (svg) {
            // Reset to eye icon (visible)
            svg.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
            hideBtn.title = 'Ausblenden';
          }
        }
      });
    });
  }

  if (calculateBtn) {
    calculateBtn.addEventListener('click', () => {
      if (routeState.startPoint && routeState.endPoint) {
        // Import dynamically to avoid circular dependency
        import('./routing.js').then(({ calculateRoute }) => {
          calculateRoute(map, routeState.startPoint, routeState.endPoint, routeState.waypoints);
        });
      } else {
        alert(ERROR_MESSAGES.MISSING_START_END);
      }
    });
  }

  // GPX Export button
  const exportGpxBtn = document.getElementById('export-gpx');
  if (exportGpxBtn) {
    exportGpxBtn.addEventListener('click', () => {
      exportRouteToGPX();
    });
  }
  
  // Mapillary priority slider for car_customizable and bike_customizable profiles
  const mapillarySlider = document.getElementById('mapillary-priority-slider');
  const sliderValueDisplay = document.getElementById('slider-value');
  
  // Use predefined slider values from constants
  const sliderValues = MAPILLARY_SLIDER_VALUES;
  
  // Helper functions to convert between slider index (0-9) and actual value
  const sliderIndexToValue = (index) => {
    const clampedIndex = Math.max(0, Math.min(9, Math.round(index)));
    return sliderValues[clampedIndex];
  };
  
  const valueToSliderIndex = (value) => {
    // Find closest predefined value and return its index
    let closestIndex = 0;
    let minDiff = Math.abs(value - sliderValues[0]);
    for (let i = 1; i < sliderValues.length; i++) {
      const diff = Math.abs(value - sliderValues[i]);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }
    return closestIndex;
  };
  
  // Store the actual value from URL (may not be in predefined list)
  let currentActualValue = null;
  
  // Export function to set slider value from external code (e.g., URL loading)
  // This function is available globally and can be called even before event listeners are set up
  window.setMapillarySliderValue = (value) => {
    const slider = document.getElementById('mapillary-priority-slider');
    const sliderValue = document.getElementById('slider-value');
    if (slider) {
      // Store the actual value (even if not in predefined list)
      currentActualValue = value;
      
      // Find closest predefined value for slider position
      const closestIndex = valueToSliderIndex(value);
      slider.value = closestIndex;
      
      // Display the actual value (not the closest predefined one)
      if (sliderValue) {
        const inverseValue = (1 / value).toFixed(0);
        sliderValue.textContent = `${value.toFixed(2)} (×${inverseValue})`;
      }
    }
  };
  
  if (mapillarySlider) {
    
    let sliderTimeout = null;
    let sliderMaxTimeout = null;
    let sliderStartTime = null;
    let pendingRecalculation = false;
    let isUserDragging = false;
    
    let retryInterval = null;
    
    const triggerRouteRecalculation = async () => {
      if (!pendingRecalculation || !routeState.startPoint || !routeState.endPoint) {
        return;
      }
      
      // Prevent multiple simultaneous calls
      if (retryInterval) {
        return; // Already trying to calculate
      }
      
      const { calculateRoute, isRouteCalculationInProgress } = await import('./routing.js');
      
      // Check if a calculation is already in progress
      if (isRouteCalculationInProgress()) {
        // Wait a bit and try again
        setTimeout(() => {
          if (pendingRecalculation && !isRouteCalculationInProgress()) {
            triggerRouteRecalculation();
          }
        }, 100);
        return;
      }
      
      // Clear all timeouts since we're about to calculate
      if (sliderTimeout) {
        clearTimeout(sliderTimeout);
        sliderTimeout = null;
      }
      if (sliderMaxTimeout) {
        clearTimeout(sliderMaxTimeout);
        sliderMaxTimeout = null;
      }
      
      // Reset pending flag immediately to prevent duplicate calls
      pendingRecalculation = false;
      
      // Try to calculate route (include waypoints)
      calculateRoute(map, routeState.startPoint, routeState.endPoint, routeState.waypoints);
      
      // Reset slider start time
      sliderStartTime = null;
    };
    
    // Track when user starts dragging
    mapillarySlider.addEventListener('mousedown', () => {
      isUserDragging = true;
    });
    
    mapillarySlider.addEventListener('touchstart', () => {
      isUserDragging = true;
    });
    
    mapillarySlider.addEventListener('input', (e) => {
      const sliderIndex = parseInt(e.target.value);
      // Always use the predefined value when user drags the slider
      const actualValue = sliderIndexToValue(sliderIndex);
      
      // Clear the stored actual value from URL since user is now controlling
      currentActualValue = null;
      
      if (sliderValueDisplay) {
        // Show inverse value to make it more intuitive (smaller multiply_by = higher priority)
        const inverseValue = (1 / actualValue).toFixed(0);
        sliderValueDisplay.textContent = `${actualValue.toFixed(2)} (×${inverseValue})`;
      }
      
      // Update customModel if customizable profile is selected
      if (supportsCustomModel(routeState.selectedProfile) && routeState.customModel) {
        updateMapillaryPriority(routeState.customModel, actualValue);
        pendingRecalculation = true;
        
        // Track when slider movement started
        if (!sliderStartTime) {
          sliderStartTime = Date.now();
        }
        
        // Clear existing debounce timeout
        if (sliderTimeout) {
          clearTimeout(sliderTimeout);
        }
        
        // Debounce: wait 300ms after last change before recalculating
        sliderTimeout = setTimeout(() => {
          triggerRouteRecalculation();
          sliderTimeout = null;
        }, 300);
        
        // Maximum timeout: ensure recalculation happens after 1 second from first change
        // Only set if not already set (to prevent multiple timeouts)
        if (!sliderMaxTimeout) {
          sliderMaxTimeout = setTimeout(() => {
            // Only trigger if pendingRecalculation is still true (sliderTimeout hasn't fired yet)
            if (pendingRecalculation) {
              triggerRouteRecalculation();
            }
            sliderMaxTimeout = null;
          }, 1000);
        }
      }
    });
    
    // Track when user stops dragging
    mapillarySlider.addEventListener('mouseup', () => {
      isUserDragging = false;
    });
    
    mapillarySlider.addEventListener('touchend', () => {
      isUserDragging = false;
    });
  }
  
  // Add waypoint button handler
  // Helper function to handle add waypoint button click
  const handleAddWaypointClick = () => {
    routeState.isSelectingWaypoint = true;
    routeState.isSelectingStart = false;
    routeState.isSelectingEnd = false;
    map.getCanvas().style.cursor = 'crosshair';
    
    // Update button states (both original and header buttons)
    document.querySelectorAll('.btn-set-start, .btn-set-start-header').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelectorAll('.btn-set-end, .btn-set-end-header').forEach(btn => {
      btn.classList.remove('active');
    });
  };

  const addWaypointBtn = document.getElementById('add-waypoint');
  if (addWaypointBtn) {
    addWaypointBtn.addEventListener('click', handleAddWaypointClick);
  }

  // Header add waypoint button
  const addWaypointBtnHeader = document.getElementById('add-waypoint-header');
  if (addWaypointBtnHeader) {
    addWaypointBtnHeader.addEventListener('click', handleAddWaypointClick);
  }
  
  // Waypoint optimization toggle handler
  const waypointOptimizationToggle = document.getElementById('waypoint-optimization-toggle');
  if (waypointOptimizationToggle) {
    // Initialize checkbox state from routeState
    waypointOptimizationToggle.checked = routeState.waypointOptimizationEnabled !== false;
    
    waypointOptimizationToggle.addEventListener('change', (e) => {
      routeState.waypointOptimizationEnabled = e.target.checked;
      
      // If optimization is re-enabled, reset manual sort flag to allow optimization
      if (e.target.checked) {
        routeState.waypointsManuallySorted = false;
      }
      
      // If optimization is enabled and we have waypoints, recalculate route with optimization
      if (e.target.checked && routeState.startPoint && routeState.endPoint && routeState.waypoints.length > 1) {
        import('./routing.js').then(({ calculateRoute }) => {
          calculateRoute(map, routeState.startPoint, routeState.endPoint, routeState.waypoints);
        });
      }
    });
  }

  // Map click handler
  map.on('click', async (e) => {
    if (routeState.isSelectingStart) {
      await setStartPoint(map, e.lngLat, { autoActivateEnd: true });
      routeState.isSelectingStart = false;
      // Remove active class from both original and header buttons
      document.querySelectorAll('.btn-set-start, .btn-set-start-header').forEach(btn => {
        btn.classList.remove('active');
      });
    } else if (routeState.isSelectingEnd) {
      await setEndPoint(map, e.lngLat);
      routeState.isSelectingEnd = false;
      map.getCanvas().style.cursor = '';
    } else if (routeState.isSelectingWaypoint) {
      await addWaypoint(map, e.lngLat);
      routeState.isSelectingWaypoint = false;
      map.getCanvas().style.cursor = '';
    }
  });

  // Geocoder integration for start and end inputs
  let startGeocoderControl = null;
  let endGeocoderControl = null;

  if (startInput) {
    startGeocoderControl = setupRoutingInputGeocoder(startInput, map, async ({ lng, lat, address }) => {
      // Use centralized setStartPoint function with geocoder options
      await setStartPoint(map, { lng, lat }, {
        fromGeocoder: true,
        address: address,
        autoActivateEnd: true
      });
      routeState.isSelectingStart = false;
      map.flyTo({ center: [lng, lat], zoom: 14 });
    });
  }

  if (endInput) {
    endGeocoderControl = setupRoutingInputGeocoder(endInput, map, async ({ lng, lat, address }) => {
      // Use centralized setEndPoint function with geocoder options
      await setEndPoint(map, { lng, lat }, {
        fromGeocoder: true,
        address: address
      });
      routeState.isSelectingEnd = false;
      map.getCanvas().style.cursor = '';
      map.flyTo({ center: [lng, lat], zoom: 14 });
    });
  }
  
  // Store geocoder controls for use in setStartPoint/setEndPoint
  if (startGeocoderControl) {
    window.startGeocoderControl = startGeocoderControl;
  }
  if (endGeocoderControl) {
    window.endGeocoderControl = endGeocoderControl;
  }
}

export async function setStartPoint(map, lngLat, options = {}) {
  const { fromGeocoder = false, address = null, autoActivateEnd = false } = options;
  
  routeState.startPoint = [lngLat.lng, lngLat.lat];
  updateMarkers(map);
  
  const startInput = document.getElementById('start-input');
  if (startInput) {
    if (fromGeocoder) {
      // Address is provided by geocoder, use it
      if (address) {
        routeState.startAddress = address;
      }
      // Mark as from geocoder (not map click)
      if (window.startGeocoderControl) {
        window.startGeocoderControl.setFromMapClick(false);
      }
    } else {
      // From map click - show coordinates
      startInput.value = `${lngLat.lat.toFixed(5)}, ${lngLat.lng.toFixed(5)}`;
      if (window.startGeocoderControl) {
        window.startGeocoderControl.setFromMapClick(true);
      }
      // Fetch address for tooltip
      routeState.startAddress = await reverseGeocode(lngLat.lng, lngLat.lat);
      updateCoordinateTooltips();
    }
  }
  
  // Automatically activate end point selection mode if requested
  if (autoActivateEnd) {
    routeState.isSelectingStart = false;
    routeState.isSelectingEnd = true;
    map.getCanvas().style.cursor = 'crosshair';
    // Remove active class from both original and header buttons
    document.querySelectorAll('.btn-set-start, .btn-set-start-header').forEach(btn => {
      btn.classList.remove('active');
    });
    // Add active class to end buttons
    document.querySelectorAll('.btn-set-end, .btn-set-end-header').forEach(btn => {
      btn.classList.add('active');
    });
  }
  
  updateCoordinateTooltips();
  
  // Automatically calculate route if both points are set
  if (routeState.startPoint && routeState.endPoint) {
    // Import dynamically to avoid circular dependency
    import('./routing.js').then(({ calculateRoute }) => {
      calculateRoute(map, routeState.startPoint, routeState.endPoint, routeState.waypoints);
    });
  }
}

export async function setEndPoint(map, lngLat, options = {}) {
  const { fromGeocoder = false, address = null } = options;
  
  routeState.endPoint = [lngLat.lng, lngLat.lat];
  updateMarkers(map);
  
  const endInput = document.getElementById('end-input');
  if (endInput) {
    if (fromGeocoder) {
      // Address is provided by geocoder, use it
      if (address) {
        routeState.endAddress = address;
      }
      // Mark as from geocoder (not map click)
      if (window.endGeocoderControl) {
        window.endGeocoderControl.setFromMapClick(false);
      }
    } else {
      // From map click - show coordinates
      endInput.value = `${lngLat.lat.toFixed(5)}, ${lngLat.lng.toFixed(5)}`;
      if (window.endGeocoderControl) {
        window.endGeocoderControl.setFromMapClick(true);
      }
      // Fetch address for tooltip
      routeState.endAddress = await reverseGeocode(lngLat.lng, lngLat.lat);
      updateCoordinateTooltips();
    }
  }
  
  // Remove active class from both original and header buttons
  document.querySelectorAll('.btn-set-end, .btn-set-end-header').forEach(btn => {
    btn.classList.remove('active');
  });
  
  updateCoordinateTooltips();
  
  // Automatically calculate route if both points are set
  if (routeState.startPoint && routeState.endPoint) {
    // Import dynamically to avoid circular dependency
    import('./routing.js').then(({ calculateRoute }) => {
      calculateRoute(map, routeState.startPoint, routeState.endPoint, routeState.waypoints);
    });
  }
}

export function updateMarkers(map) {
  // Remove existing markers
  if (routeState.startMarker) {
    routeState.startMarker.remove();
    routeState.startMarker = null;
  }
  if (routeState.endMarker) {
    routeState.endMarker.remove();
    routeState.endMarker = null;
  }
  // Remove all waypoint markers
  routeState.waypointMarkers.forEach(marker => {
    if (marker) marker.remove();
  });
  routeState.waypointMarkers = [];
  
  // Create draggable start marker with pin icon containing rocket
  if (routeState.startPoint) {
    const el = document.createElement('div');
    el.className = 'custom-marker start-marker';
    el.style.width = '24px';
    el.style.height = '24px';
    el.style.cursor = 'grab';
    el.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#10b981" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <g transform="translate(12, 10) scale(0.6) translate(-12, -12)">
          <path d="m9.9 16.97 7.436-7.436a8 8 0 0 0 2.145-3.89l.318-1.401-1.402.317a8 8 0 0 0-3.89 2.146L9.192 12.02m.707 4.95 2.122 3.535c1.178-1.178 2.828-2.828 0-5.657L9.899 16.97zm0 0-2.828-2.829m0 0L3.536 12.02c1.178-1.179 2.828-2.829 5.656 0m-2.12 2.121 2.12-2.121M4.95 16.263s-1.703 2.54-.707 3.536c.995.996 3.535-.707 3.535-.707" fill="white" stroke="white" stroke-width="1.5"/>
        </g>
      </svg>
    `;
    el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
    
    routeState.startMarker = new maplibregl.Marker({
      element: el,
      draggable: true,
      anchor: 'bottom'
    })
      .setLngLat(routeState.startPoint)
      .addTo(map);
    
    routeState.startMarker.on('dragstart', () => {
      el.style.cursor = 'grabbing';
    });
    
    routeState.startMarker.on('dragend', async () => {
      el.style.cursor = 'grab';
      const lngLat = routeState.startMarker.getLngLat();
      routeState.startPoint = [lngLat.lng, lngLat.lat];
      
      const startInput = document.getElementById('start-input');
      if (startInput) {
        startInput.value = `${lngLat.lat.toFixed(5)}, ${lngLat.lng.toFixed(5)}`;
      }
      
      // Update address for moved start point
      routeState.startAddress = await reverseGeocode(lngLat.lng, lngLat.lat);
      updateCoordinateTooltips();
      
      // Recalculate route if end point exists
      if (routeState.endPoint) {
        // Import dynamically to avoid circular dependency
        import('./routing.js').then(({ calculateRoute }) => {
          calculateRoute(map, routeState.startPoint, routeState.endPoint, routeState.waypoints);
        });
      }
    });
  }
  
  // Create draggable end marker with pin icon containing flag
  if (routeState.endPoint) {
    const el = document.createElement('div');
    el.className = 'custom-marker end-marker';
    el.style.width = '24px';
    el.style.height = '24px';
    el.style.cursor = 'grab';
    el.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#ef4444" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <g transform="translate(12, 10) scale(0.4) translate(-16, -16)">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="white" stroke-miterlimit="10">
            <!-- Flaggenstange (dicker) -->
            <line x1="6" y1="28" x2="6" y2="5" stroke="white" stroke-width="3" stroke-linecap="round"/>
            <!-- Flaggenform -->
            <polyline points="6,5 26,5 26,19 6,19" stroke="white" stroke-width="1.5"/>
            <!-- Schachbrettmuster -->
            <rect x="6" y="5" width="10" height="7" fill="white"/>
            <rect x="16" y="12" width="10" height="7" fill="white"/>
          </svg>
        </g>
      </svg>
    `;
    el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
    
    routeState.endMarker = new maplibregl.Marker({
      element: el,
      draggable: true,
      anchor: 'bottom'
    })
      .setLngLat(routeState.endPoint)
      .addTo(map);
    
    routeState.endMarker.on('dragstart', () => {
      el.style.cursor = 'grabbing';
    });
    
    routeState.endMarker.on('dragend', async () => {
      el.style.cursor = 'grab';
      const lngLat = routeState.endMarker.getLngLat();
      routeState.endPoint = [lngLat.lng, lngLat.lat];
      
      const endInput = document.getElementById('end-input');
      if (endInput) {
        endInput.value = `${lngLat.lat.toFixed(5)}, ${lngLat.lng.toFixed(5)}`;
      }
      
      // Update address for moved end point
      routeState.endAddress = await reverseGeocode(lngLat.lng, lngLat.lat);
      updateCoordinateTooltips();
      
      // Recalculate route if start point exists
      if (routeState.startPoint) {
        // Import dynamically to avoid circular dependency
        import('./routing.js').then(({ calculateRoute }) => {
          calculateRoute(map, routeState.startPoint, routeState.endPoint, routeState.waypoints);
        });
      }
    });
  }
  
  // Create waypoint markers
  routeState.waypoints.forEach((waypoint, index) => {
    const el = document.createElement('div');
    el.className = 'custom-marker waypoint-marker';
    el.style.width = '32px';
    el.style.height = '32px';
    el.style.cursor = 'grab';
    
    // Load and display the waypoint's unique SVG
    const svgPath = `svgs/${waypoint.svgId}`;
    el.innerHTML = `
      <div style="width: 32px; height: 32px; position: relative;">
        <img src="${svgPath}" alt="Waypoint ${index + 1}" style="width: 100%; height: 100%; object-fit: contain;">
        <div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); background: #f59e0b; color: white; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${index + 1}</div>
      </div>
    `;
    el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
    
    const marker = new maplibregl.Marker({
      element: el,
      draggable: true,
      anchor: 'bottom'
    })
      .setLngLat([waypoint.lng, waypoint.lat])
      .addTo(map);
    
    marker.on('dragstart', () => {
      el.style.cursor = 'grabbing';
    });
    
    marker.on('dragend', async () => {
      el.style.cursor = 'grab';
      const lngLat = marker.getLngLat();
      // Preserve SVG ID when updating coordinates
      routeState.waypoints[index] = {
        lng: lngLat.lng,
        lat: lngLat.lat,
        svgId: waypoint.svgId
      };
      
      // Update address for moved waypoint
      const address = await reverseGeocode(lngLat.lng, lngLat.lat);
      routeState.waypointAddresses[index] = address;
      
      updateWaypointsList();
      
      // Recalculate route if both start and end points exist
      if (routeState.startPoint && routeState.endPoint) {
        import('./routing.js').then(({ calculateRoute }) => {
          calculateRoute(map, routeState.startPoint, routeState.endPoint, routeState.waypoints);
        });
      }
    });
    
    routeState.waypointMarkers.push(marker);
  });
  
  // Waypoints container is always visible now, no need to hide/show
}

// ============================================================================
// Waypoint List UI
// ============================================================================

/**
 * Create HTML template for a waypoint list item
 * @param {number} index - Waypoint index (0-based)
 * @param {Object} waypoint - Waypoint object with lng, lat, and svgId
 * @returns {string} HTML string
 */
function createWaypointItemHTML(index, waypoint) {
  const svgPath = `svgs/${waypoint.svgId}`;
  return `
    <span class="waypoint-drag-handle" title="Zum Verschieben ziehen">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="9" cy="12" r="1"></circle>
        <circle cx="9" cy="5" r="1"></circle>
        <circle cx="9" cy="19" r="1"></circle>
        <circle cx="15" cy="12" r="1"></circle>
        <circle cx="15" cy="5" r="1"></circle>
        <circle cx="15" cy="19" r="1"></circle>
      </svg>
    </span>
    <span class="waypoint-svg-icon">
      <img src="${svgPath}" alt="Waypoint ${index + 1}" style="width: 20px; height: 20px; object-fit: contain;">
    </span>
    <span class="waypoint-number">${index + 1}</span>
    <span class="waypoint-coords">${waypoint.lat.toFixed(3)}, ${waypoint.lng.toFixed(3)}</span>
    <button class="btn-remove-waypoint" data-index="${index}" title="Zwischenpunkt entfernen">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;
}

/**
 * Setup drag & drop event handlers for a waypoint item
 * @param {HTMLElement} item - The waypoint item element
 * @param {number} index - Waypoint index
 * @param {HTMLElement} waypointsList - Container element
 */
function setupWaypointDragHandlers(item, index, waypointsList) {
  // Drag start
  item.addEventListener('dragstart', (e) => {
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  });
  
  // Drag end
  item.addEventListener('dragend', (e) => {
    item.classList.remove('dragging');
    
    // Clear pending timeout
    if (item._dragOverTimeout) {
      clearTimeout(item._dragOverTimeout);
      item._dragOverTimeout = null;
    }
    
    // Remove all drop indicators
    document.querySelectorAll('.waypoint-item').forEach(el => {
      el.classList.remove('drag-over', 'drag-over-before', 'drag-over-after');
      el._dragOverTimeout = null;
    });
    
    // Update UI and recalculate route (after drag is complete to prevent flickering)
    handleWaypointsReordered();
  });
  
  // Drag over
  item.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const draggingItem = document.querySelector('.waypoint-item.dragging');
    if (!draggingItem || draggingItem === item) return;
    
    // Remove drag-over classes from other items (throttled to reduce flickering)
    if (!item._dragOverTimeout) {
      const items = Array.from(waypointsList.querySelectorAll('.waypoint-item:not(.dragging)'));
      items.forEach(el => {
        if (el !== item) {
          el.classList.remove('drag-over', 'drag-over-before', 'drag-over-after');
        }
      });
    }
    
    // Clear existing timeout
    if (item._dragOverTimeout) {
      clearTimeout(item._dragOverTimeout);
    }
    
    // Throttle visual update to reduce flickering
    item._dragOverTimeout = setTimeout(() => {
      updateDragOverIndicator(item, e.clientY);
      item._dragOverTimeout = null;
    }, 10);
  });
  
  // Drop
  item.addEventListener('drop', (e) => {
    e.preventDefault();
    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    const dropIndex = parseInt(item.dataset.index, 10);
    
    if (draggedIndex === dropIndex) return;
    
    reorderWaypoint(draggedIndex, dropIndex, e.clientY, item);
  });
}

/**
 * Setup remove button handler for a waypoint item
 * @param {HTMLElement} item - The waypoint item element
 * @param {number} index - Waypoint index
 */
function setupWaypointRemoveHandler(item, index) {
  const removeBtn = item.querySelector('.btn-remove-waypoint');
  if (!removeBtn) return;
  
  // Prevent button from triggering drag
  removeBtn.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });
  
  removeBtn.addEventListener('dragstart', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });
  
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removeWaypoint(index);
  });
}

/**
 * Update waypoints list in UI
 */
export function updateWaypointsList() {
  const waypointsList = document.getElementById('waypoints-list');
  if (!waypointsList) return;
  
  waypointsList.innerHTML = '';
  
  routeState.waypoints.forEach((waypoint, index) => {
    const item = document.createElement('div');
    item.className = 'waypoint-item';
    item.draggable = true;
    item.dataset.index = index;
    item.innerHTML = createWaypointItemHTML(index, waypoint);
    
    waypointsList.appendChild(item);
    
    // Setup event handlers
    setupWaypointDragHandlers(item, index, waypointsList);
    setupWaypointRemoveHandler(item, index);
  });
  
  // Update tooltips after list is updated
  updateCoordinateTooltips();
}

// ============================================================================
// Waypoint Drag & Drop Helpers
// ============================================================================

/**
 * Update drag-over visual indicator on drop target
 * @param {HTMLElement} item - The drop target element
 * @param {number} mouseY - Mouse Y position
 */
function updateDragOverIndicator(item, mouseY) {
  const rect = item.getBoundingClientRect();
  const itemCenterY = rect.top + rect.height / 2;
  const insertAfter = mouseY > itemCenterY;
  
  item.classList.add('drag-over');
  if (insertAfter) {
    item.classList.add('drag-over-after');
    item.classList.remove('drag-over-before');
  } else {
    item.classList.add('drag-over-before');
    item.classList.remove('drag-over-after');
  }
}

/**
 * Reorder waypoint in array based on drag & drop
 * @param {number} draggedIndex - Original index of dragged waypoint
 * @param {number} dropIndex - Index of drop target
 * @param {number} mouseY - Mouse Y position for determining insert position
 * @param {HTMLElement} dropTarget - The drop target element
 */
function reorderWaypoint(draggedIndex, dropIndex, mouseY, dropTarget) {
  // Determine if we should insert before or after the drop target
  const rect = dropTarget.getBoundingClientRect();
  const insertAfter = mouseY > rect.top + rect.height / 2;
  
  // Calculate target index in the original array
  let targetIndex = dropIndex + (insertAfter ? 1 : 0);
  
  // Remove element from array (both waypoint and address)
  const waypoints = routeState.waypoints;
  const addresses = routeState.waypointAddresses;
  const [moved] = waypoints.splice(draggedIndex, 1);
  const [movedAddress] = addresses.splice(draggedIndex, 1);
  
  // Adjust target index if element was removed before target position
  if (draggedIndex < targetIndex) {
    targetIndex--;
  }
  
  // Clamp to valid range (using new array length)
  targetIndex = Math.max(0, Math.min(targetIndex, waypoints.length));
  
  // Insert element at target position (both waypoint and address)
  waypoints.splice(targetIndex, 0, moved);
  addresses.splice(targetIndex, 0, movedAddress);
  
  // Mark as manually sorted (disables automatic optimization)
  routeState.waypointsManuallySorted = true;
}

/**
 * Handle waypoints reordering: update UI and recalculate route
 * Called after drag & drop is complete to prevent flickering
 */
function handleWaypointsReordered() {
  // Don't update UI if still dragging (prevents flickering)
  const isDragging = document.querySelector('.waypoint-item.dragging') !== null;
  if (isDragging) {
    return;
  }
  
  // Update UI
  updateWaypointsList();
  updateMarkers(routeState.mapInstance);
  
  // Recalculate route if both start and end points exist
  if (routeState.startPoint && routeState.endPoint) {
    requestAnimationFrame(() => {
      import('./routing.js').then(({ calculateRoute }) => {
        calculateRoute(
          routeState.mapInstance,
          routeState.startPoint,
          routeState.endPoint,
          routeState.waypoints
        );
      });
    });
  }
}

// Add waypoint
export async function addWaypoint(map, lngLat) {
  // Create waypoint object with coordinates and random SVG
  const waypoint = {
    lng: lngLat.lng,
    lat: lngLat.lat,
    svgId: getRandomWaypointSvg()
  };
  routeState.waypoints.push(waypoint);
  // Reset manual sort flag when adding new waypoint - allows optimization again
  routeState.waypointsManuallySorted = false;
  
  // Fetch address for tooltip
  const address = await reverseGeocode(lngLat.lng, lngLat.lat);
  routeState.waypointAddresses.push(address);
  
  updateMarkers(map);
  updateWaypointsList();
  updateCoordinateTooltips();
  
  // Recalculate route if both start and end points exist
  if (routeState.startPoint && routeState.endPoint) {
    import('./routing.js').then(({ calculateRoute }) => {
      calculateRoute(map, routeState.startPoint, routeState.endPoint, routeState.waypoints);
    });
  }
}

// Remove waypoint
export function removeWaypoint(index) {
  routeState.waypoints.splice(index, 1);
  routeState.waypointAddresses.splice(index, 1);
  
  // Reset manual sort flag if no waypoints left - allows optimization for new waypoints
  if (routeState.waypoints.length === 0) {
    routeState.waypointsManuallySorted = false;
  }
  
  const map = routeState.mapInstance;
  if (map) {
    updateMarkers(map);
    updateWaypointsList();
    updateCoordinateTooltips();
    
    // Recalculate route if both start and end points exist
    if (routeState.startPoint && routeState.endPoint) {
      import('./routing.js').then(({ calculateRoute }) => {
        calculateRoute(map, routeState.startPoint, routeState.endPoint, routeState.waypoints);
      });
    }
  }
}

export async function geocodeAddress(query) {
  try {
    // Use Photon geocoder
    const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`);
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      return {
        lng: feature.geometry.coordinates[0],
        lat: feature.geometry.coordinates[1]
      };
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  return null;
}

/**
 * Update tooltips for coordinate elements (start, end, waypoints)
 * Shows address on hover if available
 */
export function updateCoordinateTooltips() {
  // Update start point tooltip
  const startInput = document.getElementById('start-input');
  if (startInput && routeState.startAddress) {
    startInput.title = routeState.startAddress;
  } else if (startInput) {
    startInput.title = '';
  }
  
  // Update end point tooltip
  const endInput = document.getElementById('end-input');
  if (endInput && routeState.endAddress) {
    endInput.title = routeState.endAddress;
  } else if (endInput) {
    endInput.title = '';
  }
  
  // Update waypoint coordinate tooltips
  const waypointCoords = document.querySelectorAll('.waypoint-coords');
  waypointCoords.forEach((coordEl, index) => {
    if (routeState.waypointAddresses[index]) {
      coordEl.title = routeState.waypointAddresses[index];
    } else {
      coordEl.title = '';
    }
  });
}

