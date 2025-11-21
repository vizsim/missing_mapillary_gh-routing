// Drawing functions for heightgraph

import { HEIGHTGRAPH_CONFIG } from './heightgraphConfig.js';
import { getSurfaceColorRgba, getRoadClassColorRgba, getBicycleInfraColorRgba } from '../colorSchemes.js';

/**
 * Draw background rectangle
 */
export function drawBackground(ctx, padding, graphWidth, graphHeight) {
  ctx.fillStyle = HEIGHTGRAPH_CONFIG.colors.background;
  ctx.fillRect(padding.left, padding.top, graphWidth, graphHeight);
}

/**
 * Draw grid lines and Y-axis labels
 */
export function drawGrid(ctx, padding, graphWidth, graphHeight, baseData) {
  ctx.strokeStyle = HEIGHTGRAPH_CONFIG.colors.grid;
  ctx.lineWidth = 1;
  
  const yLabels = new Set();
  
  // Calculate elevation range for Y-axis labels
  let elevationMin = 0;
  let elevationMax = 0;
  let elevationRange = 1;
  
  if (baseData.length > 0) {
    const baseValid = baseData.filter(v => v !== null && v !== undefined);
    if (baseValid.length > 0) {
      elevationMin = Math.min(...baseValid) - 10;
      elevationMax = Math.max(...baseValid) + 10;
      elevationRange = elevationMax - elevationMin || 1;
    }
  }
  
  // Calculate ticks with step sizes: 5, 10, 20, 50, 100
  // Maximum 8 ticks to avoid overcrowding
  const calculateNiceTicks = (min, max) => {
    const range = max - min;
    const stepSizes = [5, 10, 20, 50, 100];
    
    // Find the smallest step size that results in 8 or fewer ticks
    let step = stepSizes[stepSizes.length - 1]; // Default to largest step
    
    for (const candidateStep of stepSizes) {
      const tickMin = Math.floor(min / candidateStep) * candidateStep;
      const tickMax = Math.ceil(max / candidateStep) * candidateStep;
      const numTicks = Math.floor((tickMax - tickMin) / candidateStep) + 1;
      
      if (numTicks <= 8) {
        step = candidateStep;
        break;
      }
    }
    
    const tickMin = Math.floor(min / step) * step;
    const tickMax = Math.ceil(max / step) * step;
    const ticks = [];
    for (let value = tickMin; value <= tickMax; value += step) {
      ticks.push(value);
    }
    
    return { ticks, step };
  };
  
  const { ticks } = calculateNiceTicks(elevationMin, elevationMax);
  
  // Draw grid lines and labels
  // Set font once for measuring text width
  ctx.fillStyle = HEIGHTGRAPH_CONFIG.colors.text;
  ctx.font = `${HEIGHTGRAPH_CONFIG.font.size} ${HEIGHTGRAPH_CONFIG.font.family}`;
  ctx.textAlign = 'right';
  
  // Position labels with enough space (5px margin from left edge of graph)
  const labelX = padding.left - 5;
  
  ticks.forEach((elevationValue) => {
    const y = padding.top + graphHeight - ((elevationValue - elevationMin) / elevationRange) * graphHeight;
    
    if (y >= padding.top && y <= padding.top + graphHeight) {
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + graphWidth, y);
      ctx.stroke();
      
      const labelText = Math.round(elevationValue) + ' m';
      
      if (!yLabels.has(labelText)) {
        yLabels.add(labelText);
        ctx.fillText(labelText, labelX, y + 3);
      }
    }
  });
}

/**
 * Draw elevation line
 */
export function drawElevationLine(ctx, points) {
  if (points.length === 0) return;
  
  ctx.strokeStyle = HEIGHTGRAPH_CONFIG.colors.elevationLine;
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  points.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  
  ctx.stroke();
}

/**
 * Draw X-axis distance labels
 */
