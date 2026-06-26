// Route profile bars — on-map "perpendicular histogram" along the route.
//
// This is the ONLY module in routeProfile/ that touches MapLibre and the DOM.
// All geometry, color and value logic lives in the pure sibling modules, so a
// React port only needs to re-implement this thin integration layer (add a
// <Source>/<Layer>, wire React state to `options`, call updateRouteProfileBars).

import { routeState } from '../routeState.js';
import { buildProfileBars } from './profileGeometry.js';
import { COLOR_SCHEMES, colorForT, cssGradient } from './profileColorScales.js';
import { PROFILE_VALUES, getProfileSeries, toSegmentValues } from './profileValues.js';
import { setCursorIndex, onCursorChange, getCursorIndex } from '../routeCursor.js';

const SOURCE_BARS = 'route-profile-bars';
const LAYER_BARS_FILL = 'route-profile-bars-fill';
const LAYER_BARS_LINE = 'route-profile-bars-outline';
const SOURCE_BASELINE = 'route-profile-baseline';
const LAYER_BASELINE = 'route-profile-baseline-line';

const IDS = {
  toggle: 'profile-bars-toggle',
  value: 'profile-bars-value',
  scheme: 'profile-bars-scheme',
  side: 'profile-bars-side',
  height: 'profile-bars-height',
  controls: 'profile-bars-controls',
  legend: 'profile-bars-legend',
};

// The interactive knobs. In a React port this becomes component state.
const options = {
  enabled: false,
  valueKey: 'elevation',
  scheme: 'danger',
  side: 'east', // 'east' | 'west' (resolved to the route's east/west travel side)
  heightFactor: 0.05, // bar length at t=1 = heightFactor * total route distance
};

// Defaults used to keep shared URLs short (only non-defaults are serialized).
const DEFAULTS = { valueKey: 'elevation', scheme: 'danger', side: 'east', heightFactor: 0.05 };

// Notify listeners (e.g. the permalink) that a user-facing option changed, so the
// shareable URL can be updated. Decoupled via a DOM event — no import cycle.
function notifyChange() {
  document.dispatchEvent(new Event('profilebars:change'));
}

// Screen-space gap between the route line and the baseline the bars sit on.
const BASELINE_OFFSET_PX = 40;

let mapRef = null;
let hoverPopup = null;
let controlsWired = false;
let hoverWired = false;
let zoomWired = false;
let lastBuiltZoom = null;

// Shared-cursor handle state.
let handleMarker = null;
let handleSubscribed = false;
// Geometry needed to map a route index <-> a point on the smooth baseline.
let cursorGeom = null; // { baselineCoords, step, routeCum }

function emptyFC() {
  return { type: 'FeatureCollection', features: [] };
}

// Convert a screen-pixel distance to meters at the current map zoom, using the
// route's mean latitude (Web Mercator ground resolution).
function pixelsToMeters(px, coordinates) {
  if (!mapRef || !coordinates || !coordinates.length) return px;
  let latSum = 0;
  for (const c of coordinates) latSum += c[1];
  const lat = latSum / coordinates.length;
  const mPerPx = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, mapRef.getZoom());
  return px * mPerPx;
}

// Resolve a compass preference ('east'/'west') to a travel-relative side
// ('right'/'left') for the geometry. The right-hand normal points net-east when
// the route's overall heading is northward, so the route's net N/S displacement
// decides which travel side is the east one. Passes 'right'/'left' through.
function resolveSide(pref, coordinates) {
  if (pref !== 'east' && pref !== 'west') return pref === 'left' ? 'left' : 'right';
  const netNorth = coordinates[coordinates.length - 1][1] - coordinates[0][1];
  const eastIsRight = netNorth >= 0;
  if (pref === 'west') return eastIsRight ? 'left' : 'right';
  return eastIsRight ? 'right' : 'left';
}

/**
 * Idempotent setup: ensures the source + layers exist and the controls/hover are
 * wired. Safe to call again after a basemap/style change (which is exactly why
 * it lives inside setupRouting): it re-adds the source/layers and repopulates.
 */
export function setupRouteProfileBars(map) {
  mapRef = map;
  ensureLayers(map);

  if (!controlsWired) {
    setupControls();
    controlsWired = true;
  }
  if (!hoverWired) {
    setupHover(map);
    hoverWired = true;
  }
  if (!zoomWired) {
    // Keep the baseline gap at ~40 px by rebuilding when the zoom changes.
    map.on('moveend', () => {
      if (!options.enabled) return;
      const z = map.getZoom();
      if (lastBuiltZoom == null || Math.abs(z - lastBuiltZoom) > 0.05) {
        updateRouteProfileBars();
      }
    });
    zoomWired = true;
  }

  // Repopulate (e.g. after a style change while a route is still active).
  updateRouteProfileBars();
}

