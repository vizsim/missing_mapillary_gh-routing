/**
 * Map Theme Switcher - Dynamically switches between Light and Dark themes
 * without reloading the entire map style
 */

// Color definitions for Light and Dark themes
const THEME_COLORS = {
  light: {
    background: "rgb(242,243,240)",
    park: { fillColor: "rgba(223, 229, 223, 1)", fillOpacity: 0.8 },
    water: { fillColor: "rgba(173, 186, 191, 1)" },
    landcover_ice_shelf: { fillColor: "hsl(0, 0%, 98%)", fillOpacity: 0.7 },
    landcover_glacier: { fillColor: "hsl(0, 0%, 98%)", fillOpacity: { base: 1, stops: [[0, 1], [8, 0.5]] } },
    landuse_residential: { fillColor: "rgba(217, 217, 204, 1)", fillOpacity: { base: 0.6, stops: [[8, 0.8], [9, 0.6]] } },
    landcover_wood: { fillColor: "rgba(214, 218, 214, 1)", fillOpacity: { base: 1, stops: [[8, 0], [12, 1]] } },
    waterway: { lineColor: "hsl(195, 17%, 78%)" },
    water_name: { textColor: "rgb(157,169,177)", textHaloColor: "rgb(242,243,240)" },
    building: { fillColor: "rgb(234, 234, 229)", fillOutlineColor: "rgb(219, 219, 218)" },
    tunnel_motorway_casing: { lineColor: "rgb(213, 213, 213)" },
    tunnel_motorway_inner: { lineColor: "rgb(234,234,234)" },
    aeroway_taxiway: { lineColor: "hsl(0, 0%, 88%)" },
    aeroway_runway_casing: { lineColor: "hsl(0, 0%, 88%)" },
    aeroway_area: { fillColor: "rgba(255, 255, 255, 1)", fillOpacity: { base: 1, stops: [[13, 0], [14, 1]] } },
    aeroway_runway: { lineColor: "rgba(255, 255, 255, 1)" },
    road_area_pier: { fillColor: "rgb(242,243,240)" },
    road_pier: { lineColor: "rgb(242,243,240)" },
    highway_path: { lineColor: "rgba(207, 197, 197, 1)" },
    highway_minor: { lineColor: "hsl(0, 0%, 88%)" },
    highway_major_casing: { lineColor: "rgb(213, 213, 213)" },
    highway_major_inner: { lineColor: "#fff" },
    highway_major_subtle: { lineColor: "hsla(0, 0%, 85%, 0.69)" },
    highway_motorway_casing: { lineColor: "rgb(213, 213, 213)" },
    highway_motorway_inner: { lineColor: { base: 1, stops: [[5.8, "hsla(0, 0%, 85%, 0.53)"], [6, "#fff"]] } },
    highway_motorway_subtle: { lineColor: "hsla(0, 0%, 85%, 0.53)" },
    railway_transit: { lineColor: "#dddddd" },
    railway_transit_dashline: { lineColor: "#fafafa" },
    railway_service: { lineColor: "#dddddd" },
    railway_service_dashline: { lineColor: "#fafafa" },
    railway: { lineColor: "#dddddd" },
    railway_dashline: { lineColor: "#fafafa" },
    highway_motorway_bridge_casing: { lineColor: "rgb(213, 213, 213)" },
    highway_motorway_bridge_inner: { lineColor: { base: 1, stops: [[5.8, "hsla(0, 0%, 85%, 0.53)"], [6, "#fff"]] } },
    highway_name_other: { textColor: "#bbb", textHaloColor: "#fff" },
    highway_name_motorway: { textColor: "rgb(117, 129, 145)", textHaloColor: "hsl(0, 0%, 100%)" },
    boundary_state: { lineColor: "rgb(230, 204, 207)" },
    boundary_country_z0_4: { lineColor: "rgb(230, 204, 207)" },
    boundary_country_z5_: { lineColor: "rgb(230, 204, 207)" },
    place_other: { textColor: "rgb(117, 129, 145)", textHaloColor: "rgb(242,243,240)" },
    place_suburb: { textColor: "rgb(117, 129, 145)", textHaloColor: "rgb(242,243,240)" },
    place_village: { textColor: "rgb(117, 129, 145)", textHaloColor: "rgb(242,243,240)" },
    place_town: { textColor: "rgb(117, 129, 145)", textHaloColor: "rgb(242,243,240)" },
    place_city: { textColor: "rgb(117, 129, 145)", textHaloColor: "rgb(242,243,240)" },
    place_capital: { textColor: "rgb(117, 129, 145)", textHaloColor: "rgb(242,243,240)" },
    place_city_large: { textColor: "rgb(117, 129, 145)", textHaloColor: "rgb(242,243,240)" },
    place_state: { textColor: "rgb(113, 129, 144)", textHaloColor: "rgb(242,243,240)" },
    place_country_other: { textColor: { base: 1, stops: [[3, "rgb(157,169,177)"], [4, "rgb(153, 153, 153)"]] }, textHaloColor: "rgba(236,236,234,0.7)" },
    place_country_minor: { textColor: { base: 1, stops: [[3, "rgb(157,169,177)"], [4, "rgb(153, 153, 153)"]] }, textHaloColor: "rgba(236,236,234,0.7)" },
    place_country_major: { textColor: { base: 1, stops: [[3, "rgb(157,169,177)"], [4, "rgb(153, 153, 153)"]] }, textHaloColor: "rgba(236,236,234,0.7)" }
  },
  dark: {
    background: "#0d0f12",
    park: { fillColor: "#131a15", fillOpacity: 0.35 },
    water: { fillColor: "#1a2530" },
    landcover_ice_shelf: { fillColor: "#1b1d22", fillOpacity: 0.2 },
    landcover_glacier: { fillColor: "#1b1d22", fillOpacity: { base: 1, stops: [[0, 0.25], [8, 0.15]] } },
    landuse_residential: { fillColor: "#14161a", fillOpacity: 0.25 },
    landcover_wood: { fillColor: "#1b211c", fillOpacity: { base: 1, stops: [[8, 0], [12, 0.4]] } },
    waterway: { lineColor: "#2c3e4d" },
    water_name: { textColor: "#6f8794", textHaloColor: "rgba(0,0,0,0.7)" },
    building: { fillColor: "rgba(18, 18, 20, 1)", fillOutlineColor: "rgba(52, 55, 60, 1)" },
    tunnel_motorway_casing: { lineColor: "#3e3e3e" },
    tunnel_motorway_inner: { lineColor: "#bfc1c4" },
    aeroway_taxiway: { lineColor: "#686b74" },
    aeroway_runway_casing: { lineColor: "#3c3f46" },
    aeroway_area: { fillColor: "#22252b", fillOpacity: { base: 1, stops: [[13, 0], [14, 0.5]] } },
    aeroway_runway: { lineColor: "#bfc3cc" },
    road_area_pier: { fillColor: "#161920" },
    road_pier: { lineColor: "#20232a" },
    highway_path: { lineColor: "rgba(0, 0, 0, 1)" },
    highway_minor: { lineColor: "#383b42" },
    highway_major_casing: { lineColor: "#2d2f36" },
    highway_major_inner: { lineColor: "#555a66" },
    highway_major_subtle: { lineColor: "#3f434b" },
    highway_motorway_casing: { lineColor: "#2c2e35" },
    highway_motorway_inner: { lineColor: "#747b86" },
    highway_motorway_subtle: { lineColor: "#8a8a8a" },
    railway_transit: { lineColor: "#666666" },
    railway_transit_dashline: { lineColor: "#bdbdbd" },
    railway_service: { lineColor: "#666666" },
    railway_service_dashline: { lineColor: "#bdbdbd" },
    railway: { lineColor: "#666666" },
    railway_dashline: { lineColor: "#bdbdbd" },
    highway_motorway_bridge_casing: { lineColor: "#4a4a4a" },
    highway_motorway_bridge_inner: { lineColor: "#d4d4d4" },
    highway_name_other: { textColor: "#9aa4b0", textHaloColor: "rgba(0,0,0,0.7)" },
    highway_name_motorway: { textColor: "#9aa4b0", textHaloColor: "rgba(0,0,0,0.7)" },
    boundary_state: { lineColor: "#3a3a3a" },
    boundary_country_z0_4: { lineColor: "#3a3a3a" },
    boundary_country_z5_: { lineColor: "#3a3a3a" },
    place_other: { textColor: "#d0d4d8", textHaloColor: "rgba(0,0,0,0.7)" },
    place_suburb: { textColor: "#d0d4d8", textHaloColor: "rgba(0,0,0,0.7)" },
    place_village: { textColor: "#d0d4d8", textHaloColor: "rgba(0,0,0,0.7)" },
    place_town: { textColor: "#d0d4d8", textHaloColor: "rgba(0,0,0,0.7)" },
    place_city: { textColor: "#d0d4d8", textHaloColor: "rgba(0,0,0,0.7)" },
    place_capital: { textColor: "#d0d4d8", textHaloColor: "rgba(0,0,0,0.7)" },
    place_city_large: { textColor: "#d0d4d8", textHaloColor: "rgba(0,0,0,0.7)" },
    place_state: { textColor: "#d0d4d8", textHaloColor: "rgba(0,0,0,0.7)" },
    place_country_other: { textColor: { base: 1, stops: [[3, "#9da9b1"], [4, "#9da9b1"]] }, textHaloColor: "rgba(0,0,0,0.7)" },
    place_country_minor: { textColor: { base: 1, stops: [[3, "#9da9b1"], [4, "#9da9b1"]] }, textHaloColor: "rgba(0,0,0,0.7)" },
    place_country_major: { textColor: { base: 1, stops: [[3, "#9da9b1"], [4, "#9da9b1"]] }, textHaloColor: "rgba(0,0,0,0.7)" }
  }
};

