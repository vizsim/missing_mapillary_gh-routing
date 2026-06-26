// Route profile geometry — pure, framework-agnostic.
//
// Builds a "perpendicular histogram" beside a route. The wiggly route is NOT
// used directly as the bar baseline — instead a smoothed, offset version of it
// is derived (the "vereinfachte Basislinie als gekrümmte X-Achse" from the
// brief). Bars are resampled to a uniform width and stand perpendicular to that
// smooth baseline, so the chart stays clean even where the route kinks.
//
// No MapLibre / DOM dependency, so this can be reused unchanged in a React port.

const M_PER_DEG_LAT = 111320;

// Local equirectangular projection to meters around the route. Distortion is
// negligible for a regional route and lets us do all vector math in a flat,
// metric frame, converting back to lng/lat only at the end.
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

const dist2 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

// Cumulative arc-length along an xy polyline.
function cumulative(xy) {
  const cum = [0];
  for (let i = 1; i < xy.length; i++) cum.push(cum[i - 1] + dist2(xy[i - 1], xy[i]));
  return cum;
}

// Resample an xy polyline to points spaced `step` meters apart. out[k] sits at
// arc-length k * step, so the index is a direct arc-length parametrization.
function resample(xy, cum, step) {
  const total = cum[cum.length - 1];
  const out = [];
  let seg = 0;
  for (let s = 0; s <= total; s += step) {
    while (seg < xy.length - 2 && cum[seg + 1] < s) seg++;
    const segLen = cum[seg + 1] - cum[seg] || 1;
    const f = (s - cum[seg]) / segLen;
    out.push([
      xy[seg][0] + f * (xy[seg + 1][0] - xy[seg][0]),
      xy[seg][1] + f * (xy[seg + 1][1] - xy[seg][1]),
    ]);
  }
  return out;
}

// Endpoint-preserving Laplacian smoothing: each interior point relaxes toward the
// midpoint of its neighbours. Unlike a wide moving average it does NOT collapse the
// curve to its centroid — it converges toward the straight chord between the fixed
// endpoints, which is exactly the "more straight than curvy" baseline we want.
function laplacianSmooth(points, iters, lambda = 0.5) {
  const n = points.length;
  let cur = points.map((p) => [p[0], p[1]]);
  if (n < 3 || iters < 1) return cur;
  let next = points.map((p) => [p[0], p[1]]);
  for (let it = 0; it < iters; it++) {
    for (let i = 1; i < n - 1; i++) {
      next[i][0] = cur[i][0] + lambda * ((cur[i - 1][0] + cur[i + 1][0]) / 2 - cur[i][0]);
      next[i][1] = cur[i][1] + lambda * ((cur[i - 1][1] + cur[i + 1][1]) / 2 - cur[i][1]);
    }
    const tmp = cur;
    cur = next;
    next = tmp;
  }
  return cur;
}

// Does an (open) polyline cross itself? O(n^2) over non-adjacent segment pairs.
function ccw(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}
function segmentsIntersect(p1, p2, p3, p4) {
  const d1 = ccw(p3, p4, p1);
  const d2 = ccw(p3, p4, p2);
  const d3 = ccw(p1, p2, p3);
  const d4 = ccw(p1, p2, p4);
  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
}
function polylineSelfIntersects(P) {
  const n = P.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 2; j < n - 1; j++) {
      if (segmentsIntersect(P[i], P[i + 1], P[j], P[j + 1])) return true;
    }
  }
  return false;
}

// Unit tangents via central difference.
function tangents(points) {
  const n = points.length;
  const T = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    T[i] = [dx / len, dy / len];
  }
  return T;
}

const lineFeature = (xyPts, proj) => ({
  type: 'Feature',
  geometry: { type: 'LineString', coordinates: xyPts.map(proj.toLngLat) },
  properties: {},
});

function emptyResult() {
  return {
    bars: { type: 'FeatureCollection', features: [] },
    baseline: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} },
    domain: { min: 0, max: 1 },
    step: 1,
    routeCum: [],
  };
}

// Index of the route coordinate whose cumulative arc-length is closest to `s`
// (cum is sorted ascending). Binary search.
function nearestIndexByArcLength(cum, s) {
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < s) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(cum[lo - 1] - s) <= Math.abs(cum[lo] - s)) return lo - 1;
  return lo;
}

