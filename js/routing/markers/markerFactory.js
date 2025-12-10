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

/**
 * Create a start marker
 * @param {maplibregl.Map} map - Map instance
 * @param {Array<number>} lngLat - [lng, lat] coordinates
 * @returns {maplibregl.Marker} Created marker
 */
export function createStartMarker(map, lngLat) {
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
  
  const marker = new maplibregl.Marker({
    element: el,
    draggable: true,
    anchor: 'bottom'
  })
    .setLngLat(lngLat)
    .addTo(map);
  
  marker.on('dragstart', () => {
    el.style.cursor = 'grabbing';
  });
  
  marker.on('dragend', async () => {
    el.style.cursor = 'grab';
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
  
  const marker = new maplibregl.Marker({
    element: el,
    draggable: true,
    anchor: 'bottom'
  })
    .setLngLat(lngLat)
    .addTo(map);
  
  marker.on('dragstart', () => {
    el.style.cursor = 'grabbing';
  });
  
  marker.on('dragend', async () => {
    el.style.cursor = 'grab';
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
  const el = document.createElement('div');
  el.className = 'custom-marker waypoint-marker';
  el.style.width = '32px';
  el.style.height = '32px';
  el.style.cursor = 'grab';
  
  // Load and display the waypoint's unique SVG
  const svgPath = `svgs/${waypoint.svgId}`;
  el.innerHTML = `
    <div style="width: 32px; height: 32px; position: relative;">
      <img src="${svgPath}" alt="Waypoint ${index + 1}" class="waypoint-marker-img" style="width: 100%; height: 100%; object-fit: contain;">
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

