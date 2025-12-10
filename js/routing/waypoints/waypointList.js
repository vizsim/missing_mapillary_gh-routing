/**
 * Waypoint List UI Management
 * Handles waypoint list rendering, drag & drop, and removal
 */

import { routeState } from '../routeState.js';
import { updateMarkers } from '../routingUI.js';
import { updateCoordinateTooltips } from '../coordinates/coordinateTooltips.js';
import { recalculateRouteIfReady } from '../routeRecalculator.js';
import { removeWaypoint } from './waypointManager.js';

/**
 * Create HTML template for a waypoint list item
 * @param {number} index - Waypoint index (0-based)
 * @param {Object} waypoint - Waypoint object with lng, lat, and svgId
 * @returns {string} HTML string
 */
function createWaypointItemHTML(index, waypoint) {
  const svgPath = `svgs/${waypoint.svgId}`;
  return `
    <span class="waypoint-drag-handle" title="Zum Verschieben ziehen">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="9" cy="12" r="1"></circle>
        <circle cx="9" cy="5" r="1"></circle>
        <circle cx="9" cy="19" r="1"></circle>
        <circle cx="15" cy="12" r="1"></circle>
        <circle cx="15" cy="5" r="1"></circle>
        <circle cx="15" cy="19" r="1"></circle>
      </svg>
    </span>
    <span class="waypoint-svg-icon">
      <img src="${svgPath}" alt="Waypoint ${index + 1}" style="width: 20px; height: 20px; object-fit: contain;">
    </span>
    <span class="waypoint-number">${index + 1}</span>
    <span class="waypoint-coords">${waypoint.lat.toFixed(3)}, ${waypoint.lng.toFixed(3)}</span>
    <button class="btn-remove-waypoint" data-index="${index}" title="Zwischenpunkt entfernen">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;
}

// Global state for touch-based dragging
let touchDragState = {
  isDragging: false,
  draggedItem: null,
  draggedIndex: null,
  startY: null,
  currentY: null
};

// Global touch move handler (only one instance needed)
let globalTouchMoveHandler = null;

/**
 * Setup global touch move handler (called once)
 */
function setupGlobalTouchMoveHandler() {
  if (globalTouchMoveHandler) return; // Already set up
  
  globalTouchMoveHandler = (e) => {
    if (!touchDragState.isDragging || !touchDragState.draggedItem) return;
    
    const touch = e.touches[0];
    if (!touch) return;
    
    touchDragState.currentY = touch.clientY;
    
    // Find element under touch point
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!elementBelow) return;
    
    // Find the waypoint item (might be a child element)
    const targetItem = elementBelow.closest('.waypoint-item');
    if (!targetItem || targetItem === touchDragState.draggedItem || targetItem.classList.contains('dragging')) {
      // Remove indicators from all items
      document.querySelectorAll('.waypoint-item').forEach(el => {
        if (el !== touchDragState.draggedItem) {
          el.classList.remove('drag-over', 'drag-over-before', 'drag-over-after');
        }
      });
      return;
    }
    
    // Update drag-over indicator
    updateDragOverIndicator(targetItem, touch.clientY);
    
    // Remove indicators from other items
    document.querySelectorAll('.waypoint-item').forEach(el => {
      if (el !== touchDragState.draggedItem && el !== targetItem) {
        el.classList.remove('drag-over', 'drag-over-before', 'drag-over-after');
      }
    });
    
    e.preventDefault();
  };
  
  document.addEventListener('touchmove', globalTouchMoveHandler, { passive: false });
}

/**
 * Setup touch-based drag handlers for mobile devices
 * @param {HTMLElement} item - The waypoint item element
 * @param {number} index - Waypoint index
 * @param {HTMLElement} waypointsList - Container element
 */
function setupWaypointTouchHandlers(item, index, waypointsList) {
  const removeBtn = item.querySelector('.btn-remove-waypoint');
  
  // Touch start
  item.addEventListener('touchstart', (e) => {
    // Don't start drag if touching remove button
    if (removeBtn && (e.target === removeBtn || removeBtn.contains(e.target))) {
      return;
    }
    
    // Only start drag if touching the drag handle or the item itself (not buttons)
    const touch = e.touches[0];
    if (!touch) return;
    
    const target = e.target;
    if (target === removeBtn || removeBtn?.contains(target)) {
      return;
    }
    
    touchDragState.isDragging = true;
    touchDragState.draggedItem = item;
    touchDragState.draggedIndex = index;
    touchDragState.startY = touch.clientY;
    touchDragState.currentY = touch.clientY;
    
    item.classList.add('dragging');
    
    // Prevent scrolling while dragging
    e.preventDefault();
  }, { passive: false });
  
  // Setup global touch move handler if not already done
  setupGlobalTouchMoveHandler();
  
  // Touch end
  const handleTouchEnd = (e) => {
    if (!touchDragState.isDragging || touchDragState.draggedItem !== item) return;
    
    const touch = e.changedTouches[0];
    if (!touch) {
      // Cleanup even without touch data
      cleanupTouchDrag();
      return;
    }
    
    // Find drop target
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    if (elementBelow) {
      const dropTarget = elementBelow.closest('.waypoint-item');
      
      if (dropTarget && dropTarget !== item) {
        const dropIndex = parseInt(dropTarget.dataset.index, 10);
        const draggedIndex = touchDragState.draggedIndex;
        
        if (!isNaN(dropIndex) && !isNaN(draggedIndex) && draggedIndex !== dropIndex) {
          reorderWaypoint(draggedIndex, dropIndex, touch.clientY, dropTarget);
        }
      }
    }
    
    cleanupTouchDrag();
    e.preventDefault();
  };
  
  item.addEventListener('touchend', handleTouchEnd, { passive: false });
  item.addEventListener('touchcancel', cleanupTouchDrag, { passive: false });
}

/**
 * Cleanup touch drag state
 */
function cleanupTouchDrag() {
  if (touchDragState.draggedItem) {
    touchDragState.draggedItem.classList.remove('dragging');
  }
  
  // Remove all drop indicators
  document.querySelectorAll('.waypoint-item').forEach(el => {
    el.classList.remove('drag-over', 'drag-over-before', 'drag-over-after');
  });
  
  // Reset state
  touchDragState.isDragging = false;
  touchDragState.draggedItem = null;
  touchDragState.draggedIndex = null;
  touchDragState.startY = null;
  touchDragState.currentY = null;
  
  // Update UI and recalculate route
  handleWaypointsReordered();
}

/**
 * Setup drag & drop event handlers for a waypoint item
 * @param {HTMLElement} item - The waypoint item element
 * @param {number} index - Waypoint index
 * @param {HTMLElement} waypointsList - Container element
 */
function setupWaypointDragHandlers(item, index, waypointsList) {
  // Drag start
  item.addEventListener('dragstart', (e) => {
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  });
  
  // Drag end
  item.addEventListener('dragend', (e) => {
    item.classList.remove('dragging');
    
    // Clear pending timeout
    if (item._dragOverTimeout) {
      clearTimeout(item._dragOverTimeout);
      item._dragOverTimeout = null;
    }
    
    // Remove all drop indicators
    document.querySelectorAll('.waypoint-item').forEach(el => {
      el.classList.remove('drag-over', 'drag-over-before', 'drag-over-after');
      el._dragOverTimeout = null;
    });
    
    // Update UI and recalculate route (after drag is complete to prevent flickering)
    handleWaypointsReordered();
  });
  
  // Drag over
  item.addEventListener('dragover', (e) => {
    e.preventDefault();
    // Firefox compatibility: set dropEffect in dragover
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    
    const draggingItem = document.querySelector('.waypoint-item.dragging');
    if (!draggingItem || draggingItem === item) return;
    
    // Remove drag-over classes from other items (throttled to reduce flickering)
    if (!item._dragOverTimeout) {
      const items = Array.from(waypointsList.querySelectorAll('.waypoint-item:not(.dragging)'));
      items.forEach(el => {
        if (el !== item) {
          el.classList.remove('drag-over', 'drag-over-before', 'drag-over-after');
        }
      });
    }
    
    // Clear existing timeout
    if (item._dragOverTimeout) {
      clearTimeout(item._dragOverTimeout);
    }
    
    // Throttle visual update to reduce flickering
    item._dragOverTimeout = setTimeout(() => {
      updateDragOverIndicator(item, e.clientY);
      item._dragOverTimeout = null;
    }, 10);
  });
  
  // Drag leave - remove indicator when mouse leaves item
  item.addEventListener('dragleave', (e) => {
    // Only remove if we're actually leaving the item (not just moving to a child)
    if (!item.contains(e.relatedTarget)) {
      item.classList.remove('drag-over', 'drag-over-before', 'drag-over-after');
      if (item._dragOverTimeout) {
        clearTimeout(item._dragOverTimeout);
        item._dragOverTimeout = null;
      }
    }
  });
  
  // Drop
  item.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation(); // Firefox: prevent event bubbling
    
    // Firefox compatibility: getData must be called in drop event
    let draggedIndex;
    try {
      draggedIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    } catch (err) {
      // Fallback for Firefox if getData fails
      const draggingItem = document.querySelector('.waypoint-item.dragging');
      if (draggingItem && draggingItem.dataset.index) {
        draggedIndex = parseInt(draggingItem.dataset.index, 10);
      } else {
        return; // Can't determine dragged index
      }
    }
    
    const dropIndex = parseInt(item.dataset.index, 10);
    
    if (isNaN(draggedIndex) || isNaN(dropIndex) || draggedIndex === dropIndex) return;
    
    reorderWaypoint(draggedIndex, dropIndex, e.clientY, item);
  });
}

/**
 * Setup remove button handler for a waypoint item
 * @param {HTMLElement} item - The waypoint item element
 * @param {number} index - Waypoint index
 */
function setupWaypointRemoveHandler(item, index) {
  const removeBtn = item.querySelector('.btn-remove-waypoint');
  if (!removeBtn) return;
  
  // Prevent button from triggering drag
  removeBtn.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });
  
  removeBtn.addEventListener('dragstart', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });
  
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removeWaypoint(index);
  });
  
  // Touch support for remove button
  removeBtn.addEventListener('touchend', (e) => {
    e.stopPropagation();
    e.preventDefault();
    removeWaypoint(index);
  });
}

/**
 * Update drag-over visual indicator on drop target
 * @param {HTMLElement} item - The drop target element
 * @param {number} mouseY - Mouse Y position
 */
function updateDragOverIndicator(item, mouseY) {
  const rect = item.getBoundingClientRect();
  const itemCenterY = rect.top + rect.height / 2;
  const insertAfter = mouseY > itemCenterY;
  
  // Add base drag-over class
  item.classList.add('drag-over');
  
  if (insertAfter) {
    item.classList.add('drag-over-after');
    item.classList.remove('drag-over-before');
  } else {
    item.classList.add('drag-over-before');
    item.classList.remove('drag-over-after');
  }
}

/**
 * Reorder waypoint in array based on drag & drop
 * @param {number} draggedIndex - Original index of dragged waypoint
 * @param {number} dropIndex - Index of drop target
 * @param {number} mouseY - Mouse Y position for determining insert position
 * @param {HTMLElement} dropTarget - The drop target element
 */
function reorderWaypoint(draggedIndex, dropIndex, mouseY, dropTarget) {
  // Determine if we should insert before or after the drop target
  const rect = dropTarget.getBoundingClientRect();
  const insertAfter = mouseY > rect.top + rect.height / 2;
  
  // Calculate target index in the original array
  let targetIndex = dropIndex + (insertAfter ? 1 : 0);
  
  // Remove element from array (both waypoint and address)
  const waypoints = routeState.waypoints;
  const addresses = routeState.waypointAddresses;
  const [moved] = waypoints.splice(draggedIndex, 1);
  const [movedAddress] = addresses.splice(draggedIndex, 1);
  
  // Adjust target index if element was removed before target position
  if (draggedIndex < targetIndex) {
    targetIndex--;
  }
  
  // Clamp to valid range (using new array length)
  targetIndex = Math.max(0, Math.min(targetIndex, waypoints.length));
  
  // Insert element at target position (both waypoint and address)
  waypoints.splice(targetIndex, 0, moved);
  addresses.splice(targetIndex, 0, movedAddress);
  
  // Mark as manually sorted (disables automatic optimization)
  routeState.waypointsManuallySorted = true;
}

/**
 * Handle waypoints reordering: update UI and recalculate route
 * Called after drag & drop is complete to prevent flickering
 */
function handleWaypointsReordered() {
  // Don't update UI if still dragging (prevents flickering)
  const isDragging = document.querySelector('.waypoint-item.dragging') !== null;
  if (isDragging) {
    return;
  }
  
  // Update UI
  updateWaypointsList();
  updateMarkers(routeState.mapInstance);
  
  // Recalculate route if both start and end points exist
  requestAnimationFrame(() => {
    recalculateRouteIfReady();
  });
}

/**
 * Update waypoints list in UI
 */
export function updateWaypointsList() {
  const waypointsList = document.getElementById('waypoints-list');
  if (!waypointsList) return;
  
  waypointsList.innerHTML = '';
  
  routeState.waypoints.forEach((waypoint, index) => {
    const item = document.createElement('div');
    item.className = 'waypoint-item';
    item.draggable = true;
    item.dataset.index = index;
    item.innerHTML = createWaypointItemHTML(index, waypoint);
    
    waypointsList.appendChild(item);
    
    // Setup event handlers
    setupWaypointDragHandlers(item, index, waypointsList);
    setupWaypointTouchHandlers(item, index, waypointsList);
    setupWaypointRemoveHandler(item, index);
  });
  
  // Update tooltips after list is updated
  updateCoordinateTooltips();
}

