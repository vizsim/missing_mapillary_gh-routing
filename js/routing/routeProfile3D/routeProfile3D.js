// 3D route profile — native MapLibre 3D bar chart (fill-extrusion) + optional
// 3D buildings, tilted camera view. Two variants:
//   - 'route'    : columns stand on the route itself
//   - 'baseline' : columns stand on a smoothed baseline beside the route
//
// This is the ONLY module here that touches MapLibre/DOM. Geometry, values and
// colors live in pure modules (profileColumns + the shared profileValues /
// profileColorScales), so a React port only re-implements this thin layer.

import { routeState } from '../routeState.js';
import { buildColumns, makeValueAtFraction } from './profileColumns.js';
import { buildProfileBars } from '../routeProfile/profileGeometry.js';
import { PROFILE_VALUES, getProfileSeries, toSegmentValues } from '../routeProfile/profileValues.js';
import { COLOR_SCHEMES, colorForT } from '../routeProfile/profileColorScales.js';

const SOURCE_COLS = 'route-3d-columns';
const LAYER_COLS = 'route-3d-columns-extrusion';
const LAYER_BUILDINGS = 'route-3d-buildings';

const IDS = {
  toggle: 'profile3d-toggle',
  controls: 'profile3d-controls',
  variant: 'profile3d-variant',
  value: 'profile3d-value',
  scheme: 'profile3d-scheme',
  height: 'profile3d-height',
  buildings: 'profile3d-buildings',
  terrain: 'profile3d-terrain',
};

const options = {
  enabled: false,
  variant: 'route', // 'route' | 'baseline'
  valueKey: 'elevation',
  scheme: 'danger',
  maxHeightMeters: 250,
  buildings: true,
  terrain: true,
};

// Defaults used to keep shared URLs short (only non-defaults are serialized).
// buildings + terrain default ON: activating 3D turns the whole 3D scene on.
const DEFAULTS = { variant: 'route', valueKey: 'elevation', scheme: 'danger', maxHeightMeters: 250, buildings: true, terrain: true };

// 3D terrain look, aligned with the gradients2osm reference (Mapterhorn DEM +
// blue atmospheric sky). The app already provides the 'terrain' raster-dem source.
const TERRAIN_SOURCE = 'terrain';
const TERRAIN_EXAGGERATION = 1.5;
const SKY_STYLE = {
  'sky-color': '#199EF3',
  'sky-horizon-blend': 0.7,
  'horizon-color': '#f0f8ff',
  'horizon-fog-blend': 0.8,
  'fog-color': '#2c7fb8',
  'fog-ground-blend': 0.9,
  'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 10, 1, 13, 0],
};

const ENABLED_PITCH = 55;
let mapRef = null;
let controlsWired = false;
let terrainAppliedByUs = false;

// Notify listeners (the permalink) that a user-facing 3D option changed.
function notifyChange() {
  document.dispatchEvent(new Event('profile3d:change'));
}

function emptyFC() {
  return { type: 'FeatureCollection', features: [] };
}

export function setupRouteProfile3D(map) {
  mapRef = map;
  ensureLayers(map);
  if (!controlsWired) {
    setupControls();
    controlsWired = true;
  }
  update3D();
  // Restore the tilted view (+ terrain) when arriving with 3D enabled from a URL.
  if (options.enabled) {
    applyCamera();
    applyTerrain();
  }
}

function ensureLayers(map) {
  if (!map.getSource(SOURCE_COLS)) {
    map.addSource(SOURCE_COLS, { type: 'geojson', data: emptyFC() });
  }
  // 3D buildings reuse the basemap's existing OpenMapTiles `building` source-layer
  // (render_height / render_min_height), extruded natively. Hidden until toggled.
  if (map.getSource('openmaptiles') && !map.getLayer(LAYER_BUILDINGS)) {
    map.addLayer({
      id: LAYER_BUILDINGS,
      type: 'fill-extrusion',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 13,
      layout: { visibility: 'none' },
      paint: {
        'fill-extrusion-color': 'hsl(35, 8%, 80%)',
        'fill-extrusion-height': [
          'max',
          ['coalesce', ['to-number', ['get', 'render_height']], 6],
          ['coalesce', ['to-number', ['get', 'render_min_height']], 0],
        ],
        'fill-extrusion-base': ['coalesce', ['to-number', ['get', 'render_min_height']], 0],
        'fill-extrusion-opacity': 0.75,
      },
    });
  }
  // The route profile columns sit on top, depth-tested against the buildings.
  if (!map.getLayer(LAYER_COLS)) {
    map.addLayer({
      id: LAYER_COLS,
      type: 'fill-extrusion',
      source: SOURCE_COLS,
      paint: {
        'fill-extrusion-color': ['get', 'color'],
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.92,
      },
    });
  }
}

