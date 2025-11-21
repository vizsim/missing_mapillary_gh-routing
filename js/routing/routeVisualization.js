// Route visualization: colors, hover effects, mapillary_coverage highlighting

import { routeState } from './routeState.js';
import { getColorForEncodedValue, getBicycleInfraDescription } from './colorSchemes.js';

export function setupRouteHover(map) {
  // Create a popup for showing encoded values on hover
  const popup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false
  });
  
  map.on('mouseenter', 'route-layer', (e) => {
    map.getCanvas().style.cursor = 'pointer';
  });
  
  map.on('mouseleave', 'route-layer', () => {
    map.getCanvas().style.cursor = '';
    popup.remove();
    // Clear hovered segment
    if (map.getSource('route-hover-segment')) {
      map.getSource('route-hover-segment').setData({
        type: 'FeatureCollection',
        features: []
      });
    }
  });
  
  // Click handler to open OSM way page
  map.on('click', 'route-layer', (e) => {
    if (!routeState.currentRouteData || !e.features || e.features.length === 0) {
      return;
    }
    
    const clickedPoint = e.lngLat;
    const { coordinates, encodedValues } = routeState.currentRouteData;
    
    if (!coordinates || coordinates.length === 0) {
      return;
    }
    
    // Find the closest coordinate point on the route
    let closestIndex = 0;
    let minDistance = Infinity;
    
    coordinates.forEach((coord, index) => {
      const distance = Math.sqrt(
        Math.pow(coord[0] - clickedPoint.lng, 2) + 
        Math.pow(coord[1] - clickedPoint.lat, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });
    
    // Get osm_way_id at the closest point
    let osmWayId = null;
    if (encodedValues && encodedValues.osm_way_id && encodedValues.osm_way_id[closestIndex] !== null) {
      osmWayId = encodedValues.osm_way_id[closestIndex];
    }
    
    // If no osm_way_id found, try to find it in nearby points
    if (osmWayId === null && encodedValues && encodedValues.osm_way_id) {
      // Check nearby points (within 5 indices)
      for (let i = Math.max(0, closestIndex - 5); i <= Math.min(coordinates.length - 1, closestIndex + 5); i++) {
        if (encodedValues.osm_way_id[i] !== null) {
          osmWayId = encodedValues.osm_way_id[i];
          break;
        }
      }
    }
    
    // Open OSM way page if we have an ID
    if (osmWayId !== null) {
      const encodedWayId = encodeURIComponent(osmWayId);
      window.open(`https://www.openstreetmap.org/way/${encodedWayId}`, '_blank');
    }
  });
  
  map.on('mousemove', 'route-layer', (e) => {
    if (routeState.currentRouteData && e.features && e.features.length > 0) {
      // Use original coordinates from routeState, not segment coordinates
      const { coordinates: originalCoordinates } = routeState.currentRouteData;
      const point = e.lngLat;
      
      if (!originalCoordinates || originalCoordinates.length < 2) {
        popup.remove();
        return;
      }
      
      // Find the segment that contains the mouse position
      // A segment is between point i and point i+1
      let segmentStartIndex = 0;
      let minSegmentDist = Infinity;
      
      // Find the closest segment to the mouse position
      for (let i = 0; i < originalCoordinates.length - 1; i++) {
        const p1 = originalCoordinates[i];
        const p2 = originalCoordinates[i + 1];
        
        // Calculate distance from point to line segment
        const A = point.lng - p1[0];
        const B = point.lat - p1[1];
        const C = p2[0] - p1[0];
        const D = p2[1] - p1[1];
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) {
          param = dot / lenSq;
        }
        
        let xx, yy;
        if (param < 0) {
          xx = p1[0];
          yy = p1[1];
        } else if (param > 1) {
          xx = p2[0];
          yy = p2[1];
        } else {
          xx = p1[0] + param * C;
          yy = p1[1] + param * D;
        }
        
        const dx = point.lng - xx;
        const dy = point.lat - yy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < minSegmentDist) {
          minSegmentDist = dist;
          segmentStartIndex = i;
        }
      }
      
      // Use the start point of the segment for the value (the segment "belongs" to its start point)
      const dataIndex = segmentStartIndex;
      const closestPoint = point; // Use mouse position for popup location
      
      // Get all available details for this segment
      const { encodedValues } = routeState.currentRouteData;
      
      // Get selected encoded type from heightgraph dropdown
      const select = document.getElementById('heightgraph-encoded-select');
      const selectedType = select ? select.value : 'mapillary_coverage';
      
      // Get the value for the selected encoded type at the segment start point
      let selectedValue = null;
      let valueLabel = '';
      
      if (selectedType === 'mapillary_coverage' && encodedValues.mapillary_coverage && 
          encodedValues.mapillary_coverage[dataIndex] !== undefined && 
          encodedValues.mapillary_coverage[dataIndex] !== null) {
        selectedValue = encodedValues.mapillary_coverage[dataIndex];
        valueLabel = 'Mapillary Coverage';
      } else if (selectedType === 'surface' && encodedValues.surface && 
                 encodedValues.surface[dataIndex] !== undefined && 
                 encodedValues.surface[dataIndex] !== null) {
        selectedValue = encodedValues.surface[dataIndex];
        valueLabel = 'Surface';
      } else if (selectedType === 'road_class' && encodedValues.road_class && 
                 encodedValues.road_class[dataIndex] !== undefined && 
                 encodedValues.road_class[dataIndex] !== null) {
        selectedValue = encodedValues.road_class[dataIndex];
        valueLabel = 'Road Class';
      } else if (selectedType === 'bicycle_infra' && encodedValues.bicycle_infra && 
                 encodedValues.bicycle_infra[dataIndex] !== undefined && 
                 encodedValues.bicycle_infra[dataIndex] !== null) {
        selectedValue = encodedValues.bicycle_infra[dataIndex];
        valueLabel = 'Bicycle Infrastructure';
      }
      
      // Highlight the hovered segment by making it thicker (always show, even if no value)
      if (segmentStartIndex < originalCoordinates.length - 1) {
        const segmentCoords = [
          originalCoordinates[segmentStartIndex],
          originalCoordinates[segmentStartIndex + 1]
        ];
        
        // Get color for the segment based on selected encoded value
        let segmentColor = '#3b82f6'; // Default blue
        if (selectedValue !== null) {
          const allValues = encodedValues[selectedType] || [];
          segmentColor = getColorForEncodedValue(selectedType, selectedValue, allValues);
        }
        
        if (map.getSource('route-hover-segment')) {
          map.getSource('route-hover-segment').setData({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: segmentCoords
            },
            properties: {
              color: segmentColor
            }
          });
          
          // Update layer to use property-based coloring
          map.setPaintProperty('route-hover-segment-layer', 'line-color', ['get', 'color']);
        }
      } else {
        // Clear hovered segment if no valid segment
        if (map.getSource('route-hover-segment')) {
          map.getSource('route-hover-segment').setData({
            type: 'FeatureCollection',
            features: []
          });
        }
      }
      
      // Show popup only if we have a value for the selected type
      if (selectedValue !== null) {
        let displayValue = '';
        if (typeof selectedValue === 'boolean') {
          displayValue = selectedValue ? 'Ja' : 'Nein';
        } else if (selectedType === 'bicycle_infra') {
          // Use description for bicycle_infra
          const description = getBicycleInfraDescription(selectedValue);
          displayValue = description || String(selectedValue);
        } else {
          displayValue = String(selectedValue);
        }
        
        popup
          .setLngLat(closestPoint)
          .setHTML(`<div style="font-size: 12px; line-height: 1.4;"><strong>${valueLabel}:</strong> ${displayValue}</div>`)
          .addTo(map);
      } else {
        popup.remove();
      }
      
    }
  });
}

