// Heightgraph interactivity (hover, tooltip, indicator line)

import { routeState } from '../routeState.js';
import { HEIGHTGRAPH_CONFIG } from './heightgraphConfig.js';
import { calculateCumulativeDistances } from './heightgraphUtils.js';
import { getBicycleInfraDescription } from '../colorSchemes.js';

// Store event handlers to prevent duplicate listeners
let heightgraphMouseMoveHandler = null;
let heightgraphMouseLeaveHandler = null;
let routeHighlightMarker = null;

/**
 * Draw indicator line on indicator canvas
 * x is in logical coordinates (same coordinate system as the main canvas)
 */
function drawIndicatorLine(indicatorCanvas, x, padding, graphHeight, canvasWidth, canvasHeight) {
  if (!indicatorCanvas) return;
  
  const ctx = indicatorCanvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  
  // Ensure context is scaled correctly
  // The canvas should already be set up with correct dimensions by setupIndicatorCanvas
  if (indicatorCanvas._dpr !== dpr) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    indicatorCanvas._dpr = dpr;
  }
  
  // Use the stored logical width from setupIndicatorCanvas
  // This ensures we use the same coordinate system as the main canvas
  const indicatorLogicalWidth = indicatorCanvas._logicalWidth || canvasWidth;
  
  // Clear previous line (use logical dimensions)
  ctx.clearRect(0, 0, indicatorLogicalWidth, canvasHeight);
  
  // Draw new line - x is already in the correct coordinate system
  ctx.strokeStyle = HEIGHTGRAPH_CONFIG.colors.indicatorLine;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, padding.top);
  ctx.lineTo(x, padding.top + graphHeight);
  ctx.stroke();
}

/**
 * Clear indicator line
 */
function clearIndicatorLine(indicatorCanvas, canvasWidth, canvasHeight) {
  if (!indicatorCanvas) return;
  
  const ctx = indicatorCanvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  
  // Ensure context is scaled correctly
  if (indicatorCanvas._dpr !== dpr) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    indicatorCanvas._dpr = dpr;
  }
  
  // Use the stored logical width from setupIndicatorCanvas
  const indicatorLogicalWidth = indicatorCanvas._logicalWidth || canvasWidth;
  
  // Clear using logical dimensions
  ctx.clearRect(0, 0, indicatorLogicalWidth, canvasHeight);
}

/**
 * Setup heightgraph interactivity (hover, tooltip, indicator line)
 */