function setupControls() {
  populateSelectors();

  const toggle = document.getElementById(IDS.toggle);
  const controls = document.getElementById(IDS.controls);
  if (toggle) {
    toggle.checked = options.enabled;
    if (controls) controls.style.display = options.enabled ? 'block' : 'none';
    toggle.addEventListener('change', (e) => {
      options.enabled = e.target.checked;
      if (controls) controls.style.display = options.enabled ? 'block' : 'none';
      // Activating the 3D graph also activates the 3D buildings + terrain scene.
      if (options.enabled) {
        options.buildings = true;
        options.terrain = true;
        syncControlsFromOptions();
      }
      applyCamera();
      applyTerrain();
      update3D();
      notifyChange();
    });
  }

  bindSelect(IDS.variant, 'variant');
  bindSelect(IDS.value, 'valueKey');
  bindSelect(IDS.scheme, 'scheme');

  const height = document.getElementById(IDS.height);
  if (height) {
    height.value = String(options.maxHeightMeters);
    height.addEventListener('input', (e) => {
      options.maxHeightMeters = parseFloat(e.target.value) || 250;
      update3D();
      notifyChange();
    });
  }

  const buildings = document.getElementById(IDS.buildings);
  if (buildings) {
    buildings.checked = options.buildings;
    buildings.addEventListener('change', (e) => {
      options.buildings = e.target.checked;
      updateBuildingsVisibility();
      notifyChange();
    });
  }

  const terrain = document.getElementById(IDS.terrain);
  if (terrain) {
    terrain.checked = options.terrain;
    terrain.addEventListener('change', (e) => {
      options.terrain = e.target.checked;
      applyTerrain();
      notifyChange();
    });
  }
}

function bindSelect(id, key) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = options[key];
  el.addEventListener('change', (e) => {
    options[key] = e.target.value;
    update3D();
    notifyChange();
  });
}

function populateSelectors() {
  const valueSel = document.getElementById(IDS.value);
  if (valueSel && valueSel.options.length === 0) {
    Object.entries(PROFILE_VALUES).forEach(([key, def]) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = def.unit ? `${def.label} (${def.unit})` : def.label;
      valueSel.appendChild(opt);
    });
  }
  const schemeSel = document.getElementById(IDS.scheme);
  if (schemeSel && schemeSel.options.length === 0) {
    Object.entries(COLOR_SCHEMES).forEach(([key, def]) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = def.label;
      schemeSel.appendChild(opt);
    });
  }
}

// Tilt the camera into a 3D view when enabling, flatten it when disabling.
function applyCamera() {
  if (!mapRef) return;
  if (options.enabled) {
    if (mapRef.getPitch() < 30) mapRef.easeTo({ pitch: ENABLED_PITCH, duration: 600 });
  } else {
    mapRef.easeTo({ pitch: 0, duration: 600 });
  }
}

// 3D terrain mesh + atmospheric sky (gradients2osm style). Only removes terrain
// we ourselves added, so it doesn't clobber the separate map-settings terrain.
function applyTerrain() {
  if (!mapRef) return;
  const on = options.enabled && options.terrain;
  if (on) {
    if (mapRef.getSource(TERRAIN_SOURCE)) {
      mapRef.setTerrain({ source: TERRAIN_SOURCE, exaggeration: TERRAIN_EXAGGERATION });
    }
    if (typeof mapRef.setSky === 'function') mapRef.setSky(SKY_STYLE);
    terrainAppliedByUs = true;
  } else if (terrainAppliedByUs) {
    mapRef.setTerrain(null);
    if (typeof mapRef.setSky === 'function') mapRef.setSky(undefined);
    terrainAppliedByUs = false;
  }
}

function updateBuildingsVisibility() {
  if (!mapRef || !mapRef.getLayer(LAYER_BUILDINGS)) return;
  const vis = options.enabled && options.buildings ? 'visible' : 'none';
  mapRef.setLayoutProperty(LAYER_BUILDINGS, 'visibility', vis);
}

// Meters per pixel at the current zoom (for a baseline offset that reads ~constant).
function pixelsToMeters(px, coordinates) {
  if (!mapRef || !coordinates.length) return px;
  let latSum = 0;
  for (const c of coordinates) latSum += c[1];
  const lat = latSum / coordinates.length;
  const mPerPx = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, mapRef.getZoom());
  return px * mPerPx;
}

