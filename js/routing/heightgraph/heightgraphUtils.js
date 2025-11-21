// Heightgraph utility functions

import { HEIGHTGRAPH_CONFIG } from './heightgraphConfig.js';

/**
 * Get label for encoded type
 */
export function getLabelForEncodedType(type) {
  const labels = {
    'road_class': 'Straßenklasse',
    'road_environment': 'Umgebung',
    'road_access': 'Zugang',
    'bicycle_infra': 'Fahrradinfrastruktur',
    'time': 'Zeit (s)',
    'distance': 'Distanz (m)',
    'street_name': 'Straßenname'
  };
  return labels[type] || type;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(coord1, coord2) {
  const R = 6371000; // Earth radius in meters
  const lat1 = coord1[1] * Math.PI / 180;
  const lat2 = coord2[1] * Math.PI / 180;
  const deltaLat = (coord2[1] - coord1[1]) * Math.PI / 180;
  const deltaLon = (coord2[0] - coord1[0]) * Math.PI / 180;
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Calculate cumulative distances for all coordinates
 * Returns { distances: number[], total: number }
 */
export function calculateCumulativeDistances(coordinates) {
  if (!coordinates || coordinates.length === 0) {
    return { distances: [], total: 0 };
  }
  
  const distances = [0];
  let total = 0;
  
  for (let i = 1; i < coordinates.length; i++) {
    const segmentDist = calculateDistance(coordinates[i - 1], coordinates[i]);
    total += segmentDist;
    distances.push(total);
  }
  
  return { distances, total };
}

/**
 * Validate heightgraph data for consistency
 */
export function validateHeightgraphData(elevations, coordinates, encodedValues) {
  const errors = [];
  
  if (elevations.length > 0 && coordinates.length > 0 && elevations.length !== coordinates.length) {
    errors.push(`Elevation count (${elevations.length}) doesn't match coordinates (${coordinates.length})`);
  }
  
  if (encodedValues) {
    Object.keys(encodedValues).forEach(key => {
      const values = encodedValues[key];
      if (Array.isArray(values) && coordinates.length > 0 && values.length !== coordinates.length) {
        errors.push(`Encoded value '${key}' length (${values.length}) doesn't match coordinates (${coordinates.length})`);
      }
    });
  }
  
  if (errors.length > 0) {
    console.warn('Heightgraph data validation errors:', errors);
  }
  
  return errors.length === 0;
}

/**
 * Get container width - tries to get actual width, falls back to default if not available
 * This is critical for first load (permalink or first route) when layout might not be ready
 */
export function getContainerWidth(container) {
  // Force a reflow to ensure layout is calculated
  void container.offsetWidth;
  
  const rect = container.getBoundingClientRect();
  const width = rect.width;
  
  // If we have a valid width (at least 200px), use it
  if (width > 0 && width >= 200) {
    return width;
  }
  
  // If width is still invalid, try one more time after forcing another reflow
  // This handles cases where the container was just made visible
  void container.offsetWidth;
  const rect2 = container.getBoundingClientRect();
  const width2 = rect2.width;
  
  if (width2 > 0 && width2 >= 200) {
    return width2;
  }
  
  // Fallback to default width - this will be corrected on next redraw
  // (e.g., when dropdown changes or window resizes)
  return HEIGHTGRAPH_CONFIG.canvas.defaultWidth;
}

