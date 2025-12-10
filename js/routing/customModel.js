// Custom Model Management for car_customizable and bike_customizable profiles
// Handles custom routing models for GraphHopper API

// ============================================================================
// DEFAULT CUSTOM MODELS
// ============================================================================

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
    {"if": "road_class==TRACK", "multiply_by": 0.4},
    
    // Oberflächenbewertung
    // Diese Regeln werden dynamisch durch updateUnpavedRoadsRule() angepasst
    // Standard: unbefestigte Wege leicht abwerten (0.7-0.8)
    // Wenn "unbefestigte Wege meiden" aktiviert: stark abwerten (0.2-0.3)
    {"if": "surface==GRAVEL||surface==FINE_GRAVEL||surface==DIRT||surface==GROUND||surface==SAND", "multiply_by": 0.7},
    {"if": "surface==PAVING_STONES||surface==COBBLESTONE||surface==COMPACTED", "multiply_by": 0.8},
    {"if": "surface==null", "multiply_by": 0.6},
    
    // Mapillary coverage preference (anpassbar über Slider)
    // Default: 1.0 (definiert in constants.js DEFAULTS.MAPILLARY_WEIGHT)
    {"if": "mapillary_coverage==true", "multiply_by": 1.0}
  ],
  "speed": [
    // Basis: eingebaute Autogeschwindigkeit nutzen
    {"if": "true", "limit_to": "car_average_speed"},
    {"if": "true", "multiply_by": 0.8}, // 20% Reduktion für realistischere Geschwindigkeiten
    
    // Access-Logik: Kein Autozugang = sperren
    {"if": "car_access==false", "limit_to": 0},
    
    // Durchfahrtsbeschränkungen (motor_vehicle=destination, private, no) sperren
    // Diese Regel wird dynamisch aktiviert/deaktiviert über updateCarAccessRule()
    // Standard: aktiviert (sperrt Wege mit road_access==DESTINATION, PRIVATE oder NO)
    {"if": "road_access==DESTINATION||road_access==PRIVATE||road_access==NO", "limit_to": 0},
    
    // Fußwege, Wege, Treppen und Radwege sperren
    {"if": "road_class==FOOTWAY||road_class==PATH||road_class==STEPS||road_class==CYCLEWAY", "limit_to": 0},
    
    // Oberflächen reduzieren Geschwindigkeit
    {"if": "surface==SAND", "multiply_by": 0.6},
    {"if": "surface==GRAVEL||surface==FINE_GRAVEL||surface==GROUND||surface==DIRT", "multiply_by": 0.8},
    {"if": "surface==PAVING_STONES||surface==COBBLESTONE||surface==COMPACTED", "multiply_by": 0.9}
  ]
};

/**
 * Default custom model configuration for bike_customizable profile
 * 
 * ZWECK:
 * Optimiert Fahrradrouten für Touren-/Alltagsräder basierend auf:
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
    // Gegen Einbahn/Fußwege gegen Richtung: Diese Regel wird dynamisch durch updateAvoidPushingRule() angepasst
    // Standard: 0.2 (leicht abwerten), mit "Schieben verhindern": 0.01 (stark abwerten)
    {"else_if": "!bike_access && backward_bike_access && !roundabout", "multiply_by": 0.2},
    // Fußwege ohne Radinfrastruktur: Diese Regel wird dynamisch durch updateAvoidPushingRule() verwaltet
    // Standard: 0.2 (leicht abwerten in priority), mit "Schieben verhindern": limit_to: 0 (komplett sperren in speed)
    // Wichtig: Nur FOOTWAYs ohne bicycle_infra werden behandelt, nicht alle FOOTWAYs
    
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
    
    // Mapillary coverage preference (anpassbar über Slider)
    // Default: 1.0 (definiert in constants.js DEFAULTS.MAPILLARY_WEIGHT)
    {"if": "mapillary_coverage==true", "multiply_by": 1.0}
  ],
  "speed": [
    // Basis: eingebaute Fahrradgeschwindigkeit nutzen (auf 25km/h gesetzt)
    {"if": "true", "limit_to": "bike_average_speed"},
    
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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a profile supports custom models
 * @param {string} profile - Profile name
 * @returns {boolean} True if profile supports custom models
 */
