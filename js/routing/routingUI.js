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
import { setupRoutingInputGeocoder } from '../utils/geocoder.js';

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
                const sliderValues = [0.01, 0.02, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.6, 1.0];
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

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      routeState.isSelectingStart = true;
      routeState.isSelectingEnd = false;
      map.getCanvas().style.cursor = 'crosshair';
      startBtn.classList.add('active');
      if (endBtn) endBtn.classList.remove('active');
    });
  }

  if (endBtn) {
    endBtn.addEventListener('click', () => {
      routeState.isSelectingEnd = true;
      routeState.isSelectingStart = false;
      map.getCanvas().style.cursor = 'crosshair';
      endBtn.classList.add('active');
      if (startBtn) startBtn.classList.remove('active');
    });
  }

  // Hide route button
  const hideBtn = document.getElementById('hide-route');
  if (hideBtn) {
    let isHidden = false;
    hideBtn.addEventListener('click', () => {
      isHidden = !isHidden;
      
      // Toggle route layer opacity
      if (map.getLayer('route-layer')) {
        const newOpacity = isHidden ? 0 : 0.8;
        map.setPaintProperty('route-layer', 'line-opacity', newOpacity);
        
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
      }
    });
  }
  
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      // Import dynamically to avoid circular dependency
      import('./routing.js').then(({ clearRoute }) => {
        clearRoute(map);
        // Reset hide button state
        const hideBtn = document.getElementById('hide-route');
        if (hideBtn) {
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
        alert('Bitte Start- und Endpunkt setzen');
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
  
  // Define predefined slider values (only these can be selected by dragging)
  const sliderValues = [0.01, 0.02, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.6, 1.0];
  
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
  const addWaypointBtn = document.getElementById('add-waypoint');
  if (addWaypointBtn) {
    addWaypointBtn.addEventListener('click', () => {
      routeState.isSelectingWaypoint = true;
      routeState.isSelectingStart = false;
      routeState.isSelectingEnd = false;
      map.getCanvas().style.cursor = 'crosshair';
      
      // Update button states
      if (startBtn) startBtn.classList.remove('active');
      if (endBtn) endBtn.classList.remove('active');
    });
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
  map.on('click', (e) => {
    if (routeState.isSelectingStart) {
      setStartPoint(map, e.lngLat);
      routeState.isSelectingStart = false;
      if (startBtn) startBtn.classList.remove('active');
      
      // Automatically activate end point selection mode
      routeState.isSelectingEnd = true;
      map.getCanvas().style.cursor = 'crosshair';
      if (endBtn) endBtn.classList.add('active');
    } else if (routeState.isSelectingEnd) {
      setEndPoint(map, e.lngLat);
      routeState.isSelectingEnd = false;
      map.getCanvas().style.cursor = '';
      if (endBtn) endBtn.classList.remove('active');
    } else if (routeState.isSelectingWaypoint) {
      addWaypoint(map, e.lngLat);
      routeState.isSelectingWaypoint = false;
      map.getCanvas().style.cursor = '';
    }
  });

  // Geocoder integration for start and end inputs
  let startGeocoderControl = null;
  let endGeocoderControl = null;

  if (startInput) {
    startGeocoderControl = setupRoutingInputGeocoder(startInput, map, ({ lng, lat, address }) => {
      // Address is already set in input by geocoder, just update the point
      routeState.startPoint = [lng, lat];
      updateMarkers(map);
      map.flyTo({ center: [lng, lat], zoom: 14 });
      
      // Automatically activate end point selection mode
      routeState.isSelectingStart = false;
      routeState.isSelectingEnd = true;
      map.getCanvas().style.cursor = 'crosshair';
      if (startBtn) startBtn.classList.remove('active');
      if (endBtn) endBtn.classList.add('active');
      
      // Automatically calculate route if both points are set
      if (routeState.startPoint && routeState.endPoint) {
        import('./routing.js').then(({ calculateRoute }) => {
          calculateRoute(map, routeState.startPoint, routeState.endPoint, routeState.waypoints);
        });
      }
    });
  }

  if (endInput) {
    endGeocoderControl = setupRoutingInputGeocoder(endInput, map, ({ lng, lat, address }) => {
      // Address is already set in input by geocoder, just update the point
      routeState.endPoint = [lng, lat];
      updateMarkers(map);
      map.flyTo({ center: [lng, lat], zoom: 14 });
      
      // Automatically calculate route if both points are set
      if (routeState.startPoint && routeState.endPoint) {
        import('./routing.js').then(({ calculateRoute }) => {
          calculateRoute(map, routeState.startPoint, routeState.endPoint, routeState.waypoints);
        });
      }
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

export function setStartPoint(map, lngLat, fromGeocoder = false) {
  routeState.startPoint = [lngLat.lng, lngLat.lat];
  updateMarkers(map);
  
  const startInput = document.getElementById('start-input');
  if (startInput) {
    if (fromGeocoder) {
      // Address will be set by geocoder callback, don't override
      // But mark as from map click if not from geocoder
      if (window.startGeocoderControl) {
        window.startGeocoderControl.setFromMapClick(false);
      }
    } else {
      // From map click - show coordinates
      startInput.value = `${lngLat.lat.toFixed(5)}, ${lngLat.lng.toFixed(5)}`;
      if (window.startGeocoderControl) {
        window.startGeocoderControl.setFromMapClick(true);
      }
    }
  }
  
  // Automatically calculate route if both points are set
  if (routeState.startPoint && routeState.endPoint) {
    // Import dynamically to avoid circular dependency
    import('./routing.js').then(({ calculateRoute }) => {
      calculateRoute(map, routeState.startPoint, routeState.endPoint, routeState.waypoints);
    });
  }
}

export function setEndPoint(map, lngLat, fromGeocoder = false) {
  routeState.endPoint = [lngLat.lng, lngLat.lat];
  updateMarkers(map);
  
  const endInput = document.getElementById('end-input');
  if (endInput) {
    if (fromGeocoder) {
      // Address will be set by geocoder callback, don't override
      // But mark as from map click if not from geocoder
      if (window.endGeocoderControl) {
        window.endGeocoderControl.setFromMapClick(false);
      }
    } else {
      // From map click - show coordinates
      endInput.value = `${lngLat.lat.toFixed(5)}, ${lngLat.lng.toFixed(5)}`;
      if (window.endGeocoderControl) {
        window.endGeocoderControl.setFromMapClick(true);
      }
    }
  }
  
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
  
  // Create draggable start marker with pin icon
  if (routeState.startPoint) {
    const el = document.createElement('div');
    el.className = 'custom-marker start-marker';
    el.style.width = '24px';
    el.style.height = '24px';
    el.style.cursor = 'grab';
    el.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#10b981" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3" fill="white"></circle>
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
    
    routeState.startMarker.on('dragend', () => {
      el.style.cursor = 'grab';
      const lngLat = routeState.startMarker.getLngLat();
      routeState.startPoint = [lngLat.lng, lngLat.lat];
      
      const startInput = document.getElementById('start-input');
      if (startInput) {
        startInput.value = `${lngLat.lat.toFixed(5)}, ${lngLat.lng.toFixed(5)}`;
      }
      
      // Recalculate route if end point exists
      if (routeState.endPoint) {
        // Import dynamically to avoid circular dependency
        import('./routing.js').then(({ calculateRoute }) => {
          calculateRoute(map, routeState.startPoint, routeState.endPoint, routeState.waypoints);
        });
      }
    });
  }
  
  // Create draggable end marker with pin icon
  if (routeState.endPoint) {
    const el = document.createElement('div');
    el.className = 'custom-marker end-marker';
    el.style.width = '24px';
    el.style.height = '24px';
    el.style.cursor = 'grab';
    el.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#ef4444" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3" fill="white"></circle>
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
    
    routeState.endMarker.on('dragend', () => {
      el.style.cursor = 'grab';
      const lngLat = routeState.endMarker.getLngLat();
      routeState.endPoint = [lngLat.lng, lngLat.lat];
      
      const endInput = document.getElementById('end-input');
      if (endInput) {
        endInput.value = `${lngLat.lat.toFixed(5)}, ${lngLat.lng.toFixed(5)}`;
      }
      
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
    el.style.width = '28px';
    el.style.height = '28px';
    el.style.cursor = 'grab';
    el.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="#f59e0b" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <text x="12" y="14" text-anchor="middle" fill="white" font-size="10" font-weight="normal">${index + 1}</text>
      </svg>
    `;
    el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
    
    const marker = new maplibregl.Marker({
      element: el,
      draggable: true,
      anchor: 'bottom'
    })
      .setLngLat(waypoint)
      .addTo(map);
    
    marker.on('dragstart', () => {
      el.style.cursor = 'grabbing';
    });
    
    marker.on('dragend', () => {
      el.style.cursor = 'grab';
      const lngLat = marker.getLngLat();
      routeState.waypoints[index] = [lngLat.lng, lngLat.lat];
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

// Update waypoints list in UI
export function updateWaypointsList() {
  const waypointsList = document.getElementById('waypoints-list');
  if (!waypointsList) return;
  
  waypointsList.innerHTML = '';
  
  routeState.waypoints.forEach((waypoint, index) => {
    const item = document.createElement('div');
    item.className = 'waypoint-item';
    item.draggable = true;
    item.dataset.index = index;
    item.innerHTML = `
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
      <span class="waypoint-number">${index + 1}</span>
      <span class="waypoint-coords">${waypoint[1].toFixed(5)}, ${waypoint[0].toFixed(5)}</span>
      <button class="btn-remove-waypoint" data-index="${index}" title="Zwischenpunkt entfernen">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;
    waypointsList.appendChild(item);
    
    // Drag & Drop handlers
    item.addEventListener('dragstart', (e) => {
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', item.outerHTML);
      e.dataTransfer.setData('text/plain', index.toString());
    });
    
    item.addEventListener('dragend', (e) => {
      item.classList.remove('dragging');
      // Remove all drop indicators
      document.querySelectorAll('.waypoint-item').forEach(el => {
        el.classList.remove('drag-over');
      });
    });
    
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      const draggingItem = document.querySelector('.waypoint-item.dragging');
      if (!draggingItem || draggingItem === item) return;
      
      const items = Array.from(waypointsList.querySelectorAll('.waypoint-item:not(.dragging)'));
      const afterElement = getDragAfterElement(waypointsList, e.clientY);
      
      // Remove all drag-over classes
      items.forEach(el => el.classList.remove('drag-over'));
      
      if (afterElement == null) {
        item.classList.add('drag-over');
      } else {
        afterElement.classList.add('drag-over');
      }
    });
    
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
      const dropIndex = parseInt(item.dataset.index);
      
      if (draggedIndex === dropIndex) return;
      
      // Reorder waypoints
      const draggedWaypoint = routeState.waypoints[draggedIndex];
      routeState.waypoints.splice(draggedIndex, 1);
      routeState.waypoints.splice(dropIndex, 0, draggedWaypoint);
      
      // Mark as manually sorted - this disables automatic optimization
      routeState.waypointsManuallySorted = true;
      
      // Update UI
      updateWaypointsList();
      updateMarkers(routeState.mapInstance);
      
      // Recalculate route if both start and end points exist
      if (routeState.startPoint && routeState.endPoint) {
        import('./routing.js').then(({ calculateRoute }) => {
          calculateRoute(routeState.mapInstance, routeState.startPoint, routeState.endPoint, routeState.waypoints);
        });
      }
    });
    
    // Remove button handler
    const removeBtn = item.querySelector('.btn-remove-waypoint');
    if (removeBtn) {
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
  });
}

// Helper function to determine where to insert dragged item
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.waypoint-item:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Add waypoint
export function addWaypoint(map, lngLat) {
  routeState.waypoints.push([lngLat.lng, lngLat.lat]);
  // Reset manual sort flag when adding new waypoint - allows optimization again
  routeState.waypointsManuallySorted = false;
  updateMarkers(map);
  updateWaypointsList();
  
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
  
  // Reset manual sort flag if no waypoints left - allows optimization for new waypoints
  if (routeState.waypoints.length === 0) {
    routeState.waypointsManuallySorted = false;
  }
  
  const map = routeState.mapInstance;
  if (map) {
    updateMarkers(map);
    updateWaypointsList();
    
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

