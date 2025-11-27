// Route info HTML formatter - extracted to avoid duplication

/**
 * Format number with thousand separator (thin space)
 */
export function formatNumberWithThousandSeparator(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
}

/**
 * Format time in seconds to human-readable string
 */
export function formatTime(timeSeconds) {
  const timeMinutes = Math.round(timeSeconds / 60);
  const timeHours = Math.floor(timeMinutes / 60);
  const timeMins = timeMinutes % 60;
  
  if (timeHours > 0) {
    return `${timeHours}h ${timeMins}min`;
  }
  return `${timeMinutes} min`;
}

/**
 * Generate route info HTML from path data
 * @param {Object} path - GraphHopper path object
 * @returns {string} HTML string
 */
export function generateRouteInfoHTML(path) {
  if (!path) {
    return '<div class="route-info-compact">Keine Routendaten verfügbar</div>';
  }

  const distance = (path.distance / 1000).toFixed(2);
  const timeSeconds = Math.round(path.time / 1000);
  const timeDisplay = formatTime(timeSeconds);
  
  const avgSpeed = timeSeconds > 0 
    ? (path.distance / 1000 / (path.time / 1000 / 3600)).toFixed(1)
    : '0.0';
  
  const ascend = path.ascend ? Math.round(path.ascend) : null;
  const descend = path.descend ? Math.round(path.descend) : null;
  const instructionCount = path.instructions ? path.instructions.length : null;
  const weight = path.weight ? formatNumberWithThousandSeparator(Math.round(path.weight)) : null;
  
  return `
    <div class="route-info-compact">
      <div class="route-info-row">
        <svg width="16" height="16" viewBox="0 0 179 179" fill="currentColor">
          <polygon points="52.258,67.769 52.264,37.224 0,89.506 52.264,141.782 52.258,111.237 126.736,111.249 126.736,141.782 179.006,89.506 126.736,37.224 126.736,67.769"/>
        </svg>
        <span class="route-info-compact-value">${distance} km</span>
      </div>
      <div class="route-info-row">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span class="route-info-compact-value">${timeDisplay}</span>
      </div>
      <div class="route-info-row">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12,2A10,10,0,1,0,22,12,10.011,10.011,0,0,0,12,2Zm7.411,13H12.659L9.919,8.606a1,1,0,1,0-1.838.788L10.484,15H4.589a8,8,0,1,1,14.822,0Z"/>
        </svg>
        <span class="route-info-compact-label">Ø:</span>
        <span class="route-info-compact-value">${avgSpeed} km/h</span>
      </div>
      ${(ascend !== null || descend !== null) ? `
      <div class="route-info-row">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 14L17 9L22 18H2.84444C2.46441 18 2.2233 17.5928 2.40603 17.2596L10.0509 3.31896C10.2429 2.96885 10.7476 2.97394 10.9325 3.32786L15.122 11.3476"/>
        </svg>
        <span class="route-info-compact-value">
          ${ascend !== null ? `↑ ${ascend} m` : ''}
          ${ascend !== null && descend !== null ? ' ' : ''}
          ${descend !== null ? `↓ ${descend} m` : ''}
        </span>
      </div>
      ` : ''}
      ${instructionCount !== null ? `
      <div class="route-info-row">
        <svg width="16" height="16" viewBox="0 0 403.262 460.531" fill="currentColor">
          <path d="M403.262,254.156v206.375h-70.628V254.156c0-32.26-8.411-56.187-25.718-73.16c-24.636-24.166-60.904-27.919-71.934-28.469 h-50.747l29.09,73.648c0.979,2.468,0.187,5.284-1.927,6.88c-2.116,1.604-5.048,1.593-7.152-0.03L59.574,121.797 c-1.445-1.126-2.305-2.84-2.305-4.678c0-1.835,0.86-3.561,2.305-4.672L204.246,1.218c1.064-0.819,2.323-1.218,3.6-1.218 c1.247,0,2.494,0.387,3.552,1.185c2.119,1.593,2.905,4.413,1.927,6.889l-29.09,73.642l37.442,0.109c0,0,3.588,0.198,8.565,0.624 l-0.018-0.63c3.174-0.067,75.568-0.859,126.153,48.761C387.492,161.092,403.262,202.665,403.262,254.156z"/>
        </svg>
        <span class="route-info-compact-label">turns:</span>
        <span class="route-info-compact-value">${instructionCount}</span>
      </div>
      ` : ''}
      ${weight !== null ? `
      <div class="route-info-row">
        <svg width="16" height="16" viewBox="0 0 512.001 512.001" fill="currentColor">
          <path d="M345.589,236.508h-89.589h-89.59c-10.763,0-19.488,8.726-19.488,19.488s8.726,19.488,19.488,19.488h89.59h89.589c10.763,0,19.488-8.726,19.488-19.488S356.352,236.508,345.589,236.508z"/>
          <path d="M345.589,236.508h-89.589v38.977h89.589c10.763,0,19.488-8.726,19.488-19.488S356.352,236.508,345.589,236.508z"/>
          <path d="M82.567,348.538H12.992C5.817,348.538,0,342.721,0,335.545v-159.09c0-7.176,5.817-12.992,12.992-12.992h69.575V348.538z"/>
          <path d="M429.434,163.464h69.575c7.176,0,12.992,5.817,12.992,12.992v159.09c0,7.176-5.817,12.992-12.992,12.992h-69.575V163.464z"/>
          <path d="M153.419,382.424H82.567c-7.176,0-12.992-5.817-12.992-12.992V142.569c0-7.176,5.817-12.992,12.992-12.992h70.852c7.176,0,12.992,5.817,12.992,12.992v226.863C166.411,376.608,160.594,382.424,153.419,382.424z"/>
          <path d="M358.582,129.577h70.852c7.176,0,12.992,5.817,12.992,12.992v226.863c0,7.176-5.817,12.992-12.992,12.992h-70.852c-7.176,0-12.992-5.817-12.992-12.992V142.569C345.589,135.394,351.406,129.577,358.582,129.577z"/>
        </svg>
        <span class="route-info-compact-label">Weight:</span>
        <span class="route-info-compact-value">${weight}</span>
      </div>
      ` : ''}
    </div>
  `;
}

/**
 * Display error message in route info container
 * @param {string} message - Error message to display
 * @param {HTMLElement|null} routeInfoElement - Route info container element
 */
export function displayRouteError(message, routeInfoElement) {
  if (!routeInfoElement) return;
  
  routeInfoElement.innerHTML = `
    <div style="color: #dc2626; padding: 8px; background: #fee2e2; border-radius: 4px; font-size: 13px;">
      ${message}
    </div>
  `;
}

