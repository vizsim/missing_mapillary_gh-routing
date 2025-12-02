// GraphHopper Routing Integration - Core Module
// This module handles route calculation, API calls, and coordinates the other routing modules

import { routeState } from './routeState.js';
import { setupUIHandlers } from './routingUI.js';
import { setupHeightgraphHandlers, drawHeightgraph, cleanupHeightgraphHandlers } from './heightgraph.js';
import { setupRouteHover, updateRouteColor } from './routeVisualization.js';
import {
  supportsCustomModel,
  getGraphHopperProfile,
  ensureCustomModel,
  buildPostRequestBodyWithCustomModel,
  getMapillaryPriority,
  updateMapillaryPriority
} from './customModel.js';
import { calculateDistance } from './heightgraph/heightgraphUtils.js';
import { optimizeWaypoints } from './waypointOptimizer.js';
import { generateRouteInfoHTML, displayRouteError, formatTime, formatNumberWithThousandSeparator } from './routeInfoFormatter.js';
import {
  GRAPHHOPPER_URL,
  ERROR_MESSAGES,
  ROUTE_CALCULATION as ROUTE_CONFIG,
  COORDINATE_LIMITS,
  UI_IDS,
  LAYER_IDS,
  CONTEXT_LAYER_IDS
} from '../utils/constants.js';

// Flag to prevent parallel route calculations
let routeCalculationInProgress = false;

export function isRouteCalculationInProgress() {
  return routeCalculationInProgress;
}

/**
 * Get user-friendly error message from error object
 * @param {Error} error - Error object
 * @returns {string} User-friendly error message
 */
function getUserFriendlyErrorMessage(error) {
  if (!error) return ERROR_MESSAGES.NETWORK_ERROR;
  
  const message = error.message || String(error);
  
  if (message === 'OUT_OF_BOUNDS' || 
      message.includes('PointNotFoundException') || 
      message.includes('Cannot find point')) {
    return ERROR_MESSAGES.OUT_OF_BOUNDS;
  }
  
  if (message.includes('Network error') || message.includes('fetch')) {
    return `${ERROR_MESSAGES.NETWORK_ERROR}: ${message}`;
  }
  
  return message;
}

