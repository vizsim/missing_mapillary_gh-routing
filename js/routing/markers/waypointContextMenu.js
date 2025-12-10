/**
 * Waypoint Context Menu - Shows delete option when right-clicking on waypoint markers
 */

import { removeWaypoint } from '../routingUI.js';

/**
 * Show waypoint context menu for deletion
 * @param {maplibregl.Map} map - Map instance
 * @param {maplibregl.Marker} marker - Waypoint marker
 * @param {number} waypointIndex - Index of waypoint in array
 * @param {Event} e - Context menu event
 */
export function showWaypointContextMenu(map, marker, waypointIndex, e) {
  const menu = document.getElementById('waypoint-context-menu');
  if (!menu) return;
  
  // Hide main context menu if visible
  const mainMenu = document.getElementById('context-menu');
  if (mainMenu) {
    mainMenu.classList.add('hidden');
  }
  
  // Get marker position on screen
  const markerElement = marker.getElement();
  const rect = markerElement.getBoundingClientRect();
  
  // Position menu near the marker
  let left = rect.left + rect.width / 2;
  let top = rect.top;
  
  // Show menu to get dimensions
  menu.classList.remove('hidden');
  const menuWidth = menu.offsetWidth || 120;
  const menuHeight = menu.offsetHeight || 50;
  
  // Adjust position to center above marker
  left = left - menuWidth / 2;
  top = top - menuHeight - 8; // 8px spacing above marker
  
  // Ensure menu stays within viewport
  if (left < 0) left = 8;
  if (left + menuWidth > window.innerWidth) left = window.innerWidth - menuWidth - 8;
  if (top < 0) top = rect.bottom + 8; // Show below if no space above
  
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.position = 'fixed';
  
  // Store waypoint index for deletion
  menu.dataset.waypointIndex = waypointIndex;
  
  // Close menu when clicking outside
  const closeOnOutsideClick = (clickEvent) => {
    if (menu && !menu.contains(clickEvent.target) && !markerElement.contains(clickEvent.target)) {
      hideWaypointContextMenu();
      document.removeEventListener('click', closeOnOutsideClick);
      document.removeEventListener('contextmenu', closeOnOutsideClick);
    }
  };
  
  // Use setTimeout to avoid immediate close
  setTimeout(() => {
    document.addEventListener('click', closeOnOutsideClick, true);
    document.addEventListener('contextmenu', closeOnOutsideClick, true);
  }, 100);
  
  // Setup delete handler (only once)
  const deleteBtn = document.getElementById('waypoint-context-menu-delete');
  if (deleteBtn && !deleteBtn.dataset.handlerSetup) {
    deleteBtn.dataset.handlerSetup = 'true';
    
    const stopEvent = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };
    
    deleteBtn.addEventListener('mousedown', stopEvent, true);
    deleteBtn.addEventListener('click', (e) => {
      stopEvent(e);
      const index = parseInt(menu.dataset.waypointIndex);
      if (!isNaN(index)) {
        hideWaypointContextMenu();
        removeWaypoint(index);
      }
    }, true);
  }
}

/**
 * Hide waypoint context menu
 */
export function hideWaypointContextMenu() {
  const menu = document.getElementById('waypoint-context-menu');
  if (menu) {
    menu.classList.add('hidden');
    delete menu.dataset.waypointIndex;
  }
}