function ensureLayers(map) {
  if (!map.getSource(SOURCE_BARS)) {
    map.addSource(SOURCE_BARS, { type: 'geojson', data: emptyFC() });
  }
  if (!map.getSource(SOURCE_BASELINE)) {
    map.addSource(SOURCE_BASELINE, { type: 'geojson', data: emptyFC() });
  }
  // Keep the bars beneath the route line so the route stays readable on top.
  const beforeId = map.getLayer('route-layer') ? 'route-layer' : undefined;

  if (!map.getLayer(LAYER_BARS_FILL)) {
    map.addLayer(
      {
        id: LAYER_BARS_FILL,
        type: 'fill',
        source: SOURCE_BARS,
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.75 },
      },
      beforeId
    );
  }
  if (!map.getLayer(LAYER_BARS_LINE)) {
    map.addLayer(
      {
        id: LAYER_BARS_LINE,
        type: 'line',
        source: SOURCE_BARS,
        paint: { 'line-color': ['get', 'color'], 'line-width': 0.5, 'line-opacity': 0.9 },
      },
      beforeId
    );
  }
  // The abstracted baseline ("curved X-axis") the bars stand on.
  if (!map.getLayer(LAYER_BASELINE)) {
    map.addLayer(
      {
        id: LAYER_BASELINE,
        type: 'line',
        source: SOURCE_BASELINE,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#64748b', 'line-width': 1.2, 'line-opacity': 0.85 },
      },
      beforeId
    );
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
      updateRouteProfileBars();
      notifyChange();
    });
  }

  bindSelect(IDS.value, 'valueKey');
  bindSelect(IDS.scheme, 'scheme');
  bindSelect(IDS.side, 'side');

  const height = document.getElementById(IDS.height);
  if (height) {
    height.value = String(options.heightFactor);
    height.addEventListener('input', (e) => {
      options.heightFactor = parseFloat(e.target.value) || 0.05;
      updateRouteProfileBars();
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
    updateRouteProfileBars();
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

/**
 * Recompute and render the bars from the current route. No-op (clears) when the
 * feature is disabled or there is no route. Called on route change and whenever
 * a control changes.
 */
export function updateRouteProfileBars() {
  if (!mapRef) return;
  const barsSrc = mapRef.getSource(SOURCE_BARS);
  const baselineSrc = mapRef.getSource(SOURCE_BASELINE);
  if (!barsSrc || !baselineSrc) return;

  const data = routeState.currentRouteData;
  if (!options.enabled || !data || !Array.isArray(data.coordinates) || data.coordinates.length < 3) {
    barsSrc.setData(emptyFC());
    baselineSrc.setData(emptyFC());
    renderLegend(null);
    removeHandle();
    return;
  }

  const series = getProfileSeries(data, options.valueKey);
  if (!series.available || series.values.length === 0) {
    barsSrc.setData(emptyFC());
    baselineSrc.setData(emptyFC());
    renderLegend({ unavailable: true, label: series.label });
    removeHandle();
    return;
  }

  // Elevation is continuous → average; discrete metrics keep the start value.
  const mode = options.valueKey === 'elevation' ? 'avg' : 'start';
  const segValues = toSegmentValues(series.values, mode);

  // Geometry scale derived from the route length so the chart reads well at the
  // whole-route view: ~90 uniform bars, baseline smoothed over ~3 bar widths.
  const totalDistance = data.distance || 1;
  const maxBarLengthMeters = Math.max(20, totalDistance * options.heightFactor);
  const barWidthMeters = Math.max(8, totalDistance / 90);

  // Offset the baseline a fixed ~40 px off the route at the current zoom (the
  // bars are geographic, so we convert px -> meters here and rebuild on zoom).
  const baseOffsetMeters = pixelsToMeters(BASELINE_OFFSET_PX, data.coordinates);

  const result = buildProfileBars(data.coordinates, segValues, {
    side: resolveSide(options.side, data.coordinates),
    maxBarLengthMeters,
    barWidthMeters,
    smoothingMeters: barWidthMeters * 6, // stronger smoothing -> cleaner baseline
    baseOffsetMeters,
    sampleStepMeters: Math.max(3, barWidthMeters / 4),
    colorForT: (t) => colorForT(options.scheme, t),
  });
  lastBuiltZoom = mapRef.getZoom();

  barsSrc.setData(result.bars);
  baselineSrc.setData(result.baseline);
  renderLegend({ minValue: result.domain.min, maxValue: result.domain.max, label: series.label, unit: series.unit });

  // Keep the draggable handle in sync with the (possibly new) baseline geometry.
  cursorGeom = {
    baselineCoords: result.baseline.geometry.coordinates,
    step: result.step,
    routeCum: result.routeCum,
  };
  ensureHandleSubscription();
  if (getCursorIndex() == null) {
    // Show the handle at the route midpoint so it is there to grab.
    setCursorIndex(Math.floor((data.coordinates.length - 1) / 2));
  } else {
    positionHandle(getCursorIndex());
  }
}

function formatValue(n) {
  if (!Number.isFinite(n)) return '–';
  return Math.abs(n) >= 100 ? String(Math.round(n)) : String(Math.round(n * 10) / 10);
}

function renderLegend(info) {
  const el = document.getElementById(IDS.legend);
  if (!el) return;

  if (!info) {
    el.innerHTML = '';
    el.style.display = 'none';
    return;
  }
  el.style.display = 'block';

  if (info.unavailable) {
    el.innerHTML = `<div class="profile-bars-legend-empty">Keine ${info.label}-Daten für diese Route.</div>`;
    return;
  }

  const unitSuffix = info.unit ? ` (${info.unit})` : '';
  el.innerHTML = `
    <div class="profile-bars-legend-row">
      <span class="profile-bars-legend-label">${info.label}${unitSuffix}</span>
    </div>
    <div class="profile-bars-legend-gradient" style="background:${cssGradient(options.scheme)}"></div>
    <div class="profile-bars-legend-row profile-bars-legend-scale">
      <span>${formatValue(info.minValue)}</span>
      <span>${formatValue(info.maxValue)}</span>
    </div>`;
}

// ---------------------------------------------------------------------------
// Draggable cursor handle on the barchart baseline
// ---------------------------------------------------------------------------

function ensureHandleSubscription() {
  if (handleSubscribed) return;
  onCursorChange((index) => positionHandle(index));
  handleSubscribed = true;
}

// Point on the smooth baseline for a given route-coordinate index.
function baselinePointForIndex(index) {
  if (!cursorGeom || index == null) return null;
  const { baselineCoords, step, routeCum } = cursorGeom;
  if (!baselineCoords.length || !routeCum.length || !step) return null;
  const i = Math.max(0, Math.min(routeCum.length - 1, index));
  const p = Math.max(0, Math.min(baselineCoords.length - 1, routeCum[i] / step));
  const i0 = Math.floor(p);
  const i1 = Math.min(baselineCoords.length - 1, i0 + 1);
  const f = p - i0;
  const a = baselineCoords[i0];
  const b = baselineCoords[i1];
  return [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1])];
}

// Nearest route-coordinate index for an arbitrary map point, by snapping to the
// baseline first — used while dragging the handle.
function nearestRouteIndexFromLngLat(pt) {
  if (!cursorGeom) return null;
  const { baselineCoords, step, routeCum } = cursorGeom;
  if (!baselineCoords.length || !routeCum.length) return null;
  let bestK = 0;
  let bestD = Infinity;
  for (let k = 0; k < baselineCoords.length; k++) {
    const dx = baselineCoords[k][0] - pt[0];
    const dy = baselineCoords[k][1] - pt[1];
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      bestK = k;
    }
  }
  const s = bestK * step;
  let lo = 0;
  let hi = routeCum.length - 1;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (routeCum[m] < s) lo = m + 1;
    else hi = m;
  }
  if (lo > 0 && Math.abs(routeCum[lo - 1] - s) <= Math.abs(routeCum[lo] - s)) return lo - 1;
  return lo;
}

