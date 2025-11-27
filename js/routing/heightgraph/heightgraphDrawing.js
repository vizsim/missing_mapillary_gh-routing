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
  ctx.lineWidth = HEIGHTGRAPH_CONFIG.lineWidth.grid;
  
  const yLabels = new Set();
  
  // Calculate elevation range for Y-axis labels
  let elevationMin = 0;
  let elevationMax = 0;
  let elevationRange = 1;
  
  if (baseData.length > 0) {
    const baseValid = baseData.filter(v => v !== null && v !== undefined);
    if (baseValid.length > 0) {
      const elevationPadding = HEIGHTGRAPH_CONFIG.elevationPadding;
      elevationMin = Math.min(...baseValid) - elevationPadding;
      elevationMax = Math.max(...baseValid) + elevationPadding;
      elevationRange = elevationMax - elevationMin || 1;
    }
  }
  
  // Calculate ticks with step sizes from config
  const calculateNiceTicks = (min, max) => {
    const range = max - min;
    const stepSizes = HEIGHTGRAPH_CONFIG.yAxis.stepSizes;
    const maxTicks = HEIGHTGRAPH_CONFIG.yAxis.maxTicks;
    
    // Find the smallest step size that results in maxTicks or fewer ticks
    let step = stepSizes[stepSizes.length - 1]; // Default to largest step
    
    for (const candidateStep of stepSizes) {
      const tickMin = Math.floor(min / candidateStep) * candidateStep;
      const tickMax = Math.ceil(max / candidateStep) * candidateStep;
      const numTicks = Math.floor((tickMax - tickMin) / candidateStep) + 1;
      
      if (numTicks <= maxTicks) {
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
  
  // Position labels with margin from left edge of graph
  const labelX = padding.left - HEIGHTGRAPH_CONFIG.labels.yAxisMargin;
  
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
        ctx.fillText(labelText, labelX, y + HEIGHTGRAPH_CONFIG.labels.yAxisOffset);
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
  ctx.lineWidth = HEIGHTGRAPH_CONFIG.lineWidth.elevation;
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
  const xAxisConfig = HEIGHTGRAPH_CONFIG.xAxis;
  
  // If values are 3-digit (>= threshold), use maxTicksLong to avoid overcrowding
  // Otherwise use maxTicksShort
  const maxTicks = totalDistanceKm >= xAxisConfig.threshold3Digit 
    ? xAxisConfig.maxTicksLong 
    : xAxisConfig.maxTicksShort;
  
  const possibleStepSizes = xAxisConfig.stepSizes;
  let stepSize = possibleStepSizes[possibleStepSizes.length - 1];
  let useHalfSteps = false;
  
  // For 3-digit distances, try to calculate an optimal step size to get close to maxTicks
  if (totalDistanceKm >= xAxisConfig.threshold3Digit) {
    // Calculate ideal step size for maxTicks: (maxTicks - 1) steps from 0 to totalDistanceKm
    const idealStepSize = totalDistanceKm / (maxTicks - 1);
    
    // Round to a "nice" number (multiple of niceMultipliers)
    const niceMultipliers = xAxisConfig.niceMultipliers;
    let niceStepSize = idealStepSize;
    
    // Find the closest nice multiplier
    for (const multiplier of niceMultipliers) {
      const rounded = Math.round(idealStepSize / multiplier) * multiplier;
      if (rounded >= xAxisConfig.minNiceStepSize && rounded <= totalDistanceKm) {
        niceStepSize = rounded;
        break;
      }
    }
    
    // Check if this gives us a good number of ticks
    const numTicksWithNice = 1 + Math.ceil(totalDistanceKm / niceStepSize);
    if (numTicksWithNice <= maxTicks && niceStepSize >= xAxisConfig.minNiceStepSize) {
      stepSize = niceStepSize;
    } else {
      // Fall back to standard logic
      let bestStepSize = stepSize;
      let bestNumTicks = 1 + Math.ceil(totalDistanceKm / stepSize);
      
      for (const candidateStepSize of possibleStepSizes) {
        const numTicks = 1 + Math.ceil(totalDistanceKm / candidateStepSize);
        if (numTicks <= maxTicks) {
          if (numTicks > bestNumTicks || (numTicks === bestNumTicks && candidateStepSize < bestStepSize)) {
            bestStepSize = candidateStepSize;
            bestNumTicks = numTicks;
          }
        }
      }
      stepSize = bestStepSize;
    }
  } else {
    // For shorter distances, use standard logic
    for (const candidateStepSize of possibleStepSizes) {
      const numTicks = 1 + Math.ceil(totalDistanceKm / candidateStepSize);
      if (numTicks <= maxTicks || candidateStepSize === possibleStepSizes[possibleStepSizes.length - 1]) {
        stepSize = candidateStepSize;
        useHalfSteps = (candidateStepSize === 0.5);
        break;
      }
    }
  }
  
  useHalfSteps = (stepSize === 0.5);
  
  const ticks = [];
  // Always include 0 km
  ticks.push(0);
  
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
      // Position labels below the graph area
      const labelY = padding.top + graphHeight + HEIGHTGRAPH_CONFIG.labels.xAxisOffset;
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
  return getSurfaceColorRgba(surfaceValue, HEIGHTGRAPH_CONFIG.opacity.stats);
}

export function getRoadClassColorForStats(roadClassValue) {
  return getRoadClassColorRgba(roadClassValue, HEIGHTGRAPH_CONFIG.opacity.stats);
}

export function getSurfaceColor(surfaceValue) {
  return getSurfaceColorRgba(surfaceValue, HEIGHTGRAPH_CONFIG.opacity.segments);
}

export function getRoadClassColor(roadClassValue) {
  return getRoadClassColorRgba(roadClassValue, HEIGHTGRAPH_CONFIG.opacity.segments);
}

export function getBicycleInfraColor(bicycleInfraValue) {
  return getBicycleInfraColorRgba(bicycleInfraValue, HEIGHTGRAPH_CONFIG.opacity.segments);
}

export function getBicycleInfraColorForStats(bicycleInfraValue) {
  return getBicycleInfraColorRgba(bicycleInfraValue, HEIGHTGRAPH_CONFIG.opacity.stats);
}

