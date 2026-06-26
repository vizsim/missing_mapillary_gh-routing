// Route profile values — maps the app's route data to a numeric series.
//
// The geometry/color modules are generic; this module is the app-specific glue
// that turns `routeState.currentRouteData` into per-coordinate numbers. Add a
// new entry to PROFILE_VALUES to expose another metric as bars.
//
// `compute` returns one number (or null) per ROUTE COORDINATE. The caller
// converts that to per-segment values via toSegmentValues().

import { calculateDistance } from '../heightgraph/heightgraphUtils.js';

export const PROFILE_VALUES = {
  elevation: {
    label: 'Höhe',
    unit: 'm',
    available: (d) => Array.isArray(d.elevations) && d.elevations.some((e) => e != null),
    compute: (d) => (d.elevations || []).map((e) => (Number.isFinite(e) ? e : null)),
  },

  slope: {
    label: 'Steigung',
    unit: '%',
    available: (d) =>
      Array.isArray(d.elevations) &&
      d.elevations.some((e) => e != null) &&
      Array.isArray(d.coordinates) &&
      d.coordinates.length > 1,
    // |gradient| in percent for the segment starting at coordinate i.
    compute: (d) => {
      const el = d.elevations || [];
      const co = d.coordinates || [];
      const out = new Array(co.length).fill(null);
      for (let i = 0; i < co.length - 1; i++) {
        const a = el[i];
        const b = el[i + 1];
        if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
        const dist = calculateDistance(co[i], co[i + 1]) || 1;
        out[i] = Math.abs(((b - a) / dist) * 100);
      }
      // Last coordinate inherits the previous segment so the array stays aligned.
      out[co.length - 1] = out[co.length - 2] ?? null;
      return out;
    },
  },

  mapillary_missing: {
    label: 'Mapillary fehlt',
    unit: '',
    available: (d) => Array.isArray(d.encodedValues?.mapillary_coverage),
    // 1 where Mapillary coverage is missing, 0 where present — on-brand for
    // this app: tall/red bars mark the gaps in Street View coverage.
    compute: (d) =>
      (d.encodedValues.mapillary_coverage || []).map((v) => {
        if (v === null || v === undefined) return null;
        const present = v === true || v === 'true' || v === 'True' || v === 1;
        return present ? 0 : 1;
      }),
  },
};

/**
 * Convert a per-coordinate series into a per-segment series (length n - 1).
 * @param {Array<number|null>} perCoord
 * @param {'start'|'avg'} [mode='start'] - 'avg' smooths continuous data like
 *        elevation; 'start' keeps the segment's start value (good for discrete data)
 * @returns {Array<number|null>}
 */
export function toSegmentValues(perCoord, mode = 'start') {
  if (!perCoord || perCoord.length < 2) return [];
  const out = [];
  for (let i = 0; i < perCoord.length - 1; i++) {
    const a = perCoord[i];
    const b = perCoord[i + 1];
    if (mode === 'avg' && Number.isFinite(a) && Number.isFinite(b)) {
      out.push((a + b) / 2);
    } else {
      out.push(Number.isFinite(a) ? a : Number.isFinite(b) ? b : null);
    }
  }
  return out;
}

/**
 * Resolve a profile metric for the current route data.
 * @param {Object} routeData - routeState.currentRouteData
 * @param {string} valueKey - key of PROFILE_VALUES
 * @returns {{values: Array<number|null>, label: string, unit: string, available: boolean}}
 */
export function getProfileSeries(routeData, valueKey) {
  const def = PROFILE_VALUES[valueKey] || PROFILE_VALUES.elevation;
  if (!routeData || !def.available(routeData)) {
    return { values: [], label: def.label, unit: def.unit, available: false };
  }
  return { values: def.compute(routeData), label: def.label, unit: def.unit, available: true };
}