export function update3D() {
  if (!mapRef) return;
  const src = mapRef.getSource(SOURCE_COLS);
  if (!src) return;

  updateBuildingsVisibility();

  const data = routeState.currentRouteData;
  if (!options.enabled || !data || !Array.isArray(data.coordinates) || data.coordinates.length < 3) {
    src.setData(emptyFC());
    return;
  }

  const series = getProfileSeries(data, options.valueKey);
  if (!series.available || series.values.length === 0) {
    src.setData(emptyFC());
    return;
  }

  const valueAtFraction = makeValueAtFraction(data.coordinates, series.values);
  const valid = series.values.filter((v) => Number.isFinite(v));
  const minValue = valid.length ? Math.min(...valid) : 0;
  const maxValue = valid.length ? Math.max(...valid) : 1;

  const totalDistance = data.distance || 1;
  const barWidthMeters = Math.max(15, totalDistance / 200);

  // Which line do the columns stand on?
  let line = data.coordinates;
  if (options.variant === 'baseline') {
    const mode = options.valueKey === 'elevation' ? 'avg' : 'start';
    const segValues = toSegmentValues(series.values, mode);
    const baseline = buildProfileBars(data.coordinates, segValues, {
      side: 'east',
      maxBarLengthMeters: 1,
      barWidthMeters,
      smoothingMeters: barWidthMeters * 8,
      baseOffsetMeters: pixelsToMeters(70, data.coordinates),
      sampleStepMeters: Math.max(3, barWidthMeters / 4),
    }).baseline;
    if (baseline && baseline.geometry.coordinates.length > 1) line = baseline.geometry.coordinates;
  }

  const fc = buildColumns(line, valueAtFraction, {
    minValue,
    maxValue,
    barWidthMeters,
    footprintDepthMeters: barWidthMeters * 0.7,
    maxHeightMeters: options.maxHeightMeters,
    colorForT: (t) => colorForT(options.scheme, t),
  });
  src.setData(fc);
}

/** Clear columns + reset the camera/buildings (called when the route is cleared). */
export function clearRouteProfile3D() {
  if (!mapRef) return;
  const src = mapRef.getSource(SOURCE_COLS);
  if (src) src.setData(emptyFC());
  updateBuildingsVisibility();
}

// ---------------------------------------------------------------------------
// Shareable URL state — read on first render, serialize on change
// ---------------------------------------------------------------------------

// Reflect `options` into the DOM controls (safe anytime; no-ops on missing nodes).
function syncControlsFromOptions() {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  const setChecked = (id, v) => { const el = document.getElementById(id); if (el) el.checked = v; };
  setChecked(IDS.toggle, options.enabled);
  const controls = document.getElementById(IDS.controls);
  if (controls) controls.style.display = options.enabled ? 'block' : 'none';
  set(IDS.variant, options.variant);
  set(IDS.value, options.valueKey);
  set(IDS.scheme, options.scheme);
  set(IDS.height, String(options.maxHeightMeters));
  setChecked(IDS.buildings, options.buildings);
  setChecked(IDS.terrain, options.terrain);
}

/** URL params for the current 3D state — only when enabled, only non-defaults. */
export function serializeProfile3DParams() {
  if (!options.enabled) return [];
  const parts = ['p3d=1'];
  if (options.variant !== DEFAULTS.variant) parts.push(`p3dvar=${options.variant}`);
  if (options.valueKey !== DEFAULTS.valueKey) parts.push(`p3dval=${options.valueKey}`);
  if (options.scheme !== DEFAULTS.scheme) parts.push(`p3dcolor=${options.scheme}`);
  if (options.maxHeightMeters !== DEFAULTS.maxHeightMeters) parts.push(`p3dh=${options.maxHeightMeters}`);
  if (options.buildings !== DEFAULTS.buildings) parts.push(`p3dbld=${options.buildings ? 1 : 0}`);
  if (options.terrain !== DEFAULTS.terrain) parts.push(`p3dterr=${options.terrain ? 1 : 0}`);
  return parts;
}

/** Read 3D state from URLSearchParams (called once on first render by the permalink). */
export function applyProfile3DParams(params) {
  if (!params) return;
  options.enabled = params.get('p3d') === '1';
  const variant = params.get('p3dvar');
  if (variant === 'route' || variant === 'baseline') options.variant = variant;
  const val = params.get('p3dval');
  if (val && PROFILE_VALUES[val]) options.valueKey = val;
  const col = params.get('p3dcolor');
  if (col && COLOR_SCHEMES[col]) options.scheme = col;
  const h = parseFloat(params.get('p3dh'));
  if (Number.isFinite(h) && h > 0) options.maxHeightMeters = Math.min(800, Math.max(50, h));
  const bld = params.get('p3dbld');
  if (bld === '0') options.buildings = false;
  else if (bld === '1') options.buildings = true;
  const terr = params.get('p3dterr');
  if (terr === '1') options.terrain = true;
  else if (terr === '0') options.terrain = false;
  // Reflect + redraw if the map/controls are already up (otherwise setup does it).
  syncControlsFromOptions();
  update3D();
  if (options.enabled) {
    applyCamera();
    applyTerrain();
  }
}