// Layer mapping: layer ID -> theme key
const LAYER_MAPPING = {
  "background": "background",
  "park": "park",
  "water": "water",
  "landcover_ice_shelf": "landcover_ice_shelf",
  "landcover_glacier": "landcover_glacier",
  "landuse_residential": "landuse_residential",
  "landcover_wood": "landcover_wood",
  "waterway": "waterway",
  "water_name": "water_name",
  "building": "building",
  "tunnel_motorway_casing": "tunnel_motorway_casing",
  "tunnel_motorway_inner": "tunnel_motorway_inner",
  "aeroway-taxiway": "aeroway_taxiway",
  "aeroway-runway-casing": "aeroway_runway_casing",
  "aeroway-area": "aeroway_area",
  "aeroway-runway": "aeroway_runway",
  "road_area_pier": "road_area_pier",
  "road_pier": "road_pier",
  "highway_path": "highway_path",
  "highway_minor": "highway_minor",
  "highway_major_casing": "highway_major_casing",
  "highway_major_inner": "highway_major_inner",
  "highway_major_subtle": "highway_major_subtle",
  "highway_motorway_casing": "highway_motorway_casing",
  "highway_motorway_inner": "highway_motorway_inner",
  "highway_motorway_subtle": "highway_motorway_subtle",
  "railway_transit": "railway_transit",
  "railway_transit_dashline": "railway_transit_dashline",
  "railway_service": "railway_service",
  "railway_service_dashline": "railway_service_dashline",
  "railway": "railway",
  "railway_dashline": "railway_dashline",
  "highway_motorway_bridge_casing": "highway_motorway_bridge_casing",
  "highway_motorway_bridge_inner": "highway_motorway_bridge_inner",
  "highway_name_other": "highway_name_other",
  "highway_name_motorway": "highway_name_motorway",
  "boundary_state": "boundary_state",
  "boundary_country_z0-4": "boundary_country_z0_4",
  "boundary_country_z5-": "boundary_country_z5_",
  "place_other": "place_other",
  "place_suburb": "place_suburb",
  "place_village": "place_village",
  "place_town": "place_town",
  "place_city": "place_city",
  "place_capital": "place_capital",
  "place_city_large": "place_city_large",
  "place_state": "place_state",
  "place_country_other": "place_country_other",
  "place_country_minor": "place_country_minor",
  "place_country_major": "place_country_major"
};

