// Custom Model Management for car_customizable and bike_customizable profiles
// Handles custom routing models for GraphHopper API

/**
 * Default custom model configuration for car_customizable profile
 * 
 * ZWECK:
 * Optimiert Autofahrten basierend auf:
 * - Straßenklassen (bevorzugt Hauptstraßen)
 * - Radinfrastruktur (sperrt Radwege)
 * - Oberflächenqualität
 * - Mapillary Coverage (anpassbar über Slider)
 * 
 * PRIORITY-REGELN:
 * - Basis: 1.0 (keine Reduktion)
 * - Hauptstraßen bevorzugen (MOTORWAY, TRUNK, PRIMARY)
 * - Kleine Straßen abwerten (RESIDENTIAL, LIVING_STREET)
 * - Schlechte Oberflächen abwerten
 * - Mapillary Coverage bevorzugen (Standard 1.0, anpassbar)
 */
export const defaultCarCustomModel = {
  "distance_influence": 90,
  "priority": [
    // Basis: Keine Reduktion
    {"if": "true", "multiply_by": 1.0},
    
    // Fußwege, Wege, Treppen und Radwege sperren (Fallback für road_class)
    {"if": "road_class==FOOTWAY||road_class==PATH||road_class==STEPS||road_class==CYCLEWAY", "multiply_by": 0.0},
    
    // Hauptstraßen bevorzugen (höhere Priorität)
    {"if": "road_class==MOTORWAY", "limit_to": 1.0},
    {"if": "road_class==TRUNK", "limit_to": 0.95},
    {"if": "road_class==PRIMARY", "limit_to": 0.9},
    {"if": "road_class==SECONDARY", "limit_to": 0.85},
    
    // Kleine Straßen abwerten (weniger bevorzugt)
    {"if": "road_class==RESIDENTIAL||road_class==LIVING_STREET", "multiply_by": 0.7},
    {"if": "road_class==SERVICE", "multiply_by": 0.5},
    //{"if": "road_class==TRACK", "multiply_by": 0.4},
    
    // Schlechte Oberflächen abwerten
    {"if": "surface==SAND||surface==GRAVEL||surface==GROUND||surface==DIRT", "multiply_by": 0.8},
    {"if": "surface==COBBLESTONE", "multiply_by": 0.9},
    
    // Mapillary coverage preference (can be adjusted via slider)
    // Default: 1.0 (as documented in comments above and defined in constants.js DEFAULTS.MAPILLARY_WEIGHT)
    {"if": "mapillary_coverage==true", "multiply_by": 1.0}
  ],
  "speed": [
    // Basis: eingebaute Autogeschwindigkeit nutzen
    {"if": "true", "limit_to": "car_average_speed"},
    // Generell um 20% reduzieren (z.B. für realistischere Geschwindigkeiten oder Sicherheitspuffer)
    {"if": "true", "multiply_by": 0.8},
    
    // Access-Logik: Kein Autozugang = sperren
    {"if": "car_access==false", "limit_to": 0},
    
    // Durchfahrtsbeschränkungen (motor_vehicle=destination, private, no) sperren
    // Diese Regel wird dynamisch aktiviert/deaktiviert über updateCarAccessRule()
    // Standard: aktiviert (sperrt Wege mit road_access==DESTINATION, PRIVATE oder NO)
    {"if": "road_access==DESTINATION||road_access==PRIVATE||road_access==NO", "limit_to": 0},
    
    // Fußwege, Wege, Treppen und Radwege sperren
    {"if": "road_class==FOOTWAY||road_class==PATH||road_class==STEPS||road_class==CYCLEWAY", "limit_to": 0},
    
    // Schlechte Oberflächen reduzieren Geschwindigkeit
    {"if": "surface==SAND", "multiply_by": 0.6},
    {"if": "surface==GRAVEL||surface==GROUND||surface==DIRT", "multiply_by": 0.8},
    {"if": "surface==COBBLESTONE", "multiply_by": 0.9}
  ]
};