function ensureHandle() {
  if (!mapRef || handleMarker) return;
  const el = document.createElement('div');
  el.className = 'profile-bars-handle';
  handleMarker = new maplibregl.Marker({ element: el, draggable: true, anchor: 'center' });
  handleMarker.on('drag', () => {
    const ll = handleMarker.getLngLat();
    const idx = nearestRouteIndexFromLngLat([ll.lng, ll.lat]);
    if (idx != null) setCursorIndex(idx); // snaps the handle back onto the baseline
  });
}

function positionHandle(index) {
  if (!options.enabled) {
    removeHandle();
    return;
  }
  const pt = baselinePointForIndex(index);
  if (!pt) {
    removeHandle();
    return;
  }
  ensureHandle();
  handleMarker.setLngLat(pt);
  if (!handleMarker._map && mapRef) handleMarker.addTo(mapRef);
}

function removeHandle() {
  if (handleMarker) handleMarker.remove();
}

function setupHover(map) {
  hoverPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });

  map.on('mousemove', LAYER_BARS_FILL, (e) => {
    if (!options.enabled || !e.features || e.features.length === 0) return;
    map.getCanvas().style.cursor = 'pointer';

    const f = e.features[0];
    const def = PROFILE_VALUES[options.valueKey];
    const unit = def && def.unit ? ` ${def.unit}` : '';
    const label = def ? def.label : '';
    hoverPopup
      .setLngLat(e.lngLat)
      .setHTML(
        `<div style="font-size:12px;line-height:1.4"><strong>${label}:</strong> ${formatValue(f.properties.value)}${unit}</div>`
      )
      .addTo(map);

    // Move the shared cursor to this bar's position on the route.
    if (f.properties.routeIndex != null) setCursorIndex(f.properties.routeIndex);
  });

  map.on('mouseleave', LAYER_BARS_FILL, () => {
    map.getCanvas().style.cursor = '';
    if (hoverPopup) hoverPopup.remove();
  });
}

