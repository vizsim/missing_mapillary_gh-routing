// Heightgraph statistics calculation and display

import { routeState } from '../routeState.js';
import { calculateDistance } from './heightgraphUtils.js';
import { getSurfaceColorForStats, getRoadClassColorForStats, getBicycleInfraColorForStats } from './heightgraphDrawing.js';
import { getBicycleInfraDescription, getColorForEncodedValue } from '../colorSchemes.js';

/**
 * Calculate and display statistics for the selected encoded value
 */
export function updateHeightgraphStats(encodedType, encodedValues) {
  const statsContainer = document.getElementById('heightgraph-stats');
  if (!statsContainer || !routeState.currentRouteData) {
    return;
  }
  
  const { encodedValues: allEncodedValues, coordinates } = routeState.currentRouteData;
  const data = allEncodedValues[encodedType];
  
  if (!data || data.length === 0 || !coordinates || coordinates.length === 0) {
    statsContainer.innerHTML = '';
    statsContainer.style.display = 'none';
    return;
  }
  
  const valueDistances = {};
  
  for (let i = 0; i < data.length - 1 && i < coordinates.length - 1; i++) {
    const value = data[i];
    
    if (value === null || value === undefined) {
      continue;
    }
    
    const segmentDistance = calculateDistance(coordinates[i], coordinates[i + 1]);
    
    let key;
    if (encodedType === 'mapillary_coverage') {
      const isTrue = value === true || value === 'True' || value === 'true';
      key = isTrue ? 'true' : 'false';
    } else {
      key = String(value);
    }
    
    if (!valueDistances[key]) {
      valueDistances[key] = 0;
    }
    valueDistances[key] += segmentDistance;
  }
  
  if (Object.keys(valueDistances).length === 0) {
    statsContainer.innerHTML = '';
    statsContainer.style.display = 'none';
    return;
  }
  
  let statsHTML = '';
  const sortedKeys = Object.keys(valueDistances).sort((a, b) => {
    return valueDistances[b] - valueDistances[a];
  });
  
  sortedKeys.forEach(key => {
    const distanceKm = (valueDistances[key] / 1000).toFixed(2);
    let displayKey = key;
    let backgroundColor = '';
    
    if (encodedType === 'mapillary_coverage') {
      displayKey = key === 'true' ? 'true' : 'false';
      backgroundColor = key === 'true' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(236, 72, 153, 0.15)';
    } else if (encodedType === 'surface') {
      backgroundColor = getSurfaceColorForStats(key);
    } else if (encodedType === 'road_class') {
      backgroundColor = getRoadClassColorForStats(key);
    } else if (encodedType === 'bicycle_infra') {
      backgroundColor = getBicycleInfraColorForStats(key);
      const description = getBicycleInfraDescription(key);
      if (description) {
        displayKey = description;
      } else {
        displayKey = displayKey.replace(/_/g, '<br>_');
      }
    }
    
    // Add data attributes for hover functionality
    const encodedKey = encodeURIComponent(key);
    statsHTML += `<div class="heightgraph-stat-item" 
      data-encoded-type="${encodedType}" 
      data-value="${encodedKey}" 
      style="background-color: ${backgroundColor}; cursor: pointer;">
      <span class="heightgraph-stat-label">${displayKey}</span>
      <span class="heightgraph-stat-value">${distanceKm} km</span>
    </div>`;
  });
  
  statsContainer.innerHTML = statsHTML;
  statsContainer.style.display = 'flex';
  
  // Setup hover handlers for stats items
  setupStatsHoverHandlers(encodedType, data, coordinates);
}

/**
 * Setup hover handlers for stats items to highlight corresponding route segments
 */
function setupStatsHoverHandlers(encodedType, data, coordinates) {
  const statsItems = document.querySelectorAll('.heightgraph-stat-item');
  const map = routeState.mapInstance;
  
  if (!map || !statsItems.length || !data || !coordinates) {
    return;
  }
  
  statsItems.forEach(item => {
    const encodedValue = decodeURIComponent(item.dataset.value);
    const valueType = item.dataset.encodedType;
    
    item.addEventListener('mouseenter', () => {
      highlightSegmentsByValue(map, valueType, encodedValue, data, coordinates);
    });
    
    item.addEventListener('mouseleave', () => {
      clearHighlightedSegments(map);
    });
  });
}

/**
 * Highlight all route segments that match the given value
 */
function highlightSegmentsByValue(map, encodedType, targetValue, data, coordinates) {
  if (!map.getSource('route-hover-segment') || !data || !coordinates) {
    return;
  }
  
  const segments = [];
  
  // Find all segments that match the target value
  for (let i = 0; i < data.length - 1 && i < coordinates.length - 1; i++) {
    const value = data[i];
    
    if (value === null || value === undefined) {
      continue;
    }
    
    // Normalize value for comparison
    let normalizedValue;
    if (encodedType === 'mapillary_coverage') {
      const isTrue = value === true || value === 'True' || value === 'true';
      normalizedValue = isTrue ? 'true' : 'false';
    } else {
      normalizedValue = String(value);
    }
    
    // Check if this segment matches the target value
    if (normalizedValue === targetValue) {
      const segmentCoords = [
        coordinates[i],
        coordinates[i + 1]
      ];
      
      // Get color for the segment
      const allValues = data;
      const segmentColor = getColorForEncodedValue(encodedType, value, allValues);
      
      segments.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: segmentCoords
        },
        properties: {
          color: segmentColor
        }
      });
    }
  }
  
  // Update the hover segment source with all matching segments
  if (segments.length > 0) {
    map.getSource('route-hover-segment').setData({
      type: 'FeatureCollection',
      features: segments
    });
    
    // Update layer to use property-based coloring
    map.setPaintProperty('route-hover-segment-layer', 'line-color', ['get', 'color']);
  }
}

/**
 * Clear highlighted segments
 */
function clearHighlightedSegments(map) {
  if (map.getSource('route-hover-segment')) {
    map.getSource('route-hover-segment').setData({
      type: 'FeatureCollection',
      features: []
    });
  }
}