/**
 * Default custom model configuration for bike_customizable profile
 * 
 * ZWECK:
 * Dieses Custom Model optimiert Fahrradrouten für Touren-/Alltagsräder basierend auf:
 * - Radinfrastruktur-Qualität (bicycle_infra)
 * - Straßenklassen (road_class) für Wege ohne spezielle Radinfrastruktur
 * - Oberflächenqualität (surface)
 * - Steigungen (average_slope)
 * - Mapillary Coverage (anpassbar über Slider)
 * 
 * WICHTIGE KONFIGURATION:
 * - bike_average_speed muss in der GraphHopper-Konfiguration (config.yml) auf 25 km/h gesetzt werden
 *   Beispiel: {"if": "true", "limit_to": 25} im bike profile
 * 
 * PRIORITY-REGELN (Reihenfolge ist wichtig!):
 * 1. Basis: 0.8 (ermöglicht Multiplikatoren > 1.0 ohne über 1.0 zu gehen)
 * 2. Access-Logik: Sperrt unzugängliche Wege
 * 3. Bicycle Infrastructure: Priorisiert Wege basierend auf bicycle_infra (Score 3-10)
 *    - Score 10 (CYCLEWAY_ISOLATED): 1.0 (höchste Priorität)
 *    - Score 9: 0.95
 *    - Score 8: 0.9
 *    - Score 7: 0.85
 *    - Score 6: 0.8
 *    - Score 5: 0.7
 *    - Score 4: 0.6
 *    - Score 3: 0.5
 * 4. Road Class (nur wenn bicycle_infra == NONE): Abwertung von Hauptstraßen
 * 5. Oberflächen: Abwertung von schlechten Oberflächen
 * 6. Mapillary Coverage: Standard 1.0 (anpassbar über Slider)
 * 
 * SPEED-REGELN:
 * - Basis: bike_average_speed (25 km/h, in GraphHopper-Konfiguration gesetzt)
 * - Steigungen: Reduziert Geschwindigkeit (0.25x bei sehr steil, 0.90x bei leicht)
 * - Gefälle: Bleibt bei Basisgeschwindigkeit (1.0x)
 * - Oberflächen: Zusätzliche Reduktion (Sand: 0.5x, Kopfsteinpflaster: 0.7x)
 * 
 * HINWEIS:
 * - limit_to setzt nur Obergrenzen, keine Mindestgeschwindigkeiten
 * - multiply_by kann nicht über 1.0 gehen (GraphHopper-Limitierung)
 * - Reihenfolge der Regeln ist wichtig (werden sequenziell angewendet)
 */
