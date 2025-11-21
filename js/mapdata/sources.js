// Map data sources configuration

export function addBasicSources(map, maptilerApiKey) {
  // Raster: Satellite ESRI
  map.addSource("satellite", {
    type: "raster",
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    ],
    tileSize: 256,
    attribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
  });

  // Raster: Hillshade
  if (maptilerApiKey) {
    map.addSource("hillshade", {
      type: "raster",
      url: `https://api.maptiler.com/tiles/hillshades/tiles.json?key=${maptilerApiKey}`,
      tileSize: 256,
      attribution: "© MapTiler"
    });
    
    // Raster-DEM: Terrain
    map.addSource("terrain", {
      type: "raster-dem",
      url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${maptilerApiKey}`,
      tileSize: 256,
      encoding: "mapbox",
      attribution: "© MapTiler"
    });
  }

  // Bike lanes source
  map.addSource("bike-lanes", {
    type: "vector",
    tiles: [
      "https://tiles.tilda-geo.de/atlas_generalized_bikelanes/{z}/{x}/{y}"
    ],
    minzoom: 9,
    maxzoom: 22
  });

  // Mapillary missing streets sources (3 sources combined)
  // Source 1: Roads
  map.addSource("mapillary-roads", {
    type: "vector",
    tiles: [
      "https://tiles.tilda-geo.de/atlas_generalized_roads/{z}/{x}/{y}"
    ],
    minzoom: 9,
    maxzoom: 22
  });
  
  // Source 2: Bike lanes (reused from bike-lanes, but with different styling)
  // Note: bike-lanes source is already added above
  
  // Source 3: Road path classes
  map.addSource("mapillary-roadspathclasses", {
    type: "vector",
    tiles: [
      "https://tiles.tilda-geo.de/atlas_generalized_roadspathclasses/{z}/{x}/{y}"
    ],
    minzoom: 9,
    maxzoom: 22
  });
}