export function supportsCustomModel(profile) {
  return profile === 'car_customizable' || profile === 'bike_customizable';
}

/**
 * Get the actual GraphHopper profile name
 * @param {string} profile - Profile name (car_customizable or bike_customizable)
 * @returns {string} GraphHopper profile name (car or bike)
 */
export function getGraphHopperProfile(profile) {
  if (profile === 'car_customizable') return 'car';
  if (profile === 'bike_customizable') return 'bike';
  return profile;
}

/**
 * Initialize custom model if needed
 * @param {Object|null} customModel - Existing custom model or null
 * @param {string} profile - Profile name
 * @returns {Object} Custom model (default or existing)
 */
export function ensureCustomModel(customModel, profile = 'car_customizable') {
  if (!customModel) {
    if (profile === 'bike_customizable') {
      return JSON.parse(JSON.stringify(defaultBikeCustomModel));
    }
    return JSON.parse(JSON.stringify(defaultCarCustomModel));
  }
  return customModel;
}

/**
 * Check if custom model differs from default
 * @param {Object} customModel - Custom model to check
 * @param {string} profile - Profile name
 * @returns {boolean} True if model differs from default
 */
export function isDefaultCustomModel(customModel, profile = 'car_customizable') {
  if (!customModel) return false;
  const defaultModel = profile === 'bike_customizable' ? defaultBikeCustomModel : defaultCarCustomModel;
  return JSON.stringify(customModel) === JSON.stringify(defaultModel);
}

/**
 * Build POST request body with custom model
 * @param {Array<Array<number>>} points - Array of [lng, lat] coordinates
 * @param {string} profile - Profile name
 * @param {Object} customModel - Custom model configuration
 * @returns {Object} Request body for GraphHopper API
 */
export function buildPostRequestBodyWithCustomModel(points, profile, customModel) {
  const graphHopperProfile = getGraphHopperProfile(profile);
  const requestBody = {
    points: points,
    profile: graphHopperProfile,
    points_encoded: false,
    elevation: true,
    details: ['surface', 'mapillary_coverage', 'road_class', 'road_access', 'bicycle_infra', 'osm_way_id'],
    custom_model: customModel
  };
  
  // Add ch.disable for LM routing (car and bike profiles)
  if (graphHopperProfile === 'car' || graphHopperProfile === 'bike') {
    requestBody['ch.disable'] = true;
  }
  
  return requestBody;
}

// ============================================================================
// MAPILLARY PRIORITY FUNCTIONS
// ============================================================================

/**
 * Update mapillary_coverage multiply_by value in custom model
 * @param {Object} customModel - Custom model to update
 * @param {number} multiplyBy - New multiply_by value
 * @returns {Object} Updated custom model
 */