// Color function is now imported from colorSchemes.js

export function updateRouteColor(encodedType, encodedValues) {
  if (!routeState.mapInstance || !routeState.currentRouteData) return;
  
  const { coordinates } = routeState.currentRouteData;
  const { elevations, encodedValues: allEncodedValues } = routeState.currentRouteData;
  const data = encodedType === 'elevation' ? elevations : (allEncodedValues[encodedType] || []);
  
  if (!data || data.length === 0 || !coordinates || coordinates.length === 0) {
    // Default: single segment with default color
    routeState.mapInstance.getSource('route').setData({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: coordinates || []
      },
      properties: {
        color: '#3b82f6'
      }
    });
    
    // Update layer to use property-based coloring
    routeState.mapInstance.setPaintProperty('route-layer', 'line-color', ['get', 'color']);
    return;
  }
  
  // Create segments based on encoded value
  const segments = [];
  let currentSegment = null;
  let currentValue = null;
  
  // Helper function to normalize values for comparison (treat null and undefined as equal)
  const normalizeValue = (val) => {
    if (val === null || val === undefined) return null;
    return val;
  };
  
  coordinates.forEach((coord, index) => {
    const value = normalizeValue(data[index]);
    const normalizedCurrentValue = normalizeValue(currentValue);
    
    // Check if value changed or is first point
    if (value !== normalizedCurrentValue || index === 0) {
      // Save previous segment if exists
      if (currentSegment !== null && currentSegment.length > 0) {
        // Always add the current point to close the previous segment (to avoid gaps)
        // This ensures seamless connection between segments
        const segmentToSave = [...currentSegment, coord];
        
        // Only add segment if it has at least 2 points
        if (segmentToSave.length > 1) {
          const color = getColorForEncodedValue(encodedType, currentValue, data);
          segments.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: segmentToSave
            },
            properties: {
              color: color,
              value: currentValue
            }
          });
        }
      }
      
      // Start new segment with current point (which is also the last point of previous segment)
      // This ensures no gaps between segments
      currentSegment = [coord];
      currentValue = data[index]; // Store original value, not normalized
    } else {
      // Continue current segment
      currentSegment.push(coord);
    }
  });
  
  // Add final segment (must have at least 2 points)
  if (currentSegment !== null && currentSegment.length > 1) {
    const color = getColorForEncodedValue(encodedType, currentValue, data);
    segments.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: currentSegment
      },
      properties: {
        color: color,
        value: currentValue
      }
    });
  } else if (currentSegment !== null && currentSegment.length === 1 && segments.length > 0) {
    // If final segment has only one point, merge it with the last segment
    const lastSegment = segments[segments.length - 1];
    lastSegment.geometry.coordinates.push(currentSegment[0]);
  }
  
  // Update route source with segments
  routeState.mapInstance.getSource('route').setData({
    type: 'FeatureCollection',
    features: segments
  });
  
  // Update layer to use property-based coloring
  routeState.mapInstance.setPaintProperty('route-layer', 'line-color', ['get', 'color']);
}

export function updateRouteColorByProfile(map, profile) {
  const colorMap = {
    'car': '#3b82f6',
    'car_custom': '#8b5cf6',
    'car_customizable': '#6366f1',
    'bike': '#10b981',
    'my_bike_cycleways': '#f59e0b',
    'cargo_bike': '#ef4444',
    'racingbike': '#06b6d4',
    'mtb': '#ec4899'
  };

  const color = colorMap[profile] || '#3b82f6';

  map.setPaintProperty('route-layer', 'line-color', color);
}

