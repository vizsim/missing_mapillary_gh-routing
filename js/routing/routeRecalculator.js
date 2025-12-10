/**
 * Centralized route recalculation logic
 * Handles all route recalculation triggers to eliminate circular dependencies
 */

import { routeState } from './routeState.js';

let calculateRouteFn = null;

/**
 * Set the calculateRoute function (called once from routing.js)
 * @param {Function} fn - The calculateRoute function
 */
export function setCalculateRouteFunction(fn) {
  calculateRouteFn = fn;
}

/**
 * Recalculate route if start and end points are available
 * This centralizes all route recalculation logic
 */
export function recalculateRouteIfReady() {
  // Lazy load if not set yet (shouldn't happen in normal flow, but safety check)
  if (!calculateRouteFn) {
    import('./routing.js').then(({ calculateRoute }) => {
      setCalculateRouteFunction(calculateRoute);
      recalculateRouteIfReady();
    });
    return;
  }
  
  // Only recalculate if we have both start and end points
  if (routeState.startPoint && routeState.endPoint && routeState.mapInstance) {
    calculateRouteFn(
      routeState.mapInstance,
      routeState.startPoint,
      routeState.endPoint,
      routeState.waypoints
    );
  }
}