export const defaultBikeCustomModel = {
  "distance_influence": 80,
  "priority": [
    // Basis: Start mit einem mittleren Wert
    {"if": "true", "multiply_by": 0.8},
    
    // Ungeeignete Wege für ein normales Touren-/Alltagsrad
    {"if": "mtb_rating > 2", "multiply_by": 0},
    {"if": "hike_rating > 1", "multiply_by": 0},
    
    // Access-Logik
    {"if": "!bike_access && (!backward_bike_access || roundabout)", "multiply_by": 0},
    {"else_if": "!bike_access && backward_bike_access && !roundabout", "multiply_by": 0.2},
    
    // Bicycle Infrastructure basierte Priorisierung (höchste Qualität zuerst)
    // Score 10: Beste Option, komplett getrennt
    {"if": "bicycle_infra == CYCLEWAY_ISOLATED", "limit_to": 1.0},
    
    // Score 9: Sehr hohe Qualität
    {"if": "bicycle_infra == BICYCLE_ROAD", "limit_to": 0.95},
    {"if": "bicycle_infra == CYCLEWAY_ADJOINING", "limit_to": 0.95},
    {"if": "bicycle_infra == CYCLEWAY_ADJOINING_OR_ISOLATED", "limit_to": 0.95},
    {"if": "bicycle_infra == CYCLEWAY_ON_HIGHWAY_PROTECTED", "limit_to": 0.95},
    {"if": "bicycle_infra == FOOT_AND_CYCLEWAY_SEGREGATED_ISOLATED", "limit_to": 0.95},
    
    // Score 8: Hohe Qualität
    {"if": "bicycle_infra == CYCLEWAY_LINK", "limit_to": 0.9},
    {"if": "bicycle_infra == FOOT_AND_CYCLEWAY_SEGREGATED_ADJOINING", "limit_to": 0.9},
    {"if": "bicycle_infra == FOOT_AND_CYCLEWAY_SEGREGATED_ADJOINING_OR_ISOLATED", "limit_to": 0.9},
    
    // Score 7: Gute Qualität
    {"if": "bicycle_infra == BICYCLE_ROAD_VEHICLE_DESTINATION", "limit_to": 0.85},
    {"if": "bicycle_infra == CYCLEWAY_ON_HIGHWAY_EXCLUSIVE", "limit_to": 0.85},
    {"if": "bicycle_infra == FOOT_AND_CYCLEWAY_SHARED_ISOLATED", "limit_to": 0.85},
    
    // Score 6: Mittlere Qualität
    {"if": "bicycle_infra == CYCLEWAY_ON_HIGHWAY_ADVISORY_OR_EXCLUSIVE", "limit_to": 0.8},
    {"if": "bicycle_infra == FOOT_AND_CYCLEWAY_SHARED_ADJOINING", "limit_to": 0.8},
    {"if": "bicycle_infra == FOOT_AND_CYCLEWAY_SHARED_ADJOINING_OR_ISOLATED", "limit_to": 0.8},
    {"if": "bicycle_infra == FOOTWAY_BICYCLE_YES_ISOLATED", "limit_to": 0.8},
    {"if": "bicycle_infra == SHARED_BUS_LANE_BIKE_WITH_BUS", "limit_to": 0.8},
    
    // Score 5: Niedrigere Qualität
    {"if": "bicycle_infra == CYCLEWAY_ON_HIGHWAY_ADVISORY", "limit_to": 0.7},
    {"if": "bicycle_infra == FOOTWAY_BICYCLE_YES_ADJOINING", "limit_to": 0.7},
    {"if": "bicycle_infra == FOOTWAY_BICYCLE_YES_ADJOINING_OR_ISOLATED", "limit_to": 0.7},
    {"if": "bicycle_infra == SHARED_BUS_LANE_BUS_WITH_BIKE", "limit_to": 0.7},
    
    // Score 4: Noch niedrigere Qualität
    {"if": "bicycle_infra == CROSSING", "limit_to": 0.6},
    {"if": "bicycle_infra == PEDESTRIAN_AREA_BICYCLE_YES", "limit_to": 0.6},
    {"if": "bicycle_infra == SHARED_MOTOR_VEHICLE_LANE", "limit_to": 0.6},
    
    // Score 3: Niedrigste Qualität
    {"if": "bicycle_infra == CYCLEWAY_ON_HIGHWAY_BETWEEN_LANES", "limit_to": 0.5},
    
    // Wenn bicycle_infra == NONE, dann road_class verwenden
    {"if": "bicycle_infra == NONE && road_class == CYCLEWAY", "limit_to": 0.95},
    {"if": "bicycle_infra == NONE && (road_class == LIVING_STREET || road_class == RESIDENTIAL)", "limit_to": 0.8},
    {"if": "bicycle_infra == NONE && road_class == SECONDARY", "multiply_by": 0.45},
    {"if": "bicycle_infra == NONE && road_class == PRIMARY", "multiply_by": 0.3},
    {"if": "bicycle_infra == NONE && road_class == TRUNK", "multiply_by": 0.2},
    {"if": "bicycle_infra == NONE && road_class == MOTORWAY", "multiply_by": 0},
    
    // Radnetze bevorzugen
    {"if": "bike_network != OTHER", "limit_to": 0.9},
    
    // Oberflächenbewertung (für Touren-/Citybike optimiert)
    {"if": "surface == GRAVEL || surface == FINE_GRAVEL || surface == COMPACTED", "multiply_by": 0.9},
    {"if": "surface == GROUND || surface == DIRT", "multiply_by": 0.7},
    {"if": "surface == SAND || surface == COBBLESTONE", "multiply_by": 0.4},
    
    // Mapillary coverage preference (can be adjusted via slider)
    // Default: 1.0 (as documented in comments above and defined in constants.js DEFAULTS.MAPILLARY_WEIGHT)
    {"if": "mapillary_coverage==true", "multiply_by": 1.0}
  ],
  "speed": [
    // Basis: eingebaute Fahrradgeschwindigkeit nutzen
    {"if": "true", "limit_to": "bike_average_speed"},  // auf 25km/h gesettet
    
    // Gegen Einbahn -> nur Schrittgeschwindigkeit (Schieben)
    {"if": "!bike_access && backward_bike_access && !roundabout", "limit_to": 5},
    
    // Treppen sehr langsam
    {"if": "road_class == STEPS", "limit_to": 4},
    
    // Steigungs-basierte Geschwindigkeitsanpassungen
    {"if": "average_slope >= 15", "multiply_by": 0.25},
    {"else_if": "average_slope >= 10", "multiply_by": 0.40},
    {"else_if": "average_slope >= 8", "multiply_by": 0.55},
    {"else_if": "average_slope >= 6", "multiply_by": 0.70},
    {"else_if": "average_slope >= 4", "multiply_by": 0.80},
    {"else_if": "average_slope >= 2", "multiply_by": 0.90},
    {"else_if": "average_slope <= -12", "multiply_by": 0.90},
    {"else_if": "average_slope <= -8", "multiply_by": 1.0},
    {"else_if": "average_slope <= -4", "multiply_by": 1.0},
    {"else_if": "average_slope <= -2", "multiply_by": 1.00},
    
    // Oberflächen, die realistisch bremsen
    {"if": "surface == SAND", "multiply_by": 0.5},
    {"if": "surface == COBBLESTONE", "multiply_by": 0.7},
    
    // Access-Logik
    {"if": "bike_access==false", "limit_to": 0}
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
    return JSON.parse(JSON.stringify(defaultCarCustomModel));
  }
  return customModel;
}

