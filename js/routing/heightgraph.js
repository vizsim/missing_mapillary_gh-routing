// Heightgraph visualization and interactivity - Main Module
// This module orchestrates all heightgraph functionality

import { routeState } from './routeState.js';
import { updateRouteColor } from './routeVisualization.js';
import { HEIGHTGRAPH_CONFIG } from './heightgraph/heightgraphConfig.js';
import { getLabelForEncodedType, validateHeightgraphData, getContainerWidth, calculateCumulativeDistances } from './heightgraph/heightgraphUtils.js';
import { setupCanvas, setupIndicatorCanvas } from './heightgraph/heightgraphCanvas.js';
import { drawBackground, drawGrid, drawElevationLine, drawXAxisLabels, fillSegmentsByValue, getSurfaceColor, getRoadClassColor, getBicycleInfraColor } from './heightgraph/heightgraphDrawing.js';
import { setupHeightgraphInteractivity, cleanupInteractivityHandlers } from './heightgraph/heightgraphInteractivity.js';
import { updateHeightgraphStats } from './heightgraph/heightgraphStats.js';

// Store resize handler to prevent duplicate listeners
let heightgraphResizeHandler = null;

// ============================================================================
// Main Drawing Function
// ============================================================================

/**
 * Main function to draw the heightgraph
 * Handles container width detection, canvas setup, and drawing
 */
