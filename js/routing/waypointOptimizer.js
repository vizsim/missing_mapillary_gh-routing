// Waypoint Optimization Algorithms
// Optimizes the order of waypoints to minimize total route distance/time

/**
 * Extract coordinates from point (supports both array and object format)
 * @param {Array<number>|Object} point - [lng, lat] or {lng, lat}
 * @returns {Array<number>} [lng, lat]
 */
function extractCoordinates(point) {
  if (Array.isArray(point)) {
    return point;
  } else if (point && typeof point === 'object' && point.lng !== undefined && point.lat !== undefined) {
    return [point.lng, point.lat];
  }
  return point;
}

/**
 * Calculate Haversine distance between two points in meters
 * @param {Array<number>|Object} point1 - [lng, lat] or {lng, lat}
 * @param {Array<number>|Object} point2 - [lng, lat] or {lng, lat}
 * @returns {number} Distance in meters
 */
function haversineDistance(point1, point2) {
  const [lng1, lat1] = extractCoordinates(point1);
  const [lng2, lat2] = extractCoordinates(point2);
  
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Nearest Neighbor Algorithm
 * Starts from start point and always picks the nearest unvisited waypoint
 * @param {Array<number>} start - [lng, lat]
 * @param {Array<number>} end - [lng, lat]
 * @param {Array<Array<number>>} waypoints - Array of [lng, lat]
 * @returns {Array<Array<number>>} Optimized waypoint order
 */
export function nearestNeighbor(start, end, waypoints) {
  if (!waypoints || waypoints.length === 0) {
    return [];
  }
  
  if (waypoints.length === 1) {
    return waypoints;
  }
  
  const optimized = [];
  const remaining = [...waypoints];
  let currentPoint = start;
  
  // Always pick the nearest unvisited waypoint
  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = haversineDistance(currentPoint, remaining[0]);
    
    for (let i = 1; i < remaining.length; i++) {
      const distance = haversineDistance(currentPoint, remaining[i]);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }
    
    // Add nearest waypoint to optimized list
    const nearest = remaining.splice(nearestIndex, 1)[0];
    optimized.push(nearest);
    currentPoint = nearest;
  }
  
  return optimized;
}

/**
 * Greedy Insertion Algorithm
 * Inserts each waypoint at the position that minimizes the total distance increase
 * @param {Array<number>} start - [lng, lat]
 * @param {Array<number>} end - [lng, lat]
 * @param {Array<Array<number>>} waypoints - Array of [lng, lat]
 * @returns {Array<Array<number>>} Optimized waypoint order
 */
export function greedyInsertion(start, end, waypoints) {
  if (!waypoints || waypoints.length === 0) {
    return [];
  }
  
  if (waypoints.length === 1) {
    return waypoints;
  }
  
  const remaining = [...waypoints];
  const optimized = [];
  
  // Start with the route: start -> end
  let currentRoute = [start, end];
  
  // Insert each waypoint at the best position
  while (remaining.length > 0) {
    let bestWaypoint = null;
    let bestIndex = -1;
    let bestIncrease = Infinity;
    
    // Try each remaining waypoint
    for (let wpIndex = 0; wpIndex < remaining.length; wpIndex++) {
      const waypoint = remaining[wpIndex];
      
      // Try inserting at each position in current route (except last, which is end)
      for (let routeIndex = 0; routeIndex < currentRoute.length - 1; routeIndex++) {
        const prevPoint = currentRoute[routeIndex];
        const nextPoint = currentRoute[routeIndex + 1];
        
        // Calculate distance increase: (prev -> waypoint -> next) - (prev -> next)
        const originalDistance = haversineDistance(prevPoint, nextPoint);
        const newDistance = haversineDistance(prevPoint, waypoint) + 
                           haversineDistance(waypoint, nextPoint);
        const increase = newDistance - originalDistance;
        
        if (increase < bestIncrease) {
          bestIncrease = increase;
          bestWaypoint = waypoint;
          bestIndex = routeIndex;
        }
      }
    }
    
    // Insert the best waypoint at the best position
    if (bestWaypoint && bestIndex >= 0) {
      currentRoute.splice(bestIndex + 1, 0, bestWaypoint);
      optimized.push(bestWaypoint);
      
      // Remove from remaining
      const wpIndex = remaining.indexOf(bestWaypoint);
      if (wpIndex >= 0) {
        remaining.splice(wpIndex, 1);
      }
    } else {
      // Fallback: just add first remaining waypoint
      const first = remaining.shift();
      currentRoute.splice(1, 0, first);
      optimized.push(first);
    }
  }
  
  return optimized;
}

/**
 * Optimize waypoints using the specified algorithm
 * @param {Array<number>} start - [lng, lat]
 * @param {Array<number>} end - [lng, lat]
 * @param {Array<Array<number>>} waypoints - Array of [lng, lat]
 * @param {string} algorithm - 'nearest_neighbor' or 'greedy_insertion' (default: 'nearest_neighbor')
 * @returns {Array<Array<number>>} Optimized waypoint order
 */
export function optimizeWaypoints(start, end, waypoints, algorithm = 'nearest_neighbor') {
  if (!start || !end || !waypoints || waypoints.length === 0) {
    return waypoints || [];
  }
  
  switch (algorithm) {
    case 'greedy_insertion':
      return greedyInsertion(start, end, waypoints);
    case 'nearest_neighbor':
    default:
      return nearestNeighbor(start, end, waypoints);
  }
}

