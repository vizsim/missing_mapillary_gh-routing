// Custom Model Management for car_customizable profile
// Handles custom routing models for GraphHopper API

// Default custom model configuration
export const defaultCustomModel = {
  "distance_influence": 90,
  "priority": [
    {"if": "road_class==MOTORWAY", "multiply_by": 1.0},
    {"if": "road_class==FOOTWAY||road_class==PATH||road_class==STEPS||road_class==CYCLEWAY", "multiply_by": 0.0},
    {"if": "mapillary_coverage==true", "multiply_by": 0.1}
  ],
  "speed": [
    {"if": "true", "limit_to": "car_average_speed"},
    {"if": "car_access==false", "limit_to": 0},
    {"if": "mapillary_coverage==false", "multiply_by": 1.0}
  ]
};

// Test custom model (kept for reference)
export const defaultCustomModel_tester = {
  "distance_influence": 90,
  "priority": [
    {"if": "road_class==SECONDARY||road_class==PRIMARY||road_class==TRUNK", "multiply_by": 0.1},
    {"if": "road_class==FOOTWAY||road_class==PATH||road_class==STEPS||road_class==CYCLEWAY", "multiply_by": 0.0},
    {"if": "mapillary_coverage==false", "multiply_by": 0.1}
  ],
  "speed": [
    {"if": "true", "limit_to": "car_average_speed"},
    {"if": "car_access==false", "limit_to": 0},
    {"if": "mapillary_coverage==false", "multiply_by": 1.0}
  ]
};

// Check if a profile supports custom models
export function supportsCustomModel(profile) {
  return profile === 'car_customizable';
}

// Get the actual GraphHopper profile name (car_customizable -> car)
export function getGraphHopperProfile(profile) {
  return profile === 'car_customizable' ? 'car' : profile;
}

// Initialize custom model if needed
export function ensureCustomModel(customModel) {
  if (!customModel) {
    return JSON.parse(JSON.stringify(defaultCustomModel));
  }
  return customModel;
}

// Check if custom model differs from default
export function isDefaultCustomModel(customModel) {
  return JSON.stringify(customModel) === JSON.stringify(defaultCustomModel);
}

// Build POST request body with custom model
// points: Array of [lng, lat] coordinates
export function buildPostRequestBodyWithCustomModel(points, profile, customModel) {
  const graphHopperProfile = getGraphHopperProfile(profile);
  const requestBody = {
    points: points, // Array of [lng, lat] coordinates
    profile: graphHopperProfile,
    points_encoded: false,
    elevation: true,
    details: ['surface', 'mapillary_coverage', 'road_class', 'road_access', 'bicycle_infra', 'osm_way_id'],
    custom_model: customModel
  };
  
  // Add ch.disable for car profile (LM routing)
  if (graphHopperProfile === 'car') {
    requestBody['ch.disable'] = true;
  }
  
  return requestBody;
}

// Update mapillary_coverage multiply_by value in custom model
export function updateMapillaryPriority(customModel, multiplyBy) {
  if (!customModel || !customModel.priority) {
    return customModel;
  }
  
  const mapillaryRule = customModel.priority.find(
    r => r.if && r.if.includes('mapillary_coverage==true')
  );
  
  if (mapillaryRule) {
    mapillaryRule.multiply_by = multiplyBy;
  } else {
    customModel.priority.push({
      "if": "mapillary_coverage==true",
      "multiply_by": multiplyBy
    });
  }
  
  return customModel;
}

// Get mapillary_coverage multiply_by value from custom model
export function getMapillaryPriority(customModel) {
  if (!customModel || !customModel.priority) {
    return null;
  }
  
  const mapillaryRule = customModel.priority.find(
    r => r.if && r.if.includes('mapillary_coverage==true')
  );
  
  if (!mapillaryRule || mapillaryRule.multiply_by === undefined) {
    return null;
  }
  
  // Convert to number if needed (for backwards compatibility)
  const value = typeof mapillaryRule.multiply_by === 'string' 
    ? parseFloat(mapillaryRule.multiply_by) 
    : mapillaryRule.multiply_by;
  
  return isNaN(value) ? null : value;
}