// Calculate comparison route with Weight=1 and show differences
async function calculateComparisonWithWeightOne(map, allPoints, currentPath, currentEncodedValues, currentCoordinates, currentWeight) {
  try {
    // Create a copy of the custom model with Weight=1
    const comparisonCustomModel = JSON.parse(JSON.stringify(routeState.customModel));
    updateMapillaryPriority(comparisonCustomModel, 1.0);
    
    // Build request for comparison route
    const requestBody = buildPostRequestBodyWithCustomModel(
      allPoints,
      routeState.selectedProfile,
      comparisonCustomModel
    );
    
    // Fetch comparison route
    const response = await fetch(`${GRAPHHOPPER_URL}/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.paths && data.paths.length > 0) {
      const comparisonPath = data.paths[0];
      
      // Calculate differences
      const distanceDiff = comparisonPath.distance - currentPath.distance; // in meters
      const timeDiff = (comparisonPath.time - currentPath.time) / 1000; // in seconds
      
      // Calculate mapillary_coverage distance for current route
      const currentMapillaryDistance = calculateMapillaryCoverageDistance(currentCoordinates, currentEncodedValues);
      
      // Get comparison route coordinates and encoded values
      let comparisonCoordinates = [];
      if (comparisonPath.points && comparisonPath.points.coordinates) {
        comparisonCoordinates = comparisonPath.points.coordinates;
      } else if (comparisonPath.points && comparisonPath.points.geometry && comparisonPath.points.geometry.coordinates) {
        comparisonCoordinates = comparisonPath.points.geometry.coordinates;
      }
      
      // Extract encoded values from comparison route using the same logic as main route
      const comparisonEncodedValues = extractEncodedValuesFull(comparisonPath, comparisonCoordinates);
      
      // Calculate mapillary_coverage distance for comparison route
      const comparisonMapillaryDistance = calculateMapillaryCoverageDistance(comparisonCoordinates, comparisonEncodedValues);
      
      const mapillaryDistanceDiff = comparisonMapillaryDistance - currentMapillaryDistance;
      
      // Display comparison
      displayComparison(distanceDiff, timeDiff, mapillaryDistanceDiff);
    }
  } catch (error) {
    console.error('Error calculating comparison route:', error);
    // Hide comparison on error
    const comparisonContainer = document.getElementById(UI_IDS.COMPARISON_CONTAINER);
    if (comparisonContainer) {
      comparisonContainer.style.display = 'none';
    }
  }
}

// Calculate distance of segments with mapillary_coverage==false
// A segment goes from point i to point i+1, and the value belongs to point i
function calculateMapillaryCoverageDistance(coordinates, encodedValues) {
  if (!coordinates || coordinates.length < 2 || !encodedValues || !encodedValues.mapillary_coverage) {
    return 0;
  }
  
  let totalDistance = 0;
  const mapillaryCoverage = encodedValues.mapillary_coverage;
  
  // Iterate over segments: segment i goes from point i to point i+1
  // The mapillary_coverage value at point i applies to this segment
  for (let i = 0; i < coordinates.length - 1; i++) {
    // Check if the segment has mapillary_coverage==false
    // Accept both false and 0 as valid "no coverage" values
    const hasNoCoverage = mapillaryCoverage[i] === false || mapillaryCoverage[i] === 0 || 
                          mapillaryCoverage[i] === null || mapillaryCoverage[i] === undefined;
    
    if (hasNoCoverage) {
      // Calculate segment distance using Haversine formula
      const segmentDist = calculateDistance(coordinates[i], coordinates[i + 1]);
      totalDistance += segmentDist;
    }
  }
  
  return totalDistance;
}

// Extract encoded values using the same full logic as main route calculation
// This ensures mapillary_coverage is extracted correctly from both details and instructions
function extractEncodedValuesFull(path, coordinates) {
  const encodedValues = {};
  
  // Helper function to map detail arrays to coordinate arrays
  const mapDetailsToCoordinates = (detailArray, coordinatesLength) => {
    if (!detailArray || !Array.isArray(detailArray)) return null;
    
    const result = new Array(coordinatesLength).fill(null);
    detailArray.forEach(([startIdx, endIdx, value]) => {
      if (typeof startIdx === 'number' && typeof endIdx === 'number') {
        for (let i = startIdx; i <= endIdx && i < coordinatesLength; i++) {
          result[i] = value;
        }
      }
    });
    return result;
  };
  
  // Extract from path.details
  if (path.details && Object.keys(path.details).length > 0) {
    Object.keys(path.details).forEach(detailKey => {
      const detailArray = path.details[detailKey];
      if (Array.isArray(detailArray) && detailArray.length > 0) {
        encodedValues[detailKey] = mapDetailsToCoordinates(detailArray, coordinates.length);
      }
    });
    
    // Also check for time and distance in details (if available)
    if (path.details.time) {
      encodedValues.time = mapDetailsToCoordinates(path.details.time, coordinates.length);
    }
    if (path.details.distance) {
      encodedValues.distance = mapDetailsToCoordinates(path.details.distance, coordinates.length);
    }
  }
  
  // Extract data from instructions - they contain per-segment information
  if (path.instructions && path.instructions.length > 0) {
    // Map instruction data to coordinates using intervals
    const timeArray = new Array(coordinates.length).fill(0);
    const distanceArray = new Array(coordinates.length).fill(0);
    const streetNameArray = new Array(coordinates.length).fill('');
    const customPresentArray = new Array(coordinates.length).fill(null);
    
    const osmWayIdArray = new Array(coordinates.length).fill(null);
    
    path.instructions.forEach((inst) => {
      if (inst.interval && Array.isArray(inst.interval) && inst.interval.length === 2) {
        const [startIdx, endIdx] = inst.interval;
        // Fill the interval with instruction values
        for (let i = startIdx; i <= endIdx && i < coordinates.length; i++) {
          timeArray[i] = inst.time || 0;
          distanceArray[i] = inst.distance || 0;
          streetNameArray[i] = inst.street_name || '';
          // Check if mapillary_coverage is in instruction
          if (inst.mapillary_coverage !== undefined) {
            customPresentArray[i] = inst.mapillary_coverage;
          }
          // Extract osm_way_id from instruction if available
          if (inst.osm_way_id !== undefined) {
            osmWayIdArray[i] = inst.osm_way_id;
          }
        }
      }
    });
    
    // Also check osm_way_id in details
    if (path.details && path.details.osm_way_id) {
      const osmWayIdDetails = mapDetailsToCoordinates(path.details.osm_way_id, coordinates.length);
      for (let i = 0; i < coordinates.length; i++) {
        if (osmWayIdDetails[i] !== null && osmWayIdArray[i] === null) {
          osmWayIdArray[i] = osmWayIdDetails[i];
        }
      }
    }
    
    // Store OSM way IDs if available
    if (osmWayIdArray.some(id => id !== null)) {
      encodedValues.osm_way_id = osmWayIdArray;
    }
    
    // Store as encoded values
    encodedValues.time = timeArray;
    encodedValues.distance = distanceArray;
    encodedValues.street_name = streetNameArray;
    // Only set mapillary_coverage if we have values
    if (customPresentArray.some(v => v !== null)) {
      encodedValues.mapillary_coverage = customPresentArray;
    }
  }
  
  return encodedValues;
}

// Display comparison results
function displayComparison(
  distanceDiff, 
  timeDiff, 
  mapillaryDistanceDiff
) {
  const comparisonContainer = document.getElementById(UI_IDS.COMPARISON_CONTAINER);
  if (!comparisonContainer) return;
  
  // Format differences - always show as positive values (absolute)
  const formatDistance = (meters) => {
    const absMeters = Math.abs(meters);
    if (absMeters < 1000) {
      return `${Math.round(absMeters)} m`;
    }
    return `${(absMeters / 1000).toFixed(2)} km`;
  };
  
  const formatTime = (seconds) => {
    const absSeconds = Math.abs(seconds);
    if (absSeconds < 60) {
      return `${Math.round(absSeconds)} s`;
    }
    const minutes = Math.round(absSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${minutes} min`;
  };
  
  const distanceElement = document.getElementById('comparison-distance');
  const timeElement = document.getElementById('comparison-time');
  const mapillaryDistanceElement = document.getElementById('comparison-mapillary-distance');
  
  if (!distanceElement || !timeElement || !mapillaryDistanceElement) {
    console.warn('Comparison elements not found');
    return;
  }
  
  if (distanceElement) {
    const textSpan = distanceElement.querySelector('.comparison-text');
    if (textSpan) {
      textSpan.textContent = formatDistance(distanceDiff);
    }
  }
  
  if (timeElement) {
    const textSpan = timeElement.querySelector('.comparison-text');
    if (textSpan) {
      textSpan.textContent = formatTime(timeDiff);
    }
  }
  
  if (mapillaryDistanceElement) {
    const textSpan = mapillaryDistanceElement.querySelector('.comparison-text');
    if (textSpan) {
      textSpan.textContent = formatDistance(mapillaryDistanceDiff);
    }
  }
  
  // Show container
  comparisonContainer.style.display = 'block';
}

/**
 * Validate coordinates before route calculation
 * @param {Array|Object} coord - Coordinate as [lng, lat] or {lng, lat}
 * @param {string} name - Name of the coordinate (for error messages)
 * @throws {Error} If coordinates are invalid
 */
function validateCoordinates(coord, name) {
  if (!coord) {
    throw new Error(`${name}: Koordinaten fehlen`);
  }
  
  let lng, lat;
  
  // Support both array format [lng, lat] and object format {lng, lat, svgId}
  if (Array.isArray(coord)) {
    if (coord.length < 2) {
      throw new Error(`${name}: Koordinaten müssen ein Array mit mindestens 2 Werten sein`);
    }
    [lng, lat] = coord;
  } else if (coord && typeof coord === 'object') {
    lng = coord.lng;
    lat = coord.lat;
  } else {
    throw new Error(`${name}: Koordinaten müssen ein Array [lng, lat] oder Objekt {lng, lat} sein`);
  }
  
  if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
    throw new Error(`${name}: Länge und Breite müssen gültige Zahlen sein`);
  }
  
  if (lng < COORDINATE_LIMITS.MIN_LNG || lng > COORDINATE_LIMITS.MAX_LNG) {
    throw new Error(`${name}: Länge muss zwischen ${COORDINATE_LIMITS.MIN_LNG} und ${COORDINATE_LIMITS.MAX_LNG} liegen`);
  }
  
  if (lat < COORDINATE_LIMITS.MIN_LAT || lat > COORDINATE_LIMITS.MAX_LAT) {
    throw new Error(`${name}: Breite muss zwischen ${COORDINATE_LIMITS.MIN_LAT} und ${COORDINATE_LIMITS.MAX_LAT} liegen`);
  }
}