export function drawHeightgraph(elevations, totalDistance, encodedValues = {}, coordinates = [], skipInteractivity = false) {
  // Clean up existing handlers first
  cleanupHeightgraphHandlers();
  
  // Get DOM elements
  const container = document.getElementById('heightgraph-container');
  const canvas = document.getElementById('heightgraph-canvas');
  const indicatorCanvas = document.getElementById('heightgraph-indicator-canvas');
  const select = document.getElementById('heightgraph-encoded-select');
  
  if (!container || !canvas) return;
  
  // Validate data
  validateHeightgraphData(elevations, coordinates, encodedValues);
  
  // Show container
  container.style.display = 'block';
  
  // Get container width with retry logic
  // This is critical for first load when layout might not be ready
  let containerWidth = getContainerWidth(container);
  
  // Check if we got a valid width by measuring the actual container
  // If the measured width is still 0 or very small, the container isn't ready yet
  const actualRect = container.getBoundingClientRect();
  const actualWidth = actualRect.width;
  
  // If width is invalid (0 or very small), schedule a redraw after layout settles
  // This handles the case where container width is 0 on first load
  if (actualWidth === 0 || actualWidth < 200) {
    // Check if we're already pending a redraw to prevent infinite loops
    if (!canvas._pendingRedraw) {
      canvas._pendingRedraw = true;
      
      // Wait for panel positioning to complete (listen to custom event)
      const onPanelReady = () => {
        canvas._pendingRedraw = false;
        // Redraw with same parameters
        drawHeightgraph(elevations, totalDistance, encodedValues, coordinates, skipInteractivity);
      };
      
      window.addEventListener('panelPositioningComplete', onPanelReady, { once: true });
      
      // Fallback: if event doesn't fire within 1 second, try again anyway
      setTimeout(() => {
        if (canvas._pendingRedraw) {
          canvas._pendingRedraw = false;
          window.removeEventListener('panelPositioningComplete', onPanelReady);
          // Try one more time - container might be ready now
          const newRect = container.getBoundingClientRect();
          const newWidth = newRect.width;
          if (newWidth > 0 && newWidth >= 200) {
            drawHeightgraph(elevations, totalDistance, encodedValues, coordinates, skipInteractivity);
            return;
          }
        }
      }, 1000);
      
      // Don't continue drawing if we're scheduling a redraw
      return;
    }
    // If we're already pending a redraw, continue with default width (fallback)
  }
  
  const width = Math.max(HEIGHTGRAPH_CONFIG.canvas.minWidth, containerWidth);
  const height = HEIGHTGRAPH_CONFIG.canvas.height;
  
  // Setup canvas
  const ctx = setupCanvas(canvas, width, height);
  ctx.clearRect(0, 0, width, height);
  
  // Get selected visualization type
  const selectedType = select ? select.value : 'elevation';
  
  // Determine data to visualize
  let baseData = elevations.length > 0 ? elevations : [];
  let overlayData = [];
  let dataLabel = 'Höhe (m)';
  let overlayLabel = '';
  let isNumeric = true;
  let hasOverlay = false;
  
  if (selectedType === 'elevation') {
    overlayData = [];
    hasOverlay = false;
  } else if (encodedValues[selectedType]) {
    overlayData = encodedValues[selectedType];
    overlayLabel = getLabelForEncodedType(selectedType);
    isNumeric = selectedType === 'time' || selectedType === 'distance';
    hasOverlay = true;
  } else if (selectedType === 'street_name' && encodedValues.street_name) {
    overlayData = encodedValues.street_name;
    overlayLabel = 'Straßenname';
    isNumeric = false;
    hasOverlay = true;
  }
  
  let dataToVisualize = baseData;
  
  if (baseData.length === 0 && overlayData.length > 0) {
    dataToVisualize = overlayData;
    dataLabel = overlayLabel;
  } else if (baseData.length === 0) {
    // No data available
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Keine Daten verfügbar', width / 2, height / 2);
    return;
  }
  
  if (dataToVisualize.length < 2) return;
  
  // Process data
  let processedData = [];
  let minValue, maxValue, valueRange;
  
  if (isNumeric) {
    const validValues = dataToVisualize.filter(v => v !== null && v !== undefined);
    if (validValues.length === 0) return;
    
    minValue = Math.min(...validValues);
    maxValue = Math.max(...validValues);
    valueRange = maxValue - minValue || 1;
    processedData = dataToVisualize;
  } else {
    const uniqueValues = [...new Set(dataToVisualize.filter(v => v !== null && v !== undefined))];
    const valueMap = {};
    uniqueValues.forEach((val, idx) => {
      valueMap[val] = idx;
    });
    
    processedData = dataToVisualize.map(v => v !== null && v !== undefined ? valueMap[v] : null);
    minValue = 0;
    maxValue = uniqueValues.length - 1;
    valueRange = maxValue - minValue || 1;
  }
  
  // Calculate graph dimensions
  const padding = HEIGHTGRAPH_CONFIG.padding;
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;
  
  // Draw background and grid
  drawBackground(ctx, padding, graphWidth, graphHeight);
  drawGrid(ctx, padding, graphWidth, graphHeight, baseData);
  
  // Calculate cumulative distances
  let cumulativeDistances = [];
  let actualTotalDistance = totalDistance;
  
  if (coordinates.length > 0) {
    const result = calculateCumulativeDistances(coordinates);
    cumulativeDistances = result.distances;
    actualTotalDistance = result.total;
  } else {
    for (let i = 0; i < baseData.length; i++) {
      cumulativeDistances.push((i / (baseData.length - 1)) * totalDistance);
    }
  }
  
  // Draw elevation profile
  if (baseData.length > 0) {
    const baseValid = baseData.filter(v => v !== null && v !== undefined);
    if (baseValid.length > 0) {
      const baseMin = Math.min(...baseValid) - 10;
      const baseMax = Math.max(...baseValid) + 10;
      const baseRange = baseMax - baseMin || 1;
      
      const points = [];
      
      baseData.forEach((value, index) => {
        if (value === null || value === undefined) return;
        
        const distanceRatio = actualTotalDistance > 0 && cumulativeDistances[index] !== undefined
          ? cumulativeDistances[index] / actualTotalDistance
          : index / (baseData.length - 1);
        const x = padding.left + graphWidth * distanceRatio;
        
        const normalized = (value - baseMin) / baseRange;
        const y = padding.top + graphHeight - (normalized * graphHeight);
        
        points.push({ x, y, index });
      });
      
      drawElevationLine(ctx, points);
      
      // Fill area under elevation curve based on selected encoded value
      const currentSelectedType = select ? select.value : 'mapillary_coverage';
      
      if (currentSelectedType === 'mapillary_coverage' && encodedValues.mapillary_coverage && encodedValues.mapillary_coverage.length > 0 && points.length > 0) {
        const getCustomPresentColor = (value) => {
          const isTrue = value === true || value === 'True' || value === 'true';
          return isTrue ? 'rgba(59, 130, 246, 0.3)' : 'rgba(236, 72, 153, 0.3)';
        };
        fillSegmentsByValue(ctx, points, encodedValues.mapillary_coverage, getCustomPresentColor, padding, graphHeight);
      } else if (currentSelectedType === 'surface' && encodedValues.surface && encodedValues.surface.length > 0 && points.length > 0) {
        fillSegmentsByValue(ctx, points, encodedValues.surface, getSurfaceColor, padding, graphHeight);
      } else if (currentSelectedType === 'road_class' && encodedValues.road_class && encodedValues.road_class.length > 0 && points.length > 0) {
        fillSegmentsByValue(ctx, points, encodedValues.road_class, getRoadClassColor, padding, graphHeight);
      } else if (currentSelectedType === 'bicycle_infra' && encodedValues.bicycle_infra && encodedValues.bicycle_infra.length > 0 && points.length > 0) {
        fillSegmentsByValue(ctx, points, encodedValues.bicycle_infra, getBicycleInfraColor, padding, graphHeight);
      }
    }
  }
  
  // Draw X-axis labels
  drawXAxisLabels(ctx, padding, graphWidth, graphHeight, actualTotalDistance, height);
  
  // Setup interactivity
  if (!skipInteractivity) {
    setupIndicatorCanvas(indicatorCanvas, width, height);
    setupHeightgraphInteractivity(canvas, baseData, actualTotalDistance, coordinates, cumulativeDistances, width, height);
  }
  
  // Update stats
  const statsSelectedType = select ? select.value : 'mapillary_coverage';
  updateHeightgraphStats(statsSelectedType, encodedValues);
}