export function updateMapillaryPriority(customModel, multiplyBy) {
  if (!customModel || !customModel.priority) {
    return customModel;
  }
  
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

/**
 * Get mapillary_coverage multiply_by value from custom model
 * @param {Object} customModel - Custom model to read from
 * @returns {number|null} Current multiply_by value or null if not found
 */
export function getMapillaryPriority(customModel) {
  if (!customModel || !customModel.priority) {
    return null;
  }
  
  const mapillaryRule = customModel.priority.find(
    r => r.if && (r.if === 'mapillary_coverage==true' || r.if.includes('mapillary_coverage==true'))
  );
  
  if (!mapillaryRule || mapillaryRule.multiply_by === undefined) {
    return null;
  }
  
  const value = typeof mapillaryRule.multiply_by === 'string' 
    ? parseFloat(mapillaryRule.multiply_by) 
    : mapillaryRule.multiply_by;
  
  return isNaN(value) ? null : value;
}

// ============================================================================
// CAR ACCESS RULE FUNCTIONS (for car_customizable profile)
// ============================================================================

/**
 * Update car access rule in custom model
 * Controls whether restricted roads (DESTINATION, PRIVATE, NO) are blocked
 * @param {Object} customModel - Custom model to update
 * @param {boolean} allowCarAccess - True = allow restricted roads, false = block them (default)
 * @returns {Object} Updated custom model
 */
export function updateCarAccessRule(customModel, allowCarAccess) {
  if (!customModel || !customModel.speed) {
    return customModel;
  }
  
  const carAccessRuleIndex = customModel.speed.findIndex(
    r => r.if && (r.if.includes('road_access==DESTINATION') || 
                  r.if.includes('road_access==PRIVATE') || 
                  r.if.includes('road_access==NO'))
  );
  
  if (carAccessRuleIndex === -1) {
    // Rule doesn't exist, add it if we want to block restricted roads
    if (!allowCarAccess) {
      const carAccessIndex = customModel.speed.findIndex(
        r => r.if && r.if.includes('car_access==false')
      );
      if (carAccessIndex !== -1) {
        customModel.speed.splice(carAccessIndex + 1, 0, {
          "if": "road_access==DESTINATION||road_access==PRIVATE||road_access==NO",
          "limit_to": 0
        });
      } else {
        customModel.speed.unshift({
          "if": "road_access==DESTINATION||road_access==PRIVATE||road_access==NO",
          "limit_to": 0
        });
      }
    }
  } else {
    // Rule exists, update or remove it
    if (allowCarAccess) {
      customModel.speed.splice(carAccessRuleIndex, 1);
    } else {
      customModel.speed[carAccessRuleIndex] = {
        "if": "road_access==DESTINATION||road_access==PRIVATE||road_access==NO",
        "limit_to": 0
      };
    }
  }
  
  return customModel;
}

/**
 * Get car access rule state from custom model
 * @param {Object} customModel - Custom model to read from
 * @returns {boolean} True if restricted roads are allowed, false if blocked
 */
export function getCarAccessRule(customModel) {
  if (!customModel || !customModel.speed) {
    return false; // Default: block restricted roads
  }
  
  const carAccessRule = customModel.speed.find(
    r => r.if && (r.if.includes('road_access==DESTINATION') || 
                  r.if.includes('road_access==PRIVATE') || 
                  r.if.includes('road_access==NO'))
  );
  
  // If rule exists, restricted roads are blocked (return false)
  // If rule doesn't exist, restricted roads are allowed (return true)
  return carAccessRule === undefined;
}

// ============================================================================
// UNPAVED ROADS RULE FUNCTIONS (for car_customizable profile)
// ============================================================================

/**
 * Update unpaved roads rule in custom model
 * Controls how strongly unpaved roads are avoided
 * @param {Object} customModel - Custom model to update
 * @param {boolean} avoidUnpavedRoads - True = strongly avoid (0.2-0.3), false = slightly reduce (0.7-0.8, default)
 * @returns {Object} Updated custom model
 */
export function updateUnpavedRoadsRule(customModel, avoidUnpavedRoads) {
  if (!customModel || !customModel.priority) {
    return customModel;
  }
  
  // Surface type definitions (only valid GraphHopper Surface values)
  const unpavedSurfaces = "surface==GRAVEL||surface==FINE_GRAVEL||surface==DIRT||surface==GROUND||surface==SAND";
  const semiPavedSurfaces = "surface==PAVING_STONES||surface==COBBLESTONE||surface==COMPACTED";
  const missingSurface = "surface==null";
  
  // Find existing rules
  const unpavedRuleIndex = customModel.priority.findIndex(
    r => r.if && (r.if.includes('GRAVEL') || r.if.includes('DIRT') || 
                  r.if.includes('GROUND') || r.if.includes('SAND'))
  );
  const semiPavedRuleIndex = customModel.priority.findIndex(
    r => r.if && (r.if.includes('PAVING_STONES') || 
                  r.if.includes('COBBLESTONE') || r.if.includes('COMPACTED'))
  );
  const missingSurfaceRuleIndex = customModel.priority.findIndex(
    r => r.if && r.if.includes('surface==null')
  );
  
  if (avoidUnpavedRoads) {
    // Strongly avoid unpaved roads
    const newUnpavedRule = {"if": unpavedSurfaces, "multiply_by": 0.25};
    if (unpavedRuleIndex !== -1) {
      customModel.priority[unpavedRuleIndex] = newUnpavedRule;
    } else {
      const mapillaryIndex = customModel.priority.findIndex(
        r => r.if && r.if.includes('mapillary_coverage')
      );
      if (mapillaryIndex !== -1) {
        customModel.priority.splice(mapillaryIndex, 0, newUnpavedRule);
      } else {
        customModel.priority.push(newUnpavedRule);
      }
    }
    
    const newSemiPavedRule = {"if": semiPavedSurfaces, "multiply_by": 0.5};
    if (semiPavedRuleIndex !== -1) {
      customModel.priority[semiPavedRuleIndex] = newSemiPavedRule;
    } else {
      const unpavedIndex = customModel.priority.findIndex(
        r => r.if && (r.if.includes('GRAVEL') || r.if.includes('DIRT'))
      );
      if (unpavedIndex !== -1) {
        customModel.priority.splice(unpavedIndex + 1, 0, newSemiPavedRule);
      } else {
        customModel.priority.push(newSemiPavedRule);
      }
    }
    
    const newMissingSurfaceRule = {"if": missingSurface, "multiply_by": 0.3};
    if (missingSurfaceRuleIndex !== -1) {
      customModel.priority[missingSurfaceRuleIndex] = newMissingSurfaceRule;
    } else {
      const unpavedIndex = customModel.priority.findIndex(
        r => r.if && (r.if.includes('GRAVEL') || r.if.includes('DIRT'))
      );
      if (unpavedIndex !== -1) {
        customModel.priority.splice(unpavedIndex + 1, 0, newMissingSurfaceRule);
      } else {
        customModel.priority.push(newMissingSurfaceRule);
      }
    }
  } else {
    // Default: slightly reduce unpaved roads
    if (unpavedRuleIndex !== -1) {
      customModel.priority[unpavedRuleIndex] = {"if": unpavedSurfaces, "multiply_by": 0.7};
    }
    if (semiPavedRuleIndex !== -1) {
      customModel.priority[semiPavedRuleIndex] = {"if": semiPavedSurfaces, "multiply_by": 0.8};
    }
    if (missingSurfaceRuleIndex !== -1) {
      customModel.priority[missingSurfaceRuleIndex] = {"if": missingSurface, "multiply_by": 0.6};
    }
  }
  
  return customModel;
}

/**
 * Get unpaved roads rule state from custom model
 * @param {Object} customModel - Custom model to read from
 * @returns {boolean} True if unpaved roads are strongly avoided, false if slightly reduced
 */
export function getUnpavedRoadsRule(customModel) {
  if (!customModel || !customModel.priority) {
    return false; // Default: slightly reduce
  }
  
  const unpavedRule = customModel.priority.find(
    r => r.if && (r.if.includes('GRAVEL') || r.if.includes('DIRT') || 
                  r.if.includes('GROUND') || r.if.includes('SAND'))
  );
  
  if (unpavedRule && unpavedRule.multiply_by !== undefined) {
    return unpavedRule.multiply_by <= 0.3;
  }
  
  return false; // Default: slightly reduce
}

// ============================================================================
// AVOID PUSHING RULE FUNCTIONS (for bike_customizable profile)
// ============================================================================

/**
 * Update avoid pushing rule in custom model
 * Controls whether routes that require pushing are blocked
 * - Blocks: road_class==FOOTWAY && bicycle_infra==NONE (via speed limit_to: 0)
 * - Strongly avoids: !bike_access && backward_bike_access (via priority multiply_by: 0.01)
 * @param {Object} customModel - Custom model to update
 * @param {boolean} avoidPushing - True = completely block, false = slightly allow (default)
 * @returns {Object} Updated custom model
 */
export function updateAvoidPushingRule(customModel, avoidPushing) {
  if (!customModel || !customModel.priority || !customModel.speed) {
    return customModel;
  }
  
  // Find existing rules
  const againstDirectionIndex = customModel.priority.findIndex(
    r => r.if && r.if.includes('!bike_access && backward_bike_access')
  );
  const footwayNoInfraIndex = customModel.priority.findIndex(
    r => r.if && r.if.includes('road_class == FOOTWAY') && r.if.includes('bicycle_infra == NONE')
  );
  const footwayNoInfraSpeedIndex = customModel.speed.findIndex(
    r => r.if && r.if.includes('road_class == FOOTWAY') && r.if.includes('bicycle_infra == NONE')
  );
  
  if (avoidPushing) {
    // Strongly avoid routes that require pushing (gegen Einbahn/Fußwege) - priority only
    if (againstDirectionIndex !== -1) {
      customModel.priority[againstDirectionIndex] = {
        "if": "!bike_access && backward_bike_access && !roundabout",
        "multiply_by": 0.01
      };
    }
    
    // Completely block footways without bicycle infrastructure - use speed section with limit_to: 0
    if (footwayNoInfraSpeedIndex !== -1) {
      customModel.speed[footwayNoInfraSpeedIndex] = {
        "if": "road_class == FOOTWAY && bicycle_infra == NONE",
        "limit_to": 0
      };
    } else {
      const bikeAccessIndex = customModel.speed.findIndex(
        r => r.if && r.if.includes('bike_access==false')
      );
      if (bikeAccessIndex !== -1) {
        customModel.speed.splice(bikeAccessIndex + 1, 0, {
          "if": "road_class == FOOTWAY && bicycle_infra == NONE",
          "limit_to": 0
        });
      } else {
        customModel.speed.unshift({
          "if": "road_class == FOOTWAY && bicycle_infra == NONE",
          "limit_to": 0
        });
      }
    }
    
    // Remove priority rule for footways (speed rule is sufficient for blocking)
    if (footwayNoInfraIndex !== -1) {
      customModel.priority.splice(footwayNoInfraIndex, 1);
    }
  } else {
    // Default: slightly allow (but still reduce priority)
    if (againstDirectionIndex !== -1) {
      customModel.priority[againstDirectionIndex] = {
        "if": "!bike_access && backward_bike_access && !roundabout",
        "multiply_by": 0.2
      };
    }
    
    // Remove speed rule to allow footways without bicycle infrastructure
    if (footwayNoInfraSpeedIndex !== -1) {
      customModel.speed.splice(footwayNoInfraSpeedIndex, 1);
    }
    
    // Add priority rule back (slightly reduce priority, but don't block)
    if (footwayNoInfraIndex === -1) {
      const mapillaryIndex = customModel.priority.findIndex(
        r => r.if && r.if.includes('mapillary_coverage')
      );
      const insertPosition = mapillaryIndex !== -1 ? mapillaryIndex : customModel.priority.length;
      customModel.priority.splice(insertPosition, 0, {
        "if": "road_class == FOOTWAY && bicycle_infra == NONE",
        "multiply_by": 0.2
      });
    } else {
      customModel.priority[footwayNoInfraIndex] = {
        "if": "road_class == FOOTWAY && bicycle_infra == NONE",
        "multiply_by": 0.2
      };
    }
  }
  
  return customModel;
}

/**
 * Get avoid pushing rule state from custom model
 * @param {Object} customModel - Custom model to read from
 * @returns {boolean} True if pushing is strongly avoided, false if slightly allowed
 */
export function getAvoidPushingRule(customModel) {
  if (!customModel || !customModel.priority) {
    return false; // Default: slightly allow
  }
  
  const againstDirectionRule = customModel.priority.find(
    r => r.if && r.if.includes('!bike_access && backward_bike_access')
  );
  const footwayNoInfraRule = customModel.priority.find(
    r => r.if && r.if.includes('road_class == FOOTWAY') && r.if.includes('bicycle_infra == NONE')
  );
  
  const againstDirectionStronglyAvoided = againstDirectionRule && 
    againstDirectionRule.multiply_by !== undefined && 
    againstDirectionRule.multiply_by <= 0.01;
  const footwayNoInfraStronglyAvoided = footwayNoInfraRule && 
    footwayNoInfraRule.multiply_by !== undefined && 
    footwayNoInfraRule.multiply_by <= 0.01;
  
  // Also check if speed rule exists (which means pushing is blocked)
  const footwayNoInfraSpeedRule = customModel.speed && customModel.speed.find(
    r => r.if && r.if.includes('road_class == FOOTWAY') && r.if.includes('bicycle_infra == NONE')
  );
  
  return againstDirectionStronglyAvoided || footwayNoInfraStronglyAvoided || !!footwayNoInfraSpeedRule;
}
