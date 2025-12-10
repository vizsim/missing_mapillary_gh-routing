/**
 * Waypoint Management - CRUD operations for waypoints
 */

import { routeState } from '../routeState.js';
import { getRandomWaypointSvg } from '../routingUI.js';
import { reverseGeocode } from '../../utils/geocoder.js';
import { updateMarkers } from '../routingUI.js';
import { updateWaypointsList } from './waypointList.js';
import { updateCoordinateTooltips } from '../coordinates/coordinateTooltips.js';
import { recalculateRouteIfReady } from '../routeRecalculator.js';

/**
 * Add waypoint to route
 * @param {maplibregl.Map} map - Map instance
 * @param {Object} lngLat - Longitude/latitude coordinates
 */
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
  recalculateRouteIfReady();
}

/**
 * Remove waypoint from route
 * @param {number} index - Waypoint index
 */
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
    recalculateRouteIfReady();
  }
}