// ============================================================================
// Setup and Cleanup Functions
// ============================================================================

export function setupHeightgraphHandlers() {
  const select = document.getElementById('heightgraph-encoded-select');
  if (select) {
    select.addEventListener('change', () => {
      routeState.currentEncodedType = select.value;
      if (routeState.currentRouteData) {
        const { elevations, distance, encodedValues } = routeState.currentRouteData;
        drawHeightgraph(elevations || [], distance, encodedValues || {}, routeState.currentRouteData?.coordinates || []);
        updateRouteColor(routeState.currentEncodedType, encodedValues || {});
        updateHeightgraphStats(routeState.currentEncodedType, encodedValues || {});
      }
    });
  }
  
  if (heightgraphResizeHandler) {
    window.removeEventListener('resize', heightgraphResizeHandler);
  }
  
  heightgraphResizeHandler = () => {
    clearTimeout(heightgraphResizeHandler.timeout);
    heightgraphResizeHandler.timeout = setTimeout(() => {
      if (routeState.currentRouteData) {
        const select = document.getElementById('heightgraph-encoded-select');
        const currentType = select ? select.value : routeState.currentEncodedType;
        const { elevations, distance, encodedValues } = routeState.currentRouteData;
        drawHeightgraph(elevations || [], distance, encodedValues || {}, routeState.currentRouteData?.coordinates || []);
        updateRouteColor(currentType, encodedValues || {});
        updateHeightgraphStats(currentType, encodedValues || {});
      }
    }, HEIGHTGRAPH_CONFIG.debounce.resize);
  };
  
  window.addEventListener('resize', heightgraphResizeHandler);
}

export function cleanupHeightgraphHandlers() {
  // Cleanup interactivity handlers
  cleanupInteractivityHandlers();
  
  // Cleanup resize handler
  if (heightgraphResizeHandler) {
    window.removeEventListener('resize', heightgraphResizeHandler);
    if (heightgraphResizeHandler.timeout) {
      clearTimeout(heightgraphResizeHandler.timeout);
    }
    heightgraphResizeHandler = null;
  }
}

// Re-export stats function for convenience
export { updateHeightgraphStats };
