// Bike lanes layers configuration

export function addBikeLanesLayers(map) {
  if (!map.getSource("bike-lanes")) return;

  // Needs clarification
  map.addLayer({
    id: 'bike-lanes-needsClarification',
    type: 'line',
    source: 'bike-lanes',
    'source-layer': 'bikelanes',
    minzoom: 9,
    maxzoom: 22,
    layout: { visibility: 'none' },
    paint: {
      'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.5, 10, 1.5, 14, 2, 16, 3],
      'line-color': '#a97bea',
      'line-dasharray': [2.5, 0.5],
    },
    filter: ['match', ['get', 'category'], ['needsClarification'], true, false],
  });

  // Gehweg Rad frei
  map.addLayer({
    id: 'bike-lanes-gehweg',
    type: 'line',
    source: 'bike-lanes',
    'source-layer': 'bikelanes',
    minzoom: 9,
    maxzoom: 22,
    layout: { visibility: 'none' },
    paint: {
      'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.5, 10, 1.5, 14, 2, 16, 3],
      'line-dasharray': [2, 2],
      'line-color': '#9fb9f9',
      'line-offset': ['interpolate', ['linear'], ['zoom'], 12, 0, 15, -1],
    },
    filter: [
      'match',
      ['get', 'category'],
      [
        'footwayBicycleYes_isolated',
        'pedestrianAreaBicycleYes',
        'footwayBicycleYes_adjoining',
        'footwayBicycleYes_adjoiningOrIsolated',
      ],
      true,
      false,
    ],
  });

  // Fuehrung mit Kfz-explizit
  map.addLayer({
    id: 'bike-lanes-kfz',
    type: 'line',
    source: 'bike-lanes',
    'source-layer': 'bikelanes',
    minzoom: 9,
    maxzoom: 22,
    layout: { visibility: 'none' },
    paint: {
      'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.5, 10, 1.5, 14, 2, 16, 3],
      'line-dasharray': [3, 1],
      'line-color': '#0098f0',
      'line-offset': ['interpolate', ['linear'], ['zoom'], 12, 0, 15, -1],
    },
    filter: [
      'match',
      ['get', 'category'],
      [
        'sharedMotorVehicleLane',
        'bicycleRoad_vehicleDestination',
        'sharedBusLaneBusWithBike',
        'sharedBusLaneBikeWithBus',
      ],
      true,
      false,
    ],
  });

  // Fuehrung mit Fussverkehr
  map.addLayer({
    id: 'bike-lanes-fussverkehr',
    type: 'line',
    source: 'bike-lanes',
    'source-layer': 'bikelanes',
    minzoom: 9,
    maxzoom: 22,
    layout: { visibility: 'none' },
    paint: {
      'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.5, 10, 1.5, 14, 2, 16, 3],
      'line-dasharray': [3, 1],
      'line-color': '#174ed9',
      'line-offset': ['interpolate', ['linear'], ['zoom'], 12, 0, 15, -1],
    },
    filter: [
      'match',
      ['get', 'category'],
      [
        'footAndCyclewayShared_isolated',
        'footAndCyclewayShared_adjoining',
        'footAndCyclewayShared_adjoiningOrIsolated',
      ],
      true,
      false,
    ],
  });

  // Fuehrung eigenstaendig auf Fahrbahn
  map.addLayer({
    id: 'bike-lanes-eigenstaendig',
    type: 'line',
    source: 'bike-lanes',
    'source-layer': 'bikelanes',
    minzoom: 9,
    maxzoom: 22,
    layout: { visibility: 'none' },
    paint: {
      'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.5, 10, 1.5, 14, 2, 16, 3],
      'line-color': '#0098f0',
      'line-offset': ['interpolate', ['linear'], ['zoom'], 12, 0, 15, -1],
    },
    filter: [
      'match',
      ['get', 'category'],
      [
        'cyclewayOnHighway_exclusive',
        'cyclewayOnHighwayBetweenLanes',
        'cyclewayLink',
        'crossing',
        'cyclewayOnHighway_advisory',
        'cyclewayOnHighway_advisoryOrExclusive',
      ],
      true,
      false,
    ],
  });

  // Fuehrung baul. abgesetzt von Kfz
  map.addLayer({
    id: 'bike-lanes-baulich',
    type: 'line',
    source: 'bike-lanes',
    'source-layer': 'bikelanes',
    minzoom: 9,
    maxzoom: 22,
    layout: { visibility: 'none' },
    paint: {
      'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.5, 10, 1.5, 14, 2, 16, 3],
      'line-color': '#174ed9',
      'line-offset': ['interpolate', ['linear'], ['zoom'], 12, 0, 15, -1],
    },
    filter: [
      'match',
      ['get', 'category'],
      [
        'footAndCyclewaySegregated_adjoining',
        'footAndCyclewaySegregated_adjoiningOrIsolated',
        'cycleway_isolated',
        'cycleway_adjoining',
        'bicycleRoad',
        'footAndCyclewaySegregated_isolated',
        'cycleway_adjoiningOrIsolated',
        'cyclewayOnHighwayProtected',
      ],
      true,
      false,
    ],
  });
}

