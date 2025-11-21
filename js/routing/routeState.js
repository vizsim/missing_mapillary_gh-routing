// Route State Management
// Centralized state management for routing functionality

import { defaultCustomModel } from './customModel.js';

export const routeState = {
  // Map instance
  mapInstance: null,
  
  // Markers
  startMarker: null,
  endMarker: null,
  waypointMarkers: [],
  
  // Points
  startPoint: null,
  endPoint: null,
  waypoints: [], // Array of [lng, lat] coordinates
  
  // Selection state
  isSelectingStart: false,
  isSelectingEnd: false,
  isSelectingWaypoint: false,
  
  // Profile
  selectedProfile: 'car',
  
  // Custom model for car_customizable profile
  customModel: null,
  
  // Default custom model (imported from customModel.js)
  get defaultCustomModel() {
    return defaultCustomModel;
  },
  
  // Route data
  currentRouteData: null,
  currentEncodedType: 'mapillary_coverage',
  
  // Initialize state
  init(map) {
    this.mapInstance = map;
  },
  
  // Reset state
  reset() {
    this.startPoint = null;
    this.endPoint = null;
    this.waypoints = [];
    this.isSelectingStart = false;
    this.isSelectingEnd = false;
    this.isSelectingWaypoint = false;
    this.currentRouteData = null;
    
    if (this.startMarker) {
      this.startMarker.remove();
      this.startMarker = null;
    }
    if (this.endMarker) {
      this.endMarker.remove();
      this.endMarker = null;
    }
    // Remove all waypoint markers
    this.waypointMarkers.forEach(marker => {
      if (marker) marker.remove();
    });
    this.waypointMarkers = [];
  },
  
  // Get all points in order: [start, ...waypoints, end]
  getAllPoints() {
    const points = [];
    if (this.startPoint) points.push(this.startPoint);
    this.waypoints.forEach(wp => points.push(wp));
    if (this.endPoint) points.push(this.endPoint);
    return points;
  }
};