// Check if custom model differs from default
// Compares the entire model structure, which is reliable since models are always created in the same order
export function isDefaultCustomModel(customModel, profile = 'car_customizable') {
  if (!customModel) return false;
  const defaultModel = profile === 'bike_customizable' ? defaultBikeCustomModel : defaultCarCustomModel;
  // Use JSON.stringify for deep comparison - reliable since models are always created in the same order
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
  
  // Find the mapillary_coverage rule (handle both with and without spaces)
  const mapillaryRule = customModel.priority.find(
    r => r.if && (r.if === 'mapillary_coverage==true' || r.if.includes('mapillary_coverage==true'))
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
  
  // Find the mapillary_coverage rule (handle both with and without spaces)
  const mapillaryRule = customModel.priority.find(
    r => r.if && (r.if === 'mapillary_coverage==true' || r.if.includes('mapillary_coverage==true'))
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

// Update car access rule in custom model (for car_customizable profile only)
// allowCarAccess: true = allow restricted roads (DESTINATION, PRIVATE, NO), false = block them (default)
export function updateCarAccessRule(customModel, allowCarAccess) {
  if (!customModel || !customModel.speed) {
    return customModel;
  }
  
  // Find the car access rule (check for DESTINATION, PRIVATE, or NO)
  const carAccessRuleIndex = customModel.speed.findIndex(
    r => r.if && (r.if.includes('road_access==DESTINATION') || 
                  r.if.includes('road_access==PRIVATE') || 
                  r.if.includes('road_access==NO'))
  );
  
  if (carAccessRuleIndex === -1) {
    // Rule doesn't exist, add it if we want to block restricted roads
    if (!allowCarAccess) {
      // Find position after car_access rule
      const carAccessIndex = customModel.speed.findIndex(
        r => r.if && r.if.includes('car_access==false')
      );
      if (carAccessIndex !== -1) {
        customModel.speed.splice(carAccessIndex + 1, 0, {
          "if": "road_access==DESTINATION||road_access==PRIVATE||road_access==NO",
          "limit_to": 0
        });
      } else {
        // Fallback: add at beginning of speed rules
        customModel.speed.unshift({
          "if": "road_access==DESTINATION||road_access==PRIVATE||road_access==NO",
          "limit_to": 0
        });
      }
    }
  } else {
    // Rule exists, update or remove it
    if (allowCarAccess) {
      // Remove the rule to allow restricted roads
      customModel.speed.splice(carAccessRuleIndex, 1);
    } else {
      // Ensure the rule blocks restricted roads
      customModel.speed[carAccessRuleIndex] = {
        "if": "road_access==DESTINATION||road_access==PRIVATE||road_access==NO",
        "limit_to": 0
      };
    }
  }
  
  return customModel;
}

// Get car access rule state from custom model
// Returns true if restricted roads (DESTINATION, PRIVATE, NO) are allowed, false if blocked
export function getCarAccessRule(customModel) {
  if (!customModel || !customModel.speed) {
    // Default: block restricted roads
    return false;
  }
  
  // Check if car access rule exists (check for DESTINATION, PRIVATE, or NO)
  const carAccessRule = customModel.speed.find(
    r => r.if && (r.if.includes('road_access==DESTINATION') || 
                  r.if.includes('road_access==PRIVATE') || 
                  r.if.includes('road_access==NO'))
  );
  
  // If rule exists, restricted roads are blocked (return false)
  // If rule doesn't exist, restricted roads are allowed (return true)
  return carAccessRule === undefined;
}

