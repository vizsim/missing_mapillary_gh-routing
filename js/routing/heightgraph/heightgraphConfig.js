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
  },
  // Elevation range padding (added above/below min/max)
  elevationPadding: 10,
  // Y-axis tick configuration
  yAxis: {
    maxTicks: 8,
    stepSizes: [5, 10, 20, 50, 100]
  },
  // X-axis tick configuration
  xAxis: {
    maxTicksShort: 8,  // For distances < 100 km
    maxTicksLong: 6,   // For distances >= 100 km
    threshold3Digit: 100,  // km threshold for 3-digit distances
    stepSizes: [0.5, 1, 2, 5, 10, 20, 50, 100],
    niceMultipliers: [10, 20, 50, 100],
    minNiceStepSize: 10
  },
  // Label positioning
  labels: {
    yAxisMargin: 5,      // Margin from left edge of graph
    yAxisOffset: 3,       // Vertical offset for Y-axis labels
    xAxisOffset: 12       // Vertical offset for X-axis labels (below graph)
  },
  // Opacity values for different visualizations
  opacity: {
    stats: 0.15,    // For statistics display
    segments: 0.3   // For segment fill
  },
  // Line width
  lineWidth: {
    grid: 1,
    elevation: 2,
    indicator: 2
  }
};

