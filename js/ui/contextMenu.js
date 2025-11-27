// Context menu functionality for right-click on map

import { setStartPoint, setEndPoint, addWaypoint } from '../routing/routingUI.js';

let contextMenu = null;
let currentLngLat = null;

/**
 * Initialize context menu functionality
 * @param {maplibregl.Map} map - The map instance
 */
export function setupContextMenu(map) {
  contextMenu = document.getElementById('context-menu');
  if (!contextMenu) {
    console.warn('Context menu element not found');
    return;
  }

  // Handle right-click on map
  map.on('contextmenu', (e) => {
    e.preventDefault();
    showContextMenu(map, e.lngLat, e.point);
  });

  // Close menu on map move/zoom
  map.on('move', () => {
    hideContextMenu();
  });

  map.on('zoom', () => {
    hideContextMenu();
  });

  // Setup menu item handlers
  setupMenuHandlers(map);
}

/**
 * Show context menu at specified position
 * @param {maplibregl.Map} map - The map instance
 * @param {Object} lngLat - Longitude/latitude coordinates
 * @param {Object} point - Pixel coordinates (relative to map container)
 */
function showContextMenu(map, lngLat, point) {
  if (!contextMenu) return;

  currentLngLat = lngLat;

  // Update external links
  updateExternalLinks(lngLat, map.getZoom());

  // Position menu relative to map container
  const mapContainer = map.getContainer();
  const containerRect = mapContainer.getBoundingClientRect();
  
  // Get menu dimensions (need to show it first to measure)
  contextMenu.classList.remove('hidden');
  const menuWidth = contextMenu.offsetWidth || 200;
  const menuHeight = contextMenu.offsetHeight || 200;

  // Calculate position relative to viewport
  let left = containerRect.left + point.x;
  let top = containerRect.top + point.y;

  // Adjust if menu would go off screen
  if (left + menuWidth > window.innerWidth) {
    left = containerRect.left + point.x - menuWidth;
  }
  if (top + menuHeight > window.innerHeight) {
    top = containerRect.top + point.y - menuHeight;
  }

  // Ensure menu stays within viewport
  left = Math.max(0, Math.min(left, window.innerWidth - menuWidth));
  top = Math.max(0, Math.min(top, window.innerHeight - menuHeight));

  contextMenu.style.left = `${left}px`;
  contextMenu.style.top = `${top}px`;

  // Close menu when clicking outside (including on map)
  const closeOnOutsideClick = (e) => {
    // Check if click is outside menu
    if (contextMenu && !contextMenu.contains(e.target)) {
      hideContextMenu();
      document.removeEventListener('click', closeOnOutsideClick);
      document.removeEventListener('contextmenu', closeOnOutsideClick);
    }
  };

  // Use setTimeout to avoid immediate close on right-click
  // Use capture phase to catch events before they bubble
  setTimeout(() => {
    document.addEventListener('click', closeOnOutsideClick, true);
    document.addEventListener('contextmenu', closeOnOutsideClick, true);
  }, 100); // Small delay to allow menu to be fully rendered
}

/**
 * Hide context menu
 */
function hideContextMenu() {
  if (contextMenu) {
    contextMenu.classList.add('hidden');
  }
  currentLngLat = null;
}

/**
 * Update external links with current coordinates
 * @param {Object} lngLat - Longitude/latitude coordinates
 * @param {number} zoom - Map zoom level
 */
function updateExternalLinks(lngLat, zoom) {
  const lat = lngLat.lat;
  const lng = lngLat.lng;

  // Update OSM query link
  const osmLink = document.getElementById('context-menu-osm-query');
  if (osmLink) {
    osmLink.href = `https://www.openstreetmap.org/query?lat=${lat}&lon=${lng}`;
  }

  // Update Mapillary link
  const mapillaryLink = document.getElementById('context-menu-mapillary');
  if (mapillaryLink) {
    mapillaryLink.href = `https://www.mapillary.com/app/?focus=map&lat=${lat}&lng=${lng}&z=${zoom}&dateFrom=2023-01-01`;
  }
}

/**
 * Setup event handlers for menu items
 * @param {maplibregl.Map} map - The map instance
 */
function setupMenuHandlers(map) {
  // Helper to stop event propagation
  const stopEvent = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  };

  // Set start point
  const setStartBtn = document.getElementById('context-menu-set-start');
  if (setStartBtn) {
    setStartBtn.addEventListener('mousedown', stopEvent, true);
    setStartBtn.addEventListener('click', async (e) => {
      stopEvent(e);
      const lngLat = currentLngLat;
      hideContextMenu();
      if (lngLat) {
        await setStartPoint(map, lngLat, { autoActivateEnd: true });
      }
    }, true);
  }

  // Set end point
  const setEndBtn = document.getElementById('context-menu-set-end');
  if (setEndBtn) {
    setEndBtn.addEventListener('mousedown', stopEvent, true);
    setEndBtn.addEventListener('click', async (e) => {
      stopEvent(e);
      const lngLat = currentLngLat;
      hideContextMenu();
      if (lngLat) {
        await setEndPoint(map, lngLat);
      }
    }, true);
  }

  // Set waypoint
  const setWaypointBtn = document.getElementById('context-menu-set-waypoint');
  if (setWaypointBtn) {
    setWaypointBtn.addEventListener('mousedown', stopEvent, true);
    setWaypointBtn.addEventListener('click', async (e) => {
      stopEvent(e);
      const lngLat = currentLngLat;
      hideContextMenu();
      if (lngLat) {
        await addWaypoint(map, lngLat);
      }
    }, true);
  }

  // OSM query and Mapillary links are handled by href attributes
  // Just close menu when clicked
  const osmLink = document.getElementById('context-menu-osm-query');
  if (osmLink) {
    osmLink.addEventListener('mousedown', stopEvent, true);
    osmLink.addEventListener('click', (e) => {
      // Don't prevent default - let link open
      e.stopPropagation();
      e.stopImmediatePropagation();
      // Close menu after a short delay
      setTimeout(() => hideContextMenu(), 50);
    }, true);
  }

  const mapillaryLink = document.getElementById('context-menu-mapillary');
  if (mapillaryLink) {
    mapillaryLink.addEventListener('mousedown', stopEvent, true);
    mapillaryLink.addEventListener('click', (e) => {
      // Don't prevent default - let link open
      e.stopPropagation();
      e.stopImmediatePropagation();
      // Close menu after a short delay
      setTimeout(() => hideContextMenu(), 50);
    }, true);
  }
}

