// Route profile color scales — pure, framework-agnostic.
//
// A color scale maps a normalized value t∈[0,1] to a color. This is the
// "Man muss festlegen können, wie sich die Farben ändern" requirement: the user
// picks a scheme, and high/low values map to colors accordingly (e.g. a danger
// index makes high values red).

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToCss([r, g, b]) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

// Each scheme is an ordered list of [stop, hexColor] with stops in [0, 1].
export const COLOR_SCHEMES = {
  danger: {
    label: 'Gefahr (Grün → Gelb → Rot)',
    stops: [[0, '#22c55e'], [0.5, '#eab308'], [1, '#dc2626']],
  },
  bluered: {
    label: 'Sequenziell (Blau → Rot)',
    stops: [[0, '#3b82f6'], [0.5, '#a855f7'], [1, '#ef4444']],
  },
  viridis: {
    label: 'Viridis',
    stops: [
      [0, '#440154'], [0.25, '#3b528b'], [0.5, '#21918c'],
      [0.75, '#5ec962'], [1, '#fde725'],
    ],
  },
  cool: {
    label: 'Kühl (Hell → Blau)',
    stops: [[0, '#e0f2fe'], [1, '#1d4ed8']],
  },
  mono: {
    label: 'Einfarbig (Violett)',
    stops: [[0, '#ddd6fe'], [1, '#6d28d9']],
  },
};

/**
 * Color for a normalized value t∈[0,1] under the given scheme.
 * @param {string} schemeId - key of COLOR_SCHEMES
 * @param {number} t - normalized value, clamped to [0, 1]
 * @returns {string} CSS rgb() color
 */
export function colorForT(schemeId, t) {
  const scheme = COLOR_SCHEMES[schemeId] || COLOR_SCHEMES.danger;
  const stops = scheme.stops;
  const x = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));

  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i][0]) {
      const [s0, c0] = stops[i - 1];
      const [s1, c1] = stops[i];
      const local = (x - s0) / (s1 - s0 || 1);
      const a = hexToRgb(c0);
      const b = hexToRgb(c1);
      return rgbToCss([
        lerp(a[0], b[0], local),
        lerp(a[1], b[1], local),
        lerp(a[2], b[2], local),
      ]);
    }
  }
  return rgbToCss(hexToRgb(stops[stops.length - 1][1]));
}

/**
 * CSS `linear-gradient(...)` string for rendering a scheme in a legend.
 * @param {string} schemeId
 * @returns {string}
 */
export function cssGradient(schemeId) {
  const scheme = COLOR_SCHEMES[schemeId] || COLOR_SCHEMES.danger;
  const stops = scheme.stops.map(([s, c]) => `${c} ${Math.round(s * 100)}%`).join(', ');
  return `linear-gradient(to right, ${stops})`;
}