export function setupHeightgraphInteractivity(canvas, elevations, totalDistance, coordinates, cumulativeDistances = null, canvasWidth = null, canvasHeight = null) {
  if (!canvas || !routeState.currentRouteData || !routeState.mapInstance || !coordinates || coordinates.length === 0) return;
  
  const { encodedValues } = routeState.currentRouteData;
  const select = document.getElementById('heightgraph-encoded-select');
  const selectedType = select ? select.value : 'mapillary_coverage';
  const padding = HEIGHTGRAPH_CONFIG.padding;
  
  // Get indicator canvas and store in closure
  const indicatorCanvas = document.getElementById('heightgraph-indicator-canvas');
  
  // Get canvas dimensions - use passed values if available, otherwise measure
  let actualCanvasWidth, actualCanvasHeight;
  if (canvasWidth !== null && canvasHeight !== null) {
    actualCanvasWidth = canvasWidth;
    actualCanvasHeight = canvasHeight;
  } else {
    const rect = canvas.getBoundingClientRect();
    actualCanvasWidth = rect.width;
    actualCanvasHeight = rect.height;
  }
  
  const graphWidth = actualCanvasWidth - padding.left - padding.right;
  const graphHeight = actualCanvasHeight - padding.top - padding.bottom;
  
  // Store dimensions in closure for event handlers
  const storedCanvasWidth = actualCanvasWidth;
  const storedCanvasHeight = actualCanvasHeight;
  const storedGraphWidth = graphWidth;
  const storedGraphHeight = graphHeight;
  
  // Calculate cumulative distances
  let computedCumulativeDistances = cumulativeDistances;
  let actualTotalDistance = totalDistance;
  
  if (!computedCumulativeDistances && coordinates.length > 0) {
    const result = calculateCumulativeDistances(coordinates);
    computedCumulativeDistances = result.distances;
    actualTotalDistance = result.total;
  } else if (computedCumulativeDistances && computedCumulativeDistances.length > 0) {
    actualTotalDistance = computedCumulativeDistances[computedCumulativeDistances.length - 1];
  }
  
  // Remove existing event listeners
  if (heightgraphMouseMoveHandler) {
    canvas.removeEventListener('mousemove', heightgraphMouseMoveHandler);
    heightgraphMouseMoveHandler = null;
  }
  if (heightgraphMouseLeaveHandler) {
    canvas.removeEventListener('mouseleave', heightgraphMouseLeaveHandler);
    heightgraphMouseLeaveHandler = null;
  }
  
  // Create or get tooltip
  let tooltip = document.getElementById('heightgraph-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'heightgraph-tooltip';
    tooltip.style.cssText = `
      position: absolute;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 11px;
      pointer-events: none;
      z-index: 1000;
      display: none;
      white-space: normal;
      max-width: 250px;
      word-wrap: break-word;
    `;
    document.body.appendChild(tooltip);
  }
  
  // Remove existing marker
  if (routeHighlightMarker) {
    routeHighlightMarker.remove();
    routeHighlightMarker = null;
  }
  
  // Mouse move handler
  heightgraphMouseMoveHandler = (e) => {
    const currentRect = canvas.getBoundingClientRect();
    const x = e.clientX - currentRect.left;
    const y = e.clientY - currentRect.top;
    
    // Scale mouse position if canvas is scaled by CSS
    const scaleX = storedCanvasWidth / currentRect.width;
    const scaleY = storedCanvasHeight / currentRect.height;
    const scaledX = x * scaleX;
    const scaledY = y * scaleY;
    
    // Check boundaries
    const leftBoundary = padding.left;
    const rightBoundary = padding.left + storedGraphWidth;
    const topBoundary = padding.top;
    const bottomBoundary = padding.top + storedGraphHeight;
    
    if (scaledX < leftBoundary || scaledX > rightBoundary || 
        scaledY < topBoundary || scaledY > bottomBoundary) {
      // Mouse outside graph area
      tooltip.style.display = 'none';
      if (routeHighlightMarker) {
        routeHighlightMarker.remove();
        routeHighlightMarker = null;
      }
      if (routeState.mapInstance && routeState.mapInstance.getSource('heightgraph-hover-point')) {
        routeState.mapInstance.getSource('heightgraph-hover-point').setData({
          type: 'FeatureCollection',
          features: []
        });
      }
      clearIndicatorLine(indicatorCanvas, storedCanvasWidth, storedCanvasHeight);
      return;
    }
    
    // Calculate segment
    const relativeX = (scaledX - padding.left) / storedGraphWidth;
    const clampedRelativeX = Math.max(0, Math.min(1, relativeX));
    const targetDistance = clampedRelativeX * actualTotalDistance;
    
    let segmentStartIndex = 0;
    let segmentEndIndex = 0;
    let segmentStartDistance = 0;
    let segmentEndDistance = 0;
    
    if (computedCumulativeDistances && computedCumulativeDistances.length > 1) {
      for (let i = 0; i < computedCumulativeDistances.length - 1; i++) {
        const startDist = computedCumulativeDistances[i];
        const endDist = computedCumulativeDistances[i + 1];
        
        if (targetDistance >= startDist && targetDistance <= endDist) {
          segmentStartIndex = i;
          segmentEndIndex = i + 1;
          segmentStartDistance = startDist;
          segmentEndDistance = endDist;
          break;
        }
      }
      if (targetDistance >= computedCumulativeDistances[computedCumulativeDistances.length - 1]) {
        segmentStartIndex = computedCumulativeDistances.length - 2;
        segmentEndIndex = computedCumulativeDistances.length - 1;
        segmentStartDistance = computedCumulativeDistances[segmentStartIndex];
        segmentEndDistance = computedCumulativeDistances[segmentEndIndex];
      }
    } else {
      const totalPoints = elevations.length;
      const pointIndex = Math.min(totalPoints - 1, Math.max(0, Math.round(clampedRelativeX * (totalPoints - 1))));
      segmentStartIndex = Math.max(0, Math.min(pointIndex, totalPoints - 2));
      segmentEndIndex = segmentStartIndex + 1;
      segmentStartDistance = (totalDistance / totalPoints) * segmentStartIndex;
      segmentEndDistance = (totalDistance / totalPoints) * segmentEndIndex;
    }
    
    const dataIndex = segmentStartIndex;
    const segmentMidDistance = (segmentStartDistance + segmentEndDistance) / 2;
    const segmentMidRelativeX = segmentMidDistance / actualTotalDistance;
    const segmentMidX = padding.left + (segmentMidRelativeX * storedGraphWidth);
    
    if (dataIndex >= 0 && dataIndex < elevations.length && dataIndex < coordinates.length) {
      const elevation = elevations[dataIndex];
      const coord = coordinates[dataIndex];
      const distance = segmentMidDistance;
      
      // Build tooltip content
      let tooltipContent = `Distanz: ${(distance / 1000).toFixed(2)} km<br>`;
      
      if (elevation !== null && elevation !== undefined) {
        tooltipContent += `Höhe: ${Math.round(elevation)} m<br>`;
      }
      
      // Add encoded value
      if (selectedType === 'mapillary_coverage' && encodedValues.mapillary_coverage && encodedValues.mapillary_coverage[dataIndex] !== undefined && 
          encodedValues.mapillary_coverage[dataIndex] !== null) {
        const customValue = encodedValues.mapillary_coverage[dataIndex];
        const customPresentText = typeof customValue === 'boolean' 
          ? (customValue ? 'Ja' : 'Nein') 
          : String(customValue);
        tooltipContent += `Mapillary Coverage: ${customPresentText}`;
      } else if (selectedType === 'surface' && encodedValues.surface && encodedValues.surface[dataIndex] !== undefined && 
                 encodedValues.surface[dataIndex] !== null) {
        tooltipContent += `Surface: ${String(encodedValues.surface[dataIndex])}`;
      } else if (selectedType === 'road_class' && encodedValues.road_class && encodedValues.road_class[dataIndex] !== undefined && 
                 encodedValues.road_class[dataIndex] !== null) {
        tooltipContent += `Road Class: ${String(encodedValues.road_class[dataIndex])}`;
      } else if (selectedType === 'bicycle_infra' && encodedValues.bicycle_infra && encodedValues.bicycle_infra[dataIndex] !== undefined && 
                 encodedValues.bicycle_infra[dataIndex] !== null) {
        const bicycleInfraValue = encodedValues.bicycle_infra[dataIndex];
        const description = getBicycleInfraDescription(bicycleInfraValue);
        if (description) {
          tooltipContent += `Bicycle Infrastructure: ${description.replace(/<br>/g, ' ')}`;
        } else {
          tooltipContent += `Bicycle Infrastructure: ${String(bicycleInfraValue).replace(/_/g, ' ')}`;
        }
      }
      
      // Show tooltip
      tooltip.innerHTML = tooltipContent;
      tooltip.style.visibility = 'hidden';
      tooltip.style.display = 'block';
      
      const tooltipRect = tooltip.getBoundingClientRect();
      const tooltipWidth = tooltipRect.width;
      const tooltipHeight = tooltipRect.height;
      
      const offsetX = 10;
      const offsetY = -30;
      const tooltipX = segmentMidX / scaleX;
      let tooltipLeft = currentRect.left + tooltipX + offsetX;
      let tooltipTop = currentRect.top + y + offsetY;
      
      if (tooltipLeft + tooltipWidth > window.innerWidth) {
        tooltipLeft = currentRect.left + tooltipX - tooltipWidth - offsetX;
      }
      if (tooltipLeft < 0) {
        tooltipLeft = 10;
      }
      if (tooltipTop < 0) {
        tooltipTop = 10;
      }
      if (tooltipTop + tooltipHeight > window.innerHeight) {
        tooltipTop = window.innerHeight - tooltipHeight - 10;
      }
      
      tooltip.style.left = tooltipLeft + 'px';
      tooltip.style.top = tooltipTop + 'px';
      tooltip.style.visibility = 'visible';
      
      // Update route highlight
      if (coord && routeState.mapInstance) {
        if (routeHighlightMarker) {
          routeHighlightMarker.remove();
          routeHighlightMarker = null;
        }
        
        if (routeState.mapInstance.getSource('heightgraph-hover-point')) {
          routeState.mapInstance.getSource('heightgraph-hover-point').setData({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [coord[0], coord[1]]
            },
            properties: {}
          });
        }
        
        // Draw indicator line
        drawIndicatorLine(indicatorCanvas, segmentMidX, padding, storedGraphHeight, storedCanvasWidth, storedCanvasHeight);
      }
    }
  };
  
  heightgraphMouseLeaveHandler = () => {
    tooltip.style.display = 'none';
    if (routeHighlightMarker) {
      routeHighlightMarker.remove();
      routeHighlightMarker = null;
    }
    if (routeState.mapInstance && routeState.mapInstance.getSource('heightgraph-hover-point')) {
      routeState.mapInstance.getSource('heightgraph-hover-point').setData({
        type: 'FeatureCollection',
        features: []
      });
    }
    clearIndicatorLine(indicatorCanvas, storedCanvasWidth, storedCanvasHeight);
  };
  
  // Add event listeners
  canvas.addEventListener('mousemove', heightgraphMouseMoveHandler);
  canvas.addEventListener('mouseleave', heightgraphMouseLeaveHandler);
}

