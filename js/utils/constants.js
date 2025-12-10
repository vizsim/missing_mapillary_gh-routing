// Constants used throughout the application

export const GRAPHHOPPER_URL = 'https://ghroute.duckdns.org';
// const GRAPHHOPPER_URL = 'http://localhost:8989'; // For local development

// Error messages
export const ERROR_MESSAGES = {
  OUT_OF_BOUNDS: 'Aktuell stehen nur Berlin und Brandenburg zur Verfügung.',
  NO_ROUTE_FOUND: 'Keine Route gefunden',
  NETWORK_ERROR: 'Netzwerkfehler beim Abrufen der Route',
  INVALID_COORDINATES: 'Ungültige Koordinaten',
  ROUTE_CALCULATION_IN_PROGRESS: 'Route-Berechnung bereits in Arbeit, ignoriere neue Anfrage',
  MISSING_START_END: 'Bitte Start- und Endpunkt setzen'
};

// Route calculation settings
export const ROUTE_CALCULATION = {
  DEBOUNCE_DELAY: 300, // ms
  MAX_TIMEOUT: 1000, // ms
  RETRY_DELAY: 100, // ms
  MAX_RETRIES: 50
};

// Mapillary slider values
export const MAPILLARY_SLIDER_VALUES = [0.01, 0.02, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.6, 0.8, 1.0];

// Default values
export const DEFAULTS = {
  PROFILE: 'bike_customizable',
  ENCODED_TYPE: 'mapillary_coverage',
  MAPILLARY_WEIGHT: 1.0
};

// Coordinate validation
export const COORDINATE_LIMITS = {
  MIN_LNG: -180,
  MAX_LNG: 180,
  MIN_LAT: -90,
  MAX_LAT: 90
};

// Route info formatting
export const FORMATTING = {
  DISTANCE_PRECISION: 2,
  COORDINATE_PRECISION: 5,
  COORDINATE_PRECISION_URL: 4,
  TIME_PRECISION: 0
};

// Permalink settings
export const PERMALINK = {
  STATE_CHECK_INTERVAL: 500, // ms
  UPDATE_DELAY: 100, // ms
  LAYER_ACTIVATION_DELAY: 500, // ms
  MAX_LAYER_RETRIES: 25,
  LAYER_RETRY_DELAY: 200, // ms
  MAX_ROUTE_RETRIES: 50,
  ROUTE_RETRY_DELAY: 100 // ms
};

// UI element IDs (for easier refactoring)
export const UI_IDS = {
  START_INPUT: 'start-input',
  END_INPUT: 'end-input',
  CALCULATE_BTN: 'calculate-route',
  CLEAR_BTN: 'clear-route',
  HIDE_BTN: 'hide-route',
  EXPORT_GPX_BTN: 'export-gpx',
  ROUTE_INFO: 'route-info',
  HEIGHTGRAPH_CONTAINER: 'heightgraph-container',
  MAPILLARY_SLIDER: 'mapillary-priority-slider',
  SLIDER_VALUE: 'slider-value',
  COMPARISON_CONTAINER: 'mapillary-weight-comparison',
  ENCODED_SELECT: 'heightgraph-encoded-select'
};

// Layer IDs
export const LAYER_IDS = {
  ROUTE: 'route',
  ROUTE_LAYER: 'route-layer',
  ROUTE_HOVER_SEGMENT: 'route-hover-segment',
  ROUTE_HOVER_SEGMENT_LAYER: 'route-hover-segment-layer',
  HEIGHTGRAPH_HOVER_POINT: 'heightgraph-hover-point',
  HEIGHTGRAPH_HOVER_POINT_LAYER: 'heightgraph-hover-point-layer',
  HILLSHADE_LAYER: 'hillshade-layer',
  TERRAIN: 'terrain'
};

// Context layer IDs
export const CONTEXT_LAYER_IDS = [
  'bike-lanes-needsClarification',
  'bike-lanes-gehweg',
  'bike-lanes-kfz',
  'bike-lanes-fussverkehr',
  'bike-lanes-eigenstaendig',
  'bike-lanes-baulich',
  'missing-streets-missing-pathclasses',
  'missing-streets-missing-roads',
  'missing-streets-missing-bikelanes',
  'missing-streets-regular-pathclasses',
  'missing-streets-regular-roads',
  'missing-streets-regular-bikelanes',
  'missing-streets-pano-pathclasses',
  'missing-streets-pano-roads',
  'missing-streets-pano-bikelanes'
];