// Get profile parameter (car_customizable -> car)
function getProfileParam() {
  return getGraphHopperProfile(routeState.selectedProfile);
}

// Build GET request URL for route calculation
// points: Array of [lng, lat] coordinates
function buildGetRequestUrl(points, profileParam) {
  // Build point parameters: point=lat,lng&point=lat,lng&...
  const pointParams = points.map(p => `point=${p[1]},${p[0]}`).join('&');
  const baseUrl = `${GRAPHHOPPER_URL}/route?${pointParams}&profile=${profileParam}&points_encoded=false&elevation=true`;
  const chDisableParam = (profileParam === 'car' || profileParam === 'bike') ? '&ch.disable=true' : '';
  const detailsParams = ['surface', 'mapillary_coverage', 'road_class', 'road_access', 'bicycle_infra', 'osm_way_id']
    .map(d => `details=${d}`)
    .join('&');
  return `${baseUrl}${chDisableParam}&${detailsParams}&type=json`;
}

// Fetch route with GET request (with fallback for details format)
async function fetchRouteGet(url) {
  try {
    let response = await fetch(url);
    if (response.ok) return response;
    
    // Try comma-separated details format
    const urlComma = url.replace(/details=[^&]+/g, 'details=' + ['surface', 'mapillary_coverage', 'road_class', 'road_access', 'bicycle_infra'].join(','));
    response = await fetch(urlComma);
    if (response.ok) return response;
    
    // Try without details
    const urlNoDetails = url.replace(/&details=[^&]+/g, '').replace(/details=[^&]+&/g, '');
    response = await fetch(urlNoDetails);
    return response;
  } catch (error) {
    throw new Error(`${ERROR_MESSAGES.NETWORK_ERROR}. Stelle sicher, dass GraphHopper auf ${GRAPHHOPPER_URL} läuft: ${error.message}`);
  }
}

// Extract coordinates from GraphHopper response
function extractCoordinates(path) {
  if (path.points && path.points.coordinates) {
    return path.points.coordinates;
  } else if (path.points && path.points.geometry && path.points.geometry.coordinates) {
    return path.points.geometry.coordinates;
  }
  throw new Error('Route points format not recognized. Response: ' + JSON.stringify(path).substring(0, 200));
}

// Normalize coordinates to [lng, lat] format
function normalizeCoordinates(coordinates) {
  return coordinates.map(coord => {
    if (Array.isArray(coord) && coord.length >= 2) {
      // If first value is <= 90, it's likely latitude - swap to [lng, lat]
      if (Math.abs(coord[0]) <= 90 && Math.abs(coord[1]) > 90) {
        return [coord[1], coord[0]];
      }
      return [coord[0], coord[1]];
    }
    return coord;
  });
}

// Extract elevation data from path
function extractElevation(path, coordinates) {
  let elevations = [];
  let hasElevation = false;
  
  // Check if coordinates include elevation (3rd value)
  if (coordinates.length > 0 && coordinates[0].length >= 3) {
    elevations = coordinates.map(coord => coord[2] || null);
    hasElevation = elevations.some(e => e !== null);
    // Remove elevation from coordinates for MapLibre
    coordinates = coordinates.map(coord => [coord[0], coord[1]]);
  } else if (path.points && path.points.elevation) {
    elevations = path.points.elevation;
    hasElevation = elevations && elevations.length > 0;
  } else if (path.elevation) {
    elevations = path.elevation;
    hasElevation = elevations && elevations.length > 0;
  }
  
  return { elevations, hasElevation, coordinates };
}

