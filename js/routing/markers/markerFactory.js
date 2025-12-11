/**
 * Factory for creating route markers (Start, End, Waypoints)
 * Eliminates code duplication in marker creation
 */

import { routeState } from '../routeState.js';
import { reverseGeocode } from '../../utils/geocoder.js';
import { updateWaypointsList } from '../waypoints/waypointList.js';
import { updateCoordinateTooltips } from '../coordinates/coordinateTooltips.js';
import { recalculateRouteIfReady } from '../routeRecalculator.js';
import { showWaypointContextMenu } from './waypointContextMenu.js';

// Marker constants
const MARKER_SIZE = '32px';
const DROP_SHADOW_FILTER = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';

/**
 * Create base marker element with common properties
 * @param {string} className - CSS class name for the marker
 * @returns {HTMLDivElement} Marker element
 */
function createBaseMarkerElement(className) {
  const el = document.createElement('div');
  el.className = `custom-marker ${className}`;
  el.style.width = MARKER_SIZE;
  el.style.height = MARKER_SIZE;
  el.style.cursor = 'grab';
  el.style.filter = DROP_SHADOW_FILTER;
  return el;
}

/**
 * Setup common drag handlers for markers
 * @param {maplibregl.Marker} marker - Marker instance
 * @param {HTMLDivElement} el - Marker element
 */
function setupDragHandlers(marker, el) {
  marker.on('dragstart', () => {
    el.style.cursor = 'grabbing';
  });
  
  marker.on('dragend', () => {
    el.style.cursor = 'grab';
  });
}

/**
 * Create a start marker
 * @param {maplibregl.Map} map - Map instance
 * @param {Array<number>} lngLat - [lng, lat] coordinates
 * @returns {maplibregl.Marker} Created marker
 */
export function createStartMarker(map, lngLat) {
  const el = createBaseMarkerElement('start-marker');
  el.innerHTML = `
    <svg width="32" height="32" viewBox="0 0 24 24" fill="#10b981" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <g transform="translate(12, 10) scale(0.6) translate(-12, -12)">
        <path d="m9.9 16.97 7.436-7.436a8 8 0 0 0 2.145-3.89l.318-1.401-1.402.317a8 8 0 0 0-3.89 2.146L9.192 12.02m.707 4.95 2.122 3.535c1.178-1.178 2.828-2.828 0-5.657L9.899 16.97zm0 0-2.828-2.829m0 0L3.536 12.02c1.178-1.179 2.828-2.829 5.656 0m-2.12 2.121 2.12-2.121M4.95 16.263s-1.703 2.54-.707 3.536c.995.996 3.535-.707 3.535-.707" fill="white" stroke="white" stroke-width="1.5"/>
      </g>
    </svg>
  `;
  
  const marker = new maplibregl.Marker({
    element: el,
    draggable: true,
    anchor: 'bottom'
  })
    .setLngLat(lngLat)
    .addTo(map);
  
  setupDragHandlers(marker, el);
  
  marker.on('dragend', async () => {
    const newLngLat = marker.getLngLat();
    routeState.startPoint = [newLngLat.lng, newLngLat.lat];
    
    const startInput = document.getElementById('start-input');
    if (startInput) {
      startInput.value = `${newLngLat.lat.toFixed(5)}, ${newLngLat.lng.toFixed(5)}`;
    }
    
    // Update address for moved start point
    routeState.startAddress = await reverseGeocode(newLngLat.lng, newLngLat.lat);
    updateCoordinateTooltips();
    
    // Recalculate route if end point exists
    recalculateRouteIfReady();
  });
  
  return marker;
}

/**
 * Create an end marker
 * @param {maplibregl.Map} map - Map instance
 * @param {Array<number>} lngLat - [lng, lat] coordinates
 * @returns {maplibregl.Marker} Created marker
 */
export function createEndMarker(map, lngLat) {
  const el = createBaseMarkerElement('end-marker');
  el.innerHTML = `
    <svg width="32" height="32" viewBox="0 0 24 24" fill="#ef4444" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
  
  const marker = new maplibregl.Marker({
    element: el,
    draggable: true,
    anchor: 'bottom'
  })
    .setLngLat(lngLat)
    .addTo(map);
  
  setupDragHandlers(marker, el);
  
  marker.on('dragend', async () => {
    const newLngLat = marker.getLngLat();
    routeState.endPoint = [newLngLat.lng, newLngLat.lat];
    
    const endInput = document.getElementById('end-input');
    if (endInput) {
      endInput.value = `${newLngLat.lat.toFixed(5)}, ${newLngLat.lng.toFixed(5)}`;
    }
    
    // Update address for moved end point
    routeState.endAddress = await reverseGeocode(newLngLat.lng, newLngLat.lat);
    updateCoordinateTooltips();
    
    // Recalculate route if start point exists
    recalculateRouteIfReady();
  });
  
  return marker;
}

/**
 * Create a waypoint marker
 * @param {maplibregl.Map} map - Map instance
 * @param {Object} waypoint - Waypoint object with lng, lat, svgId
 * @param {number} index - Waypoint index (0-based)
 * @returns {maplibregl.Marker} Created marker
 */
export function createWaypointMarker(map, waypoint, index) {
  const el = createBaseMarkerElement('waypoint-marker');
  
  // Validate waypoint has svgId
  if (!waypoint || !waypoint.svgId) {
    console.warn('Waypoint missing svgId, using default');
  }
  
  // Load and display the waypoint's unique SVG
  const svgPath = `svgs/${waypoint?.svgId || 'raspberry-svgrepo-com.svg'}`;
  const waypointNumber = index + 1;
  
  // Create pin design similar to start/end markers
  // Orange pin with SVG icon in top (round) area and number in bottom (pointed) area
  el.innerHTML = `
    <svg width="32" height="32" viewBox="0 0 24 24" fill="#f59e0b" stroke="white" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
      <!-- Pin shape (round top, pointed bottom) -->
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <!-- SVG icon in upper round area (smaller) -->
      <image href="${svgPath}" x="6" y="4" width="12" height="12" style="filter: brightness(0) invert(1) drop-shadow(0 1px 1px rgba(0,0,0,0.3));" preserveAspectRatio="xMidYMid meet"/>
      <!-- Orange circular overlay behind number to hide symbol -->
      <circle cx="12" cy="15" r="4" fill="#f59e0b" stroke="none"/>
      <!-- Number in lower pointed area (smaller, slightly bold) -->
      <text x="12" y="18" text-anchor="middle" fill="white" stroke="none" font-size="7.5" font-weight="bold" font-family="Arial, sans-serif">${waypointNumber}</text>
    </svg>
  `;
  
  const marker = new maplibregl.Marker({
    element: el,
    draggable: true,
    anchor: 'bottom'
  })
    .setLngLat([waypoint.lng, waypoint.lat])
    .addTo(map);
  
  setupDragHandlers(marker, el);
  
  marker.on('dragend', async () => {
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
    recalculateRouteIfReady();
  });
  
  // Add context menu for waypoint deletion
  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showWaypointContextMenu(map, marker, index, e);
  });
  
  return marker;
}