/**
 * Build the smooth-baseline histogram for a route.
 *
 * @param {Array<[number, number]>} coordinates - route as [lng, lat] points
 * @param {Array<number|null>} segmentValues - one value per route segment
 *        (length coordinates.length - 1)
 * @param {Object} [opts]
 * @param {'left'|'right'} [opts.side='right'] - side the baseline + bars sit on
 * @param {number} [opts.maxBarLengthMeters=300] - bar length at t = 1
 * @param {number} [opts.barWidthMeters] - width of each resampled bar (default L/90)
 * @param {number} [opts.smoothingMeters] - baseline smoothing window (default 3 × bar width)
 * @param {number} [opts.baseOffsetMeters] - gap between route and baseline (default 8% of max bar)
 * @param {number} [opts.sampleStepMeters] - baseline resampling resolution (default bar width / 4)
 * @param {number} [opts.minValue] / [opts.maxValue] - value domain (default: resampled data range)
 * @param {(t: number, value: number) => string} [opts.colorForT] - color per normalized value
 * @returns {{bars: Object, baseline: Object, domain: {min:number, max:number}}}
 *          GeoJSON bars (Polygons), the baseline (LineString), and the value domain used.
 */
export function buildProfileBars(coordinates, segmentValues, opts = {}) {
  if (!coordinates || coordinates.length < 3 || !segmentValues || segmentValues.length < 2) {
    return emptyResult();
  }

  const side = opts.side === 'left' ? 'left' : 'right';
  const maxLen = opts.maxBarLengthMeters > 0 ? opts.maxBarLengthMeters : 300;

  const proj = makeProjector(coordinates);
  const xy = coordinates.map(proj.toXY);
  const cumOrig = cumulative(xy);
  const L = cumOrig[cumOrig.length - 1];
  if (L < 1) return emptyResult();

  const barWidth = opts.barWidthMeters > 0 ? opts.barWidthMeters : Math.max(5, L / 90);
  const step = opts.sampleStepMeters > 0 ? opts.sampleStepMeters : Math.max(2, barWidth / 4);
  const smoothMeters = opts.smoothingMeters != null ? opts.smoothingMeters : barWidth * 3;
  const offset = opts.baseOffsetMeters != null ? opts.baseOffsetMeters : maxLen * 0.08;

  // 1. Clean, mostly-straight baseline (the abstracted "curved X-axis").
  // Smooth the centerline and offset it; then keep increasing the smoothing window
  // until even the bar tips form a *simple* (non-self-intersecting) line. Offset
  // curves fold on the inside of bends sharper than the offset distance, so
  // straightening those bends until the fold disappears guarantees a clean line
  // with no overlapping bars — leaning straight rather than curvy, as desired.
  const R = resample(xy, cumOrig, step); // R[k] at arc-length k*step
  if (R.length < 3) return emptyResult();
  const K = R.length;
  const reach = offset + maxLen; // farthest a bar tip can sit from the centerline
  // Laplacian iterations needed to smooth over `smoothMeters` (~ (scale/spacing)^2).
  const baseIters = Math.max(2, Math.round((smoothMeters / step) ** 2));
  const maxIters = Math.max(baseIters, 6000);
  let S;
  let T;
  let N;
  let iters = baseIters;
  for (let attempt = 0; attempt < 14; attempt++) {
    S = laplacianSmooth(R, iters);
    T = tangents(S);
    N = T.map(([dx, dy]) => (side === 'left' ? [-dy, dx] : [dy, -dx]));
    const outer = S.map((p, k) => [p[0] + N[k][0] * reach, p[1] + N[k][1] * reach]);
    if (!polylineSelfIntersects(outer) || iters >= maxIters) break;
    iters = Math.min(maxIters, iters * 2);
  }
  const B = S.map((p, k) => [p[0] + N[k][0] * offset, p[1] + N[k][1] * offset]);
  const baselineCum = cumulative(B);
  const D = baselineCum[K - 1] || 1; // baseline length

  // 2. Value at each resample point (piecewise-constant from the route segments).
  const gv = new Array(K).fill(null);
  let seg = 0;
  for (let k = 0; k < K; k++) {
    const s = k * step;
    while (seg < segmentValues.length - 1 && cumOrig[seg + 1] <= s) seg++;
    const v = segmentValues[seg];
    gv[k] = v === null || v === undefined || !Number.isFinite(v) ? null : v;
  }

  // Interpolated baseline point at a fractional sample index; nearest tan/normal.
  const at = (arr, idx) => {
    const i0 = Math.max(0, Math.min(arr.length - 1, Math.floor(idx)));
    const i1 = Math.min(arr.length - 1, i0 + 1);
    const f = idx - i0;
    return [arr[i0][0] + f * (arr[i1][0] - arr[i0][0]), arr[i0][1] + f * (arr[i1][1] - arr[i0][1])];
  };
  const nearest = (arr, idx) => arr[Math.max(0, Math.min(arr.length - 1, Math.round(idx)))];

  // Fractional resample index at a given baseline arc-length (so we can place
  // things by distance ALONG the baseline rather than by route arc-length).
  const fracIndexAtArc = (s) => {
    if (s <= 0) return 0;
    if (s >= D) return K - 1;
    let lo = 0;
    let hi = K - 1;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (baselineCum[m] < s) lo = m + 1;
      else hi = m;
    }
    const i0 = Math.max(0, lo - 1);
    const segLen = baselineCum[lo] - baselineCum[i0] || 1;
    return i0 + (s - baselineCum[i0]) / segLen;
  };

  // 3. Bars are spaced evenly along the BASELINE (not the route), so a straighter
  // baseline never crowds or overlaps them. Each bar averages the route value over
  // the route span that maps to its slice of the baseline.
  const numBars = Math.max(1, Math.floor(D / barWidth));
  const barW = D / numBars;
  const fracMid = new Array(numBars);
  const raw = new Array(numBars).fill(null);
  for (let j = 0; j < numBars; j++) {
    const kLo = Math.round(fracIndexAtArc(j * barW));
    const kHi = Math.round(fracIndexAtArc((j + 1) * barW));
    fracMid[j] = fracIndexAtArc((j + 0.5) * barW);
    let sum = 0;
    let c = 0;
    for (let k = kLo; k <= kHi && k < K; k++) {
      if (gv[k] != null) {
        sum += gv[k];
        c++;
      }
    }
    raw[j] = c > 0 ? sum / c : null;
  }

  const validRaw = raw.filter((v) => v != null);
  if (!validRaw.length) {
    return { ...emptyResult(), baseline: lineFeature(B, proj), step, routeCum: cumOrig };
  }
  const minV = opts.minValue != null ? opts.minValue : Math.min(...validRaw);
  const maxV = opts.maxValue != null ? opts.maxValue : Math.max(...validRaw);
  const range = maxV - minV || 1;
  const colorFn = typeof opts.colorForT === 'function' ? opts.colorForT : null;
  const gap = 0.94; // small gaps between bars for a crisp histogram

  // 4. Build uniform bar rectangles standing on the smooth baseline.
  const features = [];
  for (let j = 0; j < numBars; j++) {
    const v = raw[j];
    if (v == null) continue;
    const t = Math.max(0, Math.min(1, (v - minV) / range));
    const len = t * maxLen;
    if (len <= 0) continue;

    const idx = fracMid[j];
    const P = at(B, idx);
    const tan = nearest(T, idx);
    const nor = nearest(N, idx);
    const hw = (barW * gap) / 2;

    const b1 = [P[0] - tan[0] * hw, P[1] - tan[1] * hw];
    const b2 = [P[0] + tan[0] * hw, P[1] + tan[1] * hw];
    const t2 = [b2[0] + nor[0] * len, b2[1] + nor[1] * len];
    const t1 = [b1[0] + nor[0] * len, b1[1] + nor[1] * len];
    const ring = [b1, b2, t2, t1, b1].map(proj.toLngLat);

    // Route-coordinate index at this bar's center (resample index idx -> route
    // arc-length idx*step) — lets the shared cursor map a hovered bar to the route.
    const routeIndex = nearestIndexByArcLength(cumOrig, idx * step);

    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [ring] },
      properties: { index: j, routeIndex, value: v, t, color: colorFn ? colorFn(t, v) : '#7c3aed' },
    });
  }

  return {
    bars: { type: 'FeatureCollection', features },
    baseline: lineFeature(B, proj),
    domain: { min: minV, max: maxV },
    step, // baseline sample spacing in meters (B[k] is at route arc-length k*step)
    routeCum: cumOrig, // route arc-length per original coordinate
  };
}