/** Clear bars, baseline, handle and legend (called when the route is cleared). */
export function clearRouteProfileBars() {
  if (!mapRef) return;
  const barsSrc = mapRef.getSource(SOURCE_BARS);
  const baselineSrc = mapRef.getSource(SOURCE_BASELINE);
  if (barsSrc) barsSrc.setData(emptyFC());
  if (baselineSrc) baselineSrc.setData(emptyFC());
  renderLegend(null);
  if (hoverPopup) hoverPopup.remove();
  removeHandle();
  cursorGeom = null;
}

// ---------------------------------------------------------------------------
// Shareable URL state — read on first render, serialize on change
// ---------------------------------------------------------------------------

// Reflect `options` into the DOM controls (safe anytime; no-ops on missing nodes).
function syncControlsFromOptions() {
  const toggle = document.getElementById(IDS.toggle);
  const controls = document.getElementById(IDS.controls);
  if (toggle) toggle.checked = options.enabled;
  if (controls) controls.style.display = options.enabled ? 'block' : 'none';
  const val = document.getElementById(IDS.value);
  if (val) val.value = options.valueKey;
  const scheme = document.getElementById(IDS.scheme);
  if (scheme) scheme.value = options.scheme;
  const side = document.getElementById(IDS.side);
  if (side) side.value = options.side;
  const height = document.getElementById(IDS.height);
  if (height) height.value = String(options.heightFactor);
}

/**
 * URL params for the current state — only when enabled, and only the values that
 * differ from the defaults, so shared links stay short. Returns `key=value`[].
 */
export function serializeProfileBarsParams() {
  if (!options.enabled) return [];
  const parts = ['pbars=1'];
  if (options.valueKey !== DEFAULTS.valueKey) parts.push(`pbval=${options.valueKey}`);
  if (options.scheme !== DEFAULTS.scheme) parts.push(`pbcolor=${options.scheme}`);
  if (options.side !== DEFAULTS.side) parts.push(`pbside=${options.side}`);
  if (Math.abs(options.heightFactor - DEFAULTS.heightFactor) > 1e-9) {
    parts.push(`pbh=${options.heightFactor}`);
  }
  return parts;
}

/** Read state from URLSearchParams (called once on first render by the permalink). */
export function applyProfileBarsParams(params) {
  if (!params) return;
  options.enabled = params.get('pbars') === '1';
  const val = params.get('pbval');
  if (val && PROFILE_VALUES[val]) options.valueKey = val;
  const col = params.get('pbcolor');
  if (col && COLOR_SCHEMES[col]) options.scheme = col;
  const side = params.get('pbside');
  if (side === 'east' || side === 'west' || side === 'left' || side === 'right') options.side = side;
  const h = parseFloat(params.get('pbh'));
  if (Number.isFinite(h) && h > 0) options.heightFactor = Math.min(0.15, Math.max(0.01, h));
  // Reflect + redraw if the map/controls are already up (otherwise setup does it).
  syncControlsFromOptions();
  updateRouteProfileBars();
}
