// GPX Export functionality

import { routeState } from './routeState.js';

export function exportRouteToGPX() {
  const { currentRouteData } = routeState;
  
  if (!currentRouteData || !currentRouteData.coordinates || currentRouteData.coordinates.length === 0) {
    alert('Keine Route zum Exportieren vorhanden');
    return;
  }

  const { coordinates, elevations, distance } = currentRouteData;
  const now = new Date().toISOString();
  
  // Generate GPX XML
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MapLibre GraphHopper Routing" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>Route</name>
    <time>${now}</time>
  </metadata>
  <trk>
    <name>Route</name>
    <trkseg>
`;

  // Add track points
  coordinates.forEach((coord, index) => {
    const [lng, lat] = coord;
    const elevation = elevations && elevations[index] !== undefined && elevations[index] !== null 
      ? elevations[index] 
      : null;
    
    gpx += `      <trkpt lat="${lat}" lon="${lng}">`;
    if (elevation !== null) {
      gpx += `\n        <ele>${elevation.toFixed(2)}</ele>`;
    }
    gpx += `\n      </trkpt>\n`;
  });

  gpx += `    </trkseg>
  </trk>
</gpx>`;

  // Create download
  const blob = new Blob([gpx], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `route_${new Date().toISOString().split('T')[0]}.gpx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

