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
import { recalculateRouteIfReady } from './routeRecalculator.js';
import { isRouteCalculationInProgress } from './routing.js';
import { createStartMarker, createEndMarker, createWaypointMarker } from './markers/markerFactory.js';
import { updateWaypointsList } from './waypoints/waypointList.js';
import { updateCoordinateTooltips } from './coordinates/coordinateTooltips.js';

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
      // Store current mapillary_weight before switching profiles
      const previousProfile = routeState.selectedProfile;
      const previousMapillaryWeight = supportsCustomModel(previousProfile) && routeState.customModel
        ? getMapillaryPriority(routeState.customModel)
        : null;
      
      // Update selected profile
      routeState.selectedProfile = btn.dataset.profile;
      
      // Reset and set default custom model if customizable profile is selected
      if (supportsCustomModel(routeState.selectedProfile)) {
        // If switching between customizable profiles, preserve mapillary_weight
        if (supportsCustomModel(previousProfile) && previousMapillaryWeight !== null) {
          // Initialize with default model first
          routeState.customModel = ensureCustomModel(null, routeState.selectedProfile);
          // Then restore the mapillary_weight value
          routeState.customModel = updateMapillaryPriority(routeState.customModel, previousMapillaryWeight);
        } else {
          // Switching from non-customizable profile or no previous weight, use default
          routeState.customModel = null;
          routeState.customModel = ensureCustomModel(routeState.customModel, routeState.selectedProfile);
        }
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
      recalculateRouteIfReady();
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
        recalculateRouteIfReady();
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
  
  // Helper functions to convert between slider index (0-10) and actual value
  const sliderIndexToValue = (index) => {
    const maxIndex = sliderValues.length - 1;
    const clampedIndex = Math.max(0, Math.min(maxIndex, Math.round(index)));
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
      recalculateRouteIfReady();
      
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
        recalculateRouteIfReady();
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
  recalculateRouteIfReady();
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
  recalculateRouteIfReady();
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
  
  // Create start marker using factory
  if (routeState.startPoint) {
    routeState.startMarker = createStartMarker(map, routeState.startPoint);
  }
  
  // Create end marker using factory
  if (routeState.endPoint) {
    routeState.endMarker = createEndMarker(map, routeState.endPoint);
  }
  
  // Create waypoint markers using factory
  routeState.waypoints.forEach((waypoint, index) => {
    const marker = createWaypointMarker(map, waypoint, index);
    routeState.waypointMarkers.push(marker);
  });
  
  // Waypoints container is always visible now, no need to hide/show
}

// Waypoint List UI is now in ./waypoints/waypointList.js

// Waypoint management is now in ./waypoints/waypointManager.js
export { addWaypoint, removeWaypoint } from './waypoints/waypointManager.js';


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

// Coordinate tooltips are now in ./coordinates/coordinateTooltips.js