/**
 * Cleanup interactivity handlers
 */
export function cleanupInteractivityHandlers() {
  const canvas = document.getElementById('heightgraph-canvas');
  
  if (canvas && heightgraphMouseMoveHandler) {
    canvas.removeEventListener('mousemove', heightgraphMouseMoveHandler);
    heightgraphMouseMoveHandler = null;
  }
  if (canvas && heightgraphMouseLeaveHandler) {
    canvas.removeEventListener('mouseleave', heightgraphMouseLeaveHandler);
    heightgraphMouseLeaveHandler = null;
  }
  
  const indicatorCanvas = document.getElementById('heightgraph-indicator-canvas');
  if (indicatorCanvas) {
    const ctx = indicatorCanvas.getContext('2d');
    const rect = indicatorCanvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
  }
  
  const tooltip = document.getElementById('heightgraph-tooltip');
  if (tooltip) {
    tooltip.remove();
  }
  
  if (routeState.mapInstance && routeState.mapInstance.getSource('heightgraph-hover-point')) {
    routeState.mapInstance.getSource('heightgraph-hover-point').setData({
      type: 'FeatureCollection',
      features: []
    });
  }
  
  if (routeHighlightMarker) {
    routeHighlightMarker.remove();
    routeHighlightMarker = null;
  }
}