// Map detail arrays to coordinate arrays
function mapDetailsToCoordinates(detailArray, coordinatesLength) {
  if (!detailArray || !Array.isArray(detailArray)) return null;
  
  const result = new Array(coordinatesLength).fill(null);
  detailArray.forEach(([startIdx, endIdx, value]) => {
    if (typeof startIdx === 'number' && typeof endIdx === 'number') {
      for (let i = startIdx; i <= endIdx && i < coordinatesLength; i++) {
        result[i] = value;
      }
    }
  });
  return result;
}

// Extract encoded values (details) from path
function extractEncodedValues(path, coordinates) {
  const encodedValues = {};
  
  // Extract from path.details
  if (path.details && Object.keys(path.details).length > 0) {
    Object.keys(path.details).forEach(detailKey => {
      const detailArray = path.details[detailKey];
      if (Array.isArray(detailArray) && detailArray.length > 0) {
        encodedValues[detailKey] = mapDetailsToCoordinates(detailArray, coordinates.length);
      }
    });
  }
  
  // Extract from instructions
  if (path.instructions && path.instructions.length > 0) {
    const timeArray = new Array(coordinates.length).fill(0);
    const distanceArray = new Array(coordinates.length).fill(0);
    const streetNameArray = new Array(coordinates.length).fill('');
    const mapillaryArray = new Array(coordinates.length).fill(null);
    
    path.instructions.forEach((inst) => {
      if (inst.interval && Array.isArray(inst.interval) && inst.interval.length === 2) {
        const [startIdx, endIdx] = inst.interval;
        for (let i = startIdx; i <= endIdx && i < coordinates.length; i++) {
          timeArray[i] = inst.time || 0;
          distanceArray[i] = inst.distance || 0;
          streetNameArray[i] = inst.street_name || '';
          if (inst.mapillary_coverage !== undefined) {
            mapillaryArray[i] = inst.mapillary_coverage;
          }
        }
      }
    });
    
    encodedValues.time = timeArray;
    encodedValues.distance = distanceArray;
    encodedValues.street_name = streetNameArray;
    if (mapillaryArray.some(v => v !== null)) {
      encodedValues.mapillary_coverage = mapillaryArray;
    }
  }
  
  return encodedValues;
}


export function setupRouting(map) {
  routeState.init(map);
  
  // Create source for route line
  if (!map.getSource(LAYER_IDS.ROUTE)) {
    map.addSource(LAYER_IDS.ROUTE, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });
  }

  // Create source for heightgraph hover point (point on route line)
  if (!map.getSource(LAYER_IDS.HEIGHTGRAPH_HOVER_POINT)) {
    map.addSource(LAYER_IDS.HEIGHTGRAPH_HOVER_POINT, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });
  }

  // Create source for route hover segment (highlighted segment on hover)
  if (!map.getSource(LAYER_IDS.ROUTE_HOVER_SEGMENT)) {
    map.addSource(LAYER_IDS.ROUTE_HOVER_SEGMENT, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });
  }
  
  // Create layer for route line (on top of mapillary_coverage layer)
  if (!map.getLayer(LAYER_IDS.ROUTE_LAYER)) {
    map.addLayer({
      id: LAYER_IDS.ROUTE_LAYER,
      type: 'line',
      source: LAYER_IDS.ROUTE,
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#3b82f6',
        'line-width': 5,
        'line-opacity': 0.8
      }
    });
  }
  
  // Create layer for route hover segment (highlighted segment on hover)
  if (!map.getLayer(LAYER_IDS.ROUTE_HOVER_SEGMENT_LAYER)) {
    map.addLayer({
      id: LAYER_IDS.ROUTE_HOVER_SEGMENT_LAYER,
      type: 'line',
      source: LAYER_IDS.ROUTE_HOVER_SEGMENT,
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#3b82f6',
        'line-width': 8,
        'line-opacity': 1.0
      }
    });
  }

  // Create layer for heightgraph hover point (point on route line)
  if (!map.getLayer(LAYER_IDS.HEIGHTGRAPH_HOVER_POINT_LAYER)) {
    map.addLayer({
      id: LAYER_IDS.HEIGHTGRAPH_HOVER_POINT_LAYER,
      type: 'circle',
      source: LAYER_IDS.HEIGHTGRAPH_HOVER_POINT,
      paint: {
        'circle-radius': 8,
        'circle-color': '#ef4444',
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 1.0
      }
    });
  }
  
  // Setup hover interaction for route
  setupRouteHover(map);

  setupUIHandlers(map);
  setupHeightgraphHandlers();
  
  // Automatically activate start point selection mode on map load
  // BUT only if no points were loaded from permalink
  if (!routeState.startPoint && !routeState.endPoint) {
    routeState.isSelectingStart = true;
    if (map.getCanvas()) {
      map.getCanvas().style.cursor = 'crosshair';
    }
    
    // Mark start button as active
    const startBtn = document.getElementById('set-start');
    if (startBtn) {
      startBtn.classList.add('active');
    }
  }
}