export function drawXAxisLabels(ctx, padding, graphWidth, graphHeight, actualTotalDistance, height) {
  ctx.fillStyle = HEIGHTGRAPH_CONFIG.colors.text;
  ctx.font = `${HEIGHTGRAPH_CONFIG.font.size} ${HEIGHTGRAPH_CONFIG.font.family}`;
  ctx.textAlign = 'center';
  
  const totalDistanceKm = actualTotalDistance / 1000;
  const maxTicks = 8;
  
  const possibleStepSizes = [0.5, 1, 2, 5, 10, 20, 50, 100];
  let stepSize = possibleStepSizes[possibleStepSizes.length - 1];
  let useHalfSteps = false;
  
  for (const candidateStepSize of possibleStepSizes) {
    const numTicks = Math.ceil(totalDistanceKm / candidateStepSize);
    if (numTicks <= maxTicks || candidateStepSize === possibleStepSizes[possibleStepSizes.length - 1]) {
      stepSize = candidateStepSize;
      useHalfSteps = (candidateStepSize === 0.5);
      break;
    }
  }
  
  const ticks = [];
  if (useHalfSteps) {
    for (let distance = stepSize; distance <= totalDistanceKm; distance += stepSize) {
      ticks.push(Math.round(distance * 10) / 10);
    }
  } else {
    for (let distance = stepSize; distance <= totalDistanceKm; distance += stepSize) {
      ticks.push(distance);
    }
  }
  
  for (const distance of ticks) {
    const distanceRatio = totalDistanceKm > 0 ? distance / totalDistanceKm : 0;
    const x = padding.left + graphWidth * distanceRatio;
    
    if (x >= padding.left && x <= padding.left + graphWidth) {
      const labelText = (distance % 1 === 0 ? distance.toFixed(0) : distance.toFixed(1)) + ' km';
      // Position labels closer to the graph (just below the graph area)
      const labelY = padding.top + graphHeight + 12;
      ctx.fillText(labelText, x, labelY);
    }
  }
}

/**
 * Fill a single segment under the elevation curve
 */
function fillSegment(ctx, points, startIdx, endIdx, color, padding, graphHeight) {
  if (startIdx >= endIdx || startIdx < 0 || endIdx > points.length) return;
  
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[startIdx].x, points[startIdx].y);
  
  for (let j = startIdx + 1; j < endIdx; j++) {
    ctx.lineTo(points[j].x, points[j].y);
  }
  
  if (endIdx < points.length) {
    ctx.lineTo(points[endIdx].x, points[endIdx].y);
  }
  
  const lastPoint = endIdx < points.length ? points[endIdx] : points[endIdx - 1];
  ctx.lineTo(lastPoint.x, padding.top + graphHeight);
  ctx.lineTo(points[startIdx].x, padding.top + graphHeight);
  ctx.closePath();
  ctx.fill();
}

/**
 * Fill segments based on encoded values
 * Generic function that works for mapillary_coverage, surface, road_class, etc.
 */
export function fillSegmentsByValue(ctx, points, values, getColor, padding, graphHeight) {
  if (!points || points.length === 0 || !values || values.length === 0) return;
  
  let currentValue = null;
  let segmentStart = 0;
  
  for (let i = 0; i < points.length; i++) {
    const value = values[points[i].index];
    
    if (value !== currentValue || i === 0) {
      if (currentValue !== null && i > segmentStart) {
        const fillColor = getColor(currentValue);
        fillSegment(ctx, points, segmentStart, i, fillColor, padding, graphHeight);
      }
      
      currentValue = value;
      segmentStart = i;
    }
  }
  
  if (currentValue !== null && segmentStart < points.length) {
    const fillColor = getColor(currentValue);
    fillSegment(ctx, points, segmentStart, points.length, fillColor, padding, graphHeight);
  }
}

// ============================================================================
// Color Helper Functions
// ============================================================================

export function getSurfaceColorForStats(surfaceValue) {
  return getSurfaceColorRgba(surfaceValue, 0.15);
}

export function getRoadClassColorForStats(roadClassValue) {
  return getRoadClassColorRgba(roadClassValue, 0.15);
}

export function getSurfaceColor(surfaceValue) {
  return getSurfaceColorRgba(surfaceValue, 0.3);
}

export function getRoadClassColor(roadClassValue) {
  return getRoadClassColorRgba(roadClassValue, 0.3);
}

export function getBicycleInfraColor(bicycleInfraValue) {
  return getBicycleInfraColorRgba(bicycleInfraValue, 0.3);
}

export function getBicycleInfraColorForStats(bicycleInfraValue) {
  return getBicycleInfraColorRgba(bicycleInfraValue, 0.15);
}

