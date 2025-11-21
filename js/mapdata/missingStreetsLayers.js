// Missing streets layers configuration (Mapillary coverage visualization)

export function addMissingStreetsLayers(map) {
  // Check if all sources are loaded
  if (!map.getSource("mapillary-roads") || !map.getSource("bike-lanes") || !map.getSource("mapillary-roadspathclasses")) {
    // Sources not loaded yet, try again after a delay
    setTimeout(() => {
      if (map.getSource("mapillary-roads") && map.getSource("bike-lanes") && map.getSource("mapillary-roadspathclasses")) {
        addMissingStreetsLayers(map);
      }
    }, 1000);
    return;
  }

  // Layer für fehlende Fotos (rosa) - aus roadsPathClasses (vorerst ausgeschaltet)
  // map.addLayer({
  //   id: 'missing-streets-missing-pathclasses',
  //   type: 'line',
  //   source: 'mapillary-roadspathclasses',
  //   'source-layer': 'roadsPathClasses',
  //   minzoom: 9,
  //   maxzoom: 22,
  //   layout: { visibility: 'none' },
  //   paint: {
  //     'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.5, 12, 1.5, 15, 2],
  //     'line-color': '#e91e63',
  //     'line-opacity': 0.7,
  //   },
  //   filter: [
  //     'any',
  //     ['==', ['get', 'mapillary_coverage'], 'missing'],
  //     ['!', ['has', 'mapillary_coverage']],
  //     ['==', ['get', 'mapillary_coverage'], '']
  //   ],
  // });

  // Layer für fehlende Fotos (rosa) - aus roads
  map.addLayer({
    id: 'missing-streets-missing-roads',
    type: 'line',
    source: 'mapillary-roads',
    'source-layer': 'roads',
    minzoom: 9,
    maxzoom: 22,
    layout: { visibility: 'none' },
    paint: {
      'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.5, 12, 1.5, 15, 2],
      'line-color': '#e91e63',
      'line-opacity': 0.7,
    },
    filter: [
      'any',
      ['==', ['get', 'mapillary_coverage'], 'missing'],
      ['!', ['has', 'mapillary_coverage']],
      ['==', ['get', 'mapillary_coverage'], '']
    ],
  });

  // Layer für fehlende Fotos (rosa) - aus bikelanes
  map.addLayer({
    id: 'missing-streets-missing-bikelanes',
    type: 'line',
    source: 'bike-lanes',
    'source-layer': 'bikelanes',
    minzoom: 9,
    maxzoom: 22,
    layout: { visibility: 'none' },
    paint: {
      'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.5, 12, 1.5, 15, 2],
      'line-color': '#e91e63',
      'line-opacity': 0.7,
    },
    filter: [
      'any',
      ['==', ['get', 'mapillary_coverage'], 'missing'],
      ['!', ['has', 'mapillary_coverage']],
      ['==', ['get', 'mapillary_coverage'], '']
    ],
  });

  // Layer für regular Fotos (blau) - aus roadsPathClasses (vorerst ausgeschaltet)
  // map.addLayer({
  //   id: 'missing-streets-regular-pathclasses',
  //   type: 'line',
  //   source: 'mapillary-roadspathclasses',
  //   'source-layer': 'roadsPathClasses',
  //   minzoom: 9,
  //   maxzoom: 22,
  //   layout: { visibility: 'none' },
  //   paint: {
  //     'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.5, 12, 1.5, 15, 2],
  //     'line-color': '#0098f0',
  //     'line-opacity': 0.7,
  //   },
  //   filter: [
  //     '==', ['get', 'mapillary_coverage'], 'regular'
  //   ],
  // });

  // Layer für regular Fotos (blau) - aus roads
  map.addLayer({
    id: 'missing-streets-regular-roads',
    type: 'line',
    source: 'mapillary-roads',
    'source-layer': 'roads',
    minzoom: 9,
    maxzoom: 22,
    layout: { visibility: 'none' },
    paint: {
      'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.5, 12, 1.5, 15, 2],
      'line-color': '#0098f0',
      'line-opacity': 0.7,
    },
    filter: [
      '==', ['get', 'mapillary_coverage'], 'regular'
    ],
  });

  // Layer für regular Fotos (blau) - aus bikelanes
  map.addLayer({
    id: 'missing-streets-regular-bikelanes',
    type: 'line',
    source: 'bike-lanes',
    'source-layer': 'bikelanes',
    minzoom: 9,
    maxzoom: 22,
    layout: { visibility: 'none' },
    paint: {
      'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.5, 12, 1.5, 15, 2],
      'line-color': '#0098f0',
      'line-opacity': 0.7,
    },
    filter: [
      '==', ['get', 'mapillary_coverage'], 'regular'
    ],
  });

  // Layer für Panorama-Fotos (dunkelblau) - aus roadsPathClasses (vorerst ausgeschaltet)
  // map.addLayer({
  //   id: 'missing-streets-pano-pathclasses',
  //   type: 'line',
  //   source: 'mapillary-roadspathclasses',
  //   'source-layer': 'roadsPathClasses',
  //   minzoom: 9,
  //   maxzoom: 22,
  //   layout: { visibility: 'none' },
  //   paint: {
  //     'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.5, 12, 1.5, 15, 2],
  //     'line-color': '#174ed9',
  //     'line-opacity': 0.7,
  //   },
  //   filter: [
  //     '==', ['get', 'mapillary_coverage'], 'pano'
  //   ],
  // });

  // Layer für Panorama-Fotos (dunkelblau) - aus roads
  map.addLayer({
    id: 'missing-streets-pano-roads',
    type: 'line',
    source: 'mapillary-roads',
    'source-layer': 'roads',
    minzoom: 9,
    maxzoom: 22,
    layout: { visibility: 'none' },
    paint: {
      'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.5, 12, 1.5, 15, 2],
      'line-color': '#174ed9',
      'line-opacity': 0.7,
    },
    filter: [
      '==', ['get', 'mapillary_coverage'], 'pano'
    ],
  });

  // Layer für Panorama-Fotos (dunkelblau) - aus bikelanes
  map.addLayer({
    id: 'missing-streets-pano-bikelanes',
    type: 'line',
    source: 'bike-lanes',
    'source-layer': 'bikelanes',
    minzoom: 9,
    maxzoom: 22,
    layout: { visibility: 'none' },
    paint: {
      'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.5, 12, 1.5, 15, 2],
      'line-color': '#174ed9',
      'line-opacity': 0.7,
    },
    filter: [
      '==', ['get', 'mapillary_coverage'], 'pano'
    ],
  });
}