export async function calculateRoute(map, start, end, waypoints = []) {
  if (!map) {
    console.error('calculateRoute: map instance is required');
    return;
  }
  
  // Prevent parallel route calculations
  if (routeCalculationInProgress) {
    console.warn(ERROR_MESSAGES.ROUTE_CALCULATION_IN_PROGRESS);
    return;
  }
  
  // Validate coordinates
  validateCoordinates(start, 'Startpunkt');
  validateCoordinates(end, 'Endpunkt');
  waypoints.forEach((wp, index) => {
    validateCoordinates(wp, `Zwischenpunkt ${index + 1}`);
  });
  
  // Optimize waypoint order if enabled, we have waypoints, and they weren't manually sorted
  let optimizedWaypoints = waypoints;
  if (waypoints.length > 1 && 
      routeState.waypointOptimizationEnabled !== false && 
      !routeState.waypointsManuallySorted) {
    const algorithm = routeState.waypointOptimizationAlgorithm || 'nearest_neighbor';
    optimizedWaypoints = optimizeWaypoints(start, end, waypoints, algorithm);
    
    // Update routeState with optimized order if order changed
    if (JSON.stringify(optimizedWaypoints) !== JSON.stringify(waypoints)) {
      // Create mapping from old waypoint to new index
      const waypointMap = new Map();
      waypoints.forEach((wp, oldIndex) => {
        const wpKey = Array.isArray(wp) ? `${wp[0]},${wp[1]}` : `${wp.lng},${wp.lat}`;
        waypointMap.set(wpKey, oldIndex);
      });
      
      // Reorder addresses according to new waypoint order
      const reorderedAddresses = optimizedWaypoints.map(wp => {
        const wpKey = Array.isArray(wp) ? `${wp[0]},${wp[1]}` : `${wp.lng},${wp.lat}`;
        const oldIndex = waypointMap.get(wpKey);
        return oldIndex !== undefined ? routeState.waypointAddresses[oldIndex] : null;
      });
      
      routeState.waypoints = optimizedWaypoints;
      routeState.waypointAddresses = reorderedAddresses;
      
      // Update UI to reflect new order
      import('./routingUI.js').then(({ updateMarkers, updateWaypointsList, updateCoordinateTooltips }) => {
        updateMarkers(map);
        updateWaypointsList();
        updateCoordinateTooltips();
      });
    }
  }
  
  // Build points array: [start, ...optimizedWaypoints, end]
  // Extract coordinates from waypoint objects if needed
  const waypointCoords = optimizedWaypoints.map(wp => {
    if (Array.isArray(wp)) {
      return wp;
    } else if (wp && typeof wp === 'object' && wp.lng !== undefined && wp.lat !== undefined) {
      return [wp.lng, wp.lat];
    }
    return wp;
  });
  const allPoints = [start, ...waypointCoords, end];
  
  routeCalculationInProgress = true;
  const calculateBtn = document.getElementById(UI_IDS.CALCULATE_BTN);
  const routeInfo = document.getElementById(UI_IDS.ROUTE_INFO);
  
  if (calculateBtn) {
    calculateBtn.disabled = true;
    calculateBtn.textContent = 'Berechne...';
  }

  try {
    // Prepare profile and custom model
    const profileParam = getProfileParam();
    
    // Ensure custom model is initialized if needed
    if (supportsCustomModel(routeState.selectedProfile)) {
      routeState.customModel = ensureCustomModel(routeState.customModel, routeState.selectedProfile);
    }
    
    // Fetch route from GraphHopper API
    const hasCustomModel = supportsCustomModel(routeState.selectedProfile) && routeState.customModel;
    let response;
    
    if (hasCustomModel) {
      // POST request with JSON body
      const requestBody = buildPostRequestBodyWithCustomModel(
        allPoints,
        routeState.selectedProfile,
        routeState.customModel
      );
      
      try {
        response = await fetch(`${GRAPHHOPPER_URL}/route`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
      } catch (error) {
        throw new Error(`${ERROR_MESSAGES.NETWORK_ERROR}. Stelle sicher, dass GraphHopper auf ${GRAPHHOPPER_URL} läuft: ${error.message}`);
      }
    } else {
      // GET request with URL parameters
      const url = buildGetRequestUrl(allPoints, profileParam);
      response = await fetchRouteGet(url);
    }
    
    // Check response status
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText;
      
      // Try to parse JSON error message
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch (e) {
        // Not JSON, use text as is
      }
      
      // Check if it's a PointNotFoundException
      if (errorMessage.includes('PointNotFoundException') || errorMessage.includes('Cannot find point')) {
        throw new Error('OUT_OF_BOUNDS');
      }
      
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorMessage}`);
    }
    
    const data = await response.json();
    
    if (data.paths && data.paths.length > 0) {
      const path = data.paths[0];
      let coordinates = [];
      
      // GraphHopper with points_encoded=false returns coordinates in the points.geometry.coordinates array
      // Format is GeoJSON LineString: coordinates are [lng, lat] arrays
      if (path.points && path.points.coordinates) {
        // Direct coordinates array (GeoJSON format)
        coordinates = path.points.coordinates;
      } else if (path.points && path.points.geometry && path.points.geometry.coordinates) {
        // Nested geometry object
        coordinates = path.points.geometry.coordinates;
      } else {
        throw new Error('Route points format not recognized. Response: ' + JSON.stringify(path).substring(0, 200));
      }
      
      // Extract elevation data if available
      let elevations = [];
      let hasElevation = false;
      
      // Check if coordinates include elevation (3rd value) or if there's a separate elevation array
      if (coordinates.length > 0 && coordinates[0].length >= 3) {
        // Coordinates include elevation: [lng, lat, elevation]
        elevations = coordinates.map(coord => coord[2] || null);
        hasElevation = elevations.some(e => e !== null);
        // Remove elevation from coordinates for MapLibre
        coordinates = coordinates.map(coord => [coord[0], coord[1]]);
      } else if (path.points && path.points.elevation) {
        // Separate elevation array
        elevations = path.points.elevation;
        hasElevation = elevations && elevations.length > 0;
      } else if (path.elevation) {
        // Elevation at path level
        elevations = path.elevation;
        hasElevation = elevations && elevations.length > 0;
      }
      
      // Ensure coordinates are in [lng, lat] format for MapLibre
      // GraphHopper may return [lat, lng], so check and swap if needed
      coordinates = coordinates.map(coord => {
        // If first value is > 90 or < -90, it's likely longitude (already correct)
        // Otherwise, it might be latitude and we need to swap
        if (Array.isArray(coord) && coord.length >= 2) {
          if (Math.abs(coord[0]) <= 90 && Math.abs(coord[1]) > 90) {
            // Looks like [lat, lng] - swap to [lng, lat]
            return [coord[1], coord[0]];
          }
          // Already [lng, lat] or correct format
          return [coord[0], coord[1]];
        }
        return coord;
      });
      
      // Extract encoded values (details) if available
      // GraphHopper returns details as arrays: [[startIdx, endIdx, value], ...]
      const encodedValues = {};
      
      // Helper function to map detail arrays to coordinate arrays
      const mapDetailsToCoordinates = (detailArray, coordinatesLength) => {
        if (!detailArray || !Array.isArray(detailArray)) return null;
        
        const result = new Array(coordinatesLength).fill(null);
        detailArray.forEach(([startIdx, endIdx, value]) => {
          if (typeof startIdx === 'number' && typeof endIdx === 'number') {
            for (let i = startIdx; i <= endIdx && i < coordinatesLength; i++) {
              result[i] = value;
            }
          }
        });
        return result;
      };
      
      if (path.details && Object.keys(path.details).length > 0) {
        // Map detail arrays to coordinate arrays for all available details
        // GraphHopper returns details as: [[startIdx, endIdx, value], ...]
        Object.keys(path.details).forEach(detailKey => {
          const detailArray = path.details[detailKey];
          if (Array.isArray(detailArray) && detailArray.length > 0) {
            encodedValues[detailKey] = mapDetailsToCoordinates(detailArray, coordinates.length);
          }
        });
        
        // Also check for time and distance in details (if available)
        if (path.details.time) {
          encodedValues.time = mapDetailsToCoordinates(path.details.time, coordinates.length);
        }
        if (path.details.distance) {
          encodedValues.distance = mapDetailsToCoordinates(path.details.distance, coordinates.length);
        }
      }
      
      // Extract data from instructions - they contain per-segment information
      if (path.instructions && path.instructions.length > 0) {
        // Map instruction data to coordinates using intervals
        const timeArray = new Array(coordinates.length).fill(0);
        const distanceArray = new Array(coordinates.length).fill(0);
        const streetNameArray = new Array(coordinates.length).fill('');
        const customPresentArray = new Array(coordinates.length).fill(null);
        
        const osmWayIdArray = new Array(coordinates.length).fill(null);
        
        path.instructions.forEach((inst) => {
          if (inst.interval && Array.isArray(inst.interval) && inst.interval.length === 2) {
            const [startIdx, endIdx] = inst.interval;
            // Fill the interval with instruction values
            for (let i = startIdx; i <= endIdx && i < coordinates.length; i++) {
              timeArray[i] = inst.time || 0;
              distanceArray[i] = inst.distance || 0;
              streetNameArray[i] = inst.street_name || '';
              // Check if mapillary_coverage is in instruction or details
              if (inst.mapillary_coverage !== undefined) {
                customPresentArray[i] = inst.mapillary_coverage;
              }
              // Extract osm_way_id from instruction if available
              if (inst.osm_way_id !== undefined) {
                osmWayIdArray[i] = inst.osm_way_id;
              }
            }
          }
        });
        
        // Also check osm_way_id in details
        if (path.details && path.details.osm_way_id) {
          const osmWayIdDetails = mapDetailsToCoordinates(path.details.osm_way_id, coordinates.length);
          for (let i = 0; i < coordinates.length; i++) {
            if (osmWayIdDetails[i] !== null && osmWayIdArray[i] === null) {
              osmWayIdArray[i] = osmWayIdDetails[i];
            }
          }
        }
        
        // Store OSM way IDs if available
        if (osmWayIdArray.some(id => id !== null)) {
          encodedValues.osm_way_id = osmWayIdArray;
        }
        
        // Store as encoded values for visualization
        encodedValues.time = timeArray;
        encodedValues.distance = distanceArray;
        encodedValues.street_name = streetNameArray;
        // Only set mapillary_coverage if we have values
        if (customPresentArray.some(v => v !== null)) {
          encodedValues.mapillary_coverage = customPresentArray;
        }
      }
      
      // Update route layer - will be colored by updateRouteColor based on selected encoded value
      // Initially set as single feature, will be updated by updateRouteColor
      let routeSource = map.getSource(LAYER_IDS.ROUTE);
      if (!routeSource) {
        // Route source doesn't exist - likely after style change, create it now
        console.warn('Route source not found, creating it now');
        setupRouting(map);
        routeSource = map.getSource(LAYER_IDS.ROUTE);
        if (!routeSource) {
          throw new Error('Route source not found and could not be created');
        }
      }
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
      map.setPaintProperty(LAYER_IDS.ROUTE_LAYER, 'line-color', ['get', 'color']);
      
        // Update route color based on selected encoded value
        const select = document.getElementById(UI_IDS.ENCODED_SELECT);
        const selectedType = select ? select.value : 'mapillary_coverage';
        updateRouteColor(selectedType, encodedValues);
      
      // Update route info
      if (routeInfo) {
        routeInfo.innerHTML = generateRouteInfoHTML(path);
        
        // Store route data for redrawing heightgraph and route visualization
        routeState.currentRouteData = {
          elevations: hasElevation ? elevations : [],
          distance: path.distance,
          encodedValues: encodedValues,
          coordinates: coordinates
        };
        
        // Update context layers opacity when route is displayed
        updateContextLayersOpacity(map, true);
        
        // Show GPX export button
        const exportGpxBtn = document.getElementById(UI_IDS.EXPORT_GPX_BTN);
        if (exportGpxBtn) {
          exportGpxBtn.style.display = 'flex';
        }
        
        // Always show heightgraph if we have elevation or encoded values
        // The drawHeightgraph function now handles container width detection robustly
        const drawHeightgraphDelayed = () => {
          if (hasElevation && elevations.length > 0) {
            drawHeightgraph(elevations, path.distance, encodedValues, coordinates);
          } else if (Object.keys(encodedValues).length > 0) {
            // Show heightgraph even without elevation if we have encoded values
            drawHeightgraph([], path.distance, encodedValues, coordinates);
          } else {
            // Hide heightgraph if no data
            const heightgraphContainer = document.getElementById(UI_IDS.HEIGHTGRAPH_CONTAINER);
            if (heightgraphContainer) {
              heightgraphContainer.style.display = 'none';
            }
          }
        };
        
        // Show container and trigger panel positioning
        const heightgraphContainer = document.getElementById(UI_IDS.HEIGHTGRAPH_CONTAINER);
        if (heightgraphContainer) {
          heightgraphContainer.style.display = 'block';
          
          // Trigger panel positioning to ensure layout is calculated
          const routingPanel = document.querySelector('.routing-panel');
          if (routingPanel) {
            window.dispatchEvent(new Event('resize'));
          }
          
          // Wait for layout to settle - the drawHeightgraph function will handle width detection
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              drawHeightgraphDelayed();
            });
          });
        } else {
          requestAnimationFrame(() => {
            drawHeightgraphDelayed();
          });
        }
        
        // Update route color based on current selection
        updateRouteColor(routeState.currentEncodedType, encodedValues);
        
        // Calculate comparison with Weight=1 if current weight < 1
        if (supportsCustomModel(routeState.selectedProfile) && routeState.customModel) {
          const currentWeight = getMapillaryPriority(routeState.customModel);
          if (currentWeight !== null && currentWeight < 1.0) {
            calculateComparisonWithWeightOne(map, allPoints, path, encodedValues, coordinates, currentWeight);
          } else {
            // Hide comparison if weight >= 1
            const comparisonContainer = document.getElementById(UI_IDS.COMPARISON_CONTAINER);
            if (comparisonContainer) {
              comparisonContainer.style.display = 'none';
            }
          }
        }
      }
      
      // Fit map to route
      const bounds = coordinates.reduce((bounds, coord) => {
        return bounds.extend(coord);
      }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));
      
      // Calculate responsive padding based on viewport size
      const isMobile = window.innerWidth < 768;
      let padding;
      
      if (isMobile) {
        // On mobile: minimal padding, panels are usually collapsed or smaller
        padding = {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        };
      } else {
        // On desktop: account for right-side panels (routing panel: 320px + context panel: 320px + margins)
        const routingPanel = document.querySelector('.routing-panel');
        const contextPanel = document.querySelector('.context-panel');
        
        // Calculate actual panel widths dynamically
        let rightPanelWidth = 0;
        if (routingPanel && !routingPanel.classList.contains('collapsed')) {
          const routingRect = routingPanel.getBoundingClientRect();
          rightPanelWidth += routingRect.width + 10; // Panel width + margin
        }
        if (contextPanel && !contextPanel.classList.contains('collapsed')) {
          const contextRect = contextPanel.getBoundingClientRect();
          rightPanelWidth += contextRect.width + 10; // Panel width + margin
        }
        
        // Fallback to default if no panels found
        if (rightPanelWidth === 0) {
          rightPanelWidth = 320 + 10; // Default routing panel width
        }
        
        padding = {
          top: 50,
          right: rightPanelWidth + 20, // Extra padding for visibility
          bottom: 50,
          left: 50
        };
      }
      
      map.fitBounds(bounds, { padding });
    } else {
      throw new Error(ERROR_MESSAGES.NO_ROUTE_FOUND);
    }
  } catch (error) {
    console.error('Routing error:', error);
    
    const userFriendlyMessage = getUserFriendlyErrorMessage(error);
    displayRouteError(userFriendlyMessage, routeInfo);
    
    // Show alert with user-friendly message
    alert(`Fehler beim Berechnen der Route: ${userFriendlyMessage}`);
  } finally {
    routeCalculationInProgress = false;
    if (calculateBtn) {
      calculateBtn.disabled = false;
      calculateBtn.textContent = 'Route berechnen';
    }
  }
}

export function clearRoute(map) {
  // Cleanup heightgraph event handlers
  cleanupHeightgraphHandlers();
  
  routeState.reset();
  if (map && map.getCanvas()) {
    map.getCanvas().style.cursor = '';
  }
  
  const routeSource = map.getSource(LAYER_IDS.ROUTE);
  if (routeSource) {
    routeSource.setData({
      type: 'FeatureCollection',
      features: []
    });
  }
  
  // Clear heightgraph hover point
  const hoverPointSource = map.getSource(LAYER_IDS.HEIGHTGRAPH_HOVER_POINT);
  if (hoverPointSource) {
    hoverPointSource.setData({
      type: 'FeatureCollection',
      features: []
    });
  }
  
  // Hide comparison
  const comparisonContainer = document.getElementById(UI_IDS.COMPARISON_CONTAINER);
  if (comparisonContainer) {
    comparisonContainer.style.display = 'none';
  }
  
  // Remove active class from all start/end buttons (original and header)
  document.querySelectorAll('.btn-set-start, .btn-set-start-header, .btn-set-end, .btn-set-end-header').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const startInput = document.getElementById(UI_IDS.START_INPUT);
  const endInput = document.getElementById(UI_IDS.END_INPUT);
  if (startInput) startInput.value = '';
  if (endInput) endInput.value = '';
  
  // Hide heightgraph
  const heightgraphContainer = document.getElementById(UI_IDS.HEIGHTGRAPH_CONTAINER);
  if (heightgraphContainer) {
    heightgraphContainer.style.display = 'none';
  }
  
  // Hide GPX export button
  const exportGpxBtn = document.getElementById(UI_IDS.EXPORT_GPX_BTN);
  if (exportGpxBtn) {
    exportGpxBtn.style.display = 'none';
  }
  
  // Reset route color
  if (map && map.getLayer(LAYER_IDS.ROUTE_LAYER)) {
    map.setPaintProperty(LAYER_IDS.ROUTE_LAYER, 'line-color', '#3b82f6');
  }
  
  // Clear waypoints list in UI immediately
  const waypointsList = document.getElementById('waypoints-list');
  if (waypointsList) {
    waypointsList.innerHTML = '';
  }
  
  // Update UI to clear markers and tooltips
  import('./routingUI.js').then(({ updateMarkers, updateWaypointsList, updateCoordinateTooltips }) => {
    updateMarkers(map);
    updateWaypointsList(); // This will ensure the list is empty (routeState.waypoints is already cleared)
    updateCoordinateTooltips(); // Clear tooltips
  });
  
  // Restore context layers opacity when route is cleared
  updateContextLayersOpacity(map, false);
}

/**
 * Update opacity of context layers (bike lanes and missing streets) based on route visibility
 * @param {maplibregl.Map} map - Map instance
 * @param {boolean} hasRoute - Whether a route is currently displayed
 */
export function updateContextLayersOpacity(map, hasRoute) {
  if (!map) return;
  
  // Use context layer IDs from constants
  const contextLayerIds = CONTEXT_LAYER_IDS;
  
  // Default opacity values (from layer definitions)
  const defaultOpacity = {
    // Bike lanes don't have explicit opacity, so they default to 1.0
    'bike-lanes-needsClarification': 1.0,
    'bike-lanes-gehweg': 1.0,
    'bike-lanes-kfz': 1.0,
    'bike-lanes-fussverkehr': 1.0,
    'bike-lanes-eigenstaendig': 1.0,
    'bike-lanes-baulich': 1.0,
    // Missing streets have 0.7 opacity
    'missing-streets-missing-pathclasses': 0.7,
    'missing-streets-missing-roads': 0.7,
    'missing-streets-missing-bikelanes': 0.7,
    'missing-streets-regular-pathclasses': 0.7,
    'missing-streets-regular-roads': 0.7,
    'missing-streets-regular-bikelanes': 0.7,
    'missing-streets-pano-pathclasses': 0.7,
    'missing-streets-pano-roads': 0.7,
    'missing-streets-pano-bikelanes': 0.7
  };
  
  // Opacity when route is displayed (different for bike lanes and missing streets)
  const routeOpacity = {
    // Bike lanes: 0.5
    'bike-lanes-needsClarification': 0.5,
    'bike-lanes-gehweg': 0.5,
    'bike-lanes-kfz': 0.5,
    'bike-lanes-fussverkehr': 0.5,
    'bike-lanes-eigenstaendig': 0.5,
    'bike-lanes-baulich': 0.5,
    // Missing streets: 0.35
    'missing-streets-missing-pathclasses': 0.35,
    'missing-streets-missing-roads': 0.35,
    'missing-streets-missing-bikelanes': 0.35,
    'missing-streets-regular-pathclasses': 0.35,
    'missing-streets-regular-roads': 0.35,
    'missing-streets-regular-bikelanes': 0.35,
    'missing-streets-pano-pathclasses': 0.35,
    'missing-streets-pano-roads': 0.35,
    'missing-streets-pano-bikelanes': 0.35
  };
  
  contextLayerIds.forEach(layerId => {
    if (!map.getLayer(layerId)) return;
    
    // Check if layer is visible
    const visibility = map.getLayoutProperty(layerId, 'visibility');
    if (visibility !== 'visible') return;
    
    // Set opacity based on route visibility
    const opacity = hasRoute ? routeOpacity[layerId] : defaultOpacity[layerId];
    map.setPaintProperty(layerId, 'line-opacity', opacity);
  });
}
