/**
 * Coordinate Tooltips Management
 * Handles tooltip updates for start, end, and waypoint coordinates
 */

import { routeState } from '../routeState.js';

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

