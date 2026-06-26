// Shared route cursor — a single "scrub position" along the route that every
// view reflects: the height-profile indicator line, the red point on the route
// line, and the draggable handle on the route-profile barchart.
//
// The cursor is one route-coordinate index. Any view can move it (set), and any
// view can subscribe to render it (onCursorChange). Keeping it here — instead of
// inside one view — is what lets the three stay in sync, and makes the behaviour
// trivial to re-create in a React port (a piece of shared state + a context).

import { routeState } from './routeState.js';

const HOVER_POINT_SOURCE = 'heightgraph-hover-point';

let cursorIndex = null;
const listeners = new Set();

/** @returns {number|null} current route-coordinate index of the cursor */
export function getCursorIndex() {
  return cursorIndex;
}

/**
 * Subscribe to cursor changes. The callback receives the new index (or null).
 * @param {(index: number|null) => void} fn
 * @returns {() => void} unsubscribe
 */
export function onCursorChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Move the cursor. Pass null to hide it. The index is clamped to the route.
 * No-ops when the value is unchanged so views don't redraw needlessly.
 * @param {number|null} index
 */
export function setCursorIndex(index) {
  const coords = routeState.currentRouteData && routeState.currentRouteData.coordinates;
  let next = null;
  if (index != null && coords && coords.length > 0) {
    next = Math.max(0, Math.min(coords.length - 1, Math.round(index)));
  }
  if (next === cursorIndex) return;
  cursorIndex = next;
  updateMapPoint();
  listeners.forEach((fn) => {
    try {
      fn(cursorIndex);
    } catch (e) {
      console.warn('routeCursor listener failed:', e);
    }
  });
}

/** Hide the cursor (e.g. when the route is cleared). */
export function clearCursor() {
  setCursorIndex(null);
}

// The red point on the route line is owned by the cursor so it stays correct no
// matter which view moved it.
function updateMapPoint() {
  const map = routeState.mapInstance;
  const src = map && map.getSource(HOVER_POINT_SOURCE);
  if (!src) return;
  const coords = routeState.currentRouteData && routeState.currentRouteData.coordinates;
  if (cursorIndex == null || !coords || !coords[cursorIndex]) {
    src.setData({ type: 'FeatureCollection', features: [] });
    return;
  }
  const c = coords[cursorIndex];
  src.setData({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [c[0], c[1]] },
    properties: {},
  });
}