/**
 * Switch map theme between Light and Dark
 * @param {maplibregl.Map} map - Map instance
 * @param {boolean} isDark - Whether to switch to dark theme
 */
export function switchMapTheme(map, isDark) {
  if (!map) {
    return;
  }
  
  if (!map.isStyleLoaded() || !map.loaded()) {
    return;
  }

  const theme = isDark ? THEME_COLORS.dark : THEME_COLORS.light;

  // Set background color
  try {
    if (map.getLayer('background')) {
      map.setPaintProperty('background', 'background-color', theme.background);
    }
  } catch (e) {
    // Silently fail
  }

  // Apply colors to all layers
  Object.keys(LAYER_MAPPING).forEach(layerId => {
    try {
      const layer = map.getLayer(layerId);
      if (!layer) return;

      const layerThemeKey = LAYER_MAPPING[layerId];
      const colors = theme[layerThemeKey];
      if (!colors) return;

      // Apply fill colors
      if (colors.fillColor !== undefined) {
        map.setPaintProperty(layerId, 'fill-color', colors.fillColor);
      }
      if (colors.fillOpacity !== undefined) {
        map.setPaintProperty(layerId, 'fill-opacity', colors.fillOpacity);
      }
      if (colors.fillOutlineColor !== undefined) {
        map.setPaintProperty(layerId, 'fill-outline-color', colors.fillOutlineColor);
      }

      // Apply line colors
      if (colors.lineColor !== undefined) {
        map.setPaintProperty(layerId, 'line-color', colors.lineColor);
      }

      // Apply text colors
      if (colors.textColor !== undefined) {
        map.setPaintProperty(layerId, 'text-color', colors.textColor);
      }
      if (colors.textHaloColor !== undefined) {
        map.setPaintProperty(layerId, 'text-halo-color', colors.textHaloColor);
      }
    } catch (e) {
      // Silently fail
    }
  });

  // Set data attribute for waypoint icon styling
  if (isDark) {
    document.body.setAttribute('data-dark-map', 'true');
  } else {
    document.body.removeAttribute('data-dark-map');
  }
}

