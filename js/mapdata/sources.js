// Map data sources configuration

export function addBasicSources(map, maptilerApiKey) {
  // Raster: OSM Standard
  map.addSource("osm", {
    type: "raster",
    tiles: [
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    ],
    tileSize: 256,
    attribution: "© OpenStreetMap contributors"
  });

  // Raster: Satellite ESRI
  map.addSource("satellite", {
    type: "raster",
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    ],
    tileSize: 256,
    attribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
  });

  // Raster-DEM: Terrain (Mapterhorn)
  map.addSource("terrain", {
    type: "raster-dem",
    url: "https://tiles.mapterhorn.com/tilejson.json",
    tileSize: 512,
    encoding: "terrarium"
  });
  
  // Raster-DEM: Hillshade (Mapterhorn)
  map.addSource("hillshade", {
    type: "raster-dem",
    url: "https://tiles.mapterhorn.com/tilejson.json",
    tileSize: 512,
    encoding: "terrarium"
  });

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

