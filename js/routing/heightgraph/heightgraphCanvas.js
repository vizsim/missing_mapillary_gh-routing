// Canvas setup and management for heightgraph

/**
 * Setup canvas with proper dimensions and high-DPI support
 * Returns the context
 */
export function setupCanvas(canvas, width, height) {
  const dpr = window.devicePixelRatio || 1;
  
  // Set CSS size (logical size)
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  canvas.style.maxWidth = '100%';
  
  // Set actual canvas size (physical pixels) for high-DPI
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  
  return ctx;
}

/**
 * Setup indicator canvas with proper dimensions and high-DPI support
 * Must match the main canvas dimensions exactly
 */
export function setupIndicatorCanvas(indicatorCanvas, width, height) {
  if (!indicatorCanvas) return null;
  
  const dpr = window.devicePixelRatio || 1;
  
  // Set CSS size (logical size) - MUST match main canvas exactly
  // Override any CSS width: 100% to ensure exact match
  indicatorCanvas.style.width = width + 'px';
  indicatorCanvas.style.height = height + 'px';
  indicatorCanvas.style.maxWidth = '100%'; // Prevent overflow, but prefer exact width
  
  // Set actual canvas size (physical pixels) for high-DPI
  // NOTE: Setting canvas.width/height resets the context, so we need to scale again
  indicatorCanvas.width = width * dpr;
  indicatorCanvas.height = height * dpr;
  
  // Store DPR and logical dimensions for later use
  indicatorCanvas._dpr = dpr;
  indicatorCanvas._logicalWidth = width;
  indicatorCanvas._logicalHeight = height;
  
  const ctx = indicatorCanvas.getContext('2d');
  // Reset transform and scale for high-DPI
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  
  return ctx;
}

