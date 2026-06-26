// 3D route profile columns — pure, framework-agnostic.
//
// Turns a route value series into footprint polygons carrying a `height` (meters)
// property, ready to render with a native MapLibre `fill-extrusion` layer: each
// column is a small rectangle along a line, extruded vertically by its value.
// Viewed with the camera pitched, the columns read as a 3D bar chart.
//
// No MapLibre / DOM dependency → portable to a React port.

const M_PER_DEG_LAT = 111320;

function makeProjector(coordinates) {
  let latSum = 0;
  for (const c of coordinates) latSum += c[1];
  const lat0 = latSum / coordinates.length;
  const lng0 = coordinates[0][0];
  const mLng = 111320 * Math.cos((lat0 * Math.PI) / 180) || 1;
  return {
    toXY: ([lng, lat]) => [(lng - lng0) * mLng, (lat - lat0) * M_PER_DEG_LAT],
    toLngLat: ([x, y]) => [lng0 + x / mLng, lat0 + y / M_PER_DEG_LAT],
  };
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
function unit(v) {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
}

function cumulative(xy) {
  const cum = [0];
  for (let i = 1; i < xy.length; i++) cum.push(cum[i - 1] + Math.hypot(xy[i][0] - xy[i - 1][0], xy[i][1] - xy[i - 1][1]));
  return cum;
}

/**
 * Build 3D column footprints along a polyline.
 *
 * @param {Array<[number, number]>} polyline - line the columns stand on ([lng,lat])
 * @param {(fraction: number) => (number|null)} valueAtFraction - value at a
 *        normalized position (0..1) along the route (kept separate so the same
 *        route values drive columns whether the line is the route or a baseline)
 * @param {Object} opts
 * @param {number} opts.minValue / opts.maxValue - value domain for height/color
 * @param {number} [opts.barWidthMeters] - spacing/length of columns along the line
 * @param {number} [opts.footprintDepthMeters] - column depth across the line
 * @param {number} [opts.maxHeightMeters=250] - column height (meters) at value = max
 * @param {(t:number, value:number)=>string} [opts.colorForT] - color per value
 * @returns {{type:'FeatureCollection', features:Array}} fill-extrusion polygons
 */
export function buildColumns(polyline, valueAtFraction, opts = {}) {
  const features = [];
  if (!polyline || polyline.length < 2 || typeof valueAtFraction !== 'function') {
    return { type: 'FeatureCollection', features };
  }

  const proj = makeProjector(polyline);
  const xy = polyline.map(proj.toXY);
  const cum = cumulative(xy);
  const D = cum[cum.length - 1];
  if (D < 1) return { type: 'FeatureCollection', features };

  const barWidth = opts.barWidthMeters > 0 ? opts.barWidthMeters : Math.max(20, D / 120);
  const depth = opts.footprintDepthMeters > 0 ? opts.footprintDepthMeters : barWidth * 0.7;
  const maxH = opts.maxHeightMeters > 0 ? opts.maxHeightMeters : 250;
  const minV = opts.minValue;
  const maxV = opts.maxValue;
  const range = maxV - minV || 1;
  const colorFn = typeof opts.colorForT === 'function' ? opts.colorForT : null;
  const gap = 0.82;

  // Point + unit tangent at arc-length s along the (projected) polyline.
  const at = (s) => {
    if (s <= 0) return { p: xy[0], t: unit(sub(xy[1], xy[0])) };
    if (s >= D) return { p: xy[xy.length - 1], t: unit(sub(xy[xy.length - 1], xy[xy.length - 2])) };
    let lo = 0;
    let hi = xy.length - 1;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (cum[m] < s) lo = m + 1;
      else hi = m;
    }
    const i1 = lo;
    const i0 = Math.max(0, lo - 1);
    const seg = cum[i1] - cum[i0] || 1;
    const f = (s - cum[i0]) / seg;
    return {
      p: [xy[i0][0] + f * (xy[i1][0] - xy[i0][0]), xy[i0][1] + f * (xy[i1][1] - xy[i0][1])],
      t: unit(sub(xy[i1], xy[i0])),
    };
  };

  const numCols = Math.max(1, Math.floor(D / barWidth));
  const barW = D / numCols;

  for (let j = 0; j < numCols; j++) {
    const sMid = (j + 0.5) * barW;
    const value = valueAtFraction(sMid / D);
    if (value == null || !Number.isFinite(value)) continue;

    const t = Math.max(0, Math.min(1, (value - minV) / range));
    const height = t * maxH;
    if (height <= 0) continue;

    const { p, t: tan } = at(sMid);
    const nor = [tan[1], -tan[0]];
    const hw = (barWidth * gap) / 2;
    const hd = depth / 2;

    const c1 = [p[0] + tan[0] * hw + nor[0] * hd, p[1] + tan[1] * hw + nor[1] * hd];
    const c2 = [p[0] + tan[0] * hw - nor[0] * hd, p[1] + tan[1] * hw - nor[1] * hd];
    const c3 = [p[0] - tan[0] * hw - nor[0] * hd, p[1] - tan[1] * hw - nor[1] * hd];
    const c4 = [p[0] - tan[0] * hw + nor[0] * hd, p[1] - tan[1] * hw + nor[1] * hd];
    const ring = [c1, c2, c3, c4, c1].map(proj.toLngLat);

    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [ring] },
      properties: {
        index: j,
        value,
        t,
        height: Math.round(height * 10) / 10,
        color: colorFn ? colorFn(t, value) : '#7c3aed',
      },
    });
  }

  return { type: 'FeatureCollection', features };
}

/**
 * Build a `valueAtFraction(f)` sampler from a route and its per-coordinate values
 * (piecewise-constant by arc-length). f is normalized progress along the route.
 * @param {Array<[number, number]>} coordinates
 * @param {Array<number|null>} perCoordValues
 * @returns {(f:number)=>(number|null)}
 */
export function makeValueAtFraction(coordinates, perCoordValues) {
  if (!coordinates || coordinates.length < 2) return () => null;
  const proj = makeProjector(coordinates);
  const cum = cumulative(coordinates.map(proj.toXY));
  const L = cum[cum.length - 1] || 1;
  return (f) => {
    const s = Math.max(0, Math.min(1, f)) * L;
    let lo = 0;
    let hi = cum.length - 1;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (cum[m] < s) lo = m + 1;
      else hi = m;
    }
    const idx = Math.max(0, lo - 1);
    const v = perCoordValues[idx];
    return v == null || !Number.isFinite(v) ? null : v;
  };
}
