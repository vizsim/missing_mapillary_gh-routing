// Heightgraph configuration

export const HEIGHTGRAPH_CONFIG = {
  canvas: {
    defaultWidth: 320,
    height: 150,
    minWidth: 100
  },
  padding: {
    top: 20,
    right: 5,
    bottom: 30,
    left: 35  // Increased to accommodate 3-digit elevation values (e.g., "100 m")
  },
  grid: {
    steps: 5
  },
  colors: {
    background: '#f9fafb',
    grid: '#e5e7eb',
    text: '#6b7280',
    elevationLine: '#3b82f6',
    indicatorLine: '#ef4444'
  },
  debounce: {
    resize: 150
  },
  font: {
    size: '10px',
    family: 'sans-serif'
  }
};

