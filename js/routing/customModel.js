// Custom Model Management for car_customizable and bike_customizable profiles
// Handles custom routing models for GraphHopper API

// Default custom model configuration for car
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

// Default custom model configuration for bike
export const defaultBikeCustomModel = {
  "distance_influence": 90,
  "priority": [
    {"if": "road_class==MOTORWAY", "multiply_by": 0.0},
    {"if": "mapillary_coverage==true", "multiply_by": 0.1}
  ],
  "speed": [
    {"if": "true", "limit_to": "bike_average_speed"},
    {"if": "bike_access==false", "limit_to": 0},
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
  return profile === 'car_customizable' || profile === 'bike_customizable';
}

// Get the actual GraphHopper profile name (car_customizable -> car, bike_customizable -> bike)
export function getGraphHopperProfile(profile) {
  if (profile === 'car_customizable') return 'car';
  if (profile === 'bike_customizable') return 'bike';
  return profile;
}

// Initialize custom model if needed
export function ensureCustomModel(customModel, profile = 'car_customizable') {
  if (!customModel) {
    if (profile === 'bike_customizable') {
      return JSON.parse(JSON.stringify(defaultBikeCustomModel));
    }
    return JSON.parse(JSON.stringify(defaultCustomModel));
  }
  return customModel;
}

// Check if custom model differs from default
export function isDefaultCustomModel(customModel, profile = 'car_customizable') {
  const defaultModel = profile === 'bike_customizable' ? defaultBikeCustomModel : defaultCustomModel;
  return JSON.stringify(customModel) === JSON.stringify(defaultModel);
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
  // Add ch.disable for bike profile (LM routing)
  if (graphHopperProfile === 'bike') {
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

